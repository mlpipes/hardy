-- Hardy Auth Migration Script
-- Migrates existing MLPipes Auth data to Hardy Auth naming convention
-- Run this script to migrate from old MLPipes Auth to new Hardy Auth backend

-- This script should be run against the NEW hardy_auth database
-- after copying data from the old mlpipes_auth database

\echo '🏥 Hardy Auth Migration Script'
\echo '=============================='

-- Set up variables
\set OLD_DB 'mlpipes_auth'
\set NEW_DB 'hardy_auth'

-- Connect to the new Hardy Auth database
\c hardy_auth

\echo 'Connected to Hardy Auth database'

-- Create a migration log table to track the migration process
CREATE TABLE IF NOT EXISTS migration_log (
    id SERIAL PRIMARY KEY,
    migration_step TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'started',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    record_count INTEGER
);

-- Log the start of migration
INSERT INTO migration_log (migration_step, status)
VALUES ('Hardy Auth Migration Started', 'started');

-- Function to log migration steps
CREATE OR REPLACE FUNCTION log_migration_step(
    step_name TEXT,
    step_status TEXT DEFAULT 'completed',
    record_count INTEGER DEFAULT NULL,
    error_msg TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    IF step_status = 'completed' THEN
        UPDATE migration_log
        SET status = step_status,
            completed_at = NOW(),
            record_count = COALESCE(record_count, 0)
        WHERE migration_step = step_name AND status = 'started';
    ELSIF step_status = 'error' THEN
        UPDATE migration_log
        SET status = step_status,
            completed_at = NOW(),
            error_message = error_msg
        WHERE migration_step = step_name AND status = 'started';
    ELSE
        INSERT INTO migration_log (migration_step, status)
        VALUES (step_name, step_status);
    END IF;
END;
$$ LANGUAGE plpgsql;

\echo 'Migration logging functions created'

-- Step 1: Backup current data (if any)
SELECT log_migration_step('Backup existing data', 'started');

-- Create backup tables for existing data
DO $$
DECLARE
    table_name TEXT;
    backup_count INTEGER := 0;
BEGIN
    FOR table_name IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'migration_%'
        AND tablename NOT LIKE '_prisma_%'
    LOOP
        BEGIN
            EXECUTE format('CREATE TABLE IF NOT EXISTS backup_%s AS SELECT * FROM %s', table_name, table_name);
            EXECUTE format('SELECT COUNT(*) FROM backup_%s', table_name) INTO backup_count;
            RAISE NOTICE 'Backed up table %: % records', table_name, backup_count;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not backup table %: %', table_name, SQLERRM;
        END;
    END LOOP;
END $$;

SELECT log_migration_step('Backup existing data', 'completed');

-- Step 2: Create or verify Hardy Auth schema
SELECT log_migration_step('Verify Hardy Auth schema', 'started');

-- Ensure all required tables exist (they should from Prisma migration)
\echo 'Verifying Hardy Auth database schema...'

DO $$
DECLARE
    required_tables TEXT[] := ARRAY[
        'users', 'organizations', 'accounts', 'sessions',
        'members', 'audit_logs', 'passkeys', 'two_factor_tokens'
    ];
    table_name TEXT;
    table_exists BOOLEAN;
BEGIN
    FOREACH table_name IN ARRAY required_tables
    LOOP
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = table_name
        ) INTO table_exists;

        IF table_exists THEN
            RAISE NOTICE 'Table % exists', table_name;
        ELSE
            RAISE EXCEPTION 'Required table % is missing. Please run Prisma migrations first.', table_name;
        END IF;
    END LOOP;
END $$;

SELECT log_migration_step('Verify Hardy Auth schema', 'completed');

-- Step 3: Data validation and cleanup
SELECT log_migration_step('Data validation and cleanup', 'started');

-- Clean up any invalid data
UPDATE users SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL;
UPDATE organizations SET slug = LOWER(TRIM(slug)) WHERE slug IS NOT NULL;

-- Ensure required audit context functions exist
SELECT set_auth_context('00000000-0000-0000-0000-000000000000'::UUID);

SELECT log_migration_step('Data validation and cleanup', 'completed');

-- Step 4: Update organization settings for Hardy Auth
SELECT log_migration_step('Update organization settings', 'started');

-- Update organization settings to use Hardy Auth branding and proper healthcare defaults
UPDATE organizations
SET
    -- Update compliance settings for healthcare
    "complianceSettings" = jsonb_build_object(
        'hipaaCompliant', true,
        'enableAuditLogging', true,
        'requireTwoFactor', true,
        'sessionTimeout', 1800,
        'auditRetentionDays', 2557
    ),
    -- Update organization type for healthcare focus
    "organizationType" = CASE
        WHEN "organizationType" IN ('practice', 'clinic', 'hospital') THEN "organizationType"
        ELSE 'healthcare_practice'
    END,
    -- Ensure proper session timeout (30 minutes)
    "sessionTimeout" = GREATEST("sessionTimeout", 1800),
    -- Ensure HIPAA-compliant audit retention (7 years)
    "auditRetentionDays" = GREATEST("auditRetentionDays", 2557),
    -- Enable MFA by default for healthcare
    "mfaRequired" = true,
    "updatedAt" = NOW()
WHERE id IS NOT NULL;

SELECT log_migration_step('Update organization settings', 'completed',
    (SELECT COUNT(*) FROM organizations));

-- Step 5: Update user roles for healthcare context
SELECT log_migration_step('Update user roles for healthcare', 'started');

-- Map generic roles to healthcare-specific roles
UPDATE users
SET role = CASE
    WHEN role = 'admin' THEN 'admin'
    WHEN role = 'user' THEN 'staff'
    WHEN role = 'member' THEN 'staff'
    WHEN role = 'doctor' THEN 'clinician'
    WHEN role = 'physician' THEN 'clinician'
    WHEN role = 'nurse' THEN 'clinician'
    WHEN role = 'provider' THEN 'clinician'
    ELSE role
END,
"updatedAt" = NOW()
WHERE role IS NOT NULL;

SELECT log_migration_step('Update user roles for healthcare', 'completed',
    (SELECT COUNT(*) FROM users));

-- Step 6: Create audit entries for migration
SELECT log_migration_step('Create migration audit entries', 'started');

-- Create audit log entries for the migration process
INSERT INTO audit_logs (
    "userId",
    "organizationId",
    action,
    resource,
    details,
    "ipAddress",
    "timestamp",
    severity,
    category
)
SELECT
    NULL as "userId",
    id as "organizationId",
    'SYSTEM_MIGRATION' as action,
    'ORGANIZATION' as resource,
    jsonb_build_object(
        'migration', 'Hardy Auth Backend Migration',
        'timestamp', NOW(),
        'previousSystem', 'MLPipes Auth',
        'newSystem', 'Hardy Auth'
    ) as details,
    '127.0.0.1' as "ipAddress",
    NOW() as "timestamp",
    'info' as severity,
    'system' as category
FROM organizations;

SELECT log_migration_step('Create migration audit entries', 'completed',
    (SELECT COUNT(*) FROM audit_logs WHERE action = 'SYSTEM_MIGRATION'));

-- Step 7: Update database metadata
SELECT log_migration_step('Update database metadata', 'started');

-- Update database comment
COMMENT ON DATABASE hardy_auth IS 'Hardy Auth Service - Healthcare Authentication System (Migrated from MLPipes Auth)';

-- Add migration metadata to a settings table (create if needed)
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO system_settings (key, value)
VALUES (
    'migration_info',
    jsonb_build_object(
        'migrated_from', 'MLPipes Auth',
        'migrated_to', 'Hardy Auth',
        'migration_date', NOW(),
        'migration_version', '1.0.0',
        'database_version', 'PostgreSQL ' || version()
    )
) ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

SELECT log_migration_step('Update database metadata', 'completed');

-- Step 8: Verify data integrity
SELECT log_migration_step('Verify data integrity', 'started');

-- Check for orphaned records and data consistency
DO $$
DECLARE
    orphaned_users INTEGER;
    orphaned_sessions INTEGER;
    total_orgs INTEGER;
    total_users INTEGER;
BEGIN
    -- Check for orphaned users (users without valid organizations)
    SELECT COUNT(*) INTO orphaned_users
    FROM users u
    LEFT JOIN organizations o ON u."organizationId" = o.id
    WHERE u."organizationId" IS NOT NULL AND o.id IS NULL;

    -- Check for orphaned sessions
    SELECT COUNT(*) INTO orphaned_sessions
    FROM sessions s
    LEFT JOIN users u ON s."userId" = u.id
    WHERE u.id IS NULL;

    -- Get totals
    SELECT COUNT(*) INTO total_orgs FROM organizations;
    SELECT COUNT(*) INTO total_users FROM users;

    RAISE NOTICE 'Data integrity check:';
    RAISE NOTICE '- Total organizations: %', total_orgs;
    RAISE NOTICE '- Total users: %', total_users;
    RAISE NOTICE '- Orphaned users: %', orphaned_users;
    RAISE NOTICE '- Orphaned sessions: %', orphaned_sessions;

    IF orphaned_users > 0 OR orphaned_sessions > 0 THEN
        RAISE WARNING 'Found orphaned records. Manual cleanup may be required.';
    END IF;
END $$;

SELECT log_migration_step('Verify data integrity', 'completed');

-- Step 9: Complete migration
SELECT log_migration_step('Hardy Auth Migration Completed', 'completed');

-- Final migration summary
\echo ''
\echo '🎉 Hardy Auth Migration Summary'
\echo '================================'

SELECT
    migration_step as "Migration Step",
    status as "Status",
    record_count as "Records",
    EXTRACT(EPOCH FROM (completed_at - started_at))::INTEGER as "Duration (seconds)"
FROM migration_log
WHERE status = 'completed'
ORDER BY started_at;

\echo ''
\echo '✅ Hardy Auth migration completed successfully!'
\echo ''
\echo 'Next steps:'
\echo '1. Test database connectivity: psql -U auth_service -d hardy_auth -h localhost -p 5434'
\echo '2. Start Hardy Auth application: npm run dev'
\echo '3. Verify application functionality'
\echo '4. Remove backup tables when satisfied: DROP TABLE IF EXISTS backup_*'
\echo ''
\echo '⚠️  Important: Keep the migration_log table for reference'
\echo '⚠️  Important: Test thoroughly before removing backup tables'