/**
 * Two-Factor Authentication Verification Page
 * Handles 2FA code verification during login
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, ArrowLeft, AlertTriangle, Smartphone, MessageSquare } from 'lucide-react';
import { authClient } from '@/lib/better-auth-client';

export default function Verify2FAPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [method, setMethod] = useState<'totp' | 'sms'>('totp'); // Default to TOTP
  const [isSendingSMS, setIsSendingSMS] = useState(false);
  const [smsSuccess, setSmsSuccess] = useState('');

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

  const sendSMSCode = async () => {
    setIsSendingSMS(true);
    setError('');
    setSmsSuccess('');

    try {
      // Use Better Auth's SMS 2FA sending capability
      const result = await authClient.twoFactor.sendSms();

      if (result.data) {
        setSmsSuccess('SMS code sent successfully! Check your phone.');
      } else if (result.error) {
        setError(result.error.message || 'Failed to send SMS code');
      }
    } catch (error: any) {
      console.error('SMS send error:', error);
      setError('Failed to send SMS code. Please try again.');
    } finally {
      setIsSendingSMS(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Verify 2FA code with Better Auth based on selected method
      const result = method === 'sms'
        ? await authClient.twoFactor.verifySms({ code: code })
        : await authClient.twoFactor.verifyTotp({ code: code });

      console.log(`2FA ${method.toUpperCase()} verification result:`, result);

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
            {method === 'totp'
              ? 'Enter the 6-digit code from your authenticator app'
              : 'Enter the 6-digit code sent to your phone'
            }
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Method Selection */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMethod('totp')}
              className={`flex items-center justify-center px-4 py-3 border rounded-md text-sm font-medium transition-colors ${
                method === 'totp'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Authenticator App
            </button>
            <button
              type="button"
              onClick={() => setMethod('sms')}
              className={`flex items-center justify-center px-4 py-3 border rounded-md text-sm font-medium transition-colors ${
                method === 'sms'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              SMS Text
            </button>
          </div>

          {/* SMS Request Button */}
          {method === 'sms' && (
            <div className="text-center">
              <button
                type="button"
                onClick={sendSMSCode}
                disabled={isSendingSMS}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {isSendingSMS ? 'Sending...' : 'Send SMS Code'}
              </button>
            </div>
          )}

          {/* Success Messages */}
          {smsSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <MessageSquare className="h-5 w-5 text-green-400 mt-0.5 mr-3" />
                <p className="text-sm text-green-800">{smsSuccess}</p>
              </div>
            </div>
          )}

          {/* Error Messages */}
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
              {method === 'totp' ? "Can't access your authenticator app?" : "Didn't receive the SMS code?"}
            </p>
            <div className="flex justify-center space-x-4 mt-2">
              {method === 'totp' ? (
                <>
                  <button
                    type="button"
                    className="text-xs text-blue-600 hover:text-blue-500 font-medium"
                    onClick={() => setMethod('sms')}
                  >
                    Try SMS instead
                  </button>
                  <button
                    type="button"
                    className="text-xs text-blue-600 hover:text-blue-500 font-medium"
                    onClick={() => {
                      alert('Backup code verification coming soon');
                    }}
                  >
                    Use backup code
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="text-xs text-blue-600 hover:text-blue-500 font-medium"
                    onClick={sendSMSCode}
                    disabled={isSendingSMS}
                  >
                    {isSendingSMS ? 'Sending...' : 'Resend SMS'}
                  </button>
                  <button
                    type="button"
                    className="text-xs text-blue-600 hover:text-blue-500 font-medium"
                    onClick={() => setMethod('totp')}
                  >
                    Try authenticator app
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}