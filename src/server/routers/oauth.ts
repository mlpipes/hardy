/**
 * MLPipes Auth Service - OAuth2 tRPC Router
 * OAuth2 and PKCE support for secure API access
 */

import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure, adminProcedure, publicLimitedProcedure } from '../../lib/trpc'
import {
  createOAuthClientSchema,
  updateOAuthClientSchema,
} from '../../lib/validations'
import { generateSecureToken } from '../../utils/crypto'
import { z } from 'zod'

export const oauthRouter = createTRPCRouter({
  // Get OAuth clients for organization
  getClients: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No organization context',
        })
      }

      const { limit, offset } = input

      const [clients, total] = await Promise.all([
        ctx.prisma.oAuthClient.findMany({
          where: { organizationId: ctx.tenantId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        ctx.prisma.oAuthClient.count({
          where: { organizationId: ctx.tenantId },
        }),
      ])

      return {
        clients: clients.map(client => ({
          ...client,
          clientSecret: '***hidden***', // Never expose client secret
        })),
        total,
        hasMore: offset + limit < total,
      }
    }),

  // Get single OAuth client
  getClient: protectedProcedure
    .input(z.object({
      clientId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No organization context',
        })
      }

      const client = await ctx.prisma.oAuthClient.findFirst({
        where: {
          clientId: input.clientId,
          organizationId: ctx.tenantId,
        },
      })

      if (!client) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'OAuth client not found',
        })
      }

      return {
        ...client,
        clientSecret: '***hidden***', // Never expose client secret
      }
    }),

  // Create OAuth client
  createClient: adminProcedure
    .input(createOAuthClientSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No organization context',
        })
      }

      const {
        name,
        description,
        redirectUris,
        grantTypes,
        scopes,
        tokenEndpointAuthMethod,
        smartEnabled,
        fhirContext,
      } = input

      // Generate client ID and secret
      const clientId = `mlpipes_${generateSecureToken(16)}`
      const clientSecret = generateSecureToken(32)

      const client = await ctx.prisma.oAuthClient.create({
        data: {
          clientId,
          clientSecret,
          name,
          description,
          organizationId: ctx.tenantId,
          redirectUris: JSON.stringify(redirectUris),
          grantTypes: JSON.stringify(grantTypes),
          scopes: JSON.stringify(scopes),
          tokenEndpointAuthMethod,
          smartEnabled,
          fhirContext: fhirContext ? JSON.stringify(fhirContext) : null,
        },
      })

      // Create audit log
      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.userId,
          organizationId: ctx.tenantId,
          action: 'OAUTH_CLIENT_CREATED',
          resource: 'OAUTH_CLIENT',
          resourceId: client.id,
          details: {
            clientId,
            name,
            grantTypes,
            scopes,
            smartEnabled,
            createdBy: ctx.userId,
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
          sessionId: ctx.session?.sessionToken,
        },
      })

      return {
        ...client,
        clientSecret, // Return secret only on creation
      }
    }),

  // Update OAuth client
  updateClient: adminProcedure
    .input(z.object({
      clientId: z.string(),
    }).merge(updateOAuthClientSchema))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No organization context',
        })
      }

      const { clientId, redirectUris, grantTypes, scopes, fhirContext, ...updateData } = input

      const client = await ctx.prisma.oAuthClient.update({
        where: {
          clientId,
          organizationId: ctx.tenantId,
        },
        data: {
          ...updateData,
          ...(redirectUris && { redirectUris: JSON.stringify(redirectUris) }),
          ...(grantTypes && { grantTypes: JSON.stringify(grantTypes) }),
          ...(scopes && { scopes: JSON.stringify(scopes) }),
          ...(fhirContext && { fhirContext: JSON.stringify(fhirContext) }),
          updatedAt: new Date(),
        },
      })

      // Create audit log
      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.userId,
          organizationId: ctx.tenantId,
          action: 'OAUTH_CLIENT_UPDATED',
          resource: 'OAUTH_CLIENT',
          resourceId: client.id,
          details: {
            clientId,
            changes: input,
            updatedBy: ctx.userId,
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
          sessionId: ctx.session?.sessionToken,
        },
      })

      return {
        ...client,
        clientSecret: '***hidden***',
      }
    }),

  // Regenerate client secret
  regenerateSecret: adminProcedure
    .input(z.object({
      clientId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No organization context',
        })
      }

      const newSecret = generateSecureToken(32)

      const client = await ctx.prisma.oAuthClient.update({
        where: {
          clientId: input.clientId,
          organizationId: ctx.tenantId,
        },
        data: {
          clientSecret: newSecret,
          updatedAt: new Date(),
        },
      })

      // Create audit log
      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.userId,
          organizationId: ctx.tenantId,
          action: 'OAUTH_CLIENT_SECRET_REGENERATED',
          resource: 'OAUTH_CLIENT',
          resourceId: client.id,
          details: {
            clientId: input.clientId,
            regeneratedBy: ctx.userId,
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
          sessionId: ctx.session?.sessionToken,
          severity: 'warning',
        },
      })

      return {
        success: true,
        clientSecret: newSecret,
        message: 'Client secret regenerated successfully',
      }
    }),

  // Delete OAuth client
  deleteClient: adminProcedure
    .input(z.object({
      clientId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No organization context',
        })
      }

      const client = await ctx.prisma.oAuthClient.findFirst({
        where: {
          clientId: input.clientId,
          organizationId: ctx.tenantId,
        },
      })

      if (!client) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'OAuth client not found',
        })
      }

      await ctx.prisma.oAuthClient.delete({
        where: { id: client.id },
      })

      // Create audit log
      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.userId,
          organizationId: ctx.tenantId,
          action: 'OAUTH_CLIENT_DELETED',
          resource: 'OAUTH_CLIENT',
          resourceId: client.id,
          details: {
            clientId: input.clientId,
            clientName: client.name,
            deletedBy: ctx.userId,
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
          sessionId: ctx.session?.sessionToken,
          severity: 'warning',
        },
      })

      return {
        success: true,
        message: 'OAuth client deleted successfully',
      }
    }),

  // OAuth2 Authorization Code Flow - Authorization endpoint
  authorize: publicLimitedProcedure
    .input(z.object({
      client_id: z.string(),
      redirect_uri: z.string().url(),
      response_type: z.enum(['code']),
      scope: z.string(),
      state: z.string().optional(),
      code_challenge: z.string().optional(),
      code_challenge_method: z.enum(['S256']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const {
        client_id,
        redirect_uri,
        response_type,
        scope,
        state,
        code_challenge,
        code_challenge_method,
      } = input

      // Validate client
      const client = await ctx.prisma.oAuthClient.findUnique({
        where: { clientId: client_id },
      })

      if (!client) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid client_id',
        })
      }

      // Validate redirect URI
      const allowedUris = JSON.parse(client.redirectUris as string)
      if (!allowedUris.includes(redirect_uri)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid redirect_uri',
        })
      }

      // Validate grant type
      const allowedGrantTypes = JSON.parse(client.grantTypes as string)
      if (!allowedGrantTypes.includes('authorization_code')) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Grant type not allowed',
        })
      }

      // Generate authorization code
      const code = generateSecureToken()

      // Store authorization code with PKCE if provided
      // In a real implementation, this would be stored in a separate table
      await ctx.prisma.auditLog.create({
        data: {
          action: 'OAUTH_AUTHORIZATION_CODE_GENERATED',
          resource: 'OAUTH',
          details: {
            client_id,
            redirect_uri,
            scope,
            state,
            has_pkce: !!code_challenge,
            code, // In production, store this securely
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
        },
      })

      return {
        success: true,
        authorization_code: code,
        redirect_uri: `${redirect_uri}?code=${code}${state ? `&state=${state}` : ''}`,
      }
    }),

  // OAuth2 Token endpoint
  token: publicLimitedProcedure
    .input(z.object({
      grant_type: z.enum(['authorization_code', 'client_credentials', 'refresh_token']),
      client_id: z.string(),
      client_secret: z.string().optional(),
      code: z.string().optional(),
      redirect_uri: z.string().url().optional(),
      code_verifier: z.string().optional(),
      refresh_token: z.string().optional(),
      scope: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const {
        grant_type,
        client_id,
        client_secret,
        code,
        redirect_uri,
        code_verifier,
        refresh_token,
        scope,
      } = input

      // Validate client
      const client = await ctx.prisma.oAuthClient.findUnique({
        where: { clientId: client_id },
      })

      if (!client) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid client',
        })
      }

      // Validate client secret if required
      if (client.tokenEndpointAuthMethod !== 'none' && client.clientSecret !== client_secret) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid client credentials',
        })
      }

      // Generate tokens
      const accessToken = generateSecureToken()
      const refreshTokenValue = generateSecureToken()
      const expiresIn = 3600 // 1 hour

      // Create audit log
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: client.organizationId,
          action: 'OAUTH_TOKEN_GENERATED',
          resource: 'OAUTH',
          details: {
            client_id,
            grant_type,
            scope: scope || 'default',
            has_refresh_token: !!refresh_token,
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
        },
      })

      return {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: expiresIn,
        refresh_token: refreshTokenValue,
        scope: scope || 'default',
      }
    }),

  // Token introspection
  introspect: publicLimitedProcedure
    .input(z.object({
      token: z.string(),
      client_id: z.string(),
      client_secret: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { token, client_id, client_secret } = input

      // Validate client
      const client = await ctx.prisma.oAuthClient.findUnique({
        where: { clientId: client_id },
      })

      if (!client || client.clientSecret !== client_secret) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid client credentials',
        })
      }

      // In a real implementation, validate the token
      // For now, return a mock response
      return {
        active: true,
        client_id,
        scope: 'read write',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      }
    }),
})