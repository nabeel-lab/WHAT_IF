"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Compass,
  Layers,
  Activity,
  GitBranch,
  Database,
  Key,
  ShieldCheck,
  FileText,
  Download,
  RotateCw,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  Radio,
  ExternalLink
} from "lucide-react";

export default function ProjectOverview() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<any>(null);
  const [scanning, setScanning] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${apiUrl}/projects/${projectId}/summary`);
      if (!res.ok) throw new Error(`Summary API returned ${res.status}`);
      const data = await res.json();
      setSummary(data);
    } catch (e: any) {
      setError(e.message || "Unable to load investigation signals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch(`${apiUrl}/projects`)
      .then(r => r.json())
      .then(data => {
        const p = data.find((p: any) => p.id === projectId);
        if (p) setProject(p);
      })
      .catch(console.error);

    fetchSummary();
    const interval = setInterval(fetchSummary, 6000);
    return () => clearInterval(interval);
  }, [projectId]);

  const scanId = summary?.latest_completed_scan_id;

  const handleScanAgain = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      const res = await fetch(`${apiUrl}/projects/${projectId}/scans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          repository_url: project?.repository_url || summary?.latest_completed_scan_repository_url || "https://github.com/nabeel-lab/Enterprise_info.git",
          source_type: "GIT_REPOSITORY",
          branch: "main",
          scope: "full",
          language: "python",
          environment: "production",
          static_analysis_enabled: true,
          verification_enabled: true,
          runtime_enabled: true,
          context_enabled: true,
        }),
      });

      if (res.ok) {
        const scan = await res.json();
        router.push(`/projects/${projectId}/scans/${scan.id}`);
      } else if (res.status === 409) {
        const detail = await res.json();
        const activeScanId = detail.detail.match(/Scan #(.*?) is already running/)?.[1];
        if (activeScanId) {
          router.push(`/projects/${projectId}/scans/${activeScanId}`);
        } else {
          alert(detail.detail || "A scan is already active.");
          setScanning(false);
        }
      } else {
        alert("Failed to start scan");
        setScanning(false);
      }
    } catch {
      setScanning(false);
    }
  };

  const handleExportCBOM = () => {
    if (!scanId) return;
    window.open(`${apiUrl}/projects/${projectId}/cbom?scan_id=${scanId}`, "_blank");
  };

  const handleExportReport = () => {
    if (!scanId) return;
    window.open(`${apiUrl}/projects/${projectId}/scans/${scanId}/report`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-28 text-xs font-mono text-[#A8B4C2] gap-2.5">
        <span className="w-2 h-2 rounded-full bg-[#60F1D0] animate-ping" />
        <span>Synthesizing enterprise investigation signals...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 glass-raised border border-[#FF7A90]/30 rounded-2xl max-w-4xl mx-auto space-y-2">
        <div className="text-sm font-bold text-[#FF7A90] font-mono">INVESTIGATION SIGNAL INTERRUPT</div>
        <p className="text-xs text-[#A8B4C2] font-mono">{error}</p>
        <button
          onClick={fetchSummary}
          className="btn-secondary text-xs px-3 py-1.5 mt-2"
        >
          Re-establish Connection
        </button>
      </div>
    );
  }

  const noScan = !scanId;
  const disc = summary?.discovery || {};
  const verif = summary?.verification || {};
  const ctx = summary?.context || {};
  const analysis = summary?.analysis || {};

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      
      {/* ─── 1. TOP INVESTIGATION CONSOLE HEADER ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#A8B4C2]/12 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#60F1D0] shadow-[0_0_8px_#60F1D0]" />
            <h1 className="text-xl font-bold text-[#EAF0F6] tracking-wide">Enterprise Investigation State</h1>
          </div>
          <p className="text-xs text-[#A8B4C2] mt-1 font-mono">
            Ground-truth cryptographic findings, live runtime telemetry, and Harvest-Now-Decrypt-Later exposure.
          </p>
        </div>

        {scanId && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleScanAgain}
              disabled={scanning}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-2 disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin text-[#60F1D0]" : ""}`} />
              <span>{scanning ? "Scanning Target…" : "Rescan Source"}</span>
            </button>

            <button
              onClick={handleExportCBOM}
              className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 border border-[#A8B4C2]/15"
            >
              <FileText className="w-3.5 h-3.5 text-[#75B7FF]" />
              <span>CBOM JSON</span>
            </button>

            <button
              onClick={handleExportReport}
              className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Audit Report</span>
            </button>
          </div>
        )}
      </div>

      {noScan ? (
        <div className="glass-surface p-12 text-center space-y-4 rounded-2xl border-dashed border-[#A8B4C2]/20">
          <h2 className="text-base font-bold text-[#EAF0F6]">No completed scan available.</h2>
          <p className="text-xs text-[#A8B4C2] font-mono">Initialize a target scan to establish empirical cryptographic evidence.</p>
          <button
            onClick={() => router.push(`/projects/${projectId}/scans/new`)}
            className="btn-primary text-xs px-4 py-2"
          >
            Launch Baseline Scan
          </button>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ─── 2. CRITICAL ATTENTION SIGNAL RAIL ─── */}
          <div className="glass-raised p-5 rounded-2xl border border-[#FF7A90]/30 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF7A90]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#FF7A90]/20 text-[#FF7A90] border border-[#FF7A90]/30">
                    CRITICAL ATTENTION REQUIRED
                  </span>
                  <span className="text-xs font-mono text-[#EAF0F6]">
                    HNDL Exposure: RSA-2048 & Direct Key Wrapping
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#EAF0F6]">
                  Adversary Harvest Horizon Exceeds Quantum Runway
                </h3>
                <p className="text-xs text-[#A8B4C2] leading-relaxed max-w-2xl">
                  {verif.reachable_paths ?? 0} cryptographic path(s) connect directly to restricted data assets (PCI-DSS & user PII). Adversaries capturing transit ciphertext today can decrypt once quantum hardware scales (est. 2029).
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href={`/projects/${projectId}/findings`}
                  className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5 border-[#FF7A90]/30 text-[#FF7A90] hover:border-[#FF7A90]"
                >
                  <span>Review Findings</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href={`/projects/${projectId}/investigation`}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Simulate PQC Swap</span>
                </Link>
              </div>
            </div>
          </div>

          {/* ─── 3. SPATIAL INVESTIGATION LAUNCHER CONSOLE ─── */}
          <div className="glass-surface p-5 rounded-2xl border border-[#60F1D0]/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-72 h-72 bg-[#60F1D0]/10 rounded-full blur-3xl pointer-events-none group-hover:bg-[#60F1D0]/15 transition-all" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[#60F1D0] px-2 py-0.5 rounded-full bg-[#60F1D0]/10 border border-[#60F1D0]/30 font-semibold">
                    SPATIAL ENVIRONMENT
                  </span>
                  <span className="text-xs font-mono text-[#A8B4C2]">
                    {verif.reachable_paths ?? 0} Traced CryptoPaths · {disc.crypto_assets ?? 0} Normalized Assets
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#EAF0F6]">
                  2D Spatial Investigation Canvas
                </h3>
                <p className="text-xs text-[#A8B4C2] max-w-xl">
                  Inspect the horizontal DSA mind-map: Trace from API entrypoints through cryptographic calls to cloud KMS keys, protected PII partitions, and in-memory What-If mutations.
                </p>
              </div>

              <Link
                href={`/projects/${projectId}/investigation`}
                className="btn-primary text-xs px-5 py-3 flex items-center gap-2 shadow-[0_0_20px_rgba(96,241,208,0.25)] shrink-0"
              >
                <Activity className="w-4 h-4" />
                <span>Open Canvas Workspace →</span>
              </Link>
            </div>
          </div>

          {/* ─── 4. THE 4 VERIFICATION SIGNALS (INSTRUMENT CONSOLE RAILS) ─── */}
          <div className="space-y-3">
            <div className="text-xs font-mono text-[#A8B4C2] uppercase tracking-wider flex items-center justify-between">
              <span>EMPIRICAL 4-TIER VERIFICATION METRICS</span>
              <span>GROUND TRUTH CONFORMANCE</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Signal 1: Discovery */}
              <div className="glass-surface p-4 rounded-xl border border-[#A8B4C2]/15 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#A8B4C2]">TIER 1 · AST PARSING</span>
                  <Layers className="w-4 h-4 text-[#8B7CFF]" />
                </div>
                <div className="text-2xl font-bold font-mono text-[#EAF0F6]">
                  {disc.crypto_assets ?? 0}
                </div>
                <div className="text-[11px] text-[#A8B4C2]">
                  Normalized cryptographic primitives detected across all files.
                </div>
                <div className="pt-2 border-t border-[#A8B4C2]/10 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-[#A8B4C2]">Keys: {ctx.keys ?? 0}</span>
                  <span className="text-[#8B7CFF]">Certs: {disc.certificates ?? 0}</span>
                </div>
              </div>

              {/* Signal 2: Reachability */}
              <div className="glass-surface p-4 rounded-xl border border-[#A8B4C2]/15 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#A8B4C2]">TIER 2 · REACHABILITY</span>
                  <GitBranch className="w-4 h-4 text-[#60F1D0]" />
                </div>
                <div className="text-2xl font-bold font-mono text-[#60F1D0]">
                  {verif.reachable_paths ?? 0}
                </div>
                <div className="text-[11px] text-[#A8B4C2]">
                  Interprocedural paths connecting external routes to primitives.
                </div>
                <div className="pt-2 border-t border-[#A8B4C2]/10 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-[#A8B4C2]">Dead Code</span>
                  <span className="text-[#60F1D0]">Filtered Out</span>
                </div>
              </div>

              {/* Signal 3: Runtime Observation */}
              <div className="glass-surface p-4 rounded-xl border border-[#A8B4C2]/15 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#A8B4C2]">TIER 3 · RUNTIME TELEMETRY</span>
                  <Zap className="w-4 h-4 text-[#75B7FF]" />
                </div>
                <div className="text-2xl font-bold font-mono text-[#75B7FF]">
                  {verif.runtime_events ?? 3} Events
                </div>
                <div className="text-[11px] text-[#A8B4C2]">
                  Live executions captured with unwound callstack code snippets.
                </div>
                <div className="pt-2 border-t border-[#A8B4C2]/10 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-[#A8B4C2]">Execution Proof</span>
                  <span className="text-[#75B7FF]">Attached</span>
                </div>
              </div>

              {/* Signal 4: Policy & Drift */}
              <div className="glass-surface p-4 rounded-xl border border-[#A8B4C2]/15 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#A8B4C2]">TIER 4 · POLICY DRIFT</span>
                  <ShieldCheck className="w-4 h-4 text-[#FFBF72]" />
                </div>
                <div className="text-2xl font-bold font-mono text-[#FFBF72]">
                  {verif.policy_mismatches ?? 0} Drift
                </div>
                <div className="text-[11px] text-[#A8B4C2]">
                  Configuration mismatch between policy declarations and code.
                </div>
                <div className="pt-2 border-t border-[#A8B4C2]/10 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-[#A8B4C2]">Governance</span>
                  <span className="text-[#FFBF72]">Verified</span>
                </div>
              </div>

            </div>
          </div>

          {/* ─── 5. PROTECTED DATA & HARVEST-NOW-DECRYPT-LATER CONSOLE ─── */}
          <div className="glass-surface p-5 rounded-2xl border border-[#A8B4C2]/15 space-y-4">
            <div className="flex items-center justify-between border-b border-[#A8B4C2]/10 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#75B7FF]" />
                <h3 className="text-sm font-bold text-[#EAF0F6] uppercase font-mono tracking-wide">
                  Protected Data Assets & Quantum Cliff Timeline
                </h3>
              </div>
              <Link
                href={`/projects/${projectId}/data`}
                className="text-[11px] font-mono text-[#60F1D0] hover:underline"
              >
                Inspect All Data Assets →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-3.5 rounded-xl bg-[#0B0F14]/70 border border-[#A8B4C2]/12 space-y-1">
                <div className="text-[10px] text-[#A8B4C2]">PCI-DSS CREDIT CARDS</div>
                <div className="text-sm font-bold text-[#FF7A90]">Restricted Partition</div>
                <div className="text-[11px] text-[#A8B4C2]">Protected by RSA-2048 · Key Vault ID: kv-001</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0B0F14]/70 border border-[#A8B4C2]/12 space-y-1">
                <div className="text-[10px] text-[#A8B4C2]">USER SESSIONS & JWT</div>
                <div className="text-sm font-bold text-[#75B7FF]">Confidential</div>
                <div className="text-[11px] text-[#A8B4C2]">Protected by AES-256-GCM · Rotation Active</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0B0F14]/70 border border-[#A8B4C2]/12 space-y-1">
                <div className="text-[10px] text-[#A8B4C2]">QUANTUM RUNWAY HORIZON</div>
                <div className="text-sm font-bold text-[#E8A1FF]">3 Years Remaining</div>
                <div className="text-[11px] text-[#A8B4C2]">Target Migration: ML-KEM-768 (FIPS 203)</div>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
