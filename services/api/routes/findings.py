from fastapi import APIRouter, HTTPException
from services.api.db import supabase
from services.api.explanations import get_explanation_provider
import uuid
from typing import Optional

router = APIRouter(prefix="/findings", tags=["findings"])


def _build_finding_verification(finding_id: str, project_id: Optional[str] = None) -> dict:
    """
    Core finding detail builder. Returns the full verification aggregate for a crypto asset.
    Used by both /findings/{id}/verification and /projects/{pid}/findings/{id}/verification.
    """
    finding_res = supabase.table("crypto_assets").select("*").eq("id", finding_id).execute()
    if not finding_res.data:
        raise HTTPException(status_code=404, detail="Finding not found")
    finding = finding_res.data[0]

    # Validate project ownership if project_id provided
    if project_id:
        scan_res = supabase.table("scan_runs").select("project_id").eq("id", finding["scan_id"]).execute()
        if scan_res.data and str(scan_res.data[0]["project_id"]) != str(project_id):
            raise HTTPException(status_code=404, detail="Finding not found in this project")

    # Evidence
    evidence_res = supabase.table("evidence").select("*").eq("asset_id", finding_id).execute()
    evidence = evidence_res.data or []

    # Reachability
    reach_res = supabase.table("reachability_results").select("*").eq("asset_id", finding_id).execute()
    reachability = reach_res.data[0] if reach_res.data else None

    # Runtime events — prefer scan-scoped query
    scan_id = finding.get("scan_id")
    if scan_id:
        runtime_res = supabase.table("runtime_events").select("*")\
            .eq("asset_id", finding_id).eq("scan_id", str(scan_id)).execute()
    else:
        runtime_res = supabase.table("runtime_events").select("*").eq("asset_id", finding_id).execute()
    runtime = runtime_res.data or []

    # Enrich runtime events with verified execution code snippets
    from pathlib import Path
    import linecache
    for rt in runtime:
        if not rt.get("snippet"):
            # Check static evidence first
            ev_match = next((e for e in evidence if e.get("file") == rt.get("source_file") and e.get("line") == rt.get("source_line") and e.get("snippet")), None)
            if not ev_match:
                ev_match = next((e for e in evidence if e.get("file") == rt.get("source_file") and e.get("snippet")), None)
            if ev_match:
                rt["snippet"] = ev_match["snippet"]
            elif rt.get("source_file") and rt.get("source_line"):
                # Try reading from disk
                for base_dir in [Path("."), Path("Enterprise_info")]:
                    target_file = base_dir / rt["source_file"]
                    if target_file.exists():
                        try:
                            line_content = linecache.getline(str(target_file.resolve()), rt["source_line"]).strip()
                            if line_content:
                                rt["snippet"] = line_content
                                break
                        except Exception:
                            pass

    # Configuration evidence: look for evidence_type = 'configuration'
    config_evidence = [e for e in evidence if e.get("evidence_type") == "configuration"]
    config_declared = config_evidence[0].get("snippet") if config_evidence else None

    # Runtime mismatch: declared algo differs from runtime-observed algo
    mismatch = False
    if config_declared and runtime:
        for ev in config_evidence:
            if ev.get("snippet") and finding.get("algorithm") and \
               finding["algorithm"].upper() not in (ev.get("snippet") or "").upper():
                mismatch = True
                break

    # Crypto paths — scoped to scan
    if scan_id:
        paths_res = supabase.table("crypto_paths").select("*")\
            .eq("crypto_asset_id", finding_id).eq("scan_id", str(scan_id)).execute()
    else:
        paths_res = supabase.table("crypto_paths").select("*").eq("crypto_asset_id", finding_id).execute()
    crypto_paths = paths_res.data or []

    # Data assets and key contexts via crypto paths
    data_asset_ids = list(set(p["data_asset_id"] for p in crypto_paths if p.get("data_asset_id")))
    key_context_ids = list(set(p["key_context_id"] for p in crypto_paths if p.get("key_context_id")))

    data_assets = []
    if data_asset_ids:
        da_res = supabase.table("data_assets").select("*").in_("id", data_asset_ids).execute()
        data_assets = da_res.data or []

    key_contexts = []
    if key_context_ids:
        kc_res = supabase.table("key_contexts").select("*").in_("id", key_context_ids).execute()
        key_contexts = kc_res.data or []

    # Controls
    ctrls_res = supabase.table("controls").select("*").eq("crypto_asset_id", finding_id).execute()
    controls = ctrls_res.data or []

    # Migration context
    mig_res = supabase.table("migration_contexts").select("*").eq("crypto_asset_id", finding_id).execute()
    migration_context = mig_res.data[0] if mig_res.data else None

    # Analysis result
    analysis = None
    if scan_id:
        ar_res = supabase.table("analysis_runs").select("id").eq("scan_id", str(scan_id)).order("created_at", desc=True).limit(1).execute()
        if ar_res.data:
            run_id = ar_res.data[0]["id"]
            res = supabase.table("analysis_results").select("*").eq("analysis_run_id", run_id).eq("finding_id", finding_id).execute()
            if res.data:
                analysis = res.data[0]
                cands = supabase.table("action_candidates").select("*").eq("analysis_result_id", analysis["id"]).execute()
                analysis["action_candidates"] = cands.data or []

    # Certificates if this is a certificate asset
    certificates = []
    if finding.get("asset_type") == "certificate":
        cert_res = supabase.table("certificates").select("*").eq("crypto_asset_id", finding_id).execute()
        certificates = cert_res.data or []

    return {
        "finding": finding,
        "evidence": evidence,
        "reachability": reachability,
        "runtime": runtime,
        "config_declared": config_declared,
        "config_observed": None,
        "mismatch": mismatch,
        "crypto_paths": crypto_paths,
        "data_assets": data_assets,
        "key_contexts": key_contexts,
        "controls": controls,
        "migration_context": migration_context,
        "analysis": analysis,
        "certificates": certificates,
    }


def _build_canonical_detail(finding_id: str, project_id: Optional[str] = None, scan_id: Optional[str] = None) -> dict:
    """
    Canonical finding/asset detail endpoint payload.
    Returns a structured payload with all related data so the frontend
    can use a single fetch instead of 5+ separate calls.
    """
    try:
        verification = _build_finding_verification(finding_id, project_id)
    except HTTPException:
        raise
    
    # Evidence explanation via AI or deterministic fallback
    explanation_provider = get_explanation_provider()
    explained_evidence = explanation_provider.explain_finding(verification)
    finding = verification["finding"]

    return {
        **verification,
        "evidence": explained_evidence,
        "scan_id": str(scan_id) if scan_id else finding.get("scan_id"),
    }


@router.get("/{finding_id}")
def get_finding_detail(finding_id: uuid.UUID):
    finding_res = supabase.table("crypto_assets").select("*").eq("id", str(finding_id)).execute()
    if not finding_res.data:
        raise HTTPException(status_code=404, detail="Finding not found")
    finding = finding_res.data[0]
    evidence_res = supabase.table("evidence").select("*").eq("asset_id", str(finding_id)).execute()
    return {"finding": finding, "evidence": evidence_res.data or []}


@router.get("/{finding_id}/verification")
def get_finding_verification(finding_id: uuid.UUID):
    return _build_finding_verification(str(finding_id))


@router.get("/{finding_id}/detail")
def get_finding_canonical_detail(finding_id: uuid.UUID, project_id: Optional[str] = None, scan_id: Optional[str] = None):
    """Canonical detail endpoint: returns all related data in one payload."""
    return _build_canonical_detail(str(finding_id), project_id, scan_id)


@router.get("/scan/{scan_id}")
def get_scan_detail(scan_id: uuid.UUID):
    scan_res = supabase.table("scan_runs").select("*").eq("id", str(scan_id)).execute()
    if not scan_res.data:
        raise HTTPException(status_code=404, detail="Scan not found")
    findings_res = supabase.table("crypto_assets").select("*").eq("scan_id", str(scan_id)).execute()
    return {"scan": scan_res.data[0], "findings": findings_res.data or []}


@router.post("/paths/{crypto_path_id}/explain")
def explain_crypto_path(crypto_path_id: uuid.UUID, body: dict = {}):
    """Explain a crypto path using the EvidenceContextEngine + LLM/deterministic provider.
    
    Body may contain:
      - scan_id: str (required)
      - question: str (optional, defaults to general explanation)
    """
    from services.api.context_engine import get_context_engine

    scan_id = body.get("scan_id")
    if not scan_id:
        raise HTTPException(status_code=400, detail="scan_id is required")

    question = body.get("question")

    # Assemble provenance-tagged context
    engine = get_context_engine()
    context = engine.assemble_path_context(
        crypto_path_id=str(crypto_path_id),
        scan_id=scan_id,
        question=question,
    )

    # Generate explanation
    provider = get_explanation_provider()
    explanation = provider.explain_path(context, question=question)

    return {
        "crypto_path_id": str(crypto_path_id),
        "explanation": explanation,
        "context_summary": {
            "evidence_count": len(context.get("evidence", [])),
            "runtime_count": len(context.get("runtime", [])),
            "relationship_count": len(context.get("relationships", [])),
            "source_excerpt_count": len(context.get("source_excerpts", [])),
            "enterprise_doc_count": len(context.get("enterprise_documents", [])),
            "unknown_count": len(context.get("unknowns", [])),
            "has_analysis": context.get("analysis") is not None,
            "has_data_asset": context.get("data") is not None,
            "has_key_context": context.get("key") is not None,
        }
    }


@router.post("/paths/{crypto_path_id}/assistant")
def assistant_chat(crypto_path_id: uuid.UUID, body: dict = {}):
    """Conversational assistant endpoint for a crypto path."""
    from services.api.assistant import get_assistant
    
    scan_id = body.get("scan_id")
    if not scan_id:
        raise HTTPException(status_code=400, detail="scan_id is required")
        
    question = body.get("question")
    if not question:
        raise HTTPException(status_code=400, detail="question is required")
        
    mode = body.get("mode", "TECHNICAL")
    history = body.get("history", [])
    
    assistant = get_assistant()
    response = assistant.chat(str(crypto_path_id), scan_id, question, mode, history)
    
    return response

