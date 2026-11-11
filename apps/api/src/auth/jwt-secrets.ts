import * as crypto from 'crypto';

const DEV_FALLBACK_ACCESS = 'askrev-dev-jwt-access-secret-minimum-32-chars-long!';
const DEV_FALLBACK_REFRESH = 'askrev-dev-jwt-refresh-secret-minimum-32-chars-long!';

export function getJwtAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET?.trim();
  if (secret && secret.length >= 32) {
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_ACCESS_SECRET must be configured with >= 32 characters in production.');
  }
  return DEV_FALLBACK_ACCESS;
}

export function getJwtRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET?.trim();
  if (secret && secret.length >= 32) {
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_REFRESH_SECRET must be configured with >= 32 characters in production.');
  }
  return DEV_FALLBACK_REFRESH;
}

const revokedTokenHashes = new Map<string, number>();

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function revokeAccessToken(token: string, expSeconds?: number): void {
  const expiresAtMs = expSeconds ? expSeconds * 1000 : Date.now() + 24 * 60 * 60 * 1000;
  revokedTokenHashes.set(hashToken(token), expiresAtMs);

  if (revokedTokenHashes.size > 5000) {
    const now = Date.now();
    for (const [k, exp] of revokedTokenHashes.entries()) {
      if (exp <= now) {
        revokedTokenHashes.delete(k);
      }
    }
  }
}

export function isAccessTokenRevoked(token: string): boolean {
  const hash = hashToken(token);
  const exp = revokedTokenHashes.get(hash);
  if (!exp) return false;
  if (exp <= Date.now()) {
    revokedTokenHashes.delete(hash);
    return false;
  }
  return true;
}

