/**
 * Two-Factor Authentication Status API
 * Get current 2FA status for the user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
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

    // Check 2FA status using Better Auth
    try {
      // Note: This would use the Better Auth twoFactor plugin
      // const twoFactorStatus = await auth.api.twoFactor.getStatus({
      //   userId: session.user.id
      // });

      // For now, we'll mock the status based on user data
      const twoFactorEnabled = false; // This would come from the database

      return NextResponse.json({
        enabled: twoFactorEnabled,
        userId: session.user.id
      });

    } catch (error) {
      console.error('Failed to get 2FA status:', error);
      return NextResponse.json(
        { error: 'Failed to get two-factor authentication status' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('2FA status error:', error);
    return NextResponse.json(
      { error: 'Failed to check two-factor authentication status' },
      { status: 500 }
    );
  }
}