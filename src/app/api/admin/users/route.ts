import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireSession } from '@/lib/session';

const prisma = new PrismaClient();

// Mark as dynamic route
export const dynamic = 'force-dynamic';

/**
 * Get all users (admin only)
 */
export async function GET(request: Request) {
  try {
    // Require authentication
    const session = await requireSession(request);

    // TODO: Add admin role check here
    // For now, any authenticated user can view users

    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Build search filter
    const whereClause = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          sessions: {
            where: {
              expiresAt: {
                gt: new Date()
              }
            },
            select: {
              id: true,
              expiresAt: true
            }
          },
          accounts: {
            select: {
              id: true,
              providerId: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    // Transform data to include active session info
    const usersWithStats = users.map(user => ({
      ...user,
      hasActiveSession: user.sessions.length > 0,
      sessionCount: user.sessions.length,
      accountProviders: user.accounts.map(acc => acc.providerId),
      sessions: undefined,
      accounts: undefined,
    }));

    return NextResponse.json({
      data: {
        users: usersWithStats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Get users error:', error);

    if (error.message.includes('session')) {
      return NextResponse.json({
        error: { message: 'Authentication required' }
      }, { status: 401 });
    }

    return NextResponse.json({
      error: { message: 'Failed to fetch users' }
    }, { status: 500 });
  }
}