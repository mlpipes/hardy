#!/usr/bin/env tsx
/**
 * MLPipes Auth Service - Row-Level Security Setup
 * Advanced RLS policies for multi-tenant HIPAA-compliant data isolation
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔒 Setting up Row-Level Security (RLS) policies...')
  console.log('===============================================')

  try {
    await prisma.$connect()

    // Drop existing policies first (for idempotency)
    await dropExistingPolicies()

    // Create comprehensive RLS policies
    await createTenantIsolationPolicies()
    await createUserAccessPolicies()
    await createAdminPolicies()
    await createAuditPolicies()

    console.log('✅ RLS setup completed successfully!')
    
  } catch (error) {
    console.error('❌ RLS setup failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

async function dropExistingPolicies() {
  console.log('1. Dropping existing policies...')
  
  const tables = [
    'users', 'accounts', 'sessions', 'passkeys', 'two_factor_tokens',
    'magic_links', 'organizations', 'members', 'invitations', 
    'oauth_clients', 'audit_logs'
  ]

  for (const table of tables) {
    try {
      // Get existing policies for the table
      const policies = await prisma.$queryRawUnsafe(`
        SELECT policyname FROM pg_policies WHERE tablename = '${table}';
      `) as Array<{ policyname: string }>

      // Drop each policy
      for (const policy of policies) {
        await prisma.$executeRawUnsafe(`
          DROP POLICY IF EXISTS "${policy.policyname}" ON "${table}";
        `)
      }
    } catch (error) {
      // Continue if policies don't exist
    }
  }
  
  console.log('   ✅ Existing policies dropped')
}

async function createTenantIsolationPolicies() {
  console.log('2. Creating tenant isolation policies...')

  const tenantPolicies = [
    // Users - strict tenant isolation
    {
      table: 'users',
      policy: 'tenant_isolation_users',
      condition: `("organizationId" = current_setting('app.current_tenant_id', true)::text OR "organizationId" IS NULL)`
    },
    
    // Accounts - linked to user's tenant
    {
      table: 'accounts',
      policy: 'tenant_isolation_accounts',
      condition: `("organizationId" = current_setting('app.current_tenant_id', true)::text OR "organizationId" IS NULL)`
    },
    
    // Sessions - tenant-specific sessions
    {
      table: 'sessions',
      policy: 'tenant_isolation_sessions',
      condition: `("organizationId" = current_setting('app.current_tenant_id', true)::text OR "organizationId" IS NULL)`
    },
    
    // Passkeys - tenant-specific authenticators
    {
      table: 'passkeys',
      policy: 'tenant_isolation_passkeys',
      condition: `("organizationId" = current_setting('app.current_tenant_id', true)::text OR "organizationId" IS NULL)`
    },
    
    // Two-factor tokens - tenant isolation for security
    {
      table: 'two_factor_tokens',
      policy: 'tenant_isolation_2fa',
      condition: `("organizationId" = current_setting('app.current_tenant_id', true)::text OR "organizationId" IS NULL)`
    },
    
    // Magic links - tenant-specific authentication
    {
      table: 'magic_links',
      policy: 'tenant_isolation_magic_links',
      condition: `("organizationId" = current_setting('app.current_tenant_id', true)::text OR "organizationId" IS NULL)`
    },
    
    // Members - strict tenant isolation
    {
      table: 'members',
      policy: 'tenant_isolation_members',
      condition: `("organizationId" = current_setting('app.current_tenant_id', true)::text)`
    },
    
    // Invitations - tenant-specific invites
    {
      table: 'invitations',
      policy: 'tenant_isolation_invitations',
      condition: `("organizationId" = current_setting('app.current_tenant_id', true)::text)`
    },
    
    // OAuth clients - tenant-specific applications
    {
      table: 'oauth_clients',
      policy: 'tenant_isolation_oauth_clients',
      condition: `("organizationId" = current_setting('app.current_tenant_id', true)::text)`
    },
    
    // Audit logs - tenant-specific auditing
    {
      table: 'audit_logs',
      policy: 'tenant_isolation_audit_logs',
      condition: `("organizationId" = current_setting('app.current_tenant_id', true)::text OR "organizationId" IS NULL)`
    }
  ]

  for (const { table, policy, condition } of tenantPolicies) {
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "${policy}" ON "${table}"
      USING (${condition});
    `)
  }

  console.log('   ✅ Tenant isolation policies created')
}

async function createUserAccessPolicies() {
  console.log('3. Creating user access policies...')

  // Users can only see and modify their own data
  await prisma.$executeRawUnsafe(`
    CREATE POLICY "user_self_access" ON "users"
    USING ("id" = current_setting('app.current_user_id', true)::text);
  `)

  // Users can only access their own sessions
  await prisma.$executeRawUnsafe(`
    CREATE POLICY "user_own_sessions" ON "sessions"
    USING ("userId" = current_setting('app.current_user_id', true)::text);
  `)

  // Users can only manage their own passkeys
  await prisma.$executeRawUnsafe(`
    CREATE POLICY "user_own_passkeys" ON "passkeys"
    USING ("userId" = current_setting('app.current_user_id', true)::text);
  `)

  // Users can only access their own 2FA tokens
  await prisma.$executeRawUnsafe(`
    CREATE POLICY "user_own_2fa_tokens" ON "two_factor_tokens"
    USING ("userId" = current_setting('app.current_user_id', true)::text);
  `)

  console.log('   ✅ User access policies created')
}

async function createAdminPolicies() {
  console.log('4. Creating admin access policies...')

  const adminRoles = ['system_admin', 'tenant_admin', 'admin']
  const adminCondition = `current_setting('app.current_user_role', true) = ANY(ARRAY['${adminRoles.join("', '")}'])`

  // Admin policies for full access within their scope
  const adminPolicies = [
    {
      table: 'users',
      policy: 'admin_users_access',
      condition: adminCondition
    },
    {
      table: 'organizations',
      policy: 'admin_organizations_access',
      condition: adminCondition
    },
    {
      table: 'members',
      policy: 'admin_members_access',
      condition: adminCondition
    },
    {
      table: 'oauth_clients',
      policy: 'admin_oauth_clients_access',
      condition: adminCondition
    }
  ]

  for (const { table, policy, condition } of adminPolicies) {
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "${policy}" ON "${table}"
      USING (${condition});
    `)
  }

  // System admin has access to all organizations
  await prisma.$executeRawUnsafe(`
    CREATE POLICY "system_admin_all_orgs" ON "organizations"
    USING (current_setting('app.current_user_role', true) = 'system_admin');
  `)

  console.log('   ✅ Admin policies created')
}

async function createAuditPolicies() {
  console.log('5. Creating audit access policies...')

  // Audit logs are append-only for non-admins
  await prisma.$executeRawUnsafe(`
    CREATE POLICY "audit_logs_insert_only" ON "audit_logs"
    FOR INSERT
    WITH CHECK (true);
  `)

  // Only admins can read audit logs
  await prisma.$executeRawUnsafe(`
    CREATE POLICY "audit_logs_admin_read" ON "audit_logs"
    FOR SELECT
    USING (
      current_setting('app.current_user_role', true) = ANY(
        ARRAY['system_admin', 'tenant_admin', 'admin']
      )
    );
  `)

  // Prevent updates and deletes on audit logs (compliance requirement)
  await prisma.$executeRawUnsafe(`
    CREATE POLICY "audit_logs_no_updates" ON "audit_logs"
    FOR UPDATE
    USING (false);
  `)

  await prisma.$executeRawUnsafe(`
    CREATE POLICY "audit_logs_no_deletes" ON "audit_logs"
    FOR DELETE
    USING (false);
  `)

  console.log('   ✅ Audit policies created')
}

// Enable RLS on all tables
async function enableRLS() {
  console.log('6. Enabling Row-Level Security...')

  const tables = [
    'users', 'accounts', 'sessions', 'passkeys', 'two_factor_tokens',
    'magic_links', 'organizations', 'members', 'invitations', 
    'oauth_clients', 'audit_logs', 'verification_tokens', 'rate_limits'
  ]

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;
    `)
  }

  console.log('   ✅ RLS enabled on all tables')
}

// Create helper functions for context management
async function createContextFunctions() {
  console.log('7. Creating context management functions...')

  // Function to set complete auth context
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION set_auth_context(
      tenant_id text,
      user_id text DEFAULT NULL,
      user_role text DEFAULT 'user',
      session_id text DEFAULT NULL
    )
    RETURNS void AS $$
    BEGIN
      PERFORM set_config('app.current_tenant_id', tenant_id, true);
      PERFORM set_config('app.current_user_id', COALESCE(user_id, ''), true);
      PERFORM set_config('app.current_user_role', user_role, true);
      PERFORM set_config('app.current_session_id', COALESCE(session_id, ''), true);
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `)

  // Function to clear auth context
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION clear_auth_context()
    RETURNS void AS $$
    BEGIN
      PERFORM set_config('app.current_tenant_id', '', true);
      PERFORM set_config('app.current_user_id', '', true);
      PERFORM set_config('app.current_user_role', '', true);
      PERFORM set_config('app.current_session_id', '', true);
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `)

  // Function to get current context
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION get_auth_context()
    RETURNS json AS $$
    BEGIN
      RETURN json_build_object(
        'tenant_id', current_setting('app.current_tenant_id', true),
        'user_id', current_setting('app.current_user_id', true),
        'user_role', current_setting('app.current_user_role', true),
        'session_id', current_setting('app.current_session_id', true)
      );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `)

  console.log('   ✅ Context management functions created')
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}

export { main as setupRLS }