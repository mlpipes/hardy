/**
 * Hardy Auth Service - Dashboard Layout Component
 * Multi-tenant dashboard with role-based navigation
 */

'use client';

import React, { useState, ReactNode } from 'react';
import { useAuth, usePermissions } from '../auth/auth-provider';
import {
  Building2,
  Users,
  Shield,
  Settings,
  BarChart3,
  FileText,
  Menu,
  X,
  ChevronDown,
  LogOut,
  User,
  Bell,
  Search,
  HelpCircle
} from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  badge?: string;
}

export function DashboardLayout({ children, title, description }: DashboardLayoutProps) {
  const { user, tenant, signOut } = useAuth();
  const { hasPermission, hasAnyRole } = usePermissions();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Navigation items based on user role and permissions
  const navigationItems: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: BarChart3,
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: Users,
      requiredPermissions: ['member:read'],
      requiredRoles: ['system_admin', 'tenant_admin', 'admin'],
    },
    {
      name: 'Organizations',
      href: '/admin/organizations',
      icon: Building2,
      requiredRoles: ['system_admin'],
    },
    {
      name: 'Security & Audit',
      href: '/admin/audit',
      icon: Shield,
      requiredPermissions: ['audit:read'],
      requiredRoles: ['system_admin', 'tenant_admin', 'admin'],
    },
    {
      name: 'Settings',
      href: '/admin/settings',
      icon: Settings,
      requiredPermissions: ['settings:read'],
      requiredRoles: ['system_admin', 'tenant_admin', 'admin'],
    },
    {
      name: 'Documentation',
      href: '/docs',
      icon: FileText,
    },
  ];

  // Filter navigation based on user permissions
  const filteredNavigation = navigationItems.filter(item => {
    if (item.requiredRoles && !hasAnyRole(item.requiredRoles)) {
      return false;
    }
    if (item.requiredPermissions && !item.requiredPermissions.some(permission => hasPermission(permission))) {
      return false;
    }
    return true;
  });

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-semibold text-gray-900">Hardy Auth</h1>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden rounded-md p-2 text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Organization info */}
        {tenant && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {tenant.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{tenant.name}</p>
                <p className="text-xs text-gray-500 capitalize">{tenant.organizationType}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {filteredNavigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <item.icon className="flex-shrink-0 h-5 w-5 mr-3 text-gray-400 group-hover:text-gray-500" />
              {item.name}
              {item.badge && (
                <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {item.badge}
                </span>
              )}
            </a>
          ))}
        </nav>

        {/* User info in sidebar */}
        <div className="flex-shrink-0 border-t border-gray-200 p-4">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top navigation */}
        <header className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              {/* Left side */}
              <div className="flex items-center">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden rounded-md p-2 text-gray-400 hover:text-gray-500"
                >
                  <Menu className="h-6 w-6" />
                </button>

                {/* Search */}
                <div className="hidden md:block ml-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search users, organizations..."
                      className="block w-80 pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Right side */}
              <div className="flex items-center space-x-4">
                {/* Notifications */}
                <button className="p-2 text-gray-400 hover:text-gray-500 relative">
                  <Bell className="h-6 w-6" />
                  <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                </button>

                {/* Help */}
                <button className="p-2 text-gray-400 hover:text-gray-500">
                  <HelpCircle className="h-6 w-6" />
                </button>

                {/* User menu */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center mr-2">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                    <span className="hidden md:block text-gray-700 font-medium">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <ChevronDown className="hidden md:block h-4 w-4 ml-1 text-gray-400" />
                  </button>

                  {/* User dropdown */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                      <a
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Your Profile
                      </a>
                      <a
                        href="/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Settings
                      </a>
                      {user?.twoFactorEnabled ? (
                        <a
                          href="/security/2fa"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Two-Factor Authentication
                        </a>
                      ) : (
                        <a
                          href="/security/2fa/setup"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Enable Two-Factor Auth
                        </a>
                      )}
                      <div className="border-t border-gray-100"></div>
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <LogOut className="inline h-4 w-4 mr-2" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">
          {/* Page header */}
          {(title || description) && (
            <div className="bg-white shadow-sm border-b border-gray-200">
              <div className="px-4 sm:px-6 lg:px-8 py-6">
                <div className="md:flex md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    {title && (
                      <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate">
                        {title}
                      </h1>
                    )}
                    {description && (
                      <p className="mt-1 text-sm text-gray-500">{description}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main content area */}
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Click outside to close user menu */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </div>
  );
}