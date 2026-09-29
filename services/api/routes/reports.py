from fastapi import APIRouter, HTTPException
import uuid

from services.api.db import supabase
from packages.analysis.reporting import CBOMGenerator, ReportGenerator, ScanComparator

router = APIRouter(prefix="/projects", tags=["reports"])

def get_scan(scan_id: str):
    res = supabase.table("scan_runs").select("*").eq("id", scan_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Scan not found")
    return res.data[0]

@router.get("/{project_id}/scans/{scan_id}/cbom")
def export_cbom(project_id: uuid.UUID, scan_id: uuid.UUID):
    scan = get_scan(str(scan_id))
    if str(scan.get("project_id")) != str(project_id):
        raise HTTPException(status_code=403, detail="Project mismatch")
        
    findings = supabase.table("crypto_assets").select("*").eq("scan_id", str(scan_id)).execute().data
    certs = [] # Supabase certificates table not defined in MVP, stubbing.
    paths = supabase.table("crypto_paths").select("*").eq("project_id", str(project_id)).execute().data
    keys = supabase.table("key_contexts").select("*").eq("project_id", str(project_id)).execute().data
    data = supabase.table("data_assets").select("*").eq("project_id", str(project_id)).execute().data
    
    cbom = CBOMGenerator.generate(scan, findings, paths, keys, data, certs)
    return cbom

@router.get("/{project_id}/scans/{scan_id}/report")
def export_report(project_id: uuid.UUID, scan_id: uuid.UUID):
    scan = get_scan(str(scan_id))
    if str(scan.get("project_id")) != str(project_id):
        raise HTTPException(status_code=403, detail="Project mismatch")
        
    findings = supabase.table("crypto_assets").select("*").eq("scan_id", str(scan_id)).execute().data
    
    # We must fetch the analysis results for this scan
    analysis_runs = supabase.table("analysis_runs").select("*").eq("scan_id", str(scan_id)).execute().data
    ar_data = []
    if analysis_runs:
        ar_data = supabase.table("analysis_results").select("*").eq("analysis_run_id", analysis_runs[0]['id']).execute().data
        
    report = ReportGenerator.generate(scan, findings, [], [], ar_data)
    return report

@router.get("/{project_id}/scans/{scan_id}/compare/{other_scan_id}")
def compare_scans(project_id: uuid.UUID, scan_id: uuid.UUID, other_scan_id: uuid.UUID):
    scan_a = get_scan(str(scan_id))
    scan_b = get_scan(str(other_scan_id))
    
    if str(scan_a.get("project_id")) != str(project_id) or str(scan_b.get("project_id")) != str(project_id):
        raise HTTPException(status_code=403, detail="Project mismatch")
        
    comparison = ScanComparator.compare(scan_a, scan_b)
    return comparison
