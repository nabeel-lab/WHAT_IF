import urllib.parse
from typing import Optional, Dict, Any, Tuple
from .base import BaseGitProvider

class UnsupportedProvider(BaseGitProvider):
    def __init__(self, name: str, domain_pattern: str, display_name: str):
        self.name = name
        self.domain_pattern = domain_pattern
        self.display_name = display_name

    def detect(self, url: str) -> bool:
        parsed = urllib.parse.urlparse(url.strip())
        return self.domain_pattern in (parsed.netloc or "").lower()

    def verify_access(self, repository_url: str, token: Optional[str] = None) -> Dict[str, Any]:
        return {
            "accessible": False,
            "provider": self.name,
            "error": f"{self.display_name} provider integration is not yet supported in this version of ECDAT. Currently, GitHub and public Git repositories are supported."
        }

    def get_clone_env_and_args(self, repository_url: str, token: Optional[str] = None) -> Tuple[Dict[str, str], list]:
        raise NotImplementedError(
            f"{self.display_name} provider integration is not yet implemented. Only GitHub and standard public Git repositories are supported."
        )

class GitLabProvider(UnsupportedProvider):
    def __init__(self):
        super().__init__(name="gitlab", domain_pattern="gitlab.com", display_name="GitLab")

class BitbucketProvider(UnsupportedProvider):
    def __init__(self):
        super().__init__(name="bitbucket", domain_pattern="bitbucket.org", display_name="Bitbucket")
