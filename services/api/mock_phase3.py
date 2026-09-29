from services.api.db import supabase
import uuid

def inject_mock_phase3_data(project_id: str, scan_id: str):
    # Find the RSA encryption finding for the archive
    findings_res = supabase.table("crypto_assets").select("*").eq("scan_id", scan_id).execute()
    findings = findings_res.data
    
    rsa_finding = next((f for f in findings if f["algorithm"] == "RSA" and f["role"] == "encryption"), None)
    
    if not rsa_finding:
        rsa_finding = findings[0] if findings else None
        
    if not rsa_finding:
        return
        
    finding_id = rsa_finding["id"]
    
    # Clear existing mock data for idempotency
    supabase.table("data_assets").delete().eq("project_id", project_id).execute()
    supabase.table("key_contexts").delete().eq("project_id", project_id).execute()
    supabase.table("crypto_paths").delete().eq("project_id", project_id).execute()
    supabase.table("dependencies").delete().eq("project_id", project_id).execute()
    supabase.table("controls").delete().eq("project_id", project_id).execute()
    supabase.table("migration_contexts").delete().eq("project_id", project_id).execute()
    
    # 1. Data Asset
    da_res = supabase.table("data_assets").insert({
        "project_id": project_id,
        "name": "Patient Archive",
        "description": "Long-term secure storage for patient medical histories.",
        "classification": "PHI",
        "sensitivity": "Very High",
        "business_criticality": "High",
        "required_confidentiality_until": "2036",
        "retention_period": "10 years",
        "owner_source": "Legal / Compliance Dept",
        "evidence_source": "Organization metadata"
    }).execute()
    data_asset_id = da_res.data[0]["id"]
    
    # 2. Key Context
    kc_res = supabase.table("key_contexts").insert({
        "project_id": project_id,
        "key_id_name": "archive-master-v1",
        "key_type": "RSA-2048",
        "algorithm": "RSA",
        "scope": "shared",
        "domains": 3,
        "services": 2,
        "epoch": 1,
        "rotation_state": "Manual",
        "custody_type": "Self-managed",
        "old_versions_retained": True,
        "evidence_source": "key-policy.yaml"
    }).execute()
    key_context_id = kc_res.data[0]["id"]
    
    # 3. Crypto Path
    supabase.table("crypto_paths").insert({
        "project_id": project_id,
        "path_id_name": "path-archive-001",
        "entrypoint": "/archive",
        "crypto_asset_id": finding_id,
        "key_context_id": key_context_id,
        "data_asset_id": data_asset_id,
        "relationship_type": "observed"
    }).execute()
    
    # 4. Dependencies
    supabase.table("dependencies").insert([
        {"project_id": project_id, "crypto_asset_id": finding_id, "target_type": "library", "target_name": "rsa"},
        {"project_id": project_id, "crypto_asset_id": finding_id, "target_type": "protocol", "target_name": "HTTPS/TLS 1.2"}
    ]).execute()
    
    # 5. Controls
    supabase.table("controls").insert([
        {"project_id": project_id, "crypto_asset_id": finding_id, "control_name": "Key separation", "control_state": "NO", "evidence": "Key is shared across 3 domains (archive-master-v1)"},
        {"project_id": project_id, "crypto_asset_id": finding_id, "control_name": "Key rotation", "control_state": "YES", "evidence": "key-policy.yaml (Manual)"},
        {"project_id": project_id, "crypto_asset_id": finding_id, "control_name": "Crypto abstraction", "control_state": "NO", "evidence": "Direct RSA calls across modules"},
        {"project_id": project_id, "crypto_asset_id": finding_id, "control_name": "Downgrade protection", "control_state": "UNKNOWN", "evidence": "No metadata found"}
    ]).execute()
    
    # 6. Migration Context
    supabase.table("migration_contexts").insert({
        "project_id": project_id,
        "crypto_asset_id": finding_id,
        "direct_crypto_call_sites": 5,
        "provider_abstraction": "0%",
        "external_dependencies": 1,
        "certificate_dependencies": 1,
        "protocol_dependencies": 1,
        "rollback_support": "Partial",
        "migration_effort_band": "High",
        "effort_reason": "5 call sites + external dependency + certificate + partial rollback + no abstraction",
        "protection_runway_category": "urgent",
        "quantum_exposure_category": "public_key_relevant"
    }).execute()
