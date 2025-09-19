/**
 * Hardy Auth Service - Email Verification Component
 * Email verification flow with resend functionality
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { trpc } from '../../lib/auth-client';
import { CheckCircle, AlertCircle, Mail, RefreshCw, Clock } from 'lucide-react';

interface EmailVerificationProps {
  token?: string;
}

export function EmailVerification({ token }: EmailVerificationProps) {
  const searchParams = useSearchParams();
  const verificationToken = token || searchParams?.get('token');

  const [verificationState, setVerificationState] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Verify email token on component mount
  useEffect(() => {
    if (verificationToken) {
      verifyEmail(verificationToken);
    } else {
      setVerificationState('error');
      setErrorMessage('No verification token provided');
    }
  }, [verificationToken]);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const verifyEmail = async (token: string) => {
    try {
      setVerificationState('loading');
      await trpc.auth.verifyEmail.mutate({ token });
      setVerificationState('success');
    } catch (error: any) {
      console.error('Email verification failed:', error);

      if (error.message?.includes('expired') || error.message?.includes('invalid')) {
        setVerificationState('expired');
        setErrorMessage('This verification link has expired or is invalid.');
      } else {
        setVerificationState('error');
        setErrorMessage(error.message || 'Email verification failed');
      }
    }
  };

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resendEmail || countdown > 0) return;

    setIsResending(true);
    setResendSuccess(false);

    try {
      await trpc.auth.resendVerification.mutate({ email: resendEmail });
      setResendSuccess(true);
      setCountdown(60); // 60 second cooldown
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  // Loading state
  if (verificationState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
              <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Verifying Your Email</h2>
            <p className="text-gray-600">
              Please wait while we verify your email address...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (verificationState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Email Verified!</h2>
            <p className="text-gray-600 mb-6">
              Your email address has been successfully verified. You can now sign in to your Hardy Auth account.
            </p>
            <div className="space-y-4">
              <a
                href="/auth/signin"
                className="w-full inline-flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Continue to Sign In
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error/Expired state with resend option
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Error Header */}
          <div className="text-center mb-6">
            <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {verificationState === 'expired' ? 'Link Expired' : 'Verification Failed'}
            </h2>
            <p className="mt-2 text-gray-600">{errorMessage}</p>
          </div>

          {/* Resend Form */}
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center mb-2">
                <Mail className="h-5 w-5 text-blue-600 mr-2" />
                <p className="text-sm font-medium text-blue-800">Need a new verification link?</p>
              </div>
              <p className="text-sm text-blue-700">
                Enter your email address and we'll send you a new verification link.
              </p>
            </div>

            <form onSubmit={handleResendVerification}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="resendEmail" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <div className="mt-1">
                    <input
                      id="resendEmail"
                      name="resendEmail"
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      className="block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your email address"
                      required
                    />
                  </div>
                </div>

                {resendSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      <p className="text-sm text-green-700">
                        Verification email sent! Check your inbox.
                      </p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isResending || countdown > 0 || !resendEmail}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : countdown > 0 ? (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Resend in {countdown}s
                    </>
                  ) : (
                    'Send New Verification Email'
                  )}
                </button>
              </div>
            </form>

            {/* Alternative Actions */}
            <div className="border-t pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="/auth/signin"
                  className="flex-1 text-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Back to Sign In
                </a>
                <a
                  href="/auth/signup"
                  className="flex-1 text-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Create New Account
                </a>
              </div>
            </div>

            {/* Support Contact */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Still having trouble?{' '}
                <a href="mailto:support@mlpipes.ai" className="text-blue-600 hover:text-blue-500">
                  Contact Support
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}