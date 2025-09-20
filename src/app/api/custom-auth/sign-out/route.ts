import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('hardy-auth-session')?.value;

    if (sessionToken) {
      // Delete session from database
      await prisma.session.deleteMany({
        where: {
          token: sessionToken
        }
      });

      console.log('Session deleted:', sessionToken);
    }

    // Clear session cookie
    const response = NextResponse.json({
      data: { message: 'Signed out successfully' }
    });

    response.cookies.set('hardy-auth-session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/'
    });

    return response;
  } catch (error: any) {
    console.error('Sign-out error:', error);
    return NextResponse.json({
      error: { message: 'Sign-out failed' }
    }, { status: 500 });
  }
}