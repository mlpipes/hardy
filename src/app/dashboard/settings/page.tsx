/**
 * Hardy Auth - Settings Page
 * User security settings including 2FA configuration
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Shield, Smartphone, Key, Mail, AlertTriangle, CheckCircle } from 'lucide-react';
import { authClient } from '@/lib/better-auth-client';
import { TwoFactorSetup } from '@/components/TwoFactorSetup';
import { Breadcrumb, breadcrumbConfigs } from '@/components/Breadcrumb';

interface User {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  twoFactorEnabled?: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('security');

  useEffect(() => {
    const checkAuth = async () => {
      const result = await authClient.getSession();

      if (result.data) {
        setUser(result.data.user);
      } else {
        router.push('/');
      }
      setLoading(false);
    };

    checkAuth();
  }, [router]);

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
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Breadcrumb */}
          <Breadcrumb items={breadcrumbConfigs.settings} className="mb-6" />

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
            <p className="mt-2 text-gray-600">Manage your security settings and preferences</p>
          </div>

          {/* Tabs */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('security')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'security'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Shield className="h-4 w-4 inline mr-2" />
                  Security
                </button>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'profile'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Profile
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Email Verification Status */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <Mail className="h-5 w-5 mr-2" />
                      Email Verification
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Your email address verification status
                    </p>
                  </div>
                  <div className="flex items-center">
                    {user.emailVerified ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        <span className="text-sm font-medium">Verified</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-amber-600">
                        <AlertTriangle className="h-5 w-5 mr-2" />
                        <span className="text-sm font-medium">Not Verified</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Two-Factor Authentication */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <Smartphone className="h-5 w-5 mr-2" />
                    Two-Factor Authentication (2FA)
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Add an extra layer of security to your account using TOTP authenticators
                  </p>
                </div>

                <TwoFactorSetup user={user} />
              </div>

              {/* Password Security */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <Key className="h-5 w-5 mr-2" />
                      Password Security
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Manage your account password
                    </p>
                  </div>
                  <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                    Change Password
                  </button>
                </div>
              </div>

              {/* Session Management */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Active Sessions</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Manage your active login sessions
                    </p>
                  </div>
                  <button className="bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                    Sign Out All Devices
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={user.name || ''}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={user.email}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50"
                    readOnly
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}