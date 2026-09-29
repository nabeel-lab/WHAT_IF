from fastapi import APIRouter, HTTPException
import uuid
from typing import Optional

from services.api.db import supabase
from services.api.models import (
    WhatIfRequest, ContextAggregate, FindingModel, ReachabilityResult,
    DataAssetModel, KeyContextModel, MigrationContextModel, RuntimeEvent
)
from packages.analysis.whatif import WhatIfEngine
from packages.analysis.engine import ANALYSIS_VERSION

router = APIRouter(prefix="/projects", tags=["whatif"])

def build_baseline_context(scan_id: str, finding_id: str, crypto_path_id: Optional[str] = None) -> tuple[ContextAggregate, Optional[uuid.UUID]]:
    f_res = supabase.table("crypto_assets").select("*").eq("id", finding_id).execute()
    if not f_res.data:
        raise HTTPException(status_code=404, detail="Finding not found")
        
    finding = FindingModel(**f_res.data[0])
    
    # Path resolution: find specific path or fallback to finding's path in this scan
    path = None
    if crypto_path_id:
        p_res = supabase.table("crypto_paths").select("*").eq("id", crypto_path_id).execute()
        if p_res.data:
            path = p_res.data[0]
    if not path:
        p_res = supabase.table("crypto_paths").select("*").eq("scan_id", scan_id).eq("crypto_asset_id", finding_id).execute()
        if p_res.data:
            path = p_res.data[0]

    reach_res = supabase.table("reachability_results").select("*").eq("asset_id", finding_id).execute()
    mig_res = supabase.table("migration_contexts").select("*").eq("crypto_asset_id", finding_id).execute()
    
    # Runtime events
    if path and path.get("id"):
        rt_res = supabase.table("runtime_events").select("*").eq("scan_id", scan_id).or_(
            f"crypto_path_id.eq.{path['id']},and(asset_id.eq.{finding_id},entrypoint.eq.{path.get('entrypoint')})"
        ).execute()
    else:
        rt_res = supabase.table("runtime_events").select("*").eq("scan_id", scan_id).eq("asset_id", finding_id).execute()

    runtime_events = []
    for rv in (rt_res.data or []):
        runtime_events.append(RuntimeEvent(
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

    # Evidence-scoped data asset
    data_assets = []
    if path and path.get("data_asset_id"):
        d_res = supabase.table("data_assets").select("*").eq("id", path["data_asset_id"]).execute()
        if d_res.data:
            data_assets.append(DataAssetModel(**d_res.data[0]))
    elif not path:
        d_res = supabase.table("data_assets").select("*").eq("scan_id", scan_id).execute()
        data_assets = [DataAssetModel(**d) for d in d_res.data]

    # Evidence-scoped key context
    key_contexts = []
    if path and path.get("key_context_id"):
        k_res = supabase.table("key_contexts").select("*").eq("id", path["key_context_id"]).execute()
        if k_res.data:
            key_contexts.append(KeyContextModel(**k_res.data[0]))

    # Config
    entrypoint = path.get("entrypoint") if path else None
    svc_name = None
    if entrypoint:
        if "archive" in entrypoint: svc_name = "archive-service"
        elif "partner" in entrypoint: svc_name = "partner-service"
        elif "legacy" in entrypoint: svc_name = "legacy-service"
    
    cfg = None
    if svc_name:
        c_res = supabase.table("configuration_declarations").select("*").eq("scan_id", scan_id).eq("service_name", svc_name).execute()
        if c_res.data:
            cfg = c_res.data[0]

    reach = ReachabilityResult(**reach_res.data[0]) if reach_res.data else None
    mig = MigrationContextModel(**mig_res.data[0]) if mig_res.data else None

    context = ContextAggregate(
        finding=finding,
        reachability=reach,
        runtime=runtime_events,
        data_assets=data_assets,
        key_contexts=key_contexts,
        migration_context=mig,
        config_declared=cfg.get("declared_algorithm") if cfg else None,
        config_observed=runtime_events[0].algorithm if runtime_events else None,
        mismatch=bool(cfg and cfg.get("mismatch_detected"))
    )

    resolved_path_id = uuid.UUID(path["id"]) if (path and path.get("id")) else None
    return context, resolved_path_id

@router.post("/{project_id}/findings/{finding_id}/what-if")
def trigger_what_if(project_id: uuid.UUID, finding_id: uuid.UUID, request: WhatIfRequest):
    # 1. Fetch finding to ensure it belongs to project_id (Project isolation check)
    f_res = supabase.table("crypto_assets").select("scan_id, scan_runs!inner(project_id)").eq("id", str(finding_id)).execute()
    if not f_res.data:
        raise HTTPException(status_code=404, detail="Finding not found")
        
    if str(f_res.data[0]["scan_runs"]["project_id"]) != str(project_id):
        raise HTTPException(status_code=403, detail="Finding does not belong to this project")
        
    scan_id = f_res.data[0]["scan_id"]
    path_id_str = str(request.crypto_path_id) if request.crypto_path_id else None
    
    # 2. Reconstruct Baseline with full evidence scope
    baseline_context, resolved_path_id = build_baseline_context(str(scan_id), str(finding_id), path_id_str)
    
    # 3. Execute Counterfactual Simulation
    response = WhatIfEngine.simulate(
        baseline_context=baseline_context,
        request=request,
        baseline_scan_id=str(scan_id),
        baseline_analysis_version=ANALYSIS_VERSION,
        crypto_path_id=resolved_path_id
    )
    
    return response
