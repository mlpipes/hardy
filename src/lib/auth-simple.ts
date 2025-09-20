/**
 * Hardy Auth Service - Simplified Authentication Configuration
 * Basic authentication setup for development
 */

import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { PrismaClient } from "@prisma/client"

// Initialize Prisma with the DATABASE_URL
const prisma = new PrismaClient()

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Base URL configuration
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3001",

  // Secret for encryption and signing
  secret: process.env.BETTER_AUTH_SECRET || "hardy-auth-dev-secret-key-change-in-production-32-chars",

  // Email & Password Authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Disabled for development
  },

  // Simple session configuration
  session: {
    expiresIn: 60 * 30, // 30 minutes
    updateAge: 60 * 5,  // Update session every 5 minutes
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },

  // Trusted origins for CORS
  trustedOrigins: [
    "http://localhost:3001",
  ],
})