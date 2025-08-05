/**
 * MLPipes Auth Service - Authentication tRPC Router
 * Type-safe authentication procedures with Zod validation
 */

import { TRPCError } from '@trpc/server'
import { hash, compare } from 'bcryptjs'
import { createTRPCRouter, publicLimitedProcedure, protectedProcedure } from '../../lib/trpc'
import {
  signUpSchema,
  signInSchema,
  magicLinkSchema,
  verifyEmailSchema,
  resetPasswordSchema,
  changePasswordSchema,
  setup2FASchema,
  verify2FASchema,
  disable2FASchema,
  registerPasskeySchema,
  authenticatePasskeySchema,
} from '../../lib/validations'
import { auth } from '../../lib/auth'
import { EmailService } from '../../lib/email-service'
import { SMSService } from '../../lib/sms-service'
import { generateSecureToken, generateTOTPSecret, verifyTOTP } from '../../utils/crypto'
import { z } from 'zod'

const emailService = new EmailService()
const smsService = new SMSService()

export const authRouter = createTRPCRouter({
  // User registration with organization context
  signUp: publicLimitedProcedure
    .input(signUpSchema)
    .mutation(async ({ ctx, input }) => {
      const { email, password, firstName, lastName, organizationId, licenseNumber, npiNumber, specialties } = input

      // Check if user already exists
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User with this email already exists',
        })
      }

      // Hash password
      const hashedPassword = await hash(password, 12)

      // Create user with Better Auth
      const user = await ctx.prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          organizationId,
          licenseNumber,
          npiNumber,
          specialties: specialties ? JSON.stringify(specialties) : null,
          role: 'user',
          emailVerified: false,
        },
      })

      // Create account record for Better Auth
      await ctx.prisma.account.create({
        data: {
          userId: user.id,
          type: 'email',
          provider: 'email',
          providerAccountId: user.email,
          organizationId,
        },
      })

      // Generate email verification token
      const verificationToken = generateSecureToken()
      await ctx.prisma.verificationToken.create({
        data: {
          identifier: email,
          token: verificationToken,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      })

      // Send verification email
      await emailService.sendVerificationEmail(email, {
        firstName,
        verificationUrl: `${process.env.BETTER_AUTH_URL}/verify-email?token=${verificationToken}`,
        expiresIn: '24 hours',
      })

      // Create audit log
      await ctx.prisma.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: 'USER_REGISTRATION',
          resource: 'USER',
          resourceId: user.id,
          details: {
            email,
            organizationId,
            hasLicense: !!licenseNumber,
            hasNPI: !!npiNumber,
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
        },
      })

      return {
        success: true,
        message: 'User registered successfully. Please check your email for verification.',
        userId: user.id,
      }
    }),

  // Email/password sign in
  signIn: publicLimitedProcedure
    .input(signInSchema)
    .mutation(async ({ ctx, input }) => {
      const { email, password, rememberMe, organizationSlug } = input

      // Find user with organization context
      const user = await ctx.prisma.user.findFirst({
        where: {
          email,
          ...(organizationSlug && {
            organization: {
              slug: organizationSlug,
            },
          }),
        },
        include: {
          organization: true,
        },
      })

      if (!user) {
        // Create audit log for failed attempt
        await ctx.prisma.auditLog.create({
          data: {
            action: 'LOGIN_FAILED',
            resource: 'AUTH',
            details: {
              email,
              reason: 'user_not_found',
              organizationSlug,
            },
            ipAddress: ctx.req.ip,
            userAgent: ctx.req.headers['user-agent'],
          },
        })

        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        })
      }

      // Check if account is locked
      if (user.lockedAt && user.lockedAt > new Date(Date.now() - 30 * 60 * 1000)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Account is temporarily locked. Please try again later.',
        })
      }

      // Get account record for password verification
      const account = await ctx.prisma.account.findFirst({
        where: {
          userId: user.id,
          type: 'email',
        },
      })

      if (!account) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Account configuration error',
        })
      }

      // For this example, we'll need to store the hashed password in the account or user record
      // This is a simplified approach - Better Auth handles this differently
      const isValidPassword = await compare(password, account.access_token || '')

      if (!isValidPassword) {
        // Increment failed login attempts
        const failedAttempts = user.failedLoginAttempts + 1
        const shouldLock = failedAttempts >= 5

        await ctx.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: failedAttempts,
            ...(shouldLock && { lockedAt: new Date() }),
          },
        })

        // Create audit log
        await ctx.prisma.auditLog.create({
          data: {
            userId: user.id,
            organizationId: user.organizationId,
            action: 'LOGIN_FAILED',
            resource: 'AUTH',
            details: {
              email,
              failedAttempts,
              locked: shouldLock,
            },
            ipAddress: ctx.req.ip,
            userAgent: ctx.req.headers['user-agent'],
          },
        })

        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: shouldLock 
            ? 'Account locked due to too many failed attempts. Please try again in 30 minutes.'
            : 'Invalid email or password',
        })
      }

      // Reset failed login attempts on successful auth
      await ctx.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedAt: null,
          lastLoginAt: new Date(),
          lastLoginIp: ctx.req.ip,
        },
      })

      // Check if 2FA is required
      if (user.twoFactorEnabled) {
        // Generate and send 2FA token
        const token = Math.floor(100000 + Math.random() * 900000).toString()
        
        await ctx.prisma.twoFactorToken.create({
          data: {
            userId: user.id,
            organizationId: user.organizationId,
            token,
            type: 'totp',
            expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
          },
        })

        return {
          success: true,
          requiresTwoFactor: true,
          message: 'Please enter your 2FA code',
        }
      }

      // Create session using Better Auth
      const session = await ctx.prisma.session.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          sessionToken: generateSecureToken(),
          expires: new Date(Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)),
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
        },
      })

      // Create audit log
      await ctx.prisma.auditLog.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          action: 'LOGIN_SUCCESS',
          resource: 'AUTH',
          details: {
            email,
            rememberMe,
            organizationSlug,
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
          sessionId: session.sessionToken,
        },
      })

      return {
        success: true,
        message: 'Signed in successfully',
        sessionToken: session.sessionToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organization: user.organization,
        },
      }
    }),

  // Magic link authentication
  requestMagicLink: publicLimitedProcedure
    .input(magicLinkSchema)
    .mutation(async ({ ctx, input }) => {
      const { email, organizationSlug } = input

      // Find user
      const user = await ctx.prisma.user.findFirst({
        where: {
          email,
          ...(organizationSlug && {
            organization: {
              slug: organizationSlug,
            },
          }),
        },
        include: {
          organization: true,
        },
      })

      if (!user) {
        // Don't reveal if user exists
        return {
          success: true,
          message: 'If an account with this email exists, a magic link has been sent.',
        }
      }

      // Generate magic link token
      const token = generateSecureToken()
      
      await ctx.prisma.magicLink.create({
        data: {
          email,
          userId: user.id,
          organizationId: user.organizationId,
          token,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        },
      })

      // Send magic link email
      await emailService.sendMagicLinkEmail(email, {
        firstName: user.firstName || 'User',
        magicLinkUrl: `${process.env.BETTER_AUTH_URL}/auth/magic-link?token=${token}`,
        expiresIn: '15 minutes',
      })

      // Create audit log
      await ctx.prisma.auditLog.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          action: 'MAGIC_LINK_REQUESTED',
          resource: 'AUTH',
          details: {
            email,
            organizationSlug,
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
        },
      })

      return {
        success: true,
        message: 'Magic link sent to your email address.',
      }
    }),

  // Email verification
  verifyEmail: publicLimitedProcedure
    .input(verifyEmailSchema)
    .mutation(async ({ ctx, input }) => {
      const { token } = input

      // Find verification token
      const verificationToken = await ctx.prisma.verificationToken.findUnique({
        where: { token },
      })

      if (!verificationToken || verificationToken.expires < new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid or expired verification token',
        })
      }

      // Update user email verification status
      const user = await ctx.prisma.user.update({
        where: { email: verificationToken.identifier },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      })

      // Delete verification token
      await ctx.prisma.verificationToken.delete({
        where: { token },
      })

      // Create audit log
      await ctx.prisma.auditLog.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          action: 'EMAIL_VERIFIED',
          resource: 'USER',
          resourceId: user.id,
          details: {
            email: user.email,
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
        },
      })

      return {
        success: true,
        message: 'Email verified successfully',
      }
    }),

  // Setup Two-Factor Authentication
  setup2FA: protectedProcedure
    .input(setup2FASchema)
    .mutation(async ({ ctx, input }) => {
      const { method, phoneNumber } = input
      const userId = ctx.userId!

      let secret: string | null = null
      let qrCode: string | null = null

      if (method === 'totp') {
        // Generate TOTP secret
        secret = generateTOTPSecret()
        
        // Generate QR code URL
        const issuer = 'MLPipes Auth'
        const accountName = ctx.user?.email || 'user'
        qrCode = `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}`
      }

      // Update user with 2FA settings
      await ctx.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorSecret: secret,
          // Don't enable 2FA until verified
        },
      })

      // Create audit log
      await ctx.prisma.auditLog.create({
        data: {
          userId,
          organizationId: ctx.tenantId,
          action: '2FA_SETUP_INITIATED',
          resource: 'AUTH',
          details: {
            method,
            hasPhoneNumber: !!phoneNumber,
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
          sessionId: ctx.session?.sessionToken,
        },
      })

      return {
        success: true,
        method,
        secret,
        qrCode,
        message: 'Please verify your 2FA setup by entering a code from your authenticator app',
      }
    }),

  // Verify and enable 2FA
  verify2FA: protectedProcedure
    .input(verify2FASchema)
    .mutation(async ({ ctx, input }) => {
      const { token, method } = input
      const userId = ctx.userId!

      const user = await ctx.prisma.user.findUnique({
        where: { id: userId },
      })

      if (!user || !user.twoFactorSecret) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '2FA setup not initiated',
        })
      }

      let isValid = false

      if (method === 'totp') {
        isValid = verifyTOTP(token, user.twoFactorSecret)
      }

      if (!isValid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid 2FA token',
        })
      }

      // Enable 2FA
      await ctx.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
        },
      })

      // Create audit log
      await ctx.prisma.auditLog.create({
        data: {
          userId,
          organizationId: ctx.tenantId,
          action: '2FA_ENABLED',
          resource: 'AUTH',
          details: {
            method,
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
          sessionId: ctx.session?.sessionToken,
        },
      })

      return {
        success: true,
        message: 'Two-factor authentication enabled successfully',
      }
    }),

  // Get current user session info
  getSession: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.userId! },
        include: {
          organization: true,
        },
      })

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          emailVerified: user.emailVerified,
          twoFactorEnabled: user.twoFactorEnabled,
          organization: user.organization,
        },
        session: {
          sessionToken: ctx.session?.sessionToken,
          expires: ctx.session?.expires,
        },
      }
    }),

  // Sign out
  signOut: protectedProcedure
    .mutation(async ({ ctx }) => {
      const sessionToken = ctx.session?.sessionToken

      if (sessionToken) {
        // Delete session
        await ctx.prisma.session.delete({
          where: { sessionToken },
        })

        // Create audit log
        await ctx.prisma.auditLog.create({
          data: {
            userId: ctx.userId,
            organizationId: ctx.tenantId,
            action: 'LOGOUT',
            resource: 'AUTH',
            details: {
              sessionToken,
            },
            ipAddress: ctx.req.ip,
            userAgent: ctx.req.headers['user-agent'],
            sessionId: sessionToken,
          },
        })
      }

      return {
        success: true,
        message: 'Signed out successfully',
      }
    }),
})