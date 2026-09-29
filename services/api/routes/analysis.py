from fastapi import APIRouter, HTTPException, BackgroundTasks
import uuid
import datetime
from typing import Optional

from services.api.db import supabase
from services.api.models import ContextAggregate
from packages.analysis.engine import AnalysisEngine, ANALYSIS_VERSION

router = APIRouter(prefix="/projects", tags=["analysis"])

def run_analysis_for_scan(scan_id: str, project_id: str, commit_sha: str = None, repo_url: str = None, config: dict = None, scanner_version: str = "v1"):
    # Idempotency: cleanup existing analysis for this scan and version
    existing = supabase.table("analysis_runs").select("id").eq("scan_id", scan_id).eq("analysis_version", ANALYSIS_VERSION).execute()
    if existing.data:
        supabase.table("analysis_runs").delete().eq("id", existing.data[0]["id"]).execute()

    # Create Analysis Run
    run_res = supabase.table("analysis_runs").insert({
        "scan_id": scan_id,
        "project_id": project_id,
        "repository_url": repo_url,
        "commit_sha": commit_sha,
        "scan_configuration": config,
        "scanner_version": scanner_version,
        "analysis_version": ANALYSIS_VERSION
    }).execute()

    if not run_res.data:
        print("Failed to create analysis run")
        return

    analysis_run_id = run_res.data[0]["id"]

    findings_res = supabase.table("crypto_assets").select("*").eq("scan_id", scan_id).execute()
    if not findings_res.data:
        return

    asset_ids = [f["id"] for f in findings_res.data]

    data_res = supabase.table("data_assets").select("*").eq("scan_id", scan_id).execute()
    keys_res = supabase.table("key_contexts").select("*").eq("scan_id", scan_id).execute()
    reach_res = supabase.table("reachability_results").select("*").in_("asset_id", asset_ids).execute()
    mig_res = supabase.table("migration_contexts").select("*").in_("crypto_asset_id", asset_ids).execute()
    paths_res = supabase.table("crypto_paths").select("*").eq("scan_id", scan_id).execute()
    cfg_res = supabase.table("configuration_declarations").select("*").eq("scan_id", scan_id).execute()

    # ── KEY FIX: Fetch runtime events scoped to this scan
    runtime_res = supabase.table("runtime_events").select("*").eq("scan_id", scan_id).execute()
    runtime_by_asset: dict = {}
    runtime_by_path: dict = {}
    for rv in (runtime_res.data or []):
        if rv.get("asset_id"):
            runtime_by_asset.setdefault(rv["asset_id"], []).append(rv)
        if rv.get("crypto_path_id"):
            runtime_by_path.setdefault(rv["crypto_path_id"], []).append(rv)

    from services.api.models import (
        FindingModel, ReachabilityResult, DataAssetModel,
        KeyContextModel, MigrationContextModel, RuntimeEvent
    )

    data_by_id = {d["id"]: d for d in (data_res.data or [])}
    key_by_id = {k["id"]: k for k in (keys_res.data or [])}
    reach_by_asset = {r["asset_id"]: r for r in (reach_res.data or [])}
    mig_by_asset = {m["crypto_asset_id"]: m for m in (mig_res.data or [])}
    findings_by_id = {f["id"]: f for f in findings_res.data}
    cfg_by_service = {c["service_name"]: c for c in (cfg_res.data or [])}

    def entrypoint_to_service(ep: Optional[str]) -> Optional[str]:
        if not ep:
            return None
        if "archive" in ep:
            return "archive-service"
        if "partner" in ep:
            return "partner-service"
        if "legacy" in ep:
            return "legacy-service"
        if "export" in ep:
            return "export-service"
        if "backup" in ep:
            return "backup-service"
        if "identity" in ep or "auth" in ep:
            return "identity-service"
        return None

    used_finding_ids = set()

    # 1. Analyze each CryptoPath
    for p in (paths_res.data or []):
        f = findings_by_id.get(p.get("crypto_asset_id"))
        if not f:
            continue

        try:
            finding = FindingModel(**f)
        except Exception as e:
            print(f"FindingModel parse error for {f.get('id')}: {e}")
            continue

        reach = reach_by_asset.get(f["id"])
        mig = mig_by_asset.get(f["id"])

        # Determine runtime events for this path
        path_events = runtime_by_path.get(p["id"], [])
        if not path_events:
            # Fall back to asset-level runtime matching this entrypoint
            path_events = [
                e for e in runtime_by_asset.get(f["id"], [])
                if not e.get("entrypoint") or e.get("entrypoint") == p.get("entrypoint")
            ]

        runtime_events_models = []
        for rv in path_events:
            try:
                runtime_events_models.append(RuntimeEvent(
                    id=rv["id"],
                    runtime_run_id=rv["runtime_run_id"],
                    asset_id=rv.get("asset_id"),
                    crypto_path_id=rv.get("crypto_path_id"),
                    event_type=rv.get("event_type") or "crypto_operation",
                    algorithm=rv.get("algorithm"),
                    role=rv.get("role"),
                    entrypoint=rv.get("entrypoint"),
                    source_locator=rv.get("source_locator") or (
                        f"{rv['source_file']}:{rv['source_line']}" if rv.get("source_file") else None
                    ),
                    execution_status=rv.get("execution_status") or "OBSERVED",
                    timestamp=rv.get("timestamp") or rv.get("started_at") or rv["created_at"],
                    created_at=rv["created_at"],
                ))
            except Exception as e:
                print(f"RuntimeEvent parse error: {e}")

        # Evidence-scoped data asset and key context
        data_row = data_by_id.get(p.get("data_asset_id"))
        key_row = key_by_id.get(p.get("key_context_id"))

        svc_name = entrypoint_to_service(p.get("entrypoint"))
        cfg = cfg_by_service.get(svc_name) if svc_name else None

        context = ContextAggregate(
            finding=finding,
            reachability=ReachabilityResult(**reach) if reach else None,
            runtime=runtime_events_models,
            data_assets=[DataAssetModel(**data_row)] if data_row else [],
            key_contexts=[KeyContextModel(**key_row)] if key_row else [],
            migration_context=MigrationContextModel(**mig) if mig else None,
            config_declared=cfg.get("declared_algorithm") if cfg else None,
            config_observed=runtime_events_models[0].algorithm if runtime_events_models else None,
            mismatch=bool(cfg and cfg.get("mismatch_detected"))
        )

        path_id_val = uuid.UUID(p["id"])
        aggregate = AnalysisEngine.analyze(context, crypto_path_id=path_id_val)
        res_model = aggregate.analysis_result

        # Handle DB uniqueness constraint (analysis_run_id, finding_id)
        if f["id"] not in used_finding_ids:
            finding_id_val = str(res_model.finding_id)
            used_finding_ids.add(f["id"])
        else:
            finding_id_val = None

        ar_res = supabase.table("analysis_results").insert({
            "analysis_run_id": analysis_run_id,
            "finding_id": finding_id_val,
            "crypto_path_id": str(res_model.crypto_path_id) if res_model.crypto_path_id else None,
            "evidence_state": res_model.evidence_state,
            "evidence_coverage": res_model.evidence_coverage,
            "required_protection_until": res_model.required_protection_until,
            "change_lead_time": res_model.change_lead_time,
            "runway_state": res_model.runway_state,
            "runway_basis": res_model.runway_basis,
            "planning_assumptions": res_model.planning_assumptions,
            "migration_effort": res_model.migration_effort,
            "crypto_agility_state": res_model.crypto_agility_state,
            "key_concentration_state": res_model.key_concentration_state,
            "exposure_reduction_state": res_model.exposure_reduction_state
        }).execute()

        if ar_res.data:
            result_id = ar_res.data[0]["id"]
            for cand in aggregate.action_candidates:
                supabase.table("action_candidates").insert({
                    "analysis_result_id": result_id,
                    "action_type": cand.action_type,
                    "why": cand.why,
                    "supporting_evidence": cand.supporting_evidence,
                    "missing_evidence": cand.missing_evidence
                }).execute()

    # 2. Analyze standalone findings not linked to any path (e.g. certificates)
    for f in findings_res.data:
        if f["id"] in used_finding_ids:
            continue

        try:
            finding = FindingModel(**f)
        except Exception:
            continue

        reach = reach_by_asset.get(f["id"])
        mig = mig_by_asset.get(f["id"])

        context = ContextAggregate(
            finding=finding,
            reachability=ReachabilityResult(**reach) if reach else None,
            runtime=[],
            data_assets=[],
            key_contexts=[],
            migration_context=MigrationContextModel(**mig) if mig else None,
        )

        aggregate = AnalysisEngine.analyze(context, crypto_path_id=None)
        res_model = aggregate.analysis_result
        used_finding_ids.add(f["id"])

        ar_res = supabase.table("analysis_results").insert({
            "analysis_run_id": analysis_run_id,
            "finding_id": str(res_model.finding_id),
            "crypto_path_id": None,
            "evidence_state": res_model.evidence_state,
            "evidence_coverage": res_model.evidence_coverage,
            "required_protection_until": res_model.required_protection_until,
            "change_lead_time": res_model.change_lead_time,
            "runway_state": res_model.runway_state,
            "runway_basis": res_model.runway_basis,
            "planning_assumptions": res_model.planning_assumptions,
            "migration_effort": res_model.migration_effort,
            "crypto_agility_state": res_model.crypto_agility_state,
            "key_concentration_state": res_model.key_concentration_state,
            "exposure_reduction_state": res_model.exposure_reduction_state
        }).execute()

        if ar_res.data:
            result_id = ar_res.data[0]["id"]
            for cand in aggregate.action_candidates:
                supabase.table("action_candidates").insert({
                    "analysis_result_id": result_id,
                    "action_type": cand.action_type,
                    "why": cand.why,
                    "supporting_evidence": cand.supporting_evidence,
                    "missing_evidence": cand.missing_evidence
                }).execute()


@router.post("/{project_id}/scans/{scan_id}/analyze")
def trigger_analysis(project_id: uuid.UUID, scan_id: uuid.UUID, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_analysis_for_scan, str(scan_id), str(project_id))
    return {"status": "Analysis queued"}


@router.get("/{project_id}/analysis/summary")
def get_analysis_summary(project_id: uuid.UUID, scan_id: Optional[str] = None):
    """Analysis summary scoped to a scan if provided."""
    if scan_id:
        runs_res = supabase.table("analysis_runs").select("*").eq("scan_id", scan_id).eq("project_id", str(project_id)).order("created_at", desc=True).limit(1).execute()
    else:
        runs_res = supabase.table("analysis_runs").select("*").eq("project_id", str(project_id)).order("created_at", desc=True).limit(1).execute()
    if not runs_res.data:
        return {"categories": []}

    run_id = runs_res.data[0]["id"]
    results_res = supabase.table("analysis_results").select("*").eq("analysis_run_id", run_id).execute()
    results = results_res.data or []

    # Runtime-observed paths: count from evidence_state containing OBSERVED
    runtime_observed = sum(1 for r in results if "OBSERVED" in (r.get("evidence_state") or ""))

    categories = [
        {"name": "Runtime-observed paths", "count": runtime_observed},
        {"name": "Long-lived protected data", "count": sum(1 for r in results if r.get("runway_state") in ["NEEDS_PLANNING", "URGENT"])},
        {"name": "Low crypto-agility readiness", "count": sum(1 for r in results if r.get("crypto_agility_state") == "LOW_READINESS")},
        {"name": "High migration effort", "count": sum(1 for r in results if r.get("migration_effort") == "HIGH")},
        {"name": "Evidence gaps", "count": sum(1 for r in results if r.get("evidence_coverage") == "INSUFFICIENT")},
    ]

    return {"categories": categories, "analysis_run_id": run_id, "scan_id": runs_res.data[0]["scan_id"]}


@router.get("/{project_id}/findings/{finding_id}/analysis")
def get_finding_analysis(project_id: uuid.UUID, finding_id: uuid.UUID, scan_id: Optional[str] = None):
    """Get analysis for a specific finding, optionally scoped to a scan."""
    if scan_id:
        runs_res = supabase.table("analysis_runs").select("*").eq("scan_id", scan_id).eq("project_id", str(project_id)).order("created_at", desc=True).limit(1).execute()
    else:
        runs_res = supabase.table("analysis_runs").select("*").eq("project_id", str(project_id)).order("created_at", desc=True).limit(1).execute()
    if not runs_res.data:
        return None

    run_id = runs_res.data[0]["id"]
    res = supabase.table("analysis_results").select("*").eq("analysis_run_id", run_id).eq("finding_id", str(finding_id)).execute()
    if not res.data:
        return None

    analysis_res = res.data[0]
    cands_res = supabase.table("action_candidates").select("*").eq("analysis_result_id", analysis_res["id"]).execute()
    analysis_res["action_candidates"] = cands_res.data or []
    return analysis_res
