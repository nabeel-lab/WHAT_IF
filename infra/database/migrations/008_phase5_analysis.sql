CREATE TABLE analysis_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES scan_runs(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    repository_url TEXT,
    commit_sha TEXT,
    scan_configuration JSONB,
    scanner_version TEXT,
    analysis_version TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(scan_id, analysis_version)
);

CREATE INDEX idx_analysis_runs_scan_id ON analysis_runs(scan_id);

CREATE TABLE analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_run_id UUID NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
    finding_id UUID REFERENCES crypto_assets(id) ON DELETE CASCADE,
    crypto_path_id UUID REFERENCES crypto_paths(id) ON DELETE CASCADE,
    evidence_state TEXT,
    evidence_coverage TEXT,
    required_protection_until TEXT,
    change_lead_time TEXT,
    runway_state TEXT NOT NULL CHECK (runway_state IN ('COMFORTABLE', 'WATCH', 'NEEDS_PLANNING', 'URGENT', 'UNKNOWN')),
    runway_basis TEXT,
    planning_assumptions TEXT,
    migration_effort TEXT,
    crypto_agility_state TEXT,
    key_concentration_state TEXT,
    exposure_reduction_state TEXT,
    action_candidates JSONB[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_analysis_finding UNIQUE (analysis_run_id, finding_id)
);

CREATE INDEX idx_analysis_results_run_id ON analysis_results(analysis_run_id);
CREATE INDEX idx_analysis_results_path_id ON analysis_results(crypto_path_id);
CREATE INDEX idx_analysis_results_finding_id ON analysis_results(finding_id);

CREATE TABLE action_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_result_id UUID NOT NULL REFERENCES analysis_results(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    status TEXT,
    why TEXT,
    supporting_evidence JSONB,
    blocking_evidence JSONB,
    missing_evidence JSONB,
    affected_paths JSONB,
    affected_data JSONB,
    affected_keys JSONB,
    migration_touchpoints JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_action_candidates_result_id ON action_candidates(analysis_result_id);
