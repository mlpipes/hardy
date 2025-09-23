/**
 * Two-Factor Authentication Status API
 * Get current 2FA status for the user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    // Check 2FA status from database
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          twoFactorEnabled: true,
          twoFactor: true
        }
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // 2FA is enabled if user has both the flag and a TwoFactor record
      const enabled = user.twoFactorEnabled && !!user.twoFactor;

      return NextResponse.json({
        enabled: enabled,
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