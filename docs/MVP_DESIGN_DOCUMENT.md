# MLPipes Auth Service - MVP Design Document

**Document Version**: 1.0  
**Date**: January 2025  
**Author**: Alfeo A. Sabay, MLPipes LLC  
**Status**: Draft

## Executive Summary

This document outlines the design and implementation strategy for the MLPipes Auth Service MVP (Minimum Viable Product). The MVP focuses on delivering a compliance-first, healthcare-ready authentication service built on Better Auth that can support basic multi-tenant healthcare applications with core authentication features and essential compliance requirements.

## MVP Scope & Objectives

### Primary Objectives
1. **Deliver Core Authentication**: Email/password, magic links, and basic 2FA
2. **Ensure HIPAA Readiness**: Basic audit logging and security compliance
3. **Multi-Tenant Foundation**: Row-level security and tenant isolation
4. **Better Auth Integration**: Leverage Better Auth as the foundation with healthcare extensions
5. **Production Ready**: Deployable service with monitoring and health checks

### MVP Limitations (Out of Scope)
- Advanced 2FA methods (passkeys, WebAuthn, QR codes)
- SMART on FHIR integration
- Advanced admin dashboard
- SMS authentication
- Advanced fraud detection
- SOC 2 and HITRUST full compliance (readiness only)

## Architecture Design

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MLPipes Auth Service MVP                  │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Admin)     │  API Layer         │  Database       │
│  ┌─────────────────┐  │  ┌──────────────┐  │  ┌────────────┐ │
│  │ Next.js Pages   │  │  │ tRPC Routers │  │  │ PostgreSQL │ │
│  │ - Login/Register│  │  │ - Auth       │  │  │ - RLS      │ │
│  │ - Basic Admin   │  │  │ - Admin      │  │  │ - Audit    │ │
│  │ - User Mgmt     │  │  │ - Org        │  │  │ - Multi-   │ │
│  └─────────────────┘  │  └──────────────┘  │  │   tenant   │ │
│                       │                    │  └────────────┘ │
│  ┌─────────────────┐  │  ┌──────────────┐  │                 │
│  │ Better Auth     │  │  │ Middleware   │  │                 │
│  │ - Core Auth     │  │  │ - Rate Limit │  │                 │
│  │ - Session Mgmt  │  │  │ - Audit Log  │  │                 │
│  │ - 2FA (TOTP)    │  │  │ - Tenant Ctx │  │                 │
│  └─────────────────┘  │  └──────────────┘  │                 │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack (MVP)

**Core Framework**
- **Next.js 14**: App Router with TypeScript
- **Better Auth**: Core authentication library
- **tRPC**: Type-safe API layer
- **Prisma**: Database ORM with PostgreSQL

**Database**
- **PostgreSQL 15+**: Dedicated instance on port 5433
- **Row-Level Security**: Multi-tenant data isolation
- **Prisma Migrations**: Schema version control

**Deployment**
- **Docker**: Container-based deployment
- **Docker Compose**: Development environment
- **NGINX**: Reverse proxy (production)

**Testing & Quality**
- **Vitest**: Unit and integration testing
- **TypeScript**: Full type safety
- **ESLint**: Code linting

## Core Features (MVP)

### 1. Authentication Methods

#### Email/Password Authentication
- **Requirements**:
  - Minimum 12-character passwords
  - Bcrypt hashing (cost factor 12)
  - Email verification required
  - Account lockout after 5 failed attempts
- **Implementation**: Better Auth email/password plugin with custom validation

#### Magic Link Authentication
- **Requirements**:
  - 15-minute expiration
  - Single-use links
  - Healthcare-branded email templates
- **Implementation**: Better Auth magic link plugin with custom templates

#### Basic 2FA (TOTP)
- **Requirements**:
  - Google Authenticator compatible
  - QR code setup
  - 6-digit codes, 30-second period
  - Backup codes (8 codes)
- **Implementation**: Better Auth 2FA plugin

### 2. Multi-Tenant Architecture

#### Organization Management
```typescript
// Organization model (simplified for MVP)
model Organization {
  id          String @id @default(cuid())
  name        String
  slug        String @unique
  createdAt   DateTime @default(now())
  
  // Healthcare fields (MVP subset)
  organizationType String @default("healthcare_practice")
  
  // Security settings
  mfaRequired      Boolean @default(true)
  sessionTimeout   Int @default(1800) // 30 minutes
  
  // Relationships
  users       User[]
  members     Member[]
  auditLogs   AuditLog[]
}
```

#### Row-Level Security
- **PostgreSQL RLS policies** for complete tenant isolation
- **Database context setting** via `set_auth_context(tenant_id, user_id, role)`
- **Automatic query filtering** by tenant

### 3. User Management

#### User Model (MVP)
```typescript
model User {
  id             String @id @default(cuid())
  email          String @unique
  emailVerified  Boolean @default(false)
  name           String?
  createdAt      DateTime @default(now())
  
  // Multi-tenant
  organizationId String?
  role          String @default("user")
  
  // Security
  twoFactorEnabled Boolean @default(false)
  lastLoginAt      DateTime?
  failedLoginAttempts Int @default(0)
  lockedAt         DateTime?
  
  // Relationships
  organization Organization? @relation(fields: [organizationId], references: [id])
  sessions     Session[]
  auditLogs    AuditLog[]
}
```

#### Role-Based Access Control (MVP)
- **system_admin**: Full system access
- **tenant_admin**: Organization management
- **admin**: User management within organization
- **user**: Basic authenticated user

### 4. Audit & Compliance (MVP)

#### Audit Logging
```typescript
model AuditLog {
  id           String @id @default(cuid())
  userId       String?
  organizationId String?
  action       String // LOGIN_SUCCESS, PASSWORD_CHANGE, etc.
  resource     String // AUTH, USER, ORGANIZATION
  ipAddress    String?
  userAgent    String?
  timestamp    DateTime @default(now())
  details      Json?
  
  user         User? @relation(fields: [userId], references: [id])
  organization Organization? @relation(fields: [organizationId], references: [id])
  
  @@index([organizationId, timestamp])
  @@index([action, timestamp])
}
```

#### HIPAA Readiness Features
- **Audit Trail**: All authentication events logged
- **Data Encryption**: Sensitive fields encrypted at rest
- **Session Management**: Configurable timeouts per organization
- **Access Controls**: Role-based permissions
- **Account Lifecycle**: Proper user creation, modification, deletion logging

## API Design

### tRPC Router Structure

```typescript
// Main router
export const appRouter = createTRPCRouter({
  auth: authRouter,         // Authentication procedures
  admin: adminRouter,       // Admin management
  organization: orgRouter,  // Organization management
})

// Auth router (MVP)
export const authRouter = createTRPCRouter({
  // Core authentication
  signUp: publicProcedure
    .input(signUpSchema)
    .mutation(({ input }) => { /* Better Auth integration */ }),
    
  signIn: publicProcedure
    .input(signInSchema)
    .mutation(({ input }) => { /* Better Auth integration */ }),
    
  magicLink: publicProcedure
    .input(magicLinkSchema)
    .mutation(({ input }) => { /* Better Auth integration */ }),
    
  // 2FA
  setupTwoFactor: protectedProcedure
    .mutation(({ ctx }) => { /* TOTP setup */ }),
    
  verifyTwoFactor: protectedProcedure
    .input(verifyTwoFactorSchema)
    .mutation(({ input, ctx }) => { /* TOTP verification */ }),
    
  // Session management
  getSession: protectedProcedure
    .query(({ ctx }) => ctx.session),
    
  revokeSession: protectedProcedure
    .mutation(({ ctx }) => { /* Session revocation */ }),
})
```

### Middleware Stack

```typescript
// Rate limiting → Authentication → Tenant isolation → Audit logging
export const protectedProcedure = publicProcedure
  .use(rateLimitMiddleware)      // 100 req/min per IP
  .use(enforceUserIsAuthed)      // Better Auth session check
  .use(enforceTenantIsolation)   // Set database context
  .use(auditMiddleware)          // Log all actions
```

## Database Design

### Core Schema (MVP)

```sql
-- Organizations (tenants)
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  organization_type TEXT DEFAULT 'healthcare_practice',
  mfa_required BOOLEAN DEFAULT true,
  session_timeout INTEGER DEFAULT 1800,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Users with tenant isolation
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  name TEXT,
  organization_id TEXT REFERENCES organizations(id),
  role TEXT DEFAULT 'user',
  two_factor_enabled BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Row-Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (enforced automatically)
CREATE POLICY tenant_isolation_users ON users
  USING (organization_id = current_setting('auth.tenant_id')::text);
```

### Data Migration Strategy

1. **Initial Migration**: Core tables with RLS
2. **Better Auth Tables**: Generated by Better Auth
3. **Audit Tables**: Compliance logging tables
4. **Seed Data**: Initial system admin and test organization

## Security Design

### Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant A as Auth Service
    participant DB as Database
    
    C->>A: POST /api/auth/sign-in
    A->>A: Rate limiting check
    A->>A: Input validation (Zod)
    A->>A: Better Auth processing
    A->>DB: Query user (with RLS)
    DB->>A: User data (tenant-filtered)
    A->>A: Password verification
    A->>DB: Create session
    A->>DB: Log LOGIN_SUCCESS
    A->>C: Session token + user data
```

### Security Controls (MVP)

1. **Input Validation**: Zod schemas for all inputs
2. **Rate Limiting**: 100 requests/minute per IP
3. **Session Security**: 30-minute default timeout
4. **Password Security**: 12+ chars, bcrypt cost 12
5. **Audit Logging**: All authentication events
6. **Tenant Isolation**: RLS enforcement
7. **HTTPS Only**: TLS 1.3 minimum

## Deployment Architecture

### Development Environment

```yaml
# docker-compose.yml (MVP)
services:
  auth-service:
    build: .
    ports:
      - "3001:3000"
    environment:
      - DATABASE_URL=postgresql://auth_service:password@auth-db:5432/mlpipes_auth
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - BETTER_AUTH_URL=http://localhost:3001
    depends_on:
      - auth-db

  auth-db:
    image: postgres:15-alpine
    ports:
      - "5433:5432"
    environment:
      - POSTGRES_DB=mlpipes_auth
      - POSTGRES_USER=auth_service
      - POSTGRES_PASSWORD=password
    volumes:
      - auth_db_data:/var/lib/postgresql/data
```

### Production Considerations

1. **Container Security**: Non-root user, minimal image
2. **Environment Variables**: All secrets via env vars
3. **Health Checks**: `/api/health` endpoint
4. **Monitoring**: Basic metrics and logging
5. **Database**: Managed PostgreSQL with SSL
6. **Load Balancer**: NGINX with TLS termination

## Monitoring & Observability

### Health Checks

```typescript
// /api/health endpoint
export async function GET() {
  try {
    // Database connectivity
    await prisma.$queryRaw`SELECT 1`
    
    // Better Auth health
    const authHealth = await auth.api.getSession({})
    
    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        auth: 'up'
      }
    })
  } catch (error) {
    return Response.json(
      { status: 'unhealthy', error: error.message },
      { status: 503 }
    )
  }
}
```

### Metrics (MVP)

1. **Authentication Metrics**:
   - Login success/failure rates
   - Session duration averages
   - 2FA adoption rates

2. **System Metrics**:
   - Response times
   - Database connection pool usage
   - Memory and CPU utilization

3. **Security Metrics**:
   - Failed login attempts per IP
   - Account lockout frequency
   - Suspicious activity patterns

## Testing Strategy

### Test Coverage Requirements

- **Unit Tests**: 80% minimum coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical authentication flows
- **Security Tests**: Basic penetration testing

### Test Structure

```typescript
// Example test structure
describe('Authentication Flow', () => {
  it('should register new user with email verification', async () => {
    // Test Better Auth integration
  })
  
  it('should enforce tenant isolation', async () => {
    // Test RLS policies
  })
  
  it('should log all authentication events', async () => {
    // Test audit logging
  })
  
  it('should handle rate limiting', async () => {
    // Test rate limiting middleware
  })
})
```

## Risk Assessment & Mitigation

### Technical Risks

1. **Better Auth Integration Complexity**
   - *Risk*: Complex configuration and customization
   - *Mitigation*: Start with basic configuration, iterate gradually

2. **Multi-Tenant RLS Implementation**
   - *Risk*: Data leakage between tenants
   - *Mitigation*: Comprehensive testing, automated RLS validation

3. **Performance with Audit Logging**
   - *Risk*: Database performance degradation
   - *Mitigation*: Async logging, proper indexing

### Compliance Risks

1. **HIPAA Audit Requirements**
   - *Risk*: Insufficient audit trail
   - *Mitigation*: Comprehensive logging from day one

2. **Data Retention Policies**
   - *Risk*: Improper data lifecycle management
   - *Mitigation*: Automated retention policies

## Success Metrics

### MVP Success Criteria

1. **Functional**:
   - ✅ Email/password authentication working
   - ✅ Magic link authentication working
   - ✅ Basic 2FA (TOTP) working
   - ✅ Multi-tenant user management
   - ✅ Audit logging operational

2. **Performance**:
   - ✅ < 200ms authentication response time
   - ✅ Support for 100+ concurrent users
   - ✅ 99.9% uptime during testing

3. **Security**:
   - ✅ Complete tenant isolation verified
   - ✅ All authentication events audited
   - ✅ Basic security controls functional

4. **Compliance**:
   - ✅ HIPAA-ready audit trail
   - ✅ Basic data encryption
   - ✅ Session management compliant

## Next Steps After MVP

### Phase 2 Features
- Advanced 2FA (passkeys, WebAuthn)
- SMS authentication
- Enhanced admin dashboard
- SMART on FHIR integration

### Phase 3 Features
- Advanced fraud detection
- SOC 2 Type II compliance
- Mobile SDKs
- Advanced analytics

---

**Document Status**: Ready for Implementation  
**Estimated MVP Timeline**: 6-8 weeks  
**Team Size**: 1-2 developers  
**Next Review**: Weekly during implementation