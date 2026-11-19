import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';

@Injectable()
export class TotpService {
  private readonly base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  // Replay protection: tracks consumed codes per user for the 90-second TOTP validity window
  private readonly consumedCodes = new Map<string, number>();

  // Rate limiting: tracks failed MFA attempts per identity (userId or email/IP)
  private readonly mfaAttempts = new Map<string, { count: number; resetAt: number }>();

  /**
   * Generate a cryptographically secure Base32 secret for TOTP (RFC 6238)
   */
  generateSecret(length = 20, email = 'admin@askrevdrive.com'): { secret: string; otpauthUrl: string } {
    const bytes = crypto.randomBytes(length);
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < bytes.length; i++) {
      value = (value << 8) | bytes[i];
      bits += 8;
      while (bits >= 5) {
        output += this.base32Chars[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) {
      output += this.base32Chars[(value << (5 - bits)) & 31];
    }

    const secret = output;
    const issuer = encodeURIComponent('ASKR EV');
    const label = encodeURIComponent(email);
    const otpauthUrl = `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    return { secret, otpauthUrl };
  }

  /**
   * Render high-resolution PNG QR Code Data URL from otpauth:// URI
   */
  async generateQrCode(otpauthUrl: string): Promise<string> {
    try {
      return await QRCode.toDataURL(otpauthUrl, {
        margin: 2,
        width: 256,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      });
    } catch (err: any) {
      throw new BadRequestException(`Failed to generate QR code: ${err.message}`);
    }
  }

  /**
   * Decode Base32 string to Buffer
   */
  private base32Decode(secret: string): Buffer {
    let bits = 0;
    let value = 0;
    let index = 0;
    const clean = secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
    const buffer = Buffer.alloc(Math.floor((clean.length * 5) / 8));

    for (let i = 0; i < clean.length; i++) {
      const val = this.base32Chars.indexOf(clean[i]);
      if (val === -1) continue;
      value = (value << 5) | val;
      bits += 5;
      if (bits >= 8) {
        buffer[index++] = (value >>> (bits - 8)) & 255;
        bits -= 8;
      }
    }
    return buffer;
  }

  /**
   * Generate 6-digit TOTP code for a timestamp
   */
  generateTOTP(secret: string, timestampMs = Date.now()): string {
    const key = this.base32Decode(secret);
    const timeStep = 30;
    const counter = Math.floor(timestampMs / 1000 / timeStep);
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', key).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const code =
      (((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff)) %
      1000000;

    return code.toString().padStart(6, '0');
  }

  /**
   * Verify a 6-digit TOTP token with constant-time comparison and window drift tolerance
   */
  verifyToken(secret: string, token: string, window = 1): boolean {
    if (!token || typeof token !== 'string') return false;
    const cleanToken = token.trim();
    if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) return false;

    const now = Date.now();
    for (let w = -window; w <= window; w++) {
      const candidate = this.generateTOTP(secret, now + w * 30000);
      const tokenBuf = Buffer.from(cleanToken);
      const candBuf = Buffer.from(candidate);
      if (tokenBuf.length === candBuf.length && crypto.timingSafeEqual(tokenBuf, candBuf)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Verify TOTP token with replay protection for a specific user ID and action scope
   */
  verifyTokenWithReplayProtection(userId: string, secret: string, token: string, window = 1, action = 'auth'): boolean {
    if (!token || typeof token !== 'string') return false;
    const cleanToken = token.trim();

    // Check if code has already been consumed for this specific action scope in the current window
    const replayKey = `${userId}:${action}:${cleanToken}`;
    const consumedUntil = this.consumedCodes.get(replayKey);
    if (consumedUntil && consumedUntil > Date.now()) {
      return false; // Code was already used for this action; prevent replay attack
    }

    const isValid = this.verifyToken(secret, cleanToken, window);
    if (isValid) {
      // Mark code as consumed for 90 seconds (covers current step +/- window)
      this.consumedCodes.set(replayKey, Date.now() + 90000);
      this.cleanupExpiredConsumedCodes();
    }
    return isValid;
  }

  private cleanupExpiredConsumedCodes(): void {
    if (this.consumedCodes.size > 2000) {
      const now = Date.now();
      for (const [k, exp] of this.consumedCodes.entries()) {
        if (exp <= now) this.consumedCodes.delete(k);
      }
    }
  }

  /**
   * Rate limiting helpers for MFA and password changes
   */
  checkRateLimit(key: string, maxAttempts = 5, windowMs = 5 * 60 * 1000): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const record = this.mfaAttempts.get(key);
    if (!record || record.resetAt <= now) {
      return { allowed: true, remaining: maxAttempts };
    }
    if (record.count >= maxAttempts) {
      return { allowed: false, remaining: 0 };
    }
    return { allowed: true, remaining: maxAttempts - record.count };
  }

  recordFailedAttempt(key: string, windowMs = 5 * 60 * 1000): void {
    const now = Date.now();
    const record = this.mfaAttempts.get(key);
    if (!record || record.resetAt <= now) {
      this.mfaAttempts.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      record.count += 1;
    }
  }

  resetRateLimit(key: string): void {
    this.mfaAttempts.delete(key);
  }

  /**
   * Generate 8 secure backup recovery codes formatted as XXXX-XXXX-XX
   */
  generateRecoveryCodes(count = 8): string[] {
    const codes: string[] = [];
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let i = 0; i < count; i++) {
      let code = '';
      const bytes = crypto.randomBytes(10);
      for (let j = 0; j < 10; j++) {
        code += charset[bytes[j] % charset.length];
        if (j === 3 || j === 7) code += '-';
      }
      codes.push(code);
    }
    return codes;
  }

  /**
   * Hash a recovery code with SHA-256 for safe database storage
   */
  hashRecoveryCode(code: string): string {
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return crypto.createHash('sha256').update(clean).digest('hex');
  }

  /**
   * Verify and consume a recovery code from the user's stored hashed codes
   */
  verifyAndConsumeRecoveryCode(
    candidateCode: string,
    storedHashedCodes: string[]
  ): { valid: boolean; remainingHashedCodes: string[] } {
    if (!candidateCode || !Array.isArray(storedHashedCodes)) {
      return { valid: false, remainingHashedCodes: storedHashedCodes || [] };
    }
    const candidateHash = this.hashRecoveryCode(candidateCode);
    const index = storedHashedCodes.findIndex(
      (h) => crypto.timingSafeEqual(Buffer.from(h), Buffer.from(candidateHash))
    );

    if (index === -1) {
      return { valid: false, remainingHashedCodes: storedHashedCodes };
    }

    const remaining = [...storedHashedCodes];
    remaining.splice(index, 1);
    return { valid: true, remainingHashedCodes: remaining };
  }
}
