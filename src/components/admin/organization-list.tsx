/**
 * Hardy Auth Service - Organization Management List Component
 * Multi-tenant organization management for healthcare systems
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useAuth, usePermissions } from '../auth/auth-provider';
import {
  Building2,
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  Users,
  Shield,
  Calendar,
  MapPin,
  Globe,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Edit,
  Settings,
  Trash2,
  Eye,
  UserPlus
} from 'lucide-react';

interface Organization {
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

  // Metrics
  userCount: number;
  activeUsers: number;
  lastActivity: string;

  // Configuration
  settings: {
    maxUsers: number;
    sessionTimeout: number;
    requireTwoFactor: boolean;
    allowEmergencyAccess: boolean;
    hipaaCompliant: boolean;
  };
}

interface OrganizationListProps {
  organizations?: Organization[];
  isLoading?: boolean;
}

export function OrganizationList({ organizations = [], isLoading = false }: OrganizationListProps) {
  const { user } = useAuth();
  const { hasAnyRole } = usePermissions();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<keyof Organization>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);

  // Mock data for demonstration
  const mockOrganizations: Organization[] = [
    {
      id: '1',
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
      accreditation: ['Joint Commission', 'CMS'],
      specialties: ['Emergency Medicine', 'Cardiology', 'Surgery', 'Pediatrics'],
      userCount: 234,
      activeUsers: 186,
      lastActivity: '2 hours ago',
      settings: {
        maxUsers: 500,
        sessionTimeout: 30,
        requireTwoFactor: true,
        allowEmergencyAccess: true,
        hipaaCompliant: true
      }
    },
    {
      id: '2',
      name: 'Community Health Clinic',
      slug: 'community-clinic',
      organizationType: 'clinic',
      status: 'active',
      createdAt: '2024-01-10T09:15:00Z',
      updatedAt: '2024-01-18T16:45:00Z',
      email: 'contact@communityclinic.org',
      phone: '+1 (555) 987-6543',
      website: 'https://communityclinic.org',
      address: {
        street: '456 Community Boulevard',
        city: 'Wellness Town',
        state: 'NY',
        zipCode: '10001',
        country: 'United States'
      },
      npiNumber: '0987654321',
      licenseNumber: 'NY-CLINIC-045',
      accreditation: ['NCQA', 'AAAHC'],
      specialties: ['Family Medicine', 'Internal Medicine', 'Preventive Care'],
      userCount: 45,
      activeUsers: 32,
      lastActivity: '1 day ago',
      settings: {
        maxUsers: 100,
        sessionTimeout: 30,
        requireTwoFactor: false,
        allowEmergencyAccess: true,
        hipaaCompliant: true
      }
    },
    {
      id: '3',
      name: 'Smith Family Practice',
      slug: 'smith-practice',
      organizationType: 'practice',
      status: 'pending',
      createdAt: '2024-01-20T11:00:00Z',
      updatedAt: '2024-01-20T11:00:00Z',
      email: 'office@smithpractice.com',
      phone: '+1 (555) 456-7890',
      address: {
        street: '789 Practice Lane',
        city: 'Medical Plaza',
        state: 'TX',
        zipCode: '75001',
        country: 'United States'
      },
      specialties: ['Family Medicine'],
      userCount: 0,
      activeUsers: 0,
      lastActivity: 'Never',
      settings: {
        maxUsers: 25,
        sessionTimeout: 30,
        requireTwoFactor: false,
        allowEmergencyAccess: false,
        hipaaCompliant: true
      }
    }
  ];

  const displayOrganizations = organizations.length > 0 ? organizations : mockOrganizations;

  // Filter organizations
  const filteredOrganizations = useMemo(() => {
    return displayOrganizations.filter(org => {
      const matchesSearch = searchTerm === '' ||
        `${org.name} ${org.email} ${org.slug} ${org.specialties?.join(' ') || ''}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'all' || org.organizationType === typeFilter;
      const matchesStatus = statusFilter === 'all' || org.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [displayOrganizations, searchTerm, typeFilter, statusFilter]);

  // Sort organizations
  const sortedOrganizations = useMemo(() => {
    return [...filteredOrganizations].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [filteredOrganizations, sortField, sortDirection]);

  const handleSort = (field: keyof Organization) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'inactive':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'suspended':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'hospital':
        return 'bg-blue-100 text-blue-800';
      case 'clinic':
        return 'bg-green-100 text-green-800';
      case 'practice':
        return 'bg-purple-100 text-purple-800';
      case 'health_system':
        return 'bg-indigo-100 text-indigo-800';
      case 'laboratory':
        return 'bg-orange-100 text-orange-800';
      case 'pharmacy':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Building2 className="h-8 w-8 text-blue-600 mr-3" />
            Organization Management
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage healthcare organizations and their settings
          </p>
        </div>

        {hasAnyRole(['system_admin']) && (
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Organization
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search organizations by name, type, or specialty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="hospital">Hospital</option>
                <option value="clinic">Clinic</option>
                <option value="practice">Practice</option>
                <option value="health_system">Health System</option>
                <option value="laboratory">Laboratory</option>
                <option value="pharmacy">Pharmacy</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setTypeFilter('all');
                  setStatusFilter('all');
                  setSearchTerm('');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Organizations Grid */}
      <div className="grid grid-cols-1 gap-6">
        {sortedOrganizations.map((org) => (
          <div key={org.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              {/* Organization Info */}
              <div className="flex-1">
                <div className="flex items-start">
                  <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-lg font-semibold text-white">
                      {org.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 mr-3">{org.name}</h3>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(org.status)}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(org.status)}`}>
                          {org.status}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(org.organizationType)}`}>
                          {org.organizationType.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                      {/* Contact */}
                      <div>
                        <div className="flex items-center mb-1">
                          <Mail className="h-4 w-4 mr-1" />
                          <span className="font-medium">Contact</span>
                        </div>
                        <p>{org.email}</p>
                        {org.phone && <p>{org.phone}</p>}
                        {org.website && (
                          <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center">
                            <Globe className="h-3 w-3 mr-1" />
                            Website
                          </a>
                        )}
                      </div>

                      {/* Location */}
                      <div>
                        <div className="flex items-center mb-1">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span className="font-medium">Location</span>
                        </div>
                        <p>{org.address.city}, {org.address.state}</p>
                        <p>{org.address.zipCode}</p>
                      </div>

                      {/* Users */}
                      <div>
                        <div className="flex items-center mb-1">
                          <Users className="h-4 w-4 mr-1" />
                          <span className="font-medium">Users</span>
                        </div>
                        <p>{org.userCount} total</p>
                        <p>{org.activeUsers} active</p>
                        <p className="text-xs text-gray-500">Last activity: {org.lastActivity}</p>
                      </div>

                      {/* Healthcare Info */}
                      <div>
                        <div className="flex items-center mb-1">
                          <Shield className="h-4 w-4 mr-1" />
                          <span className="font-medium">Healthcare</span>
                        </div>
                        {org.npiNumber && <p>NPI: {org.npiNumber}</p>}
                        {org.licenseNumber && <p>License: {org.licenseNumber}</p>}
                        {org.settings.hipaaCompliant && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            HIPAA Compliant
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Specialties */}
                    {org.specialties && org.specialties.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Specialties:</p>
                        <div className="flex flex-wrap gap-1">
                          {org.specialties.slice(0, 3).map((specialty) => (
                            <span
                              key={specialty}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {specialty}
                            </span>
                          ))}
                          {org.specialties.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{org.specialties.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Accreditation */}
                    {org.accreditation && org.accreditation.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700 mb-1">Accreditation:</p>
                        <div className="flex flex-wrap gap-1">
                          {org.accreditation.map((accred) => (
                            <span
                              key={accred}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
                            >
                              {accred}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => window.location.href = `/admin/organizations/${org.id}`}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </button>

                {hasAnyRole(['system_admin']) && (
                  <>
                    <button className="inline-flex items-center px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </button>

                    <button className="inline-flex items-center px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                      <UserPlus className="h-4 w-4 mr-1" />
                      Invite
                    </button>

                    <div className="relative">
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {sortedOrganizations.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No organizations found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by adding a new organization'
            }
          </p>
          {hasAnyRole(['system_admin']) && (
            <div className="mt-6">
              <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Organization
              </button>
            </div>
          )}
        </div>
      )}

      {/* Summary Stats */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{sortedOrganizations.length}</p>
            <p className="text-sm text-gray-600">Total Organizations</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {sortedOrganizations.filter(org => org.status === 'active').length}
            </p>
            <p className="text-sm text-gray-600">Active</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {sortedOrganizations.reduce((sum, org) => sum + org.userCount, 0)}
            </p>
            <p className="text-sm text-gray-600">Total Users</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {sortedOrganizations.reduce((sum, org) => sum + org.activeUsers, 0)}
            </p>
            <p className="text-sm text-gray-600">Active Users</p>
          </div>
        </div>
      </div>
    </div>
  );
}