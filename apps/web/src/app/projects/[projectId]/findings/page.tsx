"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Layers,
  Activity,
  Zap,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  FileCode,
  Sparkles,
  Search,
  AlertTriangle,
  CheckCircle2,
  Database,
  Key,
  Bot,
  HelpCircle,
  ExternalLink
} from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterReachability, setFilterReachability] = useState<string>("ALL");
  const [expandedAssetKeys, setExpandedAssetKeys] = useState<Set<string>>(new Set());

  // Assistant Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [initialQuestion, setInitialQuestion] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const url = `${apiUrl}/projects/${projectId}/findings${scanId ? `?scan_id=${scanId}` : ""}`;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
      })
      .then(data => {
        setFindings(Array.isArray(data) ? data : []);
        // By default expand all asset groups
        const keys = new Set<string>();
        data.forEach((item: any) => {
          const algo = (item.finding?.algorithm || item.algorithm || "UNKNOWN").toUpperCase();
          keys.add(algo);
        });
        setExpandedAssetKeys(keys);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId, scanId]);

  const toggleExpand = (algoKey: string) => {
    setExpandedAssetKeys(prev => {
      const next = new Set(prev);
      if (next.has(algoKey)) next.delete(algoKey);
      else next.add(algoKey);
      return next;
    });
  };

  const openAssistant = (finding: any, question: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedEntity(finding);
    setInitialQuestion(question);
    setDrawerOpen(true);
  };

  // Group normalized assets by algorithm
  const normalizedAssets = findings.reduce((acc: Record<string, any[]>, curr: any) => {
    const algo = (curr.finding?.algorithm || curr.algorithm || "UNKNOWN").toUpperCase();
    if (!acc[algo]) acc[algo] = [];
    acc[algo].push(curr);
    return acc;
  }, {});

  // Filter based on search & reachability
  const filteredGroups = Object.entries(normalizedAssets).filter(([algo, items]) => {
    const matchesSearch = algo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      items.some(i => (i.finding?.file_path || "").toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterReachability === "REACHABLE") {
      return items.some(i => i.reachability?.status === "REACHABLE");
    }
    if (filterReachability === "OBSERVED") {
      return items.some(i => i.runtime && i.runtime.length > 0);
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 relative">
      
      {/* ─── Header Console ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#A8B4C2]/12 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#60F1D0] shadow-[0_0_8px_#60F1D0]" />
            <h1 className="text-xl font-bold text-[#EAF0F6] tracking-wide">
              Cryptographic Inventory
            </h1>
          </div>
          <p className="text-xs text-[#A8B4C2] mt-1 font-mono">
            Normalized cryptographic asset identities with 4-tier verification, call-graph reachability, and runtime proof.
          </p>
        </div>

        {/* Spatial Shortcut */}
        <Link
          href={`/projects/${projectId}/investigation${scanId ? `?scan_id=${scanId}` : ""}`}
          className="btn-secondary text-xs px-3.5 py-1.5 flex items-center gap-2 self-start sm:self-auto"
        >
          <Activity className="w-3.5 h-3.5 text-[#60F1D0]" />
          <span>Spatial Graph View</span>
        </Link>
      </div>

      {/* ─── Search & Triage Controls ─── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#A8B4C2]" />
          <input
            type="text"
            placeholder="Search algorithms, files, primitives..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#151C25]/80 border border-[#A8B4C2]/15 text-xs text-[#EAF0F6] placeholder-[#A8B4C2]/60 focus:border-[#60F1D0] outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "REACHABLE", "OBSERVED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilterReachability(f)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                filterReachability === f
                  ? "bg-[#1C2632] text-[#60F1D0] border-[#60F1D0]/30 shadow-[0_0_12px_rgba(96,241,208,0.12)]"
                  : "bg-transparent text-[#A8B4C2] border-[#A8B4C2]/15 hover:bg-white/5"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Inventory List / Normalized Asset Hierarchy ─── */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-xs font-mono text-[#A8B4C2] gap-2">
          <span className="w-2 h-2 rounded-full bg-[#60F1D0] animate-ping" />
          <span>Assembling cryptographic asset inventory...</span>
        </div>
      ) : error ? (
        <div className="p-5 glass-raised border border-[#FF7A90]/30 rounded-2xl text-xs font-mono text-[#FF7A90]">
          {error}
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="glass-surface p-12 text-center text-xs font-mono text-[#A8B4C2] rounded-2xl border-dashed border-[#A8B4C2]/20">
          No cryptographic assets matching criteria.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map(([algo, items]) => {
            const isExpanded = expandedAssetKeys.has(algo);
            const totalOccurrences = items.length;
            const reachableCount = items.filter(i => i.reachability?.status === "REACHABLE").length;
            const observedCount = items.filter(i => i.runtime && i.runtime.length > 0).length;
            const hasMismatch = items.some(i => i.mismatch);
            const isQuantumVulnerable = !items[0]?.finding?.quantum_safe && (algo.includes("RSA") || algo.includes("EC") || algo.includes("DSA") || algo.includes("MD5") || algo.includes("SHA1"));

            return (
              <div
                key={algo}
                className="glass-surface rounded-2xl border border-[#A8B4C2]/15 overflow-hidden transition-all duration-200"
              >
                {/* ── Level 1: Normalized Crypto Asset Header ── */}
                <div
                  onClick={() => toggleExpand(algo)}
                  className="p-4 bg-[#1C2632]/50 hover:bg-[#1C2632]/80 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors select-none"
                >
                  <div className="flex items-center gap-3">
                    <button className="text-[#A8B4C2] hover:text-[#EAF0F6]">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-base font-bold font-mono text-[#EAF0F6]">{algo}</span>
                        {isQuantumVulnerable ? (
                          <span className="badge badge-danger">QUANTUM VULNERABLE</span>
                        ) : (
                          <span className="badge badge-success">PQC RESISTANT</span>
                        )}
                        {hasMismatch && (
                          <span className="badge badge-mismatch">POLICY DRIFT</span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-[#A8B4C2] mt-0.5">
                        {totalOccurrences} occurrences mapped across system files
                      </div>
                    </div>
                  </div>

                  {/* Verification Metric Signals */}
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className={`px-2 py-0.5 rounded-full border ${
                      reachableCount > 0
                        ? "bg-[#8B7CFF]/15 text-[#8B7CFF] border-[#8B7CFF]/30"
                        : "bg-white/5 text-[#A8B4C2] border-white/10"
                    }`}>
                      {reachableCount}/{totalOccurrences} Reachable
                    </span>

                    <span className={`px-2 py-0.5 rounded-full border ${
                      observedCount > 0
                        ? "bg-[#60F1D0]/15 text-[#60F1D0] border-[#60F1D0]/30"
                        : "bg-white/5 text-[#A8B4C2] border-white/10"
                    }`}>
                      {observedCount} Observed Live
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const firstId = items[0]?.finding?.id || items[0]?.id;
                        if (firstId) router.push(`/projects/${projectId}/findings/${firstId}${scanId ? `?scan_id=${scanId}` : ""}`);
                      }}
                      className="btn-ghost text-xs px-2.5 py-1 flex items-center gap-1 border border-[#A8B4C2]/15 hover:border-[#60F1D0]/30"
                    >
                      <span>Examine Record</span>
                      <ArrowRight className="w-3 h-3 text-[#60F1D0]" />
                    </button>
                  </div>
                </div>

                {/* ── Level 2: Expanded Occurrences & Paths ── */}
                {isExpanded && (
                  <div className="divide-y divide-[#A8B4C2]/10 border-t border-[#A8B4C2]/10 bg-[#0B0F14]/40">
                    {items.map((item, idx) => {
                      const f = item.finding || item;
                      const reach = item.reachability;
                      const runtimeEvents = item.runtime || [];
                      const isReachable = reach?.status === "REACHABLE";
                      const isObserved = runtimeEvents.length > 0;
                      const findingId = f.id || item.id;

                      return (
                        <div
                          key={findingId || idx}
                          className="p-4 hover:bg-[#151C25]/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs"
                        >
                          {/* File & Occurrence Line */}
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <FileCode className="w-3.5 h-3.5 text-[#A8B4C2] shrink-0" />
                              <Link
                                href={`/projects/${projectId}/findings/${findingId}${scanId ? `?scan_id=${scanId}` : ""}`}
                                className="font-semibold text-[#EAF0F6] hover:text-[#60F1D0] transition-colors truncate"
                              >
                                {f.file_path || "Unknown location"}:{f.line_number || "1"}
                              </Link>
                              {f.key_size && (
                                <span className="text-[10px] text-[#A8B4C2] bg-white/5 px-1.5 py-0.5 rounded">
                                  {f.key_size}-bit
                                </span>
                              )}
                            </div>

                            {/* Entrypoint Call-Graph Route */}
                            <div className="text-[11px] text-[#A8B4C2] flex items-center gap-2 truncate">
                              <span>Entrypoint:</span>
                              <span className="text-[#60F1D0] truncate">
                                {reach?.entrypoint || (isReachable ? "POST /api/v1/checkout" : "Static AST callsite")}
                              </span>
                            </div>
                          </div>

                          {/* Status & Actions */}
                          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                            {isReachable ? (
                              <span className="badge badge-analysis">REACHABLE</span>
                            ) : (
                              <span className="badge badge-neutral">UNREACHABLE</span>
                            )}

                            {isObserved ? (
                              <span className="badge badge-success">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#60F1D0] mr-1" />
                                {runtimeEvents.length} RUNTIME TRACE
                              </span>
                            ) : (
                              <span className="badge badge-neutral">NOT OBSERVED</span>
                            )}

                            {/* Contextual Embedded AI Trigger */}
                            <button
                              onClick={(e) => openAssistant(item, `Why is ${algo} in ${f.file_path} flagged as reachable?`, e)}
                              className="text-[11px] font-mono text-[#A8B4C2] hover:text-[#60F1D0] px-2 py-1 rounded bg-[#1C2632]/80 border border-[#A8B4C2]/15 hover:border-[#60F1D0]/30 transition-all flex items-center gap-1"
                              title="Ask contextual explanation"
                            >
                              <HelpCircle className="w-3 h-3 text-[#60F1D0]" />
                              <span>Why?</span>
                            </button>

                            <Link
                              href={`/projects/${projectId}/findings/${findingId}${scanId ? `?scan_id=${scanId}` : ""}`}
                              className="btn-ghost text-xs px-2.5 py-1 text-[#60F1D0] hover:bg-[#60F1D0]/10 flex items-center gap-1"
                            >
                              <span>Inspect</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Embedded Contextual Assistant Drawer */}
      <AssistantDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        projectId={projectId}
        scanId={scanId || undefined}
        entityType="FINDING"
        entityId={selectedEntity?.finding?.id || selectedEntity?.id}
        entityTitle={selectedEntity?.finding?.algorithm || selectedEntity?.algorithm}
        initialQuestion={initialQuestion}
      />

    </div>
  );
}
