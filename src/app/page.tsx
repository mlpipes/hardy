'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/better-auth-client';

export default function Home() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clear form data on component mount and unmount for security
  useEffect(() => {
    // Force clear any browser-stored values on mount
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;

    if (emailInput) {
      emailInput.value = '';
      emailInput.removeAttribute('value');
    }
    if (passwordInput) {
      passwordInput.value = '';
      passwordInput.removeAttribute('value');
    }

    // Clear form state
    setFormData({ email: '', password: '' });

    return () => {
      setFormData({ email: '', password: '' });
    };
  }, []);

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

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Sign in with Better Auth
      const result = await authClient.signIn.email({
        email: formData.email,
        password: formData.password,
      });

      if (result.data) {
        console.log('Login successful:', result.data);
        // Clear form data for security
        setFormData({ email: '', password: '' });

        // Check if user has 2FA enabled - Better Auth returns twoFactorRedirect
        if (result.data.twoFactorRedirect || result.data.twoFactorRequired) {
          // Redirect to 2FA verification page
          router.push('/verify-2fa');
        } else {
          // Redirect to dashboard
          router.push('/dashboard');
        }
      } else if (result.error) {
        // Clear password on failed login for security
        setFormData(prev => ({ ...prev, password: '' }));

        // Check if this is a 2FA required error
        if (result.error.code === 'TWO_FACTOR_REQUIRED') {
          // Redirect to 2FA verification
          router.push('/verify-2fa');
        } else {
          setErrors({
            password: result.error.message || 'Invalid email or password'
          });
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      // Clear password on error for security
      setFormData(prev => ({ ...prev, password: '' }));
      setErrors({
        password: error.message || 'An error occurred during login'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">Hardy Auth</h1>
            <p className="text-sm text-gray-600">Healthcare Authentication Service</p>
          </div>

          <div className="flex justify-center gap-4 text-xs text-gray-500">
            <span className="px-2 py-1 bg-green-50 text-green-700 rounded">HIPAA Compliant</span>
            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">SOC 2 Ready</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate autoComplete="off">
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
                data-lpignore="true"
                data-form-type="other"
                value={formData.email}
                onChange={handleInputChange}
                onFocus={(e) => {
                  // Force clear on focus
                  if (e.target.value !== formData.email) {
                    e.target.value = formData.email;
                  }
                }}
                className={`block w-full px-3 py-2 border ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="Enter your email address"
                required
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

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
                data-lpignore="true"
                data-form-type="other"
                value={formData.password}
                onChange={handleInputChange}
                onFocus={(e) => {
                  // Force clear on focus
                  if (e.target.value !== formData.password) {
                    e.target.value = formData.password;
                  }
                }}
                className={`block w-full px-3 py-2 border ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="Enter your password"
                required
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Remove "Remember me" checkbox for healthcare security */}
            <div className="flex items-center justify-center">
              <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-500">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="text-center text-sm text-gray-600">
            <p>
              Don't have an account?{' '}
              <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
                Create account
              </Link>
            </p>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Quick Start</span>
            </div>
          </div>

          {/* Instructions */}
          <div className="text-center text-xs text-gray-600 space-y-2 bg-gray-50 p-4 rounded-lg">
            <p className="font-semibold">To get started:</p>
            <ol className="text-left space-y-1">
              <li>1. Click "Create account" above</li>
              <li>2. Fill in your information</li>
              <li>3. Sign in with your new credentials</li>
            </ol>
            <p className="mt-2 text-gray-500 italic">
              Note: Previous seed data won't work with Better Auth
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Security Notice:</strong> This system contains PHI. Unauthorized access is prohibited and monitored.
          </p>
        </div>
      </div>
    </div>
  );
}