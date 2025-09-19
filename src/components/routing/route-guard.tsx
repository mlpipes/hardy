/**
 * Hardy Auth Service - Route Guard Component
 * Healthcare-specific route protection and session management
 */

'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '../auth/auth-provider';
import { Shield, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

interface RouteGuardProps {
  children: ReactNode;
  publicRoutes?: string[];
  protectedRoutes?: string[];
  sessionTimeoutWarning?: number; // Minutes before session expires to show warning
  maxIdleTime?: number; // Minutes of inactivity before automatic logout
}

interface SessionState {
  lastActivity: number;
  timeoutWarning: boolean;
  timeRemaining: number;
}

export function RouteGuard({
  children,
  publicRoutes = ['/auth/signin', '/auth/signup', '/auth/forgot-password', '/auth/verify-email', '/'],
  protectedRoutes = ['/dashboard', '/admin', '/profile', '/settings'],
  sessionTimeoutWarning = 5, // 5 minutes warning
  maxIdleTime = 30 // 30 minutes max idle
}: RouteGuardProps) {
  const { user, isLoading, signOut, refreshSession } = useAuth();
  const [sessionState, setSessionState] = useState<SessionState>({
    lastActivity: Date.now(),
    timeoutWarning: false,
    timeRemaining: maxIdleTime * 60 * 1000 // Convert to milliseconds
  });

  const [currentPath, setCurrentPath] = useState('');

  // Track current path
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentPath(window.location.pathname);
    }
  }, []);

  // Activity tracking
  useEffect(() => {
    if (!user) return;

    const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    const resetActivity = () => {
      setSessionState(prev => ({
        ...prev,
        lastActivity: Date.now(),
        timeoutWarning: false,
        timeRemaining: maxIdleTime * 60 * 1000
      }));
    };

    // Add event listeners for user activity
    activities.forEach(activity => {
      document.addEventListener(activity, resetActivity, true);
    });

    return () => {
      activities.forEach(activity => {
        document.removeEventListener(activity, resetActivity, true);
      });
    };
  }, [user, maxIdleTime]);

  // Session timeout monitoring
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = now - sessionState.lastActivity;
      const timeRemaining = (maxIdleTime * 60 * 1000) - timeSinceActivity;
      const warningThreshold = sessionTimeoutWarning * 60 * 1000;

      if (timeRemaining <= 0) {
        // Session expired
        signOut();
        return;
      }

      if (timeRemaining <= warningThreshold && !sessionState.timeoutWarning) {
        // Show warning
        setSessionState(prev => ({
          ...prev,
          timeoutWarning: true,
          timeRemaining
        }));
      }

      // Update remaining time
      setSessionState(prev => ({
        ...prev,
        timeRemaining
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [user, sessionState.lastActivity, maxIdleTime, sessionTimeoutWarning, signOut]);

  // Check if current route is public
  const isPublicRoute = publicRoutes.some(route => {
    if (route === '/' && currentPath === '/') return true;
    if (route !== '/' && currentPath.startsWith(route)) return true;
    return false;
  });

  // Check if current route is protected
  const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route));

  // Handle session extension
  const extendSession = async () => {
    try {
      await refreshSession?.();
      setSessionState(prev => ({
        ...prev,
        lastActivity: Date.now(),
        timeoutWarning: false,
        timeRemaining: maxIdleTime * 60 * 1000
      }));
    } catch (error) {
      console.error('Failed to refresh session:', error);
      signOut();
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading Hardy Auth...</p>
        </div>
      </div>
    );
  }

  // Handle unauthenticated users on protected routes
  if (!user && isProtectedRoute) {
    if (typeof window !== 'undefined') {
      // Store the intended destination
      localStorage.setItem('hardy_auth_redirect', currentPath);
      window.location.href = '/auth/signin';
    }
    return null;
  }

  // Handle authenticated users on auth pages
  if (user && currentPath.startsWith('/auth/') && currentPath !== '/auth/verify-email') {
    if (typeof window !== 'undefined') {
      const redirectTo = localStorage.getItem('hardy_auth_redirect') || '/dashboard';
      localStorage.removeItem('hardy_auth_redirect');
      window.location.href = redirectTo;
    }
    return null;
  }

  // Render children with session timeout warning overlay
  return (
    <>
      {children}

      {/* Session Timeout Warning Modal */}
      {user && sessionState.timeoutWarning && (
        <SessionTimeoutWarning
          timeRemaining={sessionState.timeRemaining}
          onExtend={extendSession}
          onSignOut={signOut}
        />
      )}
    </>
  );
}

// Session Timeout Warning Component
interface SessionTimeoutWarningProps {
  timeRemaining: number;
  onExtend: () => void;
  onSignOut: () => void;
}

function SessionTimeoutWarning({ timeRemaining, onExtend, onSignOut }: SessionTimeoutWarningProps) {
  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center mb-4">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
            <Clock className="h-6 w-6 text-yellow-600" />
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Session Expiring Soon
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Your session will expire in{' '}
            <span className="font-medium text-red-600">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>{' '}
            due to inactivity.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <Shield className="h-5 w-5 text-blue-600 mr-2" />
              <p className="text-xs text-blue-700">
                This is a security measure to protect your healthcare data
              </p>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onExtend}
              className="flex-1 inline-flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Stay Signed In
            </button>
            <button
              onClick={onSignOut}
              className="flex-1 inline-flex justify-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Healthcare-specific route protection hooks
export function useHealthcareRouteProtection() {
  const { user } = useAuth();

  const checkPatientDataAccess = (patientId: string, userPermissions: string[]) => {
    // Healthcare providers can access patient data they're authorized for
    if (userPermissions.includes('patient:read')) {
      return true;
    }

    // Patients can only access their own data
    if (user?.role === 'patient' && user?.id === patientId) {
      return true;
    }

    return false;
  };

  const checkHIPAACompliance = (requiredLevel: 'basic' | 'enhanced' | 'administrative') => {
    if (!user) return false;

    switch (requiredLevel) {
      case 'basic':
        return user.emailVerified;
      case 'enhanced':
        return user.emailVerified && user.twoFactorEnabled;
      case 'administrative':
        return user.emailVerified && user.twoFactorEnabled && ['system_admin', 'tenant_admin', 'admin'].includes(user.role);
      default:
        return false;
    }
  };

  const checkEmergencyAccess = (emergencyContext?: boolean) => {
    // In emergency situations, some restrictions may be relaxed
    if (emergencyContext && user?.role === 'clinician') {
      return true;
    }
    return false;
  };

  return {
    checkPatientDataAccess,
    checkHIPAACompliance,
    checkEmergencyAccess
  };
}

// HIPAA Audit Logger for route access
export function useHIPAAAuditLogger() {
  const { user } = useAuth();

  const logAccess = (resource: string, action: string, success: boolean, details?: any) => {
    if (!user) return;

    const auditLog = {
      userId: user.id,
      tenantId: user.tenantId,
      timestamp: new Date().toISOString(),
      resource,
      action,
      success,
      ipAddress: 'client-side', // Would be filled server-side
      userAgent: navigator.userAgent,
      details: details || {}
    };

    // In a real implementation, this would send to the audit service
    console.log('HIPAA Audit Log:', auditLog);

    // Store in session storage for server-side pickup
    const existingLogs = JSON.parse(sessionStorage.getItem('hipaa_audit_logs') || '[]');
    existingLogs.push(auditLog);
    sessionStorage.setItem('hipaa_audit_logs', JSON.stringify(existingLogs));
  };

  return { logAccess };
}