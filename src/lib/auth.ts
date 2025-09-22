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
import { PrismaClient } from "@prisma/client"
import { sendSMS } from "./sms-service"
import { sendEmail } from "./email-service"
import crypto from "crypto"
import * as bcryptjs from "bcryptjs"

// Initialize Prisma with the DATABASE_URL from environment
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "postgresql://auth_service:auth_password@localhost:5434/hardy_auth?sslmode=prefer",
})

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  
  // Base URL configuration
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3001",
  
  // Secret for encryption and signing
  secret: process.env.BETTER_AUTH_SECRET || crypto.randomBytes(32).toString('hex'),
  
  // Email & Password Authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12, // Healthcare security requirement
    maxPasswordLength: 128,
    password: {
      hash: async (password: string) => {
        return bcryptjs.hash(password, 12)
      },
      verify: async (password: string, hash: string) => {
        console.log('🔐 Password verify called:', { hasPassword: !!password, hasHash: !!hash, hashValue: hash?.substring(0, 20) });
        if (!hash) {
          console.error('❌ No password hash found in database');
          return false;
        }
        return bcryptjs.compare(password, hash)
      },
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
    generateId: () => {
      return `auth_${crypto.randomBytes(16).toString('hex')}`
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
          await sendSMS({
            to: phoneNumber,
            message: `Your Hardy Auth verification code is: ${otp}. This code expires in 5 minutes. Do not share this code with anyone.`,
          })
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
        await sendSMS({
          to: phoneNumber,
          message: `Your Hardy Auth phone verification code is: ${otp}. This code expires in 5 minutes.`,
        })
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