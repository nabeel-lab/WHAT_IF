-- Migration 012: Integration Wiring Correctness
-- Fixes: runtime_events missing scan_id/project_id/source_file/source_line/operation/crypto_path_id
-- Fixes: crypto_paths missing scan_id
-- Fixes: certificates missing crypto_asset_id FK properly
-- Fixes: controls check constraint allows states used by engine
-- Fixes: crypto_assets needs source_file for evidence correlation

-- ─────────────────────────────────────────────────────────────────
-- runtime_events: add missing columns for scan-scoped queries
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE runtime_events ADD COLUMN IF NOT EXISTS scan_id UUID REFERENCES scan_runs(id) ON DELETE CASCADE;
ALTER TABLE runtime_events ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE runtime_events ADD COLUMN IF NOT EXISTS source_file TEXT;
ALTER TABLE runtime_events ADD COLUMN IF NOT EXISTS source_line INTEGER;
ALTER TABLE runtime_events ADD COLUMN IF NOT EXISTS operation TEXT;
ALTER TABLE runtime_events ADD COLUMN IF NOT EXISTS crypto_path_id UUID REFERENCES crypto_paths(id) ON DELETE SET NULL;
ALTER TABLE runtime_events ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE runtime_events ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_runtime_events_scan_id ON runtime_events(scan_id);
CREATE INDEX IF NOT EXISTS idx_runtime_events_asset_id ON runtime_events(asset_id);
CREATE INDEX IF NOT EXISTS idx_runtime_events_crypto_path_id ON runtime_events(crypto_path_id);

-- ─────────────────────────────────────────────────────────────────
-- crypto_paths: add scan_id for scan-scoped queries
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE crypto_paths ADD COLUMN IF NOT EXISTS scan_id UUID REFERENCES scan_runs(id) ON DELETE CASCADE;
ALTER TABLE crypto_paths ADD COLUMN IF NOT EXISTS source_file TEXT;
ALTER TABLE crypto_paths ADD COLUMN IF NOT EXISTS source_line INTEGER;

CREATE INDEX IF NOT EXISTS idx_crypto_paths_scan_id ON crypto_paths(scan_id);
CREATE INDEX IF NOT EXISTS idx_crypto_paths_crypto_asset_id ON crypto_paths(crypto_asset_id);

-- ─────────────────────────────────────────────────────────────────
-- certificates: ensure crypto_asset_id is present (it was already there per 005)
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS crypto_asset_id UUID REFERENCES crypto_assets(id) ON DELETE CASCADE;

-- ─────────────────────────────────────────────────────────────────
-- controls: relax check constraint to match engine output values
-- The old constraint only allowed YES/NO/UNKNOWN.
-- Engine outputs: PRESENT/ABSENT/UNKNOWN/NOT_APPLICABLE
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE controls DROP CONSTRAINT IF EXISTS controls_control_state_check;
ALTER TABLE controls ADD CONSTRAINT controls_control_state_check CHECK (
    control_state IN ('YES', 'NO', 'UNKNOWN', 'PRESENT', 'ABSENT', 'NOT_APPLICABLE')
);

-- ─────────────────────────────────────────────────────────────────
-- scan_stages: add items_total column if missing
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE scan_stages ADD COLUMN IF NOT EXISTS items_total INTEGER;
ALTER TABLE scan_stages ADD COLUMN IF NOT EXISTS items_processed INTEGER;
ALTER TABLE scan_stages ADD COLUMN IF NOT EXISTS items_failed INTEGER;
ALTER TABLE scan_stages ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMP WITH TIME ZONE;

-- ─────────────────────────────────────────────────────────────────
-- key_contexts: add missing metadata columns used during ingestion
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE key_contexts ADD COLUMN IF NOT EXISTS custody_type TEXT;

-- ─────────────────────────────────────────────────────────────────
-- Indexes for performance
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_analysis_results_finding_id2 ON analysis_results(finding_id);
CREATE INDEX IF NOT EXISTS idx_reachability_asset_id ON reachability_results(asset_id);
CREATE INDEX IF NOT EXISTS idx_crypto_assets_scan_id ON crypto_assets(scan_id);
CREATE INDEX IF NOT EXISTS idx_evidence_asset_id2 ON evidence(asset_id);
CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence(evidence_type);
