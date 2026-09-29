"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Route, ShieldCheck, Database, Key, Bot } from "lucide-react";
import AssistantDrawer from "@/components/investigation/AssistantDrawer";

export default function CryptoPathsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const scanId = searchParams.get("scan_id");

  const [paths, setPaths] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Assistant Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<any>(null);
  const [initialQuestion, setInitialQuestion] = useState("");

  useEffect(() => {
    const url = `http://localhost:8000/projects/${projectId}/crypto-paths${scanId ? `?scan_id=${scanId}` : ""}`;
    fetch(url)
      .then(res => { if (!res.ok) throw new Error(`API error ${res.status}`); return res.json(); })
      .then(data => setPaths(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId, scanId]);

  const openAssistant = (path: any, question: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedPath(path);
    setInitialQuestion(question);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#A8B4C2]/15 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#8B7CFF] shadow-[0_0_8px_#8B7CFF]" />
            <h1 className="text-xl font-bold text-[#EAF0F6] tracking-wide">Crypto Paths</h1>
          </div>
          <p className="text-xs text-[#A8B4C2] mt-1 font-mono">
            Interprocedural traces connecting entrypoints, cryptographic assets, keys, and protected data.
          </p>
        </div>

        <Link
          href={`/projects/${projectId}/investigation`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#60F1D0]/15 text-[#60F1D0] border border-[#60F1D0]/30 hover:bg-[#60F1D0]/25 transition-all shadow-[0_0_12px_#60F1D015]"
        >
          <span>Spatial Graph View</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 text-sm text-[#A8B4C2] gap-2">
          <span className="w-2 h-2 rounded-full bg-[#8B7CFF] animate-ping" />
          Loading crypto paths…
        </div>
      )}

      {error && (
        <div className="text-xs text-[#FF7A90] p-4 bg-[#151C25] border border-[#FF7A90]/30 rounded-xl">
          {error}
        </div>
      )}

      {!loading && !error && paths.length === 0 && (
        <div className="panel p-12 text-center text-[#A8B4C2] text-xs border-[#A8B4C2]/15 bg-[#151C25]/40">
          No crypto paths discovered yet. Run a scan to populate paths.
        </div>
      )}

      {paths.length > 0 && (
        <div className="panel overflow-hidden border-[#A8B4C2]/15 bg-[#151C25]">
          <table className="data-table">
            <thead>
              <tr>
                <th>Path Identifier</th>
                <th>Entrypoint</th>
                <th>Ask ECDAT / Context Prompts</th>
                <th>Key Context</th>
                <th>Data Asset</th>
                <th>Source Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#A8B4C2]/10 text-xs">
              {paths.map((p) => (
                <tr 
                  key={p.id} 
                  className="hover:bg-[#1C2632] cursor-pointer transition-colors group" 
                  onClick={() => router.push(`/projects/${projectId}/findings/${p.crypto_asset_id}`)}
                >
                  <td className="px-4 py-3 font-mono font-semibold text-[#8B7CFF] group-hover:text-[#60F1D0]">
                    {p.path_id_name || "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#EAF0F6]">
                    <span className="px-2 py-0.5 rounded bg-[#1C2632] border border-[#A8B4C2]/15">
                      {p.entrypoint || "—"}
                    </span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={(e) => openAssistant(p, "Explain this path", e)}
                        className="px-2 py-0.5 rounded bg-[#60F1D0]/10 hover:bg-[#60F1D0]/20 border border-[#60F1D0]/30 text-[#60F1D0] text-[10px] font-mono transition-colors"
                      >
                        Explain
                      </button>
                      <button
                        onClick={(e) => openAssistant(p, "What does it protect?", e)}
                        className="px-2 py-0.5 rounded bg-[#1C2632] hover:bg-[#1C2632]/80 border border-[#A8B4C2]/15 text-[#A8B4C2] hover:text-[#EAF0F6] text-[10px] font-mono transition-colors"
                      >
                        What protects?
                      </button>
                      <button
                        onClick={(e) => openAssistant(p, "What evidence proves it ran?", e)}
                        className="px-2 py-0.5 rounded bg-[#1C2632] hover:bg-[#1C2632]/80 border border-[#A8B4C2]/15 text-[#A8B4C2] hover:text-[#EAF0F6] text-[10px] font-mono transition-colors"
                      >
                        Proves execution?
                      </button>
                      <button
                        onClick={(e) => openAssistant(p, "What is unknown?", e)}
                        className="px-2 py-0.5 rounded bg-[#1C2632] hover:bg-[#1C2632]/80 border border-[#A8B4C2]/15 text-[#FF7A90] hover:text-[#FF7A90]/80 text-[10px] font-mono transition-colors"
                      >
                        Unknowns?
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-[#EAF0F6]">
                    {p.key_context_id ? (
                      <span className="badge badge-warning">Linked</span>
                    ) : (
                      <span className="text-[#A8B4C2]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-[#EAF0F6]">
                    {p.data_asset_id ? (
                      <span className="badge badge-data">Linked</span>
                    ) : (
                      <span className="text-[#A8B4C2]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#A8B4C2] truncate max-w-xs">
                    {p.source_file || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assistant Drawer */}
      <AssistantDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        projectId={projectId}
        scanId={scanId || undefined}
        cryptoPathId={selectedPath?.id}
        entityType="PATH"
        entityId={selectedPath?.id}
        initialQuestion={initialQuestion}
      />
    </div>
  );
}

