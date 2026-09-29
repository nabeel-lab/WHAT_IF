import re
from typing import Optional, Dict, Any, Tuple
from urllib.parse import urlparse

def scrub_secrets(text: str) -> str:
    """Scrub sensitive tokens and authorization credentials from logs, errors, and URLs."""
    if not text:
        return text
    # Mask GitHub personal access tokens
    text = re.sub(r'ghp_[a-zA-Z0-9_]{20,}', 'ghp_[REDACTED]', text)
    text = re.sub(r'github_pat_[a-zA-Z0-9_]{20,}', 'github_pat_[REDACTED]', text)
    # Mask HTTP Basic Auth credentials in URLs (e.g., https://token@github.com/...)
    text = re.sub(r'://([^:]+):([^@]+)@', r'://\1:[REDACTED]@', text)
    text = re.sub(r'://([^@]+)@', r'://[REDACTED]@', text)
    # Mask Bearer or Basic authorization headers
    text = re.sub(r'(?i)authorization:\s*(bearer|basic)\s+[^\s,]+', r'Authorization: \1 [REDACTED]', text)
    return text

class BaseGitProvider:
    name: str = "generic"

    def detect(self, url: str) -> bool:
        raise NotImplementedError

    def clean_url(self, url: str) -> str:
        """Strip trailing slashes, whitespace, and embedded credentials."""
        url = url.strip()
        parsed = urlparse(url)
        if parsed.username or parsed.password:
            # Rebuild without credentials
            netloc = parsed.hostname
            if parsed.port:
                netloc = f"{netloc}:{parsed.port}"
            url = parsed._replace(netloc=netloc).geturl()
        return url.rstrip('/')

    def validate_url(self, url: str) -> Tuple[bool, Optional[str]]:
        """Validate URL scheme and ensure no SSRF or local filesystem paths."""
        if not url or not isinstance(url, str):
            return False, "Repository URL cannot be empty."

        cleaned = url.strip()
        # Security: block local protocols and paths
        lower = cleaned.lower()
        if lower.startswith("file://") or lower.startswith("ftp://") or lower.startswith("smb://"):
            return False, "Security violation: Local and insecure file protocols are disallowed."

        # Security: block loopback and private addresses
        for forbidden in ["localhost", "127.0.0.1", "0.0.0.0", "169.254.169.254", "::1", "[::1]"]:
            if forbidden in lower:
                return False, f"Security violation: Requests to internal network ({forbidden}) are blocked."

        parsed = urlparse(cleaned)
        if parsed.scheme not in ["https", "http"]:
            return False, "Invalid repository URL scheme. Only https:// (or http://) is supported."

        if not parsed.netloc:
            return False, "Repository URL must include a valid host domain."

        if not parsed.path or parsed.path.strip("/") == "":
            return False, "Repository URL must specify an organization and repository path."

        return True, None

    def verify_access(self, repository_url: str, token: Optional[str] = None) -> Dict[str, Any]:
        """Verify access to the repository and return metadata without leaking credentials."""
        raise NotImplementedError

    def get_clone_env_and_args(self, repository_url: str, token: Optional[str] = None) -> Tuple[Dict[str, str], list]:
        """Return subprocess environment and extra git arguments without embedding tokens in the repository URL."""
        raise NotImplementedError
