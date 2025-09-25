'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/better-auth-client';

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '', // Optional phone number for SMS 2FA
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const newErrors: Record<string, string> = {};

    if (!formData.firstName) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 12) {
      newErrors.password = 'Password must be at least 12 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Optional phone number validation
    if (formData.phoneNumber && !/^\+[1-9]\d{1,14}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid phone number in international format (e.g., +1234567890)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Sign up with Better Auth
      const result = await authClient.signUp.email({
        email: formData.email,
        password: formData.password,
        name: `${formData.firstName} ${formData.lastName}`,
      });

      if (result.data) {
        console.log('Sign-up successful:', result.data);

        // If phone number was provided, add it to the user's account
        if (formData.phoneNumber) {
          try {
            const phoneResult = await authClient.phoneNumber.setPhoneNumber({
              phoneNumber: formData.phoneNumber
            });

            if (phoneResult.data) {
              console.log('Phone number added successfully');
            } else {
              console.warn('Failed to add phone number:', phoneResult.error);
            }
          } catch (phoneError) {
            console.warn('Error adding phone number:', phoneError);
            // Don't fail the signup for phone number issues
          }
        }

        // Redirect to dashboard directly (session is already created)
        router.push('/dashboard');
      } else if (result.error) {
        console.error('Sign-up error:', result.error);
        setErrors({
          email: result.error.message || 'Sign-up failed'
        });
      }
    } catch (error: any) {
      console.error('Sign-up error:', error);
      setErrors({
        email: error.message || 'An error occurred during sign-up'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
            <p className="text-sm text-gray-600">Join Hardy Auth Healthcare System</p>
          </div>

          {/* Security Badges */}
          <div className="flex justify-center gap-4 text-xs text-gray-500">
            <span className="px-2 py-1 bg-green-50 text-green-700 rounded">HIPAA Compliant</span>
            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">SOC 2 Ready</span>
          </div>

          {/* Sign-up Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate autoComplete="off">
            <div className="grid grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="words"
                  autoCorrect="off"
                  spellCheck="false"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border ${
                    errors.firstName ? 'border-red-300' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="John"
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="words"
                  autoCorrect="off"
                  spellCheck="false"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border ${
                    errors.lastName ? 'border-red-300' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="Doe"
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
                value={formData.email}
                onChange={handleInputChange}
                className={`block w-full px-3 py-2 border ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="doctor@hospital.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
                value={formData.password}
                onChange={handleInputChange}
                className={`block w-full px-3 py-2 border ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="Minimum 12 characters"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Must be at least 12 characters for HIPAA compliance
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`block w-full px-3 py-2 border ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="Re-enter your password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Phone Number (Optional) */}
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className={`block w-full px-3 py-2 border ${
                  errors.phoneNumber ? 'border-red-300' : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="+1234567890"
              />
              {errors.phoneNumber && (
                <p className="mt-1 text-xs text-red-600">{errors.phoneNumber}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Required for SMS two-factor authentication (recommended for healthcare security)
              </p>
            </div>

            {/* Terms Agreement */}
            <div className="text-xs text-gray-600">
              By creating an account, you agree to our{' '}
              <a href="#" className="text-blue-600 hover:text-blue-500">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-blue-600 hover:text-blue-500">Privacy Policy</a>,
              including HIPAA compliance requirements.
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center text-sm text-gray-600">
            <p>
              Already have an account?{' '}
              <Link href="/" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Security Notice:</strong> This system is for authorized healthcare personnel only. All activities are monitored and logged.
          </p>
        </div>
      </div>
    </div>
  );
}