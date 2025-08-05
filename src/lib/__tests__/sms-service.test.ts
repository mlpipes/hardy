/**
 * MLPipes Auth Service - SMS Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SMSService, smsService } from '../sms-service'

describe('SMSService', () => {
  let service: SMSService
  
  beforeEach(() => {
    service = new SMSService()
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create SMS service', () => {
      expect(service).toBeInstanceOf(SMSService)
    })

    it('should initialize Twilio client when credentials are available', () => {
      expect(service.isConfigured()).toBe(true)
    })
  })

  describe('sendSMS', () => {
    it('should send SMS successfully', async () => {
      const options = {
        to: '+1234567890',
        message: 'Test message'
      }

      await expect(service.sendSMS(options)).resolves.not.toThrow()
    })

    it('should throw error for invalid phone number', async () => {
      const options = {
        to: 'invalid-phone',
        message: 'Test message'
      }

      await expect(service.sendSMS(options)).rejects.toThrow('Invalid phone number format')
    })

    it('should throw error when Twilio client is not configured', async () => {
      // Create service without Twilio credentials
      const unconfiguredService = new SMSService()
      ;(unconfiguredService as any).client = null

      const options = {
        to: '+1234567890',
        message: 'Test message'
      }

      await expect(unconfiguredService.sendSMS(options)).rejects.toThrow('Twilio client not configured')
    })

    it('should throw error when phone number is not configured', async () => {
      // Temporarily remove phone number
      const originalPhoneNumber = process.env.TWILIO_PHONE_NUMBER
      delete process.env.TWILIO_PHONE_NUMBER

      const options = {
        to: '+1234567890',
        message: 'Test message'
      }

      await expect(service.sendSMS(options)).rejects.toThrow('Twilio phone number not configured')

      // Restore phone number
      process.env.TWILIO_PHONE_NUMBER = originalPhoneNumber
    })

    it('should handle Twilio API errors', async () => {
      // Mock Twilio client to throw error
      const mockClient = {
        messages: {
          create: vi.fn().mockRejectedValue(new Error('Twilio API Error'))
        }
      }
      ;(service as any).client = mockClient

      const options = {
        to: '+1234567890',
        message: 'Test message'
      }

      await expect(service.sendSMS(options)).rejects.toThrow('SMS sending failed')
    })
  })

  describe('sendVerificationCode', () => {
    it('should send verification code with correct message', async () => {
      const phoneNumber = '+1234567890'
      const code = '123456'

      const sendSMSSpy = vi.spyOn(service, 'sendSMS')
      
      await service.sendVerificationCode(phoneNumber, code)
      
      expect(sendSMSSpy).toHaveBeenCalledWith({
        to: phoneNumber,
        message: expect.stringContaining('123456')
      })
      expect(sendSMSSpy).toHaveBeenCalledWith({
        to: phoneNumber,
        message: expect.stringContaining('MLPipes Auth')
      })
    })
  })

  describe('sendTwoFactorCode', () => {
    it('should send 2FA code with correct message', async () => {
      const phoneNumber = '+1987654321'
      const code = '987654'

      const sendSMSSpy = vi.spyOn(service, 'sendSMS')
      
      await service.sendTwoFactorCode(phoneNumber, code)
      
      expect(sendSMSSpy).toHaveBeenCalledWith({
        to: phoneNumber,
        message: expect.stringContaining('987654')
      })
      expect(sendSMSSpy).toHaveBeenCalledWith({
        to: phoneNumber,
        message: expect.stringContaining('2FA code')
      })
    })
  })

  describe('isValidPhoneNumber', () => {
    it('should validate correct E.164 phone numbers', () => {
      const validNumbers = [
        '+1234567890',
        '+12345678901',
        '+441234567890',
        '+86123456789',
        '+91234567890'
      ]

      validNumbers.forEach(number => {
        expect((service as any).isValidPhoneNumber(number)).toBe(true)
      })
    })

    it('should reject invalid phone numbers', () => {
      const invalidNumbers = [
        '1234567890',        // missing +
        '+1',                // too short
        '+123456789012345',  // too long
        '+0123456789',       // starts with 0
        'abc123456789',      // contains letters
        '+1-234-567-890',    // contains dashes
        ''                   // empty string
      ]

      invalidNumbers.forEach(number => {
        expect((service as any).isValidPhoneNumber(number)).toBe(false)
      })
    })
  })

  describe('isConfigured', () => {
    it('should return true when all credentials are configured', () => {
      expect(service.isConfigured()).toBe(true)
    })

    it('should return false when credentials are missing', () => {
      // Temporarily remove credentials
      const originalSid = process.env.TWILIO_ACCOUNT_SID
      const originalToken = process.env.TWILIO_AUTH_TOKEN
      const originalPhone = process.env.TWILIO_PHONE_NUMBER

      delete process.env.TWILIO_ACCOUNT_SID
      delete process.env.TWILIO_AUTH_TOKEN
      delete process.env.TWILIO_PHONE_NUMBER

      const unconfiguredService = new SMSService()
      expect(unconfiguredService.isConfigured()).toBe(false)

      // Restore credentials
      process.env.TWILIO_ACCOUNT_SID = originalSid
      process.env.TWILIO_AUTH_TOKEN = originalToken
      process.env.TWILIO_PHONE_NUMBER = originalPhone
    })
  })

  describe('singleton instance', () => {
    it('should export singleton SMS service', () => {
      expect(smsService).toBeInstanceOf(SMSService)
    })

    it('should export sendSMS function', () => {
      expect(typeof smsService.sendSMS).toBe('function')
    })
  })
})