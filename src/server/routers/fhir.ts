/**
 * Hardy Auth Service - FHIR/SMART on FHIR tRPC Router
 * Healthcare-specific authentication and authorization
 */

import { TRPCError } from '@trpc/server'
import { createTRPCRouter, publicLimitedProcedure, protectedProcedure } from '../../lib/trpc'
import {
  smartLaunchSchema,
  smartTokenSchema,
} from '../../lib/validations'
import { generateSecureToken } from '../../utils/crypto'
import { z } from 'zod'

export const fhirRouter = createTRPCRouter({
  // FHIR Capability Statement
  getMetadata: publicLimitedProcedure
    .query(async ({ ctx }) => {
      const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3001'
      
      return {
        resourceType: 'CapabilityStatement',
        id: 'hardy-auth-capability',
        url: `${baseUrl}/api/fhir/metadata`,
        version: '1.0.0',
        name: 'Hardy Auth Service',
        title: 'Hardy Authentication Service FHIR Capability Statement',
        status: 'active',
        experimental: false,
        date: new Date().toISOString(),
        publisher: 'Hardy',
        contact: [
          {
            name: 'Hardy Support',
            telecom: [
              {
                system: 'email',
                value: 'support@mlpipes.ai',
              },
            ],
          },
        ],
        description: 'Hardy Auth Service supports SMART on FHIR authentication and authorization.',
        fhirVersion: '4.0.1',
        format: ['json'],
        rest: [
          {
            mode: 'server',
            security: {
              extension: [
                {
                  url: 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris',
                  extension: [
                    {
                      url: 'token',
                      valueUri: `${baseUrl}/api/fhir/token`,
                    },
                    {
                      url: 'authorize',
                      valueUri: `${baseUrl}/api/fhir/authorize`,
                    },
                    {
                      url: 'introspect',
                      valueUri: `${baseUrl}/api/oauth/introspect`,
                    },
                  ],
                },
              ],
              service: [
                {
                  coding: [
                    {
                      system: 'http://terminology.hl7.org/CodeSystem/restful-security-service',
                      code: 'SMART-on-FHIR',
                      display: 'SMART on FHIR',
                    },
                  ],
                },
              ],
              description: 'SMART on FHIR compliant authorization',
            },
            interaction: [
              {
                code: 'transaction',
                documentation: 'Supports SMART App Launch Framework',
              },
            ],
          },
        ],
        smartAppLaunch: {
          capabilities: [
            'launch-ehr',
            'launch-standalone',
            'client-public',
            'client-confidential-symmetric',
            'sso-openid-connect',
            'context-patient',
            'context-encounter',
            'context-practitioner',
            'permission-patient',
            'permission-user',
            'permission-offline',
          ],
        },
      }
    }),

  // SMART App Launch - Authorization endpoint
  authorize: publicLimitedProcedure
    .input(smartLaunchSchema)
    .mutation(async ({ ctx, input }) => {
      const {
        iss,
        launch,
        aud,
        client_id,
        redirect_uri,
        scope,
        state,
        code_challenge,
        code_challenge_method,
      } = input

      // Validate FHIR server
      if (!iss.includes('fhir')) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid FHIR server URL',
        })
      }

      // Validate OAuth client with SMART capabilities
      const client = await ctx.prisma.oAuthClient.findFirst({
        where: {
          clientId: client_id,
          smartEnabled: true,
        },
      })

      if (!client) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid or non-SMART client',
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

      // Parse and validate SMART scopes
      const smartScopes = scope.split(' ')
      const validScopes = [
        'openid', 'profile', 'email', 'phone', 'address',
        'launch', 'launch/patient', 'launch/encounter',
        'patient/*', 'user/*', 'system/*',
        'patient/*.read', 'user/*.read', 'system/*.read',
        'patient/*.write', 'user/*.write', 'system/*.write',
        'offline_access',
      ]

      const invalidScopes = smartScopes.filter(s => !validScopes.some(vs => 
        s === vs || s.match(new RegExp(vs.replace('*', '.*')))
      ))

      if (invalidScopes.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invalid scopes: ${invalidScopes.join(', ')}`,
        })
      }

      // Generate authorization code with SMART context
      const authCode = generateSecureToken()

      // Store SMART launch context
      const smartContext = {
        patient: launch ? 'patient-123' : undefined, // In real implementation, get from launch context
        encounter: launch ? 'encounter-456' : undefined,
        practitioner: 'practitioner-789',
        fhirServer: iss,
        launchId: launch,
      }

      // Create audit log with SMART context
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: client.organizationId,
          action: 'SMART_AUTHORIZATION_INITIATED',
          resource: 'FHIR',
          details: {
            client_id,
            fhir_server: iss,
            launch_id: launch,
            scope,
            smart_context: smartContext,
            has_pkce: !!code_challenge,
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
        },
      })

      return {
        success: true,
        authorization_code: authCode,
        smart_context: smartContext,
        redirect_url: `${redirect_uri}?code=${authCode}&state=${state}`,
      }
    }),

  // SMART Token endpoint
  token: publicLimitedProcedure
    .input(smartTokenSchema)
    .mutation(async ({ ctx, input }) => {
      const {
        grant_type,
        code,
        redirect_uri,
        client_id,
        client_secret,
        code_verifier,
        scope,
      } = input

      // Validate client
      const client = await ctx.prisma.oAuthClient.findFirst({
        where: {
          clientId: client_id,
          smartEnabled: true,
        },
      })

      if (!client) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid SMART client',
        })
      }

      // Validate client authentication
      if (client.tokenEndpointAuthMethod !== 'none' && client.clientSecret !== client_secret) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid client credentials',
        })
      }

      // Generate SMART-compliant tokens
      const accessToken = generateSecureToken()
      const refreshToken = generateSecureToken()
      const idToken = generateSecureToken() // In real implementation, this would be a JWT

      // SMART context (would be retrieved from stored auth code)
      const smartContext = {
        patient: 'patient-123',
        encounter: 'encounter-456',
        practitioner: 'practitioner-789',
        fhirUser: 'Practitioner/practitioner-789',
      }

      // Create audit log
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: client.organizationId,
          action: 'SMART_TOKEN_GENERATED',
          resource: 'FHIR',
          details: {
            client_id,
            grant_type,
            scope: scope || 'patient/*.read',
            smart_context: smartContext,
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
        },
      })

      return {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: scope || 'patient/*.read',
        id_token: idToken,
        refresh_token: refreshToken,
        patient: smartContext.patient,
        encounter: smartContext.encounter,
        fhirUser: smartContext.fhirUser,
        need_patient_banner: true,
        smart_style_url: `${process.env.BETTER_AUTH_URL}/smart-style.json`,
      }
    }),

  // Get SMART style information
  getSmartStyle: publicLimitedProcedure
    .query(async ({ ctx }) => {
      return {
        color_background: '#f8f9fa',
        color_error: '#dc3545',
        color_highlight: '#007bff',
        color_modal_backdrop: 'rgba(0,0,0,0.5)',
        color_success: '#28a745',
        color_text: '#212529',
        dim_border_radius: '0.375rem',
        dim_font_size: '1rem',
        dim_spacing_size: '1rem',
        font_family_body: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        font_family_heading: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }
    }),

  // Patient context endpoint
  getPatientContext: protectedProcedure
    .input(z.object({
      access_token: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // In a real implementation, validate the access token and return patient context
      // This is a simplified example
      
      return {
        resourceType: 'Patient',
        id: 'patient-123',
        active: true,
        name: [
          {
            use: 'official',
            family: 'Doe',
            given: ['John'],
          },
        ],
        telecom: [
          {
            system: 'email',
            value: 'john.doe@example.com',
          },
        ],
        gender: 'male',
        birthDate: '1980-01-01',
        address: [
          {
            use: 'home',
            line: ['123 Main St'],
            city: 'Anytown',
            state: 'NY',
            postalCode: '12345',
            country: 'US',
          },
        ],
      }
    }),

  // Practitioner context endpoint  
  getPractitionerContext: protectedProcedure
    .input(z.object({
      access_token: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // In a real implementation, validate the access token and return practitioner context
      
      return {
        resourceType: 'Practitioner',
        id: 'practitioner-789',
        active: true,
        name: [
          {
            use: 'official',
            family: 'Smith',
            given: ['Jane'],
            prefix: ['Dr.'],
          },
        ],
        telecom: [
          {
            system: 'email',
            value: 'dr.smith@hospital.example.com',
          },
        ],
        gender: 'female',
        qualification: [
          {
            code: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v2-0360',
                  code: 'MD',
                  display: 'Doctor of Medicine',
                },
              ],
            },
          },
        ],
      }
    }),

  // SMART app configuration
  getSmartConfiguration: publicLimitedProcedure
    .input(z.object({
      organization_id: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3001'
      
      let organization = null
      if (input.organization_id) {
        organization = await ctx.prisma.organization.findUnique({
          where: { id: input.organization_id },
        })
      }

      return {
        authorization_endpoint: `${baseUrl}/api/fhir/authorize`,
        token_endpoint: `${baseUrl}/api/fhir/token`,
        introspection_endpoint: `${baseUrl}/api/oauth/introspect`,
        registration_endpoint: `${baseUrl}/api/oauth/register`,
        scopes_supported: [
          'openid',
          'profile',
          'email',
          'launch',
          'launch/patient',
          'launch/encounter',
          'patient/*.read',
          'patient/*.write',
          'user/*.read',
          'user/*.write',
          'system/*.read',
          'system/*.write',
          'offline_access',
        ],
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'client_credentials'],
        code_challenge_methods_supported: ['S256'],
        capabilities: [
          'launch-ehr',
          'launch-standalone',
          'client-public',
          'client-confidential-symmetric',
          'sso-openid-connect',
          'context-patient',
          'context-encounter',
          'context-practitioner',
          'permission-patient',
          'permission-user',
          'permission-offline',
        ],
        organization: organization ? {
          name: organization.name,
          fhir_endpoint: organization.fhirEndpoint,
          smart_style_url: `${baseUrl}/api/fhir/smart-style`,
        } : null,
      }
    }),
})