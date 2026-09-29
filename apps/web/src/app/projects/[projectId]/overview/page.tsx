"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ShieldCheck, 
  Search, 
  Activity, 
  AlertTriangle, 
  Clock, 
  Layers, 
  Key, 
  Database, 
  ArrowRight, 
  Download, 
  FileText, 
  RotateCw,
  Cpu
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

  const fetchSummary = async () => {
    try {
      const res = await fetch(`http://localhost:8000/projects/${projectId}/summary`);
      if (!res.ok) throw new Error(`Summary API returned ${res.status}`);
      const data = await res.json();
      setSummary(data);
    } catch (e: any) {
      setError(e.message || "Unable to load project investigation summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch(`http://localhost:8000/projects`)
      .then(r => r.json())
      .then(data => {
        const p = data.find((p: any) => p.id === projectId);
        if (p) setProject(p);
      });
    
    fetchSummary();
    const interval = setInterval(fetchSummary, 5000);
    return () => clearInterval(interval);
  }, [projectId]);

  const scanId = summary?.latest_completed_scan_id;

  const handleScanAgain = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      const res = await fetch(`http://localhost:8000/projects/${projectId}/scans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          repository_url: project?.repository_url || summary?.latest_completed_scan_repository_url || "https://github.com/nabeel-lab/Enterprise_info.git",
          source_type: "GIT_REPOSITORY",
          branch: "main",
          scope: "full", language: "python", environment: "production",
          static_analysis_enabled: true, verification_enabled: true,
          runtime_enabled: true, context_enabled: true,
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
    window.open(`http://localhost:8000/projects/${projectId}/cbom?scan_id=${scanId}`, "_blank");
  };

  const handleExportReport = () => {
    if (!scanId) return;
    window.open(`http://localhost:8000/projects/${projectId}/scans/${scanId}/report`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[#A8B4C2] gap-2">
        <span className="w-2 h-2 rounded-full bg-[#60F1D0] animate-ping" />
        Loading investigation signals...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-[#151C25] border border-[#FF7A90]/30 rounded-xl max-w-4xl mx-auto">
        <p className="text-sm font-semibold text-[#FF7A90]">Unable to load project investigation summary</p>
        <p className="text-xs text-[#A8B4C2] mt-1 font-mono">{error}</p>
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
      {/* Top Banner / Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#A8B4C2]/15 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#60F1D0] shadow-[0_0_8px_#60F1D0]" />
            <h1 className="text-xl font-bold text-[#EAF0F6] tracking-wide">Investigation Signal Console</h1>
          </div>
          <p className="text-xs text-[#A8B4C2] mt-1">
            Deterministic cryptographic ground truth, runtime conformance, and post-quantum migration posture.
          </p>
        </div>
        
        {scanId && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleScanAgain}
              disabled={scanning}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-lg border transition-all ${
                scanning
                  ? "bg-[#1C2632] text-[#A8B4C2] border-[#A8B4C2]/15 cursor-not-allowed"
                  : "bg-[#1C2632] text-[#EAF0F6] border-[#A8B4C2]/25 hover:border-[#60F1D0]/50 hover:bg-[#1C2632]/80"
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
              {scanning ? "Scanning…" : "Rescan Environment"}
            </button>

            <button 
              onClick={handleExportCBOM} 
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-lg bg-[#151C25] hover:bg-[#1C2632] text-[#EAF0F6] border border-[#A8B4C2]/20 transition-all"
            >
              <FileText className="w-3.5 h-3.5 text-[#75B7FF]" />
              Export CBOM
            </button>

            <button 
              onClick={handleExportReport} 
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-lg bg-[#60F1D0]/15 hover:bg-[#60F1D0]/25 text-[#60F1D0] border border-[#60F1D0]/30 transition-all shadow-[0_0_12px_#60F1D015]"
            >
              <Download className="w-3.5 h-3.5 text-[#60F1D0]" />
              Audit Report
            </button>
          </div>
        )}
      </div>

      {noScan ? (
        <div className="panel p-12 text-center space-y-4 border-dashed border-[#A8B4C2]/20 bg-[#151C25]/40">
          <h2 className="text-base font-semibold text-[#EAF0F6]">No completed scan available.</h2>
          <p className="text-xs text-[#A8B4C2]">Initialize an automated pipeline scan to build cryptographic ground truth.</p>
          <button
            onClick={() => router.push(`/projects/${projectId}/scans/new`)}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#60F1D0] text-[#0B0F14] hover:bg-[#60F1D0]/90 transition-all"
          >
            Launch First Scan
          </button>
        </div>
      ) : (
        <div className="space-y-6">

          {/* 1. SCAN PROVENANCE CONSOLE BAR */}
          <div className="panel p-4 bg-[#151C25] border-[#A8B4C2]/15 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <span className="text-[11px] font-mono text-[#A8B4C2] block">SCAN EXECUTION</span>
                <span className="text-xs font-mono text-[#60F1D0] font-semibold">{scanId}</span>
              </div>
              <div className="h-6 w-[1px] bg-[#A8B4C2]/15 hidden sm:block" />
              <div>
                <span className="text-[11px] font-mono text-[#A8B4C2] block">GIT COMMIT</span>
                <span className="text-xs font-mono text-[#EAF0F6]">
                  {summary.latest_completed_scan_commit_sha ? summary.latest_completed_scan_commit_sha.slice(0, 10) : "HEAD"}
                </span>
              </div>
              <div className="h-6 w-[1px] bg-[#A8B4C2]/15 hidden sm:block" />
              <div>
                <span className="text-[11px] font-mono text-[#A8B4C2] block">COMPLETED</span>
                <span className="text-xs text-[#EAF0F6]">
                  {summary.scan_completed_at ? new Date(summary.scan_completed_at).toLocaleString() : "—"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="badge badge-success">
                <span className="w-1.5 h-1.5 rounded-full bg-[#60F1D0] mr-1.5" />
                IMMUTABLE BASELINE
              </span>
            </div>
          </div>

          {/* 2. SPATIAL INVESTIGATION LAUNCHER BANNER */}
          <div className="relative overflow-hidden rounded-xl border border-[#60F1D0]/30 bg-gradient-to-r from-[#151C25] via-[#1C2632] to-[#151C25] p-5 shadow-[0_0_25px_#60F1D010]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#60F1D0] px-2 py-0.5 rounded bg-[#60F1D0]/10 border border-[#60F1D0]/20">
                    INTERACTIVE SPATIAL GRAPH
                  </span>
                  <span className="text-xs text-[#A8B4C2]">{verif.reachable_paths ?? 0} CryptoPaths Mapped</span>
                </div>
                <h3 className="text-base font-semibold text-[#EAF0F6]">
                  Launch Spatial Investigation Workspace
                </h3>
                <p className="text-xs text-[#A8B4C2] max-w-xl">
                  Explore full relational graph: CryptoAssets → Runtime Callsites → Data Contexts → Decision Workbench & What-If simulator.
                </p>
              </div>

              <Link
                href={`/projects/${projectId}/investigation`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#60F1D0] hover:bg-[#60F1D0]/90 text-[#0B0F14] text-xs font-bold transition-all shadow-[0_0_15px_#60F1D040] shrink-0"
              >
                <span>Open Spatial Canvas</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* 3. INVESTIGATION SIGNALS (DISCOVERY & CONFORMANCE) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Discovery Signal Group */}
            <div className="panel overflow-hidden border-[#A8B4C2]/15">
              <div className="panel-header flex items-center justify-between">
                <span className="text-xs font-bold text-[#EAF0F6] uppercase tracking-wider flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-[#60F1D0]" />
                  Discovery Signals
                </span>
                <span className="text-[11px] font-mono text-[#A8B4C2]">Static AST Analysis</span>
              </div>
              <div className="divide-y divide-[#A8B4C2]/10 text-xs">
                <div className="flex justify-between items-center p-3.5 hover:bg-[#1C2632]/40 transition-colors">
                  <span className="text-[#A8B4C2]">Scanned Source Files</span>
                  <span className="font-mono text-[#EAF0F6] font-medium">{disc.files ?? 0}</span>
                </div>
                <div className="flex justify-between items-center p-3.5 hover:bg-[#1C2632]/40 transition-colors">
                  <span className="text-[#A8B4C2]">Canonical Cryptographic Assets</span>
                  <Link href={`/projects/${projectId}/findings?scan_id=${scanId}`} className="font-mono font-semibold text-[#60F1D0] hover:underline flex items-center gap-1">
                    {disc.crypto_assets ?? 0} Assets →
                  </Link>
                </div>
                <div className="flex justify-between items-center p-3.5 hover:bg-[#1C2632]/40 transition-colors">
                  <span className="text-[#A8B4C2]">Identified Certificates</span>
                  <Link href={`/projects/${projectId}/cbom?scan_id=${scanId}`} className="font-mono text-[#EAF0F6] hover:text-[#60F1D0]">
                    {disc.certificates ?? 0}
                  </Link>
                </div>
                <div className="flex justify-between items-center p-3.5 hover:bg-[#1C2632]/40 transition-colors">
                  <span className="text-[#A8B4C2]">Key Metadata Declarations</span>
                  <Link href={`/projects/${projectId}/keys?scan_id=${scanId}`} className="font-mono text-[#EAF0F6] hover:text-[#60F1D0]">
                    {disc.key_metadata ?? 0}
                  </Link>
                </div>
              </div>
            </div>

            {/* Verification & Conformance Signal Group */}
            <div className="panel overflow-hidden border-[#A8B4C2]/15">
              <div className="panel-header flex items-center justify-between">
                <span className="text-xs font-bold text-[#EAF0F6] uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#8B7CFF]" />
                  Verification & Conformance
                </span>
                <span className="text-[11px] font-mono text-[#A8B4C2]">Runtime & Reachability</span>
              </div>
              <div className="divide-y divide-[#A8B4C2]/10 text-xs">
                <div className="flex justify-between items-center p-3.5 hover:bg-[#1C2632]/40 transition-colors">
                  <span className="text-[#A8B4C2]">Verified Reachable Call Chains</span>
                  <Link href={`/projects/${projectId}/paths?scan_id=${scanId}&reachability=REACHABLE`} className="font-mono font-semibold text-[#8B7CFF] hover:underline flex items-center gap-1">
                    {verif.reachable_paths ?? 0} Paths →
                  </Link>
                </div>
                <div className="flex justify-between items-center p-3.5 hover:bg-[#1C2632]/40 transition-colors">
                  <span className="text-[#A8B4C2]">Runtime Observed Executions</span>
                  <span className="font-mono text-[#60F1D0] font-semibold">{verif.runtime_observed_paths ?? 0} Observed</span>
                </div>
                <div className="flex justify-between items-center p-3.5 hover:bg-[#1C2632]/40 transition-colors">
                  <span className="text-[#A8B4C2]">Config-Declared Algorithms</span>
                  <span className="font-mono text-[#EAF0F6]">{verif.configuration_declared ?? 0}</span>
                </div>
                <div className="flex justify-between items-center p-3.5 hover:bg-[#1C2632]/40 transition-colors">
                  <span className="text-[#A8B4C2]">Config / Runtime Discrepancies</span>
                  {verif.configuration_mismatches > 0 ? (
                    <span className="badge badge-danger">
                      {verif.configuration_mismatches} Mismatches
                    </span>
                  ) : (
                    <span className="badge badge-success">0 Mismatches</span>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* 4. POST-QUANTUM ATTENTION AREAS & MIGRATION CONSOLE */}
          <div className="panel p-5 border-[#A8B4C2]/15 bg-[#151C25]">
            <div className="flex items-center justify-between border-b border-[#A8B4C2]/10 pb-3 mb-4">
              <div>
                <h3 className="text-xs font-bold text-[#EAF0F6] uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#FFBF72]" />
                  Cryptographic Migration Attention Areas
                </h3>
                <p className="text-[11px] text-[#A8B4C2] mt-0.5">
                  Actionable flags derived from the Two-Clock Runway and Agility Evaluation Engine.
                </p>
              </div>
              <span className="text-[11px] font-mono text-[#A8B4C2]">Policy: phase5-v1</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Link 
                href={`/projects/${projectId}/findings?scan_id=${scanId}&runway=NEEDS_PLANNING,URGENT`}
                className="p-4 rounded-xl border border-[#A8B4C2]/10 bg-[#1C2632]/50 hover:bg-[#1C2632] hover:border-[#FF7A90]/40 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono text-[#A8B4C2]">RETENTION EXPOSURE</span>
                  <Clock className="w-3.5 h-3.5 text-[#FF7A90]" />
                </div>
                <div className="text-2xl font-bold font-mono text-[#FF7A90] group-hover:scale-105 transition-transform">
                  {analysis.long_lived_data_paths ?? 0}
                </div>
                <div className="text-xs text-[#EAF0F6] font-medium mt-1">Long-Lived Data Paths</div>
                <div className="text-[11px] text-[#A8B4C2] mt-0.5">Protected data lifespan exceeds 2030 threshold</div>
              </Link>

              <Link 
                href={`/projects/${projectId}/readiness?scan_id=${scanId}&agility=LOW_READINESS`}
                className="p-4 rounded-xl border border-[#A8B4C2]/10 bg-[#1C2632]/50 hover:bg-[#1C2632] hover:border-[#FFBF72]/40 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono text-[#A8B4C2]">HARDCODED PARAMS</span>
                  <AlertTriangle className="w-3.5 h-3.5 text-[#FFBF72]" />
                </div>
                <div className="text-2xl font-bold font-mono text-[#FFBF72] group-hover:scale-105 transition-transform">
                  {analysis.low_crypto_agility_paths ?? 0}
                </div>
                <div className="text-xs text-[#EAF0F6] font-medium mt-1">Low Crypto-Agility</div>
                <div className="text-[11px] text-[#A8B4C2] mt-0.5">Lacks abstraction layer; hardcoded cryptographic calls</div>
              </Link>

              <Link 
                href={`/projects/${projectId}/readiness?scan_id=${scanId}&effort=HIGH`}
                className="p-4 rounded-xl border border-[#A8B4C2]/10 bg-[#1C2632]/50 hover:bg-[#1C2632] hover:border-[#8B7CFF]/40 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono text-[#A8B4C2]">COMPLEXITY</span>
                  <Cpu className="w-3.5 h-3.5 text-[#8B7CFF]" />
                </div>
                <div className="text-2xl font-bold font-mono text-[#8B7CFF] group-hover:scale-105 transition-transform">
                  {analysis.migration_effort_high ?? 0}
                </div>
                <div className="text-xs text-[#EAF0F6] font-medium mt-1">High Migration Effort</div>
                <div className="text-[11px] text-[#A8B4C2] mt-0.5">Multiple touchpoints or external SaaS provider dependencies</div>
              </Link>

              <Link 
                href={`/projects/${projectId}/evidence?scan_id=${scanId}&gaps=true`}
                className="p-4 rounded-xl border border-[#A8B4C2]/10 bg-[#1C2632]/30 hover:bg-[#1C2632] hover:border-[#A8B4C2]/30 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono text-[#A8B4C2]">TELEMETRY GAPS</span>
                  <Layers className="w-3.5 h-3.5 text-[#A8B4C2]" />
                </div>
                <div className="text-2xl font-bold font-mono text-[#EAF0F6] group-hover:scale-105 transition-transform">
                  {ctx.evidence_gaps ?? 0}
                </div>
                <div className="text-xs text-[#EAF0F6] font-medium mt-1">Identified Evidence Gaps</div>
                <div className="text-[11px] text-[#A8B4C2] mt-0.5">Missing runtime, key context, or static reachability proof</div>
              </Link>

              <Link 
                href={`/projects/${projectId}/data?scan_id=${scanId}`}
                className="p-4 rounded-xl border border-[#A8B4C2]/10 bg-[#1C2632]/30 hover:bg-[#1C2632] hover:border-[#75B7FF]/40 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono text-[#A8B4C2]">DATA CLASSIFICATION</span>
                  <Database className="w-3.5 h-3.5 text-[#75B7FF]" />
                </div>
                <div className="text-2xl font-bold font-mono text-[#75B7FF] group-hover:scale-105 transition-transform">
                  {ctx.mapped_data_assets ?? 0}
                </div>
                <div className="text-xs text-[#EAF0F6] font-medium mt-1">Mapped Data Assets</div>
                <div className="text-[11px] text-[#A8B4C2] mt-0.5">Classified patient records and financial archives</div>
              </Link>

              <Link 
                href={`/projects/${projectId}/keys?scan_id=${scanId}`}
                className="p-4 rounded-xl border border-[#A8B4C2]/10 bg-[#1C2632]/30 hover:bg-[#1C2632] hover:border-[#FFBF72]/40 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono text-[#A8B4C2]">KEY MANAGEMENT</span>
                  <Key className="w-3.5 h-3.5 text-[#FFBF72]" />
                </div>
                <div className="text-2xl font-bold font-mono text-[#FFBF72] group-hover:scale-105 transition-transform">
                  {ctx.mapped_key_context ?? 0}
                </div>
                <div className="text-xs text-[#EAF0F6] font-medium mt-1">Key Contexts</div>
                <div className="text-[11px] text-[#A8B4C2] mt-0.5">KMS IDs, HSM wrappers, and rotation states</div>
              </Link>
            </div>
          </div>

          {/* 5. IMMUTABLE RECORD FOOTER */}
          <div className="panel p-4 bg-[#151C25]/50 border-[#A8B4C2]/15 flex items-center justify-between text-xs">
            <span className="text-[#A8B4C2]">
              Historical scan records are cryptographically sealed. Rescanning creates an immutable new revision.
            </span>
            <Link 
              href={`/projects/${projectId}/scans/history`} 
              className="text-[#60F1D0] hover:underline font-mono text-[11px] flex items-center gap-1 shrink-0"
            >
              Scan History & Diff View →
            </Link>
          </div>

        </div>
      )}
    </div>
  );
}
