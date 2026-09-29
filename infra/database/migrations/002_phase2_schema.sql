-- Phase 2: Cryptographic Verification Extensions

CREATE TABLE reachability_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES crypto_assets(id) ON DELETE CASCADE,
    entrypoint TEXT,
    status TEXT NOT NULL CHECK (status IN ('REACHABLE', 'UNREACHABLE', 'CONDITIONAL', 'UNKNOWN')),
    evidence TEXT,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE runtime_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    scenario TEXT NOT NULL,
    events_detected INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE runtime_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    runtime_run_id UUID NOT NULL REFERENCES runtime_runs(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES crypto_assets(id) ON DELETE SET NULL,
    event_type TEXT DEFAULT 'crypto_operation',
    algorithm TEXT,
    role TEXT,
    entrypoint TEXT,
    source_locator TEXT,
    execution_status TEXT DEFAULT 'success',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
