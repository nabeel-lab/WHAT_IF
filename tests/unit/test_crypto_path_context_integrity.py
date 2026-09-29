import os, sys
sys.path.insert(0, os.path.abspath('.'))
import uuid
from datetime import datetime, timezone
import pytest

from services.api.models import (
    FindingModel,
    ReachabilityResult,
    RuntimeEvent,
    DataAssetModel,
    KeyContextModel,
    MigrationContextModel,
    ContextAggregate,
)
from packages.analysis.engine import AnalysisEngine

NOW = "2026-09-27T12:00:00Z"
PROJECT_ID = uuid.uuid4()


def test_md5_unkeyed_context_semantic_integrity():
    """Verify that an unkeyed MD5 hash path does NOT emit REDUCE_BLAST_RADIUS.

    Instead, it must be driven solely by MD5 weakness (REDUCE_DATA_EXPOSURE)
    and crypto agility (PREPARE), even when data context is present.
    """
    finding_id = uuid.uuid4()
    path_id = uuid.uuid4()

    finding = FindingModel(
        id=finding_id,
        project_id=PROJECT_ID,
        scan_id=str(uuid.uuid4()),
        name="MD5",
        asset_type="operation",
        algorithm="MD5",
        role="hashing",
        source_file="services/legacy/legacy.py",
        line_start=6,
        line_end=6,
        confidence="HIGH",
        created_at=NOW,
    )

    reachability = ReachabilityResult(
        id=uuid.uuid4(),
        asset_id=finding_id,
        entrypoint="/legacy",
        status="REACHABLE",
        created_at=NOW,
    )

    runtime_events = [
        RuntimeEvent(
            id=uuid.uuid4(),
            runtime_run_id=uuid.uuid4(),
            asset_id=finding_id,
            crypto_path_id=path_id,
            event_type="crypto_operation",
            algorithm="MD5",
            role="hashing",
            entrypoint="/legacy",
            execution_status="OBSERVED",
            timestamp=NOW,
            created_at=NOW,
        )
    ]

    data_assets = [
        DataAssetModel(
            id=uuid.uuid4(),
            project_id=PROJECT_ID,
            name="billing_archive",
            classification=None,
            sensitivity="Confidential",
            business_criticality=None,
            required_confidentiality_until="2033-01-01",
            created_at=NOW,
        )
    ]

    # Semantic integrity: NO key context for unkeyed hash
    context = ContextAggregate(
        finding=finding,
        reachability=reachability,
        runtime=runtime_events,
        data_assets=data_assets,
        key_contexts=[],  # Explicitly empty — unkeyed hash has no key
        migration_context=MigrationContextModel(
            id=uuid.uuid4(),
            project_id=PROJECT_ID,
            crypto_asset_id=finding_id,
            direct_crypto_call_sites=2,
            provider_abstraction="",   # empty string = no abstraction layer
            external_dependencies=0,
            created_at=NOW,
        ),
        config_declared="MD5",
        config_observed="MD5",
        mismatch=False,
    )

    aggregate = AnalysisEngine.analyze(context, crypto_path_id=path_id)
    candidates = aggregate.action_candidates
    action_types = [c.action_type for c in candidates]

    # Primary assertion: unkeyed hashes must never inherit key-scope actions
    assert "REDUCE_BLAST_RADIUS" not in action_types, (
        f"Unkeyed MD5 path must NOT emit REDUCE_BLAST_RADIUS — got {action_types}"
    )
    assert "REDUCE_DATA_EXPOSURE" in action_types, (
        f"Broken MD5 algorithm must emit REDUCE_DATA_EXPOSURE — got {action_types}"
    )
    assert "PREPARE" in action_types, (
        f"Lack of abstraction layer must emit PREPARE — got {action_types}"
    )
    # REDUCE_DATA_EXPOSURE must be first (primary candidate)
    assert action_types[0] == "REDUCE_DATA_EXPOSURE", (
        f"Primary action for broken MD5 must be REDUCE_DATA_EXPOSURE — got {action_types[0]}"
    )
    assert aggregate.analysis_result.exposure_reduction_state == "EXPOSED"
    assert aggregate.analysis_result.key_concentration_state == "UNKNOWN"


def test_rsa_key_wrapped_context_semantic_integrity():
    """Verify that an RSA path with archive-master-v1 retains REDUCE_BLAST_RADIUS."""
    finding_id = uuid.uuid4()
    path_id = uuid.uuid4()

    finding = FindingModel(
        id=finding_id,
        project_id=PROJECT_ID,
        scan_id=str(uuid.uuid4()),
        name="RSA",
        asset_type="primitive",
        algorithm="RSA",
        role="Multiple",
        source_file="services/archive/archive.py",
        line_start=8,
        line_end=8,
        confidence="HIGH",
        created_at=NOW,
    )

    reachability = ReachabilityResult(
        id=uuid.uuid4(),
        asset_id=finding_id,
        entrypoint="/archive",
        status="REACHABLE",
        created_at=NOW,
    )

    runtime_events = [
        RuntimeEvent(
            id=uuid.uuid4(),
            runtime_run_id=uuid.uuid4(),
            asset_id=finding_id,
            crypto_path_id=path_id,
            event_type="crypto_operation",
            algorithm="RSA",
            role="asymmetric_encryption",
            entrypoint="/archive",
            execution_status="OBSERVED",
            timestamp=NOW,
            created_at=NOW,
        )
    ]

    data_assets = [
        DataAssetModel(
            id=uuid.uuid4(),
            project_id=PROJECT_ID,
            name="patient_archive",
            classification=None,
            sensitivity="Restricted",
            business_criticality="High",
            required_confidentiality_until="2036-09-30",
            created_at=NOW,
        )
    ]

    key_contexts = [
        KeyContextModel(
            id=uuid.uuid4(),
            project_id=PROJECT_ID,
            key_id_name="archive-master-v1",
            algorithm="RSA",
            scope="archive + backup",
            rotation_state="manual",
            custody_type="AWS KMS",
            created_at=NOW,
        )
    ]

    context = ContextAggregate(
        finding=finding,
        reachability=reachability,
        runtime=runtime_events,
        data_assets=data_assets,
        key_contexts=key_contexts,
        migration_context=MigrationContextModel(
            id=uuid.uuid4(),
            project_id=PROJECT_ID,
            crypto_asset_id=finding_id,
            direct_crypto_call_sites=5,
            provider_abstraction="",   # no abstraction
            external_dependencies=1,
            created_at=NOW,
        ),
        config_declared="RSA",
        config_observed="RSA",
        mismatch=False,
    )

    aggregate = AnalysisEngine.analyze(context, crypto_path_id=path_id)
    candidates = aggregate.action_candidates
    action_types = [c.action_type for c in candidates]

    assert "MIGRATION_PLANNING" in action_types, (
        f"RSA key-wrap with long-lived data must emit MIGRATION_PLANNING — got {action_types}"
    )
    assert "REDUCE_BLAST_RADIUS" in action_types, (
        f"Broad-scoped archive-master-v1 must emit REDUCE_BLAST_RADIUS — got {action_types}"
    )
    assert "PREPARE" in action_types, (
        f"No abstraction layer must emit PREPARE — got {action_types}"
    )
    assert action_types[0] == "MIGRATION_PLANNING", (
        f"Primary action for runtime RSA with long-lived data must be MIGRATION_PLANNING — got {action_types[0]}"
    )
    assert aggregate.analysis_result.key_concentration_state == "CONCENTRATED"
