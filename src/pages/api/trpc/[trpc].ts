/**
 * MLPipes Auth Service - tRPC API Handler
 * Next.js API route for tRPC
 */

import { createNextApiHandler } from '@trpc/server/adapters/next'
import { appRouter } from '../../../server/routers'
import { createTRPCContext } from '../../../lib/trpc'

export default createNextApiHandler({
  router: appRouter,
  createContext: createTRPCContext,
  onError:
    process.env.NODE_ENV === 'development'
      ? ({ path, error }) => {
          console.error(
            `❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`,
          )
        }
      : undefined,
})