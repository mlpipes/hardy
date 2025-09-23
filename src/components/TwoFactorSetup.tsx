/**
 * Two-Factor Authentication Setup Component
 * TOTP setup with QR code and backup codes
 */

'use client';

import { useState, useEffect } from 'react';
import { QrCode, Smartphone, Shield, AlertTriangle, CheckCircle, Copy, Eye, EyeOff } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

interface User {
  id: string;
  email: string;
  name: string | null;
  twoFactorEnabled?: boolean;
}

interface TwoFactorSetupProps {
  user: User;
}

interface TotpSetupData {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export function TwoFactorSetup({ user }: TwoFactorSetupProps) {
  const [isEnabled, setIsEnabled] = useState(user.twoFactorEnabled || false);
  const [isLoading, setIsLoading] = useState(false);
  const [setupData, setSetupData] = useState<TotpSetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check current 2FA status
  useEffect(() => {
    checkTwoFactorStatus();
  }, []);

  const checkTwoFactorStatus = async () => {
    try {
      const response = await fetch('/api/auth/two-factor/status');
      if (response.ok) {
        const data = await response.json();
        setIsEnabled(data.enabled);
      }
    } catch (error) {
      console.error('Failed to check 2FA status:', error);
    }
  };

  const startTwoFactorSetup = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/two-factor/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to setup 2FA');
      }

      const data = await response.json();
      setSetupData(data);
    } catch (error) {
      setError('Failed to initialize 2FA setup. Please try again.');
      console.error('2FA setup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    if (!setupData) {
      setError('Setup data not available. Please restart the setup process.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/two-factor/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: verificationCode,
          secret: setupData.secret
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Verification failed');
      }

      setIsEnabled(true);
      setSuccess('Two-factor authentication has been successfully enabled!');
      setSetupData(null);
      setVerificationCode('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Invalid verification code. Please try again.');
      console.error('2FA verification error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const disableTwoFactor = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/two-factor/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to disable 2FA');
      }

      setIsEnabled(false);
      setSuccess('Two-factor authentication has been disabled.');
    } catch (error) {
      setError('Failed to disable 2FA. Please try again.');
      console.error('2FA disable error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 mr-3" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        </div>
      )}

      {/* Current Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-3 ${isEnabled ? 'bg-green-400' : 'bg-gray-300'}`} />
          <span className="text-sm font-medium">
            Two-Factor Authentication is {isEnabled ? 'enabled' : 'disabled'}
          </span>
        </div>

        {!isEnabled && !setupData && (
          <button
            onClick={startTwoFactorSetup}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
          >
            <Shield className="h-4 w-4 mr-2" />
            {isLoading ? 'Setting up...' : 'Enable 2FA'}
          </button>
        )}

        {isEnabled && (
          <button
            onClick={disableTwoFactor}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {isLoading ? 'Disabling...' : 'Disable 2FA'}
          </button>
        )}
      </div>

      {/* Setup Process */}
      {setupData && (
        <div className="border border-gray-200 rounded-lg p-6 space-y-6">
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Set up Two-Factor Authentication</h4>
            <p className="text-sm text-gray-600">
              Follow these steps to secure your account with TOTP authentication.
            </p>
          </div>

          {/* Step 1: Install App */}
          <div className="space-y-3">
            <h5 className="font-medium text-gray-900 flex items-center">
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full mr-3">1</span>
              Install an Authenticator App
            </h5>
            <p className="text-sm text-gray-600 ml-8">
              Download and install an authenticator app like Google Authenticator, Authy, or 1Password.
            </p>
          </div>

          {/* Step 2: Scan QR Code */}
          <div className="space-y-3">
            <h5 className="font-medium text-gray-900 flex items-center">
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full mr-3">2</span>
              Scan QR Code
            </h5>
            <div className="ml-8 space-y-4">
              <div className="flex items-start space-x-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4 flex-shrink-0">
                  <img
                    src={setupData.qrCode}
                    alt="2FA QR Code"
                    className="w-32 h-32"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-3">
                    Scan this QR code with your authenticator app, or manually enter the setup key:
                  </p>
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3 flex items-center justify-between">
                    <code className="text-sm font-mono text-gray-800">{setupData.secret}</code>
                    <button
                      onClick={() => copyToClipboard(setupData.secret)}
                      className="text-gray-500 hover:text-gray-700 ml-2"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Verify Code */}
          <div className="space-y-3">
            <h5 className="font-medium text-gray-900 flex items-center">
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full mr-3">3</span>
              Enter Verification Code
            </h5>
            <div className="ml-8 space-y-4">
              <p className="text-sm text-gray-600">
                Enter the 6-digit code from your authenticator app to complete setup.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono"
                  maxLength={6}
                />
                <button
                  onClick={verifyAndEnable}
                  disabled={isLoading || verificationCode.length !== 6}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Enable'}
                </button>
              </div>
            </div>
          </div>

          {/* Backup Codes */}
          <div className="space-y-3">
            <h5 className="font-medium text-gray-900 flex items-center">
              <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2 py-1 rounded-full mr-3">!</span>
              Backup Codes
            </h5>
            <div className="ml-8">
              <p className="text-sm text-gray-600 mb-3">
                Save these backup codes in a secure location. You can use them to access your account if you lose your authenticator device.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => setShowBackupCodes(!showBackupCodes)}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                >
                  {showBackupCodes ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-1" />
                      Hide backup codes
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-1" />
                      Show backup codes
                    </>
                  )}
                </button>

                {showBackupCodes && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {setupData.backupCodes.map((code, index) => (
                        <div key={index} className="bg-white border border-gray-200 rounded px-3 py-2 text-center">
                          <code className="text-sm font-mono">{code}</code>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => copyToClipboard(setupData.backupCodes.join('\n'))}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy All Backup Codes
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Information */}
      {isEnabled && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <Shield className="h-5 w-5 text-blue-400 mt-0.5 mr-3" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Your account is protected with 2FA</p>
              <p>You'll need to enter a code from your authenticator app when signing in.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}