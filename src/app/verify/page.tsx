'use client';

// Mark as dynamic route to prevent static generation
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/better-auth-client';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');
      const success = searchParams.get('success');

      // Handle direct success/error redirects from Better Auth
      if (success === 'true') {
        setStatus('success');
        setMessage('Your email has been verified successfully!');
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
        return;
      }

      if (error) {
        if (error === 'missing-token') {
          setStatus('error');
          setMessage('No verification token provided');
        } else if (error === 'verification-failed') {
          setStatus('error');
          setMessage('Email verification failed');
        } else if (error === 'server-error') {
          setStatus('error');
          setMessage('An error occurred during email verification');
        } else {
          setStatus('expired');
          setMessage('This verification link has expired. Please request a new verification email.');
        }
        return;
      }

      if (!token) {
        setStatus('error');
        setMessage('No verification token provided');
        return;
      }

      try {
        console.log('🔍 Verifying email with token:', token);

        // Use Better Auth client directly
        const result = await authClient.verifyEmail({
          token: token,
        });

        if (result.data) {
          console.log('✅ Email verification successful:', result.data);
          setStatus('success');
          setMessage('Your email has been verified successfully!');

          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            router.push('/dashboard');
          }, 3000);
        } else if (result.error) {
          console.error('❌ Email verification failed:', result.error);

          if (result.error.message?.includes('expired')) {
            setStatus('expired');
            setMessage('This verification link has expired. Please request a new verification email.');
          } else {
            setStatus('error');
            setMessage(result.error.message || 'Email verification failed');
          }
        }
      } catch (error: any) {
        console.error('❌ Email verification error:', error);
        setStatus('error');
        setMessage(error.message || 'An error occurred during email verification');
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  const handleResendVerification = async () => {
    try {
      // This would need the user's email - in a real app you might store this or ask for it
      const email = prompt('Please enter your email address to resend verification:');
      if (!email) return;

      await authClient.sendVerificationEmail({
        email: email,
        callbackURL: '/verify',
      });

      alert('A new verification email has been sent to your email address.');
    } catch (error) {
      console.error('Failed to resend verification email:', error);
      alert('Failed to resend verification email. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">Email Verification</h1>
            <p className="text-sm text-gray-600">Hardy Auth Healthcare System</p>
          </div>

          <div className="flex justify-center">
            {status === 'loading' && (
              <div className="flex flex-col items-center space-y-4">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-600">Verifying your email...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-900">Email Verified!</h3>
                  <p className="text-green-700">{message}</p>
                  <p className="text-sm text-gray-500 mt-2">Redirecting to dashboard in 3 seconds...</p>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-900">Verification Failed</h3>
                  <p className="text-red-700">{message}</p>
                </div>
              </div>
            )}

            {status === 'expired' && (
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-yellow-900">Link Expired</h3>
                  <p className="text-yellow-700">{message}</p>
                  <button
                    onClick={handleResendVerification}
                    className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Resend Verification Email
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="text-center space-y-2">
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-500">
              ← Back to Sign In
            </Link>

            {(status === 'error' || status === 'expired') && (
              <div className="pt-2">
                <button
                  onClick={handleResendVerification}
                  className="text-sm text-blue-600 hover:text-blue-500 underline"
                >
                  Resend verification email
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Security Notice:</strong> Email verification is required for all healthcare system access.
          </p>
        </div>
      </div>
    </div>
  );
}