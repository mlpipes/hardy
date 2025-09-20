import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        accounts: true,
        sessions: true
      }
    });

    return NextResponse.json({
      user: user ? {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        accounts: user.accounts.map(acc => ({
          id: acc.id,
          providerId: acc.providerId,
          hasPassword: !!acc.password
        })),
        sessions: user.sessions.length
      } : null
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}