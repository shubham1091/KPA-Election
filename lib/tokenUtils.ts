import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Generate a cryptographically secure random token
 */
export function generateToken(): string {
  // Generate 32 random bytes and convert to hex (64 characters)
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a token using bcrypt for secure storage
 */
export async function hashToken(token: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(token, saltRounds);
}

/**
 * Generate SHA256 fingerprint for fast token lookup
 */
export function generateFingerprint(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify a token against its hash
 */
export async function verifyToken(token: string, hash: string): Promise<boolean> {
  return bcrypt.compare(token, hash);
}

/**
 * Generate a prefilled voting URL
 */
export function generatePrefilledUrl(
  baseUrl: string,
  electionId: string,
  token: string
): string {
  return `${baseUrl}/voter/${electionId}?token=${token}`;
}

