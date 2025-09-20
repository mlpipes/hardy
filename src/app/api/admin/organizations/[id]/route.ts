import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireSession } from '@/lib/session';

const prisma = new PrismaClient();

/**
 * Get organization details
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const session = await requireSession(request);

    const organization = await prisma.organization.findUnique({
      where: { id: params.id },
      include: {
        members: {
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
          },
          orderBy: { joinedAt: 'desc' }
        },
        invitations: {
          include: {
            inviter: {
              select: {
                id: true,
                email: true,
                name: true
              }
            }
          },
          where: {
            acceptedAt: null,
            expiresAt: {
              gt: new Date()
            }
          }
        }
      }
    });

    if (!organization) {
      return NextResponse.json({
        error: { message: 'Organization not found' }
      }, { status: 404 });
    }

    return NextResponse.json({
      data: { organization }
    });
  } catch (error: any) {
    console.error('Get organization error:', error);

    if (error.message.includes('session')) {
      return NextResponse.json({
        error: { message: 'Authentication required' }
      }, { status: 401 });
    }

    return NextResponse.json({
      error: { message: 'Failed to fetch organization' }
    }, { status: 500 });
  }
}

/**
 * Update organization
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const session = await requireSession(request);

    const body = await request.json();
    const {
      name,
      domain,
      website,
      phone,
      organizationType,
      npiNumber,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      country,
      maxUsers,
      isActive
    } = body;

    // Check if organization exists
    const existing = await prisma.organization.findUnique({
      where: { id: params.id }
    });

    if (!existing) {
      return NextResponse.json({
        error: { message: 'Organization not found' }
      }, { status: 404 });
    }

    // Check domain uniqueness if changed
    if (domain && domain !== existing.domain) {
      const domainExists = await prisma.organization.findFirst({
        where: {
          domain,
          id: { not: params.id }
        }
      });

      if (domainExists) {
        return NextResponse.json({
          error: { message: 'Domain already exists' }
        }, { status: 400 });
      }
    }

    // Update organization
    const organization = await prisma.organization.update({
      where: { id: params.id },
      data: {
        name,
        domain,
        website,
        phone,
        organizationType,
        npiNumber,
        addressLine1,
        addressLine2,
        city,
        state,
        zipCode,
        country,
        maxUsers,
        isActive
      }
    });

    return NextResponse.json({
      data: { organization }
    });
  } catch (error: any) {
    console.error('Update organization error:', error);

    if (error.message.includes('session')) {
      return NextResponse.json({
        error: { message: 'Authentication required' }
      }, { status: 401 });
    }

    return NextResponse.json({
      error: { message: 'Failed to update organization' }
    }, { status: 500 });
  }
}

/**
 * Delete organization
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const session = await requireSession(request);

    // Check if organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { members: true }
        }
      }
    });

    if (!organization) {
      return NextResponse.json({
        error: { message: 'Organization not found' }
      }, { status: 404 });
    }

    // Prevent deletion if there are members
    if (organization._count.members > 0) {
      return NextResponse.json({
        error: { message: 'Cannot delete organization with active members' }
      }, { status: 400 });
    }

    // Delete organization
    await prisma.organization.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      data: { message: 'Organization deleted successfully' }
    });
  } catch (error: any) {
    console.error('Delete organization error:', error);

    if (error.message.includes('session')) {
      return NextResponse.json({
        error: { message: 'Authentication required' }
      }, { status: 401 });
    }

    return NextResponse.json({
      error: { message: 'Failed to delete organization' }
    }, { status: 500 });
  }
}