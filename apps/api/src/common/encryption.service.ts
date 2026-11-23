import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly key: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor() {
    // Enforce PAYMENT_ENCRYPTION_KEY in production environment
    if (process.env.NODE_ENV === 'production' && !process.env.PAYMENT_ENCRYPTION_KEY) {
      throw new Error(
        'CRITICAL CONFIGURATION ERROR: PAYMENT_ENCRYPTION_KEY environment variable is required in production to safeguard payment credentials.'
      );
    }

    // Derive a fixed 32-byte key from PAYMENT_ENCRYPTION_KEY or JWT_ACCESS_SECRET fallback
    const rawKey =
      process.env.PAYMENT_ENCRYPTION_KEY ||
      process.env.JWT_ACCESS_SECRET ||
      'askrev-secure-default-encryption-key-for-local-development-32chars!';

    // Deterministic 32-byte key derivation via scrypt
    this.key = crypto.scryptSync(rawKey, 'askrev-payment-salt-2026', 32);
  }

  /**
   * Encrypt plaintext string using AES-256-GCM authenticated encryption.
   * Format: ivHex:authTagHex:encryptedHex
   */
  encrypt(plainText: string): string {
    if (!plainText) return '';
    try {
      const iv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
      const authTag = cipher.getAuthTag();

      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
    } catch (err: any) {
      this.logger.error(`Encryption failure: ${err.message}`);
      throw new Error('Encryption of sensitive credential failed');
    }
  }

  /**
   * Decrypt AES-256-GCM encrypted string.
   */
  decrypt(cipherText: string): string {
    if (!cipherText) return '';
    try {
      const parts = cipherText.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid ciphertext format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = Buffer.from(parts[2], 'hex');

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

      return decrypted.toString('utf8');
    } catch (err: any) {
      this.logger.error(`Decryption failure: ${err.message}`);
      throw new Error('Decryption of sensitive credential failed');
    }
  }

  /**
   * Masks secret for safe browser display in Admin UI without leaking API keys.
   * e.g. "rzp_test_1234567890abcdef" -> "rzp_test_••••••••cdef"
   */
  mask(secret?: string | null): string {
    if (!secret || secret.trim().length === 0) return '';
    const clean = secret.trim();
    if (clean.length <= 8) {
      return '••••••••';
    }

    const prefix = clean.startsWith('rzp_test_')
      ? 'rzp_test_'
      : clean.startsWith('rzp_live_')
      ? 'rzp_live_'
      : '';
    const unmaskedSuffix = clean.slice(-4);
    return `${prefix}••••••••••••${unmaskedSuffix}`;
  }

  /**
   * Checks if a submitted string is an already-masked placeholder.
   */
  isMasked(val?: string | null): boolean {
    if (!val) return false;
    return val.includes('••••') || val.startsWith('__MASKED_');
  }
}
