-- Phase 3: Cryptographic Context & Migration Readiness

CREATE TABLE data_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    classification TEXT,
    sensitivity TEXT,
    business_criticality TEXT,
    required_confidentiality_until TEXT,
    retention_period TEXT,
    owner_source TEXT,
    evidence_source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE key_contexts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    key_id_name TEXT NOT NULL,
    key_type TEXT,
    algorithm TEXT,
    scope TEXT,
    domains INTEGER,
    services INTEGER,
    epoch INTEGER,
    rotation_state TEXT,
    custody_type TEXT,
    old_versions_retained BOOLEAN,
    evidence_source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE crypto_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    path_id_name TEXT NOT NULL,
    entrypoint TEXT,
    crypto_asset_id UUID REFERENCES crypto_assets(id) ON DELETE CASCADE,
    key_context_id UUID REFERENCES key_contexts(id) ON DELETE SET NULL,
    data_asset_id UUID REFERENCES data_assets(id) ON DELETE SET NULL,
    relationship_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    crypto_asset_id UUID REFERENCES crypto_assets(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL, -- e.g., 'library', 'application', 'certificate', 'protocol'
    target_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    crypto_asset_id UUID REFERENCES crypto_assets(id) ON DELETE CASCADE,
    control_name TEXT NOT NULL, -- e.g., 'Key separation', 'Crypto abstraction'
    control_state TEXT NOT NULL CHECK (control_state IN ('YES', 'NO', 'UNKNOWN')),
    evidence TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE migration_contexts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    crypto_asset_id UUID REFERENCES crypto_assets(id) ON DELETE CASCADE,
    direct_crypto_call_sites INTEGER DEFAULT 0,
    provider_abstraction TEXT,
    external_dependencies INTEGER DEFAULT 0,
    certificate_dependencies INTEGER DEFAULT 0,
    protocol_dependencies INTEGER DEFAULT 0,
    rollback_support TEXT,
    migration_effort_band TEXT CHECK (migration_effort_band IN ('Low', 'Medium', 'High', 'Unknown')),
    effort_reason TEXT,
    protection_runway_category TEXT CHECK (protection_runway_category IN ('comfortable', 'watch', 'needs_planning', 'urgent', 'unknown')),
    quantum_exposure_category TEXT CHECK (quantum_exposure_category IN ('none', 'public_key_relevant', 'conditional', 'unknown')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
