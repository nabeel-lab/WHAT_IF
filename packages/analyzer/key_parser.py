import yaml
from pathlib import Path
from typing import Dict, Any, Optional

def normalize_key_context(k_id: str, k_props: Dict[str, Any], project_id: Optional[str] = None, scan_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Normalizes key metadata from keys.yaml or inventory into key_contexts record.
    Preserves exact evidence from source; never invents fields or infers access control.
    """
    if not isinstance(k_props, dict):
        k_props = {}

    # Domains count (preserve None if absent)
    domains_val = None
    if k_props.get("domains") is not None:
        try:
            domains_val = int(k_props["domains"])
        except (ValueError, TypeError):
            pass

    # Services count (preserve None if absent)
    services_val = None
    if k_props.get("services") is not None:
        if isinstance(k_props["services"], list):
            services_val = len(k_props["services"])
        else:
            try:
                services_val = int(k_props["services"])
            except (ValueError, TypeError):
                pass

    # Epoch / Version (preserve None if absent)
    epoch_val = None
    if k_props.get("epoch") is not None:
        try:
            epoch_val = int(k_props["epoch"])
        except (ValueError, TypeError):
            pass
    elif k_props.get("version") is not None:
        try:
            epoch_val = int(k_props["version"])
        except (ValueError, TypeError):
            pass

    # Rotation state / policy (preserve Unknown if genuinely absent)
    rotation_state = (
        k_props.get("rotation_policy")
        or k_props.get("rotation_state")
        or k_props.get("rotation")
        or "Unknown"
    )

    # Key type / purpose
    key_type = (
        k_props.get("purpose")
        or k_props.get("usage")
        or k_props.get("key_type")
        or "Unknown"
    )

    # Algorithm
    algorithm = k_props.get("algorithm", "Unknown")

    # Scope (do NOT invent; keep None if not provided)
    scope = k_props.get("scope")

    # Custody type (preserve None if absent)
    custody_type = k_props.get("custody") or k_props.get("custody_type")

    # Old versions retained (preserve None if absent)
    old_versions_retained = k_props.get("old_versions_retained")
    if not isinstance(old_versions_retained, bool):
        old_versions_retained = None

    row = {
        "key_id_name": k_id,
        "key_type": key_type,
        "algorithm": algorithm,
        "scope": scope,
        "domains": domains_val,
        "services": services_val,
        "epoch": epoch_val,
        "rotation_state": rotation_state,
        "custody_type": custody_type,
        "old_versions_retained": old_versions_retained,
        "evidence_source": "keys.yaml",
    }
    if project_id:
        row["project_id"] = str(project_id)
    if scan_id:
        row["scan_id"] = str(scan_id)

    return row

def parse_keys_yaml(file_path: Path, project_id: Optional[str] = None, scan_id: Optional[str] = None) -> Dict[str, Dict[str, Any]]:
    """
    Parses a keys.yaml file and returns a mapping of key_id -> normalized key_context dict.
    """
    if not file_path.exists():
        return {}
    try:
        data = yaml.safe_load(file_path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return {}
        keys_dict = data.get("keys", {})
        if not isinstance(keys_dict, dict):
            return {}
        res = {}
        for k_id, k_props in keys_dict.items():
            if isinstance(k_props, dict):
                res[k_id] = normalize_key_context(k_id, k_props, project_id=project_id, scan_id=scan_id)
        return res
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
        return {}
