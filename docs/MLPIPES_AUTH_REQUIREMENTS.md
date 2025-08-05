# MLPipes Auth Service Requirements

## Overview

MLPipes Auth Service is an open-source, enterprise-grade authentication and authorization service designed specifically for healthcare applications. It provides secure, HIPAA-compliant authentication with SOC 2 Type II and HITRUST readiness, supporting modern authentication methods including passkeys, multi-factor authentication, and healthcare-specific protocols like SMART on FHIR.

## Architecture Requirements

### Database Infrastructure

#### Dedicated PostgreSQL Instance
- **Requirement**: Separate PostgreSQL database instance exclusively for authentication
- **Purpose**: Complete isolation from application data for security and compliance
- **Configuration**:
  - Database Name: `mlpipes_auth`
  - Port: `5433` (different from main app database)
  - User: `auth_service`
  - SSL: Required in production
  - Connection Pool: 20 max connections
  - Backup Strategy: Daily automated backups with 30-day retention

#### Schema Management
- **Migration Strategy**: Prisma migrations with version control
- **Audit Requirements**: All schema changes logged and versioned
- **Compliance**: HIPAA-compliant field encryption for PII/PHI

#### Data Isolation & Multi-Tenancy
- **Multi-Tenant Architecture**: Complete tenant isolation with row-level security (RLS)
- **Row-Level Security**: PostgreSQL RLS policies for HIPAA-compliant data isolation
- **Tenant-Based Access**: All queries automatically filtered by tenant context
- **Data Segregation**: Physical and logical separation of tenant data
- **Cross-Tenant Prevention**: Impossible data leakage between organizations
- **Audit Trails**: Comprehensive logging of all authentication events with tenant context
- **Data Retention**: 7-year retention for HIPAA compliance per tenant

### Service Architecture

#### Deployment
- **Container**: Docker-based deployment with health checks
- **Port**: 3001 (separate from main applications)
- **Environment**: Development, staging, and production environments
- **Load Balancing**: NGINX reverse proxy with SSL termination
- **Monitoring**: Health endpoints and metrics collection

#### Security
- **TLS**: TLS 1.3 minimum for all connections
- **CORS**: Configurable origins for client applications
- **Rate Limiting**: Configurable per-endpoint rate limiting
- **Headers**: Security headers (HSTS, CSP, etc.)

## Core Authentication Features

### 1. Email/Password Authentication
- **Password Requirements**: 
  - Minimum 12 characters
  - Complexity requirements (uppercase, lowercase, numbers, special chars)
  - Password history (prevent reuse of last 12 passwords)
  - Bcrypt hashing with cost factor 12
- **Email Verification**: Required with configurable expiration
- **Account Lockout**: Configurable failed attempt thresholds

### 2. Magic Link Authentication
- **Passwordless Login**: Email-based magic links
- **Expiration**: Configurable (default 15 minutes)
- **Single Use**: Links are invalidated after use
- **Professional Email Templates**: Healthcare-branded templates

### 3. SMS Authentication
- **Provider**: Twilio integration
- **OTP Format**: 6-digit codes
- **Expiration**: 5 minutes
- **Rate Limiting**: Prevent SMS spam
- **International Support**: E.164 phone number format

### 4. Two-Factor Authentication (2FA)
- **TOTP Support**: Google Authenticator, Authy compatible
- **QR Code Generation**: For easy setup
- **Backup Codes**: Recovery codes for account access
- **SMS Backup**: Alternative 2FA method
- **Email Backup**: Emergency access method

### 5. Passkey/WebAuthn Support
- **Platform Authenticators**: Face ID, Touch ID, Windows Hello
- **Cross-Platform**: USB security keys (YubiKey, etc.)
- **Attestation**: Support for attestation verification
- **Backup**: Multiple passkeys per account
- **Fallback**: Traditional auth methods as backup

### 6. QR Code Authentication
- **Inter-App Auth**: QR codes for mobile-to-web authentication
- **Time-Limited**: Short expiration windows
- **One-Time Use**: Prevent replay attacks
- **Secure Generation**: Cryptographically secure tokens

## OAuth2 and Standards Compliance

### OAuth2 Support
- **Authorization Code Flow**: With PKCE support
- **Client Credentials**: For machine-to-machine authentication
- **Resource Owner**: For trusted applications
- **Token Types**: JWT access tokens with configurable expiration
- **Refresh Tokens**: Secure refresh token rotation
- **Scopes**: Granular permission scopes

### SMART on FHIR Integration
- **SMART Launch**: Support for SMART App Launch Framework
- **FHIR Scopes**: Patient, user, and system scopes
- **Context**: Patient and encounter context passing
- **Standalone Launch**: Support for standalone SMART apps
- **EHR Integration**: Seamless integration with EHR systems

### Standards Compliance
- **RFC 6749**: OAuth 2.0 Authorization Framework
- **RFC 7636**: PKCE (Proof Key for Code Exchange)
- **RFC 7662**: OAuth 2.0 Token Introspection
- **RFC 8693**: OAuth 2.0 Token Exchange
- **SMART on FHIR**: HL7 SMART App Launch Implementation Guide

## Administrative Dashboard

### Professional UI Requirements
- **Design System**: Modern, healthcare-appropriate design
- **Responsive**: Mobile-friendly admin interface
- **Accessibility**: WCAG 2.1 AA compliance
- **Theming**: Healthcare color palette with professional styling

### Dashboard Features
- **User Management**: 
  - Create, read, update, disable users
  - Password reset capabilities
  - Account status management
  - Bulk operations support

- **Organization Management**:
  - Multi-tenant organization structure
  - Role-based access control
  - Member invitations and management
  - Department and specialty tracking

- **Security Monitoring**:
  - Real-time authentication attempts
  - Failed login monitoring
  - Suspicious activity alerts
  - Geographic access patterns

- **Audit Logging**:
  - Comprehensive audit trails
  - HIPAA-compliant logging
  - Export capabilities
  - Search and filtering

- **Analytics Dashboard**:
  - Authentication metrics
  - User activity patterns
  - Performance monitoring
  - Security incident tracking

### Configuration Management
- **Authentication Methods**: Enable/disable auth methods
- **Security Policies**: Password policies, session timeouts
- **Integration Settings**: OAuth clients, FHIR endpoints
- **Notification Templates**: Email and SMS templates
- **Rate Limiting**: Configurable limits per endpoint

## Healthcare Compliance

### HIPAA Compliance
- **Audit Logging**: All access and authentication events with 7-year retention
- **Data Encryption**: AES-256 encryption at rest and TLS 1.3 in transit
- **Access Controls**: Role-based access with minimum necessary principle
- **Account Management**: Proper user lifecycle management with termination procedures
- **Incident Response**: Security breach notification procedures within 60 days
- **Business Associate Agreements**: Support for BAA requirements
- **Risk Assessment**: Annual security risk assessments and documentation
- **Workforce Training**: Security awareness and training documentation

### SOC 2 Type II Readiness
- **Security**: Information security policies, procedures, and controls
- **Availability**: System availability commitments and system monitoring
- **Processing Integrity**: Data processing accuracy and completeness
- **Confidentiality**: Protection of confidential information
- **Privacy**: Personal information collection, use, retention, disclosure
- **Control Environment**: Governance and risk management framework
- **Monitoring**: Continuous monitoring and incident response procedures
- **Change Management**: Formal change control and approval processes
- **Vendor Management**: Third-party service provider assessments

### HITRUST CSF Readiness
- **Information Security Program**: Comprehensive security program documentation
- **Access Control**: Multi-layered access control implementation
- **Audit and Accountability**: Detailed audit logging and monitoring
- **Configuration Management**: Secure configuration baselines
- **Contingency Planning**: Business continuity and disaster recovery
- **Identification and Authentication**: Multi-factor authentication requirements
- **Incident Response**: Formal incident response procedures
- **Maintenance**: System maintenance and patch management
- **Media Protection**: Data handling and storage protection
- **Physical and Environmental Protection**: Infrastructure security controls
- **Risk Assessment**: Ongoing risk assessment and management
- **System and Communications Protection**: Network and system security
- **System and Information Integrity**: Data integrity and malware protection

### Security Features
- **Session Management**: Secure session handling with configurable timeout (default 30 minutes)
- **Account Lockout**: Protection against brute force attacks with progressive delays
- **Password Policies**: Healthcare-grade password requirements (minimum 12 characters)
- **Multi-Factor**: Required MFA for administrative access and configurable for users
- **Encryption**: AES-256 encryption for sensitive data, key rotation every 90 days
- **Penetration Testing**: Quarterly security assessments and vulnerability scans
- **Security Monitoring**: Real-time security event monitoring and alerting
- **Data Loss Prevention**: Automated detection and prevention of data exfiltration

## API Specifications

### tRPC API Architecture
- **Type-Safe APIs**: Full TypeScript type safety with tRPC
- **Zod Validation**: Runtime validation with Zod schemas
- **Auto-Generated Types**: Shared types between client and server
- **Real-time Subscriptions**: WebSocket support for live updates
- **Middleware**: Authentication and tenant context middleware

### Authentication Endpoints (tRPC Procedures)
```typescript
// Authentication procedures
auth.signUp: mutation                    # User registration with Zod validation
auth.signIn: mutation                    # Email/password login
auth.magicLink: mutation                 # Magic link request
auth.verifyEmail: mutation               # Email verification
auth.twoFactor.setup: mutation           # Setup 2FA
auth.twoFactor.verify: mutation          # Verify 2FA token
auth.passkey.register: mutation          # Register passkey
auth.passkey.authenticate: mutation      # Authenticate with passkey
auth.session.refresh: mutation           # Refresh session token
auth.session.revoke: mutation            # Revoke session
```

### OAuth2 Endpoints
```
GET  /api/oauth/authorize      # Authorization endpoint
POST /api/oauth/token          # Token endpoint
POST /api/oauth/introspect     # Token introspection
POST /api/oauth/revoke         # Token revocation
```

### FHIR/SMART Endpoints
```
GET  /api/fhir/metadata        # FHIR capability statement
POST /api/fhir/launch          # SMART launch endpoint
GET  /api/fhir/authorize       # SMART authorize endpoint
POST /api/fhir/token           # SMART token endpoint
```

### Admin API
```
GET    /api/admin/users         # List users
POST   /api/admin/users         # Create user
PUT    /api/admin/users/:id     # Update user
DELETE /api/admin/users/:id     # Delete user
GET    /api/admin/organizations # List organizations
GET    /api/admin/audit-logs    # Audit logs
GET    /api/admin/metrics       # Authentication metrics
```

## Performance Requirements

### Response Times
- **Authentication**: < 200ms for standard login
- **Token Generation**: < 100ms for JWT generation
- **2FA Verification**: < 150ms for TOTP verification
- **Database Queries**: < 50ms for user lookups

### Scalability
- **Concurrent Users**: Support for 10,000+ concurrent sessions
- **Request Handling**: 1,000+ requests per second
- **Database Connections**: Efficient connection pooling
- **Caching**: Redis caching for session and token storage

### Availability
- **Uptime**: 99.9% availability SLA
- **Health Checks**: Comprehensive health monitoring
- **Failover**: Database failover capabilities
- **Monitoring**: Real-time performance monitoring

## Security Requirements

### Network Security
- **TLS Encryption**: All communications encrypted
- **Certificate Management**: Automated certificate renewal
- **Firewall Rules**: Restrictive network access
- **VPN Access**: Secure administrative access

### Application Security
- **Input Validation**: Comprehensive input sanitization
- **SQL Injection**: Prepared statements and ORM protection
- **XSS Protection**: Content Security Policy headers
- **CSRF Protection**: Anti-CSRF tokens
- **Dependency Scanning**: Regular vulnerability scans

## Deployment Requirements

### Container Configuration
```dockerfile
# Base: Node.js 18 LTS
# Health Check: /api/health endpoint
# User: Non-root user
# Secrets: Environment variables only
```

### Docker Compose Stack
```yaml
services:
  auth-service:     # Authentication service
  auth-db:          # Dedicated PostgreSQL instance
  auth-redis:       # Session storage (optional)
  auth-nginx:       # Reverse proxy with SSL
```

### Environment Variables
- **Required**: DATABASE_URL, BETTER_AUTH_SECRET, SMTP credentials
- **Optional**: Redis URL, Twilio credentials, OAuth client configs
- **Security**: No secrets in code or config files

## Monitoring and Observability

### Logging
- **Structured Logging**: JSON format with correlation IDs
- **Log Levels**: Debug, info, warn, error, fatal
- **Audit Logs**: Separate audit log stream
- **Log Retention**: 90 days for application logs, 7 years for audit

### Metrics
- **Authentication Metrics**: Success/failure rates, response times
- **Business Metrics**: User registrations, login patterns
- **System Metrics**: CPU, memory, database performance
- **Custom Metrics**: Healthcare-specific authentication patterns

### Alerting
- **Failed Logins**: Threshold-based alerting
- **System Health**: Service availability monitoring
- **Security Events**: Suspicious activity detection
- **Performance**: Response time degradation alerts

## Integration Requirements

### Client Application Integration
- **JavaScript SDK**: For web applications
- **React Native SDK**: For mobile applications
- **REST APIs**: Standard HTTP API access
- **Webhooks**: Event notifications for applications

### External Service Integration
- **Email Service**: SMTP/AWS SES integration
- **SMS Service**: Twilio integration
- **FHIR Servers**: HL7 FHIR R4 compatibility
- **EHR Systems**: Epic, Cerner integration capabilities

## Testing Requirements

### Automated Testing
- **Unit Tests**: 90%+ code coverage
- **Integration Tests**: API endpoint testing
- **End-to-End Tests**: Complete authentication flows
- **Security Tests**: Penetration testing automation

### Manual Testing
- **User Acceptance**: Healthcare workflow testing
- **Security Review**: Manual security assessment
- **Performance Testing**: Load and stress testing
- **Compliance Testing**: HIPAA compliance verification

## Documentation Requirements

### Technical Documentation
- **API Documentation**: OpenAPI/Swagger specifications
- **Integration Guides**: Client integration instructions
- **Deployment Guides**: Docker and cloud deployment
- **Security Documentation**: Security architecture and procedures

### User Documentation
- **Admin Guide**: Dashboard usage instructions
- **Developer Guide**: SDK and API usage
- **Troubleshooting**: Common issues and solutions
- **Best Practices**: Security and implementation guidelines

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Next Review**: March 2025  
**Owner**: Alfeo A. Sabay, MLPipes LLC  
**Compliance Status**: HIPAA Ready, SOC 2 Type II Ready, HITRUST CSF Ready