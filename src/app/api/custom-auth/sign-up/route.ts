import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendVerificationEmail, isEmailServiceConfigured, logEmailForDevelopment } from '@/lib/email-service';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    // Validation
    if (!email || !password) {
      return NextResponse.json({
        error: { message: 'Email and password are required' }
      }, { status: 400 });
    }

    if (password.length < 12) {
      return NextResponse.json({
        error: { message: 'Password must be at least 12 characters' }
      }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({
        error: { message: 'User already exists with this email' }
      }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        emailVerified: false
      }
    });

    // Create account for email provider
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: email,
        providerId: 'email',
        password: hashedPassword
      }
    });

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        token: `hardy_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`
      }
    });

    // Create email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiresAt = new Date();
    verificationExpiresAt.setHours(verificationExpiresAt.getHours() + 24); // 24 hours

    await prisma.verification.create({
      data: {
        identifier: user.email,
        value: verificationToken,
        expiresAt: verificationExpiresAt
      }
    });

    // Send verification email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;

    // Send verification email with intelligent fallback (SES → SMTP → Development)
    let emailSent = false;

    if (isEmailServiceConfigured()) {
      try {
        emailSent = await sendVerificationEmail({
          userEmail: user.email,
          userName: user.name,
          verificationUrl,
          organizationName: undefined // TODO: Add organization context
        });

        if (emailSent) {
          console.log('✅ Welcome email sent successfully to:', user.email);
        }
      } catch (error) {
        console.error('Email service error during sign-up:', error);
        emailSent = false;
      }
    }

    // Fallback to development logging if email service not configured or failed
    if (!emailSent) {
      logEmailForDevelopment({
        userEmail: user.email,
        userName: user.name,
        verificationUrl,
        organizationName: undefined
      });
    }

    // Set session cookie
    const response = NextResponse.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified
        },
        session: {
          token: session.token
        },
        verification: {
          emailSent,
          message: emailSent
            ? 'Verification email sent successfully'
            : 'Verification email logged to console (development mode)'
        },
        // Development only
        ...(process.env.NODE_ENV === 'development' && !emailSent && {
          verificationUrl,
          devNote: 'Check console for verification URL'
        })
      }
    });

    response.cookies.set('hardy-auth-session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    });

    return response;
  } catch (error: any) {
    console.error('Sign-up error:', error);
    return NextResponse.json({
      error: { message: 'An error occurred during sign-up' }
    }, { status: 500 });
  }
}