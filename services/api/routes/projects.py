from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel
from services.api.db import supabase
from services.api.models import Project, ProjectCreate, ScanRun, ScanRunCreate
import uuid
import datetime

router = APIRouter(prefix="/projects", tags=["projects"])

@router.post("/", response_model=Project)
def create_project(project: ProjectCreate):
    res = supabase.table("projects").insert({"name": project.name}).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create project")
    return res.data[0]

@router.delete("/{project_id}")
def delete_project(project_id: uuid.UUID):
    res = supabase.table("projects").delete().eq("id", str(project_id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "success"}

@router.post("/{project_id}/reset-demo")
def reset_demo_project(project_id: uuid.UUID):
    supabase.table("scan_runs").delete().eq("project_id", str(project_id)).execute()
    return {"status": "success", "message": "Project reset. Scans, evidence, and analysis cleared."}

@router.get("/", response_model=list[Project])
def get_projects():
    res = supabase.table("projects").select("*").execute()
    return res.data


# ─────────────────────────────────────────────────────────────────────────────
# CANONICAL SUMMARY  —  single source of truth for overview counts
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{project_id}/summary")
def get_project_summary(project_id: uuid.UUID, scan_id: Optional[str] = None):
    """
    Returns one canonical ProjectInvestigationSummary for the given project.

    All counts are scoped to a single scan_id. If scan_id is omitted, uses
    the most-recently COMPLETED scan.

    This endpoint is the single source of truth used by:
    - Overview page
    - Layout header
    - CBOM and Report endpoints (for counts)
    """
    # Resolve scan_id
    if scan_id:
        scans_res = supabase.table("scan_runs").select("*")\
            .eq("id", scan_id).eq("project_id", str(project_id)).execute()
    else:
        scans_res = supabase.table("scan_runs").select("*")\
            .eq("project_id", str(project_id))\
            .eq("status", "COMPLETED")\
            .order("completed_at", desc=True).limit(1).execute()

    if not scans_res.data:
        return {
            "project_id": str(project_id),
            "latest_completed_scan_id": None,
            "latest_completed_scan_commit_sha": None,
            "scan_completed_at": None,
            "discovery": {"files": 0, "crypto_assets": 0, "certificates": 0, "key_metadata": 0},
            "verification": {"reachable_paths": 0, "runtime_observed_paths": 0,
                             "configuration_declared": 0, "configuration_mismatches": 0},
            "context": {"mapped_data_assets": 0, "mapped_key_context": 0, "evidence_gaps": 0},
            "analysis": {
                "long_lived_data_paths": 0,
                "low_crypto_agility_paths": 0,
                "migration_effort_high": 0,
                "migration_effort_medium": 0,
                "migration_effort_low": 0,
                "runway_comfortable": 0,
                "runway_watch": 0,
                "runway_needs_planning": 0,
                "runway_urgent": 0,
                "runway_unknown": 0,
            }
        }

    scan = scans_res.data[0]
    sid = scan["id"]

    # Discovery ──────────────────────────────────────────────────────────────
    # Total canonical crypto_assets for this scan (includes certificates)
    assets_res = supabase.table("crypto_assets").select("id, asset_type")\
        .eq("scan_id", sid).execute()
    all_assets = assets_res.data or []
    total_assets = len(all_assets)
    cert_asset_ids = [a["id"] for a in all_assets if a["asset_type"] == "certificate"]

    # Certificate count from certificates table (keyed by scan_id)
    certs_res = supabase.table("certificates").select("id").eq("scan_id", sid).execute()
    cert_count = len(certs_res.data or [])

    # Key metadata count
    keys_res = supabase.table("key_contexts").select("id").eq("scan_id", sid).execute()
    key_count = len(keys_res.data or [])

    # Verification ────────────────────────────────────────────────────────────
    # Reachable: distinct assets with REACHABLE status in reachability_results
    reach_res = supabase.table("reachability_results").select("asset_id, status")\
        .in_("asset_id", [a["id"] for a in all_assets]).execute()
    reach_data = reach_res.data or []
    reachable_count = sum(1 for r in reach_data if r["status"] == "REACHABLE")

    # Runtime events: count of actual persisted RuntimeEvent records for this scan
    runtime_events_res = supabase.table("runtime_events").select("id, crypto_path_id, asset_id").eq("scan_id", sid).execute()
    runtime_events_data = runtime_events_res.data or []
    runtime_events_count = len(runtime_events_data)

    # Runtime observed paths: distinct CryptoPaths (or observed assets) with one or more successful RuntimeEvents
    observed_path_ids = set(r["crypto_path_id"] for r in runtime_events_data if r.get("crypto_path_id"))
    if not observed_path_ids and runtime_events_data:
        observed_assets = set(r["asset_id"] for r in runtime_events_data if r.get("asset_id"))
        runtime_observed_count = len(observed_assets)
    else:
        runtime_observed_count = len(observed_path_ids)

    # Configuration declared: evidence records of type 'configuration'
    if all_assets:
        config_evid_res = supabase.table("evidence").select("asset_id")\
            .in_("asset_id", [a["id"] for a in all_assets])\
            .eq("evidence_type", "configuration").execute()
        config_declared = len(set(r["asset_id"] for r in (config_evid_res.data or [])))
    else:
        config_declared = 0

    # Mismatches: from migration_contexts (simplistic: track per asset)
    if all_assets:
        mismatch_res = supabase.table("migration_contexts").select("id")\
            .in_("crypto_asset_id", [a["id"] for a in all_assets]).execute()
    # For now config/runtime mismatch is not fully computed; 0 is correct if no harness ran.
    config_mismatches = 0

    # Context ─────────────────────────────────────────────────────────────────
    data_assets_res = supabase.table("data_assets").select("id").eq("scan_id", sid).execute()
    mapped_data = len(data_assets_res.data or [])

    paths_res = supabase.table("crypto_paths").select("id").eq("scan_id", sid).execute()
    mapped_paths = len(paths_res.data or [])

    # Analysis ────────────────────────────────────────────────────────────────
    # Use the most recent analysis_run for this scan
    ar_res = supabase.table("analysis_runs").select("id")\
        .eq("scan_id", sid).order("created_at", desc=True).limit(1).execute()

    long_lived = low_agility = effort_high = effort_medium = effort_low = 0
    runway_comfortable = runway_watch = runway_needs_planning = runway_urgent = runway_unknown = 0
    evidence_gaps = 0

    if ar_res.data:
        run_id = ar_res.data[0]["id"]
        results_res = supabase.table("analysis_results").select("*")\
            .eq("analysis_run_id", run_id).execute()
        results = results_res.data or []

        long_lived = sum(1 for r in results
                         if r.get("runway_state") in ["NEEDS_PLANNING", "URGENT"])
        low_agility = sum(1 for r in results
                          if r.get("crypto_agility_state") == "LOW_READINESS")
        effort_high = sum(1 for r in results if r.get("migration_effort") == "HIGH")
        effort_medium = sum(1 for r in results if r.get("migration_effort") == "MEDIUM")
        effort_low = sum(1 for r in results if r.get("migration_effort") == "LOW")
        runway_comfortable = sum(1 for r in results if r.get("runway_state") == "COMFORTABLE")
        runway_watch = sum(1 for r in results if r.get("runway_state") == "WATCH")
        runway_needs_planning = sum(1 for r in results if r.get("runway_state") == "NEEDS_PLANNING")
        runway_urgent = sum(1 for r in results if r.get("runway_state") == "URGENT")
        runway_unknown = sum(1 for r in results if not r.get("runway_state"))
        evidence_gaps = sum(1 for r in results if r.get("evidence_coverage") == "INSUFFICIENT")

    return {
        "project_id": str(project_id),
        "latest_completed_scan_id": sid,
        "latest_completed_scan_commit_sha": scan.get("commit_sha"),
        "latest_completed_scan_repository_url": scan.get("repository_url"),
        "scan_completed_at": scan.get("completed_at"),
        "discovery": {
            "files": scan.get("files_scanned", 0),
            "crypto_assets": total_assets,
            "certificates": cert_count,
            "key_metadata": key_count,
        },
        "verification": {
            "reachable_paths": reachable_count,
            "runtime_events": runtime_events_count,
            "runtime_observed_paths": runtime_observed_count,
            "configuration_declared": config_declared,
            "configuration_mismatches": config_mismatches,
        },
        "context": {
            "mapped_data_assets": mapped_data,
            "mapped_key_context": key_count,
            "evidence_gaps": evidence_gaps,
        },
        "analysis": {
            "long_lived_data_paths": long_lived,
            "low_crypto_agility_paths": low_agility,
            "migration_effort_high": effort_high,
            "migration_effort_medium": effort_medium,
            "migration_effort_low": effort_low,
            "runway_comfortable": runway_comfortable,
            "runway_watch": runway_watch,
            "runway_needs_planning": runway_needs_planning,
            "runway_urgent": runway_urgent,
            "runway_unknown": runway_unknown,
        }
    }


# ─────────────────────────────────────────────────────────────────────────────
# CANONICAL FINDINGS  —  batched, no N+1
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{project_id}/findings")
def get_project_findings(project_id: uuid.UUID, scan_id: Optional[str] = None):
    """
    Returns normalized findings for a scan.

    Each row represents one canonical crypto_asset (not one detection event).
    Evidence, reachability, and runtime state are batched — no N+1.
    """
    try:
        if scan_id:
            scans_res = supabase.table("scan_runs").select("id")\
                .eq("id", scan_id).eq("project_id", str(project_id)).execute()
        else:
            scans_res = supabase.table("scan_runs").select("id")\
                .eq("project_id", str(project_id)).eq("status", "COMPLETED")\
                .order("completed_at", desc=True).limit(1).execute()

        if not scans_res.data:
            return []
        sid = scans_res.data[0]["id"]

        # All assets for this scan
        assets_res = supabase.table("crypto_assets").select("*").eq("scan_id", sid).execute()
        assets = assets_res.data or []
        if not assets:
            return []

        asset_ids = [a["id"] for a in assets]

        # Batch-fetch evidence (guard against empty list)
        evid_res = supabase.table("evidence").select("*").in_("asset_id", asset_ids).execute()
        evidence_by_asset: dict = {}
        for ev in (evid_res.data or []):
            evidence_by_asset.setdefault(ev["asset_id"], []).append(ev)

        # Batch-fetch reachability
        reach_res = supabase.table("reachability_results").select("*").in_("asset_id", asset_ids).execute()
        reach_by_asset: dict = {}
        for r in (reach_res.data or []):
            reach_by_asset[r["asset_id"]] = r

        # Batch-fetch runtime events
        runtime_res = supabase.table("runtime_events").select("*").in_("asset_id", asset_ids).execute()
        runtime_by_asset: dict = {}
        for rv in (runtime_res.data or []):
            runtime_by_asset.setdefault(rv["asset_id"], []).append(rv)

        # Batch-fetch crypto paths
        paths_res = supabase.table("crypto_paths").select("*").in_("crypto_asset_id", asset_ids).execute()
        paths_by_asset: dict = {}
        for p in (paths_res.data or []):
            paths_by_asset.setdefault(p["crypto_asset_id"], []).append(p)

        findings = []
        for a in assets:
            aid = a["id"]
            evidence = evidence_by_asset.get(aid, [])
            reachability = reach_by_asset.get(aid)
            runtime = runtime_by_asset.get(aid, [])
            paths = paths_by_asset.get(aid, [])

            # Config state: check if any evidence is type 'configuration'
            config_declared = any(e.get("evidence_type") == "configuration" for e in evidence)
            mismatch = False  # Only set when harness explicitly detects a mismatch

            findings.append({
                "finding": a,
                "evidence": evidence,
                "evidence_count": len(evidence),
                "reachability": reachability,
                "runtime": runtime,
                "config_declared": config_declared,
                "mismatch": mismatch,
                "crypto_paths": paths,
            })

        return findings

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error loading findings: {str(e)}")




from packages.analyzer.reachability import ReachabilityAnalyzer
from packages.runtime.harness import RuntimeHarness
from services.api.models import ReachabilityResult, RuntimeRun

@router.post("/{project_id}/reachability")
def run_reachability(project_id: uuid.UUID):
    scans_res = supabase.table("scan_runs").select("id").eq("project_id", str(project_id)).order("created_at", desc=True).limit(1).execute()
    if not scans_res.data:
        raise HTTPException(status_code=404, detail="No scan run found for project")

    latest_scan_id = scans_res.data[0]["id"]
    findings_res = supabase.table("crypto_assets").select("*").eq("scan_id", latest_scan_id).execute()
    findings = findings_res.data

    analyzer = ReachabilityAnalyzer("tests/fixtures/CareVault")
    results = []
    for f in findings:
        from packages.analyzer.scanner import Finding
        finding_obj = Finding(
            name=f["name"], asset_type=f["asset_type"], algorithm=f["algorithm"] or "",
            role=f["role"] or "", source_file=f.get("source_file") or "",
            line_start=0, line_end=0, library=f.get("library") or "",
            detector_rule=f.get("detector_rule") or "CANONICAL",
            confidence=f.get("confidence") or "MEDIUM", snippet=""
        )
        status, entrypoint = analyzer.analyze_finding(finding_obj)
        res_data = {"asset_id": f["id"], "entrypoint": entrypoint, "status": status,
                    "evidence": f"Analyzed via call graph from {entrypoint}" if entrypoint else None}
        existing = supabase.table("reachability_results").select("id").eq("asset_id", f["id"]).execute()
        if existing.data:
            upsert_res = supabase.table("reachability_results").update(res_data).eq("id", existing.data[0]["id"]).execute()
        else:
            upsert_res = supabase.table("reachability_results").insert(res_data).execute()
        if upsert_res.data:
            results.append(upsert_res.data[0])
    return {"message": "Reachability completed", "results": results}


@router.post("/{project_id}/runtime-runs")
def start_runtime_run(project_id: uuid.UUID, scenario: str = "archive_write"):
    run_data = {
        "project_id": str(project_id),
        "status": "COMPLETED",
        "started_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "completed_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "scenario": scenario
    }
    run_res = supabase.table("runtime_runs").insert(run_data).execute()
    run_id = run_res.data[0]["id"]

    harness = RuntimeHarness("tests/fixtures/CareVault")
    entrypoint_map = {"archive_write": "/archive", "export": "/export", "partner": "/partner"}
    events = harness.run_scenario(scenario, entrypoint_map.get(scenario, "/unknown"))

    saved_events = []
    scans_res = supabase.table("scan_runs").select("id").eq("project_id", str(project_id)).order("created_at", desc=True).limit(1).execute()
    assets = []
    if scans_res.data:
        assets = supabase.table("crypto_assets").select("id, source_file").eq("scan_id", scans_res.data[0]["id"]).execute().data or []

    for ev in events:
        matched_asset_id = None
        ev_file = ev.source_locator.split(":")[0]
        for a in assets:
            if a.get("source_file") == ev_file:
                matched_asset_id = a["id"]
                break
        ev_data = {
            "runtime_run_id": run_id, "asset_id": matched_asset_id,
            "algorithm": ev.algorithm, "role": ev.role, "entrypoint": ev.entrypoint,
            "source_locator": ev.source_locator, "execution_status": ev.execution_status
        }
        ev_res = supabase.table("runtime_events").insert(ev_data).execute()
        if ev_res.data:
            saved_events.append(ev_res.data[0])

    supabase.table("runtime_runs").update({"events_detected": len(saved_events)}).eq("id", run_id).execute()
    return {"message": "Runtime verification completed", "events": saved_events}


@router.get("/{project_id}/scans/latest", response_model=ScanRun)
def get_latest_scan(project_id: uuid.UUID):
    scans_res = supabase.table("scan_runs").select("*")\
        .eq("project_id", str(project_id)).order("created_at", desc=True).limit(1).execute()
    if not scans_res.data:
        raise HTTPException(status_code=404, detail="No scans found")
    return scans_res.data[0]

@router.get("/{project_id}/scans", response_model=list[ScanRun])
def get_all_scans(project_id: uuid.UUID):
    scans_res = supabase.table("scan_runs").select("*")\
        .eq("project_id", str(project_id)).order("created_at", desc=True).execute()
    return scans_res.data

from services.api.models import ScanStage
@router.get("/{project_id}/scans/{scan_id}/stages", response_model=list[ScanStage])
def get_scan_stages(project_id: uuid.UUID, scan_id: uuid.UUID):
    scans_res = supabase.table("scan_runs").select("id")\
        .eq("id", str(scan_id)).eq("project_id", str(project_id)).execute()
    if not scans_res.data:
        raise HTTPException(status_code=404, detail="Scan not found for this project")
    stages_res = supabase.table("scan_stages").select("*")\
        .eq("scan_run_id", str(scan_id)).order("created_at", desc=False).execute()
    return stages_res.data

# Phase 3 Context Endpoints
from services.api.models import CryptoPathModel, DataAssetModel, KeyContextModel, ControlModel, MigrationContextModel

@router.get("/{project_id}/crypto-paths", response_model=list[CryptoPathModel])
def get_crypto_paths(project_id: uuid.UUID, scan_id: Optional[str] = None):
    q = supabase.table("crypto_paths").select("*").eq("project_id", str(project_id))
    if scan_id:
        q = q.eq("scan_id", scan_id)
    res = q.execute()
    return res.data

@router.get("/{project_id}/data-assets", response_model=list[DataAssetModel])
def get_data_assets(project_id: uuid.UUID, scan_id: Optional[str] = None):
    q = supabase.table("data_assets").select("*").eq("project_id", str(project_id))
    if scan_id:
        q = q.eq("scan_id", scan_id)
    res = q.execute()
    return res.data

@router.get("/{project_id}/keys", response_model=list[KeyContextModel])
def get_keys(project_id: uuid.UUID, scan_id: Optional[str] = None):
    q = supabase.table("key_contexts").select("*").eq("project_id", str(project_id))
    if scan_id:
        q = q.eq("scan_id", scan_id)
    res = q.execute()
    return res.data

@router.get("/{project_id}/controls", response_model=list[ControlModel])
def get_controls(project_id: uuid.UUID, scan_id: Optional[str] = None):
    if scan_id:
        asset_ids_res = supabase.table("crypto_assets").select("id").eq("scan_id", scan_id).execute()
        asset_ids = [a["id"] for a in (asset_ids_res.data or [])]
        if not asset_ids:
            return []
        res = supabase.table("controls").select("*").in_("crypto_asset_id", asset_ids).execute()
    else:
        res = supabase.table("controls").select("*").eq("project_id", str(project_id)).execute()
    return res.data or []


@router.get("/{project_id}/evidence")
def get_evidence(project_id: uuid.UUID, scan_id: Optional[str] = None):
    """Return all evidence records for the project, scoped to a scan."""
    if scan_id:
        assets_res = supabase.table("crypto_assets").select("id").eq("scan_id", scan_id).execute()
    else:
        scans_res = supabase.table("scan_runs").select("id")\
            .eq("project_id", str(project_id)).eq("status", "COMPLETED")\
            .order("completed_at", desc=True).limit(1).execute()
        if not scans_res.data:
            return []
        assets_res = supabase.table("crypto_assets").select("id").eq("scan_id", scans_res.data[0]["id"]).execute()

    asset_ids = [a["id"] for a in (assets_res.data or [])]
    if not asset_ids:
        return []
    evid_res = supabase.table("evidence").select("*").in_("asset_id", asset_ids).execute()
    return evid_res.data or []


@router.get("/{project_id}/migration-context")
def get_migration_context(project_id: uuid.UUID):
    res = supabase.table("migration_contexts").select("*").eq("project_id", str(project_id)).execute()
    return res.data


# ─────────────────────────────────────────────────────────────────────────────
# PROJECT-SCOPED FINDING DETAIL  —  Fixes "Finding not found" bug
# Frontend calls /projects/{pid}/findings/{id}/verification
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{project_id}/findings/{finding_id}/verification")
def get_project_finding_verification(project_id: uuid.UUID, finding_id: uuid.UUID):
    """
    Project-scoped finding verification endpoint.
    """
    from services.api.routes.findings import _build_finding_verification
    return _build_finding_verification(str(finding_id), str(project_id))


@router.get("/{project_id}/findings/{finding_id}/detail")
def get_project_finding_detail(project_id: uuid.UUID, finding_id: uuid.UUID, scan_id: Optional[str] = None):
    """
    Canonical finding detail: returns ALL related data in one payload.
    Frontend should prefer this over multiple separate endpoint calls.
    """
    from services.api.routes.findings import _build_canonical_detail
    return _build_canonical_detail(str(finding_id), str(project_id), scan_id)


@router.get("/{project_id}/findings/{finding_id}/analysis")
def get_project_finding_analysis(project_id: uuid.UUID, finding_id: uuid.UUID):
    """Project-scoped finding analysis (Phase 5 result)."""
    ar_res = supabase.table("analysis_results").select("*, action_candidates(*)")\
        .eq("finding_id", str(finding_id)).order("created_at", desc=True).limit(1).execute()
    if not ar_res.data:
        return None
    result = ar_res.data[0]
    candidates = result.pop("action_candidates", []) or []
    # Pull analysis_run for context
    run_res = supabase.table("analysis_runs").select("*").eq("id", result["analysis_run_id"]).execute()
    run = run_res.data[0] if run_res.data else {}
    return {
        **result,
        "action_candidates": candidates,
        "analysis_version": run.get("analysis_version"),
        "commit_sha": run.get("commit_sha"),
    }


@router.post("/{project_id}/findings/{finding_id}/what-if")
def project_finding_what_if(project_id: uuid.UUID, finding_id: uuid.UUID, body: dict):
    """Proxy to the what-if engine, project-scoped."""
    from services.api.routes import whatif as whatif_module
    from services.api.models import WhatIfRequest
    req = WhatIfRequest(
        scenario_type=body.get("scenario_type", "INTRODUCE_CRYPTO_ABSTRACTION"),
        overrides=body.get("overrides", {})
    )
    return whatif_module.trigger_what_if(project_id, finding_id, req)


# ─────────────────────────────────────────────────────────────────────────────
# CBOM  —  Primary cryptographic inventory
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{project_id}/cbom")
def get_cbom(project_id: uuid.UUID, scan_id: Optional[str] = None):
    """
    Returns the CBOM (Cryptographic Bill of Materials) for a project scan.
    This is the primary inventory. All counts must match the canonical summary.
    """
    try:
        if scan_id:
            scans_res = supabase.table("scan_runs").select("*")\
                .eq("id", scan_id).eq("project_id", str(project_id)).execute()
        else:
            scans_res = supabase.table("scan_runs").select("*")\
                .eq("project_id", str(project_id)).eq("status", "COMPLETED")\
                .order("completed_at", desc=True).limit(1).execute()

        if not scans_res.data:
            return {"scan_id": None, "sections": {}}

        scan = scans_res.data[0]
        sid = scan["id"]

        # All assets
        assets_res = supabase.table("crypto_assets").select("*").eq("scan_id", sid).execute()
        assets = assets_res.data or []

        # Evidence grouped by asset
        asset_ids = [a["id"] for a in assets]
        evid_res = supabase.table("evidence").select("*").in_("asset_id", asset_ids).execute() if asset_ids else type('R', (), {'data': []})()
        evid_by_asset: dict = {}
        for ev in (evid_res.data or []):
            evid_by_asset.setdefault(ev["asset_id"], []).append(ev)

        # Reachability per asset
        reach_res = supabase.table("reachability_results").select("asset_id, status").in_("asset_id", asset_ids).execute() if asset_ids else type('R', (), {'data': []})()
        reach_by_asset = {r["asset_id"]: r["status"] for r in (reach_res.data or [])}

        # Runtime per asset
        runtime_res = supabase.table("runtime_events").select("asset_id").in_("asset_id", asset_ids).execute() if asset_ids else type('R', (), {'data': []})()
        runtime_asset_ids = set(r["asset_id"] for r in (runtime_res.data or []))

        # Certificates (full detail)
        certs_res = supabase.table("certificates").select("*").eq("scan_id", sid).execute()
        certs = certs_res.data or []

        # Keys
        keys_res = supabase.table("key_contexts").select("*").eq("scan_id", sid).execute()
        keys = keys_res.data or []

        # Crypto paths
        paths_res = supabase.table("crypto_paths").select("*").in_("crypto_asset_id", asset_ids).execute() if asset_ids else type('R', (), {'data': []})()
        paths_by_asset: dict = {}
        for p in (paths_res.data or []):
            paths_by_asset.setdefault(p["crypto_asset_id"], []).append(p)
            
        # Migration contexts
        ctx_res = supabase.table("migration_contexts").select("*").in_("crypto_asset_id", asset_ids).execute() if asset_ids else type('R', (), {'data': []})()
        ctx_by_asset = {c["crypto_asset_id"]: c for c in (ctx_res.data or [])}

        # Analysis results
        ar_res = supabase.table("analysis_runs").select("id").eq("scan_id", sid).order("created_at", desc=True).limit(1).execute()
        analysis_by_asset = {}
        if ar_res.data:
            run_id = ar_res.data[0]["id"]
            results_res = supabase.table("analysis_results").select("*").eq("analysis_run_id", run_id).execute()
            # `analysis_results` joins on finding_id which is crypto_asset_id
            analysis_by_asset = {r["finding_id"]: r for r in (results_res.data or [])}

        # Build CBOM sections
        def asset_entry(a: dict) -> dict:
            aid = a["id"]
            evidence = evid_by_asset.get(aid, [])
            ctx = ctx_by_asset.get(aid, {})
            analysis = analysis_by_asset.get(aid, {})
            return {
                "id": aid,
                "name": a["name"],
                "asset_type": a["asset_type"],
                "algorithm": a["algorithm"],
                "role": a["role"],
                "library": a.get("library"),
                "evidence_count": len(evidence),
                "source_locations": list(set(
                    f"{e['file']}:{e['line']}" if e.get("line") else e["file"]
                    for e in evidence if e.get("file")
                )),
                "reachability": reach_by_asset.get(aid, "UNKNOWN"),
                "runtime_observed": aid in runtime_asset_ids,
                "crypto_path_count": len(paths_by_asset.get(aid, [])),
                "context": {
                    "provider": ctx.get("provider_abstraction"),
                },
                "analysis": {
                    "effort": analysis.get("migration_effort") or ctx.get("migration_effort_band"),
                    "runway": analysis.get("runway_state") or ctx.get("protection_runway_category")
                }
            }

        source_assets = [a for a in assets if a["asset_type"] != "certificate"]
        cert_assets = [a for a in assets if a["asset_type"] == "certificate"]

        return {
            "scan_id": sid,
            "commit_sha": scan.get("commit_sha"),
            "completed_at": scan.get("completed_at"),
            "sections": {
                "crypto_assets": [asset_entry(a) for a in source_assets],
                "certificates": certs,
                "key_metadata": keys,
            },
            "totals": {
                "crypto_assets": len(source_assets),
                "certificates": len(cert_assets),
                "key_metadata": len(keys),
                "total_assets": len(assets),
            }
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error loading CBOM: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# SCAN DETAIL
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{project_id}/scans/{scan_id}")
def get_scan_detail(project_id: uuid.UUID, scan_id: uuid.UUID):
    scan_res = supabase.table("scan_runs").select("*")\
        .eq("id", str(scan_id)).eq("project_id", str(project_id)).execute()
    if not scan_res.data:
        raise HTTPException(status_code=404, detail="Scan not found")
    scan = scan_res.data[0]

    stages_res = supabase.table("scan_stages").select("*")\
        .eq("scan_run_id", str(scan_id)).execute()
    stages = stages_res.data or []
    
    stage_meta = {
        "SOURCE_VERIFICATION": {
            "weight": 10,
            "label": "Source Verification & Provenance",
            "description": "Verifying repository identity, Git SHA, and checkout integrity"
        },
        "FILE_DISCOVERY": {
            "weight": 10,
            "label": "File Tree Discovery",
            "description": "Cataloging source files and repository hierarchy"
        },
        "STATIC_ANALYSIS": {
            "weight": 25,
            "label": "Static AST & Cryptographic Analysis",
            "description": "Scanning AST nodes for cryptographic primitives and call sites"
        },
        "CERTIFICATE_ANALYSIS": {
            "weight": 10,
            "label": "Certificate & Keystore Parsing",
            "description": "Parsing X.509 certificates, public keys, and cryptographic parameters"
        },
        "CONFIGURATION_ANALYSIS": {
            "weight": 10,
            "label": "Configuration & Data Catalog Ingestion",
            "description": "Analyzing data classifications, retention policies, and service configs"
        },
        "REACHABILITY": {
            "weight": 10,
            "label": "Call Graph & Reachability Analysis",
            "description": "Tracing interprocedural paths from entrypoints to cryptographic call sites"
        },
        "CONTEXT_ENRICHMENT": {
            "weight": 10,
            "label": "Context Enrichment & Security Controls",
            "description": "Generating custody, rotation, and post-quantum migration controls"
        },
        "RUNTIME_VERIFICATION": {
            "weight": 5,
            "label": "Runtime Execution Observation",
            "description": "Observing live cryptography invocations via runtime harness"
        },
        "ANALYSIS": {
            "weight": 8,
            "label": "Post-Quantum Migration Posture",
            "description": "Evaluating protection runways, migration effort bands, and quantum risk"
        },
        "COMPLETE": {
            "weight": 2,
            "label": "Sealing Cryptographic Manifest",
            "description": "Sealing CBOM manifest with cryptographic ground truth"
        },
    }

    order = list(stage_meta.keys())
    order_map = {name: idx for idx, name in enumerate(order)}
    stages.sort(key=lambda s: order_map.get(s["stage"], 999))

    # Calculate stage progress and overall progress
    total_weighted_progress = 0.0
    current_active_stage = None

    enriched_stages = []
    for st in stages:
        s_name = st["stage"]
        meta = stage_meta.get(s_name, {"weight": 10, "label": s_name, "description": ""})
        weight = meta["weight"]
        status = st.get("status", "PENDING")

        if status in ["COMPLETED", "SKIPPED"]:
            st_prog = 100
        elif status == "FAILED":
            st_prog = 100
        elif status == "RUNNING":
            if current_active_stage is None:
                current_active_stage = st
            items_proc = st.get("items_processed")
            items_tot = st.get("items_total")
            if items_tot and items_tot > 0 and items_proc is not None:
                st_prog = min(95, max(15, int((items_proc / items_tot) * 100)))
            else:
                st_prog = 50
        else:
            st_prog = 0

        st["progress"] = st_prog
        st["label"] = meta["label"]
        st["description"] = meta["description"]
        total_weighted_progress += (st_prog / 100.0) * weight
        enriched_stages.append(st)

    is_scan_active = scan.get("status") in ["SCANNING", "RUNNING", "QUEUED"]
    if scan.get("status") == "COMPLETED":
        overall_percentage = 100
    elif scan.get("status") == "FAILED":
        overall_percentage = int(total_weighted_progress)
    elif is_scan_active:
        overall_percentage = min(98, max(5, int(total_weighted_progress)))
    else:
        overall_percentage = int(total_weighted_progress)

    if current_active_stage is None and is_scan_active:
        pending_stages = [s for s in enriched_stages if s.get("status") == "PENDING"]
        if pending_stages:
            current_active_stage = pending_stages[0]

    cur_stage_name = current_active_stage["stage"] if current_active_stage else (
        "COMPLETE" if scan.get("status") == "COMPLETED" else "SOURCE_VERIFICATION"
    )
    cur_stage_label = stage_meta.get(cur_stage_name, {}).get("label", cur_stage_name)
    cur_stage_desc = stage_meta.get(cur_stage_name, {}).get("description", "")

    assets_res = supabase.table("crypto_assets").select("id, asset_type").eq("scan_id", str(scan_id)).execute()
    assets = assets_res.data or []
    asset_ids = [a["id"] for a in assets]

    reach_count = 0
    runtime_count = 0
    config_count = 0
    if asset_ids:
        for i in range(0, len(asset_ids), 50):
            chunk = asset_ids[i:i+50]
            reach_res = supabase.table("reachability_results").select("asset_id, status")\
                .in_("asset_id", chunk).execute()
            reach_count += sum(1 for r in (reach_res.data or []) if r["status"] == "REACHABLE")
            
            rt_res = supabase.table("runtime_events").select("asset_id").in_("asset_id", chunk).execute()
            runtime_count += len(set(r["asset_id"] for r in (rt_res.data or [])))
            
            cfg_res = supabase.table("evidence").select("asset_id")\
                .in_("asset_id", chunk).eq("evidence_type", "configuration").execute()
            config_count += len(set(r["asset_id"] for r in (cfg_res.data or [])))

    certs_res = supabase.table("certificates").select("id").eq("scan_id", str(scan_id)).execute()

    return {
        "scan": scan,
        "stages": enriched_stages,
        "progress": {
            "percentage": overall_percentage,
            "current_stage": cur_stage_name,
            "current_stage_label": cur_stage_label,
            "current_stage_description": cur_stage_desc,
            "is_active": is_scan_active,
            "started_at": scan.get("started_at"),
            "completed_at": scan.get("completed_at")
        },
        "counts": {
            "files_scanned": scan.get("files_scanned", 0),
            "crypto_assets": len([a for a in assets if a["asset_type"] != "certificate"]),
            "certificates": len(certs_res.data or []),
            "reachable_paths": reach_count,
            "runtime_observed": runtime_count,
            "configuration_declared": config_count,
        }
    }


# ─────────────────────────────────────────────────────────────────────────────
# PROJECT ASSISTANT ENDPOINT  —  Contextual AI Explanations across all entities
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{project_id}/assistant")
def generic_project_assistant(project_id: uuid.UUID, body: dict = {}):
    """
    Project-level contextual assistant endpoint for all entities:
    FINDING, PATH, DATA_ASSET, KEY_CONTEXT, CONTROL, READINESS, EVIDENCE, CBOM.
    """
    from services.api.assistant import get_assistant

    scan_id = body.get("scan_id")
    if not scan_id:
        scans_res = supabase.table("scan_runs").select("id")\
            .eq("project_id", str(project_id)).eq("status", "COMPLETED")\
            .order("completed_at", desc=True).limit(1).execute()
        if scans_res.data:
            scan_id = scans_res.data[0]["id"]
        else:
            scan_id = "059bfc23-cf81-4e62-a336-b4ee9e7e34e0"

    question = body.get("question", "Explain this item in detail.")
    mode = body.get("mode", "TECHNICAL")
    history = body.get("history", [])
    entity_type = body.get("entity_type")
    entity_id = body.get("entity_id")
    crypto_path_id = body.get("crypto_path_id")

    assistant = get_assistant()
    response = assistant.chat(
        crypto_path_id=crypto_path_id,
        scan_id=scan_id,
        question=question,
        mode=mode,
        history=history,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    return response

