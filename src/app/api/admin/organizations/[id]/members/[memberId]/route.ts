import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireSession } from '@/lib/session';

const prisma = new PrismaClient();

/**
 * Update organization member
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    // Require authentication
    const session = await requireSession(request);

    const body = await request.json();
    const { role, department } = body;

    // Check if member exists
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        id: params.memberId,
        organizationId: params.id
      }
    });

    if (!existingMember) {
      return NextResponse.json({
        error: { message: 'Member not found' }
      }, { status: 404 });
    }

    // Update member
    const member = await prisma.organizationMember.update({
      where: { id: params.memberId },
      data: {
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
    console.error('Update member error:', error);

    if (error.message.includes('session')) {
      return NextResponse.json({
        error: { message: 'Authentication required' }
      }, { status: 401 });
    }

    return NextResponse.json({
      error: { message: 'Failed to update member' }
    }, { status: 500 });
  }
}

/**
 * Remove member from organization
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    // Require authentication
    const session = await requireSession(request);

    // Check if member exists
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        id: params.memberId,
        organizationId: params.id
      }
    });

    if (!existingMember) {
      return NextResponse.json({
        error: { message: 'Member not found' }
      }, { status: 404 });
    }

    // Prevent removing the last admin
    if (existingMember.role === 'admin') {
      const adminCount = await prisma.organizationMember.count({
        where: {
          organizationId: params.id,
          role: 'admin'
        }
      });

      if (adminCount <= 1) {
        return NextResponse.json({
          error: { message: 'Cannot remove the last admin from the organization' }
        }, { status: 400 });
      }
    }

    // Remove member
    await prisma.organizationMember.delete({
      where: { id: params.memberId }
    });

    return NextResponse.json({
      data: { message: 'Member removed successfully' }
    });
  } catch (error: any) {
    console.error('Remove member error:', error);

    if (error.message.includes('session')) {
      return NextResponse.json({
        error: { message: 'Authentication required' }
      }, { status: 401 });
    }

    return NextResponse.json({
      error: { message: 'Failed to remove member' }
    }, { status: 500 });
  }
}