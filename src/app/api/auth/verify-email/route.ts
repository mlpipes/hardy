import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Verify email address using verification token
 */
export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({
        error: { message: 'Verification token is required' }
      }, { status: 400 });
    }

    // Find verification record
    const verification = await prisma.verification.findUnique({
      where: { value: token }
    });

    if (!verification) {
      return NextResponse.json({
        error: { message: 'Invalid verification token' }
      }, { status: 400 });
    }

    // Check if token has expired
    if (verification.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.verification.delete({
        where: { id: verification.id }
      });

      return NextResponse.json({
        error: { message: 'Verification token has expired' }
      }, { status: 400 });
    }

    // Find user by email (identifier)
    const user = await prisma.user.findUnique({
      where: { email: verification.identifier }
    });

    if (!user) {
      return NextResponse.json({
        error: { message: 'User not found' }
      }, { status: 404 });
    }

    // Update user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        updatedAt: new Date()
      }
    });

    // Clean up verification token
    await prisma.verification.delete({
      where: { id: verification.id }
    });

    return NextResponse.json({
      data: {
        message: 'Email verified successfully',
        user: {
          id: user.id,
          email: user.email,
          emailVerified: true
        }
      }
    });
  } catch (error: any) {
    console.error('Email verification error:', error);
    return NextResponse.json({
      error: { message: 'Failed to verify email' }
    }, { status: 500 });
  }
}