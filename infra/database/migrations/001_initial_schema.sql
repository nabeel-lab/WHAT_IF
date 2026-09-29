-- Initial Schema for ECDAT Phase 1

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE scan_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('QUEUED', 'SCANNING', 'COMPLETED', 'FAILED')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    files_scanned INTEGER DEFAULT 0,
    findings_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE crypto_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES scan_runs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL, -- e.g., 'library', 'primitive', 'operation'
    algorithm TEXT, -- e.g., 'RSA', 'AES', 'SHA256'
    role TEXT, -- e.g., 'encryption', 'decryption', 'key generation', 'hashing', 'signing'
    source_file TEXT NOT NULL,
    line_start INTEGER,
    line_end INTEGER,
    library TEXT,
    detector_rule TEXT NOT NULL,
    confidence TEXT NOT NULL CHECK (confidence IN ('HIGH', 'MEDIUM', 'LOW')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES crypto_assets(id) ON DELETE CASCADE,
    evidence_type TEXT NOT NULL CHECK (evidence_type IN ('static_code', 'import', 'configuration', 'dependency_manifest')),
    file TEXT NOT NULL,
    line INTEGER,
    snippet TEXT,
    detector TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE scan_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES scan_runs(id) ON DELETE CASCADE,
    file TEXT NOT NULL,
    error_message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_scan_runs_project_id ON scan_runs(project_id);
CREATE INDEX idx_crypto_assets_scan_id ON crypto_assets(scan_id);
CREATE INDEX idx_crypto_assets_algorithm ON crypto_assets(algorithm);
CREATE INDEX idx_crypto_assets_source_file ON crypto_assets(source_file);
CREATE INDEX idx_crypto_assets_confidence ON crypto_assets(confidence);
CREATE INDEX idx_evidence_asset_id ON evidence(asset_id);
CREATE INDEX idx_scan_errors_scan_id ON scan_errors(scan_id);
