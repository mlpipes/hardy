# MLPipes Auth - Dual Stage Implementation Plan

**Stage 1**: MVP with Embedded Auth (Week 1-4)  
**Stage 2**: Extract to Open Source Service (Week 5-8)

**Document Version**: 1.0  
**Date**: January 2025  
**Author**: Alfeo A. Sabay, MLPipes LLC  

## Overview

This plan allows you to build your healthcare MVP quickly with embedded Better Auth, while structuring the code for easy extraction into a standalone open-source service later. This approach minimizes risk while maximizing future value.

## Stage 1: MVP with Embedded Auth (Weeks 1-4)

### Core Principle: "Build as if it's already separate"

Write your auth code as if it's already a microservice, but deploy it embedded in your app. This makes extraction mechanical rather than architectural.

### Week 1: Foundation Setup

#### Day 1-2: Project Structure

**Create extraction-ready structure:**
```bash
your-healthcare-mvp/
├── src/
│   ├── app/                     # Your Next.js healthcare app
│   │   ├── (auth)/             # Auth UI pages
│   │   │   ├── sign-in/
│   │   │   ├── sign-up/
│   │   │   └── verify-email/
│   │   ├── api/
│   │   │   ├── auth/[...all]/route.ts    # Thin Better Auth wrapper
│   │   │   └── trpc/[trpc]/route.ts
│   │   └── dashboard/          # Your healthcare features
│   │
│   ├── lib/
│   │   ├── auth-service/       # ← FUTURE MLPipes Auth (isolated)
│   │   │   ├── index.ts        # Main service export
│   │   │   ├── config.ts       # Configuration management
│   │   │   ├── core/           # Core auth logic
│   │   │   ├── providers/      # Auth method implementations
│   │   │   ├── plugins/        # Healthcare extensions
│   │   │   ├── middleware/     # Security middleware
│   │   │   ├── types/          # TypeScript definitions
│   │   │   └── utils/          # Helper functions
│   │   │
│   │   ├── database/           # Your app's database logic
│   │   ├── healthcare/         # Your domain logic
│   │   └── shared/             # Shared utilities
│   │
│   └── components/             # Your React components
│
├── tests/
│   ├── auth-service/           # Isolated auth tests
│   └── integration/            # Full app tests
│
└── docs/
    └── auth-service/           # Auth-specific docs
```

**Implementation Checklist:**
```typescript
// ✅ Create clean boundaries
// src/lib/auth-service/index.ts
export { AuthService } from './core/service'
export { AuthProvider } from './core/provider'
export { AuthPlugin } from './core/plugin'
export type { AuthConfig, AuthContext, User } from './types'

// Your app only imports from this index
import { AuthService } from '@/lib/auth-service'
```

#### Day 3-5: Better Auth Integration

**Core service implementation:**
```typescript
// src/lib/auth-service/core/service.ts
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { twoFactor } from "better-auth/plugins/two-factor"

export class AuthService {
  private betterAuth: ReturnType<typeof betterAuth>
  
  constructor(private config: AuthConfig) {
    this.betterAuth = betterAuth({
      database: prismaAdapter(config.database),
      secret: config.secret,
      baseURL: config.baseURL,
      
      // Healthcare-specific configuration
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        minPasswordLength: config.password.minLength || 12,
      },
      
      session: {
        expiresIn: config.session.timeout || 1800, // 30 minutes
        updateAge: config.session.updateAge || 300, // 5 minutes
      },
      
      plugins: [
        twoFactor({
          issuer: config.organization?.name || "Healthcare App",
          // Plugin configuration from config
        }),
        ...config.plugins,
      ],
    })
  }
  
  // Wrap Better Auth methods with healthcare context
  async signUp(data: SignUpRequest): Promise<AuthResult> {
    try {
      const result = await this.betterAuth.api.signUpEmail({
        body: {
          email: data.email,
          password: data.password,
          name: data.name,
        }
      })
      
      // Healthcare-specific logic
      await this.auditLog('USER_SIGNUP', {
        userId: result.user?.id,
        email: data.email,
        metadata: { source: 'email_password' }
      })
      
      return {
        success: true,
        user: result.user,
        session: result.session
      }
    } catch (error) {
      await this.auditLog('USER_SIGNUP_FAILED', {
        email: data.email,
        error: error.message
      })
      throw error
    }
  }
  
  async signIn(data: SignInRequest): Promise<AuthResult> {
    // Similar pattern for all auth methods
  }
  
  private async auditLog(action: string, details: any) {
    // Healthcare audit logging
    await this.config.database.auditLog.create({
      data: {
        action,
        details,
        timestamp: new Date(),
        ipAddress: details.ipAddress,
        userAgent: details.userAgent,
        // Multi-tenant ready (even if single tenant for now)
        organizationId: this.config.organizationId || 'default',
      }
    })
  }
}
```

**Configuration system:**
```typescript
// src/lib/auth-service/config.ts
export interface AuthConfig {
  // Core Better Auth config
  secret: string
  baseURL: string
  database: PrismaClient
  
  // Healthcare-specific config
  organizationId?: string
  
  session: {
    timeout: number      // seconds
    updateAge: number    // seconds
    extendOnActivity: boolean
  }
  
  password: {
    minLength: number
    requireComplexity: boolean
    historyCount: number  // prevent reuse
  }
  
  compliance: {
    hipaaMode: boolean
    auditRetention: number  // days
    requireMFA: boolean
  }
  
  email: {
    from: string
    templates: EmailTemplates
  }
  
  // Extension points for open source
  providers: AuthProvider[]
  plugins: AuthPlugin[]
  middleware: AuthMiddleware[]
}

// Default healthcare-compliant configuration
export const defaultAuthConfig: Partial<AuthConfig> = {
  session: {
    timeout: 1800,        // 30 minutes
    updateAge: 300,       // 5 minutes
    extendOnActivity: true
  },
  
  password: {
    minLength: 12,
    requireComplexity: true,
    historyCount: 12
  },
  
  compliance: {
    hipaaMode: true,
    auditRetention: 2555,  // 7 years
    requireMFA: true
  }
}
```

### Week 2: Core Authentication Features

#### Day 6-8: Email/Password + Magic Links

**Provider pattern for extensibility:**
```typescript
// src/lib/auth-service/providers/email-password.ts
export class EmailPasswordProvider implements AuthProvider {
  name = 'email-password'
  
  constructor(private service: AuthService) {}
  
  async authenticate(credentials: EmailPasswordCredentials): Promise<AuthResult> {
    // Use Better Auth under the hood
    return this.service.betterAuth.api.signInEmail({
      body: credentials
    })
  }
  
  async register(data: RegistrationData): Promise<AuthResult> {
    const result = await this.service.betterAuth.api.signUpEmail({
      body: data
    })
    
    // Healthcare-specific post-registration
    if (result.user) {
      await this.createHealthcareProfile(result.user)
    }
    
    return result
  }
  
  private async createHealthcareProfile(user: User) {
    // This stays in your app, not in open source
    // But called via a hook/plugin system
  }
}

// src/lib/auth-service/providers/magic-link.ts
export class MagicLinkProvider implements AuthProvider {
  name = 'magic-link'
  
  async sendMagicLink(email: string): Promise<void> {
    await this.service.betterAuth.api.sendMagicLink({
      body: { email }
    })
    
    // Healthcare audit
    await this.service.auditLog('MAGIC_LINK_SENT', { email })
  }
  
  async verifyMagicLink(token: string): Promise<AuthResult> {
    const result = await this.service.betterAuth.api.verifyMagicLink({
      body: { token }
    })
    
    await this.service.auditLog('MAGIC_LINK_USED', {
      userId: result.user?.id,
      token: token.substring(0, 8) + '...' // Partial for audit
    })
    
    return result
  }
}
```

#### Day 9-10: Healthcare Plugins

**Plugin system for healthcare features:**
```typescript
// src/lib/auth-service/plugins/healthcare-audit.ts
export class HealthcareAuditPlugin implements AuthPlugin {
  name = 'healthcare-audit'
  
  async onUserCreated(user: User, context: AuthContext) {
    await this.auditLog('USER_CREATED', {
      userId: user.id,
      organizationId: context.organizationId,
      createdBy: context.adminUserId,
      metadata: {
        source: context.source,
        userRole: user.role,
        department: user.department
      }
    })
  }
  
  async onPasswordChanged(user: User, context: AuthContext) {
    await this.auditLog('PASSWORD_CHANGED', {
      userId: user.id,
      organizationId: context.organizationId,
      metadata: {
        triggeredBy: context.triggeredBy, // 'user' | 'admin' | 'reset'
        ipAddress: context.ipAddress
      }
    })
  }
  
  async onLoginFailed(attempt: LoginAttempt, context: AuthContext) {
    await this.auditLog('LOGIN_FAILED', {
      email: attempt.email,
      organizationId: context.organizationId,
      reason: attempt.failureReason,
      metadata: {
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        attemptCount: attempt.failCount
      }
    })
  }
}

// src/lib/auth-service/plugins/session-management.ts
export class HealthcareSessionPlugin implements AuthPlugin {
  name = 'healthcare-session'
  
  async onSessionCreated(session: Session, user: User) {
    // Apply organization-specific session policies
    const org = await this.getOrganization(user.organizationId)
    
    session.expiresIn = org.sessionTimeout || 1800
    session.extendOnActivity = org.extendSessions ?? true
    
    // Log session creation
    await this.auditLog('SESSION_CREATED', {
      userId: user.id,
      sessionId: session.id,
      organizationId: user.organizationId
    })
  }
  
  async onSessionExpired(session: Session) {
    await this.auditLog('SESSION_EXPIRED', {
      userId: session.userId,
      sessionId: session.id,
      reason: 'timeout'
    })
  }
}
```

### Week 3: Two-Factor Authentication & Admin Features

#### Day 11-13: TOTP Implementation

**2FA with healthcare compliance:**
```typescript
// src/lib/auth-service/plugins/two-factor.ts
export class HealthcareTwoFactorPlugin implements AuthPlugin {
  name = 'healthcare-two-factor'
  
  async setupTOTP(user: User): Promise<TOTPSetupResult> {
    const result = await this.service.betterAuth.api.twoFactor.setup({
      userId: user.id
    })
    
    // Healthcare audit for 2FA setup
    await this.auditLog('TOTP_SETUP_INITIATED', {
      userId: user.id,
      organizationId: user.organizationId,
      metadata: {
        qrCodeGenerated: !!result.qrCode,
        backupCodesCount: result.backupCodes?.length || 0
      }
    })
    
    return result
  }
  
  async verifyTOTP(user: User, code: string): Promise<boolean> {
    const isValid = await this.service.betterAuth.api.twoFactor.verify({
      userId: user.id,
      code
    })
    
    await this.auditLog(
      isValid ? 'TOTP_VERIFIED_SUCCESS' : 'TOTP_VERIFIED_FAILED',
      {
        userId: user.id,
        organizationId: user.organizationId,
        codePrefix: code.substring(0, 2) + 'xxxx' // Partial for audit
      }
    )
    
    return isValid
  }
  
  async generateBackupCodes(user: User): Promise<string[]> {
    const codes = await this.service.betterAuth.api.twoFactor.generateBackupCodes({
      userId: user.id
    })
    
    await this.auditLog('BACKUP_CODES_GENERATED', {
      userId: user.id,
      organizationId: user.organizationId,
      codesCount: codes.length
    })
    
    return codes
  }
}
```

#### Day 14: Admin Interface Foundation

**Admin service layer:**
```typescript
// src/lib/auth-service/admin/admin-service.ts
export class AuthAdminService {
  constructor(private authService: AuthService) {}
  
  async createUser(adminUser: User, userData: CreateUserRequest): Promise<User> {
    // Verify admin permissions
    await this.verifyAdminPermissions(adminUser, 'user:create')
    
    const newUser = await this.authService.signUp({
      ...userData,
      organizationId: adminUser.organizationId // Inherit org
    })
    
    await this.auditLog('ADMIN_USER_CREATED', {
      adminUserId: adminUser.id,
      newUserId: newUser.id,
      organizationId: adminUser.organizationId,
      userData: {
        email: userData.email,
        role: userData.role,
        department: userData.department
      }
    })
    
    return newUser
  }
  
  async updateUser(adminUser: User, userId: string, updates: UpdateUserRequest): Promise<User> {
    await this.verifyAdminPermissions(adminUser, 'user:update')
    
    // Ensure admin can only update users in same org
    const targetUser = await this.getUser(userId)
    if (targetUser.organizationId !== adminUser.organizationId) {
      throw new Error('Cannot update user from different organization')
    }
    
    const updatedUser = await this.authService.updateUser(userId, updates)
    
    await this.auditLog('ADMIN_USER_UPDATED', {
      adminUserId: adminUser.id,
      targetUserId: userId,
      organizationId: adminUser.organizationId,
      changes: updates
    })
    
    return updatedUser
  }
  
  async listUsers(adminUser: User, filters?: UserFilters): Promise<PaginatedUsers> {
    await this.verifyAdminPermissions(adminUser, 'user:read')
    
    // Automatically filter by organization
    const orgFilter = {
      ...filters,
      organizationId: adminUser.organizationId
    }
    
    return this.authService.listUsers(orgFilter)
  }
  
  private async verifyAdminPermissions(user: User, permission: string) {
    const hasPermission = await this.checkPermission(user, permission)
    if (!hasPermission) {
      await this.auditLog('ADMIN_ACCESS_DENIED', {
        userId: user.id,
        permission,
        organizationId: user.organizationId
      })
      throw new Error(`Insufficient permissions: ${permission}`)
    }
  }
}
```

### Week 4: Integration & Testing

#### Day 15-17: App Integration

**Clean integration layer:**
```typescript
// src/lib/auth.ts (Your app's auth interface)
import { AuthService, AuthConfig } from './auth-service'
import { prisma } from './database'

// Initialize auth service with your config
const authConfig: AuthConfig = {
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  database: prisma,
  
  // Your healthcare app configuration
  organizationId: process.env.ORGANIZATION_ID || 'default',
  
  session: {
    timeout: parseInt(process.env.SESSION_TIMEOUT || '1800'),
    updateAge: 300,
    extendOnActivity: true
  },
  
  compliance: {
    hipaaMode: true,
    auditRetention: 2555,
    requireMFA: process.env.NODE_ENV === 'production'
  },
  
  // Start with basic providers, expand later
  providers: [],
  plugins: [],
  middleware: []
}

export const authService = new AuthService(authConfig)

// Convenience functions for your app
export async function signIn(email: string, password: string) {
  return authService.signIn({ email, password })
}

export async function signUp(userData: SignUpData) {
  const result = await authService.signUp(userData)
  
  // Your app-specific logic (not part of auth service)
  if (result.user) {
    await createPatientProfile(result.user)
    await sendWelcomeEmail(result.user)
  }
  
  return result
}
```

#### Day 18-20: Testing & Documentation

**Isolated testing:**
```typescript
// tests/auth-service/auth-service.test.ts
describe('AuthService', () => {
  let authService: AuthService
  let mockDatabase: MockPrismaClient
  
  beforeEach(async () => {
    mockDatabase = createMockPrismaClient()
    authService = new AuthService({
      secret: 'test-secret',
      baseURL: 'http://localhost:3000',
      database: mockDatabase,
      organizationId: 'test-org',
      // ... test config
    })
  })
  
  describe('signUp', () => {
    it('should create user and audit log', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'securepassword123',
        name: 'Test User'
      }
      
      const result = await authService.signUp(userData)
      
      expect(result.success).toBe(true)
      expect(result.user?.email).toBe(userData.email)
      
      // Verify audit log created
      expect(mockDatabase.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'USER_SIGNUP',
          organizationId: 'test-org'
        })
      })
    })
    
    it('should enforce password requirements', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'weak', // Too short
        name: 'Test User'
      }
      
      await expect(authService.signUp(userData)).rejects.toThrow('Password too weak')
    })
  })
  
  describe('multi-tenant isolation', () => {
    it('should isolate users by organization', async () => {
      // Test that users from different orgs can't see each other
    })
  })
})
```

**Documentation for extraction:**
```markdown
# Auth Service Documentation

## Overview
This auth service is built on Better Auth with healthcare-specific extensions.
It's designed to be extracted into a standalone service later.

## Architecture
- **Core**: Better Auth integration
- **Providers**: Authentication method implementations  
- **Plugins**: Healthcare-specific features
- **Middleware**: Security and compliance layers

## Configuration
All configuration is centralized in `AuthConfig` interface.

## Testing
Run isolated auth service tests: `npm run test:auth-service`

## Future Extraction
This service is designed to become a standalone MLPipes Auth service.
See `docs/extraction-plan.md` for details.
```

## Stage 2: Extract to Standalone Service (Weeks 5-8)

### Week 5: Extraction Preparation

#### Day 21-23: Create Standalone Repository

**Initialize the new repo structure:**
```bash
# In your current directory
mkdir mlpipes-auth
cd mlpipes-auth

# Initialize as new project
git init
npm init -y

# Copy auth service code
cp -r ../your-healthcare-mvp/src/lib/auth-service/* ./src/
cp -r ../your-healthcare-mvp/tests/auth-service/* ./tests/
cp -r ../your-healthcare-mvp/docs/auth-service/* ./docs/
```

**Transform to standalone service:**
```typescript
// src/index.ts (Main service entry point)
import express from 'express'
import { AuthService } from './core/service'
import { createAuthRouter } from './api/router'

export class MLPipesAuthService {
  private app: express.Application
  private authService: AuthService
  
  constructor(config: AuthServiceConfig) {
    this.app = express()
    this.authService = new AuthService(config)
    
    this.setupMiddleware()
    this.setupRoutes()
  }
  
  private setupRoutes() {
    // Convert your existing auth methods to API endpoints
    this.app.use('/api/auth', createAuthRouter(this.authService))
    this.app.use('/api/admin', createAdminRouter(this.authService))
  }
  
  async start(port: number = 3001) {
    this.app.listen(port, () => {
      console.log(`MLPipes Auth Service running on port ${port}`)
    })
  }
}

// For direct library usage (before API)
export { AuthService } from './core/service'
export type { AuthConfig, AuthResult, User } from './types'
```

#### Day 24-25: API Layer

**Create REST/tRPC API:**
```typescript
// src/api/router.ts
import { Router } from 'express'
import { AuthService } from '../core/service'

export function createAuthRouter(authService: AuthService): Router {
  const router = Router()
  
  router.post('/signup', async (req, res) => {
    try {
      const result = await authService.signUp(req.body)
      res.json(result)
    } catch (error) {
      res.status(400).json({ error: error.message })
    }
  })
  
  router.post('/signin', async (req, res) => {
    try {
      const result = await authService.signIn(req.body)
      res.json(result)
    } catch (error) {
      res.status(401).json({ error: error.message })
    }
  })
  
  // More endpoints...
  
  return router
}
```

### Week 6: Open Source Preparation

#### Day 26-28: Community-Ready Features

**Configuration system for open source:**
```typescript
// src/config/index.ts
export interface MLPipesAuthConfig {
  // Core configuration
  database: {
    url: string
    type: 'postgresql' | 'mysql' | 'sqlite'
  }
  
  secret: string
  baseURL: string
  
  // Organization/tenant settings
  organization?: {
    id: string
    name: string
    settings: OrganizationSettings
  }
  
  // Feature toggles
  features: {
    emailPassword: boolean
    magicLinks: boolean
    twoFactor: boolean
    socialAuth: boolean
  }
  
  // Compliance settings
  compliance: {
    hipaa: boolean
    auditRetention: number
    requireMFA: boolean
  }
  
  // Extensibility
  providers: AuthProvider[]
  plugins: AuthPlugin[]
  middleware: AuthMiddleware[]
}

// Environment-based configuration
export function createConfigFromEnv(): MLPipesAuthConfig {
  return {
    database: {
      url: process.env.DATABASE_URL!,
      type: (process.env.DB_TYPE as any) || 'postgresql'
    },
    
    secret: process.env.MLPIPES_AUTH_SECRET!,
    baseURL: process.env.MLPIPES_AUTH_URL!,
    
    features: {
      emailPassword: process.env.ENABLE_EMAIL_PASSWORD !== 'false',
      magicLinks: process.env.ENABLE_MAGIC_LINKS === 'true',
      twoFactor: process.env.ENABLE_2FA === 'true',
      socialAuth: process.env.ENABLE_SOCIAL_AUTH === 'true'
    },
    
    compliance: {
      hipaa: process.env.HIPAA_MODE === 'true',
      auditRetention: parseInt(process.env.AUDIT_RETENTION_DAYS || '2555'),
      requireMFA: process.env.REQUIRE_MFA === 'true'
    },
    
    // Community can extend these
    providers: [],
    plugins: [],
    middleware: []
  }
}
```

#### Day 29-30: Documentation

**Create comprehensive docs:**
```markdown
# MLPipes Auth Service

> Compliance-first authentication for healthcare applications

Built on [Better Auth](https://github.com/better-auth/better-auth) with healthcare-specific extensions.

## Quick Start

### Docker (Recommended)

```bash
docker run -d \
  -p 3001:3001 \
  -e DATABASE_URL="postgresql://..." \
  -e MLPIPES_AUTH_SECRET="your-secret" \
  mlpipes/auth-service:latest
```

### Node.js

```bash
npm install @mlpipes/auth-service
```

```typescript
import { MLPipesAuthService } from '@mlpipes/auth-service'

const auth = new MLPipesAuthService({
  database: { url: process.env.DATABASE_URL },
  secret: process.env.AUTH_SECRET,
  compliance: { hipaa: true }
})

await auth.start(3001)
```

## Features

✅ **Healthcare Compliant**
- HIPAA-ready audit logging
- Configurable session timeouts
- Healthcare-specific user roles

✅ **Multi-Tenant Ready**
- Complete data isolation
- Organization-level settings
- Tenant-specific compliance rules

✅ **Modern Authentication**
- Email/password with strong policies
- Magic link authentication
- TOTP two-factor authentication
- Social authentication (Google, Microsoft)

✅ **Developer Friendly**
- Full TypeScript support
- Extensible plugin system
- RESTful API + JavaScript SDK
- Docker deployment ready

## Configuration

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/auth
MLPIPES_AUTH_SECRET=your-32-character-secret
MLPIPES_AUTH_URL=https://auth.yourcompany.com

# Optional
HIPAA_MODE=true
REQUIRE_MFA=true
SESSION_TIMEOUT=1800
AUDIT_RETENTION_DAYS=2555
```

### Programmatic Configuration

```typescript
const config: MLPipesAuthConfig = {
  database: { url: process.env.DATABASE_URL },
  secret: process.env.AUTH_SECRET,
  
  compliance: {
    hipaa: true,
    auditRetention: 2555, // 7 years
    requireMFA: true
  },
  
  // Add custom providers
  providers: [
    new CustomSAMLProvider(samlConfig)
  ],
  
  // Add healthcare plugins
  plugins: [
    new NPIValidationPlugin(),
    new DEAValidationPlugin()
  ]
}
```

## API Reference

### Authentication

#### POST /api/auth/signup
```typescript
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "Dr. Jane Smith",
  "metadata": {
    "npi": "1234567890",
    "specialty": "Family Medicine"
  }
}
```

#### POST /api/auth/signin
```typescript
{
  "email": "user@example.com", 
  "password": "securepassword123"
}
```

### Admin API

#### GET /api/admin/users
List users in organization (admin only)

#### POST /api/admin/users
Create new user (admin only)

### Audit API

#### GET /api/audit/logs
Query audit logs (admin only)

## JavaScript SDK

```typescript
import { MLPipesAuthClient } from '@mlpipes/auth-client'

const auth = new MLPipesAuthClient({
  baseURL: 'https://auth.yourcompany.com'
})

// Sign up
const { user, session } = await auth.signUp({
  email: 'user@example.com',
  password: 'securepassword123'
})

// Sign in
const { user, session } = await auth.signIn({
  email: 'user@example.com',
  password: 'securepassword123'
})

// Check session
const session = await auth.getSession()
```

## React Integration

```typescript
import { MLPipesAuthProvider, useAuth } from '@mlpipes/auth-react'

function App() {
  return (
    <MLPipesAuthProvider baseURL="https://auth.yourcompany.com">
      <Dashboard />
    </MLPipesAuthProvider>
  )
}

function Dashboard() {
  const { user, signIn, signOut } = useAuth()
  
  if (!user) {
    return <SignInForm onSignIn={signIn} />
  }
  
  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}
```

## Deployment

### Docker Compose

```yaml
version: '3.8'
services:
  auth-service:
    image: mlpipes/auth-service:latest
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://auth:password@db:5432/auth
      - MLPIPES_AUTH_SECRET=${AUTH_SECRET}
      - HIPAA_MODE=true
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=auth
      - POSTGRES_USER=auth
      - POSTGRES_PASSWORD=password
    volumes:
      - auth_data:/var/lib/postgresql/data

volumes:
  auth_data:
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mlpipes-auth
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mlpipes-auth
  template:
    metadata:
      labels:
        app: mlpipes-auth
    spec:
      containers:
      - name: auth-service
        image: mlpipes/auth-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: database-url
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
git clone https://github.com/mlpipes/auth-service
cd auth-service
npm install
cp .env.example .env.local
npm run dev
```

### Running Tests

```bash
npm test                 # Unit tests
npm run test:integration # Integration tests
npm run test:e2e        # End-to-end tests
```

## Security

Please report security vulnerabilities to security@mlpipes.ai.
See [SECURITY.md](SECURITY.md) for our security policy.

## License

MIT License - see [LICENSE](LICENSE) for details.
```

### Week 7-8: Community Launch

#### Day 31-35: Launch Preparation

**GitHub repository setup:**
```bash
# .github/ISSUE_TEMPLATE/bug_report.md
# .github/ISSUE_TEMPLATE/feature_request.md
# .github/workflows/ci.yml
# .github/workflows/release.yml
# CONTRIBUTING.md
# SECURITY.md
# CODE_OF_CONDUCT.md
```

**Community engagement:**
```markdown
# CONTRIBUTING.md

# Contributing to MLPipes Auth Service

Thank you for your interest in contributing! This project aims to make healthcare authentication easier and more secure for everyone.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/mlpipes-auth`
3. Install dependencies: `npm install`
4. Copy environment file: `cp .env.example .env.local`
5. Start development server: `npm run dev`

## Development Workflow

1. Create feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Add tests: All new features require tests
4. Run test suite: `npm test`
5. Commit changes: `git commit -m "feat: add your feature"`
6. Push branch: `git push origin feature/your-feature-name`
7. Create Pull Request

## Areas We Need Help

### High Priority
- [ ] SMS authentication provider
- [ ] SAML SSO integration
- [ ] Advanced audit analytics
- [ ] Mobile SDKs (React Native, Flutter)

### Healthcare Specific
- [ ] NPI number validation
- [ ] DEA number validation
- [ ] Medical specialty management
- [ ] FHIR integration helpers

### Compliance
- [ ] SOC 2 Type II documentation
- [ ] HITRUST CSF compliance guides
- [ ] International healthcare standards
- [ ] Automated compliance reporting

### Developer Experience
- [ ] Better error messages
- [ ] More configuration examples
- [ ] Video tutorials
- [ ] Integration guides

## Code Standards

- **TypeScript**: All code must be typed
- **Testing**: 80% coverage minimum for new features
- **Documentation**: All public APIs must be documented
- **Security**: Security-related changes require review

## Healthcare Domain Knowledge

If you're new to healthcare compliance:
- Read our [Healthcare Compliance Guide](docs/compliance.md)
- Join our Discord for domain-specific discussions
- Healthcare professionals welcome - domain expertise is valuable!

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Recognized in release notes
- Invited to advisory calls (optional)
- Given early access to new features

## Questions?

- Join our [Discord](https://discord.gg/mlpipes-auth)
- Open a Discussion on GitHub
- Email: contributors@mlpipes.ai
```

#### Day 36-40: Migration & Launch

**Migrate your MVP to use the service:**
```typescript
// Your healthcare app now uses the auth service API
// src/lib/auth-client.ts
import { MLPipesAuthClient } from '@mlpipes/auth-client'

export const authClient = new MLPipesAuthClient({
  baseURL: process.env.AUTH_SERVICE_URL || 'http://localhost:3001'
})

// Update your app's auth functions
export async function signIn(email: string, password: string) {
  return authClient.signIn({ email, password })
}

export async function signUp(userData: SignUpData) {
  const result = await authClient.signUp(userData)
  
  // Your app-specific logic remains here
  if (result.user) {
    await createPatientProfile(result.user)
    await sendWelcomeEmail(result.user)
  }
  
  return result
}
```

**Docker deployment:**
```yaml
# docker-compose.yml (updated)
version: '3.8'
services:
  your-healthcare-app:
    build: .
    environment:
      - AUTH_SERVICE_URL=http://auth-service:3001
    depends_on:
      - auth-service

  auth-service:
    image: mlpipes/auth-service:latest
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://auth:password@auth-db:5432/auth
      - MLPIPES_AUTH_SECRET=${AUTH_SECRET}
    depends_on:
      - auth-db

  auth-db:
    image: postgres:15
    # ... database config
```

**Launch checklist:**
```markdown
## Pre-Launch Checklist

### Code Quality
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code coverage ≥ 80%
- [ ] Security audit completed
- [ ] Documentation review completed
- [ ] Docker images built and tested

### Community
- [ ] GitHub repository configured
- [ ] Issue templates created
- [ ] Contributing guidelines written
- [ ] Code of conduct added
- [ ] Security policy documented
- [ ] Discord server created

### Marketing
- [ ] README.md compelling and clear
- [ ] Demo video recorded
- [ ] Blog post written
- [ ] Social media accounts created
- [ ] HackerNews post prepared

### Legal
- [ ] MIT license applied
- [ ] Contributor license agreement (optional)
- [ ] Privacy policy for service
- [ ] Terms of service for hosted version

### Infrastructure
- [ ] CI/CD pipeline working
- [ ] Docker Hub automated builds
- [ ] NPM package publishing
- [ ] Domain names registered
- [ ] SSL certificates configured
```

## Success Metrics & Timeline

### Stage 1 Success (Week 4)
- ✅ Healthcare MVP with working authentication
- ✅ Clean separation between auth service and app logic
- ✅ Basic audit logging functional
- ✅ Multi-tenant ready architecture

### Stage 2 Success (Week 8)
- ✅ Standalone MLPipes Auth Service deployed
- ✅ Your MVP migrated to use auth service
- ✅ Open source repository live with documentation
- ✅ Community engagement started (GitHub stars, Discord members)

### Post-Launch Success (3 months)
- 🎯 100+ GitHub stars
- 🎯 5+ community contributors
- 🎯 3+ companies using in production
- 🎯 Healthcare community recognition

## Risk Mitigation

### Technical Risks
1. **Better Auth Integration Complexity**
   - *Mitigation*: Start simple, extensive testing
   - *Fallback*: Keep existing auth working during migration

2. **Multi-Tenant Security**
   - *Mitigation*: Security audit, automated testing
   - *Fallback*: Single-tenant mode as backup

3. **Community Adoption**
   - *Mitigation*: Strong documentation, real-world testing
   - *Fallback*: Private use still valuable

### Timeline Risks
1. **Stage 1 Delays**
   - *Buffer*: Focus on core features only
   - *Adjustment*: Push advanced features to Stage 2

2. **Open Source Preparation**
   - *Buffer*: Documentation can be improved post-launch
   - *Priority*: Working code > perfect docs initially

This plan gives you a working healthcare MVP quickly while setting up for long-term open source success. The key is maintaining clean boundaries from day one, making extraction mechanical rather than architectural.

Would you like me to create the specific Week 1 implementation checklist with detailed code examples?