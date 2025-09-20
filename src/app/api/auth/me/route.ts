import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';

/**
 * Get current user information
 * Protected endpoint that requires valid session
 */
export async function GET() {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json({
        error: { message: 'Not authenticated' }
      }, { status: 401 });
    }

    return NextResponse.json({
      data: {
        user: session.user,
        session: {
          expiresAt: session.session.expiresAt
        }
      }
    });
  } catch (error: any) {
    console.error('Get current user error:', error);
    return NextResponse.json({
      error: { message: 'Failed to get user information' }
    }, { status: 500 });
  }
}