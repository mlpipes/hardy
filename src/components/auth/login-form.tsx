/**
 * Hardy Auth Service - Login Form Component
 * Healthcare-themed authentication form with 2FA support
 */

'use client';

import React, { useState } from 'react';
import { useAuth } from './auth-provider';
import { Eye, EyeOff, Lock, Mail, Shield, Building2 } from 'lucide-react';

interface LoginFormProps {
  redirectTo?: string;
  organizationSlug?: string;
}

export function LoginForm({ redirectTo = '/dashboard', organizationSlug }: LoginFormProps) {
  const { signIn, verifyTwoFactor, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [twoFactorData, setTwoFactorData] = useState({
    code: '',
    userId: '',
    type: 'totp' as 'totp' | 'sms',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
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

  const handleTwoFactorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTwoFactorData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await signIn(formData.email, formData.password);

      if (result.requiresTwoFactor && result.userId) {
        setTwoFactorData(prev => ({ ...prev, userId: result.userId! }));
        setShowTwoFactor(true);
      } else {
        // Successful login, redirect
        if (typeof window !== 'undefined') {
          window.location.href = redirectTo;
        }
      }
    } catch (error: any) {
      setErrors({
        submit: error.message || 'Invalid email or password'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      await verifyTwoFactor(twoFactorData.userId, twoFactorData.code, twoFactorData.type);

      // Successful 2FA, redirect
      if (typeof window !== 'undefined') {
        window.location.href = redirectTo;
      }
    } catch (error: any) {
      setErrors({
        twoFactor: error.message || 'Invalid verification code'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showTwoFactor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Two-Factor Authentication</h2>
              <p className="mt-2 text-sm text-gray-600">
                Enter the verification code from your authenticator app
              </p>
            </div>

            {/* 2FA Form */}
            <form onSubmit={handleTwoFactorSubmit} className="space-y-6">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                  Verification Code
                </label>
                <div className="mt-1 relative">
                  <input
                    id="code"
                    name="code"
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={twoFactorData.code}
                    onChange={handleTwoFactorChange}
                    className="block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl font-mono tracking-widest"
                    required
                  />
                </div>
                {errors.twoFactor && (
                  <p className="mt-2 text-sm text-red-600">{errors.twoFactor}</p>
                )}
              </div>

              {/* Toggle between TOTP and SMS */}
              <div className="flex items-center justify-center space-x-4">
                <button
                  type="button"
                  onClick={() => setTwoFactorData(prev => ({ ...prev, type: 'totp' }))}
                  className={`px-4 py-2 text-sm font-medium rounded-lg ${
                    twoFactorData.type === 'totp'
                      ? 'bg-blue-100 text-blue-700 border-blue-200'
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                  } border`}
                >
                  Authenticator App
                </button>
                <button
                  type="button"
                  onClick={() => setTwoFactorData(prev => ({ ...prev, type: 'sms' }))}
                  className={`px-4 py-2 text-sm font-medium rounded-lg ${
                    twoFactorData.type === 'sms'
                      ? 'bg-blue-100 text-blue-700 border-blue-200'
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                  } border`}
                >
                  SMS Code
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !twoFactorData.code}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Verifying...' : 'Verify Code'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowTwoFactor(false)}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  ← Back to login
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Hardy Auth</h2>
            <p className="mt-2 text-sm text-gray-600">
              {organizationSlug
                ? `Sign in to ${organizationSlug}`
                : 'Sign in to your healthcare account'
              }
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="doctor@hospital.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your secure password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>

            {/* Footer Links */}
            <div className="flex items-center justify-between text-sm">
              <a href="/auth/forgot-password" className="text-blue-600 hover:text-blue-500">
                Forgot password?
              </a>
              <a href="/auth/signup" className="text-blue-600 hover:text-blue-500">
                Create account
              </a>
            </div>
          </form>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <Shield className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-xs text-green-700">
                HIPAA compliant • SOC 2 Type II certified • End-to-end encrypted
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}