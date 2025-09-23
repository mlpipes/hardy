/**
 * Two-Factor Authentication Disable API
 * Disables 2FA for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    // Disable 2FA in database
    try {
      // Remove TwoFactor record
      await prisma.twoFactor.deleteMany({
        where: { userId: session.user.id }
      });

      // Update user to disable 2FA
      await prisma.user.update({
        where: { id: session.user.id },
        data: { twoFactorEnabled: false }
      });

      console.log(`2FA disabled for user ${session.user.id}`);

      return NextResponse.json({
        success: true,
        message: 'Two-factor authentication has been disabled successfully'
      });

    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      return NextResponse.json(
        { error: 'Failed to disable two-factor authentication' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json(
      { error: 'Failed to disable two-factor authentication' },
      { status: 500 }
    );
  }
}