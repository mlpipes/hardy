/**
 * Two-Factor Authentication Setup API
 * Generates TOTP secret and QR code using Better Auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import QRCode from 'qrcode';
import { generateSecret, generateBackupCodes } from '@/lib/two-factor-utils';

export async function POST(req: NextRequest) {
  try {
    // Get the current session
    const session = await auth.api.getSession({
      headers: req.headers
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = session.user;

    // Generate TOTP secret
    const secret = generateSecret();

    // Generate TOTP URL for QR code
    const issuer = 'Hardy Auth';
    const accountName = `${issuer}:${user.email}`;
    const totpUrl = `otpauth://totp/${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(totpUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 200
    });

    // Generate backup codes
    const backupCodes = generateBackupCodes();

    // Store the secret temporarily (in a real implementation, this would be stored securely)
    // For now, we'll return it and let the client handle verification

    return NextResponse.json({
      secret,
      qrCode: qrCodeDataUrl,
      backupCodes,
      setupUrl: totpUrl
    });

  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: 'Failed to setup two-factor authentication' },
      { status: 500 }
    );
  }
}