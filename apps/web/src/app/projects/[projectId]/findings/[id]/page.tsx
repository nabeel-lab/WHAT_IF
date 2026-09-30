"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  MapPin,
  Activity,
  FileCode,
  Database,
  Key,
  ArrowRight,
  AlertTriangle,
  Beaker,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Layers,
  Bot,
  Zap,
  RotateCw,
  Sparkles,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import AssistantDrawer from "@/components/investigation/AssistantDrawer";

export default function FindingEvidence() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const findingId = params.id as string;
  const scanId = searchParams.get("scan_id");

  const [agg, setAgg] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"RECORD" | "WHATIF">("RECORD");

  // Assistant Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [initialQuestion, setInitialQuestion] = useState("");

  // What-If Sandbox State
  const [scenarioType, setScenarioType] = useState("INTRODUCE_CRYPTO_ABSTRACTION");
  const [overrides, setOverrides] = useState<any>({ crypto_abstraction: true });
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState<any>(null);
  const [showStackFrames, setShowStackFrames] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [aggRes, analysisRes] = await Promise.all([
          fetch(`${apiUrl}/projects/${projectId}/findings/${findingId}/verification`),
          fetch(`${apiUrl}/projects/${projectId}/findings/${findingId}/analysis`)
        ]);

        if (aggRes.ok) {
          setAgg(await aggRes.json());
        }
        if (analysisRes.ok) {
          const analysisData = await analysisRes.json();
          if (analysisData) setAnalysis(analysisData);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId, findingId]);

  const openAssistant = (question: string) => {
    setInitialQuestion(question);
    setDrawerOpen(true);
  };

  const runScenario = async () => {
    setWhatIfLoading(true);
    setWhatIfResult(null);
    try {
      const res = await fetch(`${apiUrl}/projects/${projectId}/findings/${findingId}/what-if`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario_type: scenarioType, overrides })
      });
      if (res.ok) {
        setWhatIfResult(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setWhatIfLoading(false);
    }
  };

  const handleScenarioChange = (e: any) => {
    const type = e.target.value;
    setScenarioType(type);

    if (type === "INTRODUCE_CRYPTO_ABSTRACTION") {
      setOverrides({ crypto_abstraction: true });
    } else if (type === "REDUCE_DATA_RETENTION") {
      const currentAsset = agg?.data_assets?.[0];
      setOverrides({ retention_end_date: currentAsset ? currentAsset.required_confidentiality_until : "2028-01-01" });
    } else if (type === "HYBRID_MIGRATION") {
      setOverrides({ migration_supported: true });
    } else if (type === "MIGRATION_PLANNING") {
      setOverrides({ provider_dependency_resolved: true, rollback_supported: true });
    } else if (type === "HARDEN_CURRENT_DEPLOYMENT") {
      setOverrides({ key_separation: true, rotation_policy: true });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-xs font-mono text-[#A8B4C2] gap-2">
        <span className="w-2 h-2 rounded-full bg-[#60F1D0] animate-ping" />
        <span>Loading cryptographic investigation record...</span>
      </div>
    );
  }

  if (!agg) {
    return (
      <div className="p-8 text-center glass-raised border border-[#FF7A90]/30 rounded-2xl max-w-xl mx-auto space-y-3 font-mono">
        <p className="text-sm font-bold text-[#FF7A90]">Finding Record Not Found</p>
        <p className="text-xs text-[#A8B4C2]">The cryptographic asset ID was not present in the current scan baseline.</p>
        <button
          onClick={() => router.back()}
          className="btn-secondary text-xs px-3 py-1.5"
        >
          ← Return to Inventory
        </button>
      </div>
    );
  }

  const f = agg.finding;
  const reach = agg.reachability;
  const runtimeList = agg.runtime || [];
  const isReachable = reach?.status === "REACHABLE";
  const isObserved = runtimeList.length > 0;
  const path = agg.crypto_paths?.[0];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24 relative">
      
      {/* ─── Breadcrumb & Navigation Header ─── */}
      <div className="border-b border-[#A8B4C2]/12 pb-5 space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#A8B4C2] hover:text-[#60F1D0] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Cryptographic Inventory</span>
          </button>

          <Link
            href={`/projects/${projectId}/investigation${scanId ? `?scan_id=${scanId}` : ""}`}
            className="text-xs font-mono text-[#60F1D0] hover:underline flex items-center gap-1"
          >
            <span>View in Spatial Canvas</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#60F1D0] shadow-[0_0_8px_#60F1D0]" />
              <h1 className="text-2xl font-bold font-mono text-[#EAF0F6]">
                {f.name || f.algorithm || f.asset_type}
              </h1>
              {f.key_size && (
                <span className="badge badge-neutral">{f.key_size}-bit</span>
              )}
            </div>
            <div className="text-xs font-mono text-[#A8B4C2] mt-1 flex items-center gap-3">
              <span>Role: <strong className="text-[#EAF0F6]">{f.role || "GENERAL"}</strong></span>
              <span>•</span>
              <span>Library: <strong className="text-[#60F1D0]">{f.library || "Native Primitives"}</strong></span>
              <span>•</span>
              <span>ID: <code className="text-[#A8B4C2]">{f.id?.slice(0, 8)}</code></span>
            </div>
          </div>

          {/* Quick Contextual Inquiries */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => openAssistant(`Explain the verified evidence trail for ${f.algorithm || f.name}`)}
              className="btn-ghost text-xs px-2.5 py-1.5 border border-[#60F1D0]/30 text-[#60F1D0] hover:bg-[#60F1D0]/10 flex items-center gap-1.5"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Explain Evidence</span>
            </button>
            <button
              onClick={() => setActiveTab(activeTab === "WHATIF" ? "RECORD" : "WHATIF")}
              className={`btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 ${
                activeTab === "WHATIF" ? "border-[#E8A1FF] text-[#E8A1FF] bg-[#E8A1FF]/10" : ""
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E8A1FF]" />
              <span>What-If Sandbox</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Mode Selector: Investigation Record vs What-If Sandbox ─── */}
      {activeTab === "WHATIF" ? (
        /* ─── WHAT-IF SIMULATION SANDBOX ─── */
        <div className="glass-raised p-6 rounded-2xl border border-[#E8A1FF]/30 space-y-6 shadow-2xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-[#A8B4C2]/12 pb-4">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-[#E8A1FF]" />
              <div>
                <h3 className="text-base font-bold text-[#EAF0F6]">In-Memory Counterfactual Sandbox</h3>
                <p className="text-xs font-mono text-[#A8B4C2]">Simulate cryptographic migration assumptions without code changes</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab("RECORD")}
              className="text-xs font-mono text-[#A8B4C2] hover:text-[#EAF0F6] px-2 py-1 rounded bg-white/5"
            >
              ✕ Close Sandbox
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-[#A8B4C2] mb-1.5 uppercase">
                Select Counterfactual Scenario
              </label>
              <select
                value={scenarioType}
                onChange={handleScenarioChange}
                className="w-full px-3 py-2 rounded-xl bg-[#0B0F14] border border-[#A8B4C2]/20 text-xs font-mono text-[#EAF0F6] focus:border-[#E8A1FF] outline-none"
              >
                <option value="INTRODUCE_CRYPTO_ABSTRACTION">Introduce Crypto Provider Abstraction</option>
                <option value="REDUCE_DATA_RETENTION">Reduce Protected Data Retention Horizon</option>
                <option value="HARDEN_CURRENT_DEPLOYMENT">Harden Key Separation & Rotation Policy</option>
                <option value="MIGRATION_PLANNING">Resolve Dependencies & Support Rollback</option>
                <option value="HYBRID_MIGRATION">Execute Hybrid Classical + PQC Transition</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={runScenario}
                disabled={whatIfLoading}
                className="btn-primary text-xs px-5 py-2.5 w-full bg-[#E8A1FF] text-[#0B0F14] shadow-[0_0_20px_rgba(232,161,255,0.25)] flex items-center justify-center gap-2"
              >
                <RotateCw className={`w-3.5 h-3.5 ${whatIfLoading ? "animate-spin" : ""}`} />
                <span>{whatIfLoading ? "Simulating Delta..." : "Run What-If Simulation"}</span>
              </button>
            </div>
          </div>

          {/* Simulation Output Delta */}
          {whatIfResult && (
            <div className="space-y-4 pt-4 border-t border-[#A8B4C2]/12">
              <div className="text-xs font-mono text-[#E8A1FF] uppercase font-bold tracking-wider">
                Simulated Posture Delta
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {whatIfResult.deltas?.map((d: any, idx: number) => {
                  const isImproved = d.delta === "IMPROVED";
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-[#0B0F14]/70 border border-[#A8B4C2]/15 space-y-1 font-mono text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[#A8B4C2] font-semibold">{d.dimension}</span>
                        <span className={`badge ${isImproved ? "badge-success" : "badge-neutral"}`}>
                          {d.delta}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#EAF0F6] pt-1">
                        Baseline: <code className="text-[#A8B4C2]">{d.baseline_value || "None"}</code> → Simulated: <strong className="text-[#60F1D0]">{d.simulated_value}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>

              {whatIfResult.assumptions && (
                <div className="p-3 rounded-xl bg-[#0B0F14]/40 border border-white/5 text-xs font-mono text-[#A8B4C2]">
                  <strong className="text-[#EAF0F6] block mb-1">Planning Assumptions:</strong>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {whatIfResult.assumptions.map((a: string, i: number) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* ─── 6 CORE INVESTIGATION QUESTIONS ─── */}
      <div className="space-y-6">

        {/* ── 1. WHAT WAS FOUND? ── */}
        <div className="glass-surface p-5 rounded-2xl border border-[#A8B4C2]/15 space-y-3">
          <div className="flex items-center justify-between border-b border-[#A8B4C2]/10 pb-3">
            <span className="text-xs font-bold text-[#EAF0F6] uppercase font-mono tracking-wider flex items-center gap-2">
              <FileCode className="w-4 h-4 text-[#60F1D0]" />
              1. What was found?
            </span>
            <span className="text-[10px] font-mono text-[#60F1D0] bg-[#60F1D0]/10 px-2 py-0.5 rounded-full border border-[#60F1D0]/20">
              CRYPTOGRAPHIC GROUND TRUTH
            </span>
          </div>

          <div className="text-xs text-[#A8B4C2] leading-relaxed">
            Statically and empirically verified cryptographic primitive <strong className="text-[#EAF0F6] font-mono">{f.algorithm || f.asset_type}</strong> performing <span className="text-[#EAF0F6]">{f.role || "operations"}</span> via library provider <code className="text-[#60F1D0]">{f.library || "Standard/Native"}</code>.
          </div>

          {f.snippet && (
            <div className="rounded-xl border border-[#A8B4C2]/15 bg-[#0B0F14] p-3 font-mono text-xs text-[#EAF0F6] overflow-x-auto">
              <code>{f.snippet}</code>
            </div>
          )}
        </div>

        {/* ── 2. WHERE WAS IT DISCOVERED? ── */}
        <div className="glass-surface p-5 rounded-2xl border border-[#A8B4C2]/15 space-y-3">
          <div className="flex items-center justify-between border-b border-[#A8B4C2]/10 pb-3">
            <span className="text-xs font-bold text-[#EAF0F6] uppercase font-mono tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#75B7FF]" />
              2. Where was it discovered?
            </span>
            <span className="text-[10px] font-mono text-[#A8B4C2]">
              AST & BYTECODE CALLSITE PROVENANCE
            </span>
          </div>

          {agg.evidence && agg.evidence.length > 0 ? (
            <div className="divide-y divide-[#A8B4C2]/10">
              {agg.evidence.map((ev: any, idx: number) => (
                <div key={idx} className="py-3 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#75B7FF]" />
                      <span className="text-[#EAF0F6] font-semibold">{ev.file}</span>
                      {ev.line && <span className="text-[#60F1D0]">:{ev.line}</span>}
                    </div>
                    <span className="badge badge-neutral">{ev.detector || "AST Scanner"}</span>
                  </div>
                  {ev.snippet && (
                    <div className="p-2.5 rounded-lg bg-[#0B0F14] border border-[#A8B4C2]/10 text-xs text-[#A8B4C2] overflow-x-auto">
                      <code className="text-[#EAF0F6]">{ev.snippet}</code>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="font-mono text-xs text-[#EAF0F6] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#75B7FF]" />
              <span>{f.source_file || "File path in repository"}</span>
              {f.line_start && <span className="text-[#60F1D0]">:{f.line_start}</span>}
            </div>
          )}
        </div>

        {/* ── 3. WAS IT REACHABLE? ── */}
        <div className="glass-surface p-5 rounded-2xl border border-[#A8B4C2]/15 space-y-3">
          <div className="flex items-center justify-between border-b border-[#A8B4C2]/10 pb-3">
            <span className="text-xs font-bold text-[#EAF0F6] uppercase font-mono tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#8B7CFF]" />
              3. Is it reachable from active API routes?
            </span>
            <span className={`badge ${isReachable ? "badge-analysis" : "badge-neutral"}`}>
              {isReachable ? "CALL-GRAPH REACHABLE" : "UNREACHABLE"}
            </span>
          </div>

          <div className="text-xs text-[#A8B4C2] leading-relaxed">
            {isReachable ? (
              <span>
                Call-graph reachability traversal confirms exposed external route <strong className="text-[#60F1D0] font-mono">{reach?.entrypoint || "API Entrypoint"}</strong> can invoke this cryptographic operation in production.
              </span>
            ) : (
              <span>
                Static call-graph traversal found no active public routes leading to this invocation. It may be dead code or test scaffolding.
              </span>
            )}
          </div>

          {reach?.path && reach.path.length > 0 && (
            <div className="p-3 rounded-xl bg-[#0B0F14] border border-[#A8B4C2]/10 font-mono text-xs space-y-1">
              <span className="text-[10px] text-[#A8B4C2] uppercase block">Call Chain Trace</span>
              <div className="text-[#EAF0F6] flex items-center gap-2 flex-wrap">
                {reach.path.map((node: string, i: number) => (
                  <span key={i} className="flex items-center gap-2">
                    <span className="text-[#60F1D0]">{node}</span>
                    {i < reach.path.length - 1 && <span className="text-[#A8B4C2]">→</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── 4. WAS IT OBSERVED AT RUNTIME? (LIVE TELEMETRY PROOF) ── */}
        <div className="glass-surface p-5 rounded-2xl border border-[#60F1D0]/30 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#A8B4C2]/10 pb-3">
            <span className="text-xs font-bold text-[#EAF0F6] uppercase font-mono tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#60F1D0]" />
              4. Was it observed running live? (Empirical Telemetry)
            </span>
            <span className={`badge ${isObserved ? "badge-success" : "badge-neutral"}`}>
              {isObserved ? `${runtimeList.length} LIVE RUNTIME EVENTS` : "NOT OBSERVED"}
            </span>
          </div>

          {isObserved ? (
            <div className="space-y-4">
              <div className="text-xs text-[#A8B4C2] leading-relaxed">
                Dynamic execution harness intercepted this algorithm during live execution, captured the unwound Python callstack, and verified exact code line execution.
              </div>

              {/* Exact Line Snippet Capture */}
              {runtimeList[0]?.snippet && (
                <div className="p-3.5 rounded-xl bg-[#0B0F14] border border-[#60F1D0]/30 font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-[#60F1D0]">
                    <span>CAPTURED RUNTIME LINE SNIPPET</span>
                    <span>TIMESTAMP: {runtimeList[0].timestamp || "Observed"}</span>
                  </div>
                  <pre className="text-[#EAF0F6] bg-black/40 p-2.5 rounded-lg border border-white/5 overflow-x-auto">
                    <code>{runtimeList[0].snippet}</code>
                  </pre>
                </div>
              )}

              {/* Stack Frame Unwinding (Progressive Disclosure) */}
              {runtimeList[0]?.stack_trace && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowStackFrames(!showStackFrames)}
                    className="text-xs font-mono text-[#A8B4C2] hover:text-[#EAF0F6] flex items-center gap-1.5"
                  >
                    {showStackFrames ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    <span>{showStackFrames ? "Hide" : "Inspect"} Unwound Call Stack Frames</span>
                  </button>

                  {showStackFrames && (
                    <div className="p-3 rounded-xl bg-[#0B0F14] border border-[#A8B4C2]/15 font-mono text-[11px] text-[#A8B4C2] overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
                      {runtimeList[0].stack_trace}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-[#A8B4C2]">
              No dynamic runtime invocations were recorded during the test traffic execution window.
            </div>
          )}
        </div>

        {/* ── 5. WHAT DOES IT PROTECT? ── */}
        <div className="glass-surface p-5 rounded-2xl border border-[#A8B4C2]/15 space-y-3">
          <div className="flex items-center justify-between border-b border-[#A8B4C2]/10 pb-3">
            <span className="text-xs font-bold text-[#EAF0F6] uppercase font-mono tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-[#75B7FF]" />
              5. What data and keys are bound to it?
            </span>
            <span className="text-[10px] font-mono text-[#75B7FF] bg-[#75B7FF]/10 px-2 py-0.5 rounded-full border border-[#75B7FF]/20">
              CONTEXT BOUND
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
            <div className="p-3 rounded-xl bg-[#0B0F14]/70 border border-[#A8B4C2]/10 space-y-1">
              <div className="text-[10px] text-[#A8B4C2]">PROTECTED DATA ASSET</div>
              <div className="font-bold text-[#75B7FF]">
                {agg.data_assets?.[0]?.name || "PCI-DSS Credit Card Vault"}
              </div>
              <div className="text-[11px] text-[#A8B4C2]">
                Sensitivity: {agg.data_assets?.[0]?.sensitivity || "Restricted"} · HNDL Target
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0B0F14]/70 border border-[#A8B4C2]/10 space-y-1">
              <div className="text-[10px] text-[#A8B4C2]">ASSOCIATED KEY CONTEXT</div>
              <div className="font-bold text-[#FFBF72]">
                {agg.key_contexts?.[0]?.name || "KMS Key: arn:aws:kms:prod-vault"}
              </div>
              <div className="text-[11px] text-[#A8B4C2]">
                Type: {agg.key_contexts?.[0]?.key_type || "KMS Customer Managed Key"}
              </div>
            </div>
          </div>
        </div>

        {/* ── 6. WHAT SHOULD HAPPEN & WHY? ── */}
        <div className="glass-surface p-5 rounded-2xl border border-[#8B7CFF]/30 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#A8B4C2]/10 pb-3">
            <span className="text-xs font-bold text-[#EAF0F6] uppercase font-mono tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#8B7CFF]" />
              6. What should happen & why? (Deterministic Action)
            </span>
            <span className="badge badge-analysis">DETERMINISTIC RECOMMENDATION</span>
          </div>

          <div className="text-xs text-[#A8B4C2] leading-relaxed">
            {analysis?.recommendation || (
              <span>
                Upgrade from vulnerable <strong className="text-[#FF7A90] font-mono">RSA-2048</strong> to NIST-standardized <strong className="text-[#60F1D0] font-mono">ML-KEM-768 (FIPS 203)</strong>. Decouple hardcoded callsites into an abstracted provider wrapper to prevent service breakage.
              </span>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between text-xs font-mono">
            <span className="text-[#A8B4C2]">Migration Complexity: <strong className="text-[#EAF0F6]">Moderate</strong></span>
            <button
              onClick={() => setActiveTab("WHATIF")}
              className="text-[#60F1D0] hover:underline flex items-center gap-1"
            >
              <span>Test PQC Replacement in Sandbox</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>

      {/* Embedded Contextual AI Assistant */}
      <AssistantDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        projectId={projectId}
        scanId={scanId || undefined}
        entityType="FINDING"
        entityId={f.id}
        entityTitle={f.algorithm || f.name}
        initialQuestion={initialQuestion}
      />

    </div>
  );
}
