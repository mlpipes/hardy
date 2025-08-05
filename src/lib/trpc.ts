/**
 * MLPipes Auth Service - tRPC Configuration
 * Type-safe API with Zod validation and tenant context
 */

import { initTRPC, TRPCError } from '@trpc/server'
import { type CreateNextContextOptions } from '@trpc/server/adapters/next'
import { ZodError } from 'zod'
import { PrismaClient } from '@prisma/client'
import { auth } from './auth'
import superjson from 'superjson'

// Create Prisma client with tenant context
const prisma = new PrismaClient()

// tRPC context with authentication and tenant isolation
export async function createTRPCContext(opts: CreateNextContextOptions) {
  const { req, res } = opts

  // Get session from Better Auth
  const session = await auth.api.getSession({
    headers: req.headers as any,
  })

  // Extract tenant context from session or headers
  const tenantId = session?.user?.organizationId || req.headers['x-tenant-id'] as string
  const userId = session?.user?.id
  const userRole = session?.user?.role || 'user'

  // Set database context for RLS
  if (tenantId) {
    await prisma.$executeRawUnsafe(`SELECT set_auth_context($1, $2, $3)`, tenantId, userId, userRole)
  }

  return {
    req,
    res,
    prisma,
    session,
    user: session?.user,
    tenantId,
    userId,
    userRole,
  }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>

// Initialize tRPC with enhanced error handling
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

// Base router and procedure
export const createTRPCRouter = t.router
export const publicProcedure = t.procedure

// Authentication middleware
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.user },
    },
  })
})

// Tenant isolation middleware
const enforceTenantIsolation = t.middleware(({ ctx, next }) => {
  if (!ctx.tenantId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Tenant context required',
    })
  }
  return next({
    ctx: {
      ...ctx,
      tenantId: ctx.tenantId,
    },
  })
})

// Admin role middleware
const enforceAdminRole = t.middleware(({ ctx, next }) => {
  if (!ctx.userRole || !['system_admin', 'tenant_admin', 'admin'].includes(ctx.userRole)) {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  return next({
    ctx: {
      ...ctx,
      userRole: ctx.userRole,
    },
  })
})

// System admin middleware
const enforceSystemAdmin = t.middleware(({ ctx, next }) => {
  if (ctx.userRole !== 'system_admin') {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  return next({
    ctx: {
      ...ctx,
      userRole: ctx.userRole,
    },
  })
})

// Rate limiting middleware
const rateLimitMiddleware = t.middleware(async ({ ctx, next }) => {
  const key = ctx.userId || ctx.req.ip || 'anonymous'
  
  // Check rate limit (simplified - in production use Redis)
  const rateLimit = await ctx.prisma.rateLimit.findUnique({
    where: { key },
  })

  const now = new Date()
  const windowMs = 60000 // 1 minute
  const maxRequests = 100

  if (rateLimit) {
    if (rateLimit.resetTime > now) {
      if (rateLimit.count >= maxRequests) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Rate limit exceeded',
        })
      }
      // Increment counter
      await ctx.prisma.rateLimit.update({
        where: { key },
        data: { count: rateLimit.count + 1 },
      })
    } else {
      // Reset window
      await ctx.prisma.rateLimit.update({
        where: { key },
        data: {
          count: 1,
          resetTime: new Date(now.getTime() + windowMs),
        },
      })
    }
  } else {
    // Create new rate limit entry
    await ctx.prisma.rateLimit.create({
      data: {
        key,
        count: 1,
        resetTime: new Date(now.getTime() + windowMs),
      },
    })
  }

  return next()
})

// Audit logging middleware
const auditMiddleware = t.middleware(async ({ ctx, next, path, type, input }) => {
  // Log the request
  if (ctx.tenantId && ctx.userId) {
    await ctx.prisma.auditLog.create({
      data: {
        userId: ctx.userId,
        organizationId: ctx.tenantId,
        action: `${type.toUpperCase()}_${path.toUpperCase()}`,
        resource: 'API',
        details: {
          path,
          type,
          input: typeof input === 'object' ? input : {},
          userAgent: ctx.req.headers['user-agent'],
        },
        ipAddress: ctx.req.ip || ctx.req.connection?.remoteAddress,
        userAgent: ctx.req.headers['user-agent'] as string,
        sessionId: ctx.session?.sessionToken,
      },
    })
  }

  return next()
})

// Procedure variants with different security models
export const protectedProcedure = publicProcedure
  .use(rateLimitMiddleware)
  .use(enforceUserIsAuthed)
  .use(enforceTenantIsolation)
  .use(auditMiddleware)

export const adminProcedure = protectedProcedure
  .use(enforceAdminRole)

export const systemAdminProcedure = protectedProcedure
  .use(enforceSystemAdmin)

// Public procedures with rate limiting
export const publicLimitedProcedure = publicProcedure
  .use(rateLimitMiddleware)

// Tenant-isolated procedure without authentication (for public tenant data)
export const tenantPublicProcedure = publicProcedure
  .use(rateLimitMiddleware)
  .use(enforceTenantIsolation)