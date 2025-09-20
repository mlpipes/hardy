import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireSession } from '@/lib/session';

const prisma = new PrismaClient();

/**
 * Get all organizations (admin only)
 */
export async function GET(request: Request) {
  try {
    // Require authentication
    const session = await requireSession(request);

    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Build search filter
    const whereClause = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
            { domain: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    // Get organizations with member count
    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where: whereClause,
        include: {
          _count: {
            select: {
              members: true,
              invitations: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.organization.count({ where: whereClause }),
    ]);

    // Transform data
    const organizationsWithStats = organizations.map(org => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      domain: org.domain,
      organizationType: org.organizationType,
      npiNumber: org.npiNumber,
      isActive: org.isActive,
      memberCount: org._count.members,
      pendingInvitations: org._count.invitations,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    }));

    return NextResponse.json({
      data: {
        organizations: organizationsWithStats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Get organizations error:', error);

    if (error.message.includes('session')) {
      return NextResponse.json({
        error: { message: 'Authentication required' }
      }, { status: 401 });
    }

    return NextResponse.json({
      error: { message: 'Failed to fetch organizations' }
    }, { status: 500 });
  }
}

/**
 * Create new organization
 */
export async function POST(request: Request) {
  try {
    // Require authentication
    const session = await requireSession(request);

    const body = await request.json();
    const {
      name,
      slug,
      domain,
      organizationType,
      npiNumber,
      website,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      country = 'US',
      maxUsers = 100
    } = body;

    // Validation
    if (!name || !slug || !organizationType) {
      return NextResponse.json({
        error: { message: 'Name, slug, and organization type are required' }
      }, { status: 400 });
    }

    // Check if slug or domain already exists
    const existing = await prisma.organization.findFirst({
      where: {
        OR: [
          { slug },
          ...(domain ? [{ domain }] : [])
        ]
      }
    });

    if (existing) {
      return NextResponse.json({
        error: { message: 'Organization slug or domain already exists' }
      }, { status: 400 });
    }

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        domain,
        organizationType,
        npiNumber,
        website,
        phone,
        addressLine1,
        addressLine2,
        city,
        state,
        zipCode,
        country,
        maxUsers,
        isActive: true
      }
    });

    // Create organization membership for the creator
    await prisma.organizationMember.create({
      data: {
        userId: session.user.id,
        organizationId: organization.id,
        role: 'admin',
        department: 'administration'
      }
    });

    return NextResponse.json({
      data: { organization }
    });
  } catch (error: any) {
    console.error('Create organization error:', error);

    if (error.message.includes('session')) {
      return NextResponse.json({
        error: { message: 'Authentication required' }
      }, { status: 401 });
    }

    return NextResponse.json({
      error: { message: 'Failed to create organization' }
    }, { status: 500 });
  }
}