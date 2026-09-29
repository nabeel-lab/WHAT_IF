import pytest
import subprocess
import uuid
import tempfile
import os
import shutil
from pathlib import Path
from services.api.models import ScanRunCreate
from services.api.routes.scans import run_scan_background

# We need a mock configuration
class MockConfig:
    def __init__(self):
        self.project_id = uuid.uuid4()
        self.repository_url = "https://github.com/nabeel-lab/Enterprise_info.git"
        self.source_type = "GIT_REPOSITORY"
        self.branch = "main"

def test_enterprise_info_uses_external_git_repository():
    """
    Verifies that the backend correctly clones the external Git repository
    and DOES NOT use the local fixture.
    """
    from services.api.database import supabase
    
    config = MockConfig()
    scan_id = str(uuid.uuid4())
    
    # Insert a dummy project
    supabase.table("projects").insert({
        "id": str(config.project_id),
        "name": "Integration Test Project",
        "repository_url": config.repository_url,
    }).execute()
    
    # Insert a scan
    supabase.table("scan_runs").insert({
        "id": scan_id,
        "project_id": str(config.project_id),
        "status": "QUEUED"
    }).execute()
    
    # Run the background task explicitly
    run_scan_background(scan_id, str(config.project_id), config)
    
    # Check the result
    res = supabase.table("scan_runs").select("*").eq("id", scan_id).execute()
    assert len(res.data) == 1
    scan = res.data[0]
    
    assert scan["status"] == "COMPLETED"
    assert scan["source_type"] == "GIT_REPOSITORY"
    assert scan["branch"] == "main"
    assert scan["commit_sha"] is not None
    assert len(scan["commit_sha"]) == 40
    
    stages = supabase.table("scan_stages").select("*").eq("scan_run_id", scan_id).execute().data
    source_stage = next(s for s in stages if s["stage"] == "REPOSITORY_SOURCE_VERIFICATION")
    assert source_stage["status"] == "COMPLETED"
