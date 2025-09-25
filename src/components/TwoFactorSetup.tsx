/**
 * Two-Factor Authentication Setup Component
 * TOTP setup with QR code and backup codes
 */

'use client';

import { useState, useEffect } from 'react';
import { QrCode, Smartphone, Shield, AlertTriangle, CheckCircle, Copy, Eye, EyeOff, MessageSquare } from 'lucide-react';
import { authClient } from '@/lib/better-auth-client';

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
  totpUri: string;
}

export function TwoFactorSetup({ user }: TwoFactorSetupProps) {
  const [isEnabled, setIsEnabled] = useState(user.twoFactorEnabled || false);
  const [isLoading, setIsLoading] = useState(false);
  const [setupData, setSetupData] = useState<TotpSetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');
  const [setupMethod, setSetupMethod] = useState<'totp' | 'sms'>('totp');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsStep, setSmsStep] = useState<'phone' | 'verify'>('phone');

  // Check current 2FA status
  useEffect(() => {
    checkTwoFactorStatus();
  }, []);

  const checkTwoFactorStatus = async () => {
    try {
      // Use our custom status endpoint since it works with our schema
      const response = await fetch('/api/auth/two-factor/status');
      if (response.ok) {
        const data = await response.json();
        setIsEnabled(data.enabled);
      } else {
        // Fallback: check session data
        const session = await authClient.getSession();
        if (session.data?.user) {
          setIsEnabled(session.data.user.twoFactorEnabled || false);
        }
      }
    } catch (error) {
      console.error('Failed to check 2FA status:', error);
    }
  };

  const startTwoFactorSetup = () => {
    setShowPasswordPrompt(true);
    setError('');
  };

  const confirmSetupWithPassword = async () => {
    if (!password) {
      setError('Please enter your current password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Use Better Auth's built-in 2FA enable method
      const result = await authClient.twoFactor.enable({
        password: password
      });

      if (result.data) {
        // Log the actual response to see what Better Auth returns
        console.log('Better Auth 2FA enable response:', result.data);
        console.log('Response keys:', Object.keys(result.data));

        // Better Auth typically returns: { secret, qrCode, backupCodes, uri }
        // Handle different possible property names from Better Auth
        const responseData = result.data;

        // Better Auth returns: { totpURI, backupCodes }
        const totpUri = responseData.totpURI || responseData.totpUri || responseData.uri || '';
        const backupCodes = responseData.backupCodes || responseData.recoveryCodes || responseData.codes || [];

        // Extract secret from TOTP URI (otpauth://totp/...?secret=SECRET&...)
        let secret = '';
        if (totpUri) {
          const secretMatch = totpUri.match(/secret=([A-Z2-7]+)/i);
          if (secretMatch) {
            secret = secretMatch[1];
          }
        }

        // Generate QR code data URL from TOTP URI
        const qrCode = totpUri ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpUri)}` : '';

        console.log('Extracted values:', { secret, qrCode, backupCodes, totpUri });

        if (!secret) {
          throw new Error('No secret found in TOTP URI from Better Auth');
        }

        if (!totpUri) {
          throw new Error('No TOTP URI received from Better Auth');
        }

        setSetupData({
          secret,
          qrCode,
          backupCodes,
          totpUri
        });
        setShowPasswordPrompt(false);
        setPassword('');
      } else if (result.error) {
        throw new Error(result.error.message || 'Failed to setup 2FA');
      }
    } catch (error) {
      setError('Failed to initialize 2FA setup. Please check your password and try again.');
      console.error('2FA setup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelPasswordPrompt = () => {
    setShowPasswordPrompt(false);
    setPassword('');
    setError('');
  };

  const verifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Use Better Auth's built-in TOTP verification
      const result = await authClient.twoFactor.verifyTotp({
        code: verificationCode
      });

      if (result.data) {
        setIsEnabled(true);
        setSuccess('Two-factor authentication has been successfully enabled!');
        setSetupData(null);
        setVerificationCode('');
        // Refresh the 2FA status
        await checkTwoFactorStatus();
      } else if (result.error) {
        throw new Error(result.error.message || 'Verification failed');
      }
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

    const currentPassword = prompt('Please enter your current password to disable 2FA:');
    if (!currentPassword) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Use Better Auth's built-in 2FA disable method
      const result = await authClient.twoFactor.disable({
        password: currentPassword
      });

      if (result.data) {
        setIsEnabled(false);
        setSuccess('Two-factor authentication has been disabled.');
        await checkTwoFactorStatus();
      } else if (result.error) {
        throw new Error(result.error.message || 'Failed to disable 2FA');
      }
    } catch (error) {
      setError('Failed to disable 2FA. Please check your password and try again.');
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

      {/* Password Prompt Modal */}
      {showPasswordPrompt && (
        <div className="border border-gray-200 rounded-lg p-6 space-y-4 bg-blue-50">
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Confirm Your Password</h4>
            <p className="text-sm text-gray-600">
              To enable two-factor authentication, please enter your current password for security verification.
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); confirmSetupWithPassword(); }}>
            <div>
              <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                id="current-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your current password"
                autoFocus
                autoComplete="current-password"
              />
            </div>

            <div className="flex space-x-3 mt-4">
              <button
                type="button"
                onClick={cancelPasswordPrompt}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !password}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {isLoading ? 'Setting up...' : 'Continue'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Method Selection (after password confirmed, before setup) */}
      {showPasswordPrompt === false && password && !setupData && !isEnabled && (
        <div className="border border-gray-200 rounded-lg p-6 space-y-4">
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Choose Your 2FA Method</h4>
            <p className="text-sm text-gray-600">
              Select how you'd like to receive your two-factor authentication codes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setSetupMethod('totp')}
              className={`p-4 border rounded-lg text-left transition-colors ${
                setupMethod === 'totp'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center mb-2">
                <Smartphone className="h-5 w-5 mr-3" />
                <span className="font-medium">Authenticator App</span>
              </div>
              <p className="text-sm text-gray-600">
                Use Google Authenticator, Authy, or other TOTP apps. More secure and works offline.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSetupMethod('sms')}
              className={`p-4 border rounded-lg text-left transition-colors ${
                setupMethod === 'sms'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center mb-2">
                <MessageSquare className="h-5 w-5 mr-3" />
                <span className="font-medium">SMS Text Message</span>
              </div>
              <p className="text-sm text-gray-600">
                Receive codes via text message. Requires a phone number.
              </p>
            </button>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => {
                setPassword('');
                setShowPasswordPrompt(false);
              }}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (setupMethod === 'totp') {
                  confirmSetupWithPassword();
                } else {
                  setSmsStep('phone');
                }
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* SMS Phone Number Setup */}
      {setupMethod === 'sms' && smsStep === 'phone' && !isEnabled && (
        <div className="border border-gray-200 rounded-lg p-6 space-y-4">
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Enter Your Phone Number</h4>
            <p className="text-sm text-gray-600">
              We'll send verification codes to this phone number.
            </p>
          </div>

          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="+1234567890"
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter in international format (e.g., +1234567890)
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => {
                setSetupMethod('totp');
                setSmsStep('phone');
                setPhoneNumber('');
              }}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!phoneNumber || !/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
                  setError('Please enter a valid phone number in international format');
                  return;
                }

                setIsLoading(true);
                setError('');

                try {
                  // Set phone number first
                  const phoneResult = await authClient.phoneNumber.setPhoneNumber({
                    phoneNumber: phoneNumber
                  });

                  if (phoneResult.data) {
                    // Send SMS code
                    const smsResult = await authClient.twoFactor.sendSms();
                    if (smsResult.data) {
                      setSmsStep('verify');
                      setSuccess('SMS code sent! Check your phone.');
                    } else {
                      setError(smsResult.error?.message || 'Failed to send SMS code');
                    }
                  } else {
                    setError(phoneResult.error?.message || 'Failed to set phone number');
                  }
                } catch (error: any) {
                  setError(error.message || 'Failed to setup SMS 2FA');
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading || !phoneNumber}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {isLoading ? 'Sending...' : 'Send SMS Code'}
            </button>
          </div>
        </div>
      )}

      {/* SMS Verification */}
      {setupMethod === 'sms' && smsStep === 'verify' && !isEnabled && (
        <div className="border border-gray-200 rounded-lg p-6 space-y-4">
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Verify SMS Code</h4>
            <p className="text-sm text-gray-600">
              Enter the 6-digit code we sent to {phoneNumber}
            </p>
          </div>

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
              onClick={async () => {
                if (!verificationCode || verificationCode.length !== 6) {
                  setError('Please enter a valid 6-digit code');
                  return;
                }

                setIsLoading(true);
                setError('');

                try {
                  const result = await authClient.twoFactor.verifySms({
                    code: verificationCode
                  });

                  if (result.data) {
                    setIsEnabled(true);
                    setSuccess('SMS two-factor authentication has been enabled!');
                    setSmsStep('phone');
                    setVerificationCode('');
                    setPhoneNumber('');
                    setPassword('');
                    await checkTwoFactorStatus();
                  } else {
                    setError(result.error?.message || 'Invalid verification code');
                  }
                } catch (error: any) {
                  setError(error.message || 'Verification failed');
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading || verificationCode.length !== 6}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {isLoading ? 'Verifying...' : 'Verify & Enable'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSmsStep('phone')}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            ← Change phone number
          </button>
        </div>
      )}

      {/* Setup Process (TOTP) */}
      {setupData && setupMethod === 'totp' && (
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
              <p>You'll need to enter a verification code when signing in. You can use either your authenticator app or request an SMS code.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}