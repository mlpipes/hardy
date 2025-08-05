/**
 * MLPipes Auth Service - Validation Tests
 */

import { describe, it, expect } from 'vitest'
import {
  isValidEmail,
  isValidPassword,
  isValidPhoneNumber,
  isValidName,
  isValidNPI,
  isValidTOTPToken,
  getPasswordStrength,
  sanitizeEmail,
  sanitizeName,
  sanitizePhoneNumber,
  isValidRateLimit,
  emailSchema,
  passwordSchema,
  phoneNumberSchema,
  nameSchema,
  npiSchema,
  totpTokenSchema
} from '../validation'

describe('Validation Utils', () => {
  describe('email validation', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@mlpipes.ai',
        'user.name@healthcare.org',
        'doctor123@hospital.com',
        'admin+test@clinic.net',
        'simple@example.io'
      ]

      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true)
      })
    })

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@mlpipes.ai',
        'test@',
        'test..test@mlpipes.ai',
        'test@mlpipes',
        '',
        'a'.repeat(250) + '@test.com' // too long
      ]

      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false)
      })
    })

    it('should normalize email to lowercase', () => {
      const result = emailSchema.parse('TEST@MLPIPES.AI')
      expect(result).toBe('test@mlpipes.ai')
    })
  })

  describe('password validation', () => {
    it('should validate strong passwords', () => {
      const validPasswords = [
        'StrongPassword123!',
        'MySecureP@ssw0rd',
        'Healthcare2024#Pass',
        'ComplexPassword$789'
      ]

      validPasswords.forEach(password => {
        expect(isValidPassword(password)).toBe(true)
      })
    })

    it('should reject weak passwords', () => {
      const invalidPasswords = [
        'weak',                    // too short
        'password123',             // no uppercase
        'PASSWORD123',             // no lowercase
        'StrongPassword',          // no numbers
        'StrongPassword123',       // no special chars
        'a'.repeat(130)            // too long
      ]

      invalidPasswords.forEach(password => {
        expect(isValidPassword(password)).toBe(false)
      })
    })
  })

  describe('phone number validation', () => {
    it('should validate correct E.164 phone numbers', () => {
      const validNumbers = [
        '+1234567890',
        '+12345678901',
        '+441234567890',
        '+86123456789'
      ]

      validNumbers.forEach(number => {
        expect(isValidPhoneNumber(number)).toBe(true)
      })
    })

    it('should reject invalid phone numbers', () => {
      const invalidNumbers = [
        '1234567890',        // missing +
        '+0123456789',       // starts with 0
        '+123456789012345',  // too long
        'invalid'            // not a number
      ]

      invalidNumbers.forEach(number => {
        expect(isValidPhoneNumber(number)).toBe(false)
      })
    })
  })

  describe('name validation', () => {
    it('should validate correct names', () => {
      const validNames = [
        'John',
        'Mary Jane',
        "O'Connor",
        'Smith-Jones',
        'José María'
      ]

      validNames.forEach(name => {
        expect(isValidName(name)).toBe(true)
      })
    })

    it('should reject invalid names', () => {
      const invalidNames = [
        '',                    // empty
        'John123',            // contains numbers
        'John@Smith',         // contains symbols
        'a'.repeat(51)        // too long
      ]

      invalidNames.forEach(name => {
        expect(isValidName(name)).toBe(false)
      })
    })
  })

  describe('NPI validation', () => {
    it('should validate correct NPI numbers', () => {
      const validNPIs = [
        '1234567893',  // Valid NPI with correct check digit
        '1245319599'   // Another valid NPI
      ]

      validNPIs.forEach(npi => {
        expect(isValidNPI(npi)).toBe(true)
      })
    })

    it('should reject invalid NPI numbers', () => {
      const invalidNPIs = [
        '123456789',   // too short
        '12345678901', // too long
        '1234567890',  // invalid check digit
        'abcdefghij'   // not numbers
      ]

      invalidNPIs.forEach(npi => {
        expect(isValidNPI(npi)).toBe(false)
      })
    })
  })

  describe('TOTP token validation', () => {
    it('should validate correct TOTP tokens', () => {
      const validTokens = [
        '123456',
        '000000',
        '999999'
      ]

      validTokens.forEach(token => {
        expect(isValidTOTPToken(token)).toBe(true)
      })
    })

    it('should reject invalid TOTP tokens', () => {
      const invalidTokens = [
        '12345',     // too short
        '1234567',   // too long
        'abcdef',    // not numbers
        ''           // empty
      ]

      invalidTokens.forEach(token => {
        expect(isValidTOTPToken(token)).toBe(false)
      })
    })
  })

  describe('password strength', () => {
    it('should score strong passwords highly', () => {
      const strongPassword = 'StrongPassword123!@#$'
      const result = getPasswordStrength(strongPassword)
      
      expect(result.score).toBeGreaterThan(6)
      expect(result.feedback).toHaveLength(0)
    })

    it('should provide feedback for weak passwords', () => {
      const weakPassword = 'weak'
      const result = getPasswordStrength(weakPassword)
      
      expect(result.score).toBeLessThan(4)
      expect(result.feedback.length).toBeGreaterThan(0)
      expect(result.feedback).toContain('Use at least 12 characters')
    })

    it('should give bonus points for very long passwords', () => {
      const longPassword = 'ThisIsAVeryLongPassword123!@#'
      const result = getPasswordStrength(longPassword)
      
      expect(result.score).toBeGreaterThan(7)
    })
  })

  describe('sanitization functions', () => {
    it('should sanitize email addresses', () => {
      expect(sanitizeEmail('  TEST@MLPIPES.AI  ')).toBe('test@mlpipes.ai')
      expect(sanitizeEmail('User@Example.Com')).toBe('user@example.com')
    })

    it('should sanitize names', () => {
      expect(sanitizeName('  John   Doe  ')).toBe('John Doe')
      expect(sanitizeName('Mary\t\nJane')).toBe('Mary Jane')
    })

    it('should sanitize phone numbers', () => {
      expect(sanitizePhoneNumber('(123) 456-7890')).toBe('+11234567890')
      expect(sanitizePhoneNumber('123-456-7890')).toBe('+11234567890')
      expect(sanitizePhoneNumber('+1 123 456 7890')).toBe('+11234567890')
      expect(sanitizePhoneNumber('1234567890')).toBe('+11234567890')
    })
  })

  describe('rate limiting validation', () => {
    it('should validate correct rate limit values', () => {
      expect(isValidRateLimit(100, 60000)).toBe(true)
      expect(isValidRateLimit(1000, 3600000)).toBe(true)
      expect(isValidRateLimit(10, 1000)).toBe(true)
    })

    it('should reject invalid rate limit values', () => {
      expect(isValidRateLimit(0, 60000)).toBe(false)      // no requests
      expect(isValidRateLimit(100, 500)).toBe(false)      // window too short
      expect(isValidRateLimit(20000, 60000)).toBe(false)  // too many requests
      expect(isValidRateLimit(-10, 60000)).toBe(false)    // negative requests
    })
  })

  describe('schema exports', () => {
    it('should export validation schemas', () => {
      expect(emailSchema).toBeDefined()
      expect(passwordSchema).toBeDefined()
      expect(phoneNumberSchema).toBeDefined()
      expect(nameSchema).toBeDefined()
      expect(npiSchema).toBeDefined()
      expect(totpTokenSchema).toBeDefined()
    })

    it('should use schemas correctly', () => {
      expect(() => emailSchema.parse('test@mlpipes.ai')).not.toThrow()
      expect(() => passwordSchema.parse('StrongPassword123!')).not.toThrow()
      expect(() => phoneNumberSchema.parse('+1234567890')).not.toThrow()
      expect(() => nameSchema.parse('John Doe')).not.toThrow()
      expect(() => totpTokenSchema.parse('123456')).not.toThrow()
    })
  })
})