import { PrismaClient } from '@prisma/client';
import { getCurrentSession } from './session';

const prisma = new PrismaClient();

export interface TenantContext {
  userId: string;
  organizationId: string | null;
  role: string | null;
  isSystemAdmin: boolean;
}

/**
 * Get tenant context for the current user
 * This determines which organization the user belongs to and their role
 */
export async function getTenantContext(): Promise<TenantContext | null> {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return null;
    }

    // Check if user is a system admin (no organization restriction)
    const isSystemAdmin = session.user.email.endsWith('@mlpipes.com') ||
                         session.user.email === 'admin@hardy.auth';

    if (isSystemAdmin) {
      return {
        userId: session.user.id,
        organizationId: null,
        role: 'system_admin',
        isSystemAdmin: true
      };
    }

    // Get user's primary organization membership
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id
      },
      include: {
        organization: {
          select: {
            id: true,
            isActive: true
          }
        }
      },
      orderBy: {
        joinedAt: 'asc' // Use first joined organization as primary
      }
    });

    if (!membership || !membership.organization.isActive) {
      return {
        userId: session.user.id,
        organizationId: null,
        role: null,
        isSystemAdmin: false
      };
    }

    return {
      userId: session.user.id,
      organizationId: membership.organizationId,
      role: membership.role,
      isSystemAdmin: false
    };
  } catch (error) {
    console.error('Error getting tenant context:', error);
    return null;
  }
}

/**
 * Validate that a user can access a specific organization
 */
export async function validateOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<boolean> {
  try {
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId,
        organization: {
          isActive: true
        }
      }
    });

    return !!membership;
  } catch (error) {
    console.error('Error validating organization access:', error);
    return false;
  }
}

/**
 * Get all organizations a user has access to
 */
export async function getUserOrganizations(userId: string) {
  try {
    const memberships = await prisma.organizationMember.findMany({
      where: {
        userId,
        organization: {
          isActive: true
        }
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            organizationType: true,
            isActive: true
          }
        }
      },
      orderBy: {
        joinedAt: 'asc'
      }
    });

    return memberships.map(m => ({
      ...m.organization,
      role: m.role,
      department: m.department,
      joinedAt: m.joinedAt
    }));
  } catch (error) {
    console.error('Error getting user organizations:', error);
    return [];
  }
}

/**
 * Check if user has specific role within an organization
 */
export async function hasOrganizationRole(
  userId: string,
  organizationId: string,
  requiredRoles: string[]
): Promise<boolean> {
  try {
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId,
        role: {
          in: requiredRoles
        },
        organization: {
          isActive: true
        }
      }
    });

    return !!membership;
  } catch (error) {
    console.error('Error checking organization role:', error);
    return false;
  }
}