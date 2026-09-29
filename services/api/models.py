from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

class ProjectCreate(BaseModel):
    name: str

class Project(ProjectCreate):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

class ScanRunCreate(BaseModel):
    project_id: uuid.UUID
    repository_url: Optional[str] = None
    source_type: str = "GIT_REPOSITORY"
    branch: str = "main"
    scope: str = "Entire repository"
    language: str = "Python"
    environment: str = "Development"
    static_analysis_enabled: bool = True
    verification_enabled: bool = True
    runtime_enabled: bool = True
    context_enabled: bool = True
    canonical_source_identity: Optional[str] = None
    provider: Optional[str] = None
    archive_filename: Optional[str] = None
    archive_hash: Optional[str] = None
    access_token: Optional[str] = None  # in-memory credential for private git clone, NEVER persisted to DB
    provider_connection_id: Optional[uuid.UUID] = None

class ScanRun(ScanRunCreate):
    id: uuid.UUID
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    findings_count: int = 0
    error_count: int = 0
    files_scanned: int = 0
    commit_sha: Optional[str] = None
    acquisition_timestamp: Optional[datetime] = None
    provenance_status: Optional[str] = None
    created_at: datetime

class ProviderConnectionCreate(BaseModel):
    provider: str
    access_token: str

class ProviderConnection(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    provider: str
    auth_type: str
    token_preview: str
    scope: Optional[str] = None
    status: str
    account_login: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class ProviderTestRequest(BaseModel):
    provider: str = "github"
    access_token: Optional[str] = None
    repository_url: Optional[str] = None

class ProviderTestResponse(BaseModel):
    accessible: bool
    provider: str
    full_name: Optional[str] = None
    private: Optional[bool] = None
    can_read: Optional[bool] = None
    default_branch: Optional[str] = None
    error: Optional[str] = None

class ScanStage(BaseModel):
    id: uuid.UUID
    scan_run_id: uuid.UUID
    stage: str
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    findings_count: int = 0
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class FindingModel(BaseModel):
    id: uuid.UUID
    scan_id: uuid.UUID
    name: str
    asset_type: str
    algorithm: Optional[str] = None
    role: Optional[str] = None
    source_file: Optional[str] = None   # evidence-level; nullable on canonical assets
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    library: Optional[str] = None
    detector_rule: Optional[str] = None  # evidence-level
    confidence: Optional[str] = None     # evidence-level
    created_at: datetime

class EvidenceModel(BaseModel):
    id: uuid.UUID
    asset_id: uuid.UUID
    evidence_type: str
    file: str
    line: Optional[int] = None
    snippet: Optional[str] = None
    detector: str
    created_at: datetime

class ReachabilityResult(BaseModel):
    id: uuid.UUID
    asset_id: uuid.UUID
    entrypoint: Optional[str] = None
    status: str
    evidence: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime

class RuntimeRun(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    scenario: str
    events_detected: int = 0
    errors: int = 0
    created_at: datetime

class RuntimeEvent(BaseModel):
    id: uuid.UUID
    runtime_run_id: uuid.UUID
    asset_id: Optional[uuid.UUID] = None
    event_type: str
    algorithm: Optional[str] = None
    role: Optional[str] = None
    entrypoint: Optional[str] = None
    source_locator: Optional[str] = None
    execution_status: str
    timestamp: datetime
    created_at: datetime

class VerificationAggregate(BaseModel):
    finding: FindingModel
    reachability: Optional[ReachabilityResult] = None
    runtime: Optional[List[RuntimeEvent]] = None
    config_declared: Optional[str] = None
    config_observed: Optional[str] = None
    mismatch: bool = False

class DataAssetModel(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    description: Optional[str] = None
    classification: Optional[str] = None
    sensitivity: Optional[str] = None
    business_criticality: Optional[str] = None
    required_confidentiality_until: Optional[str] = None
    retention_period: Optional[str] = None
    owner_source: Optional[str] = None
    evidence_source: Optional[str] = None
    created_at: datetime

class KeyContextModel(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    key_id_name: str
    key_type: Optional[str] = None
    algorithm: Optional[str] = None
    scope: Optional[str] = None
    domains: Optional[int] = None
    services: Optional[int] = None
    epoch: Optional[int] = None
    rotation_state: Optional[str] = None
    custody_type: Optional[str] = None
    old_versions_retained: Optional[bool] = None
    evidence_source: Optional[str] = None
    created_at: datetime

class CryptoPathModel(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    path_id_name: str
    entrypoint: Optional[str] = None
    crypto_asset_id: Optional[uuid.UUID] = None
    key_context_id: Optional[uuid.UUID] = None
    data_asset_id: Optional[uuid.UUID] = None
    relationship_type: Optional[str] = None
    created_at: datetime

class DependencyModel(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    crypto_asset_id: Optional[uuid.UUID] = None
    target_type: str
    target_name: str
    created_at: datetime

class ControlModel(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    crypto_asset_id: Optional[uuid.UUID] = None
    control_name: str
    control_state: str
    evidence: Optional[str] = None
    created_at: datetime

class MigrationContextModel(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    crypto_asset_id: Optional[uuid.UUID] = None
    direct_crypto_call_sites: int = 0
    provider_abstraction: Optional[str] = None
    external_dependencies: int = 0
    certificate_dependencies: int = 0
    protocol_dependencies: int = 0
    rollback_support: Optional[str] = None
    migration_effort_band: Optional[str] = None
    effort_reason: Optional[str] = None
    protection_runway_category: Optional[str] = None
    quantum_exposure_category: Optional[str] = None
    created_at: datetime

class ContextAggregate(BaseModel):
    finding: FindingModel
    reachability: Optional[ReachabilityResult] = None
    runtime: Optional[List[RuntimeEvent]] = None
    config_declared: Optional[str] = None
    config_observed: Optional[str] = None
    mismatch: bool = False
    crypto_paths: List[CryptoPathModel] = []
    data_assets: List[DataAssetModel] = []
    key_contexts: List[KeyContextModel] = []
    dependencies: List[DependencyModel] = []
    controls: List[ControlModel] = []
    migration_context: Optional[MigrationContextModel] = None

class AnalysisRunModel(BaseModel):
    id: uuid.UUID
    scan_id: uuid.UUID
    project_id: uuid.UUID
    repository_url: Optional[str] = None
    commit_sha: Optional[str] = None
    scan_configuration: Optional[dict] = None
    scanner_version: Optional[str] = None
    analysis_version: str
    created_at: datetime

class AnalysisResultModel(BaseModel):
    id: uuid.UUID
    analysis_run_id: uuid.UUID
    finding_id: Optional[uuid.UUID] = None
    crypto_path_id: Optional[uuid.UUID] = None
    evidence_state: Optional[str] = None
    evidence_coverage: Optional[str] = None
    required_protection_until: Optional[str] = None
    change_lead_time: Optional[str] = None
    runway_state: Optional[str] = None
    runway_basis: Optional[str] = None
    planning_assumptions: Optional[str] = None
    migration_effort: Optional[str] = None
    crypto_agility_state: Optional[str] = None
    key_concentration_state: Optional[str] = None
    exposure_reduction_state: Optional[str] = None
    created_at: datetime

class ActionCandidateModel(BaseModel):
    id: uuid.UUID
    analysis_result_id: uuid.UUID
    action_type: str
    status: Optional[str] = None
    why: Optional[str] = None
    supporting_evidence: Optional[dict] = None
    blocking_evidence: Optional[dict] = None
    missing_evidence: Optional[dict] = None
    affected_paths: Optional[dict] = None
    affected_data: Optional[dict] = None
    affected_keys: Optional[dict] = None
    migration_touchpoints: Optional[dict] = None
    created_at: datetime

class AnalysisAggregate(BaseModel):
    analysis_result: AnalysisResultModel
    action_candidates: List[ActionCandidateModel] = []

class WhatIfRequest(BaseModel):
    scenario_type: str
    overrides: dict
    crypto_path_id: Optional[uuid.UUID] = None

class WhatIfDelta(BaseModel):
    dimension: str
    baseline_value: Optional[str] = None
    simulated_value: Optional[str] = None
    delta: str  # IMPROVED, WORSENED, CHANGED, UNCHANGED, UNKNOWN

class WhatIfResponse(BaseModel):
    scenario_id: str
    scenario_type: str
    overrides: dict
    baseline_scan_id: str
    baseline_analysis_version: str
    scenario_engine_version: str
    created_at: str
    baseline: AnalysisAggregate
    scenario: AnalysisAggregate
    deltas: List[WhatIfDelta]
    assumptions: List[str]
    unknowns: List[str]
