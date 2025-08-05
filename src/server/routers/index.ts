/**
 * MLPipes Auth Service - Main tRPC Router
 * Combines all tRPC routers with proper organization
 */

import { createTRPCRouter } from '../../lib/trpc'
import { authRouter } from './auth'
import { organizationRouter } from './organization'
import { adminRouter } from './admin'
import { oauthRouter } from './oauth'
import { fhirRouter } from './fhir'

export const appRouter = createTRPCRouter({
  auth: authRouter,
  organization: organizationRouter,
  admin: adminRouter,
  oauth: oauthRouter,
  fhir: fhirRouter,
})

export type AppRouter = typeof appRouter