import base64
import re
import urllib.parse
from typing import Optional, Dict, Any, Tuple
import httpx
from .base import BaseGitProvider, scrub_secrets

class GitHubProvider(BaseGitProvider):
    name: str = "github"

    def detect(self, url: str) -> bool:
        parsed = urllib.parse.urlparse(url.strip())
        return "github.com" in (parsed.netloc or "").lower()

    def parse_owner_and_repo(self, url: str) -> Tuple[Optional[str], Optional[str]]:
        cleaned = self.clean_url(url)
        parsed = urllib.parse.urlparse(cleaned)
        path = parsed.path.strip("/")
        if path.endswith(".git"):
            path = path[:-4]
        parts = [p for p in path.split("/") if p]
        if len(parts) >= 2:
            return parts[0], parts[1]
        return None, None

    def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify that a token is valid on GitHub and inspect user/scope."""
        if not token:
            return {"valid": False, "error": "Token is required."}

        headers = {
            "Authorization": f"Bearer {token.strip()}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "ECDAT-Cryptographic-Scanner",
        }
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.get("https://api.github.com/user", headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    scopes = res.headers.get("x-oauth-scopes", "fine-grained")
                    return {
                        "valid": True,
                        "login": data.get("login"),
                        "name": data.get("name"),
                        "scopes": scopes,
                        "token_preview": f"{token[:4]}...{token[-4:]}" if len(token) > 8 else "***"
                    }
                elif res.status_code == 401:
                    return {"valid": False, "error": "Invalid GitHub credentials / token expired."}
                else:
                    return {"valid": False, "error": f"GitHub API responded with status {res.status_code}."}
        except Exception as e:
            return {"valid": False, "error": scrub_secrets(f"Connection to GitHub failed: {str(e)}")}

    def verify_access(self, repository_url: str, token: Optional[str] = None) -> Dict[str, Any]:
        """Verify read access to the specified GitHub repository."""
        is_valid, err = self.validate_url(repository_url)
        if not is_valid:
            return {"accessible": False, "error": err}

        owner, repo = self.parse_owner_and_repo(repository_url)
        if not owner or not repo:
            return {"accessible": False, "error": "Could not extract owner and repository name from URL."}

        api_url = f"https://api.github.com/repos/{owner}/{repo}"
        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "ECDAT-Cryptographic-Scanner",
        }
        if token:
            headers["Authorization"] = f"Bearer {token.strip()}"

        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.get(api_url, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    permissions = data.get("permissions", {})
                    # Ensure read access
                    can_read = permissions.get("pull", True)
                    return {
                        "accessible": True,
                        "provider": "github",
                        "owner": owner,
                        "repo": repo,
                        "full_name": data.get("full_name"),
                        "private": data.get("private", False),
                        "default_branch": data.get("default_branch", "main"),
                        "can_read": can_read,
                        "token_used": bool(token)
                    }
                elif res.status_code == 404:
                    if token:
                        return {
                            "accessible": False,
                            "error": "Repository not found or token lacks read access to this private repository."
                        }
                    else:
                        return {
                            "accessible": False,
                            "private_candidate": True,
                            "error": "Repository not found or is private. An authorized provider connection is required."
                        }
                elif res.status_code == 401:
                    return {"accessible": False, "error": "GitHub authorization failed. The provider token is invalid or expired."}
                else:
                    return {"accessible": False, "error": f"GitHub API error (HTTP {res.status_code})."}
        except Exception as e:
            return {"accessible": False, "error": scrub_secrets(f"Failed to connect to GitHub: {str(e)}")}

    def get_clone_env_and_args(self, repository_url: str, token: Optional[str] = None) -> Tuple[Dict[str, str], list]:
        """
        Return extra git arguments for cloning.
        Tokens are passed as in-memory extra HTTP headers, NEVER embedded in the repository URL.
        """
        clean = self.clean_url(repository_url)
        args = []
        if token:
            # Format: Authorization: Basic <base64(x-access-token:{token})>
            raw_creds = f"x-access-token:{token.strip()}".encode("utf-8")
            b64_creds = base64.b64encode(raw_creds).decode("utf-8")
            args.extend(["-c", f"http.extraHeader=Authorization: Basic {b64_creds}"])
        return {}, args
