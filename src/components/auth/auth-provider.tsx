/**
 * Hardy Auth Service - Authentication Provider
 * React context for authentication state management
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { trpc } from '../../lib/auth-client';
import {
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  getTenantId,
  setTenantId,
  removeTenantId,
  clearAuthState
} from '../../lib/auth-client';

// Types for authentication context
interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  organizationId?: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  organizationType: string;
  mfaRequired: boolean;
}

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Authentication methods
  signIn: (email: string, password: string) => Promise<{ requiresTwoFactor?: boolean; userId?: string }>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;

  // 2FA methods
  verifyTwoFactor: (userId: string, code: string, type: 'totp' | 'sms') => Promise<void>;

  // Magic link
  requestMagicLink: (email: string, organizationId?: string) => Promise<void>;

  // Session management
  refreshSession: () => Promise<void>;

  // Tenant selection
  selectTenant: (tenantId: string) => Promise<void>;
}

interface SignUpData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  organizationId?: string;
  licenseNumber?: string;
  npiNumber?: string;
  specialties?: string[];
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize authentication state
  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      const tenantId = getTenantId();

      if (token) {
        try {
          // Get current session
          const session = await trpc.auth.session.get.query();
          if (session?.user) {
            setUser(session.user);

            // Get tenant info if available
            if (tenantId && session.user.organizationId === tenantId) {
              // You might want to fetch tenant details here
              setTenant({
                id: tenantId,
                name: 'Current Organization', // This should come from API
                slug: 'current-org',
                organizationType: 'healthcare_practice',
                mfaRequired: true
              });
            }
          }
        } catch (error) {
          console.error('Failed to initialize auth:', error);
          clearAuthState();
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    const result = await trpc.auth.signIn.mutate({ email, password });

    if (result.requiresTwoFactor) {
      return { requiresTwoFactor: true, userId: result.userId };
    }

    if (result.token && result.user) {
      setAuthToken(result.token);
      setUser(result.user);

      if (result.user.organizationId) {
        setTenantId(result.user.organizationId);
        // Fetch tenant details
        // const tenantData = await trpc.organization.get.query({ id: result.user.organizationId });
        // setTenant(tenantData);
      }
    }

    return {};
  };

  const signUp = async (data: SignUpData) => {
    await trpc.auth.signUp.mutate(data);
    // User will need to verify email before they can sign in
  };

  const signOut = async () => {
    try {
      await trpc.auth.signOut.mutate();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setUser(null);
      setTenant(null);
      clearAuthState();

      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/signin';
      }
    }
  };

  const verifyTwoFactor = async (userId: string, code: string, type: 'totp' | 'sms') => {
    const result = await trpc.auth.twoFactor.verify.mutate({
      userId,
      code,
      type
    });

    if (result.token && result.user) {
      setAuthToken(result.token);
      setUser(result.user);

      if (result.user.organizationId) {
        setTenantId(result.user.organizationId);
      }
    }
  };

  const requestMagicLink = async (email: string, organizationId?: string) => {
    await trpc.auth.magicLink.request.mutate({ email, organizationId });
  };

  const refreshSession = async () => {
    try {
      const session = await trpc.auth.session.refresh.mutate();
      if (session?.user) {
        setUser(session.user);
      }
    } catch (error) {
      console.error('Failed to refresh session:', error);
      await signOut();
    }
  };

  const selectTenant = async (tenantId: string) => {
    setTenantId(tenantId);
    // Fetch tenant details and update context
    // const tenantData = await trpc.organization.get.query({ id: tenantId });
    // setTenant(tenantData);
  };

  const value: AuthContextType = {
    user,
    tenant,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    verifyTwoFactor,
    requestMagicLink,
    refreshSession,
    selectTenant,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper hook for checking permissions
export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!user?.permissions) return false;
    return user.permissions.includes(permission);
  };

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return roles.includes(user?.role || '');
  };

  return {
    hasPermission,
    hasRole,
    hasAnyRole,
  };
}