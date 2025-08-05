/**
 * MLPipes Auth Service - Cryptographic Utilities
 * Secure token generation, TOTP, and encryption functions
 */

import crypto from 'crypto'
import * as speakeasy from 'speakeasy'

/**
 * Generate a cryptographically secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Generate a secure URL-safe token
 */
export function generateURLSafeToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url')
}

/**
 * Generate a TOTP secret for 2FA
 */
export function generateTOTPSecret(): string {
  return speakeasy.generateSecret({
    name: 'MLPipes Auth',
    issuer: 'MLPipes',
    length: 32,
  }).base32
}

/**
 * Verify a TOTP token
 */
export function verifyTOTP(token: string, secret: string, window: number = 1): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window,
    step: 30,
  })
}

/**
 * Generate a TOTP token (for testing/backup)
 */
export function generateTOTP(secret: string): string {
  return speakeasy.totp({
    secret,
    encoding: 'base32',
    step: 30,
  })
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string, rounds: number = 12): Promise<string> {
  const bcrypt = await import('bcryptjs')
  return bcrypt.hash(password, rounds)
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs')
  return bcrypt.compare(password, hash)
}

/**
 * Generate a PKCE code verifier
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/**
 * Generate a PKCE code challenge from verifier
 */
export function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url')
}

/**
 * Verify PKCE code challenge
 */
export function verifyCodeChallenge(verifier: string, challenge: string): boolean {
  const computed = generateCodeChallenge(verifier)
  return computed === challenge
}

/**
 * Encrypt sensitive data (for database storage)
 */
export function encrypt(text: string, key?: string): string {
  const encryptionKey = key || process.env.ENCRYPTION_KEY || generateSecureToken(32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipher('aes-256-cbc', encryptionKey)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  return iv.toString('hex') + ':' + encrypted
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedText: string, key?: string): string {
  const encryptionKey = key || process.env.ENCRYPTION_KEY || generateSecureToken(32)
  const parts = encryptedText.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encrypted = parts[1]
  
  const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

/**
 * Generate a secure session token
 */
export function generateSessionToken(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = generateSecureToken(16)
  return `mlp_${timestamp}_${randomPart}`
}

/**
 * Generate a secure API key
 */
export function generateAPIKey(prefix: string = 'mlp'): string {
  const timestamp = Date.now().toString(36)
  const randomPart = generateSecureToken(20)
  return `${prefix}_${timestamp}_${randomPart}`
}

/**
 * Hash data for comparison (non-reversible)
 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

/**
 * Create HMAC signature
 */
export function createHMAC(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex')
}

/**
 * Verify HMAC signature
 */
export function verifyHMAC(data: string, signature: string, secret: string): boolean {
  const computed = createHMAC(data, secret)
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature))
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID()
}

/**
 * Generate a time-based UUID (sortable)
 */
export function generateTimeUUID(): string {
  const timestamp = Date.now().toString(16).padStart(12, '0')
  const random = crypto.randomBytes(10).toString('hex')
  return `${timestamp}${random}`.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')
}

/**
 * Constant-time string comparison (prevents timing attacks)
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

/**
 * Generate a secure PIN
 */
export function generatePIN(length: number = 6): string {
  const digits = '0123456789'
  let pin = ''
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, digits.length)
    pin += digits[randomIndex]
  }
  
  return pin
}

/**
 * Generate backup codes for 2FA
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = []
  
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`)
  }
  
  return codes
}

/**
 * Validate backup code format
 */
export function isValidBackupCode(code: string): boolean {
  return /^[A-F0-9]{4}-[A-F0-9]{4}$/.test(code)
}

/**
 * Generate a QR code-friendly secret
 */
export function generateQRSecret(): string {
  return crypto.randomBytes(20).toString('base32')
}