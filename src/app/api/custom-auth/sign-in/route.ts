import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    console.log('Sign-in attempt for:', email);

    // Validation
    if (!email || !password) {
      console.log('Missing email or password');
      return NextResponse.json({
        error: { message: 'Email and password are required' }
      }, { status: 400 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    console.log('User found:', !!user, user?.id);

    if (!user) {
      console.log('User not found');
      return NextResponse.json({
        error: { message: 'Invalid email or password' }
      }, { status: 401 });
    }

    // Find account with password (check both 'email' and 'credential' providers)
    const account = await prisma.account.findFirst({
      where: {
        userId: user.id,
        providerId: {
          in: ['email', 'credential']
        }
      }
    });

    console.log('Account found:', !!account, 'Has password:', !!account?.password);

    if (!account || !account.password) {
      console.log('Account not found or no password');
      return NextResponse.json({
        error: { message: 'Invalid email or password' }
      }, { status: 401 });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, account.password);
    console.log('Password valid:', validPassword);

    if (!validPassword) {
      console.log('Invalid password');
      return NextResponse.json({
        error: { message: 'Invalid email or password' }
      }, { status: 401 });
    }

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
    console.error('Sign-in error:', error);
    return NextResponse.json({
      error: { message: 'An error occurred during sign-in' }
    }, { status: 500 });
  }
}