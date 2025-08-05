/**
 * MLPipes Auth Service - Email Service
 * HIPAA-compliant email service with professional templates
 */

import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

interface VerificationEmailData {
  firstName?: string
  verificationUrl: string
  expiresIn: string
}

interface MagicLinkEmailData {
  firstName?: string
  magicLinkUrl: string
  expiresIn: string
}

interface TwoFactorEmailData {
  firstName?: string
  otp: string
  expiresIn: string
}

export class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'MLPipes Auth <noreply@mlpipes.ai>',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.htmlToText(options.html),
      })

      console.log('Email sent successfully:', info.messageId)
    } catch (error) {
      console.error('Failed to send email:', error)
      throw new Error('Email sending failed')
    }
  }

  async sendVerificationEmail(email: string, data: VerificationEmailData): Promise<void> {
    const html = this.getVerificationEmailTemplate(data)
    await this.sendEmail({
      to: email,
      subject: 'MLPipes Auth - Verify Your Email Address',
      html,
    })
  }

  async sendMagicLinkEmail(email: string, data: MagicLinkEmailData): Promise<void> {
    const html = this.getMagicLinkEmailTemplate(data)
    await this.sendEmail({
      to: email,
      subject: 'MLPipes Auth - Sign In with Magic Link',
      html,
    })
  }

  async sendTwoFactorEmail(email: string, data: TwoFactorEmailData): Promise<void> {
    const html = this.getTwoFactorEmailTemplate(data)
    await this.sendEmail({
      to: email,
      subject: 'MLPipes Auth - Your Verification Code',
      html,
    })
  }

  private getVerificationEmailTemplate(data: VerificationEmailData): string {
    return `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">MLPipes Auth</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Secure Healthcare Authentication</p>
        </div>
        <div style="padding: 40px 30px; background: white;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0;">Welcome${data.firstName ? `, ${data.firstName}` : ''}!</h2>
          <p style="color: #6b7280; line-height: 1.6; margin: 0 0 20px 0;">
            Thank you for creating your MLPipes Auth account. To complete your registration and ensure the security of your account, please verify your email address.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.verificationUrl}" style="display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 14px; margin: 30px 0 0 0;">
            This verification link will expire in ${data.expiresIn}. If you didn't create this account, please contact our support team.
          </p>
        </div>
        <div style="padding: 20px 30px; background: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            MLPipes Auth - Secure Healthcare Authentication
          </p>
        </div>
      </div>
    `
  }

  private getMagicLinkEmailTemplate(data: MagicLinkEmailData): string {
    return `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">MLPipes Auth</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Secure Healthcare Authentication</p>
        </div>
        <div style="padding: 40px 30px; background: white;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0;">Sign in to your account</h2>
          <p style="color: #6b7280; line-height: 1.6; margin: 0 0 30px 0;">
            Click the button below to securely sign in to your MLPipes Auth account. This link will expire in ${data.expiresIn} for your security.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.magicLinkUrl}" style="display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Sign In Securely
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 14px; margin: 30px 0 0 0;">
            If you didn't request this link, you can safely ignore this email.
          </p>
        </div>
        <div style="padding: 20px 30px; background: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            MLPipes Auth - Secure Healthcare Authentication
          </p>
        </div>
      </div>
    `
  }

  private getTwoFactorEmailTemplate(data: TwoFactorEmailData): string {
    return `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">MLPipes Auth</h1>
        </div>
        <div style="padding: 40px 30px; background: white; text-align: center;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0;">Verification Code</h2>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea;">${data.otp}</span>
          </div>
          <p style="color: #6b7280; margin: 20px 0 0 0;">
            This code expires in ${data.expiresIn}. Do not share this code with anyone.
          </p>
        </div>
      </div>
    `
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
}

// Export singleton instance
export const emailService = new EmailService()

// Export for direct use
export const sendEmail = (options: EmailOptions) => emailService.sendEmail(options)