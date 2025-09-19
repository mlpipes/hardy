/**
 * Hardy Auth Service - Route Protection Hooks
 * Healthcare-specific access control and audit logging
 */

'use client';

import { useEffect, useMemo } from 'react';
import { useAuth, usePermissions } from '../components/auth/auth-provider';

interface RouteConfig {
  path: string;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  requiresEmailVerification?: boolean;
  requiresTwoFactor?: boolean;
  hipaaLevel?: 'basic' | 'enhanced' | 'administrative';
  allowSelfAccess?: boolean;
  emergencyOverride?: boolean;
}

// Predefined route configurations for healthcare application
export const HEALTHCARE_ROUTES: Record<string, RouteConfig> = {
  // Dashboard routes
  '/dashboard': {
    path: '/dashboard',
    requiresEmailVerification: true,
    hipaaLevel: 'basic'
  },

  // User management routes
  '/admin/users': {
    path: '/admin/users',
    requiredRoles: ['system_admin', 'tenant_admin', 'admin'],
    requiredPermissions: ['member:read'],
    requiresEmailVerification: true,
    requiresTwoFactor: true,
    hipaaLevel: 'administrative'
  },
  '/admin/users/invite': {
    path: '/admin/users/invite',
    requiredRoles: ['system_admin', 'tenant_admin', 'admin'],
    requiredPermissions: ['member:create'],
    requiresEmailVerification: true,
    requiresTwoFactor: true,
    hipaaLevel: 'administrative'
  },
  '/admin/users/:id': {
    path: '/admin/users/:id',
    requiredRoles: ['system_admin', 'tenant_admin', 'admin'],
    requiredPermissions: ['member:read'],
    requiresEmailVerification: true,
    requiresTwoFactor: true,
    hipaaLevel: 'enhanced',
    allowSelfAccess: true
  },

  // Organization management routes
  '/admin/organizations': {
    path: '/admin/organizations',
    requiredRoles: ['system_admin'],
    requiredPermissions: ['organization:read'],
    requiresEmailVerification: true,
    requiresTwoFactor: true,
    hipaaLevel: 'administrative'
  },

  // Security and audit routes
  '/admin/audit': {
    path: '/admin/audit',
    requiredRoles: ['system_admin', 'tenant_admin', 'admin'],
    requiredPermissions: ['audit:read'],
    requiresEmailVerification: true,
    requiresTwoFactor: true,
    hipaaLevel: 'administrative'
  },

  // Settings routes
  '/admin/settings': {
    path: '/admin/settings',
    requiredRoles: ['system_admin', 'tenant_admin', 'admin'],
    requiredPermissions: ['settings:read'],
    requiresEmailVerification: true,
    requiresTwoFactor: true,
    hipaaLevel: 'administrative'
  },

  // Profile routes
  '/profile': {
    path: '/profile',
    requiresEmailVerification: true,
    hipaaLevel: 'basic',
    allowSelfAccess: true
  },
  '/profile/security': {
    path: '/profile/security',
    requiresEmailVerification: true,
    hipaaLevel: 'enhanced',
    allowSelfAccess: true
  },

  // Patient data routes (examples)
  '/patients/:id': {
    path: '/patients/:id',
    requiredRoles: ['clinician', 'admin', 'tenant_admin', 'system_admin'],
    requiredPermissions: ['patient:read'],
    requiresEmailVerification: true,
    requiresTwoFactor: true,
    hipaaLevel: 'enhanced',
    emergencyOverride: true,
    allowSelfAccess: true
  },

  // Emergency access routes
  '/emergency/patient/:id': {
    path: '/emergency/patient/:id',
    requiredRoles: ['clinician'],
    requiresEmailVerification: true,
    hipaaLevel: 'basic',
    emergencyOverride: true
  }
};

// Main route protection hook
export function useRouteProtection(routePath: string, resourceId?: string) {
  const { user } = useAuth();
  const { hasAnyRole, hasPermission } = usePermissions();

  const routeConfig = useMemo(() => {
    // Find matching route configuration
    const exactMatch = HEALTHCARE_ROUTES[routePath];
    if (exactMatch) return exactMatch;

    // Check for parameterized routes
    const paramRoute = Object.values(HEALTHCARE_ROUTES).find(config => {
      const pattern = config.path.replace(/:[\w]+/g, '([^/]+)');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(routePath);
    });

    return paramRoute;
  }, [routePath]);

  const checkAccess = useMemo(() => {
    if (!routeConfig || !user) return { allowed: false, reason: 'Not authenticated' };

    // Check email verification
    if (routeConfig.requiresEmailVerification && !user.emailVerified) {
      return { allowed: false, reason: 'Email verification required' };
    }

    // Check two-factor authentication
    if (routeConfig.requiresTwoFactor && !user.twoFactorEnabled) {
      return { allowed: false, reason: 'Two-factor authentication required' };
    }

    // Check account status
    if (user.status === 'suspended') {
      return { allowed: false, reason: 'Account suspended' };
    }

    if (user.status === 'inactive') {
      return { allowed: false, reason: 'Account inactive' };
    }

    // Check self-access for user-specific resources
    const isSelfAccess = routeConfig.allowSelfAccess && resourceId && user.id === resourceId;

    // Check role requirements (skip if self-access is allowed)
    if (!isSelfAccess && routeConfig.requiredRoles && routeConfig.requiredRoles.length > 0) {
      if (!hasAnyRole(routeConfig.requiredRoles)) {
        return { allowed: false, reason: `Requires role: ${routeConfig.requiredRoles.join(' or ')}` };
      }
    }

    // Check permission requirements (skip if self-access is allowed)
    if (!isSelfAccess && routeConfig.requiredPermissions && routeConfig.requiredPermissions.length > 0) {
      const hasAllPermissions = routeConfig.requiredPermissions.every(permission => hasPermission(permission));
      if (!hasAllPermissions) {
        return { allowed: false, reason: 'Insufficient permissions' };
      }
    }

    // Check HIPAA compliance level
    if (routeConfig.hipaaLevel) {
      const hipaaCompliant = checkHIPAACompliance(routeConfig.hipaaLevel);
      if (!hipaaCompliant) {
        return { allowed: false, reason: `HIPAA ${routeConfig.hipaaLevel} compliance required` };
      }
    }

    return { allowed: true, reason: 'Access granted' };
  }, [routeConfig, user, hasAnyRole, hasPermission, resourceId]);

  const checkHIPAACompliance = (level: 'basic' | 'enhanced' | 'administrative') => {
    if (!user) return false;

    switch (level) {
      case 'basic':
        return user.emailVerified;
      case 'enhanced':
        return user.emailVerified && user.twoFactorEnabled;
      case 'administrative':
        return user.emailVerified &&
               user.twoFactorEnabled &&
               ['system_admin', 'tenant_admin', 'admin'].includes(user.role);
      default:
        return false;
    }
  };

  return {
    routeConfig,
    checkAccess,
    isAllowed: checkAccess.allowed,
    accessReason: checkAccess.reason
  };
}

// Emergency access hook for healthcare scenarios
export function useEmergencyAccess() {
  const { user } = useAuth();

  const checkEmergencyAccess = (routePath: string, emergencyCode?: string) => {
    const routeConfig = HEALTHCARE_ROUTES[routePath];

    if (!routeConfig?.emergencyOverride || !user) {
      return { allowed: false, reason: 'Emergency access not available' };
    }

    // Emergency access for clinicians
    if (user.role === 'clinician' && user.emailVerified) {
      return {
        allowed: true,
        reason: 'Emergency clinician access granted',
        requiresAudit: true,
        emergencyCode
      };
    }

    return { allowed: false, reason: 'Emergency access denied' };
  };

  return { checkEmergencyAccess };
}

// Patient data access hook
export function usePatientDataAccess() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  const checkPatientAccess = (patientId: string) => {
    if (!user) return { allowed: false, reason: 'Not authenticated' };

    // Patient can access their own data
    if (user.role === 'patient' && user.id === patientId) {
      return { allowed: true, reason: 'Self access granted' };
    }

    // Healthcare providers with proper permissions
    if (['clinician', 'admin', 'tenant_admin', 'system_admin'].includes(user.role)) {
      if (hasPermission('patient:read')) {
        return { allowed: true, reason: 'Healthcare provider access granted' };
      }
    }

    return { allowed: false, reason: 'Insufficient permissions for patient data' };
  };

  return { checkPatientAccess };
}

// Audit logging hook for route access
export function useRouteAuditLogger() {
  const { user } = useAuth();

  const logRouteAccess = (routePath: string, success: boolean, reason?: string, resourceId?: string) => {
    if (!user) return;

    const auditEntry = {
      timestamp: new Date().toISOString(),
      userId: user.id,
      tenantId: user.tenantId,
      userRole: user.role,
      action: 'route_access',
      resource: routePath,
      resourceId: resourceId || null,
      success,
      reason: reason || 'Route access',
      ipAddress: 'client-side', // Would be populated server-side
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown',
      sessionId: user.sessionId || 'unknown'
    };

    // In a real implementation, this would send to audit service
    console.log('Route Access Audit:', auditEntry);

    // Store for server-side processing
    if (typeof window !== 'undefined') {
      const existingLogs = JSON.parse(sessionStorage.getItem('route_audit_logs') || '[]');
      existingLogs.push(auditEntry);
      sessionStorage.setItem('route_audit_logs', JSON.stringify(existingLogs));
    }
  };

  return { logRouteAccess };
}

// Session timeout hook
export function useSessionTimeout(timeoutMinutes: number = 30, warningMinutes: number = 5) {
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (!user) return;

    let timeoutId: NodeJS.Timeout;
    let warningId: NodeJS.Timeout;
    let lastActivity = Date.now();

    const resetTimers = () => {
      lastActivity = Date.now();
      clearTimeout(timeoutId);
      clearTimeout(warningId);

      // Set warning timer
      warningId = setTimeout(() => {
        const event = new CustomEvent('session-warning', {
          detail: { timeRemaining: warningMinutes * 60 * 1000 }
        });
        window.dispatchEvent(event);
      }, (timeoutMinutes - warningMinutes) * 60 * 1000);

      // Set logout timer
      timeoutId = setTimeout(() => {
        signOut();
      }, timeoutMinutes * 60 * 1000);
    };

    const handleActivity = () => {
      resetTimers();
    };

    // Activity events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initial timer setup
    resetTimers();

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(warningId);
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [user, timeoutMinutes, warningMinutes, signOut]);
}

// Role-based component rendering hook
export function useRoleBasedRender() {
  const { hasAnyRole, hasPermission } = usePermissions();

  const renderForRoles = (roles: string[], component: React.ReactNode, fallback?: React.ReactNode) => {
    return hasAnyRole(roles) ? component : (fallback || null);
  };

  const renderForPermissions = (permissions: string[], component: React.ReactNode, fallback?: React.ReactNode) => {
    const hasAllPermissions = permissions.every(permission => hasPermission(permission));
    return hasAllPermissions ? component : (fallback || null);
  };

  return { renderForRoles, renderForPermissions };
}