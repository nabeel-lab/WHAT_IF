CREATE TABLE IF NOT EXISTS configuration_declarations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    scan_id UUID REFERENCES scan_runs(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL,
    declared_algorithm TEXT,
    provider TEXT,
    mismatch_detected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_configuration_declarations_scan_id ON configuration_declarations(scan_id);

-- Add scan_id to controls table for scan-scoped queries
ALTER TABLE controls ADD COLUMN IF NOT EXISTS scan_id UUID REFERENCES scan_runs(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_controls_scan_id ON controls(scan_id);
