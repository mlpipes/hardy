/**
 * MLPipes Auth Service - Validation Utilities
 * HIPAA-compliant validation functions
 */

import { z } from 'zod'

// Email validation with healthcare domain support
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(5, 'Email must be at least 5 characters')
  .max(254, 'Email must be less than 255 characters')
  .toLowerCase()

// Healthcare-grade password validation
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be less than 129 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
  )

// Phone number validation (E.164 format)
export const phoneNumberSchema = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format (+1234567890)')

// Name validation
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(50, 'Name must be less than 51 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')

// Organization name validation
export const organizationNameSchema = z
  .string()
  .min(2, 'Organization name must be at least 2 characters')
  .max(100, 'Organization name must be less than 101 characters')
  .regex(/^[a-zA-Z0-9\s\-.,&'()]+$/, 'Organization name contains invalid characters')

// NPI (National Provider Identifier) validation
export const npiSchema = z
  .string()
  .regex(/^\d{10}$/, 'NPI must be exactly 10 digits')
  .refine((npi) => validateNPICheckDigit(npi), 'Invalid NPI check digit')

// 2FA token validation
export const totpTokenSchema = z
  .string()
  .regex(/^\d{6}$/, 'TOTP token must be exactly 6 digits')

// UUID validation
export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format')

// Validation functions
export function isValidEmail(email: string): boolean {
  try {
    emailSchema.parse(email)
    return true
  } catch {
    return false
  }
}

export function isValidPassword(password: string): boolean {
  try {
    passwordSchema.parse(password)
    return true
  } catch {
    return false
  }
}

export function isValidPhoneNumber(phoneNumber: string): boolean {
  try {
    phoneNumberSchema.parse(phoneNumber)
    return true
  } catch {
    return false
  }
}

export function isValidName(name: string): boolean {
  try {
    nameSchema.parse(name)
    return true
  } catch {
    return false
  }
}

export function isValidNPI(npi: string): boolean {
  try {
    npiSchema.parse(npi)
    return true
  } catch {
    return false
  }
}

export function isValidTOTPToken(token: string): boolean {
  try {
    totpTokenSchema.parse(token)
    return true
  } catch {
    return false
  }
}

// Password strength scoring
export function getPasswordStrength(password: string): {
  score: number
  feedback: string[]
} {
  const feedback: string[] = []
  let score = 0

  // Length check
  if (password.length >= 12) score += 2
  else if (password.length >= 8) score += 1
  else feedback.push('Use at least 12 characters')

  // Character variety
  if (/[a-z]/.test(password)) score += 1
  else feedback.push('Add lowercase letters')

  if (/[A-Z]/.test(password)) score += 1
  else feedback.push('Add uppercase letters')

  if (/\d/.test(password)) score += 1
  else feedback.push('Add numbers')

  if (/[@$!%*?&]/.test(password)) score += 1
  else feedback.push('Add special characters')

  // Complexity bonus
  if (password.length >= 16) score += 1
  if (/[^a-zA-Z0-9@$!%*?&]/.test(password)) score += 1

  return { score, feedback }
}

// NPI check digit validation (Luhn algorithm)
function validateNPICheckDigit(npi: string): boolean {
  if (npi.length !== 10) return false

  // Add prefix "80840" for NPI validation
  const fullNPI = `80840${npi.substring(0, 9)}`
  let sum = 0
  let alternate = false

  // Calculate check digit using Luhn algorithm
  for (let i = fullNPI.length - 1; i >= 0; i--) {
    let digit = parseInt(fullNPI.charAt(i))

    if (alternate) {
      digit *= 2
      if (digit > 9) {
        digit = (digit % 10) + 1
      }
    }

    sum += digit
    alternate = !alternate
  }

  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit === parseInt(npi.charAt(9))
}

// Sanitization functions
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

export function sanitizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export function sanitizePhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '')
  
  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    // Assume US number if no country code
    if (cleaned.length === 10) {
      cleaned = `+1${cleaned}`
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      cleaned = `+${cleaned}`
    }
  }
  
  return cleaned
}

// Rate limiting validation
export function isValidRateLimit(requests: number, windowMs: number): boolean {
  return requests > 0 && windowMs >= 1000 && requests <= 10000
}

// Export validation schemas for external use
export {
  emailSchema,
  passwordSchema,
  phoneNumberSchema,
  nameSchema,
  organizationNameSchema,
  npiSchema,
  totpTokenSchema,
  uuidSchema
}