/**
 * MLPipes Auth Service - Better Auth API Handler
 * Next.js API route for Better Auth
 */

import { toNextJsHandler } from 'better-auth/nextjs'
import { auth } from '../../../lib/auth'

export default toNextJsHandler(auth)