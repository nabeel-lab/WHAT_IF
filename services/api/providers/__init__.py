from typing import Optional, Dict, Any
from .base import BaseGitProvider, scrub_secrets
from .github import GitHubProvider
from .unsupported import GitLabProvider, BitbucketProvider

class GenericGitProvider(BaseGitProvider):
    name: str = "git"

    def detect(self, url: str) -> bool:
        return True

    def verify_access(self, repository_url: str, token: Optional[str] = None) -> Dict[str, Any]:
        valid, err = self.validate_url(repository_url)
        if not valid:
            return {"accessible": False, "error": err}
        return {
            "accessible": True,
            "provider": "git",
            "full_name": repository_url.split("/")[-1].replace(".git", ""),
            "private": False,
            "can_read": True
        }

    def get_clone_env_and_args(self, repository_url: str, token: Optional[str] = None):
        return {}, []

GITHUB_PROVIDER = GitHubProvider()
GITLAB_PROVIDER = GitLabProvider()
BITBUCKET_PROVIDER = BitbucketProvider()
GENERIC_PROVIDER = GenericGitProvider()

PROVIDERS = [
    GITHUB_PROVIDER,
    GITLAB_PROVIDER,
    BITBUCKET_PROVIDER,
]

def get_provider_for_url(url: str) -> BaseGitProvider:
    if not url:
        return GENERIC_PROVIDER
    for p in PROVIDERS:
        if p.detect(url):
            return p
    return GENERIC_PROVIDER

def get_provider_by_name(name: str) -> Optional[BaseGitProvider]:
    name = (name or "").lower().strip()
    if name == "github":
        return GITHUB_PROVIDER
    elif name == "gitlab":
        return GITLAB_PROVIDER
    elif name == "bitbucket":
        return BITBUCKET_PROVIDER
    elif name in ["git", "generic"]:
        return GENERIC_PROVIDER
    return None

__all__ = [
    "BaseGitProvider",
    "GitHubProvider",
    "GitLabProvider",
    "BitbucketProvider",
    "GenericGitProvider",
    "scrub_secrets",
    "get_provider_for_url",
    "get_provider_by_name"
]
