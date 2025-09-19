/**
 * Hardy Auth Service - Dashboard Overview Component
 * Main dashboard with metrics and quick actions
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, usePermissions } from '../auth/auth-provider';
import {
  Users,
  Shield,
  Activity,
  AlertTriangle,
  TrendingUp,
  Clock,
  UserPlus,
  Key,
  Building2,
  CheckCircle,
  XCircle,
  BarChart3
} from 'lucide-react';

interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  failedLogins: number;
  totalSessions: number;
  mfaEnabled: number;
  auditEvents: number;
  uptime: string;
}

interface RecentActivity {
  id: string;
  type: 'login' | 'signup' | 'failed_login' | 'password_change' | 'mfa_setup';
  user: string;
  timestamp: string;
  details?: string;
}

export function DashboardOverview() {
  const { user, tenant } = useAuth();
  const { hasPermission, hasAnyRole } = usePermissions();

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    failedLogins: 0,
    totalSessions: 0,
    mfaEnabled: 0,
    auditEvents: 0,
    uptime: '99.9%'
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for demonstration
  useEffect(() => {
    // In a real app, this would fetch from the API
    setTimeout(() => {
      setMetrics({
        totalUsers: 234,
        activeUsers: 186,
        newUsersToday: 12,
        failedLogins: 3,
        totalSessions: 157,
        mfaEnabled: 198,
        auditEvents: 1247,
        uptime: '99.98%'
      });

      setRecentActivity([
        {
          id: '1',
          type: 'login',
          user: 'Dr. Sarah Johnson',
          timestamp: '2 minutes ago',
          details: 'Successful login from 192.168.1.100'
        },
        {
          id: '2',
          type: 'signup',
          user: 'Michael Chen',
          timestamp: '15 minutes ago',
          details: 'New user registration completed'
        },
        {
          id: '3',
          type: 'mfa_setup',
          user: 'Dr. Emily Rodriguez',
          timestamp: '1 hour ago',
          details: 'Two-factor authentication enabled'
        },
        {
          id: '4',
          type: 'failed_login',
          user: 'unknown@example.com',
          timestamp: '2 hours ago',
          details: 'Failed login attempt from 203.0.113.1'
        },
        {
          id: '5',
          type: 'password_change',
          user: 'Dr. James Wilson',
          timestamp: '3 hours ago',
          details: 'Password successfully updated'
        }
      ]);

      setIsLoading(false);
    }, 1000);
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'signup':
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'failed_login':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'password_change':
        return <Key className="h-4 w-4 text-purple-500" />;
      case 'mfa_setup':
        return <Shield className="h-4 w-4 text-green-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'login':
        return 'bg-green-50 border-green-200';
      case 'signup':
        return 'bg-blue-50 border-blue-200';
      case 'failed_login':
        return 'bg-red-50 border-red-200';
      case 'password_change':
        return 'bg-purple-50 border-purple-200';
      case 'mfa_setup':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  // Role-based metric cards
  const metricCards = [
    {
      title: 'Total Users',
      value: metrics.totalUsers.toLocaleString(),
      subtitle: `${metrics.activeUsers} active`,
      icon: Users,
      color: 'blue',
      requiredRoles: ['system_admin', 'tenant_admin', 'admin']
    },
    {
      title: 'Active Sessions',
      value: metrics.totalSessions.toLocaleString(),
      subtitle: `${metrics.newUsersToday} new today`,
      icon: Activity,
      color: 'green',
      requiredRoles: ['system_admin', 'tenant_admin', 'admin']
    },
    {
      title: 'MFA Enabled',
      value: `${Math.round((metrics.mfaEnabled / metrics.totalUsers) * 100)}%`,
      subtitle: `${metrics.mfaEnabled} users`,
      icon: Shield,
      color: 'purple',
      requiredRoles: ['system_admin', 'tenant_admin', 'admin']
    },
    {
      title: 'Failed Logins',
      value: metrics.failedLogins.toString(),
      subtitle: 'Last 24 hours',
      icon: AlertTriangle,
      color: metrics.failedLogins > 5 ? 'red' : 'yellow',
      requiredRoles: ['system_admin', 'tenant_admin', 'admin']
    },
    {
      title: 'System Uptime',
      value: metrics.uptime,
      subtitle: 'Last 30 days',
      icon: TrendingUp,
      color: 'green',
      requiredRoles: ['system_admin']
    },
    {
      title: 'Audit Events',
      value: metrics.auditEvents.toLocaleString(),
      subtitle: 'This month',
      icon: BarChart3,
      color: 'indigo',
      requiredRoles: ['system_admin', 'tenant_admin']
    }
  ];

  const filteredMetrics = metricCards.filter(card =>
    !card.requiredRoles || hasAnyRole(card.requiredRoles)
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-sm p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              Welcome back, {user?.firstName}!
            </h2>
            <p className="mt-1 text-blue-100">
              {tenant ? `Managing ${tenant.name}` : 'Hardy Auth Dashboard'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Building2 className="h-8 w-8 text-blue-200" />
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredMetrics.map((metric, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{metric.value}</p>
                <p className="text-sm text-gray-500 mt-1">{metric.subtitle}</p>
              </div>
              <div className={`p-3 rounded-lg bg-${metric.color}-100`}>
                <metric.icon className={`h-6 w-6 text-${metric.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Clock className="h-5 w-5 text-gray-400 mr-2" />
              Recent Activity
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className={`p-4 rounded-lg border ${getActivityColor(activity.type)}`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.user}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.details}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <a
                href="/admin/audit"
                className="text-sm text-blue-600 hover:text-blue-500 font-medium"
              >
                View all activity →
              </a>
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {hasAnyRole(['system_admin', 'tenant_admin', 'admin']) && (
                <a
                  href="/admin/users/invite"
                  className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <UserPlus className="h-5 w-5 text-blue-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Invite User</p>
                      <p className="text-xs text-gray-500">Send invitation to join organization</p>
                    </div>
                  </div>
                </a>
              )}

              <a
                href="/security/2fa/setup"
                className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Setup 2FA</p>
                    <p className="text-xs text-gray-500">Enable two-factor authentication</p>
                  </div>
                </div>
              </a>

              {hasPermission('audit:read') && (
                <a
                  href="/admin/audit"
                  className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <BarChart3 className="h-5 w-5 text-purple-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">View Reports</p>
                      <p className="text-xs text-gray-500">Access audit logs and analytics</p>
                    </div>
                  </div>
                </a>
              )}

              <a
                href="/docs"
                className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <Activity className="h-5 w-5 text-indigo-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Documentation</p>
                    <p className="text-xs text-gray-500">API docs and integration guides</p>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Security Status */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center">
          <Shield className="h-6 w-6 text-green-600 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-green-900">Security Status: Excellent</h3>
            <p className="text-sm text-green-700 mt-1">
              All security measures are active. {Math.round((metrics.mfaEnabled / metrics.totalUsers) * 100)}% of users have MFA enabled.
              Your organization is HIPAA compliant and SOC 2 certified.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}