"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Lock, ArrowRight, Route, Bot } from "lucide-react";
import AssistantDrawer from "@/components/investigation/AssistantDrawer";

export default function ControlsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const scanId = searchParams.get("scan_id");

  const [controls, setControls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Assistant Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedControl, setSelectedControl] = useState<any>(null);
  const [initialQuestion, setInitialQuestion] = useState("");

  useEffect(() => {
    fetch(`http://localhost:8000/projects/${projectId}/controls`)
      .then(res => { if (!res.ok) throw new Error(`API error ${res.status}`); return res.json(); })
      .then(data => setControls(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  const openAssistant = (control: any, question: string) => {
    setSelectedControl(control);
    setInitialQuestion(question);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 relative">
      <div className="border-b border-[#A8B4C2]/15 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#60F1D0] shadow-[0_0_8px_#60F1D0]" />
            <h1 className="text-xl font-bold text-[#EAF0F6] tracking-wide">Cryptographic Controls</h1>
          </div>
          <p className="text-xs text-[#A8B4C2] mt-1 font-mono">
            Security controls, key encapsulation policies, and algorithmic enforcement parameters per asset.
          </p>
        </div>

        <button
          onClick={() => router.push(`/projects/${projectId}/investigation`)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#60F1D0]/15 text-[#60F1D0] border border-[#60F1D0]/30 hover:bg-[#60F1D0]/25 transition-all shadow-[0_0_12px_#60F1D015]"
        >
          <Route className="w-3.5 h-3.5" />
          <span>Spatial Graph View</span>
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 text-sm text-[#A8B4C2] gap-2">
          <span className="w-2 h-2 rounded-full bg-[#60F1D0] animate-ping" />
          Loading cryptographic controls…
        </div>
      )}

      {error && (
        <div className="text-xs text-[#FF7A90] p-4 bg-[#151C25] border border-[#FF7A90]/30 rounded-xl">
          {error}
        </div>
      )}

      {!loading && !error && controls.length === 0 && (
        <div className="panel p-12 text-center text-[#A8B4C2] text-xs border-[#A8B4C2]/15 bg-[#151C25]/40">
          No controls discovered in active scan baseline.
        </div>
      )}

      {controls.length > 0 && (
        <div className="panel overflow-hidden border-[#A8B4C2]/15 bg-[#151C25]">
          <table className="data-table">
            <thead>
              <tr>
                <th>Control Name</th>
                <th>Target Crypto Asset</th>
                <th>Enforcement Status</th>
                <th>Ask ECDAT / Context Prompts</th>
                <th>Investigation Path</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#A8B4C2]/10 text-xs">
              {controls.map((c) => (
                <tr key={c.id} className="hover:bg-[#1C2632] transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-[#EAF0F6]">
                    {c.control_name || c.control_type || "Crypto Control"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        if (c.crypto_asset_id) router.push(`/projects/${projectId}/findings/${c.crypto_asset_id}`);
                      }}
                      className="font-mono text-xs text-[#60F1D0] hover:underline flex items-center gap-1"
                    >
                      <span>{c.crypto_asset_id?.slice(0, 8)}…</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                      c.control_state === "PRESENT" || c.status === "PRESENT"
                        ? "bg-[#60F1D0]/15 text-[#60F1D0] border border-[#60F1D0]/30"
                        : "bg-[#FF7A90]/15 text-[#FF7A90] border border-[#FF7A90]/30"
                    }`}>
                      {c.control_state || c.status || "UNKNOWN"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => openAssistant(c, "Explain why this control is present")}
                        className="px-2 py-0.5 rounded bg-[#60F1D0]/10 hover:bg-[#60F1D0]/20 border border-[#60F1D0]/30 text-[#60F1D0] text-[10px] font-mono transition-colors"
                      >
                        Why present?
                      </button>
                      <button
                        onClick={() => openAssistant(c, "Show supporting path/evidence")}
                        className="px-2 py-0.5 rounded bg-[#1C2632] hover:bg-[#1C2632]/80 border border-[#A8B4C2]/15 text-[#A8B4C2] hover:text-[#EAF0F6] text-[10px] font-mono transition-colors"
                      >
                        Supporting evidence
                      </button>
                      <button
                        onClick={() => openAssistant(c, "Explain expected effect")}
                        className="px-2 py-0.5 rounded bg-[#1C2632] hover:bg-[#1C2632]/80 border border-[#A8B4C2]/15 text-[#8B7CFF] hover:text-[#8B7CFF]/80 text-[10px] font-mono transition-colors"
                      >
                        Expected effect
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => router.push(`/projects/${projectId}/investigation`)}
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-[#8B7CFF] hover:underline"
                    >
                      <span>Explore Trail</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assistant Drawer */}
      {drawerOpen && (
        <AssistantDrawer
          entityType="CONTROL"
          entityId={selectedControl?.id}
          entityTitle={selectedControl?.control_name || "Crypto Control"}
          initialQuestion={initialQuestion}
          scanId={scanId || undefined}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}

