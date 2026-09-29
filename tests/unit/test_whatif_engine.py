import pytest
import uuid
from packages.analysis.whatif import WhatIfEngine, DeltaEngine
from services.api.models import ContextAggregate, FindingModel, ReachabilityResult, DataAssetModel, KeyContextModel, MigrationContextModel, WhatIfRequest

def test_delta_engine():
    assert DeltaEngine.compare_readiness("LOW_READINESS", "PARTIALLY_READY") == "IMPROVED"
    assert DeltaEngine.compare_readiness("READY", "LOW_READINESS") == "WORSENED"
    assert DeltaEngine.compare_readiness("UNKNOWN", "UNKNOWN") == "UNCHANGED"
    assert DeltaEngine.compare_readiness("READY", "READY") == "UNCHANGED"
    
    assert DeltaEngine.compare_effort("HIGH", "MEDIUM") == "IMPROVED"
    assert DeltaEngine.compare_runway("NEEDS_PLANNING", "WATCH") == "IMPROVED"

def build_mock_context():
    return ContextAggregate(
        finding=FindingModel(id=uuid.uuid4(), scan_id=uuid.uuid4(), name="rsa_encrypt", algorithm="RSA", asset_type="algorithm", role="encryption", source_file="main.py", detector_rule="R1", confidence="HIGH", created_at="2026-01-01T00:00:00Z"),
        reachability=ReachabilityResult(id=uuid.uuid4(), asset_id=uuid.uuid4(), status="REACHABLE", created_at="2026-01-01T00:00:00Z"),
        runtime=[],
        data_assets=[DataAssetModel(id=uuid.uuid4(), project_id=uuid.uuid4(), name="PII", required_confidentiality_until="2032-01-01", created_at="2026-01-01T00:00:00Z")],
        key_contexts=[],
        migration_context=MigrationContextModel(id=uuid.uuid4(), project_id=uuid.uuid4(), crypto_asset_id=uuid.uuid4(), direct_crypto_call_sites=2, external_dependencies=0, provider_abstraction="", created_at="2026-01-01T00:00:00Z"),
    )

def test_whatif_immutability():
    ctx = build_mock_context()
    original_mc_abstraction = ctx.migration_context.provider_abstraction
    original_data_date = ctx.data_assets[0].required_confidentiality_until
    
    req = WhatIfRequest(scenario_type="INTRODUCE_CRYPTO_ABSTRACTION", overrides={"crypto_abstraction": True})
    res = WhatIfEngine.simulate(ctx, req, str(uuid.uuid4()), "phase5-v1")
    
    # Assert original context was completely untouched
    assert ctx.migration_context.provider_abstraction == original_mc_abstraction
    assert ctx.data_assets[0].required_confidentiality_until == original_data_date
    
    # Assert scenario modified the clone
    # Migration effort with abstraction drops to LOW in the engine
    assert res.baseline.analysis_result.migration_effort == "MEDIUM"
    assert res.scenario.analysis_result.migration_effort == "LOW"

def test_reduce_data_retention():
    ctx = build_mock_context()
    
    req = WhatIfRequest(scenario_type="REDUCE_DATA_RETENTION", overrides={"retention_end_date": "2027-01-01"})
    res = WhatIfEngine.simulate(ctx, req, str(uuid.uuid4()), "phase5-v1")
    
    assert res.baseline.analysis_result.runway_state == "COMFORTABLE"
    assert res.scenario.analysis_result.runway_state == "WATCH" # 2027 is WATCH for MEDIUM effort
    
    # Verify original unchanged
    assert ctx.data_assets[0].required_confidentiality_until == "2032-01-01"
