/**
 * Hardy Auth - Dashboard Page
 * Main dashboard after successful authentication
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Shield, Users, Activity, Settings, LogOut, User, Building2 } from 'lucide-react';
import { authClient } from '@/lib/better-auth-client';
import { EmailVerificationBanner } from '@/components/EmailVerificationBanner';

interface User {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      const session = await authClient.getSession();

      if (session?.data) {
        setUser({
          id: session.data.user.id,
          email: session.data.user.email,
          name: session.data.user.name,
          emailVerified: session.data.user.emailVerified || false
        });
      } else {
        // Not authenticated, redirect to login
        router.push('/');
      }
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Shield className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-spin" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600 mr-3" />
              <span className="text-xl font-bold text-gray-900">Hardy Auth</span>
            </div>
            <div className="flex items-center space-x-4">
              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-400" />
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">{user.name || 'User'}</p>
                    <p className="text-gray-500">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Email Verification Banner */}
          <div className="mb-6">
            <EmailVerificationBanner
              userEmail={user.email}
              emailVerified={user.emailVerified}
            />
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">Welcome to Hardy Auth Healthcare Authentication System</p>
          </div>

          {/* Quick Actions */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => router.push('/dashboard/users')}
              className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <h3 className="font-semibold text-gray-900">User Management</h3>
                  <p className="text-sm text-gray-600">Manage user accounts and permissions</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push('/dashboard/organizations')}
              className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-indigo-600 mr-3" />
                <div>
                  <h3 className="font-semibold text-gray-900">Organizations</h3>
                  <p className="text-sm text-gray-600">Manage healthcare organizations</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push('/dashboard/settings')}
              className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center">
                <Settings className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <h3 className="font-semibold text-gray-900">Settings</h3>
                  <p className="text-sm text-gray-600">Configure security and account settings</p>
                </div>
              </div>
            </button>

            <button className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <h3 className="font-semibold text-gray-900">Audit Logs</h3>
                  <p className="text-sm text-gray-600">View system activity logs</p>
                </div>
              </div>
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                      <dd className="text-lg font-semibold text-gray-900">4</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Activity className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Sessions</dt>
                      <dd className="text-lg font-semibold text-gray-900">1</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Shield className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Security Status</dt>
                      <dd className="text-lg font-semibold text-green-600">Secure</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Settings className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">2FA Enabled</dt>
                      <dd className="text-lg font-semibold text-gray-900">Yes</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-8">
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
              </div>
              <ul className="divide-y divide-gray-200">
                <li className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Login successful</p>
                      <p className="text-sm text-gray-500">Just now</p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Success
                      </span>
                    </div>
                  </div>
                </li>
                <li className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Database connected</p>
                      <p className="text-sm text-gray-500">System startup</p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        Info
                      </span>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}