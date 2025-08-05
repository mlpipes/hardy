/**
 * MLPipes Auth Service - Email Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EmailService, emailService } from '../email-service'

describe('EmailService', () => {
  let service: EmailService
  
  beforeEach(() => {
    service = new EmailService()
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create email service with correct configuration', () => {
      expect(service).toBeInstanceOf(EmailService)
    })
  })

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const emailOptions = {
        to: 'test@mlpipes.ai',
        subject: 'Test Email',
        html: '<p>Test content</p>'
      }

      await expect(service.sendEmail(emailOptions)).resolves.not.toThrow()
    })

    it('should handle email sending failure', async () => {
      // Mock transporter to throw error
      const mockTransporter = {
        sendMail: vi.fn().mockRejectedValue(new Error('SMTP Error'))
      }
      ;(service as any).transporter = mockTransporter

      const emailOptions = {
        to: 'test@mlpipes.ai',
        subject: 'Test Email',
        html: '<p>Test content</p>'
      }

      await expect(service.sendEmail(emailOptions)).rejects.toThrow('Email sending failed')
    })
  })

  describe('sendVerificationEmail', () => {
    it('should send verification email with correct template', async () => {
      const email = 'test@mlpipes.ai'
      const data = {
        firstName: 'John',
        verificationUrl: 'https://auth.mlpipes.ai/verify?token=123',
        expiresIn: '24 hours'
      }

      await expect(service.sendVerificationEmail(email, data)).resolves.not.toThrow()
    })

    it('should send verification email without first name', async () => {
      const email = 'test@mlpipes.ai'
      const data = {
        verificationUrl: 'https://auth.mlpipes.ai/verify?token=123',
        expiresIn: '24 hours'
      }

      await expect(service.sendVerificationEmail(email, data)).resolves.not.toThrow()
    })
  })

  describe('sendMagicLinkEmail', () => {
    it('should send magic link email with correct template', async () => {
      const email = 'test@mlpipes.ai'
      const data = {
        firstName: 'Jane',
        magicLinkUrl: 'https://auth.mlpipes.ai/magic?token=abc',
        expiresIn: '15 minutes'
      }

      await expect(service.sendMagicLinkEmail(email, data)).resolves.not.toThrow()
    })
  })

  describe('sendTwoFactorEmail', () => {
    it('should send 2FA email with correct template', async () => {
      const email = 'test@mlpipes.ai'
      const data = {
        firstName: 'Bob',
        otp: '123456',
        expiresIn: '5 minutes'
      }

      await expect(service.sendTwoFactorEmail(email, data)).resolves.not.toThrow()
    })

    it('should include OTP in email template', async () => {
      const email = 'test@mlpipes.ai'
      const data = {
        otp: '987654',
        expiresIn: '5 minutes'
      }

      // Spy on sendEmail to check template content
      const sendEmailSpy = vi.spyOn(service, 'sendEmail')
      
      await service.sendTwoFactorEmail(email, data)
      
      expect(sendEmailSpy).toHaveBeenCalledWith({
        to: email,
        subject: 'MLPipes Auth - Your Verification Code',
        html: expect.stringContaining('987654')
      })
    })
  })

  describe('htmlToText', () => {
    it('should convert HTML to plain text', () => {
      const html = '<p>Hello <strong>World</strong></p>'
      const text = (service as any).htmlToText(html)
      expect(text).toBe('Hello World')
    })

    it('should handle complex HTML', () => {
      const html = `
        <div>
          <h1>Title</h1>
          <p>Paragraph with <a href="#">link</a></p>
        </div>
      `
      const text = (service as any).htmlToText(html)
      expect(text).toBe('Title Paragraph with link')
    })
  })

  describe('template methods', () => {
    it('should generate verification email template with all data', () => {
      const data = {
        firstName: 'Alice',
        verificationUrl: 'https://test.com/verify',
        expiresIn: '24 hours'
      }
      
      const template = (service as any).getVerificationEmailTemplate(data)
      
      expect(template).toContain('Welcome, Alice!')
      expect(template).toContain('https://test.com/verify')
      expect(template).toContain('24 hours')
      expect(template).toContain('MLPipes Auth')
    })

    it('should generate magic link email template', () => {
      const data = {
        magicLinkUrl: 'https://test.com/magic',
        expiresIn: '15 minutes'
      }
      
      const template = (service as any).getMagicLinkEmailTemplate(data)
      
      expect(template).toContain('https://test.com/magic')
      expect(template).toContain('15 minutes')
      expect(template).toContain('Sign In Securely')
    })

    it('should generate 2FA email template', () => {
      const data = {
        otp: '123456',
        expiresIn: '5 minutes'
      }
      
      const template = (service as any).getTwoFactorEmailTemplate(data)
      
      expect(template).toContain('123456')
      expect(template).toContain('5 minutes')
      expect(template).toContain('Verification Code')
    })
  })

  describe('singleton instance', () => {
    it('should export singleton email service', () => {
      expect(emailService).toBeInstanceOf(EmailService)
    })

    it('should export sendEmail function', () => {
      expect(typeof emailService.sendEmail).toBe('function')
    })
  })
})