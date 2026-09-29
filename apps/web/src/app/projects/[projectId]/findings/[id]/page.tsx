"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  Bot
} from "lucide-react";
import AssistantDrawer from "@/components/investigation/AssistantDrawer";

export default function FindingEvidence() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const findingId = params.id as string;

  const [agg, setAgg] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Assistant Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [initialQuestion, setInitialQuestion] = useState("");

  // What-If State
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [scenarioType, setScenarioType] = useState("INTRODUCE_CRYPTO_ABSTRACTION");
  const [overrides, setOverrides] = useState<any>({ crypto_abstraction: true });
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [aggRes, analysisRes] = await Promise.all([
          fetch(`http://localhost:8000/projects/${projectId}/findings/${findingId}/verification`),
          fetch(`http://localhost:8000/projects/${projectId}/findings/${findingId}/analysis`)
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
      const res = await fetch(`http://localhost:8000/projects/${projectId}/findings/${findingId}/what-if`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario_type: scenarioType, overrides })
      });
      if (res.ok) {
        setWhatIfResult(await res.json());
      }
    } catch(e) {
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
      <div className="flex items-center justify-center py-24 text-sm text-[#A8B4C2] gap-2">
        <span className="w-2 h-2 rounded-full bg-[#60F1D0] animate-ping" />
        Loading evidence trail...
      </div>
    );
  }

  if (!agg) {
    return (
      <div className="p-8 text-center bg-[#151C25] border border-[#FF7A90]/30 rounded-xl max-w-xl mx-auto">
        <p className="text-sm font-semibold text-[#FF7A90]">Finding not found</p>
        <p className="text-xs text-[#A8B4C2] mt-1">This cryptographic asset ID was not present in the current scan baseline.</p>
        <button onClick={() => router.back()} className="mt-4 text-xs text-[#60F1D0] hover:underline">
          ← Return to findings
        </button>
      </div>
    );
  }

  const f = agg.finding;

  // Determine gaps manually if analysis isn't ready
  const gaps = [];
  if (!agg.reachability) gaps.push("Reachability evidence missing");
  if (!agg.runtime || agg.runtime.length === 0) gaps.push("Runtime observation missing");
  if (agg.crypto_paths?.length === 0) gaps.push("Crypto path context missing");
  if (agg.data_assets?.length === 0) gaps.push("Data asset context missing");
  if (agg.key_contexts?.length === 0) gaps.push("Key context missing");

  const path = agg.crypto_paths?.[0];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24 relative">
      {/* Header with Navigation */}
      <div className="border-b border-[#A8B4C2]/15 pb-5">
        <button 
          onClick={() => router.back()} 
          className="inline-flex items-center gap-1.5 text-xs font-mono text-[#A8B4C2] hover:text-[#EAF0F6] mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Findings Inventory</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#60F1D0] shadow-[0_0_8px_#60F1D0]" />
              <h1 className="text-2xl font-bold font-mono text-[#EAF0F6]">
                {f.name || f.algorithm || f.asset_type}
              </h1>
            </div>
            <p className="text-xs text-[#A8B4C2] mt-1 font-mono">
              Role: <span className="text-[#EAF0F6]">{f.role || "GENERAL"}</span> &bull; Asset Type: <span className="text-[#EAF0F6]">{f.asset_type}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => openAssistant("Explain the evidence trail")}
              className="inline-flex items-center gap-1 text-xs font-mono px-2.5 py-1.5 rounded-lg bg-[#60F1D0]/10 hover:bg-[#60F1D0]/20 text-[#60F1D0] border border-[#60F1D0]/30 transition-all"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Explain Evidence</span>
            </button>
            <button
              onClick={() => openAssistant("Explain runtime observation")}
              className="inline-flex items-center gap-1 text-xs font-mono px-2.5 py-1.5 rounded-lg bg-[#1C2632] hover:bg-[#1C2632]/80 text-[#A8B4C2] hover:text-[#EAF0F6] border border-[#A8B4C2]/15 transition-all"
            >
              <span>Explain Runtime</span>
            </button>
            <button
              onClick={() => openAssistant("Explain what the finding protects")}
              className="inline-flex items-center gap-1 text-xs font-mono px-2.5 py-1.5 rounded-lg bg-[#1C2632] hover:bg-[#1C2632]/80 text-[#A8B4C2] hover:text-[#EAF0F6] border border-[#A8B4C2]/15 transition-all"
            >
              <span>Explain Protection</span>
            </button>
            <button
              onClick={() => openAssistant("Explain the recommendation")}
              className="inline-flex items-center gap-1 text-xs font-mono px-2.5 py-1.5 rounded-lg bg-[#8B7CFF]/15 hover:bg-[#8B7CFF]/25 text-[#8B7CFF] border border-[#8B7CFF]/30 transition-all"
            >
              <span>Explain Recommendation</span>
            </button>
          </div>
        </div>
      </div>

      {/* DOMINANT EVIDENCE TRAIL (6 Core Questions) */}
      <div className="space-y-6">

        {/* 1. WHAT WAS FOUND? */}
        <div className="panel p-5 border-[#A8B4C2]/15 bg-[#151C25]">
          <div className="flex items-center justify-between border-b border-[#A8B4C2]/10 pb-3 mb-3">
            <span className="text-xs font-bold text-[#EAF0F6] uppercase tracking-wider flex items-center gap-2">
              <FileCode className="w-3.5 h-3.5 text-[#60F1D0]" />
              1. What was found?
            </span>
            <span className="text-[11px] font-mono text-[#A8B4C2]">Cryptographic Asset Ground Truth</span>
          </div>

          <div className="space-y-3">
            <div className="text-xs text-[#A8B4C2] leading-relaxed">
              Statically identified logical asset <span className="text-[#60F1D0] font-mono font-semibold">{f.algorithm || f.asset_type}</span> performing <span className="text-[#EAF0F6] font-medium">{f.role || "cryptographic operations"}</span> via library <span className="text-[#EAF0F6] font-mono">{f.library || "Native/Standard"}</span>.
            </div>

            {f.snippet && (
              <div className="rounded-lg border border-[#A8B4C2]/15 bg-[#0B0F14] p-3 font-mono text-xs text-[#EAF0F6] overflow-x-auto">
                <code>{f.snippet}</code>
              </div>
            )}
          </div>
        </div>

        {/* 2. WHERE? */}
        <div className="panel p-5 border-[#A8B4C2]/15 bg-[#151C25]">
          <div className="flex items-center justify-between border-b border-[#A8B4C2]/10 pb-3 mb-3">
            <span className="text-xs font-bold text-[#EAF0F6] uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#75B7FF]" />
              2. Where was it discovered?
            </span>
            <span className="text-[11px] font-mono text-[#A8B4C2]">AST Callsite Locations</span>
          </div>

          {agg.evidence && agg.evidence.length > 0 ? (
            <div className="divide-y divide-[#A8B4C2]/10">
              {agg.evidence.map((ev: any, i: number) => {
                const matchedPath = agg.crypto_paths?.find((p: any) => p.source_file === ev.file);
                return (
                  <div key={i} className="py-3 space-y-2 group">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#75B7FF]" />
                        <span className="text-[#EAF0F6] font-medium">{ev.file}</span>
                        {ev.line && <span className="text-[#60F1D0]">:{ev.line}</span>}
                        {matchedPath?.path_id_name && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[#8B7CFF]/15 text-[#8B7CFF] border border-[#8B7CFF]/30">
                            {matchedPath.path_id_name}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#A8B4C2] px-2 py-0.5 rounded bg-[#1C2632] border border-[#A8B4C2]/15">
                        {ev.detector || "Static AST"}
                      </span>
                    </div>

                    {ev.snippet && (
                      <div className="text-[11px] font-mono text-[#A8B4C2] bg-[#0B0F14] p-2.5 rounded-md border border-[#A8B4C2]/10 overflow-x-auto group-hover:border-[#60F1D0]/30 transition-colors">
                        <code className="text-[#EAF0F6]">{ev.snippet}</code>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="font-mono text-xs text-[#EAF0F6] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#75B7FF]" />
              <span>{f.source_file || "Unknown file"}</span>
              {f.line_start && <span className="text-[#A8B4C2]">:{f.line_start}</span>}
            </div>
          )}
        </div>

        {/* 3. WAS IT REACHABLE? */}
        <div className="panel p-5 border-[#A8B4C2]/15 bg-[#151C25]">
          <div className="flex items-center justify-between border-b border-[#A8B4C2]/10 pb-3 mb-3">
            <span className="text-xs font-bold text-[#EAF0F6] uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#8B7CFF]" />
              3. Was it statically reachable?
            </span>
            <span className="text-[11px] font-mono text-[#A8B4C2]">Interprocedural Call Graph</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-[#A8B4C2]">
              {agg.reachability ? (
                <span>
                  Static call graph confirms reachability from public entrypoint: <code className="font-mono text-[#8B7CFF] bg-[#1C2632] px-2 py-0.5 rounded border border-[#8B7CFF]/30">{agg.reachability.entrypoint}</code>
                </span>
              ) : (
                <span>No conclusive static call chain connecting to an external entrypoint.</span>
              )}
            </div>

            <div>
              {agg.reachability?.status === "REACHABLE" ? (
                <span className="badge badge-analysis">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8B7CFF] mr-1" />
                  REACHABLE
                </span>
              ) : (
                <span className="badge badge-neutral">UNREACHABLE / UNKNOWN</span>
              )}
            </div>
          </div>
        </div>

        {/* 4. DID IT ACTUALLY RUN? */}
        <div className="panel p-5 border-[#A8B4C2]/15 bg-[#151C25]">
          <div className="flex items-center justify-between border-b border-[#A8B4C2]/10 pb-3 mb-3">
            <span className="text-xs font-bold text-[#EAF0F6] uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#60F1D0]" />
              4. Did it actually execute at runtime?
            </span>
            <span className="text-[11px] font-mono text-[#A8B4C2]">Dynamic Trace Conformance</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-[#A8B4C2]">
              {agg.runtime && agg.runtime.length > 0 ? (
                <span className="text-[#60F1D0]">
                  Active runtime telemetry confirms this cryptographic call was invoked during live workload execution.
                </span>
              ) : (
                <span>No execution events captured in dynamic telemetry trace.</span>
              )}
            </div>

            <div>
              {agg.runtime && agg.runtime.length > 0 ? (
                <span className="badge badge-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#60F1D0] mr-1" />
                  RUNTIME OBSERVED
                </span>
              ) : (
                <span className="badge badge-neutral">NOT OBSERVED</span>
              )}
            </div>
          </div>

          {agg.runtime && agg.runtime.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[#A8B4C2]/10 space-y-2.5">
              <div className="text-[11px] font-mono text-[#A8B4C2] uppercase tracking-wider flex items-center justify-between">
                <span>Observed Execution Telemetry ({agg.runtime.length} {agg.runtime.length === 1 ? 'event' : 'events'})</span>
                <span className="text-[#60F1D0] text-[10px]">Verified Dynamic Execution</span>
              </div>
              <div className="divide-y divide-[#A8B4C2]/10">
                {agg.runtime.map((ev: any, idx: number) => {
                  const runtimeEvidence = agg.evidence?.find(
                    (e: any) => e.evidence_type === "runtime" && e.file === ev.source_file
                  );
                  const displaySnippet = runtimeEvidence?.snippet || ev.snippet;
                  return (
                    <div key={idx} className="py-2.5 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#60F1D0]" />
                          <span className="text-[#EAF0F6] font-medium">{ev.source_file || ev.source_locator}</span>
                          {ev.source_line && <span className="text-[#60F1D0]">:{ev.source_line}</span>}
                          {ev.entrypoint && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#60F1D0]/15 text-[#60F1D0] border border-[#60F1D0]/30">
                              {ev.entrypoint}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[#A8B4C2]">
                          <span className="px-2 py-0.5 rounded bg-[#1C2632] border border-[#A8B4C2]/15 font-mono text-[#60F1D0]">
                            {ev.operation || "executed"}
                          </span>
                          <span>{ev.started_at ? new Date(ev.started_at).toLocaleTimeString() : "Observed"}</span>
                        </div>
                      </div>
                      {displaySnippet && (
                        <div className="text-[11px] font-mono text-[#A8B4C2] bg-[#0B0F14] p-2.5 rounded-md border border-[#A8B4C2]/10 overflow-x-auto">
                          <code className="text-[#60F1D0]">{displaySnippet}</code>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 5. WHAT DOES IT PROTECT? */}
        <div className="panel p-5 border-[#A8B4C2]/15 bg-[#151C25]">
          <div className="flex items-center justify-between border-b border-[#A8B4C2]/10 pb-3 mb-3">
            <span className="text-xs font-bold text-[#EAF0F6] uppercase tracking-wider flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-[#75B7FF]" />
              5. What does it protect?
            </span>
            <span className="text-[11px] font-mono text-[#A8B4C2]">Data Asset & Key Context</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-lg border border-[#A8B4C2]/15 bg-[#1C2632]/40 space-y-1.5">
              <div className="flex items-center gap-2 text-[#75B7FF] font-semibold">
                <Database className="w-3.5 h-3.5" />
                <span>Protected Data Asset</span>
              </div>
              {agg.data_assets?.length > 0 ? (
                <div className="space-y-1">
                  <div className="font-mono text-[#EAF0F6] font-medium">{agg.data_assets[0].name}</div>
                  <div className="text-[11px] text-[#A8B4C2]">
                    Sensitivity: <span className="text-[#EAF0F6] font-mono">{agg.data_assets[0].sensitivity_level || "RESTRICTED"}</span>
                  </div>
                  <div className="text-[11px] text-[#A8B4C2]">
                    Confidentiality Until: <span className="text-[#FF7A90] font-mono">{agg.data_assets[0].required_confidentiality_until || "2032+"}</span>
                  </div>
                </div>
              ) : (
                <div className="text-[#A8B4C2]">No classified data asset linked to this path.</div>
              )}
            </div>

            <div className="p-3.5 rounded-lg border border-[#A8B4C2]/15 bg-[#1C2632]/40 space-y-1.5">
              <div className="flex items-center gap-2 text-[#FFBF72] font-semibold">
                <Key className="w-3.5 h-3.5" />
                <span>Cryptographic Key Context</span>
              </div>
              {agg.key_contexts?.length > 0 ? (
                <div className="space-y-1">
                  <div className="font-mono text-[#EAF0F6] font-medium">{agg.key_contexts[0].key_id_name}</div>
                  <div className="text-[11px] text-[#A8B4C2]">
                    Management: <span className="text-[#EAF0F6] font-mono">{agg.key_contexts[0].key_type || "KMS"}</span>
                  </div>
                  <div className="text-[11px] text-[#A8B4C2]">
                    Rotation: <span className="text-[#EAF0F6] font-mono">{agg.key_contexts[0].rotation_state || "DECLARED"}</span>
                  </div>
                </div>
              ) : (
                <div className="text-[#A8B4C2]">No specific key context mapping linked.</div>
              )}
            </div>
          </div>
        </div>

        {/* 6. WHAT SHOULD HAPPEN NEXT? */}
        {analysis && (
          <div className="panel p-5 border-[#60F1D0]/30 bg-gradient-to-b from-[#151C25] to-[#1C2632]/80">
            <div className="flex items-center justify-between border-b border-[#A8B4C2]/10 pb-3 mb-4">
              <span className="text-xs font-bold text-[#EAF0F6] uppercase tracking-wider flex items-center gap-2">
                <Beaker className="w-3.5 h-3.5 text-[#60F1D0]" />
                6. What should happen next?
              </span>
              <span className="text-[11px] font-mono text-[#60F1D0]">Two-Clock Evaluation Engine</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Posture Metrics */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-[#A8B4C2] uppercase tracking-wider">Evaluation Posture</div>
                <div className="divide-y divide-[#A8B4C2]/10 text-xs">
                  <div className="py-2 flex justify-between">
                    <span className="text-[#A8B4C2]">Runway State</span>
                    <span className={`font-mono font-bold ${
                      analysis.runway_state === "URGENT" || analysis.runway_state === "NEEDS_PLANNING" 
                        ? "text-[#FF7A90]" 
                        : "text-[#60F1D0]"
                    }`}>
                      {analysis.runway_state}
                    </span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-[#A8B4C2]">Migration Effort</span>
                    <span className="font-mono text-[#EAF0F6]">{analysis.migration_effort}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-[#A8B4C2]">Agility Readiness</span>
                    <span className="font-mono text-[#EAF0F6]">{analysis.crypto_agility_state}</span>
                  </div>
                </div>
                <div className="text-[11px] text-[#A8B4C2] italic">
                  Basis: {analysis.runway_basis}
                </div>
              </div>

              {/* Action Candidates */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-[#60F1D0] uppercase tracking-wider">Recommended Action Candidates</div>
                {analysis.action_candidates && analysis.action_candidates.length > 0 ? (
                  <div className="space-y-2">
                    {analysis.action_candidates.map((cand: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-[#151C25] border border-[#A8B4C2]/15 space-y-1">
                        <div className="text-xs font-mono font-bold text-[#60F1D0]">{cand.action_type}</div>
                        <div className="text-[11px] text-[#EAF0F6]">{cand.why}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-[#A8B4C2]">No immediate action candidates proposed.</div>
                )}
              </div>
            </div>

            {/* Transition to What-If Workbench */}
            <div className="mt-6 pt-4 border-t border-[#A8B4C2]/15 flex items-center justify-between">
              <span className="text-xs text-[#A8B4C2]">
                Explore counterfactual migration interventions using the Decision Workbench.
              </span>
              <button
                onClick={() => setWhatIfOpen(!whatIfOpen)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#60F1D0] text-[#0B0F14] text-xs font-bold hover:bg-[#60F1D0]/90 transition-all shadow-[0_0_12px_#60F1D030]"
              >
                <Beaker className="w-3.5 h-3.5" />
                <span>{whatIfOpen ? "Close What-If" : "Simulate What-If"}</span>
              </button>
            </div>
          </div>
        )}

        {/* INLINE WHAT-IF SIMULATOR */}
        {whatIfOpen && (
          <div className="panel p-6 border-[#8B7CFF]/30 bg-[#151C25] space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#A8B4C2]/15 pb-3">
              <div className="flex items-center gap-2">
                <Beaker className="w-4 h-4 text-[#8B7CFF]" />
                <h3 className="text-sm font-bold text-[#EAF0F6] uppercase tracking-wider">Counterfactual What-If Simulation</h3>
              </div>
              <span className="text-[11px] font-mono text-[#A8B4C2]">Baseline Scoped to Path</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Controls */}
              <div className="space-y-4 lg:border-r lg:border-[#A8B4C2]/15 lg:pr-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#A8B4C2] block">INTERVENTION SCENARIO</label>
                  <select 
                    className="w-full text-xs p-2.5 rounded-lg bg-[#1C2632] border border-[#A8B4C2]/20 text-[#EAF0F6] focus:border-[#60F1D0] outline-none"
                    value={scenarioType} 
                    onChange={handleScenarioChange}
                  >
                    <option value="INTRODUCE_CRYPTO_ABSTRACTION">Introduce Crypto Abstraction</option>
                    <option value="REDUCE_DATA_RETENTION">Reduce Data Retention</option>
                    <option value="HYBRID_MIGRATION">Evaluate Hybrid Migration</option>
                    <option value="MIGRATION_PLANNING">Migration Planning</option>
                    <option value="HARDEN_CURRENT_DEPLOYMENT">Harden Current Deployment</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-[#A8B4C2] block">SCENARIO OVERRIDES</label>
                  
                  {scenarioType === "INTRODUCE_CRYPTO_ABSTRACTION" && (
                    <label className="flex items-center gap-2 text-xs text-[#EAF0F6]">
                      <input 
                        type="checkbox" 
                        checked={overrides.crypto_abstraction} 
                        onChange={(e) => setOverrides({...overrides, crypto_abstraction: e.target.checked})} 
                        className="rounded accent-[#60F1D0]"
                      />
                      <span>Introduce Abstraction Layer</span>
                    </label>
                  )}

                  {scenarioType === "REDUCE_DATA_RETENTION" && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-[#A8B4C2] block">Current: {agg.data_assets?.[0]?.required_confidentiality_until || "Unknown"}</span>
                      <input 
                        type="date" 
                        className="w-full text-xs p-2 rounded bg-[#1C2632] border border-[#A8B4C2]/20 text-[#EAF0F6]" 
                        value={overrides.retention_end_date || ""} 
                        onChange={(e) => setOverrides({...overrides, retention_end_date: e.target.value})} 
                      />
                    </div>
                  )}

                  {scenarioType === "HYBRID_MIGRATION" && (
                    <label className="flex items-center gap-2 text-xs text-[#EAF0F6]">
                      <input 
                        type="checkbox" 
                        checked={overrides.migration_supported} 
                        onChange={(e) => setOverrides({...overrides, migration_supported: e.target.checked})} 
                        className="rounded accent-[#60F1D0]"
                      />
                      <span>Assume Hybrid Protocol Support</span>
                    </label>
                  )}

                  {scenarioType === "MIGRATION_PLANNING" && (
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs text-[#EAF0F6]">
                        <input 
                          type="checkbox" 
                          checked={overrides.provider_dependency_resolved} 
                          onChange={(e) => setOverrides({...overrides, provider_dependency_resolved: e.target.checked})} 
                          className="rounded accent-[#60F1D0]"
                        />
                        <span>Provider Dependency Resolved</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-[#EAF0F6]">
                        <input 
                          type="checkbox" 
                          checked={overrides.rollback_supported} 
                          onChange={(e) => setOverrides({...overrides, rollback_supported: e.target.checked})} 
                          className="rounded accent-[#60F1D0]"
                        />
                        <span>Rollback Supported</span>
                      </label>
                    </div>
                  )}

                  {scenarioType === "HARDEN_CURRENT_DEPLOYMENT" && (
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs text-[#EAF0F6]">
                        <input 
                          type="checkbox" 
                          checked={overrides.key_separation} 
                          onChange={(e) => setOverrides({...overrides, key_separation: e.target.checked})} 
                          className="rounded accent-[#60F1D0]"
                        />
                        <span>Strict Key Separation</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-[#EAF0F6]">
                        <input 
                          type="checkbox" 
                          checked={overrides.rotation_policy} 
                          onChange={(e) => setOverrides({...overrides, rotation_policy: e.target.checked})} 
                          className="rounded accent-[#60F1D0]"
                        />
                        <span>Automated Rotation Policy</span>
                      </label>
                    </div>
                  )}
                </div>

                <button 
                  onClick={runScenario} 
                  disabled={whatIfLoading}
                  className="w-full mt-4 bg-[#8B7CFF] hover:bg-[#8B7CFF]/90 text-[#0B0F14] text-xs font-bold py-2 rounded-lg transition-all shadow-[0_0_12px_#8B7CFF30]"
                >
                  {whatIfLoading ? "Simulating Counterfactual..." : "Run Scenario Simulation"}
                </button>
              </div>

              {/* Simulation Result */}
              <div className="lg:col-span-2 space-y-4">
                {whatIfResult ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg border border-[#A8B4C2]/15 bg-[#1C2632]/40">
                        <div className="text-[10px] font-mono text-[#A8B4C2] uppercase mb-1">Immutable Baseline</div>
                        <div className="text-xs space-y-1">
                          <div>Agility: <span className="font-mono text-[#EAF0F6]">{whatIfResult.baseline.analysis_result.crypto_agility_state}</span></div>
                          <div>Effort: <span className="font-mono text-[#EAF0F6]">{whatIfResult.baseline.analysis_result.migration_effort}</span></div>
                          <div>Runway: <span className="font-mono text-[#EAF0F6]">{whatIfResult.baseline.analysis_result.runway_state}</span></div>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border border-[#60F1D0]/30 bg-[#60F1D0]/5">
                        <div className="text-[10px] font-mono text-[#60F1D0] uppercase mb-1">Counterfactual Scenario</div>
                        <div className="text-xs space-y-1">
                          <div>Agility: <span className="font-mono text-[#60F1D0] font-semibold">{whatIfResult.scenario.analysis_result.crypto_agility_state}</span></div>
                          <div>Effort: <span className="font-mono text-[#60F1D0] font-semibold">{whatIfResult.scenario.analysis_result.migration_effort}</span></div>
                          <div>Runway: <span className="font-mono text-[#60F1D0] font-semibold">{whatIfResult.scenario.analysis_result.runway_state}</span></div>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg border border-[#A8B4C2]/15 bg-[#1C2632]/40">
                      <div className="text-[10px] font-mono text-[#A8B4C2] uppercase mb-2">Simulated Deltas</div>
                      <div className="space-y-2">
                        {whatIfResult.deltas.map((d: any, i: number) => (
                          <div key={i} className="flex justify-between items-center text-xs border-b border-[#A8B4C2]/10 pb-1.5">
                            <span className="text-[#A8B4C2] font-mono">{d.dimension}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-[#A8B4C2]">{d.baseline_value} → {d.simulated_value}</span>
                              <span className={`badge ${
                                d.delta === 'IMPROVED' ? 'badge-success' : 
                                d.delta === 'WORSENED' ? 'badge-danger' : 
                                'badge-neutral'
                              }`}>
                                {d.delta}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[160px] flex items-center justify-center text-center text-xs text-[#A8B4C2] border border-dashed border-[#A8B4C2]/20 rounded-xl p-6">
                    Select intervention parameters on the left and run simulation to evaluate projected impact.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Assistant Drawer */}
      {drawerOpen && (
        <AssistantDrawer
          projectId={projectId}
          scanId={f?.scan_id || agg?.finding?.scan_id || "059bfc23-cf81-4e62-a336-b4ee9e7e34e0"}
          entityType="FINDING"
          entityId={findingId}
          entityTitle={f?.name || f?.algorithm || "Crypto Finding"}
          initialQuestion={initialQuestion}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}
