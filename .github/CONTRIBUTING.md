# Contributing to Hardy Auth

Thank you for your interest in contributing to Hardy Auth! We welcome contributions from the community to help build the best healthcare authentication service.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Testing Requirements](#testing-requirements)
6. [Security Considerations](#security-considerations)
7. [Documentation](#documentation)
8. [Pull Request Process](#pull-request-process)
9. [Community](#community)

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## Getting Started

### Prerequisites

- Node.js 18+ and npm 8+
- PostgreSQL 14+ (local or Docker)
- Git
- Basic understanding of healthcare compliance (HIPAA basics helpful)

### Local Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/yourusername/hardy.git
   cd hardy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Set up database**
   ```bash
   npm run db:setup    # Creates database, runs migrations, seeds data
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Verify installation**
   - Visit http://localhost:3001
   - Run tests: `npm test`
   - Check linting: `npm run lint`

### First-time Contributors

Look for issues labeled with:
- `good first issue` - Perfect for newcomers
- `help wanted` - Community help needed
- `documentation` - Improve docs
- `healthcare expertise` - Need domain knowledge

## Development Workflow

### Branch Strategy

We use a feature branch workflow:

```
main           # Production-ready code
├── develop    # Integration branch
├── feature/*  # New features
├── fix/*      # Bug fixes
├── security/* # Security fixes
└── docs/*     # Documentation updates
```

### Creating a Feature Branch

```bash
# From develop branch
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# Work on your feature
git add .
git commit -m "feat(auth): add magic link authentication"
git push origin feature/your-feature-name
```

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat(auth): add SMS two-factor authentication
fix(db): resolve migration ordering issue
docs(api): update authentication endpoint documentation
security(auth): fix session fixation vulnerability
perf(db): optimize user lookup query
test(auth): add magic link integration tests
chore(deps): update Better Auth to v2.1.0
```

**Types:**
- `feat` - New features
- `fix` - Bug fixes
- `docs` - Documentation changes
- `security` - Security improvements
- `perf` - Performance improvements
- `test` - Adding/updating tests
- `chore` - Maintenance tasks
- `ci` - CI/CD changes

**Scopes:**
- `auth` - Authentication logic
- `db` - Database changes
- `api` - API endpoints
- `ui` - User interface
- `email` - Email service
- `sms` - SMS service
- `security` - Security features
- `compliance` - Healthcare compliance
- `docs` - Documentation

## Coding Standards

### TypeScript Guidelines

```typescript
// ✅ Good: Explicit types for public APIs
interface AuthenticationRequest {
  email: string;
  password: string;
  organizationId?: string;
}

// ✅ Good: Proper error handling
async function authenticateUser(request: AuthenticationRequest): Promise<User> {
  try {
    const user = await authService.authenticate(request);
    await auditLogger.logAuthSuccess(user.id);
    return user;
  } catch (error) {
    await auditLogger.logAuthFailure(request.email, error.message);
    throw error;
  }
}

// ❌ Avoid: Any types
function processData(data: any): any {
  return data;
}
```

### Healthcare-Specific Guidelines

```typescript
// ✅ Always log healthcare actions for HIPAA compliance
async function viewPatientRecord(userId: string, patientId: string) {
  const user = await getUser(userId);
  const patient = await getPatient(patientId);

  // Verify access permissions
  if (!canUserAccessPatient(user, patient)) {
    await auditLogger.logUnauthorizedAccess(userId, patientId);
    throw new UnauthorizedError('Access denied');
  }

  // Log successful access for audit trail
  await auditLogger.logPatientAccess(userId, patientId, 'view');

  return patient;
}

// ✅ Sanitize sensitive data in logs
function logAuthAttempt(email: string, success: boolean) {
  const sanitizedEmail = email.replace(/(.{2}).*(@.*)/, '$1***$2');
  logger.info(`Auth attempt: ${sanitizedEmail} - ${success ? 'success' : 'failed'}`);
}
```

### Code Style

- Use Prettier for formatting (run `npm run format`)
- Use ESLint for linting (run `npm run lint`)
- Follow existing patterns in the codebase
- Use meaningful variable and function names
- Add JSDoc comments for public functions

```typescript
/**
 * Authenticates a user with email and password
 *
 * @param email - User's email address
 * @param password - User's password
 * @param organizationId - Optional organization context
 * @returns Promise resolving to authenticated user
 * @throws AuthenticationError when credentials are invalid
 * @throws RateLimitError when too many attempts made
 */
async function authenticateUser(
  email: string,
  password: string,
  organizationId?: string
): Promise<User> {
  // Implementation
}
```

## Testing Requirements

### Test Coverage

- **Minimum 80% test coverage** required for all PRs
- **Critical paths must have 95%+ coverage**: authentication, authorization, security
- **Healthcare compliance features must have 100% coverage**

### Testing Strategy

```typescript
// ✅ Good: Comprehensive test coverage
describe('Magic Link Authentication', () => {
  beforeEach(async () => {
    await setupTestDatabase();
    mockEmailService();
  });

  it('should send magic link email to valid user', async () => {
    const user = await createTestUser();
    const result = await authService.sendMagicLink(user.email);

    expect(result.success).toBe(true);
    expect(mockEmailService.sendEmail).toHaveBeenCalledWith({
      to: user.email,
      subject: expect.stringContaining('Hardy Auth'),
      htmlContent: expect.stringContaining('magic link')
    });
  });

  it('should reject magic link for non-existent user', async () => {
    const result = await authService.sendMagicLink('nonexistent@example.com');

    expect(result.success).toBe(false);
    expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
  });

  it('should expire magic link after 10 minutes', async () => {
    const user = await createTestUser();
    const { token } = await authService.sendMagicLink(user.email);

    // Fast-forward time by 11 minutes
    jest.advanceTimersByTime(11 * 60 * 1000);

    await expect(
      authService.verifyMagicLink(token)
    ).rejects.toThrow('Magic link expired');
  });
});
```

### Security Testing

```typescript
// ✅ Always test security boundaries
describe('Authentication Security', () => {
  it('should prevent SQL injection in login', async () => {
    const maliciousEmail = "'; DROP TABLE users; --";

    await expect(
      authService.authenticate(maliciousEmail, 'password')
    ).rejects.toThrow('Invalid email format');

    // Verify database integrity
    const userCount = await db.user.count();
    expect(userCount).toBeGreaterThan(0);
  });

  it('should implement rate limiting on login attempts', async () => {
    const email = 'test@example.com';

    // Make 5 failed attempts (should be allowed)
    for (let i = 0; i < 5; i++) {
      await expect(
        authService.authenticate(email, 'wrong-password')
      ).rejects.toThrow('Invalid credentials');
    }

    // 6th attempt should be rate limited
    await expect(
      authService.authenticate(email, 'wrong-password')
    ).rejects.toThrow('Rate limit exceeded');
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- auth.test.ts

# Run tests for specific component
npm test -- --grep "Magic Link"
```

## Security Considerations

### Security-First Development

Hardy Auth is a healthcare authentication service, so security is paramount:

1. **Never log sensitive data**
   ```typescript
   // ❌ Never do this
   logger.info(`User password: ${password}`);

   // ✅ Do this instead
   logger.info(`Authentication attempt for user: ${sanitizeEmail(email)}`);
   ```

2. **Always validate input**
   ```typescript
   // ✅ Input validation
   function validateEmail(email: string): boolean {
     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
     return emailRegex.test(email) && email.length <= 254;
   }
   ```

3. **Use secure defaults**
   ```typescript
   // ✅ Secure session configuration
   const sessionConfig = {
     maxAge: 30 * 60, // 30 minutes (HIPAA requirement)
     secure: process.env.NODE_ENV === 'production',
     httpOnly: true,
     sameSite: 'strict'
   };
   ```

### Security Review Process

All security-related changes require:
1. Security team review
2. Automated security scanning (GitHub Actions)
3. Manual security testing
4. Documentation updates

### Reporting Security Issues

**Never create public issues for security vulnerabilities.**

Use private reporting:
- GitHub's Private Vulnerability Reporting
- Email: security@hardy-auth.com

## Documentation

### Code Documentation

- Add JSDoc comments to all public functions
- Document complex algorithms or business logic
- Include examples in documentation

### API Documentation

- Update OpenAPI specs for API changes
- Include request/response examples
- Document error codes and messages

### User Documentation

- Update README for user-facing changes
- Add migration guides for breaking changes
- Update healthcare compliance documentation

## Pull Request Process

### Before Submitting

1. **Code Quality Checks**
   ```bash
   npm run lint          # Check linting
   npm run type-check    # TypeScript validation
   npm run test:coverage # Run tests with coverage
   npm run build         # Verify build works
   ```

2. **Security Checks**
   ```bash
   npm audit             # Check for vulnerabilities
   npm run security-scan # Run additional security checks
   ```

3. **Documentation**
   - Update relevant documentation
   - Add/update tests
   - Update CHANGELOG.md for user-facing changes

### PR Template Checklist

When you create a PR, ensure you:

- [ ] Follow the PR template
- [ ] Write clear commit messages
- [ ] Add tests for new features
- [ ] Update documentation
- [ ] Verify CI passes
- [ ] Request appropriate reviewers

### Review Process

1. **Automated Checks** - CI must pass
2. **Code Review** - At least one maintainer approval
3. **Security Review** - Required for security-related changes
4. **Healthcare Review** - Required for compliance-related changes
5. **Final Approval** - Maintainer merge

### Merge Requirements

- ✅ All CI checks pass
- ✅ Code coverage ≥ 80%
- ✅ At least one approving review
- ✅ Security review (if applicable)
- ✅ Documentation updated
- ✅ No merge conflicts

## Community

### Getting Help

- **GitHub Discussions** - General questions and discussions
- **GitHub Issues** - Bug reports and feature requests
- **Discord** - Real-time community chat (coming soon)
- **Email** - hello@hardy-auth.com

### Recognition

Contributors are recognized in:
- CONTRIBUTORS.md file
- Release notes for major contributions
- Annual contributor appreciation
- Healthcare community recognition

### Maintainers

Current maintainers:
- @maintainer1 - Project lead
- @security-lead - Security expert
- @healthcare-expert - Healthcare compliance
- @api-lead - API and integrations

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please read our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Quick Reference

### Common Commands

```bash
# Setup
npm install
npm run db:setup
npm run dev

# Development
npm run lint
npm run type-check
npm test
npm run test:coverage

# Database
npm run db:migrate
npm run db:reset
npm run db:studio

# Security
npm audit
npm run security-scan
```

### Helpful Links

- [Project Roadmap](docs/feature-checklist.md)
- [API Documentation](docs/api.md)
- [Security Guide](docs/security.md)
- [Healthcare Compliance](docs/compliance.md)
- [Migration Guides](docs/migrations/)

Thank you for contributing to Hardy Auth! Together, we're building the future of healthcare authentication. 🏥🔐