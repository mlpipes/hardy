import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireSession } from '@/lib/session';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

/**
 * Send organization invitation
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const session = await requireSession(request);

    const body = await request.json();
    const { email, role, department } = body;

    // Validation
    if (!email || !role) {
      return NextResponse.json({
        error: { message: 'Email and role are required' }
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

    // Check if user is already a member
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: params.id,
        user: { email }
      }
    });

    if (existingMember) {
      return NextResponse.json({
        error: { message: 'User is already a member of this organization' }
      }, { status: 400 });
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.organizationInvitation.findFirst({
      where: {
        email,
        organizationId: params.id,
        acceptedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    if (existingInvitation) {
      return NextResponse.json({
        error: { message: 'A pending invitation already exists for this email' }
      }, { status: 400 });
    }

    // Create invitation token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invitation
    const invitation = await prisma.organizationInvitation.create({
      data: {
        email,
        organizationId: params.id,
        role,
        invitedBy: session.user.id,
        token,
        expiresAt
      },
      include: {
        organization: true,
        inviter: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    // TODO: Send invitation email here
    // For now, we'll just return the invitation details

    return NextResponse.json({
      data: { invitation }
    });
  } catch (error: any) {
    console.error('Create invitation error:', error);

    if (error.message.includes('session')) {
      return NextResponse.json({
        error: { message: 'Authentication required' }
      }, { status: 401 });
    }

    return NextResponse.json({
      error: { message: 'Failed to create invitation' }
    }, { status: 500 });
  }
}

/**
 * Get organization invitations
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const session = await requireSession(request);

    const invitations = await prisma.organizationInvitation.findMany({
      where: {
        organizationId: params.id,
        acceptedAt: null,
        expiresAt: { gt: new Date() }
      },
      include: {
        inviter: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      data: { invitations }
    });
  } catch (error: any) {
    console.error('Get invitations error:', error);

    if (error.message.includes('session')) {
      return NextResponse.json({
        error: { message: 'Authentication required' }
      }, { status: 401 });
    }

    return NextResponse.json({
      error: { message: 'Failed to fetch invitations' }
    }, { status: 500 });
  }
}