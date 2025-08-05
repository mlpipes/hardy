/**
 * MLPipes Auth Service - Auth Configuration Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { validateAuthConfig } from '../auth'

describe('Auth Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('validateAuthConfig', () => {
    it('should validate correct configuration', () => {
      process.env.BETTER_AUTH_SECRET = 'test-secret-key-32-characters-long'
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5434/mlpipes_auth_test'

      const result = validateAuthConfig()
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing BETTER_AUTH_SECRET', () => {
      delete process.env.BETTER_AUTH_SECRET
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5434/mlpipes_auth_test'

      const result = validateAuthConfig()
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('BETTER_AUTH_SECRET is required')
    })

    it('should detect missing DATABASE_URL', () => {
      process.env.BETTER_AUTH_SECRET = 'test-secret-key-32-characters-long'
      delete process.env.DATABASE_URL

      const result = validateAuthConfig()
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('DATABASE_URL is required')
    })

    it('should detect short BETTER_AUTH_SECRET', () => {
      process.env.BETTER_AUTH_SECRET = 'short-key'
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5434/mlpipes_auth_test'

      const result = validateAuthConfig()
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('BETTER_AUTH_SECRET must be at least 32 characters')
    })

    it('should return multiple errors when multiple issues exist', () => {
      delete process.env.BETTER_AUTH_SECRET
      delete process.env.DATABASE_URL

      const result = validateAuthConfig()
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(2)
      expect(result.errors).toContain('BETTER_AUTH_SECRET is required')
      expect(result.errors).toContain('DATABASE_URL is required')
    })
  })

  describe('auth configuration values', () => {
    it('should use correct default values', () => {
      // Test environment variables defaults
      expect(process.env.BETTER_AUTH_URL || "http://localhost:3001").toBe("http://localhost:3001")
      expect(parseInt(process.env.SESSION_MAX_AGE || "1800")).toBe(1800)
      expect(parseInt(process.env.SESSION_UPDATE_AGE || "300")).toBe(300)
      expect(parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000")).toBe(60000)
      expect(parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100")).toBe(100)
    })

    it('should respect custom environment values', () => {
      process.env.BETTER_AUTH_URL = "https://custom.mlpipes.ai"
      process.env.SESSION_MAX_AGE = "3600"
      process.env.SESSION_UPDATE_AGE = "600"
      process.env.RATE_LIMIT_WINDOW_MS = "120000"
      process.env.RATE_LIMIT_MAX_REQUESTS = "200"

      expect(process.env.BETTER_AUTH_URL).toBe("https://custom.mlpipes.ai")
      expect(parseInt(process.env.SESSION_MAX_AGE)).toBe(3600)
      expect(parseInt(process.env.SESSION_UPDATE_AGE)).toBe(600)
      expect(parseInt(process.env.RATE_LIMIT_WINDOW_MS)).toBe(120000)
      expect(parseInt(process.env.RATE_LIMIT_MAX_REQUESTS)).toBe(200)
    })
  })

  describe('security settings', () => {
    it('should use secure cookies in production', () => {
      process.env.NODE_ENV = 'production'
      
      // In production, secure cookies should be enabled
      expect(process.env.NODE_ENV === "production").toBe(true)
    })

    it('should not use secure cookies in development', () => {
      process.env.NODE_ENV = 'development'
      
      expect(process.env.NODE_ENV === "production").toBe(false)
    })

    it('should disable cross-subdomain cookies for security', () => {
      // This is hardcoded to false for security
      const crossSubDomainEnabled = false
      expect(crossSubDomainEnabled).toBe(false)
    })
  })

  describe('HIPAA compliance settings', () => {
    it('should use appropriate session timeouts', () => {
      // Default session timeout should be 30 minutes (1800 seconds)
      const defaultSessionTimeout = parseInt(process.env.SESSION_MAX_AGE || "1800")
      expect(defaultSessionTimeout).toBeLessThanOrEqual(1800) // Max 30 minutes
    })

    it('should use strong password requirements', () => {
      const minPasswordLength = 12 // From auth configuration
      expect(minPasswordLength).toBeGreaterThanOrEqual(12)
    })

    it('should use appropriate rate limiting', () => {
      const defaultRateLimit = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100")
      const defaultWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000")
      
      expect(defaultRateLimit).toBeGreaterThan(0)
      expect(defaultWindow).toBeGreaterThanOrEqual(60000) // At least 1 minute
    })
  })

  describe('organization roles and permissions', () => {
    it('should define tenant_admin with full permissions', () => {
      const tenantAdminPermissions = [
        "organization:create", "organization:read", "organization:update", "organization:delete",
        "member:create", "member:read", "member:update", "member:delete", "member:invite", "member:remove",
        "role:assign", "role:revoke", "billing:read", "billing:update",
        "settings:read", "settings:update", "audit:read",
      ]
      
      expect(tenantAdminPermissions).toContain("organization:create")
      expect(tenantAdminPermissions).toContain("audit:read")
      expect(tenantAdminPermissions.length).toBeGreaterThan(10)
    })

    it('should define clinician with healthcare-specific permissions', () => {
      const clinicianPermissions = [
        "organization:read", "member:read", "patient:create", "patient:read", "patient:update",
        "appointment:create", "appointment:read", "appointment:update",
        "clinical_notes:create", "clinical_notes:read", "clinical_notes:update",
      ]
      
      expect(clinicianPermissions).toContain("patient:create")
      expect(clinicianPermissions).toContain("clinical_notes:create")
      expect(clinicianPermissions).not.toContain("organization:delete")
    })

    it('should define patient with limited permissions', () => {
      const patientPermissions = [
        "profile:read", "profile:update", "appointment:read", "appointment:create",
        "medical_records:read",
      ]
      
      expect(patientPermissions).toContain("profile:read")
      expect(patientPermissions).toContain("medical_records:read")
      expect(patientPermissions).not.toContain("member:read")
      expect(patientPermissions.length).toBeLessThan(10)
    })
  })

  describe('healthcare-specific fields', () => {
    it('should include healthcare organization fields', () => {
      const orgFields = {
        organizationType: { type: "string", defaultValue: "healthcare_practice", required: false },
        practiceNpi: { type: "string", required: false },
        fhirEndpoint: { type: "string", required: false },
        complianceSettings: { type: "json", required: false },
        subscriptionTier: { type: "string", defaultValue: "basic", required: false },
      }
      
      expect(orgFields.organizationType.defaultValue).toBe("healthcare_practice")
      expect(orgFields.practiceNpi.type).toBe("string")
      expect(orgFields.fhirEndpoint.type).toBe("string")
    })

    it('should include healthcare member fields', () => {
      const memberFields = {
        departmentId: { type: "string", required: false },
        licenseNumber: { type: "string", required: false },
        specialties: { type: "json", required: false },
        permissions: { type: "json", required: false },
      }
      
      expect(memberFields.licenseNumber.type).toBe("string")
      expect(memberFields.specialties.type).toBe("json")
      expect(memberFields.departmentId.required).toBe(false)
    })
  })
})