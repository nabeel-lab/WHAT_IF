import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException

from services.api.db import supabase
from services.api.models import ProviderConnection, ProviderConnectionCreate, ProviderTestRequest, ProviderTestResponse
from services.api.providers import (
    get_provider_for_url,
    get_provider_by_name,
    GitHubProvider,
    scrub_secrets
)

router = APIRouter(prefix="/projects/{project_id}/providers", tags=["providers"])

@router.get("", response_model=List[ProviderConnection])
def list_provider_connections(project_id: uuid.UUID):
    """
    List connected Git providers for this project.
    Only returns non-sensitive metadata (provider, account login, scope, masked token preview).
    Raw access tokens are never persisted or returned.
    """
    res = supabase.table("provider_connections").select(
        "id, project_id, provider, auth_type, token_preview, scope, status, account_login, created_at, updated_at"
    ).eq("project_id", str(project_id)).order("created_at", desc=True).execute()

    return res.data or []

@router.post("/github/connect", response_model=ProviderConnection)
def connect_github_provider(project_id: uuid.UUID, data: ProviderConnectionCreate):
    """
    Connect a GitHub account using a personal access token (classic or fine-grained).
    Validates token permissions via GitHub REST API without persisting raw tokens in plaintext.
    Persists only masked token preview plus provider/account/scope metadata.
    """
    token = data.access_token.strip()
    if not token:
        raise HTTPException(status_code=400, detail="Personal access token cannot be empty.")

    provider = GitHubProvider()
    verification = provider.verify_token(token)
    if not verification.get("valid"):
        raise HTTPException(
            status_code=400,
            detail=f"GitHub authorization failed: {verification.get('error', 'Invalid token')}"
        )

    login = verification.get("login", "unknown")
    scopes = verification.get("scopes", "")
    token_preview = verification.get("token_preview", "***")
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # Check if already exists for this project + provider
    existing_res = supabase.table("provider_connections").select("id").eq(
        "project_id", str(project_id)
    ).eq("provider", "github").execute()

    if existing_res.data:
        conn_id = existing_res.data[0]["id"]
        res = supabase.table("provider_connections").update({
            "token_preview": token_preview,
            "scope": scopes,
            "status": "active",
            "account_login": login,
            "updated_at": now_iso
        }).eq("id", conn_id).execute()
    else:
        conn_id = str(uuid.uuid4())
        res = supabase.table("provider_connections").insert({
            "id": conn_id,
            "project_id": str(project_id),
            "provider": "github",
            "auth_type": "token",
            "token_preview": token_preview,
            "scope": scopes,
            "status": "active",
            "account_login": login,
            "created_at": now_iso,
            "updated_at": now_iso
        }).execute()

    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to persist provider connection reference.")

    return res.data[0]

@router.delete("/{connection_id}")
def disconnect_provider(project_id: uuid.UUID, connection_id: uuid.UUID):
    """
    Disconnect an authorized provider connection.
    Removes the local credential reference from the project.
    (Does not revoke credentials at the remote provider).
    """
    res = supabase.table("provider_connections").delete().eq(
        "id", str(connection_id)
    ).eq("project_id", str(project_id)).execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Provider connection reference not found.")

    return {"status": "disconnected", "id": str(connection_id)}

@router.post("/verify-repo", response_model=ProviderTestResponse)
def verify_repository_access(project_id: uuid.UUID, req: ProviderTestRequest):
    """
    Test whether a repository URL is accessible (publicly or via provided in-memory access token).
    Raw credentials are used in-memory for the test and never logged or persisted.
    """
    if not req.repository_url:
        raise HTTPException(status_code=400, detail="Repository URL is required.")

    provider_handler = get_provider_for_url(req.repository_url)

    # If GitLab or Bitbucket, return explicit unsupported state
    if provider_handler.name in ["gitlab", "bitbucket"]:
        res = provider_handler.verify_access(req.repository_url)
        return ProviderTestResponse(
            accessible=False,
            provider=provider_handler.name,
            error=res.get("error")
        )

    # Use in-memory token provided for this verification
    result = provider_handler.verify_access(req.repository_url, token=req.access_token)
    return ProviderTestResponse(
        accessible=result.get("accessible", False),
        provider=provider_handler.name,
        full_name=result.get("full_name"),
        private=result.get("private"),
        can_read=result.get("can_read"),
        default_branch=result.get("default_branch"),
        error=result.get("error")
    )


@router.get("/ai/runtime-status")
def get_ai_runtime_status():
    """Returns status of hardware detection, active profile, accelerator, and model availability."""
    from services.api.runtime_manager import get_runtime_selector
    return get_runtime_selector().get_runtime_status()

