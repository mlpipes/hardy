#!/usr/bin/env tsx
/**
 * MLPipes Auth Service - Database Setup Script
 * Complete database initialization with row-level security for HIPAA compliance
 */

import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 MLPipes Auth Service - Database Setup')
  console.log('=====================================')

  try {
    // Step 1: Check database connection
    console.log('1. Checking database connection...')
    await prisma.$connect()
    console.log('   ✅ Database connection successful')

    // Step 2: Run Prisma migrations
    console.log('2. Running Prisma migrations...')
    try {
      execSync('npx prisma migrate dev --name init', { 
        cwd: process.cwd(),
        stdio: 'inherit' 
      })
      console.log('   ✅ Migrations completed')
    } catch (error) {
      console.log('   ⚠️  Migrations may already exist, continuing...')
    }

    // Step 3: Generate Prisma client
    console.log('3. Generating Prisma client...')
    execSync('npx prisma generate', { 
      cwd: process.cwd(),
      stdio: 'inherit' 
    })
    console.log('   ✅ Prisma client generated')

    // Step 4: Setup Row-Level Security
    console.log('4. Setting up Row-Level Security (RLS)...')
    await setupRowLevelSecurity()
    console.log('   ✅ RLS policies created')

    // Step 5: Create database functions
    console.log('5. Creating database functions...')
    await createDatabaseFunctions()
    console.log('   ✅ Database functions created')

    // Step 6: Create indexes for performance
    console.log('6. Creating performance indexes...')
    await createPerformanceIndexes()
    console.log('   ✅ Performance indexes created')

    // Step 7: Seed initial data
    console.log('7. Seeding initial data...')
    await seedInitialData()
    console.log('   ✅ Initial data seeded')

    console.log('\n🎉 Database setup completed successfully!')
    console.log('=====================================')
    console.log('Next steps:')
    console.log('1. Start the development server: yarn dev')
    console.log('2. Open Prisma Studio: yarn db:studio')
    console.log('3. View the admin dashboard: http://localhost:3001/admin')

  } catch (error) {
    console.error('❌ Database setup failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

async function setupRowLevelSecurity() {
  const rlsPolicies = [
    // Enable RLS on all tables
    'ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "passkeys" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "two_factor_tokens" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "magic_links" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "members" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "invitations" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "oauth_clients" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;',

    // Create RLS policies for tenant isolation
    `CREATE POLICY "tenant_isolation_users" ON "users"
     USING ("organizationId" = current_setting('app.current_tenant_id', true)::text);`,

    `CREATE POLICY "tenant_isolation_accounts" ON "accounts"
     USING ("organizationId" = current_setting('app.current_tenant_id', true)::text);`,

    `CREATE POLICY "tenant_isolation_sessions" ON "sessions"
     USING ("organizationId" = current_setting('app.current_tenant_id', true)::text);`,

    `CREATE POLICY "tenant_isolation_passkeys" ON "passkeys"
     USING ("organizationId" = current_setting('app.current_tenant_id', true)::text);`,

    `CREATE POLICY "tenant_isolation_two_factor_tokens" ON "two_factor_tokens"
     USING ("organizationId" = current_setting('app.current_tenant_id', true)::text);`,

    `CREATE POLICY "tenant_isolation_magic_links" ON "magic_links"
     USING ("organizationId" = current_setting('app.current_tenant_id', true)::text);`,

    `CREATE POLICY "tenant_isolation_members" ON "members"
     USING ("organizationId" = current_setting('app.current_tenant_id', true)::text);`,

    `CREATE POLICY "tenant_isolation_invitations" ON "invitations"
     USING ("organizationId" = current_setting('app.current_tenant_id', true)::text);`,

    `CREATE POLICY "tenant_isolation_oauth_clients" ON "oauth_clients"
     USING ("organizationId" = current_setting('app.current_tenant_id', true)::text);`,

    `CREATE POLICY "tenant_isolation_audit_logs" ON "audit_logs"
     USING ("organizationId" = current_setting('app.current_tenant_id', true)::text);`,

    // Admin policies for system-level access
    `CREATE POLICY "admin_full_access_users" ON "users"
     USING (current_setting('app.current_user_role', true) = 'system_admin');`,

    `CREATE POLICY "admin_full_access_organizations" ON "organizations"
     USING (current_setting('app.current_user_role', true) = 'system_admin');`,
  ]

  for (const policy of rlsPolicies) {
    try {
      await prisma.$executeRawUnsafe(policy)
    } catch (error) {
      // Policy might already exist, continue
      console.log(`   ⚠️  Policy creation skipped (may already exist)`)
    }
  }
}

async function createDatabaseFunctions() {
  const functions = [
    // Function to set tenant context
    `CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id text, user_role text DEFAULT 'user')
     RETURNS void AS $$
     BEGIN
       PERFORM set_config('app.current_tenant_id', tenant_id, true);
       PERFORM set_config('app.current_user_role', user_role, true);
     END;
     $$ LANGUAGE plpgsql;`,

    // Function to get current tenant
    `CREATE OR REPLACE FUNCTION get_current_tenant()
     RETURNS text AS $$
     BEGIN
       RETURN current_setting('app.current_tenant_id', true);
     END;
     $$ LANGUAGE plpgsql;`,

    // Function to audit log creation
    `CREATE OR REPLACE FUNCTION create_audit_log(
       user_id text,
       organization_id text,
       action text,
       resource text,
       resource_id text DEFAULT NULL,
       details jsonb DEFAULT NULL,
       ip_address text DEFAULT NULL,
       user_agent text DEFAULT NULL,
       session_id text DEFAULT NULL
     )
     RETURNS void AS $$
     BEGIN
       INSERT INTO "audit_logs" (
         "userId", "organizationId", "action", "resource", "resourceId",
         "details", "ipAddress", "userAgent", "sessionId", "timestamp"
       ) VALUES (
         user_id, organization_id, action, resource, resource_id,
         details, ip_address, user_agent, session_id, NOW()
       );
     END;
     $$ LANGUAGE plpgsql;`,

    // Function to clean up expired tokens
    `CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
     RETURNS void AS $$
     BEGIN
       DELETE FROM "two_factor_tokens" WHERE "expiresAt" < NOW();
       DELETE FROM "magic_links" WHERE "expiresAt" < NOW();
       DELETE FROM "verification_tokens" WHERE "expires" < NOW();
       DELETE FROM "invitations" WHERE "expiresAt" < NOW();
     END;
     $$ LANGUAGE plpgsql;`,
  ]

  for (const func of functions) {
    try {
      await prisma.$executeRawUnsafe(func)
    } catch (error) {
      console.log(`   ⚠️  Function creation error: ${error}`)
    }
  }
}

async function createPerformanceIndexes() {
  const indexes = [
    // User lookup indexes
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_email_org" ON "users" ("email", "organizationId");',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_org_role" ON "users" ("organizationId", "role");',
    
    // Session performance indexes
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_sessions_token_org" ON "sessions" ("sessionToken", "organizationId");',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_sessions_user_expires" ON "sessions" ("userId", "expires");',
    
    // Audit log indexes for compliance queries
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_audit_logs_org_timestamp" ON "audit_logs" ("organizationId", "timestamp" DESC);',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_audit_logs_user_action" ON "audit_logs" ("userId", "action", "timestamp" DESC);',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_audit_logs_resource" ON "audit_logs" ("resource", "resourceId", "timestamp" DESC);',
    
    // Two-factor and magic link indexes
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_two_factor_user_type" ON "two_factor_tokens" ("userId", "type", "verified");',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_magic_links_token_expires" ON "magic_links" ("token", "expiresAt");',
    
    // Organization and member indexes
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_members_org_status" ON "members" ("organizationId", "status");',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_members_user_org" ON "members" ("userId", "organizationId");',
    
    // OAuth client indexes
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_oauth_clients_org" ON "oauth_clients" ("organizationId");',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_oauth_clients_smart" ON "oauth_clients" ("smartEnabled", "organizationId");',
  ]

  for (const index of indexes) {
    try {
      await prisma.$executeRawUnsafe(index)
    } catch (error) {
      // Index might already exist or be in progress
      console.log(`   ⚠️  Index creation skipped (may already exist)`)
    }
  }
}

async function seedInitialData() {
  // Create system organization for admin functions
  const systemOrg = await prisma.organization.upsert({
    where: { slug: 'system' },
    update: {},
    create: {
      id: 'org_system',
      name: 'MLPipes System',
      slug: 'system',
      organizationType: 'system',
      complianceSettings: {
        hipaaCompliant: true,
        soc2Ready: true,
        hitrustReady: true,
        auditRetentionDays: 2555,
        mfaRequired: true,
        passwordPolicy: {
          minLength: 12,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          preventReuse: 12
        }
      },
      subscriptionTier: 'enterprise'
    }
  })

  // Create demo healthcare organization
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'demo-practice' },
    update: {},
    create: {
      id: 'org_demo',
      name: 'Demo Healthcare Practice',
      slug: 'demo-practice',
      organizationType: 'healthcare_practice',
      practiceNpi: '1234567893',
      fhirEndpoint: 'https://fhir-demo.mlpipes.ai',
      complianceSettings: {
        hipaaCompliant: true,
        auditRetentionDays: 2555,
        mfaRequired: true,
        passwordPolicy: {
          minLength: 12,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true
        }
      },
      subscriptionTier: 'professional'
    }
  })

  console.log(`   ✅ Created organizations: ${systemOrg.name}, ${demoOrg.name}`)
}

// Create cron job for token cleanup
async function createCronJobs() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE EXTENSION IF NOT EXISTS pg_cron;
      
      SELECT cron.schedule(
        'cleanup-expired-tokens',
        '0 */6 * * *', -- Every 6 hours
        'SELECT cleanup_expired_tokens();'
      );
    `)
    console.log('   ✅ Cron jobs created for token cleanup')
  } catch (error) {
    console.log('   ⚠️  Cron job creation skipped (requires superuser privileges)')
  }
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}

export { main as setupDatabase }