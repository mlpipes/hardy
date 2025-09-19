/**
 * Hardy Auth Service - User Detail Component
 * Comprehensive user profile management for healthcare professionals
 */

'use client';

import React, { useState } from 'react';
import { useAuth, usePermissions } from '../auth/auth-provider';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Key,
  Clock,
  Edit,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Building2,
  FileText,
  Lock,
  Unlock,
  UserX,
  RefreshCw,
  Send,
  Eye,
  Activity
} from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  lastLogin: string;
  createdAt: string;
  updatedAt: string;
  twoFactorEnabled: boolean;
  emailVerified: boolean;

  // Healthcare-specific fields
  licenseNumber?: string;
  npiNumber?: string;
  specialty?: string;
  department?: string;
  phone?: string;
  address?: string;

  // Security and audit
  failedLoginAttempts: number;
  lastPasswordChange: string;
  sessionCount: number;

  // Organization context
  tenantId: string;
  tenantName: string;
}

interface UserDetailProps {
  userId: string;
  userData?: UserData;
  onUpdate?: (data: Partial<UserData>) => void;
  onDelete?: (userId: string) => void;
}

export function UserDetail({ userId, userData, onUpdate, onDelete }: UserDetailProps) {
  const { user: currentUser } = useAuth();
  const { hasPermission, hasAnyRole } = usePermissions();

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'activity' | 'sessions'>('profile');

  // Mock user data for demonstration
  const mockUser: UserData = {
    id: userId,
    email: 'dr.sarah.johnson@hospital.com',
    firstName: 'Sarah',
    lastName: 'Johnson',
    role: 'clinician',
    status: 'active',
    lastLogin: '2 hours ago',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-20T14:22:00Z',
    twoFactorEnabled: true,
    emailVerified: true,
    licenseNumber: 'MD-12345',
    npiNumber: '1234567890',
    specialty: 'Cardiology',
    department: 'Internal Medicine',
    phone: '+1 (555) 123-4567',
    address: '123 Medical Center Dr, Healthcare City, HC 12345',
    failedLoginAttempts: 0,
    lastPasswordChange: '2024-01-01T00:00:00Z',
    sessionCount: 3,
    tenantId: 'tenant-1',
    tenantName: 'General Hospital'
  };

  const user = userData || mockUser;

  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || '',
    department: user.department || '',
    specialty: user.specialty || '',
    licenseNumber: user.licenseNumber || '',
    npiNumber: user.npiNumber || '',
    address: user.address || '',
    role: user.role,
    status: user.status
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would call the API
      onUpdate?.(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      department: user.department || '',
      specialty: user.specialty || '',
      licenseNumber: user.licenseNumber || '',
      npiNumber: user.npiNumber || '',
      address: user.address || '',
      role: user.role,
      status: user.status
    });
    setIsEditing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'inactive':
        return <UserX className="h-5 w-5 text-gray-500" />;
      case 'suspended':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canEdit = hasAnyRole(['system_admin', 'tenant_admin', 'admin']) || currentUser?.id === userId;
  const canDelete = hasAnyRole(['system_admin', 'tenant_admin']) && currentUser?.id !== userId;
  const canManageSecurity = hasAnyRole(['system_admin', 'tenant_admin', 'admin']);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xl font-semibold text-blue-600">
                {user.firstName.charAt(0)}{user.lastName.charAt(0)}
              </span>
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {user.firstName} {user.lastName}
              </h1>
              <div className="flex items-center mt-1 space-x-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {user.role.replace('_', ' ')}
                </span>
                <div className="flex items-center">
                  {getStatusIcon(user.status)}
                  <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                    {user.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </button>
            )}

            {isEditing && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
              </div>
            )}

            {canManageSecurity && (
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Shield className="h-4 w-4 mr-2" />
                Security
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'profile', name: 'Profile', icon: User },
              { id: 'security', name: 'Security', icon: Shield },
              { id: 'activity', name: 'Activity', icon: Activity },
              { id: 'sessions', name: 'Sessions', icon: Eye }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email Address</label>
                    <div className="mt-1 relative">
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      />
                      {user.emailVerified ? (
                        <CheckCircle className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="absolute right-3 top-2.5 h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      rows={3}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                    />
                  </div>
                </div>

                {/* Professional Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Professional Information</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Department</label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Medical Specialty</label>
                    <input
                      type="text"
                      name="specialty"
                      value={formData.specialty}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">License Number</label>
                    <input
                      type="text"
                      name="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">NPI Number</label>
                    <input
                      type="text"
                      name="npiNumber"
                      value={formData.npiNumber}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                    />
                  </div>

                  {canManageSecurity && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Role</label>
                        <select
                          name="role"
                          value={formData.role}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                        >
                          <option value="patient">Patient</option>
                          <option value="staff">Staff</option>
                          <option value="clinician">Clinician</option>
                          <option value="admin">Admin</option>
                          <option value="tenant_admin">Tenant Admin</option>
                          {hasAnyRole(['system_admin']) && (
                            <option value="system_admin">System Admin</option>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="pending">Pending</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Account Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Created</p>
                      <p className="text-sm text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Last Login</p>
                      <p className="text-sm text-gray-500">{user.lastLogin}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Organization</p>
                      <p className="text-sm text-gray-500">{user.tenantName}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Shield className={`h-5 w-5 mr-3 ${user.twoFactorEnabled ? 'text-green-500' : 'text-gray-400'}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
                          <p className="text-sm text-gray-500">
                            {user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>
                      </div>
                      {canManageSecurity && (
                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                          {user.twoFactorEnabled ? 'Disable' : 'Enable'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Key className="h-5 w-5 mr-3 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Password</p>
                          <p className="text-sm text-gray-500">
                            Last changed: {new Date(user.lastPasswordChange).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {canManageSecurity && (
                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Mail className={`h-5 w-5 mr-3 ${user.emailVerified ? 'text-green-500' : 'text-yellow-500'}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Email Verification</p>
                          <p className="text-sm text-gray-500">
                            {user.emailVerified ? 'Verified' : 'Pending verification'}
                          </p>
                        </div>
                      </div>
                      {!user.emailVerified && canManageSecurity && (
                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                          Resend
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Security Stats</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Failed login attempts</span>
                        <span className="text-sm font-medium text-gray-900">{user.failedLoginAttempts}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Active sessions</span>
                        <span className="text-sm font-medium text-gray-900">{user.sessionCount}</span>
                      </div>
                    </div>
                  </div>

                  {canManageSecurity && (
                    <div className="space-y-3">
                      <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Force Password Reset
                      </button>
                      <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                        <Send className="h-4 w-4 mr-2" />
                        Send Verification Email
                      </button>
                      <button className="w-full flex items-center justify-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50">
                        <Lock className="h-4 w-4 mr-2" />
                        Suspend Account
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
              <div className="space-y-4">
                {[
                  { action: 'Successful login', timestamp: '2 hours ago', ip: '192.168.1.100', status: 'success' },
                  { action: 'Password changed', timestamp: '1 day ago', ip: '192.168.1.100', status: 'success' },
                  { action: 'Failed login attempt', timestamp: '3 days ago', ip: '203.0.113.1', status: 'warning' },
                  { action: '2FA enabled', timestamp: '1 week ago', ip: '192.168.1.100', status: 'success' }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <div className={`h-2 w-2 rounded-full mr-3 ${
                        activity.status === 'success' ? 'bg-green-500' :
                        activity.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                        <p className="text-sm text-gray-500">From {activity.ip}</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{activity.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Active Sessions</h3>
                {canManageSecurity && (
                  <button className="text-red-600 hover:text-red-700 text-sm font-medium">
                    Revoke All Sessions
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {[
                  { device: 'Desktop - Chrome', location: 'New York, NY', lastActive: '2 hours ago', current: true },
                  { device: 'Mobile - Safari', location: 'New York, NY', lastActive: '1 day ago', current: false },
                  { device: 'Tablet - Chrome', location: 'Boston, MA', lastActive: '3 days ago', current: false }
                ].map((session, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                        <Eye className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {session.device}
                          {session.current && <span className="ml-2 text-green-600">(Current)</span>}
                        </p>
                        <p className="text-sm text-gray-500">{session.location} • {session.lastActive}</p>
                      </div>
                    </div>
                    {!session.current && canManageSecurity && (
                      <button className="text-red-600 hover:text-red-700 text-sm font-medium">
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      {canDelete && (
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
          <h3 className="text-lg font-medium text-red-900 mb-4">Danger Zone</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-900">Delete User Account</p>
              <p className="text-sm text-red-700">
                Permanently delete this user account and all associated data. This action cannot be undone.
              </p>
            </div>
            <button
              onClick={() => onDelete?.(userId)}
              className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}