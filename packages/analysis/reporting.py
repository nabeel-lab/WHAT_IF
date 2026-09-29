import uuid
from typing import Dict, Any, List
from datetime import datetime, timezone

class CBOMGenerator:
    @staticmethod
    def generate(scan: dict, findings: List[dict], paths: List[dict], keys: List[dict], data: List[dict], certs: List[dict]) -> dict:
        """
        Generates a CycloneDX-style CBOM with ECDAT-specific evidence extensions.
        """
        components = []
        
        # Add Crypto Assets
        for f in findings:
            components.append({
                "type": "cryptographic-asset",
                "bom-ref": f"crypto-{f.get('id')}",
                "name": f.get('algorithm') or f.get('asset_type'),
                "properties": [
                    {"name": "ecdat:role", "value": str(f.get('role'))},
                    {"name": "ecdat:source_file", "value": str(f.get('source_file'))},
                    {"name": "ecdat:line_start", "value": str(f.get('line_start'))},
                    {"name": "ecdat:confidence", "value": str(f.get('confidence'))}
                ]
            })

        # Add Certificates
        for c in certs:
            # Mask private key if detected
            pk_detected = c.get('private_key_detected', False)
            components.append({
                "type": "certificate",
                "bom-ref": f"cert-{c.get('id')}",
                "name": c.get('subject') or "Unknown Subject",
                "properties": [
                    {"name": "ecdat:issuer", "value": str(c.get('issuer'))},
                    {"name": "ecdat:valid_until", "value": str(c.get('valid_until'))},
                    {"name": "ecdat:signature_algorithm", "value": str(c.get('signature_algorithm'))},
                    {"name": "ecdat:private_key_detected", "value": "true" if pk_detected else "false"}
                ]
            })

        return {
            "bomFormat": "CycloneDX",
            "specVersion": "1.5",
            "serialNumber": f"urn:uuid:{uuid.uuid4()}",
            "version": 1,
            "metadata": {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "properties": [
                    {"name": "ecdat:project_id", "value": str(scan.get('project_id'))},
                    {"name": "ecdat:scan_id", "value": str(scan.get('id'))},
                    {"name": "ecdat:source_type", "value": str(scan.get('source_type'))},
                    {"name": "ecdat:repository_url", "value": str(scan.get('repository_url'))},
                    {"name": "ecdat:branch", "value": str(scan.get('branch'))},
                    {"name": "ecdat:commit_sha", "value": str(scan.get('commit_sha'))},
                    {"name": "ecdat:scanner_version", "value": "1.0.0"}
                ]
            },
            "components": components,
            "dependencies": [] # Can be populated with explicit path mapping if needed
        }

class ReportGenerator:
    @staticmethod
    def generate(scan: dict, findings: List[dict], certs: List[dict], paths: List[dict], analysis_results: List[dict]) -> dict:
        """
        Generates structured JSON payload for the Investigation Report.
        """
        runway_dist = {}
        for ar in analysis_results:
            state = ar.get('runway_state', 'UNKNOWN')
            runway_dist[state] = runway_dist.get(state, 0) + 1

        return {
            "title": "ECDAT INVESTIGATION REPORT",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "sections": [
                {
                    "id": "1",
                    "title": "Investigation Metadata",
                    "content": {
                        "project_id": scan.get("project_id"),
                        "scan_id": scan.get("id"),
                        "status": scan.get("status")
                    }
                },
                {
                    "id": "2",
                    "title": "Repository Provenance",
                    "content": {
                        "source_type": scan.get("source_type"),
                        "url": scan.get("repository_url"),
                        "branch": scan.get("branch"),
                        "commit": scan.get("commit_sha"),
                        "scanner_version": "1.0.0"
                    }
                },
                {
                    "id": "4",
                    "title": "Cryptographic Asset Inventory",
                    "content": {"count": len(findings)}
                },
                {
                    "id": "5",
                    "title": "Certificate Inventory",
                    "content": {"count": len(certs)}
                },
                {
                    "id": "13",
                    "title": "Protection Runway",
                    "content": runway_dist
                }
            ],
            "provenance_statement": "This investigation was generated from the Git repository revision identified above.",
            "disclaimer": "WHAT-IF: No persisted What-If scenarios. Interactive scenarios are evaluated separately and do not modify this report."
        }

class ScanComparator:
    @staticmethod
    def compare(scan_a: dict, scan_b: dict) -> dict:
        """
        Computes explicit deltas across dimensions, including cryptographic assets.
        """
        from services.api.db import supabase
        deltas = []
        
        # Example of scalar deltas
        def diff(label, a, b):
            if a != b:
                deltas.append({
                    "dimension": label,
                    "scan_a_val": str(a),
                    "scan_b_val": str(b),
                    "delta": "CHANGED"
                })

        diff("Files Scanned", scan_a.get('files_scanned', 0), scan_b.get('files_scanned', 0))
        diff("Findings Count", scan_a.get('findings_count', 0), scan_b.get('findings_count', 0))
        
        # Compare Findings
        a_findings = supabase.table("crypto_assets").select("*").eq("scan_id", scan_a.get("id")).execute().data or []
        b_findings = supabase.table("crypto_assets").select("*").eq("scan_id", scan_b.get("id")).execute().data or []
        
        def identity(f):
            return f"{f.get('source_file')}:{f.get('line_start')}-{f.get('algorithm')}-{f.get('role')}"
            
        a_map = {identity(f): f for f in a_findings}
        b_map = {identity(f): f for f in b_findings}
        
        added = set(b_map.keys()) - set(a_map.keys())
        removed = set(a_map.keys()) - set(b_map.keys())
        
        for k in added:
            deltas.append({
                "dimension": f"Crypto Asset: {b_map[k].get('algorithm')} ({b_map[k].get('role')})",
                "scan_a_val": "Absent",
                "scan_b_val": f"Present in {b_map[k].get('source_file')}:{b_map[k].get('line_start')}",
                "delta": "NEW"
            })
            
        for k in removed:
            deltas.append({
                "dimension": f"Crypto Asset: {a_map[k].get('algorithm')} ({a_map[k].get('role')})",
                "scan_a_val": f"Present in {a_map[k].get('source_file')}:{a_map[k].get('line_start')}",
                "scan_b_val": "Absent",
                "delta": "REMOVED"
            })
        
        return {
            "scan_a_id": scan_a.get('id'),
            "scan_b_id": scan_b.get('id'),
            "scan_a_commit": scan_a.get('commit_sha'),
            "scan_b_commit": scan_b.get('commit_sha'),
            "deltas": deltas
        }
