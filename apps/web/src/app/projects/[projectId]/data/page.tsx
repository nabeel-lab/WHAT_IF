"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Database, ShieldCheck, Bot } from "lucide-react";
import AssistantDrawer from "@/components/investigation/AssistantDrawer";

export default function DataAssetsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const scanId = searchParams.get("scan_id");

  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Assistant Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [initialQuestion, setInitialQuestion] = useState("");

  useEffect(() => {
    const url = `http://localhost:8000/projects/${projectId}/data-assets${scanId ? `?scan_id=${scanId}` : ""}`;
    fetch(url)
      .then(res => { if (!res.ok) throw new Error(`API error ${res.status}`); return res.json(); })
      .then(data => setAssets(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId, scanId]);

  const openAssistant = (asset: any, question: string) => {
    setSelectedAsset(asset);
    setInitialQuestion(question);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 relative">
      <div className="border-b border-[#A8B4C2]/15 pb-5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#75B7FF] shadow-[0_0_8px_#75B7FF]" />
          <h1 className="text-xl font-bold text-[#EAF0F6] tracking-wide">Protected Data Assets</h1>
        </div>
        <p className="text-xs text-[#A8B4C2] mt-1 font-mono">
          Data classifications, confidentiality timelines, and harvest-now-decrypt-later exposure thresholds.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 text-sm text-[#A8B4C2] gap-2">
          <span className="w-2 h-2 rounded-full bg-[#75B7FF] animate-ping" />
          Loading data assets…
        </div>
      )}

      {error && (
        <div className="text-xs text-[#FF7A90] p-4 bg-[#151C25] border border-[#FF7A90]/30 rounded-xl">
          {error}
        </div>
      )}

      {!loading && !error && assets.length === 0 && (
        <div className="panel p-12 text-center text-[#A8B4C2] text-xs border-[#A8B4C2]/15 bg-[#151C25]/40">
          No data assets mapped. Declare <code>data_catalog.json</code> in your repository to enrich cryptographic context.
        </div>
      )}

      {assets.length > 0 && (
        <div className="panel overflow-hidden border-[#A8B4C2]/15 bg-[#151C25]">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data Asset Name</th>
                <th>Sensitivity Tier</th>
                <th>Required Confidentiality Until</th>
                <th>Ask ECDAT / Context Prompts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#A8B4C2]/10 text-xs">
              {assets.map((a) => (
                <tr key={a.id} className="hover:bg-[#1C2632] transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-[#75B7FF]">{a.name}</td>
                  <td className="px-4 py-3">
                    <span className="badge badge-data uppercase font-mono">
                      {a.sensitivity || "RESTRICTED"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[#FF7A90] font-medium">
                    {a.required_confidentiality_until || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => openAssistant(a, "Explain sensitivity")}
                        className="px-2 py-0.5 rounded bg-[#60F1D0]/10 hover:bg-[#60F1D0]/20 border border-[#60F1D0]/30 text-[#60F1D0] text-[10px] font-mono transition-colors"
                      >
                        Sensitivity
                      </button>
                      <button
                        onClick={() => openAssistant(a, "Explain protection horizon")}
                        className="px-2 py-0.5 rounded bg-[#1C2632] hover:bg-[#1C2632]/80 border border-[#A8B4C2]/15 text-[#A8B4C2] hover:text-[#EAF0F6] text-[10px] font-mono transition-colors"
                      >
                        Protection horizon
                      </button>
                      <button
                        onClick={() => openAssistant(a, "Explain which crypto paths protect it")}
                        className="px-2 py-0.5 rounded bg-[#1C2632] hover:bg-[#1C2632]/80 border border-[#A8B4C2]/15 text-[#A8B4C2] hover:text-[#EAF0F6] text-[10px] font-mono transition-colors"
                      >
                        Which paths protect?
                      </button>
                      <button
                        onClick={() => openAssistant(a, "Explain why retention matters")}
                        className="px-2 py-0.5 rounded bg-[#1C2632] hover:bg-[#1C2632]/80 border border-[#A8B4C2]/15 text-[#8B7CFF] hover:text-[#8B7CFF]/80 text-[10px] font-mono transition-colors"
                      >
                        Why retention matters?
                      </button>
                    </div>
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
          entityType="DATA_ASSET"
          entityId={selectedAsset?.id}
          entityTitle={selectedAsset?.name || "Data Asset"}
          initialQuestion={initialQuestion}
          scanId={scanId || undefined}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}

