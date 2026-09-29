"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Activity, ShieldCheck, HelpCircle, Bot } from "lucide-react";
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

  useEffect(() => {
    const url = `http://localhost:8000/projects/${projectId}/analysis/summary${scanId ? `?scan_id=${scanId}` : ""}`;
    fetch(url)
      .then(res => { if (!res.ok) throw new Error(`API error ${res.status}`); return res.json(); })
      .then(data => setSummary(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId, scanId]);

  const openAssistant = (question: string) => {
    setInitialQuestion(question);
    setDrawerOpen(true);
  };

  const categories = summary?.categories || [];

  // Deterministic source mapping per readiness metric
  const METRIC_DETAILS: Record<string, { source: string; meaning: string; unknowns: string }> = {
    "Runtime-observed paths": {
      source: "Dynamic telemetry harness & execution event logs (`runtime_events`)",
      meaning: "Crypto paths actively observed running during live execution.",
      unknowns: "Unexecuted code branches or unshot test scenarios."
    },
    "Long-lived protected data": {
      source: "Data Asset retention horizons & Two-Clock evaluation engine (`runway_state`)",
      meaning: "Paths protecting data requiring secrecy past 2030 or lacking quantum agility.",
      unknowns: "Undocumented data sensitivity or missing confidentiality horizon metadata."
    },
    "Low crypto-agility readiness": {
      source: "Static AST analysis & direct algorithm call site count (`crypto_agility_state`)",
      meaning: "Direct hardcoded algorithm usages lacking an abstraction provider interface.",
      unknowns: "Custom wrapper functions not recognized as abstraction libraries."
    },
    "High migration effort": {
      source: "Call site volume, PQC algorithm complexity, and key scope (`migration_effort`)",
      meaning: "PQC migration requiring significant engineering re-architecture or RSA key wrap updates.",
      unknowns: "Third-party SDK dependencies or external API vendor constraints."
    },
    "Evidence gaps": {
      source: "EvidenceContextEngine coverage validation (`evidence_coverage`)",
      meaning: "Paths lacking complete static AST, call graph, or runtime telemetry proof.",
      unknowns: "Unresolved interprocedural control flow or dynamically loaded modules."
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 relative">
      <div className="border-b border-[#A8B4C2]/15 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#8B7CFF] shadow-[0_0_8px_#8B7CFF]" />
            <h1 className="text-xl font-bold text-[#EAF0F6] tracking-wide">Crypto-Agility & Migration Readiness</h1>
          </div>
          <p className="text-xs text-[#A8B4C2] mt-1 font-mono">
            Deterministic, rule-first evaluation breakdown derived directly from scan ground truth.
          </p>
        </div>

        <button
          onClick={() => openAssistant("Explain how the displayed readiness state was derived from deterministic inputs")}
          className="inline-flex items-center gap-1.5 text-xs font-mono px-3.5 py-2 rounded-lg bg-[#60F1D0]/10 hover:bg-[#60F1D0]/20 text-[#60F1D0] border border-[#60F1D0]/30 transition-all"
        >
          <Bot className="w-4 h-4" />
          <span>Ask ECDAT: Explain Readiness Derivation</span>
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 text-sm text-[#A8B4C2] gap-2">
          <span className="w-2 h-2 rounded-full bg-[#8B7CFF] animate-ping" />
          Loading agility readiness telemetry…
        </div>
      )}

      {error && (
        <div className="text-xs text-[#FF7A90] p-4 bg-[#151C25] border border-[#FF7A90]/30 rounded-xl">
          {error}
        </div>
      )}

      {!loading && !error && categories.length === 0 && (
        <div className="panel p-12 text-center text-[#A8B4C2] text-xs border-[#A8B4C2]/15 bg-[#151C25]/40">
          No readiness analysis available. Execute an automated scan to calculate baseline metrics.
        </div>
      )}

      {categories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat: any, i: number) => {
            const detail = METRIC_DETAILS[cat.name] || {
              source: "Deterministic Evaluation Engine",
              meaning: "Automated readiness classification",
              unknowns: "Requires deeper context engine enrichment"
            };

            return (
              <div key={i} className="panel p-5 bg-[#151C25] border-[#A8B4C2]/15 flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-mono text-[#EAF0F6] font-semibold">{cat.name}</div>
                    <div className="text-xs text-[#A8B4C2] mt-1">{detail.meaning}</div>
                  </div>
                  <div className="text-3xl font-bold font-mono text-[#8B7CFF]">{cat.count}</div>
                </div>

                <div className="space-y-2 border-t border-[#A8B4C2]/10 pt-3 text-[11px] font-mono">
                  <div className="flex items-start gap-1.5 text-[#60F1D0]">
                    <ShieldCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-[#EAF0F6]">Source:</strong> {detail.source}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-[#FFBF72]">
                    <HelpCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-[#EAF0F6]">Unknowns:</strong> {detail.unknowns}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assistant Drawer */}
      {drawerOpen && (
        <AssistantDrawer
          entityType="READINESS"
          entityId="GENERAL"
          entityTitle="Readiness & Agility Derivation"
          initialQuestion={initialQuestion}
          scanId={scanId || undefined}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}

