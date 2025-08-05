# MLPipes Auth Service

Open-source, enterprise-grade authentication and authorization service designed specifically for healthcare applications. Provides secure, HIPAA-compliant authentication with SOC 2 Type II and HITRUST readiness, supporting modern authentication methods including passkeys, multi-factor authentication, and healthcare-specific protocols like SMART on FHIR.

## Features

### 🔐 Multi-Factor Authentication
- **Email/Password**: Secure password policies (12+ characters, complexity requirements)
- **Magic Links**: Passwordless email authentication
- **SMS/TOTP**: Two-factor authentication with app-based or SMS codes
- **Passkey/WebAuthn**: Biometric authentication (Face ID, Touch ID, security keys)
- **QR Code Auth**: Mobile-to-web authentication flows

### 🏥 Healthcare Compliance
- **HIPAA Compliant**: 7-year audit retention, data encryption, access controls
- **SOC 2 Type II Ready**: Security controls and continuous monitoring
- **HITRUST CSF Ready**: Healthcare information security framework
- **FHIR Integration**: SMART on FHIR support for EHR interoperability

### 🏢 Enterprise Features
- **Multi-Tenant Architecture**: Complete tenant isolation with row-level security
- **OAuth2 & OpenID Connect**: Standard-compliant authorization flows
- **Admin Dashboard**: Professional healthcare-themed management interface
- **Audit Logging**: Comprehensive security event tracking
- **Rate Limiting**: Configurable protection against abuse

### 🛡️ Security First
- **Zero Trust Architecture**: Every request authenticated and authorized
- **TLS 1.3 Encryption**: All communications encrypted
- **Session Management**: Secure timeouts and device tracking
- **Input Validation**: Comprehensive sanitization and validation
- **Regular Security Audits**: Quarterly penetration testing

## Quick Start

### Prerequisites
- Node.js 18+ and npm 8+
- PostgreSQL 14+ (dedicated instance recommended)
- Docker and Docker Compose (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mlpipes/auth-service.git
   cd mlpipes-auth
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Database setup**
   ```bash
   npm run db:migrate
   npm run db:generate
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

The service will be available at `http://localhost:3001`

## Configuration

### Environment Variables

#### Core Configuration
```env
# Database (dedicated PostgreSQL instance recommended)
DATABASE_URL="postgresql://auth_service:password@localhost:5433/mlpipes_auth"

# Better Auth
BETTER_AUTH_SECRET="your-secret-key-here"
BETTER_AUTH_URL="http://localhost:3001"

# Email Service (SMTP)
SMTP_HOST="smtp.your-provider.com"
SMTP_PORT="465"
SMTP_USER="auth@yourcompany.com"
SMTP_PASS="your-smtp-password"
```

#### Optional Services
```env
# SMS/Twilio (for SMS 2FA)
TWILIO_ACCOUNT_SID="your-twilio-sid"
TWILIO_AUTH_TOKEN="your-twilio-token"
TWILIO_PHONE_NUMBER="+1234567890"

# Redis (for session storage)
REDIS_URL="redis://localhost:6379"

# FHIR Integration
FHIR_SERVER_URL="https://your-fhir-server.com"
```

### Database Configuration

MLPipes Auth Service requires a **dedicated PostgreSQL instance** for security and compliance:

- **Database Name**: `mlpipes_auth`
- **Port**: `5433` (separate from application databases)
- **User**: `auth_service`
- **SSL**: Required in production
- **Connection Pool**: 20 max connections
- **Backup**: Daily automated backups with 30-day retention

## API Documentation

### Authentication Endpoints (tRPC)

#### User Management
```typescript
auth.signUp: mutation          // User registration
auth.signIn: mutation          // Email/password login
auth.magicLink: mutation       // Magic link authentication
auth.verifyEmail: mutation     // Email verification
auth.session.refresh: mutation // Refresh session token
auth.session.revoke: mutation  // Revoke session
```

#### Multi-Factor Authentication
```typescript
auth.twoFactor.setup: mutation    // Setup TOTP 2FA
auth.twoFactor.verify: mutation   // Verify 2FA token
auth.passkey.register: mutation   // Register passkey/WebAuthn
auth.passkey.authenticate: mutation // Authenticate with passkey
```

### OAuth2 Endpoints

```
GET  /api/oauth/authorize      # Authorization endpoint
POST /api/oauth/token          # Token endpoint
POST /api/oauth/introspect     # Token introspection
POST /api/oauth/revoke         # Token revocation
```

### SMART on FHIR Endpoints

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

## Development

### Scripts

```bash
# Development
npm run dev              # Start development server (port 3001)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking

# Testing
npm run test             # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
npm run test:ui          # Run tests with UI

# Database
npm run db:setup         # Complete database setup
npm run db:migrate       # Run Prisma migrations
npm run db:generate      # Generate Prisma client
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed database
npm run db:reset         # Reset database
npm run db:rls           # Setup row-level security

# Docker
npm run docker:build     # Build Docker image
npm run docker:run       # Run Docker container
npm run docker:up        # Start with docker-compose
npm run docker:down      # Stop docker-compose
```

### Testing

The service includes comprehensive testing:

- **Unit Tests**: Business logic and utilities (`npm run test`)
- **Integration Tests**: API endpoints and database operations
- **Security Tests**: Authentication flows and security measures
- **Performance Tests**: Load testing and benchmarking

### Code Quality

- **TypeScript**: Full type safety with strict mode
- **ESLint**: Code linting with healthcare-specific rules
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for quality assurance

## Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t mlpipes/auth-service .
docker run -p 3001:3000 mlpipes/auth-service
```

### Production Deployment

1. **Environment Setup**
   - Dedicated PostgreSQL instance with SSL
   - NGINX reverse proxy with TLS 1.3
   - Redis for session storage (recommended)

2. **Security Configuration**
   - SSL certificates (Let's Encrypt or commercial)
   - Firewall rules (restrict to necessary ports)
   - Rate limiting and DDoS protection

3. **Monitoring**
   - Health check endpoints (`/api/health`)
   - Application and security metrics
   - Log aggregation and alerting

## Architecture

### Technology Stack

- **Framework**: Next.js 14 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Better Auth with multi-factor support
- **API**: tRPC for type-safe APIs
- **UI**: Tailwind CSS with healthcare design system
- **Testing**: Vitest with comprehensive test coverage
- **Deployment**: Docker with NGINX reverse proxy

### Security Architecture

- **Multi-Tenant Isolation**: Row-level security (RLS) in PostgreSQL
- **Zero Trust**: Every request authenticated and authorized
- **Defense in Depth**: Multiple layers of security controls
- **Audit Trail**: Comprehensive logging with 7-year retention
- **Encryption**: AES-256 at rest, TLS 1.3 in transit

### Performance

- **Response Times**: < 200ms for authentication
- **Scalability**: 10,000+ concurrent sessions
- **Availability**: 99.9% uptime SLA
- **Caching**: Redis for session and token storage

## Integration

### Client Integration

#### JavaScript/TypeScript
```typescript
import { createMLPipesAuthClient } from '@mlpipes/auth-client';

const auth = createMLPipesAuthClient({
  baseUrl: 'https://auth.yourcompany.com',
  clientId: 'your-client-id'
});

// Authenticate user
const session = await auth.signIn({
  email: 'user@example.com',
  password: 'secure-password'
});
```

#### React Integration
```typescript
import { MLPipesAuthProvider, useAuth } from '@mlpipes/auth-react';

function App() {
  return (
    <MLPipesAuthProvider config={{ baseUrl: 'https://auth.yourcompany.com' }}>
      <YourApp />
    </MLPipesAuthProvider>
  );
}

function YourApp() {
  const { user, signIn, signOut } = useAuth();
  // Your application logic
}
```

### EHR Integration

MLPipes Auth Service supports SMART on FHIR for seamless EHR integration:

- **SMART App Launch**: Standalone and EHR-integrated launches
- **FHIR Scopes**: Patient, user, and system scopes
- **Context Sharing**: Patient and encounter context
- **EHR Compatibility**: Epic, Cerner, and other major EHR systems

## Compliance & Security

### HIPAA Compliance

- ✅ **Administrative Safeguards**: Access management and workforce training
- ✅ **Physical Safeguards**: Data center security and device controls
- ✅ **Technical Safeguards**: Encryption, audit logs, and access controls
- ✅ **Business Associate Agreements**: BAA support and compliance documentation

### SOC 2 Type II Readiness

- ✅ **Security**: Comprehensive security controls and monitoring
- ✅ **Availability**: High availability and disaster recovery
- ✅ **Processing Integrity**: Data accuracy and completeness
- ✅ **Confidentiality**: Information protection and access controls
- ✅ **Privacy**: Personal information handling and consent management

### HITRUST CSF Readiness

- ✅ **Information Security Program**: Comprehensive security framework
- ✅ **Access Control**: Multi-layered access management
- ✅ **Audit and Accountability**: Detailed logging and monitoring
- ✅ **Risk Management**: Ongoing risk assessment and mitigation

## Support

### Documentation

- **API Reference**: [https://docs.mlpipes.ai/auth-service/api](https://docs.mlpipes.ai/auth-service/api)
- **Integration Guide**: [https://docs.mlpipes.ai/auth-service/integration](https://docs.mlpipes.ai/auth-service/integration)
- **Security Guide**: [https://docs.mlpipes.ai/auth-service/security](https://docs.mlpipes.ai/auth-service/security)

### Community & Support

- **GitHub Issues**: [https://github.com/mlpipes/auth-service/issues](https://github.com/mlpipes/auth-service/issues)
- **Discussions**: [https://github.com/mlpipes/auth-service/discussions](https://github.com/mlpipes/auth-service/discussions)
- **Email Support**: [support@mlpipes.ai](mailto:support@mlpipes.ai)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## License

MLPipes Auth Service is licensed under the [MIT License](LICENSE).

## Roadmap

### Current Release (v1.0)
- ✅ Core authentication features
- ✅ Multi-factor authentication
- ✅ HIPAA compliance features
- ✅ Admin dashboard
- ✅ OAuth2 and SMART on FHIR support

### Upcoming Features (v1.1)
- 🔄 Advanced fraud detection
- 🔄 Passwordless authentication flows
- 🔄 Advanced audit analytics
- 🔄 Enhanced mobile SDKs

### Future Releases
- 📋 FIDO2 security key support
- 📋 Advanced threat detection
- 📋 Compliance automation tools
- 📋 Advanced analytics dashboard

---

**MLPipes Auth Service** - Secure, compliant authentication for healthcare applications.

Author: Alfeo A. Sabay, MLPipes LLC

For more information, visit [https://mlpipes.ai](https://mlpipes.ai) or contact [support@mlpipes.ai](mailto:support@mlpipes.ai).