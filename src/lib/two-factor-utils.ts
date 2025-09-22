/**
 * Two-Factor Authentication Utilities
 * TOTP secret generation and backup codes
 */

import crypto from 'crypto';

/**
 * Generate a new TOTP secret
 */
export function generateSecret(): string {
  // Generate a 20-byte (160-bit) secret
  const buffer = crypto.randomBytes(20);

  // Convert to base32 (RFC 4648)
  return base32Encode(buffer);
}

/**
 * Generate backup codes
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    // Format as XXX-XXX for readability
    const formatted = `${code.slice(0, 3)}-${code.slice(3, 6)}`;
    codes.push(formatted);
  }

  return codes;
}

/**
 * Base32 encoding (RFC 4648)
 */
function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Verify TOTP code
 */
export function verifyTotpCode(secret: string, token: string, window: number = 1): boolean {
  const time = Math.floor(Date.now() / 1000 / 30);

  for (let i = -window; i <= window; i++) {
    const expectedToken = generateTotpCode(secret, time + i);
    if (expectedToken === token) {
      return true;
    }
  }

  return false;
}

/**
 * Generate TOTP code for a specific time
 */
function generateTotpCode(secret: string, time: number): string {
  const secretBuffer = base32Decode(secret);
  const timeBuffer = Buffer.allocUnsafe(8);
  timeBuffer.writeBigUInt64BE(BigInt(time), 0);

  const hmac = crypto.createHmac('sha1', secretBuffer);
  hmac.update(timeBuffer);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0x0f;
  const code = (
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  ) % 1000000;

  return code.toString().padStart(6, '0');
}

/**
 * Base32 decoding (RFC 4648)
 */
function base32Decode(encoded: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let index = 0;
  const output = Buffer.allocUnsafe(Math.ceil(encoded.length * 5 / 8));

  for (let i = 0; i < encoded.length; i++) {
    const char = encoded[i].toUpperCase();
    const charIndex = alphabet.indexOf(char);

    if (charIndex === -1) {
      continue; // Skip invalid characters
    }

    value = (value << 5) | charIndex;
    bits += 5;

    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }

  return output.slice(0, index);
}

/**
 * Generate a secure random string for backup codes
 */
export function generateSecureCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    result += chars[randomIndex];
  }

  return result;
}