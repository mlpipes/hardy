/**
 * MLPipes Auth Service - SMS Service
 * HIPAA-compliant SMS service using Twilio
 */

import Twilio from 'twilio'

interface SMSOptions {
  to: string
  message: string
}

export class SMSService {
  private client: Twilio.Twilio | null = null

  constructor() {
    // Only initialize Twilio with valid credentials (not placeholder values)
    if (this.hasValidTwilioCredentials()) {
      this.client = Twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      )
    } else {
      console.warn('⚠️ Twilio SMS service not configured - SMS features will be disabled')
    }
  }

  private hasValidTwilioCredentials(): boolean {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN

    return !!(
      accountSid &&
      authToken &&
      accountSid.startsWith('AC') && // Valid Twilio Account SID format
      accountSid.length >= 34 &&     // Minimum length for valid Account SID
      authToken !== 'placeholder-token' && // Not a placeholder
      accountSid !== 'placeholder-sid'     // Not a placeholder
    )
  }

  async sendSMS(options: SMSOptions): Promise<void> {
    if (!this.client) {
      throw new Error('Twilio client not configured')
    }

    if (!process.env.TWILIO_PHONE_NUMBER) {
      throw new Error('Twilio phone number not configured')
    }

    // Validate phone number format (basic E.164 validation)
    if (!this.isValidPhoneNumber(options.to)) {
      throw new Error('Invalid phone number format')
    }

    try {
      const message = await this.client.messages.create({
        body: options.message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: options.to,
      })

      console.log('SMS sent successfully:', message.sid)
    } catch (error) {
      console.error('Failed to send SMS:', error)
      throw new Error('SMS sending failed')
    }
  }

  async sendVerificationCode(phoneNumber: string, code: string): Promise<void> {
    const message = `Your MLPipes Auth verification code is: ${code}. This code expires in 5 minutes. Do not share this code with anyone.`
    await this.sendSMS({ to: phoneNumber, message })
  }

  async sendTwoFactorCode(phoneNumber: string, code: string): Promise<void> {
    const message = `Your MLPipes Auth 2FA code is: ${code}. This code expires in 5 minutes.`
    await this.sendSMS({ to: phoneNumber, message })
  }

  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic E.164 format validation: +[country code][number]
    const e164Regex = /^\+[1-9]\d{1,14}$/
    return e164Regex.test(phoneNumber)
  }

  isConfigured(): boolean {
    return this.hasValidTwilioCredentials() && !!process.env.TWILIO_PHONE_NUMBER
  }
}

// Lazy singleton instance
let smsServiceInstance: SMSService | null = null

function getSMSService(): SMSService {
  if (!smsServiceInstance) {
    smsServiceInstance = new SMSService()
  }
  return smsServiceInstance
}

// Export singleton instance getter
export const smsService = getSMSService

// Export for direct use
export const sendSMS = (options: SMSOptions) => getSMSService().sendSMS(options)