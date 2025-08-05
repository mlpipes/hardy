/**
 * MLPipes Auth Service - Organization tRPC Router
 * Multi-tenant organization management with HIPAA compliance
 */

import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure, adminProcedure, systemAdminProcedure } from '../../lib/trpc'
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  inviteMemberSchema,
  updateMemberSchema,
  complianceSettingsSchema,
} from '../../lib/validations'
import { generateSecureToken } from '../../utils/crypto'
import { EmailService } from '../../lib/email-service'
import { z } from 'zod'

const emailService = new EmailService()

export const organizationRouter = createTRPCRouter({
  // Get current organization
  getCurrent: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No organization context',
        })
      }

      const organization = await ctx.prisma.organization.findUnique({
        where: { id: ctx.tenantId },
        include: {
          _count: {
            select: {
              users: true,
              members: true,
              oauthClients: true,
            },
          },
        },
      })

      if (!organization) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found',
        })
      }

      return organization
    }),

  // Create new organization (system admin only)
  create: systemAdminProcedure
    .input(createOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      const {
        name,
        slug,
        organizationType,
        practiceNpi,
        fhirEndpoint,
        address,
        phoneNumber,
        website,
        timezone,
      } = input

      // Check if slug is already taken
      const existingOrg = await ctx.prisma.organization.findUnique({
        where: { slug },
      })

      if (existingOrg) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Organization slug already exists',
        })
      }

      const organization = await ctx.prisma.organization.create({
        data: {
          name,
          slug,
          organizationType,
          practiceNpi,
          fhirEndpoint,
          address: address ? JSON.stringify(address) : null,
          phoneNumber,
          website,
          timezone,
          complianceSettings: JSON.stringify({
            hipaaCompliant: true,
            soc2Ready: false,
            hitrustReady: false,
            auditRetentionDays: 2555,
            mfaRequired: true,
            passwordPolicy: {
              minLength: 12,
              requireUppercase: true,
              requireLowercase: true,
              requireNumbers: true,
              requireSpecialChars: true,
              preventReuse: 12,
            },
            sessionTimeout: 1800,
          }),
          subscriptionTier: 'basic',
        },
      })

      // Create audit log
      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.userId,
          organizationId: organization.id,
          action: 'ORGANIZATION_CREATED',
          resource: 'ORGANIZATION',
          resourceId: organization.id,
          details: {
            name,
            slug,
            organizationType,
            createdBy: ctx.userId,
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
          sessionId: ctx.session?.sessionToken,
        },
      })

      return organization
    }),

  // Update organization
  update: adminProcedure
    .input(updateOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'BAD_REQUEST', 
          message: 'No organization context',
        })
      }

      const { address, ...updateData } = input

      const organization = await ctx.prisma.organization.update({
        where: { id: ctx.tenantId },
        data: {
          ...updateData,
          ...(address && { address: JSON.stringify(address) }),
          updatedAt: new Date(),
        },
      })

      // Create audit log
      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.userId,
          organizationId: ctx.tenantId,
          action: 'ORGANIZATION_UPDATED',
          resource: 'ORGANIZATION',
          resourceId: ctx.tenantId,
          details: {
            changes: input,
            updatedBy: ctx.userId,
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
          sessionId: ctx.session?.sessionToken,
        },
      })

      return organization
    }),

  // Get organization members
  getMembers: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      role: z.string().optional(),
      status: z.enum(['pending', 'active', 'suspended']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No organization context',
        })
      }

      const { limit, offset, role, status } = input

      const members = await ctx.prisma.member.findMany({
        where: {
          organizationId: ctx.tenantId,
          ...(role && { role }),
          ...(status && { status }),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              lastLoginAt: true,
              emailVerified: true,
              twoFactorEnabled: true,
            },
          },
        },
        orderBy: {
          joinedAt: 'desc',
        },
        take: limit,
        skip: offset,
      })

      const total = await ctx.prisma.member.count({
        where: {
          organizationId: ctx.tenantId,
          ...(role && { role }),
          ...(status && { status }),
        },
      })

      return {
        members,
        total,
        hasMore: offset + limit < total,
      }
    }),

  // Invite member
  inviteMember: adminProcedure
    .input(inviteMemberSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No organization context',
        })
      }

      const { email, role, departmentId, message } = input

      // Check if user is already a member
      const existingMember = await ctx.prisma.member.findFirst({
        where: {
          organizationId: ctx.tenantId,
          user: {
            email,
          },
        },
      })

      if (existingMember) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User is already a member of this organization',
        })
      }

      // Generate invitation token
      const token = generateSecureToken()

      const invitation = await ctx.prisma.invitation.create({
        data: {
          email,
          organizationId: ctx.tenantId,
          role,
          token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          invitedBy: ctx.userId!,
        },
      })

      // Get organization details for email
      const organization = await ctx.prisma.organization.findUnique({
        where: { id: ctx.tenantId },
      })

      if (!organization) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found',
        })
      }

      // Send invitation email
      const inviteLink = `${process.env.BETTER_AUTH_URL}/invite?token=${token}`
      
      await emailService.sendEmail({
        to: email,
        subject: `Invitation to join ${organization.name}`,
        html: `
          <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">MLPipes Auth</h1>
            </div>
            <div style="padding: 40px 30px; background: white;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0;">You're Invited!</h2>
              <p style="color: #6b7280; line-height: 1.6; margin: 0 0 20px 0;">
                You've been invited to join <strong>${organization.name}</strong> as a <strong>${role}</strong>.
              </p>
              ${message ? `<p style="color: #6b7280; line-height: 1.6; margin: 0 0 20px 0; font-style: italic;">"${message}"</p>` : ''}
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteLink}" style="display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Accept Invitation
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 14px; margin: 20px 0 0 0;">
                This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
          </div>
        `,
      })

      // Create audit log
      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.userId,
          organizationId: ctx.tenantId,
          action: 'MEMBER_INVITED',
          resource: 'MEMBER',
          details: {
            email,
            role,
            departmentId,
            invitedBy: ctx.userId,
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
          sessionId: ctx.session?.sessionToken,
        },
      })

      return {
        success: true,
        message: 'Invitation sent successfully',
        invitationId: invitation.id,
      }
    }),

  // Update member
  updateMember: adminProcedure
    .input(z.object({
      memberId: z.string(),
    }).merge(updateMemberSchema))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No organization context',
        })
      }

      const { memberId, specialties, ...updateData } = input

      const member = await ctx.prisma.member.update({
        where: {
          id: memberId,
          organizationId: ctx.tenantId,
        },
        data: {
          ...updateData,
          ...(specialties && {
            specialties: JSON.stringify(specialties),
          }),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      })

      // Create audit log
      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.userId,
          organizationId: ctx.tenantId,
          action: 'MEMBER_UPDATED',
          resource: 'MEMBER',
          resourceId: memberId,
          details: {
            changes: input,
            updatedBy: ctx.userId,
            memberEmail: member.user.email,
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
          sessionId: ctx.session?.sessionToken,
        },
      })

      return member
    }),

  // Remove member
  removeMember: adminProcedure
    .input(z.object({
      memberId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No organization context',
        })
      }

      const { memberId } = input

      // Get member details before deletion
      const member = await ctx.prisma.member.findUnique({
        where: {
          id: memberId,
          organizationId: ctx.tenantId,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      })

      if (!member) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found',
        })
      }

      // Delete member
      await ctx.prisma.member.delete({
        where: { id: memberId },
      })

      // Create audit log
      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.userId,
          organizationId: ctx.tenantId,
          action: 'MEMBER_REMOVED',
          resource: 'MEMBER',
          resourceId: memberId,
          details: {
            removedBy: ctx.userId,
            memberEmail: member.user.email,
            memberRole: member.role,
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
          sessionId: ctx.session?.sessionToken,
        },
      })

      return {
        success: true,
        message: 'Member removed successfully',
      }
    }),

  // Update compliance settings
  updateComplianceSettings: adminProcedure
    .input(complianceSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No organization context',
        })
      }

      const organization = await ctx.prisma.organization.update({
        where: { id: ctx.tenantId },
        data: {
          complianceSettings: JSON.stringify(input),
          sessionTimeout: input.sessionTimeout,
          auditRetentionDays: input.auditRetentionDays,
          mfaRequired: input.mfaRequired,
          updatedAt: new Date(),
        },
      })

      // Create audit log
      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.userId,
          organizationId: ctx.tenantId,
          action: 'COMPLIANCE_SETTINGS_UPDATED',
          resource: 'ORGANIZATION',
          resourceId: ctx.tenantId,
          details: {
            settings: input,
            updatedBy: ctx.userId,
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
          sessionId: ctx.session?.sessionToken,
        },
      })

      return organization
    }),

  // Get organization stats
  getStats: adminProcedure
    .query(async ({ ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No organization context',
        })
      }

      // Get basic counts
      const [userCount, memberCount, activeSessionCount, oauthClientCount] = await Promise.all([
        ctx.prisma.user.count({
          where: { organizationId: ctx.tenantId },
        }),
        ctx.prisma.member.count({
          where: { organizationId: ctx.tenantId, status: 'active' },
        }),
        ctx.prisma.session.count({
          where: {
            organizationId: ctx.tenantId,
            expires: { gt: new Date() },
          },
        }),
        ctx.prisma.oAuthClient.count({
          where: { organizationId: ctx.tenantId },
        }),
      ])

      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const recentLogins = await ctx.prisma.auditLog.count({
        where: {
          organizationId: ctx.tenantId,
          action: 'LOGIN_SUCCESS',
          timestamp: { gte: thirtyDaysAgo },
        },
      })

      const failedLogins = await ctx.prisma.auditLog.count({
        where: {
          organizationId: ctx.tenantId,
          action: 'LOGIN_FAILED',
          timestamp: { gte: thirtyDaysAgo },
        },
      })

      return {
        userCount,
        memberCount,
        activeSessionCount,
        oauthClientCount,
        recentLogins,
        failedLogins,
        successRate: recentLogins + failedLogins > 0 
          ? Math.round((recentLogins / (recentLogins + failedLogins)) * 100)
          : 100,
      }
    }),
})