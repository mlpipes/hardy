/**
 * Hardy Auth Service - User Invitation Component
 * Healthcare-focused user invitation with role and department assignment
 */

'use client';

import React, { useState } from 'react';
import { useAuth, usePermissions } from '../auth/auth-provider';
import {
  UserPlus,
  Mail,
  Users,
  Shield,
  Building2,
  Send,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  FileText,
  Clock
} from 'lucide-react';

interface InvitationData {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
  specialty?: string;
  customMessage?: string;
}

interface UserInviteProps {
  onInviteSent?: (invitations: InvitationData[]) => void;
  onCancel?: () => void;
}

export function UserInvite({ onInviteSent, onCancel }: UserInviteProps) {
  const { user, tenant } = useAuth();
  const { hasAnyRole } = usePermissions();

  const [invitations, setInvitations] = useState<InvitationData[]>([
    {
      email: '',
      firstName: '',
      lastName: '',
      role: 'staff',
      department: '',
      specialty: '',
      customMessage: ''
    }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});

  const roles = [
    { value: 'patient', label: 'Patient', description: 'Basic patient access' },
    { value: 'staff', label: 'Staff', description: 'Administrative staff member' },
    { value: 'clinician', label: 'Clinician', description: 'Healthcare provider' },
    { value: 'admin', label: 'Admin', description: 'Department administrator' },
    ...(hasAnyRole(['system_admin', 'tenant_admin']) ? [
      { value: 'tenant_admin', label: 'Tenant Admin', description: 'Organization administrator' }
    ] : [])
  ];

  const departments = [
    'Emergency Medicine',
    'Internal Medicine',
    'Cardiology',
    'Pediatrics',
    'Surgery',
    'Radiology',
    'Laboratory',
    'Pharmacy',
    'Administration',
    'IT Support',
    'Nursing',
    'Physical Therapy'
  ];

  const specialties = [
    'Family Medicine',
    'Internal Medicine',
    'Cardiology',
    'Dermatology',
    'Emergency Medicine',
    'Endocrinology',
    'Gastroenterology',
    'Hematology',
    'Infectious Disease',
    'Nephrology',
    'Neurology',
    'Oncology',
    'Orthopedics',
    'Pediatrics',
    'Psychiatry',
    'Pulmonology',
    'Radiology',
    'Surgery',
    'Urology'
  ];

  const addInvitation = () => {
    setInvitations([...invitations, {
      email: '',
      firstName: '',
      lastName: '',
      role: 'staff',
      department: '',
      specialty: '',
      customMessage: ''
    }]);
  };

  const removeInvitation = (index: number) => {
    if (invitations.length > 1) {
      setInvitations(invitations.filter((_, i) => i !== index));
      // Clean up errors for removed invitation
      const newErrors = { ...errors };
      delete newErrors[index];
      setErrors(newErrors);
    }
  };

  const updateInvitation = (index: number, field: keyof InvitationData, value: string) => {
    const updated = [...invitations];
    updated[index] = { ...updated[index], [field]: value };
    setInvitations(updated);

    // Clear error for this field
    if (errors[index]?.[field]) {
      const newErrors = { ...errors };
      delete newErrors[index][field];
      if (Object.keys(newErrors[index] || {}).length === 0) {
        delete newErrors[index];
      }
      setErrors(newErrors);
    }
  };

  const validateInvitations = () => {
    const newErrors: Record<number, Record<string, string>> = {};

    invitations.forEach((invitation, index) => {
      const inviteErrors: Record<string, string> = {};

      if (!invitation.email) {
        inviteErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitation.email)) {
        inviteErrors.email = 'Invalid email format';
      }

      if (!invitation.firstName) {
        inviteErrors.firstName = 'First name is required';
      }

      if (!invitation.lastName) {
        inviteErrors.lastName = 'Last name is required';
      }

      if (!invitation.department) {
        inviteErrors.department = 'Department is required';
      }

      if (Object.keys(inviteErrors).length > 0) {
        newErrors[index] = inviteErrors;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const processBulkInvitations = () => {
    const lines = bulkText.split('\n').filter(line => line.trim());
    const bulkInvitations: InvitationData[] = [];

    lines.forEach(line => {
      const parts = line.split(',').map(part => part.trim());
      if (parts.length >= 3) {
        bulkInvitations.push({
          email: parts[0],
          firstName: parts[1],
          lastName: parts[2],
          role: parts[3] || 'staff',
          department: parts[4] || '',
          specialty: parts[5] || '',
          customMessage: ''
        });
      }
    });

    setInvitations(bulkInvitations);
    setBulkMode(false);
    setBulkText('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateInvitations()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // In a real app, this would call the API
      await new Promise(resolve => setTimeout(resolve, 2000));

      setSubmitStatus('success');
      onInviteSent?.(invitations);

      // Reset form after successful submission
      setTimeout(() => {
        setInvitations([{
          email: '',
          firstName: '',
          lastName: '',
          role: 'staff',
          department: '',
          specialty: '',
          customMessage: ''
        }]);
        setSubmitStatus('idle');
      }, 2000);

    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Invitations Sent!</h2>
          <p className="text-gray-600 mb-6">
            We've sent {invitations.length} invitation{invitations.length !== 1 ? 's' : ''} to the specified email addresses.
            Recipients will receive instructions to create their Hardy Auth accounts.
          </p>
          <div className="space-y-4">
            <button
              onClick={() => setSubmitStatus('idle')}
              className="w-full inline-flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Send More Invitations
            </button>
            <button
              onClick={onCancel}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Return to User Management
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <UserPlus className="h-8 w-8 text-blue-600 mr-3" />
              Invite Users
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Invite healthcare professionals and staff to join {tenant?.name || 'your organization'}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setBulkMode(!bulkMode)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FileText className="h-4 w-4 mr-2" />
              {bulkMode ? 'Single Mode' : 'Bulk Import'}
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Import Mode */}
      {bulkMode && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Bulk Import</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CSV Data (Email, First Name, Last Name, Role, Department, Specialty)
              </label>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`dr.smith@hospital.com, John, Smith, clinician, Cardiology, Cardiology
nurse.jones@hospital.com, Sarah, Jones, staff, Emergency Medicine,
admin.doe@hospital.com, Michael, Doe, admin, Administration,`}
                rows={8}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={processBulkInvitations}
                disabled={!bulkText.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                Process Import
              </button>
              <button
                onClick={() => setBulkMode(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invitation Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">User Invitations</h3>
            <button
              type="button"
              onClick={addInvitation}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another
            </button>
          </div>

          <div className="space-y-8">
            {invitations.map((invitation, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">
                    Invitation #{index + 1}
                  </h4>
                  {invitations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeInvitation(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Email Address *
                    </label>
                    <div className="mt-1 relative">
                      <input
                        type="email"
                        value={invitation.email}
                        onChange={(e) => updateInvitation(index, 'email', e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="doctor@hospital.com"
                      />
                      <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                    {errors[index]?.email && (
                      <p className="mt-1 text-sm text-red-600">{errors[index].email}</p>
                    )}
                  </div>

                  {/* First Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={invitation.firstName}
                      onChange={(e) => updateInvitation(index, 'firstName', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="John"
                    />
                    {errors[index]?.firstName && (
                      <p className="mt-1 text-sm text-red-600">{errors[index].firstName}</p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={invitation.lastName}
                      onChange={(e) => updateInvitation(index, 'lastName', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Doe"
                    />
                    {errors[index]?.lastName && (
                      <p className="mt-1 text-sm text-red-600">{errors[index].lastName}</p>
                    )}
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Role *
                    </label>
                    <select
                      value={invitation.role}
                      onChange={(e) => updateInvitation(index, 'role', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {roles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Department *
                    </label>
                    <select
                      value={invitation.department}
                      onChange={(e) => updateInvitation(index, 'department', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select department</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                    {errors[index]?.department && (
                      <p className="mt-1 text-sm text-red-600">{errors[index].department}</p>
                    )}
                  </div>

                  {/* Medical Specialty */}
                  {['clinician', 'admin'].includes(invitation.role) && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Medical Specialty
                      </label>
                      <select
                        value={invitation.specialty || ''}
                        onChange={(e) => updateInvitation(index, 'specialty', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select specialty</option>
                        {specialties.map((specialty) => (
                          <option key={specialty} value={specialty}>
                            {specialty}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Custom Message */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Custom Message (Optional)
                    </label>
                    <textarea
                      value={invitation.customMessage || ''}
                      onChange={(e) => updateInvitation(index, 'customMessage', e.target.value)}
                      rows={3}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Welcome to our healthcare team! Please check your email for setup instructions."
                    />
                  </div>
                </div>

                {/* Role Description */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 text-blue-600 mr-2" />
                    <p className="text-sm text-blue-700">
                      <strong>{roles.find(r => r.value === invitation.role)?.label}:</strong>{' '}
                      {roles.find(r => r.value === invitation.role)?.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-gray-400 mr-2" />
              <p className="text-sm text-gray-600">
                Invitations will expire in 7 days if not accepted
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {submitStatus === 'error' && (
                <div className="flex items-center text-red-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span className="text-sm">Failed to send invitations</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Sending Invitations...' : `Send ${invitations.length} Invitation${invitations.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Information Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <Users className="h-6 w-6 text-blue-600 mr-3 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-2">What happens next?</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Invited users will receive an email with setup instructions</li>
              <li>• They'll be asked to create a secure password and verify their email</li>
              <li>• Two-factor authentication setup will be required for all clinical roles</li>
              <li>• Users will have access to features based on their assigned role</li>
              <li>• You can track invitation status in the user management dashboard</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}