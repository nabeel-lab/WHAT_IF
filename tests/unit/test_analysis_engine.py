import pytest
from packages.analysis.engine import TwoClockModel, MigrationEffortEngine, CryptoAgilityEngine, AnalysisEngine
from services.api.models import ContextAggregate, FindingModel

def test_migration_effort_engine():
    assert MigrationEffortEngine.calculate(touchpoints=1, abstraction=False, external=False) == "MEDIUM"
    assert MigrationEffortEngine.calculate(touchpoints=4, abstraction=False, external=False) == "HIGH"
    assert MigrationEffortEngine.calculate(touchpoints=1, abstraction=True, external=False) == "LOW"
    assert MigrationEffortEngine.calculate(touchpoints=0, abstraction=False, external=False) == "UNKNOWN"

def test_crypto_agility_engine():
    assert CryptoAgilityEngine.calculate(abstraction=True, hardcoded=False) == "READY"
    assert CryptoAgilityEngine.calculate(abstraction=True, hardcoded=True) == "PARTIALLY_READY"
    assert CryptoAgilityEngine.calculate(abstraction=False, hardcoded=True) == "LOW_READINESS"

def test_two_clock_model():
    # 2032 requires protection until, HIGH effort
    state, basis, req, lead = TwoClockModel.calculate_runway("2032-01-01", "HIGH")
    assert lead == "18 months"
    assert state == "WATCH"
    
    # 2032 requires protection until, LOW effort
    state, basis, req, lead = TwoClockModel.calculate_runway("2032-01-01", "LOW")
    assert lead == "3 months"
    assert state == "COMFORTABLE"
    
    # 2025 requires protection until, any effort
    state, basis, req, lead = TwoClockModel.calculate_runway("2025-01-01", "MEDIUM")
    assert state == "URGENT"

def test_analysis_engine():
    from services.api.models import ReachabilityResult, DataAssetModel, KeyContextModel, MigrationContextModel, RuntimeEvent
    import uuid
    
    context = ContextAggregate(
        finding=FindingModel(id=uuid.uuid4(), scan_id=uuid.uuid4(), created_at="2026-01-01T00:00:00Z", name="rsa_encrypt", algorithm="RSA", asset_type="algorithm", role="encryption", source_file="main.py"),
        reachability=ReachabilityResult(id=uuid.uuid4(), asset_id=uuid.uuid4(), status="REACHABLE", created_at="2026-01-01T00:00:00Z"),
        runtime=[RuntimeEvent(id=uuid.uuid4(), runtime_run_id=uuid.uuid4(), event_type="observed", algorithm="RSA", role="encryption", entrypoint="/archive", source_locator="main.py:10", execution_status="success", timestamp="2026-01-01T00:00:00Z", created_at="2026-01-01T00:00:00Z")],
        data_assets=[DataAssetModel(id=uuid.uuid4(), project_id=uuid.uuid4(), name="PII", required_confidentiality_until="2032-01-01", created_at="2026-01-01T00:00:00Z")],
        key_contexts=[],
        migration_context=MigrationContextModel(id=uuid.uuid4(), project_id=uuid.uuid4(), crypto_asset_id=uuid.uuid4(), direct_crypto_call_sites=5, external_dependencies=0, provider_abstraction="", created_at="2026-01-01T00:00:00Z"),
    )
    
    res = AnalysisEngine.analyze(context)
    ar = res.analysis_result
    
    assert "FOUND | REACHABLE | OBSERVED | NOT DECLARED" == ar.evidence_state
    assert ar.migration_effort == "HIGH" # 5 touchpoints
    assert ar.runway_state == "WATCH" # 2032 & HIGH effort
    assert ar.crypto_agility_state == "LOW_READINESS"
    
    assert any(c.action_type == "MIGRATION_PLANNING" for c in res.action_candidates)
    assert any(c.action_type == "PREPARE" for c in res.action_candidates) # Because of low readiness

def test_static_only_investigate_rule():
    from services.api.models import ReachabilityResult, DataAssetModel, KeyContextModel, MigrationContextModel
    import uuid
    # Static finding with NO runtime observation must produce INVESTIGATE (Rule 1)
    context = ContextAggregate(
        finding=FindingModel(id=uuid.uuid4(), scan_id=uuid.uuid4(), created_at="2026-01-01T00:00:00Z", name="aws_sdk", algorithm="AWS", asset_type="algorithm", role="cloud SDK", source_file="main.py"),
        reachability=ReachabilityResult(id=uuid.uuid4(), asset_id=uuid.uuid4(), status="REACHABLE", created_at="2026-01-01T00:00:00Z"),
        runtime=[],
        data_assets=[DataAssetModel(id=uuid.uuid4(), project_id=uuid.uuid4(), name="PII", required_confidentiality_until="2036-01-01", created_at="2026-01-01T00:00:00Z")],
        key_contexts=[],
        migration_context=None,
    )
    res = AnalysisEngine.analyze(context)
    assert any(c.action_type == "INVESTIGATE" for c in res.action_candidates)
    assert not any(c.action_type == "MIGRATION_PLANNING" for c in res.action_candidates)
    assert not any(c.action_type == "PREPARE" for c in res.action_candidates)

def test_legacy_md5_exposure_rule():
    from services.api.models import ReachabilityResult, DataAssetModel, RuntimeEvent
    import uuid
    # Runtime observed MD5 hash must produce REDUCE_DATA_EXPOSURE (Rule 6)
    context = ContextAggregate(
        finding=FindingModel(id=uuid.uuid4(), scan_id=uuid.uuid4(), created_at="2026-01-01T00:00:00Z", name="md5_hash", algorithm="MD5", asset_type="algorithm", role="hashing", source_file="legacy.py"),
        reachability=ReachabilityResult(id=uuid.uuid4(), asset_id=uuid.uuid4(), status="REACHABLE", created_at="2026-01-01T00:00:00Z"),
        runtime=[RuntimeEvent(id=uuid.uuid4(), runtime_run_id=uuid.uuid4(), event_type="observed", algorithm="MD5", role="hashing", entrypoint="/legacy", source_locator="legacy.py:5", execution_status="success", timestamp="2026-01-01T00:00:00Z", created_at="2026-01-01T00:00:00Z")],
        data_assets=[DataAssetModel(id=uuid.uuid4(), project_id=uuid.uuid4(), name="billing", required_confidentiality_until="2033-01-01", created_at="2026-01-01T00:00:00Z")],
        key_contexts=[],
        migration_context=None,
    )
    res = AnalysisEngine.analyze(context)
    assert any(c.action_type == "REDUCE_DATA_EXPOSURE" for c in res.action_candidates)

def test_broad_key_scope_blast_radius_rule():
    from services.api.models import ReachabilityResult, DataAssetModel, KeyContextModel, RuntimeEvent
    import uuid
    # Broad key scope (archive + backup) must produce REDUCE_BLAST_RADIUS (Rule 4)
    context = ContextAggregate(
        finding=FindingModel(id=uuid.uuid4(), scan_id=uuid.uuid4(), created_at="2026-01-01T00:00:00Z", name="rsa_key", algorithm="RSA", asset_type="algorithm", role="encryption", source_file="main.py"),
        reachability=ReachabilityResult(id=uuid.uuid4(), asset_id=uuid.uuid4(), status="REACHABLE", created_at="2026-01-01T00:00:00Z"),
        runtime=[RuntimeEvent(id=uuid.uuid4(), runtime_run_id=uuid.uuid4(), event_type="observed", algorithm="RSA", role="encryption", entrypoint="/archive", source_locator="main.py:10", execution_status="success", timestamp="2026-01-01T00:00:00Z", created_at="2026-01-01T00:00:00Z")],
        data_assets=[DataAssetModel(id=uuid.uuid4(), project_id=uuid.uuid4(), name="archive", required_confidentiality_until="2036-01-01", created_at="2026-01-01T00:00:00Z")],
        key_contexts=[KeyContextModel(id=uuid.uuid4(), project_id=uuid.uuid4(), key_id_name="archive-master-v1", scope="archive + backup", rotation_policy="manual", created_at="2026-01-01T00:00:00Z")],
        migration_context=None,
    )
    res = AnalysisEngine.analyze(context)
    assert any(c.action_type == "REDUCE_BLAST_RADIUS" for c in res.action_candidates)
    assert res.analysis_result.key_concentration_state == "CONCENTRATED"

def test_key_metadata_normalization():
    from pathlib import Path
    from packages.analyzer.key_parser import normalize_key_context, parse_keys_yaml

    # 1. Test from actual keys.yaml fixture
    keys_yaml_path = Path("tests/fixtures/Enterprise_info/keys.yaml")
    assert keys_yaml_path.exists(), "Enterprise_info keys.yaml fixture should exist"

    parsed = parse_keys_yaml(keys_yaml_path)
    assert "archive-master-v1" in parsed
    
    archive_key = parsed["archive-master-v1"]
    assert archive_key["scope"] == "archive + backup"
    assert archive_key["domains"] == 3
    assert archive_key["rotation_state"] == "manual"
    assert archive_key["custody_type"] == "AWS KMS"
    assert archive_key["key_type"] == "key wrapping"
    assert archive_key["algorithm"] == "RSA"
    # Verify missing fields are genuinely None/null, NOT fabricated
    assert archive_key["services"] is None
    assert archive_key["epoch"] is None
    assert archive_key["old_versions_retained"] is None
    assert archive_key["evidence_source"] == "keys.yaml"

    partner_key = parsed["partner-signing-v1"]
    assert partner_key["scope"] == "partner"
    assert partner_key["domains"] is None
    assert partner_key["rotation_state"] == "auto-1year"
    assert partner_key["custody_type"] == "AWS KMS"

    # 2. Test controlled missing metadata
    empty_norm = normalize_key_context("minimal-key", {})
    assert empty_norm["key_id_name"] == "minimal-key"
    assert empty_norm["scope"] is None
    assert empty_norm["domains"] is None
    assert empty_norm["services"] is None
    assert empty_norm["epoch"] is None
    assert empty_norm["rotation_state"] == "Unknown"
    assert empty_norm["key_type"] == "Unknown"
    assert empty_norm["algorithm"] == "Unknown"
    assert empty_norm["custody_type"] is None

def test_configuration_mismatch_investigate_rule():
    from services.api.models import ReachabilityResult, DataAssetModel, RuntimeEvent
    import uuid

    # Controlled fixture: declared AES-256-GCM in service config, but observed DES at runtime
    context = ContextAggregate(
        finding=FindingModel(id=uuid.uuid4(), scan_id=uuid.uuid4(), created_at="2026-01-01T00:00:00Z", name="des_cipher", algorithm="DES", asset_type="algorithm", role="encryption", source_file="service.py"),
        reachability=ReachabilityResult(id=uuid.uuid4(), asset_id=uuid.uuid4(), status="REACHABLE", created_at="2026-01-01T00:00:00Z"),
        runtime=[RuntimeEvent(id=uuid.uuid4(), runtime_run_id=uuid.uuid4(), event_type="observed", algorithm="DES", role="encryption", entrypoint="/api", source_locator="service.py:12", execution_status="success", timestamp="2026-01-01T00:00:00Z", created_at="2026-01-01T00:00:00Z")],
        data_assets=[DataAssetModel(id=uuid.uuid4(), project_id=uuid.uuid4(), name="records", required_confidentiality_until="2035-01-01", created_at="2026-01-01T00:00:00Z")],
        key_contexts=[],
        config_declared="AES-256-GCM",
        config_observed="DES",
        mismatch=True
    )
    res = AnalysisEngine.analyze(context)
    
    # Rule 2 must fire and generate INVESTIGATE candidate explaining the mismatch
    mismatch_candidates = [c for c in res.action_candidates if c.action_type == "INVESTIGATE" and "Configuration mismatch" in c.why]
    assert len(mismatch_candidates) == 1
    assert "AES-256-GCM" in mismatch_candidates[0].why
    assert "DES" in mismatch_candidates[0].why
    assert mismatch_candidates[0].supporting_evidence == {"declared": "AES-256-GCM", "observed": "DES"}
    assert mismatch_candidates[0].missing_evidence == {"mismatch": True}

    # Controlled fixture without mismatch: declared AES matches observed AES
    no_mismatch_context = ContextAggregate(
        finding=FindingModel(id=uuid.uuid4(), scan_id=uuid.uuid4(), created_at="2026-01-01T00:00:00Z", name="aes_cipher", algorithm="AES-256-GCM", asset_type="algorithm", role="encryption", source_file="service.py"),
        reachability=ReachabilityResult(id=uuid.uuid4(), asset_id=uuid.uuid4(), status="REACHABLE", created_at="2026-01-01T00:00:00Z"),
        runtime=[RuntimeEvent(id=uuid.uuid4(), runtime_run_id=uuid.uuid4(), event_type="observed", algorithm="AES-256-GCM", role="encryption", entrypoint="/api", source_locator="service.py:12", execution_status="success", timestamp="2026-01-01T00:00:00Z", created_at="2026-01-01T00:00:00Z")],
        data_assets=[DataAssetModel(id=uuid.uuid4(), project_id=uuid.uuid4(), name="records", required_confidentiality_until="2035-01-01", created_at="2026-01-01T00:00:00Z")],
        key_contexts=[],
        config_declared="AES-256-GCM",
        config_observed="AES-256-GCM",
        mismatch=False
    )
    res_no_mismatch = AnalysisEngine.analyze(no_mismatch_context)
    assert not any("Configuration mismatch" in c.why for c in res_no_mismatch.action_candidates)

