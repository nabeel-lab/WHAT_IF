-- Up Migration

-- Create certificates table
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES scan_runs(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    subject TEXT,
    issuer TEXT,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    signature_algorithm TEXT,
    public_key_algorithm TEXT,
    key_size INTEGER,
    curve_name TEXT,
    sans JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign keys for keys and data assets to link them directly if needed
-- We already have key_contexts and data_assets, but let's make sure they are scoped to scan_id as well
-- Wait, the previous tables for contexts were scoping by project_id and asset_id.
-- We'll keep them as is and add scan_id if not present for easier cleanup.

ALTER TABLE key_contexts ADD COLUMN IF NOT EXISTS scan_id UUID REFERENCES scan_runs(id) ON DELETE CASCADE;
ALTER TABLE data_assets ADD COLUMN IF NOT EXISTS scan_id UUID REFERENCES scan_runs(id) ON DELETE CASCADE;

-- Down Migration
-- DROP TABLE IF EXISTS certificates CASCADE;
-- ALTER TABLE key_contexts DROP COLUMN IF EXISTS scan_id;
-- ALTER TABLE data_assets DROP COLUMN IF EXISTS scan_id;
