"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FileCode,
  ArrowRight,
  Bot,
  Activity,
  Layers,
  Search,
  CheckCircle2,
  Terminal,
  Zap
} from "lucide-react";
import AssistantDrawer from "@/components/investigation/AssistantDrawer";

export default function EvidencePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const scanId = searchParams.get("scan_id");

  const [evidence, setEvidence] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("ALL");

  // Assistant Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [initialQuestion, setInitialQuestion] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const url = `${apiUrl}/projects/${projectId}/evidence${scanId ? `?scan_id=${scanId}` : ""}`;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
      })
      .then(data => setEvidence(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId, scanId]);

  const openAssistant = (record: any, question: string) => {
    setSelectedRecord(record);
    setInitialQuestion(question);
    setDrawerOpen(true);
  };

  const grouped: Record<string, any[]> = {};
  for (const ev of evidence) {
    const type = ev.evidence_type || "AST_PARSER";
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(ev);
  }

  const types = ["ALL", ...Object.keys(grouped)];
  const displayItems = selectedType === "ALL" ? evidence : grouped[selectedType] || [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 relative">
      
      {/* ─── Header Console ─── */}
      <div className="border-b border-[#A8B4C2]/12 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#60F1D0] shadow-[0_0_8px_#60F1D0]" />
            <h1 className="text-xl font-bold text-[#EAF0F6] tracking-wide">
              Raw Evidence Repository
            </h1>
          </div>
          <p className="text-xs text-[#A8B4C2] mt-1 font-mono">
            Layered cryptographic detection records, AST bytecode offsets, and verified runtime intercept traces.
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

      {/* ─── Filter Pills ─── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 font-mono text-xs">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedType(t)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold uppercase transition-all whitespace-nowrap ${
              selectedType === t
                ? "bg-[#1C2632] text-[#60F1D0] border-[#60F1D0]/30 shadow-[0_0_12px_rgba(96,241,208,0.12)]"
                : "bg-transparent text-[#A8B4C2] border-[#A8B4C2]/15 hover:bg-white/5"
            }`}
          >
            {t} {t !== "ALL" && `(${grouped[t]?.length || 0})`}
          </button>
        ))}
      </div>

      {/* ─── Evidence Records Console ─── */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-xs font-mono text-[#A8B4C2] gap-2">
          <span className="w-2 h-2 rounded-full bg-[#60F1D0] animate-ping" />
          <span>Querying verified evidence records...</span>
        </div>
      ) : error ? (
        <div className="p-5 glass-raised border border-[#FF7A90]/30 rounded-2xl text-xs font-mono text-[#FF7A90]">
          {error}
        </div>
      ) : displayItems.length === 0 ? (
        <div className="glass-surface p-12 text-center text-xs font-mono text-[#A8B4C2] rounded-2xl border-dashed border-[#A8B4C2]/20">
          No raw evidence records recorded for this filter.
        </div>
      ) : (
        <div className="space-y-4">
          {displayItems.map((ev, idx) => (
            <div
              key={ev.id || idx}
              className="glass-surface p-5 rounded-2xl border border-[#A8B4C2]/15 space-y-3 font-mono text-xs hover:border-[#60F1D0]/30 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#A8B4C2]/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <FileCode className="w-4 h-4 text-[#60F1D0] shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#EAF0F6]">{ev.file || ev.source_file || "File origin"}</span>
                      {ev.line && <span className="text-[#60F1D0]">:{ev.line}</span>}
                      <span className="badge badge-neutral">{ev.evidence_type || "STATIC_AST"}</span>
                    </div>
                    <div className="text-[11px] text-[#A8B4C2] mt-0.5">
                      Detector: <span className="text-[#EAF0F6]">{ev.detector || "Pattern & Syntax Resolver"}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => openAssistant(ev, `Explain evidence record #${idx + 1} at ${ev.file}:${ev.line}`)}
                  className="btn-ghost text-xs px-2.5 py-1.5 border border-[#A8B4C2]/15 hover:border-[#60F1D0]/30 flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Bot className="w-3.5 h-3.5 text-[#60F1D0]" />
                  <span>Explain Evidence</span>
                </button>
              </div>

              {ev.snippet && (
                <div className="p-3 rounded-xl bg-[#0B0F14] border border-[#A8B4C2]/12 overflow-x-auto">
                  <code className="text-[#EAF0F6]">{ev.snippet}</code>
                </div>
              )}

              {ev.context && (
                <div className="text-[11px] text-[#A8B4C2] pt-1">
                  Context: {typeof ev.context === "string" ? ev.context : JSON.stringify(ev.context)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Embedded Contextual Assistant */}
      <AssistantDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        projectId={projectId}
        scanId={scanId || undefined}
        entityType="EVIDENCE"
        entityId={selectedRecord?.id}
        initialQuestion={initialQuestion}
      />

    </div>
  );
}
