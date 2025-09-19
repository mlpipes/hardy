/**
 * Hardy Auth Service - Protected Route Component
 * Role-based route protection with healthcare compliance
 */

'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { useAuth, usePermissions } from '../auth/auth-provider';
import { Shield, Lock, AlertTriangle, Clock, RefreshCw } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  requiresEmailVerification?: boolean;
  requiresTwoFactor?: boolean;
  redirectTo?: string;
  fallback?: ReactNode;
  allowSelf?: boolean; // Allow access if user is viewing their own data
  resourceUserId?: string; // For self-access checking
}

export function ProtectedRoute({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  requiresEmailVerification = true,
  requiresTwoFactor = false,
  redirectTo = '/auth/signin',
  fallback,
  allowSelf = false,
  resourceUserId
}: ProtectedRouteProps) {
  const { user, isLoading, signOut } = useAuth();
  const { hasAnyRole, hasPermission, hasAllPermissions } = usePermissions();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Add a small delay to prevent flash of unauthorized content
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Show loading state while checking authentication
  if (isLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!user) {
    if (typeof window !== 'undefined') {
      // Store the current path for redirect after login
      localStorage.setItem('hardy_auth_redirect', window.location.pathname);
      window.location.href = redirectTo;
    }
    return null;
  }

  // Check email verification requirement
  if (requiresEmailVerification && !user.emailVerified) {
    return (
      <AccessDeniedPage
        title="Email Verification Required"
        description="Please verify your email address to access this page."
        icon={<AlertTriangle className="h-12 w-12 text-yellow-500" />}
        actions={
          <div className="space-y-3">
            <button
              onClick={() => {
                // Trigger email verification resend
                window.location.href = '/auth/verify-email';
              }}
              className="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Resend Verification Email
            </button>
            <button
              onClick={signOut}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Sign Out
            </button>
          </div>
        }
      />
    );
  }

  // Check two-factor authentication requirement
  if (requiresTwoFactor && !user.twoFactorEnabled) {
    return (
      <AccessDeniedPage
        title="Two-Factor Authentication Required"
        description="This area requires two-factor authentication for enhanced security."
        icon={<Shield className="h-12 w-12 text-red-500" />}
        actions={
          <div className="space-y-3">
            <button
              onClick={() => {
                window.location.href = '/security/2fa/setup';
              }}
              className="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Enable Two-Factor Authentication
            </button>
            <button
              onClick={() => {
                window.location.href = '/dashboard';
              }}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Go to Dashboard
            </button>
          </div>
        }
      />
    );
  }

  // Check self-access for user-specific resources
  const isSelfAccess = allowSelf && resourceUserId && user.id === resourceUserId;

  // Check role requirements (skip if self-access is allowed and conditions are met)
  if (!isSelfAccess && requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    return (
      <AccessDeniedPage
        title="Insufficient Permissions"
        description={`This page requires one of the following roles: ${requiredRoles.join(', ').replace(/_/g, ' ')}`}
        icon={<Lock className="h-12 w-12 text-red-500" />}
        actions={
          <div className="space-y-3">
            <button
              onClick={() => {
                window.location.href = '/dashboard';
              }}
              className="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => {
                window.location.href = '/contact/support';
              }}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Request Access
            </button>
          </div>
        }
      />
    );
  }

  // Check permission requirements (skip if self-access is allowed and conditions are met)
  if (!isSelfAccess && requiredPermissions.length > 0) {
    const hasRequiredPermissions = requiredPermissions.every(permission => hasPermission(permission));

    if (!hasRequiredPermissions) {
      return (
        <AccessDeniedPage
          title="Access Denied"
          description={`You don't have the required permissions to access this page.`}
          icon={<Lock className="h-12 w-12 text-red-500" />}
          actions={
            <div className="space-y-3">
              <button
                onClick={() => {
                  window.location.href = '/dashboard';
                }}
                className="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => {
                  window.location.href = '/contact/support';
                }}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Contact Administrator
              </button>
            </div>
          }
        />
      );
    }
  }

  // Check account status
  if (user.status === 'suspended') {
    return (
      <AccessDeniedPage
        title="Account Suspended"
        description="Your account has been suspended. Please contact your administrator for more information."
        icon={<AlertTriangle className="h-12 w-12 text-red-500" />}
        actions={
          <div className="space-y-3">
            <button
              onClick={() => {
                window.location.href = 'mailto:support@mlpipes.ai';
              }}
              className="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Contact Support
            </button>
            <button
              onClick={signOut}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Sign Out
            </button>
          </div>
        }
      />
    );
  }

  if (user.status === 'inactive') {
    return (
      <AccessDeniedPage
        title="Account Inactive"
        description="Your account is inactive. Please contact your administrator to reactivate your account."
        icon={<Clock className="h-12 w-12 text-yellow-500" />}
        actions={
          <div className="space-y-3">
            <button
              onClick={() => {
                window.location.href = 'mailto:support@mlpipes.ai';
              }}
              className="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Contact Support
            </button>
            <button
              onClick={signOut}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Sign Out
            </button>
          </div>
        }
      />
    );
  }

  // All checks passed, render the protected content
  return <>{children}</>;
}

// Access Denied Page Component
interface AccessDeniedPageProps {
  title: string;
  description: string;
  icon: ReactNode;
  actions?: ReactNode;
}

function AccessDeniedPage({ title, description, icon, actions }: AccessDeniedPageProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-gray-100 mb-6">
              {icon}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
            <p className="text-gray-600 mb-8">{description}</p>
            {actions}
          </div>
        </div>
      </div>

      {/* Healthcare Compliance Notice */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <Shield className="h-5 w-5 text-blue-600 mr-2" />
            <p className="text-xs text-blue-700">
              HIPAA compliant • SOC 2 Type II certified • End-to-end encrypted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// HOC for easier route protection
export function withRoleProtection(
  Component: React.ComponentType<any>,
  requiredRoles: string[],
  options: Partial<ProtectedRouteProps> = {}
) {
  return function ProtectedComponent(props: any) {
    return (
      <ProtectedRoute requiredRoles={requiredRoles} {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

// HOC for permission-based protection
export function withPermissionProtection(
  Component: React.ComponentType<any>,
  requiredPermissions: string[],
  options: Partial<ProtectedRouteProps> = {}
) {
  return function ProtectedComponent(props: any) {
    return (
      <ProtectedRoute requiredPermissions={requiredPermissions} {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}