/**
 * Hardy Auth Service - Organization Detail Component
 * Comprehensive organization management with healthcare compliance
 */

'use client';

import React, { useState } from 'react';
import { useAuth, usePermissions } from '../auth/auth-provider';
import {
  Building2,
  Users,
  Settings,
  Shield,
  Edit,
  Save,
  X,
  Phone,
  Mail,
  Globe,
  MapPin,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  Activity,
  BarChart3,
  FileText,
  UserPlus,
  Key,
  Database,
  Zap,
  Lock,
  Eye,
  Download
} from 'lucide-react';

interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  organizationType: 'hospital' | 'clinic' | 'practice' | 'health_system' | 'laboratory' | 'pharmacy';
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  createdAt: string;
  updatedAt: string;

  // Contact Information
  email: string;
  phone?: string;
  website?: string;

  // Address
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  // Healthcare-specific
  npiNumber?: string;
  licenseNumber?: string;
  accreditation?: string[];
  specialties?: string[];

  // Billing & Subscription
  subscription: {
    plan: 'basic' | 'professional' | 'enterprise';
    maxUsers: number;
    currentUsers: number;
    nextBillingDate: string;
    features: string[];
  };

  // Settings
  settings: {
    sessionTimeout: number;
    requireTwoFactor: boolean;
    allowEmergencyAccess: boolean;
    hipaaCompliant: boolean;
    auditRetentionDays: number;
    passwordPolicy: {
      minLength: number;
      requireSpecialChars: boolean;
      requireNumbers: boolean;
      requireUppercase: boolean;
      maxAge: number;
    };
  };

  // Statistics
  stats: {
    totalUsers: number;
    activeUsers: number;
    dailyActiveUsers: number;
    totalSessions: number;
    auditEvents: number;
    lastBackup: string;
  };
}

interface OrganizationDetailProps {
  organizationId: string;
  organizationData?: OrganizationData;
  onUpdate?: (data: Partial<OrganizationData>) => void;
  onDelete?: (orgId: string) => void;
}

export function OrganizationDetail({
  organizationId,
  organizationData,
  onUpdate,
  onDelete
}: OrganizationDetailProps) {
  const { user } = useAuth();
  const { hasAnyRole } = usePermissions();

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'settings' | 'billing' | 'audit'>('overview');

  // Mock organization data
  const mockOrganization: OrganizationData = {
    id: organizationId,
    name: 'General Hospital Medical Center',
    slug: 'general-hospital',
    organizationType: 'hospital',
    status: 'active',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-20T14:22:00Z',
    email: 'admin@generalhospital.com',
    phone: '+1 (555) 123-4567',
    website: 'https://generalhospital.com',
    address: {
      street: '123 Medical Center Drive',
      city: 'Healthcare City',
      state: 'CA',
      zipCode: '90210',
      country: 'United States'
    },
    npiNumber: '1234567890',
    licenseNumber: 'CA-HOSP-001',
    accreditation: ['Joint Commission', 'CMS', 'NCQA'],
    specialties: ['Emergency Medicine', 'Cardiology', 'Surgery', 'Pediatrics', 'Radiology'],
    subscription: {
      plan: 'enterprise',
      maxUsers: 500,
      currentUsers: 234,
      nextBillingDate: '2024-02-15T00:00:00Z',
      features: ['Unlimited Users', 'Advanced Security', 'Custom Integration', 'Priority Support', 'FHIR API Access']
    },
    settings: {
      sessionTimeout: 30,
      requireTwoFactor: true,
      allowEmergencyAccess: true,
      hipaaCompliant: true,
      auditRetentionDays: 2557, // 7 years
      passwordPolicy: {
        minLength: 12,
        requireSpecialChars: true,
        requireNumbers: true,
        requireUppercase: true,
        maxAge: 90
      }
    },
    stats: {
      totalUsers: 234,
      activeUsers: 186,
      dailyActiveUsers: 142,
      totalSessions: 1567,
      auditEvents: 12847,
      lastBackup: '2024-01-20T02:00:00Z'
    }
  };

  const organization = organizationData || mockOrganization;

  const [formData, setFormData] = useState({
    name: organization.name,
    email: organization.email,
    phone: organization.phone || '',
    website: organization.website || '',
    address: { ...organization.address },
    npiNumber: organization.npiNumber || '',
    licenseNumber: organization.licenseNumber || '',
    organizationType: organization.organizationType,
    status: organization.status
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [field]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      onUpdate?.(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update organization:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'inactive':
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
      case 'suspended':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'basic':
        return 'bg-gray-100 text-gray-800';
      case 'professional':
        return 'bg-blue-100 text-blue-800';
      case 'enterprise':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canEdit = hasAnyRole(['system_admin']);
  const canDelete = hasAnyRole(['system_admin']) && organization.status !== 'active';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-xl font-semibold text-white">
                {organization.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
              <div className="flex items-center mt-1 space-x-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {organization.organizationType.replace('_', ' ')}
                </span>
                <div className="flex items-center">
                  {getStatusIcon(organization.status)}
                  <span className="ml-2 text-sm font-medium text-gray-700 capitalize">
                    {organization.status}
                  </span>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPlanColor(organization.subscription.plan)}`}>
                  {organization.subscription.plan}
                </span>
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
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      name: organization.name,
                      email: organization.email,
                      phone: organization.phone || '',
                      website: organization.website || '',
                      address: { ...organization.address },
                      npiNumber: organization.npiNumber || '',
                      licenseNumber: organization.licenseNumber || '',
                      organizationType: organization.organizationType,
                      status: organization.status
                    });
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
              </div>
            )}

            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Users
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'overview', name: 'Overview', icon: Building2 },
              { id: 'users', name: 'Users', icon: Users },
              { id: 'settings', name: 'Settings', icon: Settings },
              { id: 'billing', name: 'Billing', icon: BarChart3 },
              { id: 'audit', name: 'Audit', icon: Shield }
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
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-800">Total Users</p>
                      <p className="text-2xl font-bold text-blue-900">{organization.stats.totalUsers}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Activity className="h-8 w-8 text-green-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">Active Users</p>
                      <p className="text-2xl font-bold text-green-900">{organization.stats.activeUsers}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Zap className="h-8 w-8 text-purple-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-purple-800">Daily Active</p>
                      <p className="text-2xl font-bold text-purple-900">{organization.stats.dailyActiveUsers}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <BarChart3 className="h-8 w-8 text-indigo-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-indigo-800">Total Sessions</p>
                      <p className="text-2xl font-bold text-indigo-900">{organization.stats.totalSessions.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Organization Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Organization Information</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Organization Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
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
                      <label className="block text-sm font-medium text-gray-700">Website</label>
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                  </div>

                  {canEdit && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Organization Type</label>
                        <select
                          name="organizationType"
                          value={formData.organizationType}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                        >
                          <option value="hospital">Hospital</option>
                          <option value="clinic">Clinic</option>
                          <option value="practice">Practice</option>
                          <option value="health_system">Health System</option>
                          <option value="laboratory">Laboratory</option>
                          <option value="pharmacy">Pharmacy</option>
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
                    </div>
                  )}
                </div>

                {/* Address & Healthcare Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Address & Healthcare Information</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Street Address</label>
                    <input
                      type="text"
                      name="address.street"
                      value={formData.address.street}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">City</label>
                      <input
                        type="text"
                        name="address.city"
                        value={formData.address.city}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">State</label>
                      <input
                        type="text"
                        name="address.state"
                        value={formData.address.state}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ZIP Code</label>
                      <input
                        type="text"
                        name="address.zipCode"
                        value={formData.address.zipCode}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Country</label>
                      <input
                        type="text"
                        name="address.country"
                        value={formData.address.country}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
                  </div>
                </div>
              </div>

              {/* Specialties and Accreditation */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Medical Specialties</h4>
                  <div className="flex flex-wrap gap-2">
                    {organization.specialties?.map((specialty) => (
                      <span
                        key={specialty}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Accreditation</h4>
                  <div className="flex flex-wrap gap-2">
                    {organization.accreditation?.map((accred) => (
                      <span
                        key={accred}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                      >
                        {accred}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">User Management</h3>
                <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Users
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-600 text-center">
                  User management interface would be embedded here, showing the organization's users with filtering and management capabilities.
                </p>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Organization Settings</h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Security Settings */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900">Security Settings</h4>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
                        <p className="text-sm text-gray-500">Require 2FA for all users</p>
                      </div>
                      <div className={`w-12 h-6 rounded-full ${organization.settings.requireTwoFactor ? 'bg-blue-600' : 'bg-gray-300'} relative`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${organization.settings.requireTwoFactor ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Emergency Access</p>
                        <p className="text-sm text-gray-500">Allow emergency override access</p>
                      </div>
                      <div className={`w-12 h-6 rounded-full ${organization.settings.allowEmergencyAccess ? 'bg-blue-600' : 'bg-gray-300'} relative`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${organization.settings.allowEmergencyAccess ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">HIPAA Compliance</p>
                        <p className="text-sm text-gray-500">Enable HIPAA compliance features</p>
                      </div>
                      <div className={`w-12 h-6 rounded-full ${organization.settings.hipaaCompliant ? 'bg-green-600' : 'bg-gray-300'} relative`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${organization.settings.hipaaCompliant ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Settings */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900">System Settings</h4>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Session Timeout (minutes)</label>
                      <input
                        type="number"
                        value={organization.settings.sessionTimeout}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        disabled
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Audit Retention (days)</label>
                      <input
                        type="number"
                        value={organization.settings.auditRetentionDays}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        disabled
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Minimum Password Length</label>
                      <input
                        type="number"
                        value={organization.settings.passwordPolicy.minLength}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Subscription & Billing</h3>

              <div className="bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xl font-semibold capitalize">{organization.subscription.plan} Plan</h4>
                    <p className="mt-1 opacity-90">
                      {organization.subscription.currentUsers} / {organization.subscription.maxUsers} users
                    </p>
                    <p className="mt-1 text-sm opacity-75">
                      Next billing: {new Date(organization.subscription.nextBillingDate).toLocaleDateString()}
                    </p>
                  </div>
                  <button className="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100">
                    Upgrade Plan
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Plan Features</h4>
                  <ul className="space-y-2">
                    {organization.subscription.features.map((feature) => (
                      <li key={feature} className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Usage Statistics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">User Capacity</span>
                      <span className="text-sm font-medium">
                        {Math.round((organization.subscription.currentUsers / organization.subscription.maxUsers) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(organization.subscription.currentUsers / organization.subscription.maxUsers) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audit Tab */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Audit & Compliance</h3>
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  <Download className="h-4 w-4 mr-2" />
                  Export Audit Log
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-800">Audit Events</p>
                      <p className="text-2xl font-bold text-blue-900">{organization.stats.auditEvents.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Database className="h-8 w-8 text-green-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">Last Backup</p>
                      <p className="text-sm font-bold text-green-900">{new Date(organization.stats.lastBackup).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Lock className="h-8 w-8 text-purple-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-purple-800">Retention</p>
                      <p className="text-sm font-bold text-purple-900">{Math.round(organization.settings.auditRetentionDays / 365)} years</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-600 text-center">
                  Detailed audit log interface would be displayed here with filtering, search, and export capabilities.
                </p>
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
              <p className="text-sm font-medium text-red-900">Delete Organization</p>
              <p className="text-sm text-red-700">
                Permanently delete this organization and all associated data. This action cannot be undone.
              </p>
            </div>
            <button
              onClick={() => onDelete?.(organizationId)}
              className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50"
            >
              Delete Organization
            </button>
          </div>
        </div>
      )}
    </div>
  );
}