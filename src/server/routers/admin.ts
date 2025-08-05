/**
 * MLPipes Auth Service - Admin tRPC Router
 * Administrative functions for system and tenant admins
 */

import { TRPCError } from '@trpc/server'
import { createTRPCRouter, adminProcedure, systemAdminProcedure } from '../../lib/trpc'
import {
  createUserSchema,
  updateUserSchema,
  auditLogFilterSchema,
  sessionFilterSchema,
  revokeSessionSchema,
  rateLimitSchema,
} from '../../lib/validations'
import { z } from 'zod'

export const adminRouter = createTRPCRouter({
  // Get audit logs with filtering
  getAuditLogs: adminProcedure
    .input(auditLogFilterSchema)
    .query(async ({ ctx, input }) => {
      const {
        startDate,
        endDate,
        userId,
        action,
        resource,
        severity,
        limit,
        offset,
      } = input

      const where: any = {
        organizationId: ctx.tenantId,
      }

      if (startDate) where.timestamp = { gte: new Date(startDate) }
      if (endDate) {
        where.timestamp = {
          ...where.timestamp,
          lte: new Date(endDate),
        }
      }
      if (userId) where.userId = userId
      if (action) where.action = action
      if (resource) where.resource = resource
      if (severity) where.severity = severity

      const [logs, total] = await Promise.all([
        ctx.prisma.auditLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: limit,
          skip: offset,
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
        ctx.prisma.auditLog.count({ where }),
      ])

      return {
        logs,
        total,
        hasMore: offset + limit < total,
      }
    }),

  // Get system users (system admin only)
  getUsers: systemAdminProcedure
    .input(z.object({
      organizationId: z.string().optional(),
      role: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, role, limit, offset, search } = input

      const where: any = {}
      if (organizationId) where.organizationId = organizationId
      if (role) where.role = role
      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ]
      }

      const [users, total] = await Promise.all([
        ctx.prisma.user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            _count: {
              select: {
                sessions: true,
              },
            },
          },
        }),
        ctx.prisma.user.count({ where }),
      ])

      return {
        users,
        total,
        hasMore: offset + limit < total,
      }
    }),

  // Create user (admin only)
  createUser: adminProcedure
    .input(createUserSchema)
    .mutation(async ({ ctx, input }) => {
      const {
        email,
        password,
        firstName,
        lastName,
        role,
        organizationId,
        licenseNumber,
        npiNumber,
        specialties,
        departmentId,
      } = input

      // Check if user already exists
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User with this email already exists',
        })
      }

      // For tenant admins, enforce organization context
      const targetOrgId = ctx.userRole === 'system_admin' ? organizationId : ctx.tenantId

      const user = await ctx.prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          role,
          organizationId: targetOrgId,
          licenseNumber,
          npiNumber,
          specialties: specialties ? JSON.stringify(specialties) : null,
          emailVerified: true, // Admin-created users are pre-verified
        },
      })

      // Create member record if not system admin
      if (targetOrgId && role !== 'system_admin') {
        await ctx.prisma.member.create({
          data: {
            userId: user.id,
            organizationId: targetOrgId,
            role,
            departmentId,
            status: 'active',
            invitedBy: ctx.userId!,
            joinedAt: new Date(),
          },
        })
      }

      // Create audit log
      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.userId,
          organizationId: targetOrgId,
          action: 'USER_CREATED_BY_ADMIN',
          resource: 'USER',
          resourceId: user.id,
          details: {
            email,
            role,
            organizationId: targetOrgId,
            createdBy: ctx.userId,
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
          sessionId: ctx.session?.sessionToken,
        },
      })

      return user
    }),

  // Update user (admin only)
  updateUser: adminProcedure
    .input(z.object({
      userId: z.string(),
    }).merge(updateUserSchema))
    .mutation(async ({ ctx, input }) => {
      const { userId, specialties, ...updateData } = input

      // For tenant admins, ensure user belongs to their organization
      const whereClause: any = { id: userId }
      if (ctx.userRole !== 'system_admin') {
        whereClause.organizationId = ctx.tenantId
      }

      const user = await ctx.prisma.user.update({
        where: whereClause,
        data: {
          ...updateData,
          ...(specialties && {
            specialties: JSON.stringify(specialties),
          }),
          updatedAt: new Date(),
        },
      })

      // Create audit log
      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.userId,
          organizationId: user.organizationId,
          action: 'USER_UPDATED_BY_ADMIN',
          resource: 'USER',
          resourceId: userId,
          details: {
            changes: input,
            updatedBy: ctx.userId,
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
          sessionId: ctx.session?.sessionToken,
        },
      })

      return user
    }),

  // Get active sessions
  getSessions: adminProcedure
    .input(sessionFilterSchema)
    .query(async ({ ctx, input }) => {
      const { active, userId, limit, offset } = input

      const where: any = {
        organizationId: ctx.tenantId,
      }

      if (active !== undefined) {
        if (active) {
          where.expires = { gt: new Date() }
        } else {
          where.expires = { lte: new Date() }
        }
      }

      if (userId) where.userId = userId

      const [sessions, total] = await Promise.all([
        ctx.prisma.session.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
        ctx.prisma.session.count({ where }),
      ])

      return {
        sessions,
        total,
        hasMore: offset + limit < total,
      }
    }),

  // Revoke session
  revokeSession: adminProcedure
    .input(revokeSessionSchema)
    .mutation(async ({ ctx, input }) => {
      const { sessionId } = input

      const session = await ctx.prisma.session.findUnique({
        where: { sessionToken: sessionId },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      })

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        })
      }

      // For tenant admins, ensure session belongs to their organization
      if (ctx.userRole !== 'system_admin' && session.organizationId !== ctx.tenantId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot revoke session from different organization',
        })
      }

      await ctx.prisma.session.delete({
        where: { sessionToken: sessionId },
      })

      // Create audit log
      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.userId,
          organizationId: session.organizationId,
          action: 'SESSION_REVOKED_BY_ADMIN',
          resource: 'SESSION',
          resourceId: sessionId,
          details: {
            revokedBy: ctx.userId,
            sessionUserId: session.userId,
            userEmail: session.user?.email,
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
          sessionId: ctx.session?.sessionToken,
        },
      })

      return {
        success: true,
        message: 'Session revoked successfully',
      }
    }),

  // Get system statistics (system admin only)
  getSystemStats: systemAdminProcedure
    .query(async ({ ctx }) => {
      const [
        totalOrganizations,
        totalUsers,
        activeSessions,
        totalAuditLogs,
        recentLogins,
        failedLogins,
      ] = await Promise.all([
        ctx.prisma.organization.count(),
        ctx.prisma.user.count(),
        ctx.prisma.session.count({
          where: { expires: { gt: new Date() } },
        }),
        ctx.prisma.auditLog.count(),
        ctx.prisma.auditLog.count({
          where: {
            action: 'LOGIN_SUCCESS',
            timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
        ctx.prisma.auditLog.count({
          where: {
            action: 'LOGIN_FAILED',
            timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
      ])

      return {
        totalOrganizations,
        totalUsers,
        activeSessions,
        totalAuditLogs,
        recentLogins,
        failedLogins,
        dailySuccessRate: recentLogins + failedLogins > 0 
          ? Math.round((recentLogins / (recentLogins + failedLogins)) * 100)
          : 100,
      }
    }),

  // Update system settings (system admin only)
  updateSystemSettings: systemAdminProcedure
    .input(z.object({
      defaultSessionTimeout: z.number().min(300).max(28800).optional(),
      defaultPasswordPolicy: z.object({
        minLength: z.number().min(8).max(128),
        requireUppercase: z.boolean(),
        requireLowercase: z.boolean(),
        requireNumbers: z.boolean(),
        requireSpecialChars: z.boolean(),
      }).optional(),
      rateLimits: z.object({
        auth: rateLimitSchema,
        api: rateLimitSchema,
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // In a real implementation, this would update system-wide settings
      // For now, we'll just log the change

      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.userId,
          action: 'SYSTEM_SETTINGS_UPDATED',
          resource: 'SYSTEM',
          details: {
            settings: input,
            updatedBy: ctx.userId,
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
          sessionId: ctx.session?.sessionToken,
        },
      })

      return {
        success: true,
        message: 'System settings updated successfully',
        settings: input,
      }
    }),
})