'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Building2,
  Globe,
  Phone,
  MapPin,
  Mail,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Edit,
  ArrowLeft,
  Settings,
  UserPlus,
  MoreVertical,
  Trash2
} from 'lucide-react';

interface OrganizationMember {
  id: string;
  role: string;
  department: string | null;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    licenseNumber: string | null;
    npiNumber: string | null;
    specialties: string[];
  };
}

interface OrganizationInvitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
  inviter: {
    id: string;
    email: string;
    name: string | null;
  };
}

interface OrganizationDetails {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo: string | null;
  website: string | null;
  phone: string | null;
  organizationType: string;
  npiNumber: string | null;
  licenseNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string;
  maxUsers: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  members: OrganizationMember[];
  invitations: OrganizationInvitation[];
}

export default function OrganizationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [organization, setOrganization] = useState<OrganizationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/organizations/${params.id}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Organization not found');
          return;
        }
        if (response.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Failed to fetch organization');
      }

      const data: { data: { organization: OrganizationDetails } } = await response.json();
      setOrganization(data.data.organization);
    } catch (error) {
      console.error('Error fetching organization:', error);
      setError('Failed to load organization details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchOrganization();
    }
  }, [params.id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      hospital: 'bg-red-100 text-red-800',
      clinic: 'bg-blue-100 text-blue-800',
      practice: 'bg-green-100 text-green-800',
      pharmacy: 'bg-purple-100 text-purple-800',
      lab: 'bg-yellow-100 text-yellow-800',
      imaging: 'bg-indigo-100 text-indigo-800',
      therapy: 'bg-pink-100 text-pink-800',
      default: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || colors.default;
  };

  const getRoleColor = (role: string) => {
    const colors: { [key: string]: string } = {
      admin: 'bg-red-100 text-red-800',
      clinician: 'bg-blue-100 text-blue-800',
      staff: 'bg-green-100 text-green-800',
      patient: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || colors.patient;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Building2 className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-500">Loading organization...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Organization not found</h3>
              <p className="text-gray-500 mb-6">{error || 'The organization you are looking for does not exist.'}</p>
              <button
                onClick={() => router.push('/dashboard/organizations')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Organizations
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard/organizations')}
                className="flex items-center text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5 mr-1" />
                Back to Organizations
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <button className="flex items-center space-x-2 bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </button>
              <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                <UserPlus className="h-4 w-4" />
                <span>Invite Member</span>
              </button>
            </div>
          </div>
        </div>

        {/* Organization Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
                <p className="text-gray-500">@{organization.slug}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(
                      organization.organizationType
                    )}`}
                  >
                    {organization.organizationType}
                  </span>
                  <div className="flex items-center">
                    {organization.isActive ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="ml-1 text-sm text-gray-600">
                      {organization.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Organization Details */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Organization Details</h3>
              </div>
              <div className="p-6 space-y-4">
                {organization.domain && (
                  <div className="flex items-center space-x-3">
                    <Globe className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-900">{organization.domain}</span>
                  </div>
                )}
                {organization.website && (
                  <div className="flex items-center space-x-3">
                    <Globe className="h-5 w-5 text-gray-400" />
                    <a
                      href={organization.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {organization.website}
                    </a>
                  </div>
                )}
                {organization.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-900">{organization.phone}</span>
                  </div>
                )}
                {organization.npiNumber && (
                  <div className="flex items-center space-x-3">
                    <span className="h-5 w-5 text-center text-xs font-semibold text-gray-400">NPI</span>
                    <span className="text-gray-900">{organization.npiNumber}</span>
                  </div>
                )}
                {(organization.addressLine1 || organization.city) && (
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      {organization.addressLine1 && (
                        <div className="text-gray-900">{organization.addressLine1}</div>
                      )}
                      {organization.addressLine2 && (
                        <div className="text-gray-900">{organization.addressLine2}</div>
                      )}
                      {organization.city && (
                        <div className="text-gray-900">
                          {organization.city}
                          {organization.state && `, ${organization.state}`}
                          {organization.zipCode && ` ${organization.zipCode}`}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900">Created {formatDate(organization.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Members */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Members ({organization.members.length})
                  </h3>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    View All
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {organization.members.slice(0, 5).map((member) => (
                  <div key={member.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {member.user.name?.charAt(0) || member.user.email.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {member.user.name || 'No name'}
                          </p>
                          <p className="text-sm text-gray-500">{member.user.email}</p>
                          {member.department && (
                            <p className="text-xs text-gray-500">{member.department}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(
                            member.role
                          )}`}
                        >
                          {member.role}
                        </span>
                        <span className="text-xs text-gray-500">
                          Joined {formatDate(member.joinedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {organization.members.length === 0 && (
                  <div className="p-6 text-center text-gray-500">
                    No members found
                  </div>
                )}
              </div>
            </div>

            {/* Pending Invitations */}
            {organization.invitations.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    Pending Invitations ({organization.invitations.length})
                  </h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {organization.invitations.map((invitation) => (
                    <div key={invitation.id} className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Mail className="h-5 w-5 text-orange-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{invitation.email}</p>
                            <p className="text-sm text-gray-500">
                              Invited by {invitation.inviter.name || invitation.inviter.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            {invitation.role}
                          </span>
                          <span className="text-xs text-gray-500">
                            Expires {formatDate(invitation.expiresAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total Members</span>
                  <span className="text-sm font-medium text-gray-900">{organization.members.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Pending Invitations</span>
                  <span className="text-sm font-medium text-gray-900">{organization.invitations.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Max Users</span>
                  <span className="text-sm font-medium text-gray-900">{organization.maxUsers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Usage</span>
                  <span className="text-sm font-medium text-gray-900">
                    {Math.round((organization.members.length / organization.maxUsers) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  <UserPlus className="h-4 w-4" />
                  <span>Invite Member</span>
                </button>
                <button className="w-full flex items-center justify-center space-x-2 bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
                  <Settings className="h-4 w-4" />
                  <span>Organization Settings</span>
                </button>
                <button className="w-full flex items-center justify-center space-x-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-200 hover:bg-red-100 transition-colors">
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Organization</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}