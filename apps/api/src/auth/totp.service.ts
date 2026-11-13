import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class TotpService {
  private readonly base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  /**
   * Generate a cryptographically secure Base32 secret for TOTP (RFC 6238)
   */
  generateSecret(length = 20): { secret: string; otpauthUrl: string } {
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
    const label = encodeURIComponent('admin@askrevdrive.com');
    const otpauthUrl = `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    return { secret, otpauthUrl };
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
