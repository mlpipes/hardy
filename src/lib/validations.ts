/**
 * MLPipes Auth Service - Zod Validation Schemas
 * Comprehensive validation for healthcare authentication
 */

import { z } from 'zod'

// Base validation patterns
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email must be less than 255 characters')
  .toLowerCase()
  .trim()

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

export const phoneNumberSchema = z
  .string()
  .regex(/^\+[1-9]\d{8,14}$/, 'Invalid phone number format (use E.164 format)')

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(50, 'Name must be less than 50 characters')
  .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters')
  .trim()

export const npiSchema = z
  .string()
  .length(10, 'NPI must be exactly 10 digits')
  .regex(/^\d{10}$/, 'NPI must contain only digits')
  .refine((npi) => {
    // Luhn algorithm validation for NPI
    const digits = npi.split('').map(Number)
    let sum = 0
    let alternate = false
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = digits[i]
      if (alternate) {
        digit *= 2
        if (digit > 9) digit -= 9
      }
      sum += digit
      alternate = !alternate
    }
    
    return sum % 10 === 0
  }, 'Invalid NPI number')

export const totpTokenSchema = z
  .string()
  .length(6, 'TOTP token must be exactly 6 digits')
  .regex(/^\d{6}$/, 'TOTP token must contain only digits')

export const organizationSlugSchema = z
  .string()
  .min(2, 'Organization slug must be at least 2 characters')
  .max(50, 'Organization slug must be less than 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Organization slug can only contain lowercase letters, numbers, and hyphens')

// Authentication schemas
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  organizationId: z.string().optional(),
  licenseNumber: z.string().optional(),
  npiNumber: npiSchema.optional(),
  specialties: z.array(z.string()).optional(),
})

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
  organizationSlug: organizationSlugSchema.optional(),
})

export const magicLinkSchema = z.object({
  email: emailSchema,
  organizationSlug: organizationSlugSchema.optional(),
})

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
})

export const resetPasswordSchema = z.object({
  email: emailSchema,
  organizationSlug: organizationSlugSchema.optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
})

// Two-Factor Authentication schemas
export const setup2FASchema = z.object({
  method: z.enum(['totp', 'sms', 'email'], {
    errorMap: () => ({ message: 'Invalid 2FA method' }),
  }),
  phoneNumber: phoneNumberSchema.optional(),
})

export const verify2FASchema = z.object({
  token: totpTokenSchema,
  method: z.enum(['totp', 'sms', 'email']),
})

export const disable2FASchema = z.object({
  password: z.string().min(1, 'Password is required for 2FA disable'),
  token: totpTokenSchema,
})

// Passkey schemas
export const registerPasskeySchema = z.object({
  name: z.string().min(1, 'Passkey name is required').max(50, 'Passkey name too long'),
  credentialId: z.string(),
  publicKey: z.string(),
  counter: z.number().int().min(0),
  transports: z.array(z.string()).optional(),
})

export const authenticatePasskeySchema = z.object({
  credentialId: z.string(),
  signature: z.string(),
  authenticatorData: z.string(),
  clientDataJSON: z.string(),
})

// Organization schemas
export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
  slug: organizationSlugSchema,
  organizationType: z.enum(['healthcare_practice', 'hospital', 'clinic', 'telemedicine', 'pharmacy', 'laboratory']),
  practiceNpi: npiSchema.optional(),
  fhirEndpoint: z.string().url().optional(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string().default('US'),
  }).optional(),
  phoneNumber: phoneNumberSchema.optional(),
  website: z.string().url().optional(),
  timezone: z.string().default('UTC'),
})

export const updateOrganizationSchema = createOrganizationSchema.partial()

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(['admin', 'clinician', 'staff', 'patient']),
  departmentId: z.string().optional(),
  message: z.string().max(500).optional(),
})

export const updateMemberSchema = z.object({
  role: z.enum(['admin', 'clinician', 'staff', 'patient']).optional(),
  departmentId: z.string().optional(),
  licenseNumber: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  status: z.enum(['active', 'suspended', 'pending']).optional(),
})

// OAuth2 schemas
export const createOAuthClientSchema = z.object({
  name: z.string().min(2, 'Client name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  redirectUris: z.array(z.string().url('Invalid redirect URI')).min(1, 'At least one redirect URI required'),
  grantTypes: z.array(z.enum(['authorization_code', 'client_credentials', 'refresh_token'])).min(1),
  scopes: z.array(z.string()).min(1, 'At least one scope required'),
  tokenEndpointAuthMethod: z.enum(['client_secret_basic', 'client_secret_post', 'none']).default('client_secret_basic'),
  smartEnabled: z.boolean().default(false),
  fhirContext: z.object({
    patient: z.boolean().default(false),
    encounter: z.boolean().default(false),
    practitioner: z.boolean().default(false),
  }).optional(),
})

export const updateOAuthClientSchema = createOAuthClientSchema.partial()

// Admin schemas
export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  role: z.enum(['system_admin', 'tenant_admin', 'admin', 'clinician', 'staff', 'patient']),
  organizationId: z.string(),
  licenseNumber: z.string().optional(),
  npiNumber: npiSchema.optional(),
  specialties: z.array(z.string()).optional(),
  departmentId: z.string().optional(),
})

export const updateUserSchema = createUserSchema.omit({ password: true }).partial()

export const auditLogFilterSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  userId: z.string().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  severity: z.enum(['info', 'warning', 'error', 'critical']).optional(),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0),
})

// FHIR/SMART schemas
export const smartLaunchSchema = z.object({
  iss: z.string().url('Invalid FHIR server URL'),
  launch: z.string().optional(),
  aud: z.string().url('Invalid audience URL'),
  client_id: z.string(),
  redirect_uri: z.string().url('Invalid redirect URI'),
  scope: z.string(),
  state: z.string(),
  code_challenge: z.string().optional(),
  code_challenge_method: z.enum(['S256']).optional(),
})

export const smartTokenSchema = z.object({
  grant_type: z.enum(['authorization_code', 'client_credentials']),
  code: z.string().optional(),
  redirect_uri: z.string().url().optional(),
  client_id: z.string(),
  client_secret: z.string().optional(),
  code_verifier: z.string().optional(),
  scope: z.string().optional(),
})

// Session management schemas
export const sessionFilterSchema = z.object({
  active: z.boolean().optional(),
  userId: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
})

export const revokeSessionSchema = z.object({
  sessionId: z.string(),
})

// Rate limiting schemas
export const rateLimitSchema = z.object({
  window: z.number().int().min(1000).max(3600000), // 1 second to 1 hour
  max: z.number().int().min(1).max(10000),
})

// Compliance schemas
export const complianceSettingsSchema = z.object({
  hipaaCompliant: z.boolean().default(true),
  soc2Ready: z.boolean().default(false),
  hitrustReady: z.boolean().default(false),
  auditRetentionDays: z.number().int().min(365).max(3650).default(2555), // 1-10 years, default 7
  mfaRequired: z.boolean().default(true),
  passwordPolicy: z.object({
    minLength: z.number().int().min(8).max(128).default(12),
    requireUppercase: z.boolean().default(true),
    requireLowercase: z.boolean().default(true),
    requireNumbers: z.boolean().default(true),
    requireSpecialChars: z.boolean().default(true),
    preventReuse: z.number().int().min(1).max(24).default(12),
    expirationDays: z.number().int().min(30).max(365).optional(),
  }),
  sessionTimeout: z.number().int().min(300).max(28800).default(1800), // 5 minutes to 8 hours, default 30 minutes
})

// Validation helpers
export const validateNPI = (npi: string): boolean => {
  return npiSchema.safeParse(npi).success
}

export const validateEmail = (email: string): boolean => {
  return emailSchema.safeParse(email).success
}

export const validatePassword = (password: string): boolean => {
  return passwordSchema.safeParse(password).success
}

export const validatePhoneNumber = (phone: string): boolean => {
  return phoneNumberSchema.safeParse(phone).success
}

// Type exports
export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type MagicLinkInput = z.infer<typeof magicLinkSchema>
export type Setup2FAInput = z.infer<typeof setup2FASchema>
export type Verify2FAInput = z.infer<typeof verify2FASchema>
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
export type CreateOAuthClientInput = z.infer<typeof createOAuthClientSchema>
export type AuditLogFilter = z.infer<typeof auditLogFilterSchema>
export type SmartLaunchInput = z.infer<typeof smartLaunchSchema>
export type ComplianceSettings = z.infer<typeof complianceSettingsSchema>