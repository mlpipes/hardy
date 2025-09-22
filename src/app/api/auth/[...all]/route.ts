/**
 * Better Auth API Route Handler
 * This is the main route that handles all Better Auth API endpoints
 */

import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"

export const { POST, GET } = toNextJsHandler(auth)