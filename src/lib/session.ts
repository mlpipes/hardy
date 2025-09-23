/**
 * Session Management Utilities
 * Handle session validation and user authentication state
 */

import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
}

export interface ValidatedSession {
  user: SessionUser;
  session: {
    id: string;
    token: string;
    expiresAt: Date;
  };
  tenantContext?: {
    organizationId: string | null;
    role: string | null;
    isSystemAdmin: boolean;
  };
}

/**
 * Get current user session from cookies
 */
export async function getCurrentSession(): Promise<ValidatedSession | null> {
  try {
    const cookieStore = cookies();

    // Try multiple possible cookie names
    const possibleCookieNames = [
      'hardy_auth.session_token',
      'hardy_auth.session',
      'hardy_auth_session',
      'better-auth.session',
      'session',
      'auth-session'
    ];

    let sessionToken = null;

    for (const cookieName of possibleCookieNames) {
      const cookie = cookieStore.get(cookieName);
      if (cookie?.value) {
        const rawToken = cookie.value;
        // Better Auth cookies might be signed (token.signature), extract just the token part
        sessionToken = rawToken.split('.')[0];
        console.log(`🎯 getCurrentSession found token with name: ${cookieName}, raw: ${rawToken}, extracted: ${sessionToken}`);
        break;
      }
    }

    if (!sessionToken) {
      console.log('❌ getCurrentSession: No session token found in cookies');
      const allCookies = cookieStore.getAll();
      console.log('🍪 All available cookies:', allCookies.map(c => c.name));
    }

    if (!sessionToken) {
      return null;
    }

    // Find session in database
    const session = await prisma.session.findUnique({
      where: {
        token: sessionToken,
        expiresAt: {
          gt: new Date() // Session not expired
        }
      },
      include: {
        user: true
      }
    });

    if (!session) {
      return null;
    }

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        emailVerified: session.user.emailVerified
      },
      session: {
        id: session.id,
        token: session.token,
        expiresAt: session.expiresAt
      }
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

/**
 * Require authenticated session (for API routes)
 */
export async function requireSession(request: Request): Promise<ValidatedSession> {
  const cookieHeader = request.headers.get('cookie');
  console.log('🍪 Full cookie header:', cookieHeader);

  // Try multiple possible cookie names
  const possibleCookieNames = [
    'hardy_auth.session_token',
    'hardy_auth.session',
    'hardy_auth_session',
    'better-auth.session',
    'session',
    'auth-session'
  ];

  let sessionToken = null;

  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    console.log('🍪 All cookies:', cookies);

    for (const cookieName of possibleCookieNames) {
      const cookie = cookies.find(c => c.startsWith(`${cookieName}=`));
      if (cookie) {
        const rawToken = cookie.split('=')[1];
        // Better Auth cookies might be signed (token.signature), extract just the token part
        sessionToken = rawToken.split('.')[0];
        console.log(`🎯 Found session token with name: ${cookieName}, raw: ${rawToken}, extracted: ${sessionToken}`);
        break;
      }
    }
  }

  if (!sessionToken) {
    console.log('❌ No session token found in any expected cookie name');
    throw new Error('No session token provided');
  }

  const session = await prisma.session.findUnique({
    where: {
      token: sessionToken,
      expiresAt: {
        gt: new Date()
      }
    },
    include: {
      user: true
    }
  });

  if (!session) {
    throw new Error('Invalid or expired session');
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      emailVerified: session.user.emailVerified
    },
    session: {
      id: session.id,
      token: session.token,
      expiresAt: session.expiresAt
    }
  };
}

/**
 * Get session with tenant context for multi-tenant operations
 */
export async function getSessionWithTenantContext(): Promise<ValidatedSession | null> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return null;
    }

    // Check if user is a system admin
    const isSystemAdmin = session.user.email.endsWith('@mlpipes.ai') ||
                         session.user.email === 'admin@mlpipes.ai' ||
                         session.user.email === 'admin@hardy.auth';

    if (isSystemAdmin) {
      return {
        ...session,
        tenantContext: {
          organizationId: null,
          role: 'system_admin',
          isSystemAdmin: true
        }
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
        joinedAt: 'asc'
      }
    });

    const tenantContext = {
      organizationId: membership?.organizationId || null,
      role: membership?.role || null,
      isSystemAdmin: false
    };

    return {
      ...session,
      tenantContext
    };
  } catch (error) {
    console.error('Session with tenant context error:', error);
    return null;
  }
}

/**
 * Require authenticated session with tenant context (for API routes)
 */
export async function requireSessionWithTenant(request: Request): Promise<ValidatedSession> {
  const session = await requireSession(request);

  // Check if user is a system admin
  const isSystemAdmin = session.user.email.endsWith('@mlpipes.ai') ||
                       session.user.email === 'admin@mlpipes.ai' ||
                       session.user.email === 'admin@hardy.auth';

  if (isSystemAdmin) {
    return {
      ...session,
      tenantContext: {
        organizationId: null,
        role: 'system_admin',
        isSystemAdmin: true
      }
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
      joinedAt: 'asc'
    }
  });

  const tenantContext = {
    organizationId: membership?.organizationId || null,
    role: membership?.role || null,
    isSystemAdmin: false
  };

  return {
    ...session,
    tenantContext
  };
}

/**
 * Clean up expired sessions (utility function)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  });

  return result.count;
}