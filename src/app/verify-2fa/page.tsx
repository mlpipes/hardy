/**
 * Two-Factor Authentication Verification Page
 * Handles 2FA code verification during login
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, ArrowLeft, AlertTriangle } from 'lucide-react';
import { authClient } from '@/lib/better-auth-client';

export default function Verify2FAPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if we have a pending 2FA verification
  useEffect(() => {
    const checkSession = async () => {
      const session = await authClient.getSession();
      // If user is already fully authenticated, redirect to dashboard
      if (session.data && !session.data.user.requiresTwoFactor) {
        router.push('/dashboard');
      }
    };
    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Verify 2FA code with Better Auth
      const result = await authClient.twoFactor.verifyTotp({
        code: code,
      });

      console.log('2FA verification result:', result);

      if (result.data) {
        console.log('2FA verification successful');
        // Redirect to dashboard after successful 2FA
        router.push('/dashboard');
      } else if (result.error) {
        console.error('2FA verification error:', result.error);
        setError(result.error.message || 'Invalid verification code');
        setCode('');
      }
    } catch (error: any) {
      console.error('2FA verification error:', error);
      setError(error.message || 'Verification failed. Please try again.');
      setCode('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    // Sign out the partial session
    await authClient.signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white rounded-xl shadow-lg p-8">
        <div>
          <div className="flex justify-center">
            <Shield className="h-12 w-12 text-blue-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Two-Factor Authentication
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700">
              Verification Code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10"
              placeholder="000000"
              autoComplete="one-time-code"
              autoFocus
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || code.length !== 6}
              className="flex-1 flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Verifying...' : 'Verify'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Can't access your authenticator app?
            </p>
            <button
              type="button"
              className="text-xs text-blue-600 hover:text-blue-500 font-medium"
              onClick={() => {
                // TODO: Implement backup code verification
                alert('Backup code verification coming soon');
              }}
            >
              Use a backup code instead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}