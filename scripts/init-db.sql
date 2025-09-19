-- Hardy Auth Service Database Initialization
-- Healthcare-focused authentication database setup
-- HIPAA compliant with Row-Level Security (RLS)

-- Create database if not exists (this is handled by Docker environment variables)
-- CREATE DATABASE hardy_auth;

-- Connect to the hardy_auth database
\c hardy_auth;

-- Create required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Create audit schema for HIPAA compliance
CREATE SCHEMA IF NOT EXISTS audit;

-- Set up Row-Level Security context function
CREATE OR REPLACE FUNCTION set_auth_context(tenant_id UUID, user_id UUID DEFAULT NULL, user_role TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    -- Set session variables for RLS policies
    PERFORM set_config('app.current_tenant_id', tenant_id::text, true);
    IF user_id IS NOT NULL THEN
        PERFORM set_config('app.current_user_id', user_id::text, true);
    END IF;
    IF user_role IS NOT NULL THEN
        PERFORM set_config('app.current_user_role', user_role, true);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create get_auth_context functions for RLS policies
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(current_setting('app.current_tenant_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('app.current_user_role', true);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Create audit trigger function for HIPAA compliance
CREATE OR REPLACE FUNCTION audit.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    audit_row audit.audit_log%ROWTYPE;
    excluded_cols text[] = ARRAY[]::text[];
BEGIN
    -- Skip audit for audit table itself
    IF TG_TABLE_SCHEMA = 'audit' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    audit_row = ROW(
        gen_random_uuid(),                           -- id
        NOW(),                                       -- timestamp
        get_current_tenant_id(),                     -- tenant_id
        get_current_user_id(),                       -- user_id
        get_current_user_role(),                     -- user_role
        TG_TABLE_SCHEMA::text,                       -- schema_name
        TG_TABLE_NAME::text,                         -- table_name
        TG_OP,                                       -- operation
        CASE
            WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
            ELSE to_jsonb(NEW)
        END,                                         -- new_data
        CASE
            WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD)
            ELSE NULL
        END,                                         -- old_data
        inet_client_addr()::text,                    -- ip_address
        NULL,                                        -- user_agent (will be set by application)
        NULL                                         -- additional_info
    );

    INSERT INTO audit.audit_log VALUES (audit_row.*);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tenant_id UUID,
    user_id UUID,
    user_role TEXT,
    schema_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    new_data JSONB,
    old_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    additional_info JSONB
);

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit.audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_id ON audit.audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_operation ON audit.audit_log(operation);

-- Create database user for the application
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'hardy_auth_app') THEN
        CREATE ROLE hardy_auth_app WITH LOGIN PASSWORD 'hardy_auth_app_password';
    END IF;
END
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO hardy_auth_app;
GRANT USAGE ON SCHEMA audit TO hardy_auth_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hardy_auth_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA audit TO hardy_auth_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO hardy_auth_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO hardy_auth_app;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO hardy_auth_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO hardy_auth_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO hardy_auth_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT ALL ON TABLES TO hardy_auth_app;

COMMENT ON DATABASE hardy_auth IS 'Hardy Auth Service - Healthcare Authentication System';
COMMENT ON SCHEMA audit IS 'HIPAA-compliant audit logging schema for Hardy Auth';
COMMENT ON TABLE audit.audit_log IS 'Comprehensive audit trail for all data changes - 7 year retention for HIPAA compliance';