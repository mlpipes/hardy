# Hardy Auth - Mobile & SDK Integration Guide

## Table of Contents

1. [Overview](#overview)
2. [Current Integration Options](#current-integration-options)
3. [iOS SDK Integration](#ios-sdk-integration)
4. [Android SDK Integration](#android-sdk-integration)
5. [JavaScript/TypeScript SDK](#javascripttypescript-sdk)
6. [API Requirements](#api-requirements)
7. [Security Considerations](#security-considerations)
8. [Migration Path](#migration-path)

## Overview

Hardy Auth is designed to serve as a centralized authentication service for healthcare applications across all platforms. This guide covers integration strategies for mobile applications (iOS/Android) and web applications using our planned SDK ecosystem.

## Current Integration Options

### REST API (Available Now)

Until native SDKs are available, mobile applications can integrate using direct REST API calls:

```bash
# Authentication endpoint
POST https://auth.yourcompany.com/api/auth/sign-in/email
Content-Type: application/json

{
  "email": "doctor@hospital.com",
  "password": "secure-password"
}
```

### Limitations of Current Approach

- ❌ No type safety
- ❌ Manual session management required
- ❌ No built-in token refresh logic
- ❌ Complex error handling
- ❌ No biometric authentication support

## iOS SDK Integration

### Planned Features

The Hardy Auth iOS SDK will provide a native Swift interface for iOS applications with full healthcare compliance support.

#### Installation (Future)

```swift
// Swift Package Manager
dependencies: [
    .package(url: "https://github.com/hardy-auth/swift-sdk", from: "1.0.0")
]

// CocoaPods
pod 'HardyAuth', '~> 1.0'
```

#### Core Authentication

```swift
import HardyAuth

class AuthenticationManager {
    let hardy = HardyAuthClient(
        baseURL: "https://auth.yourcompany.com",
        apiKey: "your-api-key"
    )

    // Sign in with email/password
    func signIn(email: String, password: String) async throws -> User {
        let result = try await hardy.signIn(
            email: email,
            password: password
        )

        // Handle 2FA if required
        if result.requiresTwoFactor {
            let code = await promptForTwoFactorCode()
            return try await hardy.verifyTwoFactor(
                sessionId: result.sessionId,
                code: code
            )
        }

        return result.user
    }

    // Magic link authentication
    func requestMagicLink(email: String) async throws -> Bool {
        return try await hardy.requestMagicLink(
            email: email,
            callbackURL: "yourapp://auth/callback"
        )
    }

    // Handle magic link callback
    func handleMagicLink(url: URL) async throws -> User {
        return try await hardy.verifyMagicLink(url: url)
    }

    // Biometric authentication
    func signInWithBiometrics() async throws -> User {
        return try await hardy.authenticateWithBiometrics(
            reason: "Authenticate to access patient records"
        )
    }
}
```

#### Healthcare-Specific Features

```swift
// User profile with healthcare context
struct HealthcareUser {
    let id: String
    let email: String
    let name: String
    let organizationId: String
    let organizationName: String
    let role: UserRole // clinician, admin, staff, patient
    let npiNumber: String?
    let licenseNumber: String?
    let specialties: [String]
    let department: String?
    let permissions: [Permission]
}

// SMART on FHIR integration
extension HardyAuthClient {
    func launchSmartApp(
        ehr: EHRSystem,
        patient: String? = nil
    ) async throws -> SmartContext {
        // Launch SMART app with proper context
    }
}
```

#### Security Features

```swift
// Secure token storage with Keychain
class HardyTokenManager {
    private let keychain = HardyKeychain()

    func storeTokens(_ tokens: AuthTokens) throws {
        try keychain.store(
            tokens.accessToken,
            for: .accessToken,
            accessibility: .whenUnlockedThisDeviceOnly
        )
        try keychain.store(
            tokens.refreshToken,
            for: .refreshToken,
            accessibility: .afterFirstUnlockThisDeviceOnly
        )
    }
}

// Session management with auto-refresh
class HardySessionManager {
    func startSession() {
        // Auto-refresh tokens before expiry
        // Handle session timeout per HIPAA requirements (30 min)
        // Manage background refresh
    }
}
```

## Android SDK Integration

### Planned Features

The Hardy Auth Android SDK will provide a native Kotlin interface for Android applications.

#### Installation (Future)

```kotlin
// build.gradle
dependencies {
    implementation 'com.hardy.auth:android-sdk:1.0.0'
}
```

#### Core Authentication

```kotlin
import com.hardy.auth.HardyAuthClient
import com.hardy.auth.models.User

class AuthenticationManager(context: Context) {
    private val hardy = HardyAuthClient.Builder(context)
        .baseUrl("https://auth.yourcompany.com")
        .apiKey("your-api-key")
        .build()

    // Sign in with coroutines
    suspend fun signIn(email: String, password: String): User {
        return hardy.signIn(email, password)
            .handleTwoFactor { sessionId ->
                // Show 2FA dialog
                promptForCode()
            }
            .getOrThrow()
    }

    // Magic link authentication
    suspend fun requestMagicLink(email: String): Boolean {
        return hardy.requestMagicLink(
            email = email,
            callbackURL = "yourapp://auth/callback"
        )
    }

    // Handle magic link deep link
    suspend fun handleMagicLink(intent: Intent): User? {
        return intent.data?.let { uri ->
            hardy.verifyMagicLink(uri.toString())
        }
    }

    // Biometric authentication
    suspend fun signInWithBiometrics(): User {
        return hardy.authenticateWithBiometric(
            context = context,
            title = "Authenticate",
            subtitle = "Access patient records"
        )
    }
}
```

#### Jetpack Compose Integration

```kotlin
@Composable
fun LoginScreen() {
    val authState = rememberHardyAuthState()

    HardyAuthProvider(authState) {
        if (authState.isAuthenticated) {
            MainApp()
        } else {
            LoginForm(
                onSignIn = { email, password ->
                    authState.signIn(email, password)
                }
            )
        }
    }
}
```

#### Healthcare Features

```kotlin
// Organization context
data class Organization(
    val id: String,
    val name: String,
    val type: OrganizationType, // HOSPITAL, CLINIC, PRACTICE
    val npiNumber: String?,
    val settings: OrganizationSettings
)

// Permission checking
fun checkPermission(permission: String): Boolean {
    return hardy.currentUser?.hasPermission(permission) ?: false
}

// Audit logging
hardy.auditLogger.log(
    action = AuditAction.VIEW_PATIENT_RECORD,
    resourceId = patientId,
    metadata = mapOf("view_reason" to "treatment")
)
```

## JavaScript/TypeScript SDK

### Planned Features

Universal JavaScript SDK with framework-specific packages.

#### Installation (Future)

```bash
# Core SDK
npm install @hardy/auth-js

# Framework-specific packages
npm install @hardy/auth-react
npm install @hardy/auth-vue
npm install @hardy/auth-angular
npm install @hardy/auth-nextjs
```

#### Core Usage

```typescript
import { HardyAuth } from '@hardy/auth-js';

const auth = new HardyAuth({
    baseURL: 'https://auth.yourcompany.com',
    apiKey: process.env.HARDY_API_KEY,
    // Optional: Configure token storage
    storage: localStorage, // or sessionStorage
});

// Sign in
const user = await auth.signIn({
    email: 'doctor@hospital.com',
    password: 'secure-password'
});

// Check authentication status
if (auth.isAuthenticated()) {
    const user = auth.getUser();
}

// Sign out
await auth.signOut();
```

#### React Integration

```tsx
import { HardyAuthProvider, useHardyAuth } from '@hardy/auth-react';

// App wrapper
function App() {
    return (
        <HardyAuthProvider
            baseURL="https://auth.yourcompany.com"
            apiKey={process.env.REACT_APP_HARDY_API_KEY}
        >
            <MainApp />
        </HardyAuthProvider>
    );
}

// Using authentication in components
function LoginComponent() {
    const { signIn, user, isLoading, error } = useHardyAuth();

    const handleLogin = async (email: string, password: string) => {
        try {
            await signIn({ email, password });
            // Redirect to dashboard
        } catch (err) {
            // Handle error
        }
    };

    if (isLoading) return <LoadingSpinner />;
    if (user) return <Dashboard user={user} />;

    return <LoginForm onSubmit={handleLogin} />;
}
```

#### Vue Integration

```vue
<script setup lang="ts">
import { useHardyAuth } from '@hardy/auth-vue';

const { signIn, user, isAuthenticated } = useHardyAuth();

async function handleLogin(credentials) {
    await signIn(credentials);
}
</script>

<template>
    <div v-if="isAuthenticated">
        <Dashboard :user="user" />
    </div>
    <div v-else>
        <LoginForm @submit="handleLogin" />
    </div>
</template>
```

## API Requirements

For SDKs to function properly, Hardy Auth must expose the following APIs:

### 1. tRPC Endpoint (Priority 1)
```typescript
POST /api/trpc/[procedure]
```

### 2. API Key Management (Priority 2)
```typescript
// Create API key for application
POST /api/keys
{
    "name": "iOS App",
    "permissions": ["auth:read", "auth:write"],
    "expiresAt": "2025-01-01"
}

// Validate API key
GET /api/keys/validate
Headers: X-API-Key: your-api-key
```

### 3. CORS Configuration (Priority 3)
```typescript
// Allow mobile app domains
Access-Control-Allow-Origin: [
    "capacitor://localhost",
    "ionic://localhost",
    "http://localhost:*"
]
```

### 4. OAuth2 Server (Priority 4)
```typescript
// Authorization endpoint
GET /oauth/authorize?
    response_type=code&
    client_id=mobile_app&
    redirect_uri=app://callback

// Token endpoint
POST /oauth/token
{
    "grant_type": "authorization_code",
    "code": "auth_code",
    "client_id": "mobile_app",
    "client_secret": "secret"
}
```

## Security Considerations

### Mobile-Specific Security

1. **Secure Storage**
   - iOS: Keychain Services
   - Android: Android Keystore
   - Never store tokens in SharedPreferences or UserDefaults

2. **Biometric Authentication**
   - Implement as additional factor, not replacement
   - Store biometric-protected refresh tokens

3. **Certificate Pinning**
   - Pin SSL certificates in production
   - Implement backup pins for certificate rotation

4. **App-to-App Communication**
   - Use deep links with proper validation
   - Implement app attestation (iOS/Android)

### Healthcare Compliance

1. **Session Timeout**
   - Enforce 30-minute timeout per HIPAA
   - Clear sensitive data on timeout

2. **Audit Logging**
   - Log all authentication attempts
   - Include device fingerprinting

3. **Data Encryption**
   - Encrypt all stored tokens
   - Use TLS 1.3 for network communication

## Migration Path

### Phase 1: Direct API Integration (Now) - ✅ COMPLETED
- ✅ Use REST API endpoints directly
- ✅ Implement basic session management
- ✅ Manual token handling
- ✅ **GitHub Actions CI/CD** - Automated testing and quality assurance for API reliability

### Phase 2: Complete Authentication Features (Months 1-3)
- ✅ Modern authentication methods (magic links, SMS 2FA) - COMPLETED
- 🔄 Passkey/WebAuthn authentication
- 🔄 SMART on FHIR integration
- 🔄 OAuth2 and OpenID Connect support

### Phase 3: API Foundation (Months 4-5)
- tRPC endpoint for external access
- API key management system
- CORS configuration and rate limiting
- **Enhanced CI/CD**: Mobile SDK testing and automated API documentation

### Phase 4: Native SDKs (Months 5-7)
- Full-featured native SDKs
- Biometric authentication
- Automatic token refresh
- Offline capabilities

### Phase 5: Advanced Features (Months 7-9)
- WebAuthn/Passkey support
- Push notifications for 2FA
- Offline authentication
- Advanced analytics

## Development & Quality Assurance

### CI/CD Benefits for Mobile Integration

**Automated Quality Assurance:**
- ✅ **API Stability**: Continuous testing ensures endpoints remain stable for mobile apps
- ✅ **Security Scanning**: Automated vulnerability detection protects mobile app integrations
- ✅ **Performance Testing**: Database and authentication performance validated with each release
- ✅ **Breaking Change Detection**: Automated checks prevent unexpected mobile app breakages

**Mobile Developer Confidence:**
- **Reliable API**: 80%+ test coverage ensures consistent authentication behavior
- **Security First**: CodeQL, Snyk, and Semgrep scanning protects against vulnerabilities
- **Healthcare Compliance**: Automated HIPAA compliance checks for mobile healthcare apps
- **Dependency Safety**: Automatic security updates and vulnerability scanning

**Development Workflow:**
```bash
# Mobile developers can rely on:
# - Stable API endpoints (tested with every commit)
# - Security-validated authentication flows
# - Well-documented integration patterns
# - Automated issue detection and resolution
```

## Support and Resources

### Documentation
- API Reference: `/docs/api`
- Integration Examples: `/docs/examples`
- Security Best Practices: `/docs/security`
- CI/CD Setup Guide: `/.github/DEPLOYMENT_GUIDE.md`

### Getting Help
- GitHub Issues: [hardy-auth/sdk-issues](https://github.com/hardy-auth/sdk-issues)
- Email Support: [sdk-support@mlpipes.ai](mailto:sdk-support@mlpipes.ai)
- Discord Community: [Join our Discord](https://discord.gg/hardy-auth)

### SDK Release Schedule
- **JavaScript SDK**: Q3 2025 (after API foundation)
- **iOS SDK**: Q3 2025 (after API foundation)
- **Android SDK**: Q3 2025 (after API foundation)
- **Python SDK**: Q4 2025
- **.NET SDK**: Q4 2025

---

*This guide will be updated as SDKs are developed and released. For immediate integration needs, please contact our support team for assistance with direct API integration.*