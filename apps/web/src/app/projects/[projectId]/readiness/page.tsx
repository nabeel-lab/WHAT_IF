"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Radio,
  Activity,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Bot,
  Zap,
  Sparkles,
  ArrowRight,
  Database,
  Layers
} from "lucide-react";
import AssistantDrawer from "@/components/investigation/AssistantDrawer";

export default function ReadinessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const scanId = searchParams.get("scan_id");

  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Assistant Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [initialQuestion, setInitialQuestion] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const url = `${apiUrl}/projects/${projectId}/analysis/summary${scanId ? `?scan_id=${scanId}` : ""}`;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
      })
      .then(data => setSummary(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId, scanId]);

  const openAssistant = (question: string) => {
    setInitialQuestion(question);
    setDrawerOpen(true);
  };

  const categories = summary?.categories || [];

  const METRIC_DETAILS: Record<string, { source: string; meaning: string; action: string }> = {
    "Runtime-observed paths": {
      source: "Dynamic execution telemetry logs",
      meaning: "Cryptographic paths confirmed actively executing during live operational traffic.",
      action: "Prioritize for zero-downtime migration testing."
    },
    "Long-lived protected data": {
      source: "Data Asset retention horizons & Two-Clock evaluation",
      meaning: "Protected assets requiring secrecy past 2030 or lacking quantum agility.",
      action: "Execute immediate data re-encryption with ML-KEM."
    },
    "Low crypto-agility readiness": {
      source: "Static AST analysis & direct algorithm call site counts",
      meaning: "Hardcoded library calls lacking an abstracted provider wrapper.",
      action: "Introduce cryptographic abstraction wrappers."
    },
    "High migration effort": {
      source: "Call site volume, PQC algorithm complexity, and key scope",
      meaning: "Migration requiring significant architectural re-engineering.",
      action: "Plan multi-sprint migration with fallback support."
    },
    "Evidence gaps": {
      source: "Reachability graph traversals without attached runtime traces",
      meaning: "Cryptographic primitives identified in code but without execution confirmation.",
      action: "Expand test harness test execution coverage."
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 relative">
      
      {/* ─── Header Console ─── */}
      <div className="border-b border-[#A8B4C2]/12 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#60F1D0] shadow-[0_0_8px_#60F1D0]" />
            <h1 className="text-xl font-bold text-[#EAF0F6] tracking-wide">
              Quantum Readiness Posture & Two-Clock Evaluation
            </h1>
          </div>
          <p className="text-xs text-[#A8B4C2] mt-1 font-mono">
            Empirical quantum cliff runway, data secrecy horizons, and migration effort across verified paths.
          </p>
        </div>

        <Link
          href={`/projects/${projectId}/investigation${scanId ? `?scan_id=${scanId}` : ""}`}
          className="btn-secondary text-xs px-3.5 py-1.5 flex items-center gap-2 self-start sm:self-auto"
        >
          <Activity className="w-3.5 h-3.5 text-[#60F1D0]" />
          <span>Spatial Graph View</span>
        </Link>
      </div>

      {/* ─── The Two-Clock Evaluation Concept Bar ─── */}
      <div className="glass-raised p-5 rounded-2xl border border-[#E8A1FF]/30 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#A8B4C2]/10 pb-3">
          <div className="flex items-center gap-2 font-mono text-xs text-[#EAF0F6]">
            <Clock className="w-4 h-4 text-[#E8A1FF]" />
            <span className="font-bold">THE TWO-CLOCK MODEL EVALUATION</span>
          </div>
          <span className="text-[10px] font-mono text-[#E8A1FF] bg-[#E8A1FF]/10 px-2 py-0.5 rounded-full border border-[#E8A1FF]/20">
            NIST CRQC THRESHOLD
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-[#0B0F14]/70 border border-[#FF7A90]/25 space-y-2">
            <div className="text-[10px] text-[#FF7A90] uppercase font-bold">CLOCK 1: QUANTUM ARRIVAL (CRQC)</div>
            <div className="text-xl font-bold text-[#EAF0F6]">2029 – 2030</div>
            <p className="text-[11px] text-[#A8B4C2] leading-relaxed">
              Cryptanalytically Relevant Quantum Computer arrival threshold when classical public-key cryptography (RSA, ECC, Diffie-Hellman) will be broken.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0B0F14]/70 border border-[#75B7FF]/25 space-y-2">
            <div className="text-[10px] text-[#75B7FF] uppercase font-bold">CLOCK 2: DATA SECRECY HORIZON</div>
            <div className="text-xl font-bold text-[#60F1D0]">2032+ (Exceeded)</div>
            <p className="text-[11px] text-[#A8B4C2] leading-relaxed">
              Required confidentiality duration for enterprise financial & PCI-DSS assets. Because Clock 2 exceeds Clock 1, HNDL attacks are already effective today.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Readiness Categories Breakdown ─── */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-xs font-mono text-[#A8B4C2] gap-2">
          <span className="w-2 h-2 rounded-full bg-[#60F1D0] animate-ping" />
          <span>Computing empirical quantum readiness posture...</span>
        </div>
      ) : error ? (
        <div className="p-5 glass-raised border border-[#FF7A90]/30 rounded-2xl text-xs font-mono text-[#FF7A90]">
          {error}
        </div>
      ) : categories.length === 0 ? (
        <div className="glass-surface p-12 text-center text-xs font-mono text-[#A8B4C2] rounded-2xl border-dashed border-[#A8B4C2]/20">
          No readiness categories computed. Execute a baseline scan to calculate posture.
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat: any, idx: number) => {
            const meta = METRIC_DETAILS[cat.name] || {
              source: "Analysis Engine",
              meaning: "Evaluated across cryptographic paths and evidence records.",
              action: "Review finding evidence."
            };

            return (
              <div
                key={cat.name || idx}
                className="glass-surface p-5 rounded-2xl border border-[#A8B4C2]/15 space-y-3 hover:border-[#60F1D0]/30 transition-all font-mono"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#A8B4C2]/10 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-[#EAF0F6]">{cat.name}</span>
                      <span className="badge badge-neutral">{cat.count || 0} Affected Paths</span>
                    </div>
                    <div className="text-[11px] text-[#A8B4C2] mt-0.5">
                      Ground truth source: <span className="text-[#60F1D0]">{meta.source}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => openAssistant(`Explain the impact and migration steps for readiness category '${cat.name}'`)}
                    className="btn-ghost text-xs px-2.5 py-1.5 border border-[#A8B4C2]/15 hover:border-[#60F1D0]/30 flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <Bot className="w-3.5 h-3.5 text-[#60F1D0]" />
                    <span>Explain Metric</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#0B0F14]/70 border border-[#A8B4C2]/10 space-y-1">
                    <span className="text-[10px] text-[#A8B4C2] uppercase">ENGINEERING MEANING</span>
                    <p className="text-[11px] text-[#EAF0F6] leading-relaxed">{meta.meaning}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0B0F14]/70 border border-[#A8B4C2]/10 space-y-1">
                    <span className="text-[10px] text-[#60F1D0] uppercase">RECOMMENDED ACTION</span>
                    <p className="text-[11px] text-[#60F1D0] leading-relaxed">{meta.action}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Embedded Contextual Assistant */}
      <AssistantDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        projectId={projectId}
        scanId={scanId || undefined}
        initialQuestion={initialQuestion}
      />

    </div>
  );
}
