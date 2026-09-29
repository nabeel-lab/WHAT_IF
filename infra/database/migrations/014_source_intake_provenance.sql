-- Migration 014: Source intake & provenance tracking
ALTER TABLE scan_runs ADD COLUMN IF NOT EXISTS canonical_source_identity TEXT;
ALTER TABLE scan_runs ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE scan_runs ADD COLUMN IF NOT EXISTS archive_filename TEXT;
ALTER TABLE scan_runs ADD COLUMN IF NOT EXISTS archive_hash TEXT;
ALTER TABLE scan_runs ADD COLUMN IF NOT EXISTS acquisition_timestamp TIMESTAMP WITH TIME ZONE;
ALTER TABLE scan_runs ADD COLUMN IF NOT EXISTS provenance_status TEXT DEFAULT 'VERIFIED';

CREATE TABLE IF NOT EXISTS provider_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    auth_type TEXT NOT NULL DEFAULT 'token',
    access_token TEXT,
    token_preview TEXT,
    scope TEXT NOT NULL DEFAULT 'repo:read',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    account_login TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_provider_connections_project ON provider_connections(project_id);
