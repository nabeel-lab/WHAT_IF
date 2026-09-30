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
          1. LIVE SCAN TELEMETRY RADAR & GRAPHICAL PROGRESS ENGINE (HERO CONSOLE)
      ───────────────────────────────────────────────────────────── */}
      <div className={`liquid-glass p-7 rounded-2xl border transition-all relative overflow-hidden ${
        isActive
          ? "border-[#8B7CFF]/50 shadow-[0_0_40px_rgba(139,124,255,0.2)]"
          : isCompleted
          ? "border-[#60F1D0]/40 shadow-[0_0_40px_rgba(96,241,208,0.15)]"
          : "border-[#FF7A90]/30"
      }`}>
        {/* Top Specular Rim */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

        <div className="space-y-7 relative z-10">
          {/* Top Status & Graphical Orbital Radar Section */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            
            {/* Left: Holographic Cyber Orbital Radar Core */}
            <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
              
              {/* Animated Orbital Radar Reactor */}
              <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                {/* Ambient glow backing */}
                <div className={`absolute inset-0 rounded-full blur-xl opacity-40 transition-colors ${
                  isCompleted ? "bg-[#60F1D0]" : isFailed ? "bg-[#FF7A90]" : "bg-[#8B7CFF]"
                }`} />

                {/* SVG Orbital Compass & Sweep */}
                <svg className="w-full h-full -rotate-90 relative z-10" viewBox="0 0 140 140">
                  <defs>
                    <linearGradient id="radarSweepGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8B7CFF" stopOpacity="0.5" />
                      <stop offset="70%" stopColor="#60F1D0" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Outer Orbit Track */}
                  <circle
                    cx="70" cy="70" r="62"
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />

                  {/* Second Telemetry Ring */}
                  <circle
                    cx="70" cy="70" r="50"
                    fill="none"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="1"
                  />

                  {/* Rotating Sweeping Radar Cone (When Active) */}
                  {isActive && (
                    <g className="animate-radar origin-center">
                      <path
                        d="M 70 70 L 70 8 A 62 62 0 0 1 128 70 Z"
                        fill="url(#radarSweepGradient)"
                      />
                    </g>
                  )}

                  {/* Progress Arc */}
                  <circle
                    cx="70" cy="70" r="50"
                    fill="none"
                    stroke={isCompleted ? "#60F1D0" : isFailed ? "#FF7A90" : "#8B7CFF"}
                    strokeWidth="5"
                    strokeDasharray={314.15}
                    strokeDashoffset={314.15 - (314.15 * (progress.percentage || 0)) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                    style={{
                      filter: `drop-shadow(0 0 6px ${isCompleted ? "#60F1D0" : "#8B7CFF"})`,
                    }}
                  />

                  {/* Inner Core Pulse Ring */}
                  <circle
                    cx="70" cy="70" r="34"
                    fill="rgba(11, 18, 28, 0.85)"
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth="1"
                  />
                </svg>

                {/* Center Percentage Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20 pointer-events-none">
                  <span className="text-xl font-bold font-mono text-[#EAF0F6] tracking-tight">
                    {progress.percentage}%
                  </span>
                  <span className="text-[9px] font-mono text-[#60F1D0] tracking-wider uppercase font-semibold">
                    {isCompleted ? "SEALED" : isActive ? "SCANNING" : "HALTED"}
                  </span>
                </div>
              </div>

              {/* Stage Telemetry Identity */}
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#A8B4C2]">
                    {isActive ? "Active Cryptographic Pipeline" : isCompleted ? "Verification Conformance Complete" : "Pipeline Halted"}
                  </span>
                  {isActive && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#8B7CFF]/20 text-[#8B7CFF] border border-[#8B7CFF]/40 font-semibold animate-pulse">
                      STAGE {activeStageIdx >= 0 ? activeStageIdx + 1 : 1} OF 10
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-[#EAF0F6]">
                  {isActive ? (progress.current_stage_label || "Scanning System Architecture…") : isCompleted ? "All 10 Verification Stages Confirmed" : "Scan Encountered Issues"}
                </h2>
                <p className="text-xs text-[#A8B4C2] max-w-md leading-relaxed">
                  {isActive ? (progress.current_stage_description || "Analyzing AST nodes, reachability paths, and runtime evidence in real time.") : isCompleted ? "Cryptographic ground truth cataloged, callgraph validated, and post-quantum migration posture generated." : (scan.error_message || "Inspect the stage breakdown below for diagnostic details.")}
                </p>
              </div>
            </div>

            {/* Right: Live Cryptographic Waveform / Telemetry Monitor */}
            <div className="w-full lg:w-auto flex flex-col items-center lg:items-end justify-center lg:border-l lg:border-white/10 lg:pl-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] font-mono text-[#A8B4C2] uppercase tracking-wider">PIPELINE MILESTONE</div>
                  <div className="text-2xl font-bold font-mono text-[#60F1D0]">
                    {completedStagesCount} <span className="text-sm text-[#A8B4C2] font-normal">/ 10</span>
                  </div>
                </div>

                {/* Animated Waveform Equalizer (Shows graphical activity) */}
                {isActive && (
                  <div className="flex items-end gap-1 h-9 px-3 py-1 bg-white/[0.04] rounded-lg border border-white/10">
                    {[65, 90, 40, 100, 75, 45, 85, 30, 95, 60].map((h, i) => (
                      <span
                        key={i}
                        className="w-1 bg-[#60F1D0] rounded-full animate-cyber-pulse"
                        style={{
                          height: `${h}%`,
                          animationDelay: `${i * 0.12}s`,
                          boxShadow: '0 0 6px rgba(96, 241, 208, 0.6)',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="text-[11px] font-mono text-[#A8B4C2]">
                {scan.completed_at ? (
                  <span>Completed: {new Date(scan.completed_at).toLocaleTimeString()}</span>
                ) : (
                  <span className="flex items-center gap-2 text-[#60F1D0]">
                    <span className="w-2 h-2 rounded-full bg-[#60F1D0] animate-ping" />
                    Live Telemetry Stream Active (1.5s)
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* ── Graphical Stage Pipeline Node Track ── */}
          <div className="liquid-glass-card p-4 rounded-xl border border-white/10 overflow-x-auto">
            <div className="flex items-center justify-between min-w-[700px] gap-2">
              {stages.map((st: any, idx: number) => {
                const isStageRunning = st.status === "RUNNING";
                const isStageCompleted = st.status === "COMPLETED";
                const isStageFailed = st.status === "FAILED";
                const Icon = STAGE_ICONS[st.stage] || Layers;

                return (
                  <div key={st.stage} className="flex items-center flex-1 last:flex-none">
                    {/* Stage Circular Node */}
                    <div className="flex flex-col items-center group relative cursor-pointer">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all ${
                        isStageCompleted
                          ? "bg-[#60F1D0]/20 text-[#60F1D0] border border-[#60F1D0] shadow-[0_0_12px_#60F1D060]"
                          : isStageRunning
                          ? "bg-[#8B7CFF]/30 text-[#8B7CFF] border border-[#8B7CFF] animate-pulse shadow-[0_0_15px_#8B7CFF]"
                          : isStageFailed
                          ? "bg-[#FF7A90]/20 text-[#FF7A90] border border-[#FF7A90]"
                          : "bg-white/5 text-[#A8B4C2] border border-white/10"
                      }`}>
                        {isStageCompleted ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : isStageRunning ? (
                          <RotateCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </div>
                      <span className={`text-[10px] font-mono mt-1 text-center truncate max-w-[75px] ${
                        isStageRunning ? "text-[#8B7CFF] font-bold" : isStageCompleted ? "text-[#60F1D0]" : "text-[#A8B4C2]"
                      }`}>
                        {st.label?.split(' ')[0] || st.stage.split('_')[0]}
                      </span>
                    </div>

                    {/* Connecting Beam Line */}
                    {idx < stages.length - 1 && (
                      <div className="flex-1 h-[2px] mx-1 relative overflow-hidden bg-white/10 rounded-full">
                        <div
                          className={`h-full transition-all duration-700 ${
                            isStageCompleted
                              ? "bg-[#60F1D0] shadow-[0_0_8px_#60F1D0]"
                              : isStageRunning
                              ? "bg-gradient-to-r from-[#60F1D0] to-[#8B7CFF] animate-pulse"
                              : "bg-transparent"
                          }`}
                          style={{ width: isStageCompleted ? "100%" : isStageRunning ? "50%" : "0%" }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Graphical Laser Progress Rail */}
          <div className="space-y-2">
            <div className="relative w-full h-3 rounded-full bg-[#070D14] overflow-hidden p-0.5 border border-white/15">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out relative ${
                  isCompleted 
                    ? "bg-[#60F1D0] shadow-[0_0_20px_#60F1D0]" 
                    : isFailed 
                    ? "bg-[#FF7A90]" 
                    : "bg-gradient-to-r from-[#60F1D0] via-[#8B7CFF] to-[#60F1D0] shadow-[0_0_20px_rgba(139,124,255,0.7)]"
                }`}
                style={{ width: `${Math.max(4, progress.percentage || 0)}%` }}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.3)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.3)_50%,rgba(255,255,255,0.3)_75%,transparent_75%,transparent)] bg-[length:1.2rem_1.2rem] animate-[progress-shimmer_1s_linear_infinite]" />
                )}
                {/* Glowing Laser Head */}
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-white rounded-full shadow-[0_0_10px_white]" />
              </div>
            </div>
            
            <div className="flex justify-between text-[11px] font-mono text-[#A8B4C2]">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#60F1D0]" />
                0% AST Intake
              </span>
              <span className="text-[#60F1D0] font-semibold tracking-wider font-mono">
                {progress.percentage}% Processed · Stage {activeStageIdx >= 0 ? activeStageIdx + 1 : 10} of 10
              </span>
              <span className="flex items-center gap-1.5">
                100% Sealed
                <span className={`w-1.5 h-1.5 rounded-full ${isCompleted ? "bg-[#60F1D0]" : "bg-white/20"}`} />
              </span>
            </div>
          </div>

          {/* Active Diagnostic Bar */}
          {isActive && (
            <div className="p-3.5 rounded-xl liquid-glass-card border border-[#8B7CFF]/30 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2.5 text-[#8B7CFF]">
                <Activity className="w-4 h-4 animate-spin text-[#60F1D0]" />
                <span>ACTIVE ENGINE: <strong className="text-[#EAF0F6]">{progress.current_stage || "PROCESSING"}</strong></span>
                <span className="hidden sm:inline text-white/30">•</span>
                <span className="hidden sm:inline text-[#A8B4C2]">AST CFG Traversal</span>
              </div>
              <div className="text-[11px] text-[#A8B4C2] flex items-center gap-2">
                <span>Deterministic Verification in progress</span>
                <span className="w-2 h-2 rounded-full bg-[#60F1D0] animate-ping" />
              </div>
            </div>
          )}

          {isCompleted && (
            <div className="p-4 rounded-xl liquid-glass-card border border-[#60F1D0]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_20px_#60F1D015]">
              <div className="flex items-center gap-2.5 text-xs text-[#EAF0F6] font-mono">
                <CheckCircle2 className="w-5 h-5 text-[#60F1D0] shrink-0" />
                <span>Deterministic scan sealed. Ground truth verified on {new Date(scan.completed_at).toLocaleString()}.</span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/projects/${projectId}/overview`}
                  className="px-4 py-2 rounded-xl bg-[#60F1D0] text-[#0B0F14] text-xs font-mono font-bold hover:bg-[#60F1D0]/90 transition-all shadow-[0_0_15px_#60F1D050]"
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
      <div className="liquid-glass-card p-5 border border-white/10 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
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
          <div className="bg-white/[0.03] p-3 rounded-xl border border-white/10">
            <div className="text-[11px] text-[#A8B4C2]">Source Intake</div>
            <div className="text-[#EAF0F6] font-semibold mt-0.5">{scan.source_type || "GIT_REPOSITORY"}</div>
          </div>
          <div className="bg-white/[0.03] p-3 rounded-xl border border-white/10">
            <div className="text-[11px] text-[#A8B4C2]">Canonical Origin</div>
            <div className="text-[#60F1D0] font-semibold mt-0.5 truncate" title={scan.canonical_source_identity || scan.repository_url}>
              {scan.canonical_source_identity || scan.repository_url?.replace("https://github.com/", "") || "Enterprise_info"}
            </div>
          </div>
          <div className="bg-white/[0.03] p-3 rounded-xl border border-white/10">
            <div className="text-[11px] text-[#A8B4C2]">Commit SHA</div>
            <div className="text-[#EAF0F6] font-semibold mt-0.5 truncate" title={scan.commit_sha || scan.archive_hash}>
              {scan.commit_sha ? scan.commit_sha.slice(0, 12) : scan.archive_hash ? scan.archive_hash.slice(0, 12) : "HEAD (Resolved)"}
            </div>
          </div>
          <div className="bg-white/[0.03] p-3 rounded-xl border border-white/10">
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
            <div key={item.label} className="liquid-glass-card p-3.5 border border-white/10 text-center rounded-xl">
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
                className={`liquid-glass-card p-4 rounded-xl border transition-all ${
                  isStageRunning
                    ? "border-[#8B7CFF]/60 shadow-[0_0_25px_rgba(139,124,255,0.25)] ring-1 ring-[#8B7CFF]/40"
                    : isStageCompleted
                    ? "border-[#60F1D0]/25 hover:border-[#60F1D0]/50"
                    : isStageFailed
                    ? "border-[#FF7A90]/40"
                    : "border-white/10 opacity-70"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Stage Number & Icon */}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 transition-transform ${
                      isStageCompleted
                        ? "bg-[#60F1D0]/15 text-[#60F1D0] border border-[#60F1D0]/40 shadow-[0_0_10px_#60F1D030]"
                        : isStageRunning
                        ? "bg-[#8B7CFF]/25 text-[#8B7CFF] border border-[#8B7CFF]/50 animate-pulse shadow-[0_0_15px_#8B7CFF50]"
                        : isStageFailed
                        ? "bg-[#FF7A90]/15 text-[#FF7A90] border border-[#FF7A90]/30"
                        : "bg-white/5 text-[#A8B4C2] border border-white/10"
                    }`}>
                      {isStageCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : isStageRunning ? (
                        <RotateCw className="w-4 h-4 animate-spin text-[#8B7CFF]" />
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
                    {/* Active Waveform Equalizer (Only on running stage) */}
                    {isStageRunning && (
                      <div className="hidden md:flex items-end gap-0.5 h-6 px-2 py-0.5 bg-white/5 rounded border border-[#8B7CFF]/30">
                        {[40, 80, 50, 100, 60].map((h, i) => (
                          <span
                            key={i}
                            className="w-0.5 bg-[#8B7CFF] rounded-full animate-cyber-pulse"
                            style={{ height: `${h}%`, animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </div>
                    )}

                    {/* Progress bar / percent */}
                    <div className="w-28 text-right space-y-1">
                      <div className="flex justify-between text-[10px] text-[#A8B4C2]">
                        <span>Progress</span>
                        <span className={isStageCompleted ? "text-[#60F1D0] font-bold" : isStageRunning ? "text-[#8B7CFF] font-bold" : ""}>
                          {st.progress ?? (isStageCompleted ? 100 : 0)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#070D14] overflow-hidden border border-white/10">
                        <div
                          className={`h-full rounded-full transition-all duration-500 relative ${
                            isStageCompleted ? "bg-[#60F1D0] shadow-[0_0_8px_#60F1D0]" : isStageRunning ? "bg-[#8B7CFF] shadow-[0_0_10px_#8B7CFF]" : "bg-white/10"
                          }`}
                          style={{ width: `${st.progress ?? (isStageCompleted ? 100 : 0)}%` }}
                        />
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border min-w-[90px] text-center ${
                      isStageCompleted
                        ? "bg-[#60F1D0]/10 text-[#60F1D0] border-[#60F1D0]/30"
                        : isStageRunning
                        ? "bg-[#8B7CFF]/15 text-[#8B7CFF] border-[#8B7CFF]/40 animate-pulse"
                        : isStageFailed
                        ? "bg-[#FF7A90]/10 text-[#FF7A90] border-[#FF7A90]/30"
                        : "bg-white/5 text-[#A8B4C2] border border-white/10"
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
                  <div className="mt-3 p-2.5 rounded-lg bg-[#FF7A90]/10 border border-[#FF7A90]/30 text-xs font-mono text-[#FF7A90]">
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
