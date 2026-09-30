'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { X, ChevronRight, ArrowLeft, Beaker } from 'lucide-react';
import type { InvestigationGraph, AnalysisResult } from '@/types/investigation-graph';

interface ActionCandidate {
  id: string;
  action_type: string;
  why: string;
}

interface WhatIfDelta {
  dimension: string;
  baseline_value: string | null;
  simulated_value: string | null;
  delta: 'IMPROVED' | 'WORSENED' | 'CHANGED' | 'UNCHANGED' | 'NEW' | 'REMOVED' | 'UNKNOWN';
}

interface WhatIfResponse {
  scenario_id: string;
  scenario_type: string;
  deltas: WhatIfDelta[];
  assumptions: string[];
  unknowns: string[];
}

const SCENARIOS = [
  { id: 'INTRODUCE_CRYPTO_ABSTRACTION', label: 'Introduce Crypto Abstraction', overrides: { crypto_abstraction: true } },
  { id: 'REDUCE_DATA_RETENTION', label: 'Reduce Data Retention', overrides: { retention_end_date: "2027-01-01" } },
  { id: 'HARDEN_CURRENT_DEPLOYMENT', label: 'Harden Current Deployment', overrides: { key_separation: true, rotation_policy: true } },
  { id: 'MIGRATION_PLANNING', label: 'Migration Planning', overrides: { provider_dependency_resolved: true, rollback_supported: true } },
  { id: 'HYBRID_MIGRATION', label: 'Hybrid Migration', overrides: { migration_supported: true } }
];

const GLASS_SURFACE = '#151C25';
const RAISED_GLASS = '#1C2632';
const PRIMARY_TEXT = '#EAF0F6';
const MUTED_TEXT = '#A8B4C2';
const CRYPTO_TEAL = '#60F1D0';
const ANALYSIS_PURPLE = '#8B7CFF';
const SCENARIO_PINK = '#E8A1FF';

interface DecisionWorkbenchProps {
  graph: InvestigationGraph;
  cryptoPathId: string;
  onClose: () => void;
  onViewEvidence: (nodeId: string) => void;
  initialWhatIf?: boolean;
}

export default function DecisionWorkbench({
  graph,
  cryptoPathId,
  onClose,
  onViewEvidence,
  initialWhatIf = false
}: DecisionWorkbenchProps) {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const [whatIfMode, setWhatIfMode] = useState(initialWhatIf);
  const [selectedScenario, setSelectedScenario] = useState<typeof SCENARIOS[0]>(SCENARIOS[0]);
  const [scenarioResult, setScenarioResult] = useState<WhatIfResponse | null>(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioError, setScenarioError] = useState<string | null>(null);

  let cryptoAssetId = '';
  let pathEdgeLabel = '';
  graph.edges.forEach(edge => {
    if (edge.relationType === 'USES_CRYPTO' && edge.metadata?.pathId === cryptoPathId) {
      cryptoAssetId = edge.target;
      pathEdgeLabel = edge.metadata?.pathName || cryptoPathId;
    }
  });

  useEffect(() => {
    if (whatIfMode) {
      handleRunScenario(selectedScenario);
    }
  }, [whatIfMode, selectedScenario]);

  const handleRunScenario = async (scenario: typeof SCENARIOS[0]) => {
    setScenarioLoading(true);
    setScenarioError(null);
    setScenarioResult(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/projects/${projectId}/findings/${cryptoAssetId.replace('crypto:', '')}/what-if`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          scenario_type: scenario.id, 
          overrides: scenario.overrides,
          crypto_path_id: cryptoPathId 
        })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to run scenario');
      }
      const data = await res.json();
      setScenarioResult(data);
    } catch (err: any) {
      setScenarioError(err.message);
    } finally {
      setScenarioLoading(false);
    }
  };

  if (!cryptoAssetId) {
    return (
      <div className="w-[500px] h-full backdrop-blur-2xl border-l shadow-2xl p-5" style={{ backgroundColor: GLASS_SURFACE + 'F5', borderColor: MUTED_TEXT + '30' }}>
        <h2 className="text-lg font-bold" style={{ color: PRIMARY_TEXT }}>Invalid Path</h2>
        <p style={{ color: MUTED_TEXT }}>Could not find an asset linked to this CryptoPath ID.</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 rounded bg-slate-800 text-white">Close</button>
      </div>
    );
  }

  // Resolve baseline relationships
  const outgoing = graph.edgesBySource.get(cryptoAssetId) || [];
  let dataAssetId = '';
  let keyContextId = '';
  let serviceEntrypoint = '';

  outgoing.forEach(edge => {
    if (edge.relationType === 'PROTECTS') dataAssetId = edge.target;
    if (edge.relationType === 'USES_KEY') keyContextId = edge.target;
    if (edge.relationType === 'EXPOSED_THROUGH') {
      const targetNode = graph.nodeIndex.get(edge.target);
      if (targetNode?.data.category === 'SERVICE') serviceEntrypoint = targetNode.data.service.entrypoint;
    }
  });

  const cryptoAssetNode = graph.nodeIndex.get(cryptoAssetId);
  const dataAssetNode = dataAssetId ? graph.nodeIndex.get(dataAssetId) : null;
  const keyContextNode = keyContextId ? graph.nodeIndex.get(keyContextId) : null;

  const cryptoAsset = cryptoAssetNode?.data.category === 'CRYPTO_ASSET' ? cryptoAssetNode.data.cryptoAsset : null;
  const dataAsset = dataAssetNode?.data.category === 'DATA_ASSET' ? dataAssetNode.data.dataAsset : null;
  const keyContext = keyContextNode?.data.category === 'KEY_CONTEXT' ? keyContextNode.data.keyContext : null;
  
  let analysisId = '';
  const cryptoOutgoing = graph.edgesBySource.get(cryptoAssetId) || [];
  cryptoOutgoing.forEach(edge => {
    if (edge.relationType === 'ANALYZED_BY') {
      if (edge.metadata?.pathId === cryptoPathId) {
        analysisId = edge.target;
      }
    }
  });
  if (!analysisId) {
    cryptoOutgoing.forEach(edge => {
      if (edge.relationType === 'ANALYZED_BY') {
        analysisId = edge.target;
      }
    });
  }

  const analysisNode = analysisId ? graph.nodeIndex.get(analysisId) : null;
  const analysis = analysisNode?.data.category === 'ANALYSIS' ? analysisNode.data.analysis : null;
  const actionCandidates: ActionCandidate[] = analysis?.actionCandidates || [];

  return (
    <div className={`h-full backdrop-blur-3xl border-l shadow-2xl flex flex-col transition-all duration-300 ${whatIfMode ? 'w-[900px]' : 'w-[600px]'}`} style={{ backgroundColor: GLASS_SURFACE + 'FA', borderColor: MUTED_TEXT + '30' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 p-6 border-b flex justify-between items-start" style={{ borderColor: MUTED_TEXT + '20', background: `linear-gradient(to bottom, ${RAISED_GLASS}F5, ${GLASS_SURFACE}F5)` }}>
        <div>
          <div className="flex items-center gap-2 mb-2 cursor-pointer hover:opacity-80" onClick={() => whatIfMode ? setWhatIfMode(false) : onClose()} style={{ color: MUTED_TEXT }}>
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {whatIfMode ? "Return to Baseline" : "Return to Investigation"}
            </span>
          </div>
          <h2 className="text-2xl font-bold" style={{ color: PRIMARY_TEXT }}>Decision Workbench</h2>
          <div className="text-sm font-mono mt-1" style={{ color: whatIfMode ? SCENARIO_PINK : ANALYSIS_PURPLE }}>
            {whatIfMode ? 'What-If Counterfactual' : pathEdgeLabel}
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg transition-all hover:scale-110" style={{ backgroundColor: RAISED_GLASS, border: `1px solid ${MUTED_TEXT}30`, color: MUTED_TEXT }}>
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col">
        {!whatIfMode ? (
          <div className="space-y-8">
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: MUTED_TEXT }}>Current Posture</h3>
              <div className="space-y-0 text-sm" style={{ backgroundColor: RAISED_GLASS + '30', borderRadius: '12px', border: `1px solid ${MUTED_TEXT}20`, overflow: 'hidden' }}>
                <InfoRow label="Algorithm" value={cryptoAsset?.algorithm || 'N/A'} mono />
                <InfoRow label="Role" value={cryptoAsset?.role || 'N/A'} />
                <InfoRow label="Service / Entrypoint" value={serviceEntrypoint || 'N/A'} mono />
                <InfoRow label="Runtime State" value={cryptoAssetNode?.data.evidenceState?.runtimeObserved ? 'OBSERVED' : 'NOT OBSERVED'} color={cryptoAssetNode?.data.evidenceState?.runtimeObserved ? CRYPTO_TEAL : MUTED_TEXT} />
                <InfoRow label="Data Asset" value={dataAsset?.name || 'N/A'} />
                <InfoRow label="Sensitivity" value={dataAsset?.sensitivity || 'N/A'} />
                <InfoRow label="Migration Effort" value={analysis?.migrationEffort || 'N/A'} />
                <InfoRow label="Protection Runway" value={analysis?.runwayState?.replace(/_/g, ' ') || 'N/A'} />
                <InfoRow label="Crypto Agility" value={analysis?.cryptoAgilityState?.replace(/_/g, ' ') || 'N/A'} />
              </div>
            </section>
            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: MUTED_TEXT }}>Why This Matters</h3>
              <div className="p-4 rounded-xl space-y-3" style={{ backgroundColor: RAISED_GLASS + '80', border: `1px solid ${MUTED_TEXT}20` }}>
                {cryptoAssetNode?.data.evidenceState?.reachable && (
                  <div className="flex gap-3 text-sm"><span style={{ color: CRYPTO_TEAL }}>•</span> <span style={{ color: PRIMARY_TEXT }}>Reachable from application entrypoint.</span></div>
                )}
                {cryptoAssetNode?.data.evidenceState?.runtimeObserved && (
                  <div className="flex gap-3 text-sm"><span style={{ color: CRYPTO_TEAL }}>•</span> <span style={{ color: PRIMARY_TEXT }}>Confirmed active in runtime execution.</span></div>
                )}
                {analysis?.runwayState && (
                  <div className="flex gap-3 text-sm"><span style={{ color: CRYPTO_TEAL }}>•</span> <span style={{ color: PRIMARY_TEXT }}>Protection Runway is {analysis.runwayState.replace(/_/g, ' ')}.</span></div>
                )}
              </div>
            </section>
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: MUTED_TEXT }}>Action Candidates</h3>
              <div className="space-y-0 text-sm" style={{ backgroundColor: RAISED_GLASS + '30', borderRadius: '12px', border: `1px solid ${MUTED_TEXT}20`, overflow: 'hidden' }}>
                {actionCandidates.length > 0 ? (
                  actionCandidates.map(candidate => (
                    <div key={candidate.id} className="p-3 border-b last:border-b-0" style={{ borderColor: MUTED_TEXT + '15' }}>
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: ANALYSIS_PURPLE }}>
                        {candidate.action_type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-sm font-medium" style={{ color: PRIMARY_TEXT }}>{candidate.why}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm" style={{ color: MUTED_TEXT }}>
                    No specific action candidates generated by the engine.
                  </div>
                )}
              </div>
            </section>
            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: MUTED_TEXT }}>Evidence Trace</h3>
              <button onClick={() => onViewEvidence(cryptoAssetId)} className="flex items-center gap-2 text-sm font-semibold transition-colors hover:opacity-80" style={{ color: CRYPTO_TEAL }}>
                <ChevronRight className="w-4 h-4" /> View supporting evidence in graph
              </button>
            </section>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="flex gap-4 mb-4">
              {SCENARIOS.map(sc => (
                <button 
                  key={sc.id}
                  onClick={() => setSelectedScenario(sc)}
                  className="px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors border"
                  style={{ 
                    backgroundColor: selectedScenario.id === sc.id ? SCENARIO_PINK + '20' : RAISED_GLASS,
                    color: selectedScenario.id === sc.id ? SCENARIO_PINK : MUTED_TEXT,
                    borderColor: selectedScenario.id === sc.id ? SCENARIO_PINK + '50' : MUTED_TEXT + '30'
                  }}
                >
                  {sc.label}
                </button>
              ))}
            </div>

            {scenarioLoading && (
              <div className="py-12 flex flex-col items-center justify-center text-sm" style={{ color: MUTED_TEXT }}>
                <Beaker className="w-8 h-8 animate-pulse mb-4" style={{ color: SCENARIO_PINK }} />
                Simulating {selectedScenario.label}...
              </div>
            )}
            
            {scenarioError && !scenarioLoading && (
              <div className="p-6 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200">
                <h3 className="font-bold mb-2">SCENARIO NOT AVAILABLE</h3>
                <p className="text-sm">{scenarioError}</p>
              </div>
            )}

            {!scenarioLoading && !scenarioError && scenarioResult && (
              <>
                <div className="grid grid-cols-2 gap-8 relative">
                  <div className="absolute left-1/2 top-0 bottom-0 w-px -ml-px bg-slate-700/50" />
                  
                  {/* BASELINE */}
                  <div className="space-y-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-center py-1 rounded" style={{ backgroundColor: RAISED_GLASS, color: PRIMARY_TEXT }}>
                      CURRENT BASELINE
                    </div>
                    <div className="space-y-0 text-sm" style={{ backgroundColor: RAISED_GLASS + '30', borderRadius: '8px', border: `1px solid ${MUTED_TEXT}20`, overflow: 'hidden' }}>
                      <InfoRow label="Algorithm" value={cryptoAsset?.algorithm || 'N/A'} mono />
                      <InfoRow label="Runtime State" value={cryptoAssetNode?.data.evidenceState?.runtimeObserved ? 'OBSERVED' : 'NOT OBSERVED'} />
                      <InfoRow label="Migration Effort" value={analysis?.migrationEffort || 'N/A'} />
                      <InfoRow label="Protection Runway" value={analysis?.runwayState?.replace(/_/g, ' ') || 'N/A'} />
                      <InfoRow label="Crypto Agility" value={analysis?.cryptoAgilityState?.replace(/_/g, ' ') || 'N/A'} />
                    </div>
                  </div>

                  {/* SCENARIO */}
                  <div className="space-y-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-center py-1 rounded" style={{ backgroundColor: SCENARIO_PINK + '20', color: SCENARIO_PINK }}>
                      PROJECTED STATE
                    </div>
                    <div className="space-y-0 text-sm opacity-90" style={{ backgroundColor: RAISED_GLASS + '30', borderRadius: '8px', border: `1px solid ${SCENARIO_PINK}30`, overflow: 'hidden' }}>
                      <InfoRow label="Algorithm" value={cryptoAsset?.algorithm || 'N/A'} mono />
                      <InfoRow label="Runtime State" value={cryptoAssetNode?.data.evidenceState?.runtimeObserved ? 'OBSERVED' : 'NOT OBSERVED'} />
                      <InfoRow label="Migration Effort" value={scenarioResult.deltas.find(d => d.dimension === 'Migration Effort')?.simulated_value || 'UNKNOWN'} color={SCENARIO_PINK} />
                      <InfoRow label="Protection Runway" value={scenarioResult.deltas.find(d => d.dimension === 'Protection Runway')?.simulated_value?.replace(/_/g, ' ') || 'UNKNOWN'} color={SCENARIO_PINK} />
                      <InfoRow label="Crypto Agility" value={scenarioResult.deltas.find(d => d.dimension === 'Crypto Agility')?.simulated_value?.replace(/_/g, ' ') || 'UNKNOWN'} color={SCENARIO_PINK} />
                    </div>
                  </div>
                </div>

                {/* DELTA VIEW */}
                <div className="mt-8">
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center justify-center" style={{ color: SCENARIO_PINK }}>
                    <span className="w-full h-px bg-slate-700/50 mr-4" />
                    Delta
                    <span className="w-full h-px bg-slate-700/50 ml-4" />
                  </h3>
                  
                    {scenarioResult.deltas.every(d => d.delta === 'UNCHANGED') ? (
                      <div className="p-4 rounded-xl text-center space-y-2" style={{ backgroundColor: RAISED_GLASS, border: `1px solid ${MUTED_TEXT}30` }}>
                        <div className="text-sm font-bold text-[#EAF0F6]">No modeled change</div>
                        <div className="text-xs text-[#A8B4C2] leading-relaxed">
                          The current rule-first evaluation engine calculated identical posture metrics for this scenario based on the provided baseline evidence context.
                        </div>
                      </div>
                    ) : (
                      scenarioResult.deltas.map((d, i) => {
                        let badgeColor = MUTED_TEXT;
                        if (d.delta === 'IMPROVED' || d.delta === 'NEW') badgeColor = '#60F1D0';
                        if (d.delta === 'WORSENED' || d.delta === 'REMOVED') badgeColor = '#FF8B8B';
                        if (d.delta === 'CHANGED') badgeColor = '#FFD166';

                        return (
                          <div key={i} className="p-4 rounded-xl flex items-center justify-between" style={{ backgroundColor: RAISED_GLASS, border: `1px solid ${badgeColor}30` }}>
                            <div className="flex-1">
                              <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED_TEXT }}>{d.dimension}</div>
                              <div className="flex items-center gap-3 text-sm">
                                <span className="line-through opacity-50" style={{ color: PRIMARY_TEXT }}>{d.baseline_value || 'None'}</span>
                                <ChevronRight className="w-4 h-4 opacity-50" style={{ color: badgeColor }} />
                                <span className="font-bold" style={{ color: badgeColor }}>{d.simulated_value || 'None'}</span>
                              </div>
                            </div>
                            <div className="px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest border" style={{ backgroundColor: badgeColor + '15', color: badgeColor, borderColor: badgeColor + '30' }}>
                              {d.delta}
                            </div>
                          </div>
                        );
                      })
                    )}
                </div>

                {/* EXPLAINABILITY */}
                <div className="mt-8 space-y-4">
                  {scenarioResult.assumptions.length > 0 && (
                    <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">Assumptions Made</h4>
                      <ul className="text-sm space-y-1 text-blue-100/80 list-disc pl-4">
                        {scenarioResult.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                    </div>
                  )}
                  {scenarioResult.unknowns.length > 0 && (
                    <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-2">Unknown Factors</h4>
                      <ul className="text-sm space-y-1 text-amber-100/80 list-disc pl-4">
                        {scenarioResult.unknowns.map((u, i) => <li key={i}>{u}</li>)}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="mt-8 text-center">
                  <button onClick={() => { setWhatIfMode(false); onViewEvidence(cryptoAssetId); }} className="text-xs font-semibold uppercase tracking-widest hover:opacity-80 transition-opacity" style={{ color: CRYPTO_TEAL }}>
                    VIEW BASELINE EVIDENCE
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      
      {!whatIfMode && (
        <div className="p-6 border-t flex justify-between items-center" style={{ borderColor: MUTED_TEXT + '20', backgroundColor: RAISED_GLASS + '80' }}>
          <div className="text-sm font-semibold" style={{ color: PRIMARY_TEXT }}>CURRENT BASELINE</div>
          <button onClick={() => setWhatIfMode(true)} className="px-6 py-2.5 rounded-lg text-sm font-bold transition-all hover:scale-105" style={{ backgroundColor: ANALYSIS_PURPLE, color: '#FFF' }}>
            EXPLORE WHAT-IF
          </button>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, color = PRIMARY_TEXT, mono = false }: { label: string; value: string; color?: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center p-3 border-b last:border-b-0" style={{ borderColor: MUTED_TEXT + '15' }}>
      <div className="text-xs uppercase tracking-wider" style={{ color: MUTED_TEXT }}>{label}</div>
      <div className={`text-sm ${mono ? 'font-mono' : 'font-medium'}`} style={{ color }}>{value}</div>
    </div>
  );
}
