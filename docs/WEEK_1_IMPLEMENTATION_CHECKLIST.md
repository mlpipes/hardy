# Week 1 Implementation Checklist - MVP Auth Foundation

**Goal**: Set up Better Auth integration with extraction-ready architecture  
**Timeline**: 5 days  
**Focus**: Build as if already separate, deploy as embedded  
**Target**: CARIHealth SaaS monorepo (cari-saas)

## Day 1: Project Structure & Dependencies

### ✅ Initial Setup (CARIHealth SaaS Monorepo)
```bash
# In your cari-saas monorepo root
cd cari-saas
mkdir -p packages/auth-service/{core,providers,plugins,middleware,types,utils}
mkdir -p packages/auth-service/admin
mkdir -p packages/auth-service/tests
mkdir -p packages/auth-service/docs
mkdir -p apps/web/lib/auth  # Integration layer for web app
```

### ✅ Install Dependencies
```bash
# In cari-saas root - install for the auth-service package
cd packages/auth-service
npm init -y  # Create package.json for auth service
npm install better-auth @better-auth/prisma
npm install -D @types/bcryptjs @types/jsonwebtoken

# In web app - reference auth service as local dependency
cd ../../apps/web
# Add to package.json: "@cari-saas/auth-service": "workspace:*"
```

### ✅ Monorepo Package Structure

**packages/auth-service/package.json**
```json
{
  "name": "@cari-saas/auth-service",
  "version": "0.1.0",
  "description": "CARIHealth authentication service - future MLPipes Auth",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest",
    "lint": "eslint src/"
  },
  "dependencies": {
    "better-auth": "^1.3.4",
    "@better-auth/prisma": "^1.3.4"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^5.0.0",
    "typescript": "^5.3.2",
    "jest": "^29.0.0"
  }
}
```

### ✅ Create Base Files

**packages/auth-service/src/index.ts**
```typescript
// Main export file - your app only imports from here
export { AuthService } from './core/service'
export { AuthAdminService } from './admin/admin-service'

export type { 
  AuthConfig,
  AuthResult,
  AuthContext,
  User,
  Session,
  SignUpRequest,
  SignInRequest
} from './types'

// Provider exports for extensibility
export type { AuthProvider } from './core/provider'
export type { AuthPlugin } from './core/plugin'
```

**src/lib/auth-service/types/index.ts**
```typescript
import type { PrismaClient } from '@prisma/client'

// Core types that will be stable across extraction
export interface User {
  id: string
  email: string
  emailVerified: boolean
  name?: string
  createdAt: Date
  updatedAt: Date
  
  // Multi-tenant fields
  organizationId?: string
  role: UserRole
  
  // Healthcare fields
  npiNumber?: string
  licenseNumber?: string
  specialties?: string[]
  
  // Security fields
  twoFactorEnabled: boolean
  lastLoginAt?: Date
  failedLoginAttempts: number
  lockedAt?: Date
}

export enum UserRole {
  SYSTEM_ADMIN = 'system_admin',
  TENANT_ADMIN = 'tenant_admin', 
  ADMIN = 'admin',
  CLINICIAN = 'clinician',
  STAFF = 'staff',
  PATIENT = 'patient',
  USER = 'user'
}

export interface Session {
  id: string
  sessionToken: string
  userId: string
  expires: Date
  ipAddress?: string
  userAgent?: string
  organizationId?: string
}

export interface AuthResult {
  success: boolean
  user?: User
  session?: Session
  error?: string
}

export interface AuthContext {
  userId?: string
  organizationId?: string
  role?: UserRole
  ipAddress?: string
  userAgent?: string
  sessionId?: string
}

export interface SignUpRequest {
  email: string
  password: string
  name?: string
  organizationId?: string
  metadata?: Record<string, any>
}

export interface SignInRequest {
  email: string
  password: string
  organizationId?: string
}

export interface AuthConfig {
  // Core Better Auth config
  secret: string
  baseURL: string
  database: PrismaClient
  
  // Organization context (single tenant for now, multi-tenant ready)
  organizationId?: string
  
  // Session configuration
  session: {
    timeout: number        // seconds (default: 1800 = 30 min)
    updateAge: number      // seconds (default: 300 = 5 min)  
    extendOnActivity: boolean
  }
  
  // Healthcare password policy
  password: {
    minLength: number      // default: 12
    requireComplexity: boolean
    historyCount: number   // prevent reuse of last N passwords
    maxAge?: number        // force password change after N days
  }
  
  // Compliance settings
  compliance: {
    hipaaMode: boolean
    auditRetention: number // days (default: 2555 = 7 years)
    requireMFA: boolean
    requireEmailVerification: boolean
  }
  
  // Email configuration
  email: {
    from: string
    templates?: EmailTemplates
  }
  
  // Extensibility (for future open source)
  providers?: AuthProvider[]
  plugins?: AuthPlugin[]
  middleware?: AuthMiddleware[]
}

export interface EmailTemplates {
  verification: string
  magicLink: string
  passwordReset: string
  welcome: string
}

// Provider interface for extensibility
export interface AuthProvider {
  name: string
  authenticate(credentials: any, context: AuthContext): Promise<AuthResult>
  register?(data: any, context: AuthContext): Promise<AuthResult>
}

// Plugin interface for extensibility  
export interface AuthPlugin {
  name: string
  onUserCreated?(user: User, context: AuthContext): Promise<void>
  onUserLogin?(user: User, context: AuthContext): Promise<void>
  onPasswordChanged?(user: User, context: AuthContext): Promise<void>
  onSessionCreated?(session: Session, user: User): Promise<void>
}

// Middleware interface for extensibility
export interface AuthMiddleware {
  name: string
  beforeAuth?(context: AuthContext): Promise<AuthContext>
  afterAuth?(result: AuthResult, context: AuthContext): Promise<AuthResult>
}

// Audit types
export interface AuditEvent {
  action: string
  userId?: string
  organizationId?: string
  resource?: string
  resourceId?: string
  ipAddress?: string
  userAgent?: string
  details?: Record<string, any>
  severity?: 'info' | 'warning' | 'error' | 'critical'
  timestamp?: Date
}
```

## Day 2: Core Auth Service Implementation

### ✅ Core Service Class

**packages/auth-service/src/core/service.ts**
```typescript
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { twoFactor } from "better-auth/plugins/two-factor"
import type { 
  AuthConfig, 
  AuthResult, 
  AuthContext,
  SignUpRequest, 
  SignInRequest,
  User,
  AuditEvent 
} from '../types'

export class AuthService {
  private betterAuth: ReturnType<typeof betterAuth>
  private config: AuthConfig

  constructor(config: AuthConfig) {
    this.config = config
    this.betterAuth = betterAuth({
      database: prismaAdapter(config.database, {
        provider: "postgresql"
      }),
      
      secret: config.secret,
      baseURL: config.baseURL,
      
      // Email/Password with healthcare requirements
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: config.compliance.requireEmailVerification,
        minPasswordLength: config.password.minLength,
        password: {
          hash: async (password: string) => {
            const bcrypt = await import("bcryptjs")
            return bcrypt.hash(password, 12) // High cost for healthcare
          },
          verify: async (password: string, hash: string) => {
            const bcrypt = await import("bcryptjs")
            return bcrypt.compare(password, hash)
          }
        }
      },
      
      // Healthcare session management
      session: {
        expiresIn: config.session.timeout,
        updateAge: config.session.updateAge,
        cookieCache: {
          enabled: true,
          maxAge: config.session.updateAge
        }
      },
      
      // Advanced security
      advanced: {
        cookiePrefix: "mlpipes_auth",
        crossSubDomainCookies: {
          enabled: false // Security: disabled
        },
        useSecureCookies: process.env.NODE_ENV === "production",
        generateId: () => {
          const crypto = require('crypto')
          return `auth_${crypto.randomBytes(16).toString('hex')}`
        }
      },
      
      // Start with basic plugins, expand later
      plugins: [
        twoFactor({
          issuer: "Healthcare App", // Will be configurable in open source
          otpOptions: {
            expiresIn: 60 * 5, // 5 minutes
            period: 30,
            digits: 6
          }
        }),
        ...(config.plugins || [])
      ]
    })
  }

  async signUp(data: SignUpRequest, context?: AuthContext): Promise<AuthResult> {
    try {
      // Pre-signup validation
      await this.validateSignUpData(data)
      
      const result = await this.betterAuth.api.signUpEmail({
        body: {
          email: data.email,
          password: data.password,
          name: data.name,
          // Add organization context
          ...(data.organizationId && { organizationId: data.organizationId })
        },
        headers: context ? {
          'x-forwarded-for': context.ipAddress,
          'user-agent': context.userAgent
        } : {}
      })

      // Healthcare audit logging
      await this.auditLog({
        action: 'USER_SIGNUP_SUCCESS',
        userId: result.user?.id,
        organizationId: data.organizationId || this.config.organizationId,
        details: {
          email: data.email,
          hasOrganization: !!data.organizationId,
          emailVerificationRequired: this.config.compliance.requireEmailVerification,
          source: 'email_password'
        },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent
      })

      return {
        success: true,
        user: result.user as User,
        session: result.session
      }
    } catch (error) {
      // Audit failed attempts
      await this.auditLog({
        action: 'USER_SIGNUP_FAILED',
        organizationId: data.organizationId || this.config.organizationId,
        details: {
          email: data.email,
          error: error.message,
          reason: this.categorizeError(error)
        },
        severity: 'warning',
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent
      })

      return {
        success: false,
        error: error.message
      }
    }
  }

  async signIn(data: SignInRequest, context?: AuthContext): Promise<AuthResult> {
    try {
      const result = await this.betterAuth.api.signInEmail({
        body: {
          email: data.email,
          password: data.password
        },
        headers: context ? {
          'x-forwarded-for': context.ipAddress,
          'user-agent': context.userAgent
        } : {}
      })

      // Check organization context for multi-tenant
      if (data.organizationId && result.user) {
        await this.validateOrganizationAccess(result.user.id, data.organizationId)
      }

      await this.auditLog({
        action: 'USER_SIGNIN_SUCCESS',
        userId: result.user?.id,
        organizationId: data.organizationId || this.config.organizationId,
        details: {
          email: data.email,
          sessionId: result.session?.id,
          mfaRequired: result.user?.twoFactorEnabled
        },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent
      })

      return {
        success: true,
        user: result.user as User,
        session: result.session
      }
    } catch (error) {
      await this.auditLog({
        action: 'USER_SIGNIN_FAILED',
        organizationId: data.organizationId || this.config.organizationId,
        details: {
          email: data.email,
          error: error.message,
          reason: this.categorizeError(error)
        },
        severity: 'warning',
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent
      })

      return {
        success: false,
        error: error.message
      }
    }
  }

  async getSession(sessionToken: string): Promise<{ user: User | null, session: any }> {
    try {
      const result = await this.betterAuth.api.getSession({
        headers: {
          authorization: `Bearer ${sessionToken}`
        }
      })

      return {
        user: result.user as User,
        session: result.session
      }
    } catch (error) {
      return {
        user: null,
        session: null
      }
    }
  }

  async revokeSession(sessionToken: string, context?: AuthContext): Promise<boolean> {
    try {
      await this.betterAuth.api.signOut({
        headers: {
          authorization: `Bearer ${sessionToken}`
        }
      })

      await this.auditLog({
        action: 'SESSION_REVOKED',
        userId: context?.userId,
        organizationId: context?.organizationId,
        details: {
          sessionToken: sessionToken.substring(0, 8) + '...',
          revokedBy: context?.userId ? 'user' : 'system'
        },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent
      })

      return true
    } catch (error) {
      return false
    }
  }

  // Healthcare audit logging
  private async auditLog(event: AuditEvent): Promise<void> {
    try {
      await this.config.database.auditLog.create({
        data: {
          action: event.action,
          userId: event.userId,
          organizationId: event.organizationId || this.config.organizationId,
          resource: event.resource || 'AUTH',
          resourceId: event.resourceId,
          details: event.details || {},
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          severity: event.severity || 'info',
          timestamp: event.timestamp || new Date(),
          // Healthcare compliance: retain for 7 years
          expiresAt: new Date(Date.now() + (this.config.compliance.auditRetention * 24 * 60 * 60 * 1000))
        }
      })
    } catch (error) {
      // Log audit failures to external system (future)
      console.error('Audit logging failed:', error)
    }
  }

  private async validateSignUpData(data: SignUpRequest): Promise<void> {
    // Email format validation
    if (!data.email || !data.email.includes('@')) {
      throw new Error('Invalid email address')
    }

    // Password strength validation (healthcare requirements)
    if (!data.password || data.password.length < this.config.password.minLength) {
      throw new Error(`Password must be at least ${this.config.password.minLength} characters`)
    }

    if (this.config.password.requireComplexity) {
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(data.password)) {
        throw new Error('Password must contain uppercase, lowercase, number, and special character')
      }
    }

    // Check for existing user
    const existingUser = await this.config.database.user.findUnique({
      where: { email: data.email }
    })

    if (existingUser) {
      throw new Error('User already exists')
    }
  }

  private async validateOrganizationAccess(userId: string, organizationId: string): Promise<void> {
    const user = await this.config.database.user.findUnique({
      where: { id: userId }
    })

    if (!user || user.organizationId !== organizationId) {
      throw new Error('Access denied: user not in organization')
    }
  }

  private categorizeError(error: any): string {
    if (error.message.includes('password')) return 'invalid_password'
    if (error.message.includes('email')) return 'invalid_email'
    if (error.message.includes('exists')) return 'user_exists'
    if (error.message.includes('organization')) return 'organization_access'
    return 'unknown'
  }
}
```

### ✅ Configuration Setup

**packages/auth-service/src/config.ts**
```typescript
import type { AuthConfig } from './types'
import type { PrismaClient } from '@prisma/client'

export function createAuthConfig(database: PrismaClient): AuthConfig {
  return {
    // Core Better Auth configuration
    secret: process.env.BETTER_AUTH_SECRET || generateSecret(),
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    database,
    
    // Single organization for MVP (multi-tenant ready)
    organizationId: process.env.ORGANIZATION_ID || 'default',
    
    // Healthcare session policies
    session: {
      timeout: parseInt(process.env.SESSION_TIMEOUT || '1800'), // 30 minutes
      updateAge: parseInt(process.env.SESSION_UPDATE_AGE || '300'), // 5 minutes
      extendOnActivity: process.env.SESSION_EXTEND !== 'false'
    },
    
    // Healthcare password requirements
    password: {
      minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '12'),
      requireComplexity: process.env.PASSWORD_COMPLEXITY !== 'false',
      historyCount: parseInt(process.env.PASSWORD_HISTORY || '12'),
      maxAge: process.env.PASSWORD_MAX_AGE ? parseInt(process.env.PASSWORD_MAX_AGE) : undefined
    },
    
    // HIPAA compliance settings
    compliance: {
      hipaaMode: process.env.HIPAA_MODE !== 'false',
      auditRetention: parseInt(process.env.AUDIT_RETENTION_DAYS || '2555'), // 7 years
      requireMFA: process.env.REQUIRE_MFA === 'true',
      requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION !== 'false'
    },
    
    // Email configuration
    email: {
      from: process.env.EMAIL_FROM || 'noreply@yourcompany.com'
    },
    
    // Extension points (empty for MVP, populated for open source)
    providers: [],
    plugins: [],
    middleware: []
  }
}

function generateSecret(): string {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('BETTER_AUTH_SECRET must be set in production')
  }
  
  const crypto = require('crypto')
  return crypto.randomBytes(32).toString('hex')
}

// Default configuration for testing
export const defaultTestConfig: Partial<AuthConfig> = {
  session: {
    timeout: 3600, // 1 hour for tests
    updateAge: 300,
    extendOnActivity: true
  },
  password: {
    minLength: 8, // Relaxed for tests
    requireComplexity: false,
    historyCount: 3
  },
  compliance: {
    hipaaMode: true,
    auditRetention: 90, // 90 days for tests
    requireMFA: false,
    requireEmailVerification: false
  }
}
```

## Day 3: Database Schema & Integration

### ✅ Update Prisma Schema

**Add to your existing cari-saas/apps/web/prisma/schema.prisma:**
```prisma
// Better Auth required models (add to existing schema)
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  
  // Multi-tenant field
  organizationId    String?
  
  user              User @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization      Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  ipAddress    String?
  userAgent    String?
  
  // Multi-tenant field
  organizationId String?
  
  user         User @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  
  @@unique([identifier, token])
  @@map("verification_tokens")
}

// Two-Factor Authentication
model TwoFactorToken {
  id             String   @id @default(cuid())
  userId         String
  token          String
  type           String   // "sms", "email", "totp"
  expiresAt      DateTime
  verified       Boolean  @default(false)
  attempts       Int      @default(0)
  
  // Multi-tenant field
  organizationId String?
  
  user           User @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@map("two_factor_tokens")
}

// Update existing User model (add these fields)
model User {
  // ... your existing user fields ...
  
  // Better Auth required fields
  emailVerified      Boolean   @default(false)
  emailVerifiedAt    DateTime?
  image              String?
  
  // Healthcare-specific fields  
  npiNumber          String?
  licenseNumber      String?
  specialties        Json?     // Array of medical specialties
  
  // Multi-tenant fields
  organizationId     String?   // Tenant isolation
  role               String    @default("user")
  
  // Security fields
  twoFactorEnabled   Boolean   @default(false)
  twoFactorSecret    String?
  backupCodes        Json?     // Encrypted backup codes
  lastLoginAt        DateTime?
  lastLoginIp        String?
  failedLoginAttempts Int      @default(0)
  lockedAt           DateTime?
  
  // Relationships
  organization       Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  sessions           Session[]
  accounts           Account[]
  auditLogs          AuditLog[]
  twoFactorTokens    TwoFactorToken[]
  
  @@map("users")
}

// Organization model for multi-tenancy
model Organization {
  id                    String   @id @default(cuid())
  name                  String
  slug                  String   @unique
  logo                  String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  // Healthcare-specific fields
  organizationType      String   @default("healthcare_practice")
  practiceNpi           String?
  
  // Security settings
  mfaRequired           Boolean  @default(true)
  sessionTimeout        Int      @default(1800) // 30 minutes
  auditRetentionDays    Int      @default(2555) // 7 years
  
  // Relationships
  users                 User[]
  accounts              Account[]
  sessions              Session[]
  auditLogs             AuditLog[]
  twoFactorTokens       TwoFactorToken[]
  
  @@map("organizations")
}

// Healthcare audit logging for HIPAA compliance
model AuditLog {
  id               String   @id @default(cuid())
  userId           String?
  organizationId   String?
  action           String   // LOGIN_SUCCESS, PASSWORD_CHANGE, etc.
  resource         String   // AUTH, USER, PATIENT, etc.
  resourceId       String?
  details          Json?    // Additional event details
  
  // Request context
  ipAddress        String?
  userAgent        String?
  sessionId        String?
  
  // Compliance fields
  timestamp        DateTime @default(now())
  severity         String   @default("info") // info, warning, error, critical
  expiresAt        DateTime // For automatic cleanup after retention period
  
  user             User?         @relation(fields: [userId], references: [id], onDelete: SetNull)
  organization     Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@index([organizationId, timestamp])
  @@index([userId, timestamp])
  @@index([action, timestamp])
  @@index([expiresAt]) // For cleanup
  @@map("audit_logs")
}
```

### ✅ Generate Migration
```bash
# From cari-saas/apps/web directory
cd cari-saas/apps/web
npx prisma migrate dev --name "add-better-auth-and-healthcare-audit"
npx prisma generate
```

## Day 4: App Integration Layer

### ✅ Create App Auth Interface

**apps/web/lib/auth/index.ts** (Your CARIHealth web app's auth interface)
```typescript
import { AuthService, AuthAdminService } from '@cari-saas/auth-service'
import { createAuthConfig } from '@cari-saas/auth-service/config'
import { prisma } from '../database' // Your existing Prisma instance
import type { AuthContext, SignUpRequest, SignInRequest, User } from '@cari-saas/auth-service'

// Initialize auth service with your configuration
const authConfig = createAuthConfig(prisma)
export const authService = new AuthService(authConfig)
export const authAdminService = new AuthAdminService(authService)

// Convenience functions for your app
export async function signUp(data: SignUpRequest, context?: AuthContext) {
  const result = await authService.signUp(data, context)
  
  // Your CARIHealth app-specific logic (NOT part of auth service)
  if (result.success && result.user) {
    await createCARIHealthProfile(result.user)
    await sendWelcomeEmail(result.user)
  }
  
  return result
}

export async function signIn(data: SignInRequest, context?: AuthContext) {
  const result = await authService.signIn(data, context)
  
  // Your app-specific post-login logic
  if (result.success && result.user) {
    await updateLastLogin(result.user.id)
    await checkForPendingTasks(result.user)
  }
  
  return result
}

export async function getSession(sessionToken: string) {
  return authService.getSession(sessionToken)
}

export async function signOut(sessionToken: string, context?: AuthContext) {
  return authService.revokeSession(sessionToken, context)
}

// Your CARIHealth app-specific functions (keep separate from auth service)
async function createCARIHealthProfile(user: User) {
  // Create patient/provider profile in your CARIHealth app
  await prisma.cariHealthProfile.create({
    data: {
      userId: user.id,
      profileType: inferProfileType(user),
      // ... your CARIHealth business logic
    }
  })
}

async function sendWelcomeEmail(user: User) {
  // Your email service
  // This is app logic, not auth service logic
}

async function updateLastLogin(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() }
  })
}

function inferProfileType(user: User): string {
  // Your CARIHealth business logic to determine profile type
  if (user.npiNumber) return 'healthcare_provider'
  return 'patient'
}
```

### ✅ Better Auth API Route

**apps/web/app/api/auth/[...all]/route.ts**
```typescript
import { authService } from '@/lib/auth'
import { headers } from 'next/headers'

// Create Better Auth request handler
async function handler(request: Request) {
  // Get client context
  const headersList = headers()
  const context = {
    ipAddress: headersList.get('x-forwarded-for') || 
               headersList.get('x-real-ip') || 
               'unknown',
    userAgent: headersList.get('user-agent') || 'unknown'
  }

  // Better Auth handles the routing internally
  return authService.betterAuth.handler(request)
}

export { handler as GET, handler as POST }
```

## Day 5: Testing & Environment Setup

### ✅ Environment Variables

**Add to apps/web/.env.local:**
```bash
# Better Auth Configuration
BETTER_AUTH_SECRET="your-32-character-secret-key-here-change-in-production"
BETTER_AUTH_URL="http://localhost:3000"

# Healthcare Configuration  
ORGANIZATION_ID="your-org-id"
HIPAA_MODE="true"
REQUIRE_MFA="false"  # Start false, enable later
REQUIRE_EMAIL_VERIFICATION="true"

# Session Configuration
SESSION_TIMEOUT="1800"        # 30 minutes
SESSION_UPDATE_AGE="300"      # 5 minutes  
SESSION_EXTEND="true"

# Password Policy
PASSWORD_MIN_LENGTH="12"
PASSWORD_COMPLEXITY="true"
PASSWORD_HISTORY="12"

# Audit Configuration
AUDIT_RETENTION_DAYS="2555"  # 7 years

# Email Configuration
EMAIL_FROM="noreply@carihealth.com"
```

### ✅ Basic Testing

**packages/auth-service/tests/auth-service.test.ts**
```typescript
import { AuthService } from '../src/core/service'
import { createAuthConfig, defaultTestConfig } from '../src/config'
import { PrismaClient } from '@prisma/client'

// Mock Prisma for testing
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  auditLog: {
    create: jest.fn()
  }
} as unknown as PrismaClient

describe('AuthService', () => {
  let authService: AuthService
  
  beforeEach(() => {
    const config = {
      ...createAuthConfig(mockPrisma),
      ...defaultTestConfig,
      secret: 'test-secret-32-characters-long!',
      baseURL: 'http://localhost:3000'
    }
    
    authService = new AuthService(config)
    jest.clearAllMocks()
  })

  describe('signUp', () => {
    it('should validate password requirements', async () => {
      const signUpData = {
        email: 'test@example.com',
        password: 'weak', // Too short
        name: 'Test User'
      }

      // Mock user doesn't exist
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await authService.signUp(signUpData)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Password must be at least')
    })

    it('should prevent duplicate email registration', async () => {
      const signUpData = {
        email: 'existing@example.com',
        password: 'SecurePass123!',
        name: 'Test User'
      }

      // Mock user exists
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'existing@example.com'
      })

      const result = await authService.signUp(signUpData)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('User already exists')
    })

    it('should create audit log for signup attempts', async () => {
      const signUpData = {
        email: 'new@example.com',
        password: 'SecurePass123!',
        name: 'New User'
      }

      mockPrisma.user.findUnique.mockResolvedValue(null)

      await authService.signUp(signUpData, {
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser'
      })

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: expect.stringMatching(/USER_SIGNUP/),
          details: expect.objectContaining({
            email: signUpData.email
          }),
          ipAddress: '192.168.1.1',
          userAgent: 'Test Browser'
        })
      })
    })
  })

  describe('signIn', () => {
    it('should audit successful login attempts', async () => {
      const signInData = {
        email: 'user@example.com',
        password: 'SecurePass123!'
      }

      // Test will be expanded as Better Auth integration is completed
      expect(authService).toBeDefined()
    })
  })
})
```

### ✅ Package.json Scripts

**Add to cari-saas root package.json:**
```json
{
  "scripts": {
    "test:auth-service": "npm run test --workspace=@cari-saas/auth-service",
    "test:auth-service:watch": "npm run test:watch --workspace=@cari-saas/auth-service",
    "build:auth-service": "npm run build --workspace=@cari-saas/auth-service",
    "auth:generate-secret": "node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  }
}
```

**Update packages/auth-service/package.json scripts:**
```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch", 
    "test": "jest --testTimeout=10000",
    "test:watch": "jest --watch",
    "lint": "eslint src/"
  }
}
```

## Day 5 Final Checklist

### ✅ Verification Steps

1. **Monorepo Structure**
   ```bash
   # Verify clean separation in cari-saas
   ls -la packages/auth-service/src/
   # Should see: core/, providers/, plugins/, middleware/, types/, admin/
   
   ls -la apps/web/lib/auth/
   # Should see: index.ts (integration layer)
   ```

2. **Database Migration**
   ```bash
   # From cari-saas/apps/web
   cd apps/web
   npx prisma migrate dev
   
   # Verify tables created
   npx prisma studio
   # Check: users, sessions, accounts, audit_logs, organizations tables
   ```

3. **Environment Setup**
   ```bash
   # From cari-saas root
   npm run auth:generate-secret
   # Copy output to BETTER_AUTH_SECRET in apps/web/.env.local
   ```

4. **Basic Test**
   ```bash
   # From cari-saas root
   npm run test:auth-service
   # Should pass basic validation tests
   ```

5. **App Integration**
   ```typescript
   // Test import works in your CARIHealth web app
   import { authService, signUp, signIn } from '@/lib/auth'
   // Should import without errors
   ```

6. **Monorepo Workspace Check**
   ```bash
   # From cari-saas root
   npm run build:auth-service
   # Should build auth service package successfully
   ```

### ✅ Week 1 Success Criteria

- [ ] ✅ Clean auth service structure created
- [ ] ✅ Better Auth integrated with healthcare config
- [ ] ✅ Database schema updated with multi-tenant support
- [ ] ✅ Audit logging system functional
- [ ] ✅ App integration layer clean and separated
- [ ] ✅ Basic tests passing
- [ ] ✅ Environment configuration complete
- [ ] ✅ Ready for Week 2 feature development

### ✅ Extraction Readiness Check

Your auth service should now be structured so that this command would work:
```bash
# This should be possible after Week 4
cp -r cari-saas/packages/auth-service ~/new-mlpipes-auth-repo/
# With minimal changes for standalone deployment

# The package is already isolated:
# - Has its own package.json
# - Clean dependencies 
# - No cari-saas specific coupling
# - Ready for npm publish as @mlpipes/auth-service
```

## Next Steps (Week 2)

1. **Add Magic Links**: Email-based passwordless authentication
2. **Implement TOTP 2FA**: Google Authenticator integration  
3. **Build Admin Functions**: User management interface
4. **Add Healthcare Plugins**: NPI validation, role management
5. **Create Basic UI**: Sign-in/sign-up forms

## CARIHealth SaaS Integration Summary

This Week 1 implementation creates:

**Monorepo Structure:**
```
cari-saas/
├── packages/
│   └── auth-service/          # ← Future MLPipes Auth (isolated)
│       ├── src/
│       ├── tests/
│       └── package.json       # Independent package
└── apps/
    └── web/                   # ← Your CARIHealth web app
        ├── lib/auth/          # Integration layer
        ├── prisma/            # Database with auth tables
        └── .env.local         # Auth configuration
```

**Benefits:**
- ✅ **Clean separation** between auth service and CARIHealth business logic
- ✅ **Monorepo benefits** while maintaining extraction readiness
- ✅ **Independent packages** make extraction mechanical
- ✅ **Healthcare compliance** built into auth from day one
- ✅ **CARIHealth branding** maintained in your app layer

This foundation gives you a working healthcare auth system embedded in your CARIHealth SaaS MVP, but architected for easy extraction to open source MLPipes Auth later. The clean separation ensures you can build your MVP confidently while preparing for community contribution.

The auth service package is already structured as if it's a separate npm package, making the future extraction to `@mlpipes/auth-service` straightforward.