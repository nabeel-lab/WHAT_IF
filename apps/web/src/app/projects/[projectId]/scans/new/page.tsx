"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Shield,
  GitBranch,
  Upload,
  FolderGit2,
  CheckCircle2,
  AlertCircle,
  Key,
  Lock,
  Unlock,
  Trash2,
  RefreshCw,
  FileArchive,
  Info
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ProviderConnection {
  id: string;
  project_id: string;
  provider: string;
  auth_type: string;
  token_preview: string;
  scope?: string;
  status: string;
  account_login?: string;
}

export default function ConfigureScan() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [capabilities, setCapabilities] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Source Type
  const [sourceType, setSourceType] = useState<"GIT_REPOSITORY" | "ARCHIVE_UPLOAD">("GIT_REPOSITORY");

  // Git Configuration
  const searchParams = useSearchParams();
  const repoParam = searchParams?.get("repo");
  const [repositoryUrl, setRepositoryUrl] = useState(repoParam || "https://github.com/nabeel-lab/Enterprise_info.git");
  const [branch, setBranch] = useState("main");

  useEffect(() => {
    if (repoParam) {
      setRepositoryUrl(repoParam);
    }
  }, [repoParam]);

  // Provider Connection State
  const [providerConnections, setProviderConnections] = useState<ProviderConnection[]>([]);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [githubToken, setGithubToken] = useState("");
  const [connectingProvider, setConnectingProvider] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [repoAccessStatus, setRepoAccessStatus] = useState<any>(null);
  const [checkingAccess, setCheckingAccess] = useState(false);

  // Archive Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // General Pipeline Config
  const [scope, setScope] = useState("Entire repository");
  const [language, setLanguage] = useState("Python");
  const [environment, setEnvironment] = useState("Development");
  const [staticEnabled, setStaticEnabled] = useState(true);
  const [verificationEnabled, setVerificationEnabled] = useState(true);
  const [runtimeEnabled, setRuntimeEnabled] = useState(true);
  const [contextEnabled, setContextEnabled] = useState(true);

  // Fetch capabilities & provider connections
  useEffect(() => {
    Promise.all([
      fetch(`${API}/projects/capabilities`).then(r => r.json()).catch(() => null),
      fetch(`${API}/projects/${projectId}/providers`).then(r => r.json()).catch(() => [])
    ]).then(([caps, providers]) => {
      if (caps) {
        setCapabilities(caps);
        if (!caps.static_analysis) setStaticEnabled(false);
        if (!caps.verification) setVerificationEnabled(false);
        if (!caps.runtime) setRuntimeEnabled(false);
        if (!caps.context) setContextEnabled(false);
      }
      if (Array.isArray(providers)) {
        setProviderConnections(providers);
      }
    }).finally(() => setLoading(false));
  }, [projectId]);

  // Provider detection from URL
  const detectedProvider = (() => {
    const lower = repositoryUrl.toLowerCase();
    if (lower.includes("github.com")) return "github";
    if (lower.includes("gitlab.com")) return "gitlab";
    if (lower.includes("bitbucket.org")) return "bitbucket";
    return "git";
  })();

  const activeGitHubConnection = providerConnections.find(
    c => c.provider === "github" && c.status === "active"
  );

  // Verify repository accessibility
  const checkRepoAccess = async () => {
    if (!repositoryUrl.trim()) return;
    setCheckingAccess(true);
    setRepoAccessStatus(null);
    try {
      const res = await fetch(`${API}/projects/${projectId}/providers/verify-repo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: detectedProvider,
          repository_url: repositoryUrl.trim(),
        }),
      });
      const data = await res.json();
      setRepoAccessStatus(data);
    } catch (e: any) {
      setRepoAccessStatus({ accessible: false, error: e.message || "Network error" });
    } finally {
      setCheckingAccess(false);
    }
  };

  // Connect GitHub token
  const handleConnectGitHub = async () => {
    if (!githubToken.trim()) return;
    setConnectingProvider(true);
    setProviderError(null);
    try {
      const res = await fetch(`${API}/projects/${projectId}/providers/github/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "github",
          access_token: githubToken.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to authorize GitHub token");
      }
      const newConn = await res.json();
      setProviderConnections(prev => [newConn, ...prev.filter(c => c.id !== newConn.id)]);
      setGithubToken("");
      setShowTokenInput(false);
      // Re-verify repository access with the new connection
      setTimeout(checkRepoAccess, 300);
    } catch (err: any) {
      setProviderError(err.message || "Failed to connect provider");
    } finally {
      setConnectingProvider(false);
    }
  };

  // Disconnect provider
  const handleDisconnect = async (connectionId: string) => {
    try {
      const res = await fetch(`${API}/projects/${projectId}/providers/${connectionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProviderConnections(prev => prev.filter(c => c.id !== connectionId));
        setRepoAccessStatus(null);
      }
    } catch (e) {
      console.error("Disconnect failed", e);
    }
  };

  // File drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith(".zip")) {
        setSelectedFile(file);
        setErrorMessage(null);
      } else {
        setErrorMessage("Only ZIP archives (.zip) are supported.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.toLowerCase().endsWith(".zip")) {
        setSelectedFile(file);
        setErrorMessage(null);
      } else {
        setErrorMessage("Only ZIP archives (.zip) are supported.");
      }
    }
  };

  // Start Scan handler
  const startScan = async () => {
    setStarting(true);
    setErrorMessage(null);
    try {
      if (sourceType === "GIT_REPOSITORY") {
        if (!repositoryUrl.trim()) {
          setErrorMessage("Please enter a valid Git repository URL.");
          setStarting(false);
          return;
        }

        const config = {
          project_id: projectId,
          repository_url: repositoryUrl.trim(),
          source_type: "GIT_REPOSITORY",
          branch: branch.trim() || "main",
          scope,
          language,
          environment,
          static_analysis_enabled: staticEnabled,
          verification_enabled: verificationEnabled,
          runtime_enabled: runtimeEnabled,
          context_enabled: contextEnabled,
          access_token: githubToken.trim() || undefined,
        };

        const res = await fetch(`${API}/projects/${projectId}/scans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        });

        if (res.ok) {
          const scan = await res.json();
          router.push(`/projects/${projectId}/scans/${scan.id}`);
        } else if (res.status === 409) {
          const detail = await res.json();
          const activeScanId = detail.detail?.match(/Scan #(.*?) is already running/)?.[1];
          if (activeScanId) {
            router.push(`/projects/${projectId}/scans/${activeScanId}`);
          } else {
            setErrorMessage(detail.detail || "A scan is already active for this project.");
          }
        } else {
          const errData = await res.json();
          setErrorMessage(errData.detail || "Failed to start scan");
        }
      } else {
        // ARCHIVE_UPLOAD
        if (!selectedFile) {
          setErrorMessage("Please select a ZIP archive file to upload.");
          setStarting(false);
          return;
        }

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("scope", scope);
        formData.append("language", language);
        formData.append("environment", environment);
        formData.append("static_analysis_enabled", String(staticEnabled));
        formData.append("verification_enabled", String(verificationEnabled));
        formData.append("runtime_enabled", String(runtimeEnabled));
        formData.append("context_enabled", String(contextEnabled));

        const res = await fetch(`${API}/projects/${projectId}/scans/upload`, {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const scan = await res.json();
          router.push(`/projects/${projectId}/scans/${scan.id}`);
        } else if (res.status === 409) {
          const detail = await res.json();
          const activeScanId = detail.detail?.match(/Scan #(.*?) is already running/)?.[1];
          if (activeScanId) {
            router.push(`/projects/${projectId}/scans/${activeScanId}`);
          } else {
            setErrorMessage(detail.detail || "A scan is already active for this project.");
          }
        } else {
          const errData = await res.json();
          setErrorMessage(errData.detail || "Failed to upload and scan archive.");
        }
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || "Failed to initiate scan");
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[#A8B4C2] gap-2">
        <span className="w-2 h-2 rounded-full bg-[#60F1D0] animate-ping" />
        Loading analysis capabilities & provider connections…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Top Header */}
      <div>
        <Link
          href={`/projects/${projectId}/scans`}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-[#A8B4C2] hover:text-[#EAF0F6] mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Scans</span>
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#60F1D0] shadow-[0_0_10px_#60F1D0]" />
            <h1 className="text-xl font-bold text-[#EAF0F6] tracking-wide">Source Intake & Baseline Acquisition</h1>
          </div>
          <button
            type="button"
            onClick={() => {
              setSourceType("GIT_REPOSITORY");
              setRepositoryUrl("https://github.com/nabeel-lab/Enterprise_info.git");
              setBranch("main");
              setRepoAccessStatus(null);
            }}
            className="text-[11px] font-mono text-[#60F1D0] hover:text-[#60F1D0]/80 border border-[#60F1D0]/30 hover:border-[#60F1D0]/60 rounded px-2.5 py-1 transition-all bg-[#60F1D0]/5"
          >
            Load Enterprise Demo Source
          </button>
        </div>
        <p className="text-xs text-[#A8B4C2] mt-1 font-mono">
          Acquire target repository or source archive for cryptographic AST discovery, reachability, and CBOM derivation.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-lg border border-[#FF6B6B]/30 bg-[#FF6B6B]/10 text-xs text-[#FF6B6B] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="space-y-6">
        {/* Source Selector Tabs */}
        <div className="p-1 rounded-xl bg-[#151C25] border border-[#A8B4C2]/15 flex gap-1">
          <button
            type="button"
            onClick={() => { setSourceType("GIT_REPOSITORY"); setErrorMessage(null); }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              sourceType === "GIT_REPOSITORY"
                ? "bg-[#1C2632] text-[#60F1D0] border border-[#60F1D0]/30 shadow-[0_0_12px_rgba(96,241,208,0.1)]"
                : "text-[#A8B4C2] hover:text-[#EAF0F6] hover:bg-[#1C2632]/50"
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>Git Repository (Public or Private)</span>
          </button>
          <button
            type="button"
            onClick={() => { setSourceType("ARCHIVE_UPLOAD"); setErrorMessage(null); }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              sourceType === "ARCHIVE_UPLOAD"
                ? "bg-[#1C2632] text-[#60F1D0] border border-[#60F1D0]/30 shadow-[0_0_12px_rgba(96,241,208,0.1)]"
                : "text-[#A8B4C2] hover:text-[#EAF0F6] hover:bg-[#1C2632]/50"
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Archive (.ZIP)</span>
          </button>
        </div>

        {/* Git Repository Form */}
        {sourceType === "GIT_REPOSITORY" && (
          <div className="panel p-6 bg-[#151C25] border-[#A8B4C2]/15 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#A8B4C2]/10 pb-2">
                <h2 className="text-xs font-bold text-[#EAF0F6] uppercase tracking-wider flex items-center gap-2">
                  <FolderGit2 className="w-3.5 h-3.5 text-[#60F1D0]" />
                  <span>Remote Git Target</span>
                </h2>
                <div className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="text-[#A8B4C2]">Provider:</span>
                  {detectedProvider === "github" && (
                    <span className="px-2 py-0.5 rounded bg-[#4E9FFF]/15 border border-[#4E9FFF]/30 text-[#4E9FFF] font-semibold">
                      GitHub
                    </span>
                  )}
                  {detectedProvider === "gitlab" && (
                    <span className="px-2 py-0.5 rounded bg-[#FFB86C]/15 border border-[#FFB86C]/30 text-[#FFB86C] font-semibold">
                      GitLab (Provider Integration Unsupported)
                    </span>
                  )}
                  {detectedProvider === "bitbucket" && (
                    <span className="px-2 py-0.5 rounded bg-[#FFB86C]/15 border border-[#FFB86C]/30 text-[#FFB86C] font-semibold">
                      Bitbucket (Provider Integration Unsupported)
                    </span>
                  )}
                  {detectedProvider === "git" && (
                    <span className="px-2 py-0.5 rounded bg-[#A8B4C2]/15 border border-[#A8B4C2]/30 text-[#A8B4C2] font-semibold">
                      Generic Git
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#A8B4C2] mb-1.5">REPOSITORY URL (HTTPS)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={repositoryUrl}
                    onChange={(e) => {
                      setRepositoryUrl(e.target.value);
                      setRepoAccessStatus(null);
                    }}
                    className="flex-1 px-3 py-2 rounded-lg bg-[#1C2632] border border-[#A8B4C2]/20 text-xs font-mono text-[#EAF0F6] focus:border-[#60F1D0] outline-none"
                    placeholder="https://github.com/organization/repository.git"
                  />
                  <button
                    type="button"
                    onClick={checkRepoAccess}
                    disabled={checkingAccess || !repositoryUrl.trim()}
                    className="px-3.5 py-2 rounded-lg border border-[#A8B4C2]/20 hover:border-[#60F1D0]/40 text-xs font-mono text-[#A8B4C2] hover:text-[#EAF0F6] bg-[#1C2632] transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${checkingAccess ? "animate-spin text-[#60F1D0]" : ""}`} />
                    <span>Test Access</span>
                  </button>
                </div>
              </div>

              {/* Access verification banner */}
              {repoAccessStatus && (
                <div
                  className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between ${
                    repoAccessStatus.accessible
                      ? "border-[#60F1D0]/30 bg-[#60F1D0]/10 text-[#60F1D0]"
                      : "border-[#FF6B6B]/30 bg-[#FF6B6B]/10 text-[#FF6B6B]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {repoAccessStatus.accessible ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-[#60F1D0]" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-[#FF6B6B]" />
                    )}
                    <span>
                      {repoAccessStatus.accessible
                        ? `Repository read access confirmed (${repoAccessStatus.full_name || repositoryUrl}, default branch: ${repoAccessStatus.default_branch || "main"}${repoAccessStatus.private ? " [Private]" : " [Public]"})`
                        : (repoAccessStatus.error || "Repository is inaccessible")}
                    </span>
                  </div>
                </div>
              )}

              {/* Branch / Ref Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-[11px] font-mono text-[#A8B4C2] mb-1">TARGET BRANCH / REF</label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#1C2632] border border-[#A8B4C2]/20 text-xs font-mono text-[#EAF0F6] outline-none focus:border-[#60F1D0]"
                    placeholder="main"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#A8B4C2] mb-1">AUTHENTICATION SCOPE</label>
                  <div className="px-3 py-2 rounded-lg bg-[#1C2632]/60 border border-[#A8B4C2]/15 text-xs font-mono text-[#A8B4C2] flex items-center justify-between">
                    <span>{activeGitHubConnection ? `Authorized: @${activeGitHubConnection.account_login || "github"}` : "Public Read-Only"}</span>
                    {activeGitHubConnection ? (
                      <Lock className="w-3.5 h-3.5 text-[#60F1D0]" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-[#A8B4C2]" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Provider Connection Card */}
            <div className="p-4 rounded-xl border border-[#A8B4C2]/15 bg-[#1C2632]/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#60F1D0]" />
                  <span className="text-xs font-bold text-[#EAF0F6]">Private Repository Access Provider</span>
                </div>
                {activeGitHubConnection ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[#60F1D0] bg-[#60F1D0]/10 px-2 py-0.5 rounded border border-[#60F1D0]/20">
                      Connected ({activeGitHubConnection.token_preview})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDisconnect(activeGitHubConnection.id)}
                      className="text-[#FF6B6B] hover:text-[#FF6B6B]/80 text-xs font-mono flex items-center gap-1 border border-[#FF6B6B]/20 rounded px-2 py-0.5 bg-[#FF6B6B]/5"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Disconnect</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowTokenInput(!showTokenInput)}
                    className="text-xs font-mono text-[#60F1D0] hover:underline"
                  >
                    {showTokenInput ? "Cancel" : "+ Connect GitHub Token"}
                  </button>
                )}
              </div>

              <p className="text-[11px] text-[#A8B4C2] leading-relaxed">
                Connect a GitHub Personal Access Token with read-only repository permissions. Permissions are verified via GitHub API and only a masked preview is saved for auditing. Raw tokens are never persisted in plaintext in the database. Disconnecting removes the local project reference.
              </p>

              {showTokenInput && !activeGitHubConnection && (
                <div className="pt-2 border-t border-[#A8B4C2]/10 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      placeholder="ghp_... or github_pat_..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#151C25] border border-[#A8B4C2]/20 text-xs font-mono text-[#EAF0F6] focus:border-[#60F1D0] outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleConnectGitHub}
                      disabled={connectingProvider || !githubToken.trim()}
                      className="px-4 py-1.5 rounded-lg bg-[#60F1D0] hover:bg-[#60F1D0]/90 text-[#0B0F14] text-xs font-bold font-mono transition-all"
                    >
                      {connectingProvider ? "Validating…" : "Authorize"}
                    </button>
                  </div>
                  {providerError && (
                    <div className="text-[11px] font-mono text-[#FF6B6B]">{providerError}</div>
                  )}
                  <div className="text-[10px] text-[#A8B4C2] font-mono">
                    Required permission: Read-only access to Repository contents.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload Archive Form */}
        {sourceType === "ARCHIVE_UPLOAD" && (
          <div className="panel p-6 bg-[#151C25] border-[#A8B4C2]/15 space-y-6">
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-[#EAF0F6] uppercase tracking-wider flex items-center gap-2 border-b border-[#A8B4C2]/10 pb-2">
                <FileArchive className="w-3.5 h-3.5 text-[#60F1D0]" />
                <span>Source Archive Intake (.ZIP)</span>
              </h2>

              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragActive
                    ? "border-[#60F1D0] bg-[#60F1D0]/10"
                    : selectedFile
                    ? "border-[#60F1D0]/50 bg-[#1C2632]/70"
                    : "border-[#A8B4C2]/25 bg-[#1C2632]/30 hover:border-[#60F1D0]/40 hover:bg-[#1C2632]/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-full bg-[#60F1D0]/15 text-[#60F1D0] flex items-center justify-center mx-auto border border-[#60F1D0]/30">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-[#EAF0F6] font-mono">{selectedFile.name}</div>
                    <div className="text-[11px] text-[#A8B4C2] font-mono">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB &bull; ZIP Archive &bull; Ready for Extraction
                    </div>
                    <div className="pt-2">
                      <span className="text-[10px] text-[#60F1D0] border border-[#60F1D0]/30 rounded px-2 py-0.5 bg-[#60F1D0]/5">
                        Click or drag new archive to replace
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-full bg-[#151C25] text-[#A8B4C2] flex items-center justify-center mx-auto border border-[#A8B4C2]/20">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-semibold text-[#EAF0F6]">
                      Drag and drop repository ZIP archive here, or browse
                    </div>
                    <div className="text-[11px] text-[#A8B4C2] font-mono">
                      Supports source archives up to 50MB (max 5,000 files)
                    </div>
                  </div>
                )}
              </div>

              {/* Security Advisory */}
              <div className="p-3.5 rounded-lg border border-[#4E9FFF]/20 bg-[#4E9FFF]/5 text-[11px] text-[#A8B4C2] space-y-1">
                <div className="flex items-center gap-1.5 text-[#4E9FFF] font-semibold">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Archive Isolation & Security Guarantees</span>
                </div>
                <p className="leading-relaxed">
                  Uploaded ZIP archives are validated with Zip Slip path-traversal protection and decompression bomb limits.
                  Contents are extracted into an isolated temporary workspace and inspected safely without executing untrusted code.
                  ZIP source archive ingestion is supported for source code; binary analysis remains a future capability.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Configuration & Scope */}
        <div className="panel p-6 bg-[#151C25] border-[#A8B4C2]/15 space-y-6">
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-[#EAF0F6] uppercase tracking-wider border-b border-[#A8B4C2]/10 pb-2">
              Scope & Environment Profile
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-[#A8B4C2] mb-1">INSPECTION SCOPE</label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#1C2632] border border-[#A8B4C2]/20 text-xs font-mono text-[#EAF0F6] outline-none"
                >
                  <option>Entire repository</option>
                  <option>Cryptographic modules only</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-mono text-[#A8B4C2] mb-1">PRIMARY LANGUAGE</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#1C2632] border border-[#A8B4C2]/20 text-xs font-mono text-[#EAF0F6] outline-none"
                >
                  <option>Python</option>
                  <option>Java</option>
                  <option>Go</option>
                  <option>C / C++</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-mono text-[#A8B4C2] mb-1">ENVIRONMENT PROFILE</label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#1C2632] border border-[#A8B4C2]/20 text-xs font-mono text-[#EAF0F6] outline-none"
                >
                  <option>Development</option>
                  <option>Staging</option>
                  <option>Production</option>
                </select>
              </div>
            </div>
          </div>

          {/* Analysis Stages Toggles */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-[#EAF0F6] uppercase tracking-wider border-b border-[#A8B4C2]/10 pb-2">
              Pipeline Verification Stages
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-[#A8B4C2]/10 bg-[#1C2632]/40 cursor-pointer hover:border-[#60F1D0]/30 transition-all">
                <input
                  type="checkbox"
                  checked={staticEnabled}
                  onChange={(e) => setStaticEnabled(e.target.checked)}
                  disabled={!capabilities?.static_analysis}
                  className="mt-0.5 rounded accent-[#60F1D0]"
                />
                <div>
                  <div className="text-xs font-semibold text-[#EAF0F6]">Static Crypto Discovery</div>
                  <div className="text-[11px] text-[#A8B4C2]">Identify cryptographic primitives, algorithms, and keys.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-[#A8B4C2]/10 bg-[#1C2632]/40 cursor-pointer hover:border-[#60F1D0]/30 transition-all">
                <input
                  type="checkbox"
                  checked={verificationEnabled}
                  onChange={(e) => setVerificationEnabled(e.target.checked)}
                  disabled={!capabilities?.verification}
                  className="mt-0.5 rounded accent-[#60F1D0]"
                />
                <div>
                  <div className="text-xs font-semibold text-[#EAF0F6]">Call-Graph Reachability</div>
                  <div className="text-[11px] text-[#A8B4C2]">Interprocedural trace from application entrypoints.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-[#A8B4C2]/10 bg-[#1C2632]/40 cursor-pointer hover:border-[#60F1D0]/30 transition-all">
                <input
                  type="checkbox"
                  checked={runtimeEnabled}
                  onChange={(e) => setRuntimeEnabled(e.target.checked)}
                  disabled={!capabilities?.runtime}
                  className="mt-0.5 rounded accent-[#60F1D0]"
                />
                <div>
                  <div className="text-xs font-semibold text-[#EAF0F6]">Runtime Verification</div>
                  <div className="text-[11px] text-[#A8B4C2]">Verify execution events (runs only on verified harnesses).</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-[#A8B4C2]/10 bg-[#1C2632]/40 cursor-pointer hover:border-[#60F1D0]/30 transition-all">
                <input
                  type="checkbox"
                  checked={contextEnabled}
                  onChange={(e) => setContextEnabled(e.target.checked)}
                  disabled={!capabilities?.context}
                  className="mt-0.5 rounded accent-[#60F1D0]"
                />
                <div>
                  <div className="text-xs font-semibold text-[#EAF0F6]">Context Enrichment</div>
                  <div className="text-[11px] text-[#A8B4C2]">Data sensitivity mapping and migration effort scoring.</div>
                </div>
              </label>
            </div>
          </div>

          {/* Provenance & Trigger Action */}
          <div className="pt-4 border-t border-[#A8B4C2]/15 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-[#A8B4C2] font-mono">
              <Shield className="w-4 h-4 text-[#60F1D0]" />
              <span>
                {sourceType === "GIT_REPOSITORY"
                  ? `Target: ${repositoryUrl.split("/").pop() || "repository"} @ ${branch}`
                  : `Target: ${selectedFile ? selectedFile.name : "No archive selected"}`}
              </span>
            </div>
            <button
              type="button"
              onClick={startScan}
              disabled={starting || (sourceType === "ARCHIVE_UPLOAD" && !selectedFile)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#60F1D0] hover:bg-[#60F1D0]/90 text-[#0B0F14] text-xs font-bold transition-all shadow-[0_0_15px_#60F1D040] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{starting ? "Acquiring & Initializing…" : "Start Baseline Scan"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
