import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

    // Set session cookie
    const response = NextResponse.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        session: {
          token: session.token
        }
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