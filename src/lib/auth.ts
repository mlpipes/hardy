/**
 * Hardy Auth Service - Core Authentication Configuration
 * Enterprise-grade authentication with FHIR/SMART support
 */

import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { twoFactor } from "better-auth/plugins/two-factor"
import { passkey } from "better-auth/plugins/passkey"
import { phoneNumber } from "better-auth/plugins/phone-number"
import { organization } from "better-auth/plugins/organization"
import { admin } from "better-auth/plugins/admin"
import { magicLink } from "better-auth/plugins/magic-link"
import { PrismaClient } from "@prisma/client"
// SMS service imported dynamically to avoid initialization errors
import { sendEmail } from "./email-service"
import crypto from "crypto"
import * as bcryptjs from "bcryptjs"

// Initialize Prisma with the DATABASE_URL from environment
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "postgresql://auth_service:auth_password@localhost:5434/hardy_auth?sslmode=prefer",
})

/**
 * Save password to history for future reuse prevention
 */
async function savePasswordToHistory(userId: string, passwordHash: string): Promise<void> {
  try {
    // Add the new password to history
    await prisma.passwordHistory.create({
      data: {
        userId,
        passwordHash,
      },
    });

    // Keep only the last 5 passwords (delete older ones)
    const allPasswords = await prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (allPasswords.length > 5) {
      const passwordsToDelete = allPasswords.slice(5);
      await prisma.passwordHistory.deleteMany({
        where: {
          id: {
            in: passwordsToDelete.map(p => p.id)
          }
        }
      });
      console.log(`🗑️ Cleaned up ${passwordsToDelete.length} old password history entries`);
    }

    console.log(`💾 Saved password to history for user ${userId}`);
  } catch (error) {
    console.error("Error saving password to history:", error);
    // Don't throw error as this shouldn't block password reset
  }
}

/**
 * Healthcare-grade password validation for password resets
 * Prevents password reuse and enforces strict security policies
 */
async function validateHealthcarePassword(newPassword: string, token: string, userId?: string): Promise<{valid: boolean, message?: string}> {
  try {
    console.log(`🔍 Debug: Validating password with length ${newPassword.length}:`);
    console.log(`🔍 Debug: First 3 chars: "${newPassword.substring(0, 3)}..."`);
    console.log(`🔍 Debug: Has uppercase: ${/[A-Z]/.test(newPassword)}`);
    console.log(`🔍 Debug: Has lowercase: ${/[a-z]/.test(newPassword)}`);
    console.log(`🔍 Debug: Has number: ${/[0-9]/.test(newPassword)}`);
    console.log(`🔍 Debug: Has special: ${/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)}`);

    // 1. Basic password complexity validation
    if (newPassword.length < 12) {
      return { valid: false, message: "Password must be at least 12 characters long" };
    }

    if (!/[A-Z]/.test(newPassword)) {
      return { valid: false, message: "Password must contain at least one uppercase letter" };
    }

    if (!/[a-z]/.test(newPassword)) {
      return { valid: false, message: "Password must contain at least one lowercase letter" };
    }

    if (!/[0-9]/.test(newPassword)) {
      return { valid: false, message: "Password must contain at least one number" };
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      return { valid: false, message: "Password must contain at least one special character" };
    }

    // 2. Healthcare-specific forbidden patterns
    const forbiddenPatterns = [
      /password/i,
      /qwerty/i,
      /123456/i,
      /admin/i,
      /doctor/i,
      /nurse/i,
      /medical/i,
      /health/i,
      /patient/i,
      /hospital/i,
      /clinic/i,
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(newPassword)) {
        return { valid: false, message: "Password cannot contain common words or patterns" };
      }
    }

    // 3. Check against password history (prevent reuse of last 5 passwords)
    if (userId) {
      try {
        // Get last 5 password hashes for this user
        const passwordHistory = await prisma.passwordHistory.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });

        console.log(`🔍 Checking password against ${passwordHistory.length} previous passwords`);

        // Check if new password matches any previous passwords
        for (const historicalPassword of passwordHistory) {
          const isMatch = await bcryptjs.compare(newPassword, historicalPassword.passwordHash);
          if (isMatch) {
            return {
              valid: false,
              message: "Password cannot be the same as any of your last 5 passwords"
            };
          }
        }

        console.log("✅ Password does not match previous passwords");
      } catch (error) {
        console.error("Error checking password history:", error);
        // Don't fail the validation due to history check errors
        console.warn("⚠️ Password history check failed, but allowing password reset");
      }
    } else {
      console.warn("⚠️ No userId provided - skipping password history check");
    }

    // 4. TODO: Rate limiting check
    // Check if user has too many recent password reset attempts
    console.warn("⚠️ TODO: Implement rate limiting for password reset attempts");

    return { valid: true };

  } catch (error) {
    console.error("Error validating healthcare password:", error);
    return { valid: false, message: "Password validation failed" };
  }
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // User schema configuration to match our Prisma schema
  user: {
    additionalFields: {
      licenseNumber: {
        type: "string",
        required: false,
      },
      npiNumber: {
        type: "string",
        required: false,
      },
      specialties: {
        type: "string[]",
        required: false,
      },
    },
  },
  
  // Base URL configuration
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3001",
  
  // Secret for encryption and signing
  secret: process.env.BETTER_AUTH_SECRET || crypto.randomBytes(32).toString('hex'),
  
  // Email & Password Authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true, // Always require verification for security
    minPasswordLength: 12, // Healthcare security requirement
    maxPasswordLength: 128,
    // Password Reset Configuration
    sendResetPassword: async ({ user, url, token }) => {
      console.log("🔐 Better Auth: Sending password reset email to", user.email);
      console.log("🔗 Reset URL:", url);

      try {
        // Import our email service dynamically
        const { sendPasswordResetEmail } = await import("./email-service");

        const result = await sendPasswordResetEmail({
          userEmail: user.email,
          userName: user.name || user.email.split('@')[0],
          resetUrl: url,
          organizationName: "Hardy Auth"
        });

        if (result) {
          console.log("✅ Password reset email sent successfully to", user.email);
        } else {
          console.error("❌ Failed to send password reset email to", user.email);
        }

        return result;
      } catch (error) {
        console.error("❌ Error sending password reset email:", error);
        return false;
      }
    },
    // Add callback for after password reset is completed
    onPasswordReset: async ({ user }, request) => {
      console.log(`🔐 Password reset completed for user ${user.email} (${user.id})`);

      try {
        // Extract the new password from request if available
        // Note: This runs AFTER the password is changed, so we can't validate here
        // But we can save to history and trigger other security measures
        console.log("🔐 Triggering post-reset security measures");

        // For now, just log the event - we'll implement history saving once we can intercept the password
        console.log("⚠️ Password history saving not yet available in onPasswordReset callback");

        // You could add other post-reset security measures here:
        // - Force logout of other sessions
        // - Send security notification emails
        // - Update audit logs

      } catch (error) {
        console.error("Error in onPasswordReset callback:", error);
      }
    },
    // Enhanced password validation for healthcare security
    validatePassword: async (password: string, user: any) => {
      console.log("🔐 Password update detected, validating with healthcare rules");
      console.log("🔐 Validating password for user:", user?.email || user?.id);

      // Use our comprehensive healthcare password validation with user ID
      const validationResult = await validateHealthcarePassword(password, 'reset-token', user?.id);

      if (!validationResult.valid) {
        console.error(`❌ Password validation failed: ${validationResult.message}`);
        return {
          valid: false,
          message: validationResult.message || "Password does not meet security requirements"
        };
      }

      console.log("✅ Password validation passed - now saving to history");

      // Save the password to history after validation passes
      if (user?.id) {
        const passwordHash = await bcryptjs.hash(password, 12);
        await savePasswordToHistory(user.id, passwordHash);
      } else {
        console.warn("⚠️ No user ID available to save password to history");
      }

      return { valid: true };
    },
  },

  // Email Verification Configuration
  emailVerification: {
    sendOnSignUp: true, // Automatically send verification email on signup
    callbackURL: "/verify", // Redirect to our custom verification page
    async sendVerificationEmail({ user, url, token }) {
      console.log("📧 Better Auth: Sending verification email to", user.email);
      console.log("🔗 Verification URL:", url);

      try {
        // Import our email service dynamically to avoid circular imports
        const { sendVerificationEmail } = await import("./email-service");

        const result = await sendVerificationEmail({
          userEmail: user.email,
          userName: user.name || user.email.split('@')[0],
          verificationUrl: url,
          organizationName: "Hardy Auth"
        });

        if (result) {
          console.log("✅ Verification email sent successfully to", user.email);
        } else {
          console.error("❌ Failed to send verification email to", user.email);
        }

        return result;
      } catch (error) {
        console.error("❌ Error sending verification email:", error);
        return false;
      }
    },
  },

  // Session Configuration for HIPAA Compliance
  session: {
    expiresIn: parseInt(process.env.SESSION_MAX_AGE || "1800"), // 30 minutes default
    updateAge: parseInt(process.env.SESSION_UPDATE_AGE || "300"), // 5 minutes
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  // Account linking for OAuth providers
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "microsoft", "github"],
    },
  },

  // Advanced security settings
  advanced: {
    cookiePrefix: "hardy_auth",
    crossSubDomainCookies: {
      enabled: false, // Disabled for security
    },
    database: {
      generateId: () => {
        return `auth_${crypto.randomBytes(16).toString('hex')}`
      },
    },
    useSecureCookies: process.env.NODE_ENV === "production",
    rateLimit: {
      window: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000"),
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
    },
  },

  // Trusted origins for CORS
  trustedOrigins: [
    "http://localhost:3000", // web-central
    "http://localhost:3001", // auth-service
    "http://localhost:8081", // React Native Metro
    process.env.APP_URL || "https://auth.mlpipes.ai",
  ],


  // Enhanced plugins for healthcare authentication
  plugins: [
    // Two-Factor Authentication (TOTP, SMS, Email)
    twoFactor({
      issuer: "Hardy Auth",
      otpOptions: {
        expiresIn: 60 * 5, // 5 minutes
        period: 30, // 30 seconds for TOTP
        digits: 6,
      },
      sms: {
        async sendSMS({ phoneNumber, otp }) {
          console.log('📱 Sending SMS 2FA to:', phoneNumber, 'OTP:', otp);
          try {
            const { sendSMS } = await import("./sms-service");
            await sendSMS({
              to: phoneNumber,
              message: `Your Hardy Auth verification code is: ${otp}. This code expires in 5 minutes. Do not share this code with anyone.`,
            });
            console.log('✅ SMS 2FA sent successfully to', phoneNumber);
          } catch (error) {
            console.error('❌ Failed to send SMS 2FA:', error);
            // For development, we log but don't fail
            if (process.env.NODE_ENV === 'development') {
              console.warn('🔧 SMS 2FA failed in development mode - check Twilio configuration');
            } else {
              throw error; // In production, we should fail if SMS doesn't work
            }
          }
        },
      },
      email: {
        async sendEmail({ email, otp }) {
          await sendEmail({
            to: email,
            subject: "Hardy Auth - Your Verification Code",
            html: `
              <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Hardy Auth</h1>
                </div>
                <div style="padding: 40px 30px; background: white; text-align: center;">
                  <h2 style="color: #1f2937; margin: 0 0 20px 0;">Verification Code</h2>
                  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea;">${otp}</span>
                  </div>
                  <p style="color: #6b7280; margin: 20px 0 0 0;">
                    This code expires in 5 minutes. Do not share this code with anyone.
                  </p>
                </div>
              </div>
            `,
          })
        },
      },
    }),

    // Passkey Authentication (WebAuthn)
    passkey({
      rp: {
        name: "Hardy Auth",
        id: process.env.PASSKEY_RP_ID || "localhost",
      },
      authenticatorSelection: {
        userVerification: "required", // Require biometric/PIN verification
        residentKey: "preferred",
        authenticatorAttachment: "platform", // Prefer platform authenticators
      },
    }),

    // Phone Number Authentication
    phoneNumber({
      required: false, // Optional but recommended for healthcare
      sendSMS: async ({ phoneNumber, otp }) => {
        console.log('📱 Sending phone verification SMS to:', phoneNumber, 'OTP:', otp);
        try {
          const { sendSMS } = await import("./sms-service");
          await sendSMS({
            to: phoneNumber,
            message: `Your Hardy Auth phone verification code is: ${otp}. This code expires in 5 minutes.`,
          });
          console.log('✅ Phone verification SMS sent successfully to', phoneNumber);
        } catch (error) {
          console.error('❌ Failed to send phone verification SMS:', error);
          // For development, we log but don't fail
          if (process.env.NODE_ENV === 'development') {
            console.warn('🔧 Phone verification SMS failed in development mode - check Twilio configuration');
          } else {
            throw error; // In production, we should fail if SMS doesn't work
          }
        }
      },
    }),

    // Organization Management Plugin
    organization({
      async sendInvitationEmail({ email, organization, inviteLink, role }) {
        await sendEmail({
          to: email,
          subject: `Hardy Auth - Invitation to ${organization.name}`,
          html: `
            <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">MLPipes Auth</h1>
              </div>
              <div style="padding: 40px 30px; background: white;">
                <h2 style="color: #1f2937; margin: 0 0 20px 0;">You're Invited!</h2>
                <p style="color: #6b7280; line-height: 1.6; margin: 0 0 20px 0;">
                  You've been invited to join <strong>${organization.name}</strong> as a <strong>${role}</strong>.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${inviteLink}" style="display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Accept Invitation
                  </a>
                </div>
              </div>
            </div>
          `,
        })
      },
      schema: {
        organization: {
          fields: {
            organizationType: {
              type: "string",
              defaultValue: "healthcare_practice",
              required: false,
            },
            practiceNpi: {
              type: "string",
              required: false,
            },
            fhirEndpoint: {
              type: "string",
              required: false,
            },
            complianceSettings: {
              type: "json",
              required: false,
            },
            subscriptionTier: {
              type: "string",
              defaultValue: "basic",
              required: false,
            },
          },
        },
        member: {
          fields: {
            departmentId: {
              type: "string",
              required: false,
            },
            licenseNumber: {
              type: "string",
              required: false,
            },
            specialties: {
              type: "json",
              required: false,
            },
            permissions: {
              type: "json",
              required: false,
            },
          },
        },
      },
      roles: {
        tenant_admin: {
          permissions: [
            "organization:create", "organization:read", "organization:update", "organization:delete",
            "member:create", "member:read", "member:update", "member:delete", "member:invite", "member:remove",
            "role:assign", "role:revoke", "billing:read", "billing:update",
            "settings:read", "settings:update", "audit:read",
          ],
        },
        admin: {
          permissions: [
            "organization:read", "member:read", "member:update", "member:invite",
            "settings:read", "settings:update",
          ],
        },
        clinician: {
          permissions: [
            "organization:read", "member:read", "patient:create", "patient:read", "patient:update",
            "appointment:create", "appointment:read", "appointment:update",
            "clinical_notes:create", "clinical_notes:read", "clinical_notes:update",
          ],
        },
        staff: {
          permissions: [
            "organization:read", "member:read", "patient:read",
            "appointment:read", "appointment:create", "appointment:update",
          ],
        },
        patient: {
          permissions: [
            "profile:read", "profile:update", "appointment:read", "appointment:create",
            "medical_records:read",
          ],
        },
      },
    }),

    // Magic Link Authentication
    magicLink({
      expiresIn: 60 * 10, // 10 minutes expiration
      async sendMagicLink({ email, url, user }) {
        console.log('🔗 Sending magic link to:', email);
        try {
          const result = await sendEmail({
            to: email,
            subject: "Hardy Auth - Your Secure Login Link",
            htmlContent: `
              <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Hardy Auth</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Secure Healthcare Authentication</p>
                </div>
                <div style="padding: 40px 30px; background: white;">
                  <h2 style="color: #1f2937; margin: 0 0 20px 0;">Sign in to Your Account</h2>
                  <p style="color: #6b7280; line-height: 1.6; margin: 0 0 20px 0;">
                    Hello${user?.name ? ` ${user.name}` : ''},
                  </p>
                  <p style="color: #6b7280; line-height: 1.6; margin: 0 0 30px 0;">
                    Click the secure link below to sign in to your Hardy Auth account.
                    This link will expire in 10 minutes for your security.
                  </p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${url}" style="display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Sign In Securely
                    </a>
                  </div>
                  <div style="margin-top: 30px; padding: 20px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px;">
                    <p style="color: #92400e; margin: 0; font-size: 14px;">
                      <strong>Security Notice:</strong> If you didn't request this sign-in link,
                      please ignore this email. Never share this link with anyone.
                    </p>
                  </div>
                  <p style="color: #9ca3af; font-size: 12px; margin: 30px 0 0 0; text-align: center;">
                    This email was sent to ${email}. If you have questions, contact support.
                  </p>
                </div>
              </div>
            `,
            textContent: `
Hardy Auth - Your Secure Login Link

Hello${user?.name ? ` ${user.name}` : ''},

Click the secure link below to sign in to your Hardy Auth account.
This link will expire in 10 minutes for your security.

Sign in here: ${url}

SECURITY NOTICE: If you didn't request this sign-in link, please ignore this email. Never share this link with anyone.

This email was sent to ${email}. If you have questions, contact support.

Hardy Auth - Healthcare Authentication System
            `,
          });

          if (result) {
            console.log("✅ Magic link email sent successfully to", email);
          } else {
            console.error("❌ Failed to send magic link email to", email);
          }

          return result;
        } catch (error) {
          console.error("❌ Error sending magic link email:", error);
          return false;
        }
      },
    }),

    // Admin Plugin for Management Dashboard
    admin({
      adminUserIds: [], // Will be populated from environment or database
    }),
  ],
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.User

// Auth configuration validator
export function validateAuthConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!process.env.BETTER_AUTH_SECRET) {
    errors.push('BETTER_AUTH_SECRET is required')
  }

  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required')
  }

  if (process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_SECRET.length < 32) {
    errors.push('BETTER_AUTH_SECRET must be at least 32 characters')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}