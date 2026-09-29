"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  CheckCircle2, 
  Clock, 
  RotateCw, 
  AlertTriangle, 
  Layers, 
  Shield, 
  Activity, 
  ArrowRight,
  GitBranch,
  Terminal,
  Cpu,
  Search,
  Key,
  ShieldCheck,
  Zap
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const STAGE_ICONS: Record<string, any> = {
  SOURCE_VERIFICATION: GitBranch,
  FILE_DISCOVERY: Search,
  STATIC_ANALYSIS: Cpu,
  CERTIFICATE_ANALYSIS: Shield,
  CONFIGURATION_ANALYSIS: Terminal,
  REACHABILITY: Activity,
  CONTEXT_ENRICHMENT: Key,
  RUNTIME_VERIFICATION: Zap,
  ANALYSIS: ShieldCheck,
  COMPLETE: CheckCircle2,
};

export default function ScanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const scanId = params.scanId as string;

  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);

  const fetchDetail = async () => {
    try {
      const res = await fetch(`${API}/projects/${projectId}/scans/${scanId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDetail(data);
      setLoading(false);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to load scan");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // Fast polling when scan is running (every 1.5s), slower when completed (every 8s)
    const interval = setInterval(() => {
      fetchDetail();
    }, detail?.scan?.status === "COMPLETED" || detail?.scan?.status === "FAILED" ? 8000 : 1500);

    return () => clearInterval(interval);
  }, [scanId, projectId, detail?.scan?.status]);

  const handleRestartScan = async () => {
    if (restarting) return;
    setRestarting(true);
    try {
      const res = await fetch(`${API}/projects/${projectId}/scans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          repository_url: detail?.scan?.repository_url || "https://github.com/nabeel-lab/Enterprise_info.git",
          source_type: detail?.scan?.source_type || "GIT_REPOSITORY",
          branch: detail?.scan?.branch || "main",
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
        const newScan = await res.json();
        router.push(`/projects/${projectId}/scans/${newScan.id}`);
      } else {
        alert("Unable to trigger new scan. Please wait a moment.");
      }
    } catch (e) {
      alert("Error initiating rescan");
    } finally {
      setRestarting(false);
    }
  };

  if (loading && !detail) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-sm text-[#A8B4C2] gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-[#60F1D0]/20 animate-ping" />
          <div className="w-12 h-12 rounded-full border-2 border-t-[#60F1D0] border-r-[#8B7CFF] border-b-transparent border-l-transparent animate-spin" />
        </div>
        <div className="font-mono text-xs tracking-wider uppercase text-[#EAF0F6]">
          Connecting to Cryptographic Pipeline…
        </div>
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="p-6 bg-[#151C25] border border-[#FF7A90]/30 rounded-2xl max-w-xl mx-auto text-xs text-[#FF7A90] space-y-3">
        <div className="flex items-center gap-2 font-bold text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>Scan Connection Failure</span>
        </div>
        <p className="font-mono">{error}</p>
        <button
          onClick={() => router.push(`/projects/${projectId}/scans`)}
          className="px-3.5 py-1.5 rounded-lg bg-[#1C2632] text-[#EAF0F6] border border-[#A8B4C2]/20 hover:border-[#60F1D0]/40 transition-all font-mono"
        >
          ← Return to Scan History
        </button>
      </div>
    );
  }

  const scan = detail?.scan || {};
  const stages: any[] = detail?.stages || [];
  const counts = detail?.counts || {};
  const progress = detail?.progress || {
    percentage: scan.status === "COMPLETED" ? 100 : 15,
    current_stage: "SOURCE_VERIFICATION",
    current_stage_label: "Source Verification",
    current_stage_description: "Cataloging repository ground truth",
    is_active: scan.status === "SCANNING" || scan.status === "QUEUED" || scan.status === "RUNNING",
  };

  const isActive = scan.status === "SCANNING" || scan.status === "QUEUED" || scan.status === "RUNNING";
  const isCompleted = scan.status === "COMPLETED";
  const isFailed = scan.status === "FAILED";

  // Calculate active stage index
  const activeStageIdx = stages.findIndex(s => s.status === "RUNNING");
  const completedStagesCount = stages.filter(s => s.status === "COMPLETED").length;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link 
          href={`/projects/${projectId}/scans`} 
          className="inline-flex items-center gap-2 text-xs font-mono text-[#A8B4C2] hover:text-[#60F1D0] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Scan Mutation History</span>
        </Link>

        {isCompleted && (
          <Link
            href={`/projects/${projectId}/overview`}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#60F1D0] hover:underline"
          >
            <span>View Signal Console (Overview)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#A8B4C2]/15 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className={`w-3 h-3 rounded-full ${
              isActive 
                ? "bg-[#8B7CFF] shadow-[0_0_12px_#8B7CFF] animate-pulse" 
                : isCompleted 
                ? "bg-[#60F1D0] shadow-[0_0_12px_#60F1D0]" 
                : "bg-[#FF7A90] shadow-[0_0_12px_#FF7A90]"
            }`} />
            <h1 className="text-2xl font-bold font-mono text-[#EAF0F6] tracking-tight">
              {isActive ? "Live Scan Execution" : "Scan Execution Audit"}
            </h1>
          </div>
          <div className="flex items-center gap-3 mt-2 font-mono text-xs text-[#A8B4C2]">
            <span>ID: <span className="text-[#60F1D0]">{scan.id}</span></span>
            <span>•</span>
            <span>Target: <span className="text-[#EAF0F6]">{scan.canonical_source_identity || scan.repository_url || "Enterprise_info"}</span></span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider border flex items-center gap-2 ${
            isCompleted 
              ? "bg-[#60F1D0]/10 text-[#60F1D0] border-[#60F1D0]/30 shadow-[0_0_15px_rgba(96,241,208,0.15)]" 
              : isActive 
              ? "bg-[#8B7CFF]/15 text-[#8B7CFF] border-[#8B7CFF]/40 animate-pulse shadow-[0_0_15px_rgba(139,124,255,0.2)]"
              : "bg-[#FF7A90]/10 text-[#FF7A90] border-[#FF7A90]/30"
          }`}>
            {isActive && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
            {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
            {isFailed && <AlertTriangle className="w-3.5 h-3.5" />}
            <span>{scan.status}</span>
          </span>

          {isCompleted && (
            <>
              <button 
                onClick={() => window.open(`${API}/projects/${projectId}/cbom?scan_id=${scanId}`, "_blank")}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-lg bg-[#151C25] text-[#EAF0F6] border border-[#A8B4C2]/20 hover:bg-[#1C2632] hover:border-[#75B7FF]/50 transition-all font-mono"
              >
                <FileText className="w-3.5 h-3.5 text-[#75B7FF]" />
                Export CBOM
              </button>
              <button 
                onClick={() => window.open(`${API}/projects/${projectId}/scans/${scanId}/report`, "_blank")}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-lg bg-[#60F1D0]/15 text-[#60F1D0] border border-[#60F1D0]/30 hover:bg-[#60F1D0]/25 transition-all shadow-[0_0_12px_#60F1D015] font-mono font-bold"
              >
                <Download className="w-3.5 h-3.5" />
                Audit Report
              </button>
            </>
          )}

          {isFailed && (
            <button
              onClick={handleRestartScan}
              disabled={restarting}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg bg-[#60F1D0] text-[#0B0F14] hover:bg-[#60F1D0]/90 transition-all font-mono"
            >
              <RotateCw className={`w-3.5 h-3.5 ${restarting ? "animate-spin" : ""}`} />
              <span>Retry Pipeline Scan</span>
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          1. LIVE SCAN TELEMETRY RADAR & PROGRESS BAR (HERO CONSOLE)
      ───────────────────────────────────────────────────────────── */}
      <div className={`p-6 rounded-2xl border transition-all ${
        isActive
          ? "bg-gradient-to-br from-[#151C25] via-[#1C2632] to-[#151C25] border-[#8B7CFF]/40 shadow-[0_0_30px_rgba(139,124,255,0.15)]"
          : isCompleted
          ? "bg-gradient-to-br from-[#151C25] via-[#1A232E] to-[#151C25] border-[#60F1D0]/40 shadow-[0_0_30px_rgba(96,241,208,0.12)]"
          : "bg-[#151C25] border-[#FF7A90]/30"
      }`}>
        <div className="space-y-6">
          {/* Top Status & Percentage */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Circular Gauge / Spinner Indicator */}
              <div className="relative flex items-center justify-center shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32" cy="32" r="26"
                    className="stroke-[#1C2632]"
                    strokeWidth="6"
                    fill="transparent"
                  />
                  <circle
                    cx="32" cy="32" r="26"
                    stroke={isCompleted ? "#60F1D0" : isFailed ? "#FF7A90" : "#8B7CFF"}
                    strokeWidth="6"
                    strokeDasharray={163.36}
                    strokeDashoffset={163.36 - (163.36 * (progress.percentage || 0)) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute font-mono font-bold text-xs text-[#EAF0F6]">
                  {progress.percentage}%
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#A8B4C2]">
                    {isActive ? "Active Cryptographic Discovery" : isCompleted ? "Verification Conformance Complete" : "Pipeline Halted"}
                  </span>
                  {isActive && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#8B7CFF]/20 text-[#8B7CFF] border border-[#8B7CFF]/30 font-semibold animate-pulse">
                      STAGE {activeStageIdx >= 0 ? activeStageIdx + 1 : 1} OF 10
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-[#EAF0F6] mt-0.5">
                  {isActive ? (progress.current_stage_label || "Scanning System Architecture…") : isCompleted ? "All 10 Verification Stages Confirmed" : "Scan Encountered Issues"}
                </h2>
                <p className="text-xs text-[#A8B4C2] mt-0.5 max-w-lg">
                  {isActive ? (progress.current_stage_description || "Analyzing AST nodes, reachability paths, and runtime evidence in real time.") : isCompleted ? "Cryptographic ground truth cataloged, callgraph validated, and post-quantum migration posture generated." : (scan.error_message || "Inspect the stage breakdown below for diagnostic details.")}
                </p>
              </div>
            </div>

            {/* Timestamps & Telemetry Pill */}
            <div className="text-right sm:border-l sm:border-[#A8B4C2]/15 sm:pl-6 space-y-1">
              <div className="text-[11px] font-mono text-[#A8B4C2]">COMPLETED STAGES</div>
              <div className="text-xl font-bold font-mono text-[#60F1D0]">
                {completedStagesCount} / 10
              </div>
              <div className="text-[10px] font-mono text-[#A8B4C2]">
                {scan.completed_at ? (
                  <span>Finished: {new Date(scan.completed_at).toLocaleTimeString()}</span>
                ) : (
                  <span className="flex items-center justify-end gap-1.5 text-[#60F1D0]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#60F1D0] animate-ping" />
                    Heartbeat Active
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Animated Neon Progress Bar */}
          <div className="space-y-2">
            <div className="relative w-full h-3 rounded-full bg-[#0B0F14] overflow-hidden p-0.5 border border-[#A8B4C2]/20">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out relative ${
                  isCompleted 
                    ? "bg-[#60F1D0] shadow-[0_0_15px_#60F1D0]" 
                    : isFailed 
                    ? "bg-[#FF7A90]" 
                    : "bg-gradient-to-r from-[#60F1D0] via-[#8B7CFF] to-[#60F1D0] shadow-[0_0_15px_rgba(139,124,255,0.6)]"
                }`}
                style={{ width: `${Math.max(5, progress.percentage || 0)}%` }}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.25)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.25)_50%,rgba(255,255,255,0.25)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-shimmer_1.2s_linear_infinite]" />
                )}
              </div>
            </div>
            
            <div className="flex justify-between text-[11px] font-mono text-[#A8B4C2]">
              <span>0% Initialized</span>
              <span className="text-[#60F1D0] font-semibold">{progress.percentage}% Processed</span>
              <span>100% Sealed</span>
            </div>
          </div>

          {/* Live Action Banner */}
          {isActive && (
            <div className="p-3 rounded-xl bg-[#0B0F14]/70 border border-[#8B7CFF]/20 flex items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2 text-[#8B7CFF]">
                <Activity className="w-4 h-4 animate-spin" />
                <span>ACTIVE ENGINE: <strong className="text-[#EAF0F6]">{progress.current_stage || "PROCESSING"}</strong></span>
              </div>
              <div className="text-[11px] text-[#A8B4C2] flex items-center gap-2">
                <span>Polling telemetry updates every 1.5s</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#60F1D0] animate-pulse" />
              </div>
            </div>
          )}

          {isCompleted && (
            <div className="p-3.5 rounded-xl bg-[#60F1D0]/10 border border-[#60F1D0]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-[#EAF0F6] font-mono">
                <CheckCircle2 className="w-4 h-4 text-[#60F1D0] shrink-0" />
                <span>Deterministic scan sealed. Ground truth verified on {new Date(scan.completed_at).toLocaleString()}.</span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/projects/${projectId}/overview`}
                  className="px-3 py-1.5 rounded-lg bg-[#60F1D0] text-[#0B0F14] text-xs font-mono font-bold hover:bg-[#60F1D0]/90 transition-all"
                >
                  View Overview & Signals →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. TARGET SOURCE PROVENANCE SUMMARY
      ───────────────────────────────────────────────────────────── */}
      <div className="panel p-5 bg-[#151C25] border-[#A8B4C2]/15 space-y-4">
        <div className="flex items-center justify-between border-b border-[#A8B4C2]/10 pb-3">
          <div className="text-xs font-bold text-[#EAF0F6] uppercase tracking-wider font-mono flex items-center gap-2">
            <GitBranch className="w-3.5 h-3.5 text-[#60F1D0]" />
            <span>Target Source Provenance</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-bold ${
              scan.provenance_status === "VERIFIED"
                ? "bg-[#60F1D0]/10 text-[#60F1D0] border-[#60F1D0]/30 shadow-[0_0_8px_#60F1D020]"
                : scan.provenance_status === "ACQUIRING"
                ? "bg-[#8B7CFF]/10 text-[#8B7CFF] border-[#8B7CFF]/30"
                : "bg-[#FF7A90]/10 text-[#FF7A90] border-[#FF7A90]/30"
            }`}>
              Provenance: {scan.provenance_status || "VERIFIED"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-[#1C2632]/50 p-3 rounded-lg border border-[#A8B4C2]/10">
            <div className="text-[11px] text-[#A8B4C2]">Source Intake</div>
            <div className="text-[#EAF0F6] font-semibold mt-0.5">{scan.source_type || "GIT_REPOSITORY"}</div>
          </div>
          <div className="bg-[#1C2632]/50 p-3 rounded-lg border border-[#A8B4C2]/10">
            <div className="text-[11px] text-[#A8B4C2]">Canonical Origin</div>
            <div className="text-[#60F1D0] font-semibold mt-0.5 truncate" title={scan.canonical_source_identity || scan.repository_url}>
              {scan.canonical_source_identity || scan.repository_url?.replace("https://github.com/", "") || "Enterprise_info"}
            </div>
          </div>
          <div className="bg-[#1C2632]/50 p-3 rounded-lg border border-[#A8B4C2]/10">
            <div className="text-[11px] text-[#A8B4C2]">Commit SHA</div>
            <div className="text-[#EAF0F6] font-semibold mt-0.5 truncate" title={scan.commit_sha || scan.archive_hash}>
              {scan.commit_sha ? scan.commit_sha.slice(0, 12) : scan.archive_hash ? scan.archive_hash.slice(0, 12) : "HEAD (Resolved)"}
            </div>
          </div>
          <div className="bg-[#1C2632]/50 p-3 rounded-lg border border-[#A8B4C2]/10">
            <div className="text-[11px] text-[#A8B4C2]">Provider Engine</div>
            <div className="text-[#EAF0F6] font-semibold mt-0.5">
              {scan.provider ? scan.provider.toUpperCase() : "GIT NATIVE"}
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. DISCOVERED METRIC CARDS (WHEN COMPLETED)
      ───────────────────────────────────────────────────────────── */}
      {isCompleted && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: "Files Analyzed", value: counts.files_scanned || scan.files_scanned, color: "#EAF0F6" },
            { label: "Crypto Assets", value: counts.crypto_assets, color: "#60F1D0" },
            { label: "Certificates", value: counts.certificates, color: "#75B7FF" },
            { label: "Reachable Paths", value: counts.reachable_paths, color: "#8B7CFF" },
            { label: "Runtime Observed", value: counts.runtime_observed, color: "#60F1D0" },
            { label: "Config Declared", value: counts.configuration_declared, color: "#FFBF72" },
          ].map(item => (
            <div key={item.label} className="panel p-3.5 bg-[#151C25] border-[#A8B4C2]/15 text-center rounded-xl">
              <div className="text-xl font-bold font-mono" style={{ color: item.color }}>{item.value ?? "0"}</div>
              <div className="text-[11px] text-[#A8B4C2] font-mono mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. PIPELINE EXECUTION STAGES (STEPPER & DETAILED PROGRESS)
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-[#EAF0F6] uppercase tracking-wider flex items-center gap-2 font-mono">
            <Layers className="w-3.5 h-3.5 text-[#60F1D0]" />
            <span>10 Pipeline Verification Stages</span>
          </h2>
          <span className="text-xs font-mono text-[#A8B4C2]">
            {completedStagesCount} of 10 Complete
          </span>
        </div>

        <div className="space-y-2.5">
          {stages.map((st: any, idx: number) => {
            const Icon = STAGE_ICONS[st.stage] || Layers;
            const isStageRunning = st.status === "RUNNING";
            const isStageCompleted = st.status === "COMPLETED";
            const isStageFailed = st.status === "FAILED";

            return (
              <div
                key={st.stage}
                className={`panel p-4 rounded-xl border transition-all ${
                  isStageRunning
                    ? "bg-[#1C2632] border-[#8B7CFF]/50 shadow-[0_0_15px_rgba(139,124,255,0.15)]"
                    : isStageCompleted
                    ? "bg-[#151C25] border-[#60F1D0]/20 hover:border-[#60F1D0]/40"
                    : isStageFailed
                    ? "bg-[#151C25] border-[#FF7A90]/40"
                    : "bg-[#151C25]/50 border-[#A8B4C2]/10 opacity-70"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Stage Number & Icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                      isStageCompleted
                        ? "bg-[#60F1D0]/15 text-[#60F1D0] border border-[#60F1D0]/30"
                        : isStageRunning
                        ? "bg-[#8B7CFF]/20 text-[#8B7CFF] border border-[#8B7CFF]/40 animate-pulse"
                        : isStageFailed
                        ? "bg-[#FF7A90]/15 text-[#FF7A90] border border-[#FF7A90]/30"
                        : "bg-[#1C2632] text-[#A8B4C2] border border-[#A8B4C2]/15"
                    }`}>
                      {isStageCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : isStageRunning ? (
                        <RotateCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#EAF0F6]">
                          {st.label || st.stage}
                        </span>
                        <span className="text-[10px] font-mono text-[#A8B4C2]">
                          ({st.stage})
                        </span>
                      </div>
                      <p className="text-[11px] text-[#A8B4C2] mt-0.5">
                        {st.description || "Deterministic cryptographic analysis"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center font-mono text-xs">
                    {/* Progress bar / percent */}
                    <div className="w-28 text-right space-y-1">
                      <div className="flex justify-between text-[10px] text-[#A8B4C2]">
                        <span>Progress</span>
                        <span className={isStageCompleted ? "text-[#60F1D0]" : isStageRunning ? "text-[#8B7CFF]" : ""}>
                          {st.progress ?? (isStageCompleted ? 100 : 0)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#0B0F14] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isStageCompleted ? "bg-[#60F1D0]" : isStageRunning ? "bg-[#8B7CFF] animate-pulse" : "bg-[#A8B4C2]/20"
                          }`}
                          style={{ width: `${st.progress ?? (isStageCompleted ? 100 : 0)}%` }}
                        />
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold border min-w-[90px] text-center ${
                      isStageCompleted
                        ? "bg-[#60F1D0]/10 text-[#60F1D0] border-[#60F1D0]/30"
                        : isStageRunning
                        ? "bg-[#8B7CFF]/15 text-[#8B7CFF] border-[#8B7CFF]/40 animate-pulse"
                        : isStageFailed
                        ? "bg-[#FF7A90]/10 text-[#FF7A90] border-[#FF7A90]/30"
                        : "bg-[#1C2632] text-[#A8B4C2] border-[#A8B4C2]/15"
                    }`}>
                      {st.status}
                    </span>

                    {/* Timestamp */}
                    <div className="text-[11px] text-[#A8B4C2] w-20 text-right hidden sm:block">
                      {st.completed_at ? (
                        new Date(st.completed_at).toLocaleTimeString()
                      ) : isStageRunning ? (
                        <span className="text-[#8B7CFF] animate-pulse">Running…</span>
                      ) : (
                        <span>—</span>
                      )}
                    </div>
                  </div>
                </div>

                {st.error_message && (
                  <div className="mt-3 p-2.5 rounded bg-[#FF7A90]/10 border border-[#FF7A90]/30 text-xs font-mono text-[#FF7A90]">
                    Error: {st.error_message}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
