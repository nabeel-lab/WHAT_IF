"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { FileCode, ArrowRight, Bot } from "lucide-react";
import AssistantDrawer from "@/components/investigation/AssistantDrawer";

export default function EvidencePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const scanId = searchParams.get("scan_id");

  const [evidence, setEvidence] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Assistant Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [initialQuestion, setInitialQuestion] = useState("");

  useEffect(() => {
    const url = `http://localhost:8000/projects/${projectId}/evidence${scanId ? `?scan_id=${scanId}` : ""}`;
    fetch(url)
      .then(res => { if (!res.ok) throw new Error(`API error ${res.status}`); return res.json(); })
      .then(data => setEvidence(data))
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
    const type = ev.evidence_type || "other";
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(ev);
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 relative">
      <div className="border-b border-[#A8B4C2]/15 pb-5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#60F1D0] shadow-[0_0_8px_#60F1D0]" />
          <h1 className="text-xl font-bold text-[#EAF0F6] tracking-wide">Raw Evidence Repository</h1>
        </div>
        <p className="text-xs text-[#A8B4C2] mt-1 font-mono">
          All discovery evidence records grouped by detection layer.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 text-sm text-[#A8B4C2] gap-2">
          <span className="w-2 h-2 rounded-full bg-[#60F1D0] animate-ping" />
          Loading evidence records…
        </div>
      )}

      {error && (
        <div className="text-xs text-[#FF7A90] p-4 bg-[#151C25] border border-[#FF7A90]/30 rounded-xl">
          {error}
        </div>
      )}

      {!loading && !error && evidence.length === 0 && (
        <div className="panel p-12 text-center text-[#A8B4C2] text-xs border-[#A8B4C2]/15 bg-[#151C25]/40">
          No evidence records found for this scan.
        </div>
      )}

      {Object.entries(grouped).map(([type, records]) => (
        <section key={type} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold font-mono text-[#EAF0F6] uppercase tracking-wider">
              {type.replace(/_/g, " ")}
            </h2>
            <span className="text-[11px] font-mono text-[#A8B4C2]">{records.length} records</span>
          </div>

          <div className="panel overflow-hidden border-[#A8B4C2]/15 bg-[#151C25]">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Source File</th>
                  <th>Line</th>
                  <th>Detector</th>
                  <th>Ask ECDAT / Context Prompts</th>
                  <th>Asset Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#A8B4C2]/10 text-xs">
                {records.map((ev) => (
                  <tr key={ev.id} className="hover:bg-[#1C2632] transition-colors">
                    <td className="px-4 py-3 font-mono text-[#EAF0F6]">{ev.file_path || ev.file || "—"}</td>
                    <td className="px-4 py-3 font-mono text-[#A8B4C2]">{ev.line_number || ev.line || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="badge badge-neutral font-mono text-[10px]">
                        {ev.detector || "AST"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => openAssistant(ev, "Explain the evidence snippet in plain language")}
                          className="px-2 py-0.5 rounded bg-[#60F1D0]/10 hover:bg-[#60F1D0]/20 border border-[#60F1D0]/30 text-[#60F1D0] text-[10px] font-mono transition-colors"
                        >
                          Explain snippet
                        </button>
                        <button
                          onClick={() => openAssistant(ev, "Preserve file/line provenance")}
                          className="px-2 py-0.5 rounded bg-[#1C2632] hover:bg-[#1C2632]/80 border border-[#A8B4C2]/15 text-[#A8B4C2] hover:text-[#EAF0F6] text-[10px] font-mono transition-colors"
                        >
                          File/line provenance
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {ev.crypto_asset_id || ev.asset_id ? (
                        <button
                          onClick={() => router.push(`/projects/${projectId}/findings/${ev.crypto_asset_id || ev.asset_id}`)}
                          className="font-mono text-xs text-[#60F1D0] hover:underline flex items-center gap-1"
                        >
                          <span>{(ev.crypto_asset_id || ev.asset_id).slice(0, 8)}…</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-[#A8B4C2]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {/* Assistant Drawer */}
      {drawerOpen && (
        <AssistantDrawer
          entityType="EVIDENCE"
          entityId={selectedRecord?.id}
          entityTitle={selectedRecord?.file ? `${selectedRecord.file}:${selectedRecord.line || ""}` : "Evidence Record"}
          initialQuestion={initialQuestion}
          scanId={scanId || undefined}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}

