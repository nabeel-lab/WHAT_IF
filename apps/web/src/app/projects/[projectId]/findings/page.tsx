"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Activity, Search, AlertCircle, FileCode, Bot, HelpCircle } from "lucide-react";
import AssistantDrawer from "@/components/investigation/AssistantDrawer";

export default function FindingsList() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const scanId = searchParams.get("scan_id");

  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Assistant Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [initialQuestion, setInitialQuestion] = useState("");

  useEffect(() => {
    const url = `http://localhost:8000/projects/${projectId}/findings${scanId ? `?scan_id=${scanId}` : ""}`;
    fetch(url)
      .then(res => { if (!res.ok) throw new Error(`API error ${res.status}`); return res.json(); })
      .then(data => setFindings(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId, scanId]);

  const openAssistant = (finding: any, question: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedEntity(finding);
    setInitialQuestion(question);
    setDrawerOpen(true);
  };

  const getReachabilityBadge = (agg: any) => {
    const r = agg.reachability;
    if (!r) return <span className="badge badge-unknown">UNKNOWN</span>;
    if (r.status === "REACHABLE") {
      return (
        <span className="badge badge-analysis">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8B7CFF] mr-1" />
          REACHABLE
        </span>
      );
    }
    if (r.status === "UNREACHABLE") {
      return <span className="badge badge-neutral">UNREACHABLE</span>;
    }
    return <span className="badge badge-unknown">{r.status}</span>;
  };

  const getRuntimeBadge = (agg: any) => {
    if (!agg.runtime || agg.runtime.length === 0) {
      return <span className="badge badge-neutral">NOT OBSERVED</span>;
    }
    return (
      <span className="badge badge-success">
        <span className="w-1.5 h-1.5 rounded-full bg-[#60F1D0] mr-1" />
        OBSERVED
      </span>
    );
  };

  const getConfigBadge = (agg: any) => {
    if (agg.mismatch) {
      return (
        <span className="badge badge-danger">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF7A90] mr-1" />
          MISMATCH
        </span>
      );
    }
    if (agg.config_declared) {
      return <span className="badge badge-neutral">DECLARED</span>;
    }
    return <span className="badge badge-unknown">UNKNOWN</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[#A8B4C2] gap-2">
        <span className="w-2 h-2 rounded-full bg-[#60F1D0] animate-ping" />
        Loading cryptographic inventory…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 relative">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#A8B4C2]/15 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#60F1D0] shadow-[0_0_8px_#60F1D0]" />
            <h1 className="text-xl font-bold text-[#EAF0F6] tracking-wide">Cryptographic Inventory</h1>
          </div>
          <p className="text-xs text-[#A8B4C2] mt-1">
            Normalized logical cryptographic assets with static reachability, runtime observation, and config declarations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#A8B4C2] px-3 py-1 rounded-full bg-[#151C25] border border-[#A8B4C2]/15">
            <span className="text-[#60F1D0] font-semibold">{findings.length}</span> Canonical Assets
          </span>
          <Link
            href={`/projects/${projectId}/investigation`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#60F1D0]/15 text-[#60F1D0] border border-[#60F1D0]/30 hover:bg-[#60F1D0]/25 transition-all shadow-[0_0_10px_#60F1D015]"
          >
            <span>Graph View</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {error && (
        <div className="text-xs text-[#FF7A90] p-4 bg-[#151C25] border border-[#FF7A90]/30 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Unable to load findings: {error}
        </div>
      )}

      {/* Inventory Table Container */}
      <div className="panel overflow-hidden border-[#A8B4C2]/15 bg-[#151C25]">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-1/4">Cryptographic Asset</th>
              <th>Primitive / Role</th>
              <th>Static Reachability</th>
              <th>Runtime Observation</th>
              <th>Config State</th>
              <th>Ask ECDAT / Context Prompts</th>
              <th className="text-right">Evidence Trail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#A8B4C2]/10 text-xs">
            {findings.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-[#A8B4C2]">
                  No cryptographic findings discovered in this scan.
                </td>
              </tr>
            ) : (
              findings.map((agg, idx) => {
                const f = agg.finding;
                const pathCount = agg.crypto_paths?.length || 0;

                return (
                  <tr
                    key={f?.id || idx}
                    className="cursor-pointer hover:bg-[#1C2632] transition-colors group"
                    onClick={() => router.push(`/projects/${projectId}/findings/${f?.id}`)}
                  >
                    <td className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-[#60F1D0] group-hover:text-[#60F1D0] transition-colors">
                          {f?.name || f?.algorithm || "Unknown"}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#A8B4C2] font-mono mt-0.5">
                        {f?.asset_type}
                      </div>
                    </td>

                    <td>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-[#1C2632] border border-[#A8B4C2]/15 text-[#EAF0F6]">
                        {f?.role || "—"}
                      </span>
                    </td>

                    <td>{getReachabilityBadge(agg)}</td>
                    <td>{getRuntimeBadge(agg)}</td>
                    <td>{getConfigBadge(agg)}</td>

                    {/* Contextual Ask ECDAT Actions */}
                    <td>
                      <div className="flex flex-wrap items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={(e) => openAssistant(f, "Explain this finding", e)}
                          className="px-2 py-0.5 rounded bg-[#60F1D0]/10 hover:bg-[#60F1D0]/20 border border-[#60F1D0]/30 text-[#60F1D0] text-[10px] font-mono transition-colors"
                        >
                          Explain
                        </button>
                        <button
                          onClick={(e) => openAssistant(f, "Why was it detected?", e)}
                          className="px-2 py-0.5 rounded bg-[#1C2632] hover:bg-[#1C2632]/80 border border-[#A8B4C2]/15 text-[#A8B4C2] hover:text-[#EAF0F6] text-[10px] font-mono transition-colors"
                        >
                          Why detected?
                        </button>
                        <button
                          onClick={(e) => openAssistant(f, "Where was it found?", e)}
                          className="px-2 py-0.5 rounded bg-[#1C2632] hover:bg-[#1C2632]/80 border border-[#A8B4C2]/15 text-[#A8B4C2] hover:text-[#EAF0F6] text-[10px] font-mono transition-colors"
                        >
                          Where found?
                        </button>
                        <button
                          onClick={(e) => openAssistant(f, "Show source evidence", e)}
                          className="px-2 py-0.5 rounded bg-[#1C2632] hover:bg-[#1C2632]/80 border border-[#A8B4C2]/15 text-[#8B7CFF] hover:text-[#8B7CFF]/80 text-[10px] font-mono transition-colors"
                        >
                          Source evidence
                        </button>
                      </div>
                    </td>

                    <td className="text-right">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#A8B4C2] group-hover:text-[#60F1D0] transition-colors">
                        <span>{agg.evidence_count || 0} records</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Assistant Drawer */}
      {drawerOpen && (
        <AssistantDrawer
          entityType="FINDING"
          entityId={selectedEntity?.id}
          entityTitle={selectedEntity?.name || selectedEntity?.algorithm || "Crypto Finding"}
          initialQuestion={initialQuestion}
          scanId={scanId || undefined}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}

