/**
 * Two-Factor Authentication Verification API
 * Verifies TOTP code and enables 2FA
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { verifyTotpCode } from '@/lib/two-factor-utils';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    // Get the current session using Better Auth
    const session = await auth.api.getSession({
      headers: req.headers
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { code, secret } = await req.json();

    if (!code || !secret) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the TOTP code
    const isValid = verifyTotpCode(secret, code);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Enable 2FA in database
    try {
      // Update user to enable 2FA
      await prisma.user.update({
        where: { id: session.user.id },
        data: { twoFactorEnabled: true }
      });

      // Store the secret (you may want to encrypt this in production)
      // For now, we'll store it in a separate table or as part of user metadata
      // This depends on your security requirements

      console.log(`2FA enabled for user ${session.user.id}`);

      return NextResponse.json({
        success: true,
        message: 'Two-factor authentication has been enabled successfully'
      });

    } catch (error) {
      console.error('Failed to enable 2FA:', error);
      return NextResponse.json(
        { error: 'Failed to enable two-factor authentication' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify two-factor authentication' },
      { status: 500 }
    );
  }
}