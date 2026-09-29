-- Add new configuration columns to scan_runs
ALTER TABLE scan_runs ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'Entire repository';
ALTER TABLE scan_runs ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'Python';
ALTER TABLE scan_runs ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'Development';
ALTER TABLE scan_runs ADD COLUMN IF NOT EXISTS static_analysis_enabled BOOLEAN DEFAULT true;
ALTER TABLE scan_runs ADD COLUMN IF NOT EXISTS verification_enabled BOOLEAN DEFAULT false;
ALTER TABLE scan_runs ADD COLUMN IF NOT EXISTS runtime_enabled BOOLEAN DEFAULT false;
ALTER TABLE scan_runs ADD COLUMN IF NOT EXISTS context_enabled BOOLEAN DEFAULT false;

-- Create scan_stages table
CREATE TABLE IF NOT EXISTS scan_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_run_id UUID REFERENCES scan_runs(id) ON DELETE CASCADE,
    stage TEXT NOT NULL, -- DISCOVERY, STATIC_ANALYSIS, VERIFICATION, REACHABILITY, RUNTIME, CONTEXT, COMPLETE
    status TEXT NOT NULL, -- PENDING, RUNNING, COMPLETED, FAILED, SKIPPED
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    findings_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying stages of a scan
CREATE INDEX IF NOT EXISTS idx_scan_stages_run_id ON scan_stages(scan_run_id);
