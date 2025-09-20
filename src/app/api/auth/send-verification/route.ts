import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireSession } from '@/lib/session';
import crypto from 'crypto';
import { sendVerificationEmail, isEmailServiceConfigured, logEmailForDevelopment } from '@/lib/email-service';

const prisma = new PrismaClient();

/**
 * Send email verification link
 */
export async function POST(request: Request) {
  try {
    // Require authentication
    const session = await requireSession(request);

    // Check if email is already verified
    if (session.user.emailVerified) {
      return NextResponse.json({
        error: { message: 'Email is already verified' }
      }, { status: 400 });
    }

    // Clean up any existing verification tokens for this email
    await prisma.verification.deleteMany({
      where: { identifier: session.user.email }
    });

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

    // Create verification record
    await prisma.verification.create({
      data: {
        identifier: session.user.email,
        value: token,
        expiresAt
      }
    });

    // Create verification URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

    // Try to send email via AWS SES or fallback to development logging
    let emailSent = false;

    if (isEmailServiceConfigured()) {
      try {
        emailSent = await sendVerificationEmail({
          userEmail: session.user.email,
          userName: session.user.name,
          verificationUrl,
          organizationName: undefined // TODO: Add organization context
        });

        if (emailSent) {
          console.log('✅ Verification email sent via AWS SES to:', session.user.email);
        } else {
          console.log('❌ Failed to send via AWS SES, falling back to development mode');
        }
      } catch (error) {
        console.error('AWS SES error:', error);
        emailSent = false;
      }
    }

    // Fallback to development logging if email service not configured or failed
    if (!emailSent) {
      logEmailForDevelopment({
        userEmail: session.user.email,
        userName: session.user.name,
        verificationUrl,
        organizationName: undefined
      });
    }

    return NextResponse.json({
      data: {
        message: emailSent
          ? 'Verification email sent successfully'
          : 'Verification email logged (development mode)',
        emailSent,
        expiresAt: expiresAt.toISOString(),
        // Development only - remove in production
        ...(process.env.NODE_ENV === 'development' && !emailSent && {
          verificationUrl,
          devNote: 'Check console for verification URL'
        })
      }
    });
  } catch (error: any) {
    console.error('Send verification error:', error);

    if (error.message.includes('session')) {
      return NextResponse.json({
        error: { message: 'Authentication required' }
      }, { status: 401 });
    }

    return NextResponse.json({
      error: { message: 'Failed to send verification email' }
    }, { status: 500 });
  }
}