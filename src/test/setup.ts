/**
 * MLPipes Auth Service - Test Setup
 * Global test configuration and mocks
 */

import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock environment variables
process.env = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://test:test@localhost:5434/mlpipes_auth_test',
  BETTER_AUTH_SECRET: 'test-secret-key-32-characters-long',
  BETTER_AUTH_URL: 'http://localhost:3001',
  SMTP_HOST: 'test-smtp.com',
  SMTP_PORT: '587',
  SMTP_USER: 'test@mlpipes.ai',
  SMTP_PASS: 'test-password',
  TWILIO_ACCOUNT_SID: 'test-twilio-sid',
  TWILIO_AUTH_TOKEN: 'test-twilio-token',
  TWILIO_PHONE_NUMBER: '+1234567890'
}

// Mock Prisma Client
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    verificationToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn()
    },
    organization: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn()
    },
    member: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    $disconnect: vi.fn()
  }))
}))

// Mock Better Auth
vi.mock('better-auth', () => ({
  betterAuth: vi.fn(() => ({
    api: {
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      verifyEmail: vi.fn(),
      sendMagicLink: vi.fn(),
      setupTwoFactor: vi.fn(),
      verifyTwoFactor: vi.fn()
    },
    $Infer: {
      Session: {},
      User: {}
    }
  }))
}))

// Mock Better Auth Adapters
vi.mock('better-auth/adapters/prisma', () => ({
  prismaAdapter: vi.fn()
}))

// Mock Better Auth Plugins
vi.mock('better-auth/plugins/two-factor', () => ({
  twoFactor: vi.fn()
}))

vi.mock('better-auth/plugins/passkey', () => ({
  passkey: vi.fn()
}))

vi.mock('better-auth/plugins/phone-number', () => ({
  phoneNumber: vi.fn()
}))

vi.mock('better-auth/plugins/organization', () => ({
  organization: vi.fn()
}))

vi.mock('better-auth/plugins/admin', () => ({
  admin: vi.fn()
}))

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('hashed-password'),
  compare: vi.fn().mockResolvedValue(true)
}))

// Mock crypto
vi.mock('crypto', () => ({
  randomBytes: vi.fn(() => ({
    toString: vi.fn(() => 'random-string')
  }))
}))

// Mock nodemailer
vi.mock('nodemailer', () => ({
  createTransport: vi.fn(() => ({
    sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' })
  }))
}))

// Mock Twilio
vi.mock('twilio', () => {
  const mockTwilio = vi.fn(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({ sid: 'test-message-sid' })
    }
  }))
  return { default: mockTwilio }
})

// Mock QR Code
vi.mock('qrcode', () => ({
  toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,test-qr-code')
}))

// Mock Speakeasy
vi.mock('speakeasy', () => ({
  generateSecret: vi.fn(() => ({
    ascii: 'test-secret',
    hex: 'test-hex',
    base32: 'test-base32',
    otpauth_url: 'otpauth://test'
  })),
  totp: vi.fn(() => '123456'),
  totp: {
    verify: vi.fn(() => ({ valid: true }))
  }
}))

// Global test utilities
global.testUser = {
  id: 'test-user-id',
  email: 'test@mlpipes.ai',
  firstName: 'Test',
  lastName: 'User',
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
}

global.testOrganization = {
  id: 'test-org-id',
  name: 'Test Healthcare Practice',
  organizationType: 'healthcare_practice',
  createdAt: new Date(),
  updatedAt: new Date()
}

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks()
})