"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Key, Bot } from "lucide-react";
import AssistantDrawer from "@/components/investigation/AssistantDrawer";

export default function KeysPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const scanId = searchParams.get("scan_id");

  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Assistant Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<any>(null);
  const [initialQuestion, setInitialQuestion] = useState("");

  useEffect(() => {
    const url = `http://localhost:8000/projects/${projectId}/keys${scanId ? `?scan_id=${scanId}` : ""}`;
    fetch(url)
      .then(res => { if (!res.ok) throw new Error(`API error ${res.status}`); return res.json(); })
      .then(data => setKeys(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId, scanId]);

  const openAssistant = (keyObj: any, question: string) => {
    setSelectedKey(keyObj);
    setInitialQuestion(question);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 relative">
      <div className="border-b border-[#A8B4C2]/15 pb-5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#FFBF72] shadow-[0_0_8px_#FFBF72]" />
          <h1 className="text-xl font-bold text-[#EAF0F6] tracking-wide">Key Context Inventory</h1>
        </div>
        <p className="text-xs text-[#A8B4C2] mt-1 font-mono">
          Cryptographic key metadata, KMS IDs, and rotation states. No private key material is stored or exposed.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 text-sm text-[#A8B4C2] gap-2">
          <span className="w-2 h-2 rounded-full bg-[#FFBF72] animate-ping" />
          Loading key inventory…
        </div>
      )}

      {error && (
        <div className="text-xs text-[#FF7A90] p-4 bg-[#151C25] border border-[#FF7A90]/30 rounded-xl">
          {error}
        </div>
      )}

      {!loading && !error && keys.length === 0 && (
        <div className="panel p-12 text-center text-[#A8B4C2] text-xs border-[#A8B4C2]/15 bg-[#151C25]/40">
          No key metadata found. Add a <code>key_metadata.json</code> to your repository and rescan.
        </div>
      )}

      {keys.length > 0 && (
        <div className="panel overflow-hidden border-[#A8B4C2]/15 bg-[#151C25]">
          <table className="data-table">
            <thead>
              <tr>
                <th>Key Context ID</th>
                <th>Key Management Type</th>
                <th>Associated Algorithm</th>
                <th>Rotation Status</th>
                <th>Ask ECDAT / Context Prompts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#A8B4C2]/10 text-xs">
              {keys.map((k) => (
                <tr key={k.id} className="hover:bg-[#1C2632] transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-[#FFBF72]">{k.key_id_name}</td>
                  <td className="px-4 py-3 font-mono text-[#EAF0F6]">{k.key_type || "—"}</td>
                  <td className="px-4 py-3 font-mono text-[#60F1D0]">{k.algorithm || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="badge badge-warning uppercase font-mono">
                      {k.rotation_state || "DECLARED"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => openAssistant(k, "Explain scope")}
                        className="px-2 py-0.5 rounded bg-[#60F1D0]/10 hover:bg-[#60F1D0]/20 border border-[#60F1D0]/30 text-[#60F1D0] text-[10px] font-mono transition-colors"
                      >
                        Explain scope
                      </button>
                      <button
                        onClick={() => openAssistant(k, "Explain rotation")}
                        className="px-2 py-0.5 rounded bg-[#1C2632] hover:bg-[#1C2632]/80 border border-[#A8B4C2]/15 text-[#A8B4C2] hover:text-[#EAF0F6] text-[10px] font-mono transition-colors"
                      >
                        Explain rotation
                      </button>
                      <button
                        onClick={() => openAssistant(k, "Explain related paths")}
                        className="px-2 py-0.5 rounded bg-[#1C2632] hover:bg-[#1C2632]/80 border border-[#A8B4C2]/15 text-[#A8B4C2] hover:text-[#EAF0F6] text-[10px] font-mono transition-colors"
                      >
                        Related paths
                      </button>
                      <button
                        onClick={() => openAssistant(k, "Explain blast radius")}
                        className="px-2 py-0.5 rounded bg-[#1C2632] hover:bg-[#1C2632]/80 border border-[#A8B4C2]/15 text-[#FF7A90] hover:text-[#FF7A90]/80 text-[10px] font-mono transition-colors"
                      >
                        Blast radius
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
          entityType="KEY_CONTEXT"
          entityId={selectedKey?.id}
          entityTitle={selectedKey?.key_id_name || "Key Context"}
          initialQuestion={initialQuestion}
          scanId={scanId || undefined}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}

