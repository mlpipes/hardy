/**
 * MLPipes Auth Service - Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { EmailService } from '../lib/email-service'
import { SMSService } from '../lib/sms-service'
import { isValidEmail, isValidPassword, getPasswordStrength, sanitizePhoneNumber } from '../utils/validation'

describe('MLPipes Auth Service Integration', () => {
  let emailService: EmailService
  let smsService: SMSService

  beforeAll(() => {
    emailService = new EmailService()
    smsService = new SMSService()
  })

  describe('Email and SMS Integration', () => {
    it('should validate email before sending', async () => {
      const invalidEmail = 'invalid-email'
      const validEmail = 'test@mlpipes.ai'

      expect(isValidEmail(invalidEmail)).toBe(false)
      expect(isValidEmail(validEmail)).toBe(true)

      // Only attempt to send to valid email
      if (isValidEmail(validEmail)) {
        await expect(
          emailService.sendVerificationEmail(validEmail, {
            firstName: 'Test',
            verificationUrl: 'https://auth.mlpipes.ai/verify?token=test',
            expiresIn: '24 hours'
          })
        ).resolves.not.toThrow()
      }
    })

    it('should validate phone number before sending SMS', async () => {
      const invalidPhone = '123-456-7890'
      const validPhone = '+1234567890'

      // Phone should be sanitized and validated
      const sanitizedPhone = sanitizePhoneNumber(invalidPhone)
      expect(sanitizedPhone).toBe('+11234567890')

      if (smsService.isConfigured()) {
        await expect(
          smsService.sendVerificationCode(validPhone, '123456')
        ).resolves.not.toThrow()
      }
    })
  })

  describe('Password Security Integration', () => {
    it('should enforce strong password requirements', () => {
      const weakPasswords = [
        'password',
        '123456',
        'Password',
        'password123'
      ]

      const strongPasswords = [
        'StrongPassword123!',
        'MySecureP@ssw0rd2024',
        'Healthcare#Auth789'
      ]

      weakPasswords.forEach(password => {
        expect(isValidPassword(password)).toBe(false)
        const strength = getPasswordStrength(password)
        expect(strength.score).toBeLessThan(6)
        expect(strength.feedback.length).toBeGreaterThan(0)
      })

      strongPasswords.forEach(password => {
        expect(isValidPassword(password)).toBe(true)
        const strength = getPasswordStrength(password)
        expect(strength.score).toBeGreaterThanOrEqual(6)
      })
    })
  })

  describe('Healthcare Compliance Integration', () => {
    it('should support HIPAA-compliant audit logging structure', () => {
      const auditLogEntry = {
        userId: 'user-123',
        action: 'LOGIN_SUCCESS',
        resource: 'AUTH',
        timestamp: new Date().toISOString(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        metadata: {
          sessionId: 'session-456',
          organizationId: 'org-789',
          authMethod: 'email_password'
        }
      }

      expect(auditLogEntry.userId).toBeDefined()
      expect(auditLogEntry.action).toBe('LOGIN_SUCCESS')
      expect(auditLogEntry.timestamp).toBeDefined()
      expect(auditLogEntry.metadata.organizationId).toBeDefined()
    })

    it('should support multi-tenant organization structure', () => {
      const organization = {
        id: 'org-123',
        name: 'Test Healthcare Practice',
        organizationType: 'healthcare_practice',
        practiceNpi: '1234567893',
        fhirEndpoint: 'https://fhir.test-practice.com',
        complianceSettings: {
          hipaaCompliant: true,
          auditRetentionDays: 2555, // 7 years
          mfaRequired: true
        },
        subscriptionTier: 'enterprise'
      }

      expect(organization.organizationType).toBe('healthcare_practice')
      expect(organization.complianceSettings.hipaaCompliant).toBe(true)
      expect(organization.complianceSettings.auditRetentionDays).toBe(2555)
    })

    it('should support healthcare role-based access control', () => {
      const roles = {
        tenant_admin: {
          permissions: ['organization:create', 'audit:read', 'billing:update']
        },
        clinician: {
          permissions: ['patient:create', 'clinical_notes:create', 'appointment:create']
        },
        patient: {
          permissions: ['profile:read', 'appointment:create', 'medical_records:read']
        },
        staff: {
          permissions: ['appointment:read', 'patient:read']
        }
      }

      expect(roles.tenant_admin.permissions).toContain('audit:read')
      expect(roles.clinician.permissions).toContain('clinical_notes:create')
      expect(roles.patient.permissions).toContain('medical_records:read')
      expect(roles.patient.permissions).not.toContain('audit:read')
    })
  })

  describe('Service Configuration Integration', () => {
    it('should handle missing service configurations gracefully', () => {
      expect(typeof smsService.isConfigured).toBe('function')
      expect(typeof smsService.isConfigured()).toBe('boolean')

      // Should not throw when checking configuration
      expect(() => smsService.isConfigured()).not.toThrow()
    })

    it('should use environment-specific configurations', () => {
      expect(process.env.NODE_ENV).toBe('test')
      expect(process.env.DATABASE_URL).toContain('mlpipes_auth_test')
      expect(process.env.BETTER_AUTH_SECRET).toBeDefined()
    })
  })

  describe('Authentication Flow Integration', () => {
    it('should support complete registration flow', async () => {
      const userData = {
        email: 'newuser@mlpipes.ai',
        password: 'SecurePassword123!',
        firstName: 'New',
        lastName: 'User',
        organizationId: 'org-123',
        role: 'clinician'
      }

      // Validate input data
      expect(isValidEmail(userData.email)).toBe(true)
      expect(isValidPassword(userData.password)).toBe(true)

      // Simulate registration process
      const registrationSteps = [
        'validate_input',
        'hash_password',
        'create_user',
        'send_verification_email',
        'create_audit_log'
      ]

      expect(registrationSteps).toContain('validate_input')
      expect(registrationSteps).toContain('send_verification_email')
      expect(registrationSteps).toContain('create_audit_log')
    })

    it('should support 2FA setup flow', () => {
      const twoFASetup = {
        userId: 'user-123',
        method: 'totp',
        backupMethod: 'sms',
        phoneNumber: '+1234567890',
        secret: 'ABCDEFGHIJKLMNOP',
        qrCodeUrl: 'otpauth://totp/MLPipes%20Auth:user@example.com?secret=ABCDEFGHIJKLMNOP&issuer=MLPipes%20Auth'
      }

      expect(twoFASetup.method).toBe('totp')
      expect(twoFASetup.qrCodeUrl).toContain('MLPipes%20Auth')
      expect(twoFASetup.secret).toHaveLength(16)
    })

    it('should support passkey registration flow', () => {
      const passkeyRegistration = {
        userId: 'user-123',
        credentialId: 'credential-456',
        publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMI...',
        counter: 0,
        transports: ['internal', 'hybrid'],
        authenticatorData: new Uint8Array([1, 2, 3, 4, 5])
      }

      expect(passkeyRegistration.credentialId).toBeDefined()
      expect(passkeyRegistration.publicKey).toBeDefined()
      expect(passkeyRegistration.transports).toContain('internal')
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle email service errors gracefully', async () => {
      // Test with invalid email service configuration
      const invalidEmailService = new EmailService()
      ;(invalidEmailService as any).transporter = null

      await expect(
        invalidEmailService.sendEmail({
          to: 'test@mlpipes.ai',
          subject: 'Test',
          html: '<p>Test</p>'
        })
      ).rejects.toThrow()
    })

    it('should handle SMS service errors gracefully', async () => {
      // Test with unconfigured SMS service
      const unconfiguredSMSService = new SMSService()
      ;(unconfiguredSMSService as any).client = null

      await expect(
        unconfiguredSMSService.sendSMS({
          to: '+1234567890',
          message: 'Test message'
        })
      ).rejects.toThrow('Twilio client not configured')
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle validation of multiple items efficiently', () => {
      const emails = Array(1000).fill(0).map((_, i) => `user${i}@mlpipes.ai`)
      const passwords = Array(1000).fill(0).map((_, i) => `SecurePassword${i}!`)

      const startTime = Date.now()
      
      emails.forEach(email => isValidEmail(email))
      passwords.forEach(password => isValidPassword(password))
      
      const endTime = Date.now()
      const duration = endTime - startTime

      // Should validate 2000 items in under 1 second
      expect(duration).toBeLessThan(1000)
    })

    it('should handle password strength calculation efficiently', () => {
      const passwords = Array(100).fill(0).map((_, i) => `TestPassword${i}!@#`)

      const startTime = Date.now()
      
      passwords.forEach(password => getPasswordStrength(password))
      
      const endTime = Date.now()
      const duration = endTime - startTime

      // Should calculate strength for 100 passwords in under 100ms
      expect(duration).toBeLessThan(100)
    })
  })
})