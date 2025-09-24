/**
 * Reset Password Page
 * Handles password reset with token validation
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, CheckCircle, AlertTriangle, Eye, EyeOff, X, Check } from 'lucide-react';
import { authClient } from '@/lib/better-auth-client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [token, setToken] = useState('');

  useEffect(() => {
    // Get token from URL parameters
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      setErrors({ token: 'Invalid or missing reset token. Please request a new password reset.' });
    } else {
      setToken(tokenParam);
    }
  }, [searchParams]);

  const getPasswordRequirements = (password: string) => {
    return {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      noCommonWords: !/(?:password|qwerty|123456|admin|doctor|nurse|medical|health|patient|hospital|clinic)/i.test(password)
    };
  };

  const validatePassword = (password: string): string => {
    const requirements = getPasswordRequirements(password);

    if (!requirements.length) {
      return 'Password must be at least 12 characters long';
    }
    if (!requirements.uppercase) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!requirements.lowercase) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!requirements.number) {
      return 'Password must contain at least one number';
    }
    if (!requirements.special) {
      return 'Password must contain at least one special character';
    }
    if (!requirements.noCommonWords) {
      return 'Password cannot contain common words or patterns';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setErrors({});

    // Validate token
    if (!token) {
      setErrors({ token: 'Invalid or missing reset token. Please request a new password reset.' });
      return;
    }

    // Validate passwords
    const passwordError = validatePassword(password);
    if (passwordError) {
      setErrors({ password: passwordError });
      return;
    }

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Use our custom secure reset password endpoint
      const response = await fetch('/api/auth/secure-reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          newPassword: password,
        }),
      });

      const result = await response.json();

      console.log('Password reset result:', result);

      if (response.ok && result.success) {
        console.log('Password reset successful');
        setIsSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        console.error('Password reset error:', result);
        setErrors({
          submit: result.error || 'Failed to reset password. The link may have expired.'
        });
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      setErrors({
        submit: error.message || 'Failed to reset password. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white rounded-xl shadow-lg p-8">
          <div className="text-center">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Password Reset Successful!
            </h2>
            <p className="mt-4 text-sm text-gray-600">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Redirecting to sign in page...
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center justify-center w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white rounded-xl shadow-lg p-8">
        <div>
          <div className="flex justify-center">
            <Lock className="h-12 w-12 text-blue-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please enter your new password below
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {errors.token && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
                <p className="text-sm text-red-800">{errors.token}</p>
              </div>
            </div>
          )}

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
                <p className="text-sm text-red-800">{errors.submit}</p>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <div className="mt-1 relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-3 pr-10 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10"
                placeholder="Enter new password"
                disabled={!token}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <div className="mt-1 relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-3 pr-10 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10"
                placeholder="Confirm new password"
                disabled={!token}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">Password Requirements:</p>
            <ul className="text-xs space-y-1">
              {(() => {
                const requirements = getPasswordRequirements(password);
                return (
                  <>
                    <li className={`flex items-center ${requirements.length ? 'text-green-700' : 'text-blue-700'}`}>
                      {requirements.length ? (
                        <Check className="h-3 w-3 mr-2" />
                      ) : (
                        <X className="h-3 w-3 mr-2" />
                      )}
                      At least 12 characters long
                    </li>
                    <li className={`flex items-center ${requirements.uppercase ? 'text-green-700' : 'text-blue-700'}`}>
                      {requirements.uppercase ? (
                        <Check className="h-3 w-3 mr-2" />
                      ) : (
                        <X className="h-3 w-3 mr-2" />
                      )}
                      Contains uppercase letters
                    </li>
                    <li className={`flex items-center ${requirements.lowercase ? 'text-green-700' : 'text-blue-700'}`}>
                      {requirements.lowercase ? (
                        <Check className="h-3 w-3 mr-2" />
                      ) : (
                        <X className="h-3 w-3 mr-2" />
                      )}
                      Contains lowercase letters
                    </li>
                    <li className={`flex items-center ${requirements.number ? 'text-green-700' : 'text-blue-700'}`}>
                      {requirements.number ? (
                        <Check className="h-3 w-3 mr-2" />
                      ) : (
                        <X className="h-3 w-3 mr-2" />
                      )}
                      Contains numbers
                    </li>
                    <li className={`flex items-center ${requirements.special ? 'text-green-700' : 'text-blue-700'}`}>
                      {requirements.special ? (
                        <Check className="h-3 w-3 mr-2" />
                      ) : (
                        <X className="h-3 w-3 mr-2" />
                      )}
                      Contains special characters (!@#$%^&*)
                    </li>
                    <li className={`flex items-center ${requirements.noCommonWords ? 'text-green-700' : 'text-blue-700'}`}>
                      {requirements.noCommonWords ? (
                        <Check className="h-3 w-3 mr-2" />
                      ) : (
                        <X className="h-3 w-3 mr-2" />
                      )}
                      No common words or patterns
                    </li>
                    <li className="flex items-center text-red-600 font-medium">
                      <X className="h-3 w-3 mr-2" />
                      Must be different from your current password
                    </li>
                    <li className="flex items-center text-red-600 font-medium">
                      <X className="h-3 w-3 mr-2" />
                      Cannot reuse recent passwords
                    </li>
                  </>
                );
              })()}
            </ul>
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={isSubmitting || !token}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
            </button>

            <Link
              href="/"
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Back to Sign In
            </Link>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Link expired?{' '}
              <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                Request a new reset link
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}