import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireSession } from '@/lib/session';

const prisma = new PrismaClient();

/**
 * Get organization members
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const session = await requireSession(request);

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search') || '';
    const role = url.searchParams.get('role') || '';
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      organizationId: params.id
    };

    if (search) {
      whereClause.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    if (role) {
      whereClause.role = role;
    }

    // Get members with pagination
    const [members, total] = await Promise.all([
      prisma.organizationMember.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              emailVerified: true,
              licenseNumber: true,
              npiNumber: true,
              specialties: true,
              createdAt: true
            }
          }
        },
        orderBy: { joinedAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.organizationMember.count({ where: whereClause })
    ]);

    return NextResponse.json({
      data: {
        members,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error: any) {
    console.error('Get members error:', error);

    if (error.message.includes('session')) {
      return NextResponse.json({
        error: { message: 'Authentication required' }
      }, { status: 401 });
    }

    return NextResponse.json({
      error: { message: 'Failed to fetch members' }
    }, { status: 500 });
  }
}

/**
 * Add member to organization
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const session = await requireSession(request);

    const body = await request.json();
    const { userId, role, department } = body;

    // Validation
    if (!userId || !role) {
      return NextResponse.json({
        error: { message: 'User ID and role are required' }
      }, { status: 400 });
    }

    // Check if organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: params.id }
    });

    if (!organization) {
      return NextResponse.json({
        error: { message: 'Organization not found' }
      }, { status: 404 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({
        error: { message: 'User not found' }
      }, { status: 404 });
    }

    // Check if user is already a member
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId: params.id
      }
    });

    if (existingMember) {
      return NextResponse.json({
        error: { message: 'User is already a member of this organization' }
      }, { status: 400 });
    }

    // Check organization member limit
    const memberCount = await prisma.organizationMember.count({
      where: { organizationId: params.id }
    });

    if (memberCount >= organization.maxUsers) {
      return NextResponse.json({
        error: { message: 'Organization has reached maximum user limit' }
      }, { status: 400 });
    }

    // Create membership
    const member = await prisma.organizationMember.create({
      data: {
        userId,
        organizationId: params.id,
        role,
        department
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            emailVerified: true,
            licenseNumber: true,
            npiNumber: true,
            specialties: true
          }
        }
      }
    });

    return NextResponse.json({
      data: { member }
    });
  } catch (error: any) {
    console.error('Add member error:', error);

    if (error.message.includes('session')) {
      return NextResponse.json({
        error: { message: 'Authentication required' }
      }, { status: 401 });
    }

    return NextResponse.json({
      error: { message: 'Failed to add member' }
    }, { status: 500 });
  }
}