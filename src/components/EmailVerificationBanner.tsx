'use client';

import { useState } from 'react';
import { Mail, X, CheckCircle, AlertTriangle } from 'lucide-react';

interface EmailVerificationBannerProps {
  userEmail: string;
  emailVerified: boolean;
  onDismiss?: () => void;
}

export function EmailVerificationBanner({
  userEmail,
  emailVerified,
  onDismiss
}: EmailVerificationBannerProps) {
  const [isVisible, setIsVisible] = useState(!emailVerified);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  if (!isVisible || emailVerified) {
    return null;
  }

  const handleSendVerification = async () => {
    setSending(true);
    setError('');

    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setSent(true);
        // Show development URL if available
        if (data.data.verificationUrl) {
          console.log('🔗 Verification URL:', data.data.verificationUrl);
          alert(`Development Mode: Check console for verification URL or copy this link:\n\n${data.data.verificationUrl}`);
        }
      } else {
        setError(data.error?.message || 'Failed to send verification email');
      }
    } catch (error) {
      console.error('Send verification error:', error);
      setError('An unexpected error occurred');
    } finally {
      setSending(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Email Verification Required
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Please verify your email address ({userEmail}) to secure your account and
                  access all features.
                </p>
              </div>
              {error && (
                <div className="mt-2 text-sm text-red-600">
                  {error}
                </div>
              )}
              {sent && (
                <div className="mt-2 flex items-center text-sm text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Verification email sent! Check your inbox and console (dev mode).
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSendVerification}
                disabled={sending || sent}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-800 mr-1"></div>
                    Sending...
                  </>
                ) : sent ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Sent
                  </>
                ) : (
                  <>
                    <Mail className="h-3 w-3 mr-1" />
                    Send Verification
                  </>
                )}
              </button>
              <button
                onClick={handleDismiss}
                className="inline-flex items-center p-1 border border-transparent rounded text-yellow-400 hover:text-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}