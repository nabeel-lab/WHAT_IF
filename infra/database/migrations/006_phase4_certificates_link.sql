-- Up Migration

-- Drop the certificates table we just created to recreate it with the correct foreign key
DROP TABLE IF EXISTS certificates CASCADE;

-- Create certificates table with crypto_asset_id linking
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES scan_runs(id) ON DELETE CASCADE,
    crypto_asset_id UUID REFERENCES crypto_assets(id) ON DELETE CASCADE,
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

-- Down Migration
-- DROP TABLE IF EXISTS certificates CASCADE;
