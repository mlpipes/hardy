/**
 * Email Service - AWS SES Integration for Hardy Auth
 * Handles transactional emails with healthcare compliance
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import nodemailer from 'nodemailer';

// Initialize AWS SES client
const sesClient = new SESClient({
  region: process.env.AWS_SES_REGION || 'us-east-1',
  // Use AWS SDK default credential chain (includes AWS CLI profiles)
  ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  }),
});

interface EmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

interface VerificationEmailOptions {
  userEmail: string;
  userName: string | null;
  verificationUrl: string;
  organizationName?: string;
}

// Initialize SMTP transporter (lazy loaded)
let smtpTransporter: nodemailer.Transporter | null = null;

function createSMTPTransporter() {
  if (!smtpTransporter && isSmtpConfigured()) {
    smtpTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return smtpTransporter;
}

/**
 * Check if SMTP is configured
 */
function isSmtpConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

/**
 * Send email using SMTP
 */
async function sendEmailViaSMTP(options: EmailOptions): Promise<boolean> {
  const transporter = createSMTPTransporter();
  if (!transporter) {
    console.log('❌ SMTP not configured, cannot send email');
    return false;
  }

  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.AWS_SES_FROM_EMAIL || 'noreply@hardy-auth.com';
  const fromName = process.env.SMTP_FROM_NAME || 'Hardy Auth Service';

  console.log('📧 SMTP Configuration Debug:');
  console.log('- SMTP_HOST:', process.env.SMTP_HOST);
  console.log('- SMTP_PORT:', process.env.SMTP_PORT);
  console.log('- SMTP_USER:', process.env.SMTP_USER);
  console.log('- SMTP_SECURE:', process.env.SMTP_SECURE);
  console.log('- FROM:', `${fromName} <${fromEmail}>`);
  console.log('- TO:', options.to);

  try {
    console.log('🚀 Attempting SMTP send...');
    const result = await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.htmlContent,
      text: options.textContent,
    });

    console.log('✅ SMTP send result:', {
      messageId: result.messageId,
      response: result.response,
      accepted: result.accepted,
      rejected: result.rejected,
      pending: result.pending
    });
    console.log('✅ Email sent successfully via SMTP to:', options.to);
    return true;
  } catch (error) {
    console.error('❌ Failed to send email via SMTP:', error);
    console.error('❌ SMTP Error details:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response
    });
    return false;
  }
}

/**
 * Send email using AWS SES
 */
async function sendEmailViaSES(options: EmailOptions): Promise<boolean> {
  const fromEmail = process.env.AWS_SES_FROM_EMAIL || 'noreply@hardy-auth.com';

  try {
    const command = new SendEmailCommand({
      Source: fromEmail,
      Destination: {
        ToAddresses: [options.to],
      },
      Message: {
        Subject: {
          Data: options.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: options.htmlContent,
            Charset: 'UTF-8',
          },
          ...(options.textContent && {
            Text: {
              Data: options.textContent,
              Charset: 'UTF-8',
            },
          }),
        },
      },
    });

    await sesClient.send(command);
    console.log('✅ Email sent successfully via AWS SES to:', options.to);
    return true;
  } catch (error) {
    console.error('❌ Failed to send email via AWS SES:', error);
    return false;
  }
}

/**
 * Send email with intelligent fallback (SES → SMTP → Development)
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // Try AWS SES first if configured
  const hasAwsSesConfig = !!(process.env.AWS_SES_FROM_EMAIL && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

  if (hasAwsSesConfig) {
    const sesSuccess = await sendEmailViaSES(options);
    if (sesSuccess) {
      return true;
    }
    console.log('🔄 AWS SES failed, trying SMTP backup...');
  }

  // Try SMTP backup if configured
  if (isSmtpConfigured()) {
    const smtpSuccess = await sendEmailViaSMTP(options);
    if (smtpSuccess) {
      return true;
    }
    console.log('🔄 SMTP also failed, falling back to development mode');
  }

  // Both failed or not configured
  console.log('❌ All email services failed or not configured');
  return false;
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(options: VerificationEmailOptions): Promise<boolean> {
  const { userEmail, userName, verificationUrl, organizationName } = options;

  const displayName = userName || userEmail.split('@')[0];
  const orgText = organizationName ? ` for ${organizationName}` : '';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email - Hardy Auth</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; text-align: center; padding: 32px 24px; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
        .content { padding: 32px 24px; }
        .verification-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center; }
        .verify-button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; margin: 16px 0; }
        .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; font-size: 14px; color: #64748b; }
        .security-notice { background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 16px; margin: 16px 0; }
        .warning-icon { color: #f59e0b; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🛡️ Hardy Auth</div>
          <p>Healthcare Authentication System</p>
        </div>

        <div class="content">
          <h1>Verify Your Email Address</h1>

          <p>Hello <strong>${displayName}</strong>,</p>

          <p>Thank you for creating your Hardy Auth account${orgText}. To complete your registration and secure your account, please verify your email address by clicking the button below:</p>

          <div class="verification-box">
            <h2>Email Verification Required</h2>
            <p>Click the button below to verify <strong>${userEmail}</strong></p>
            <a href="${verificationUrl}" class="verify-button">Verify Email Address</a>
            <p style="margin-top: 16px; font-size: 14px; color: #64748b;">
              This link will expire in 24 hours for your security.
            </p>
          </div>

          <div class="security-notice">
            <p><span class="warning-icon">⚠️</span> <strong>Security Notice:</strong></p>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li>This email contains a secure verification link</li>
              <li>Only click the button if you recently created a Hardy Auth account</li>
              <li>If you didn't create this account, please ignore this email</li>
              <li>For healthcare compliance, all account activities are logged</li>
            </ul>
          </div>

          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background-color: #f8fafc; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 14px;">
            ${verificationUrl}
          </p>

          <p>Once verified, you'll have full access to your Hardy Auth account and all healthcare authentication features.</p>

          <p>If you have any questions or need assistance, please contact our support team.</p>
        </div>

        <div class="footer">
          <p><strong>Hardy Auth</strong> - Healthcare Authentication System</p>
          <p>This email was sent to ${userEmail} because you created a Hardy Auth account.</p>
          <p>© ${new Date().getFullYear()} Hardy Auth. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Hardy Auth - Verify Your Email Address

Hello ${displayName},

Thank you for creating your Hardy Auth account${orgText}. To complete your registration and secure your account, please verify your email address.

Verification Link: ${verificationUrl}

This link will expire in 24 hours for your security.

SECURITY NOTICE:
- This email contains a secure verification link
- Only click the link if you recently created a Hardy Auth account
- If you didn't create this account, please ignore this email
- For healthcare compliance, all account activities are logged

Once verified, you'll have full access to your Hardy Auth account and all healthcare authentication features.

If you have any questions or need assistance, please contact our support team.

Hardy Auth - Healthcare Authentication System
© ${new Date().getFullYear()} Hardy Auth. All rights reserved.
  `;

  return sendEmail({
    to: userEmail,
    subject: `Verify Your Email Address - Hardy Auth${orgText}`,
    htmlContent,
    textContent,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail({
  userEmail,
  userName,
  resetUrl,
  organizationName = "Hardy Auth",
}: {
  userEmail: string;
  userName: string;
  resetUrl: string;
  organizationName?: string;
}): Promise<boolean> {
  const displayName = userName || userEmail.split('@')[0];
  const orgText = organizationName ? ` for ${organizationName}` : '';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f5f5f5;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #ffffff;
          padding: 32px 40px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 40px;
        }
        .button {
          display: inline-block;
          padding: 14px 32px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
          margin: 20px 0;
        }
        .security-notice {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 16px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          background-color: #f8fafc;
          padding: 24px 40px;
          text-align: center;
          font-size: 14px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
        </div>

        <div class="content">
          <p>Hello ${displayName},</p>

          <p>We received a request to reset your password${orgText}. Click the button below to create a new password:</p>

          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Your Password</a>
          </div>

          <div class="security-notice">
            <strong>🔒 Security Notice:</strong>
            <ul style="margin: 8px 0;">
              <li>This link will expire in 1 hour for your security</li>
              <li>If you didn't request this password reset, please ignore this email</li>
              <li>Your password won't be changed until you create a new one</li>
              <li>For healthcare compliance, this activity has been logged</li>
            </ul>
          </div>

          <p><strong>Having trouble with the button?</strong><br>
          Copy and paste this link into your browser:</p>

          <p style="word-break: break-all; background-color: #f8fafc; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 14px;">
            ${resetUrl}
          </p>

          <p>For security reasons, ensure your new password:</p>
          <ul>
            <li>Is at least 12 characters long</li>
            <li>Contains a mix of uppercase and lowercase letters</li>
            <li>Includes numbers and special characters</li>
            <li>Is unique and not used elsewhere</li>
          </ul>

          <p>If you have any questions or need assistance, please contact our support team.</p>
        </div>

        <div class="footer">
          <p><strong>Hardy Auth</strong> - Healthcare Authentication System</p>
          <p>This email was sent to ${userEmail} because a password reset was requested for your account.</p>
          <p>© ${new Date().getFullYear()} Hardy Auth. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Hardy Auth - Password Reset Request

Hello ${displayName},

We received a request to reset your password${orgText}.

Reset Password Link: ${resetUrl}

This link will expire in 1 hour for your security.

SECURITY NOTICE:
- If you didn't request this password reset, please ignore this email
- Your password won't be changed until you create a new one
- For healthcare compliance, this activity has been logged

For security reasons, ensure your new password:
- Is at least 12 characters long
- Contains a mix of uppercase and lowercase letters
- Includes numbers and special characters
- Is unique and not used elsewhere

If you have any questions or need assistance, please contact our support team.

Hardy Auth - Healthcare Authentication System
© ${new Date().getFullYear()} Hardy Auth. All rights reserved.
  `;

  return sendEmail({
    to: userEmail,
    subject: `Password Reset Request - Hardy Auth${orgText}`,
    htmlContent,
    textContent,
  });
}

/**
 * Check if AWS SES is properly configured
 */
export function isEmailServiceConfigured(): boolean {
  // Check if any email service is configured
  const hasAwsSes = !!(process.env.AWS_SES_FROM_EMAIL && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  const hasSmtp = isSmtpConfigured();

  return hasAwsSes || hasSmtp;
}

/**
 * Development fallback - log email content
 */
export function logEmailForDevelopment(options: VerificationEmailOptions): void {
  console.log('📧 EMAIL VERIFICATION (Development Mode)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`👤 User: ${options.userName || 'New User'}`);
  console.log(`📮 Email: ${options.userEmail}`);
  console.log(`🏥 Organization: ${options.organizationName || 'N/A'}`);
  console.log(`🔗 Verification URL: ${options.verificationUrl}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💡 Copy the verification URL above to test email verification');
}