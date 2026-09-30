'use client';

import { X } from 'lucide-react';
import type { CryptoAsset, ReachabilityResult, RuntimeEvent, AnalysisResult } from '@/types/investigation';
import EvidenceStateBadge from './EvidenceStateBadge';

// Design spec colors
const GLASS_SURFACE = '#151C25';
const RAISED_GLASS = '#1C2632';
const PRIMARY_TEXT = '#EAF0F6';
const MUTED_TEXT = '#A8B4C2';
const EVIDENCE_TEAL = '#60F1D0';

interface InvestigationDrawerProps {
  assetId: string;
  asset?: CryptoAsset;
  reachability?: ReachabilityResult;
  runtimeEvents: RuntimeEvent[];
  analysis?: AnalysisResult;
  onClose: () => void;
}

export default function InvestigationDrawer({
  asset,
  reachability,
  runtimeEvents,
  analysis,
  onClose,
}: InvestigationDrawerProps) {
  if (!asset) return null;

  const discovered = true;
  const reachable = reachability?.status === 'REACHABLE';
  const runtimeObserved = runtimeEvents.length > 0;

  return (
    <div className="
      w-[420px] max-w-[40vw] h-full
      liquid-glass
      border-l border-[#A8B4C2]/15
      shadow-2xl
      overflow-y-auto
      flex flex-col
    " style={{ borderRadius: 0 }}>
      {/* Glass Header */}
      <div className="
        sticky top-0 z-20
        bg-gradient-to-br from-slate-800/95 to-slate-900/95
        backdrop-blur-2xl
        border-b border-slate-700/50
        p-5
        flex items-center justify-between
      ">
        <h2 className="text-lg font-bold text-white">Investigation Detail</h2>
        <button
          onClick={onClose}
          className="
            p-2 rounded-lg
            bg-slate-800/50 hover:bg-slate-700/50
            text-slate-300 hover:text-white
            border border-slate-700/30
            transition-all duration-200
          "
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 space-y-6 flex-1">
        {/* Crypto Asset */}
        <section>
          <h3 className="
            font-bold text-xs uppercase tracking-wider
            text-slate-400 mb-3
          ">
            Crypto Asset
          </h3>
          <div className="
            bg-slate-800/50 backdrop-blur-sm
            border border-slate-700/50
            rounded-xl p-4
            space-y-3 text-sm
          ">
            <div>
              <span className="text-slate-400">Name:</span>{' '}
              <span className="text-white font-medium">{asset.name}</span>
            </div>
            <div>
              <span className="text-slate-400">Algorithm:</span>{' '}
              <code className="
                bg-slate-900/80 border border-slate-700/50
                px-2 py-1 rounded text-emerald-400 font-mono text-xs
              ">
                {asset.algorithm}
              </code>
            </div>
            <div>
              <span className="text-slate-400">Role:</span>{' '}
              <span className="text-slate-200">{asset.role}</span>
            </div>
            <div>
              <span className="text-slate-400">Type:</span>{' '}
              <span className="text-slate-200">{asset.asset_type}</span>
            </div>
            {asset.source_file && (
              <div>
                <span className="text-slate-400">Source:</span>{' '}
                <code className="
                  bg-slate-900/80 border border-slate-700/50
                  px-2 py-1 rounded text-cyan-400 font-mono text-xs
                  block mt-1
                ">
                  {asset.source_file}:{asset.line_start}
                </code>
              </div>
            )}
          </div>
        </section>

        {/* Evidence State */}
        <section>
          <h3 className="
            font-bold text-xs uppercase tracking-wider
            text-slate-400 mb-3
          ">
            Evidence State
          </h3>
          <div className="space-y-3">
            <EvidenceStateBadge
              label="DISCOVERED"
              description="Found via static scanning"
              active={discovered}
            />
            <EvidenceStateBadge
              label={reachable ? 'REACHABLE' : 'NOT REACHABLE'}
              description={reachable ? 'Control flow path exists' : 'No control flow path found'}
              active={reachable}
            />
            <EvidenceStateBadge
              label={runtimeObserved ? 'RUNTIME OBSERVED' : 'NOT OBSERVED'}
              description={
                runtimeObserved
                  ? `${runtimeEvents.length} execution event${runtimeEvents.length !== 1 ? 's' : ''}`
                  : 'No runtime execution captured'
              }
              active={runtimeObserved}
            />
          </div>
        </section>

        {/* Reachability Evidence */}
        {reachability && (
          <section>
            <h3 className="
              font-bold text-xs uppercase tracking-wider
              text-slate-400 mb-3
            ">
              Reachability Evidence
            </h3>
            <div className="
              bg-slate-800/50 backdrop-blur-sm
              border border-slate-700/50
              rounded-xl p-4
              space-y-2 text-sm
            ">
              <div>
                <span className="text-slate-400">Status:</span>{' '}
                <span className="text-white font-medium">{reachability.status}</span>
              </div>
              {reachability.entrypoint && (
                <div>
                  <span className="text-slate-400">Entrypoint:</span>{' '}
                  <code className="
                    bg-slate-900/80 border border-slate-700/50
                    px-2 py-1 rounded text-cyan-400 font-mono text-xs
                  ">
                    {reachability.entrypoint}
                  </code>
                </div>
              )}
              {reachability.source_file && (
                <div>
                  <span className="text-slate-400">Source:</span>{' '}
                  <code className="
                    bg-slate-900/80 border border-slate-700/50
                    px-2 py-1 rounded text-cyan-400 font-mono text-xs
                    block mt-1
                  ">
                    {reachability.source_file}:{reachability.source_line}
                  </code>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Runtime Evidence */}
        <section>
          <h3 className="
            font-bold text-xs uppercase tracking-wider
            text-slate-400 mb-3
          ">
            Runtime Evidence
          </h3>
          {runtimeObserved ? (
            <div className="space-y-3">
              {runtimeEvents.map((event, index) => (
                <div
                  key={event.id}
                  className="
                    bg-emerald-950/40 backdrop-blur-sm
                    border border-emerald-700/30
                    rounded-xl p-4 text-sm
                  "
                >
                  <div className="font-semibold text-emerald-300 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
                    Event {index + 1}: {event.operation || event.event_type}
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400">Algorithm:</span>{' '}
                      <code className="
                        bg-slate-900/80 border border-slate-700/50
                        px-2 py-0.5 rounded text-emerald-400 font-mono
                      ">
                        {event.algorithm}
                      </code>
                    </div>
                    <div>
                      <span className="text-slate-400">Operation:</span>{' '}
                      <span className="text-slate-200">{event.operation || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Entrypoint:</span>{' '}
                      <code className="
                        bg-slate-900/80 border border-slate-700/50
                        px-2 py-0.5 rounded text-cyan-400 font-mono
                      ">
                        {event.entrypoint}
                      </code>
                    </div>
                    {event.source_file && (
                      <div>
                        <span className="text-slate-400">Source:</span>{' '}
                        <code className="
                          bg-slate-900/80 border border-slate-700/50
                          px-2 py-0.5 rounded text-cyan-400 font-mono
                          block mt-1
                        ">
                          {event.source_file}:{event.source_line}
                        </code>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400">Runtime Run:</span>{' '}
                      <code className="
                        bg-slate-900/80 border border-slate-700/50
                        px-2 py-0.5 rounded text-slate-300 font-mono
                      ">
                        {event.runtime_run_id.slice(0, 8)}...
                      </code>
                    </div>
                    <div>
                      <span className="text-slate-400">Timestamp:</span>{' '}
                      <span className="text-slate-200">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="
                    mt-3 pt-3 border-t border-emerald-800/30
                    text-xs font-semibold text-emerald-400
                  ">
                    ✓ VERIFIED MATCH
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="
              bg-slate-800/50 backdrop-blur-sm
              border border-slate-700/50
              rounded-xl p-4
              text-center text-sm text-slate-400
            ">
              <div className="font-medium text-slate-300">NOT OBSERVED</div>
              <div className="text-xs mt-1">No runtime execution captured</div>
            </div>
          )}
        </section>

        {/* Analysis */}
        {analysis && (
          <section>
            <h3 className="
              font-bold text-xs uppercase tracking-wider
              text-slate-400 mb-3
            ">
              Analysis
            </h3>
            <div className="space-y-4">
              <div className="
                bg-slate-800/50 backdrop-blur-sm
                border border-slate-700/50
                rounded-xl p-4
              ">
                <div className="text-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-slate-400 text-xs">Evidence State</span>
                    <span className="font-medium text-slate-200 text-xs text-right max-w-[200px]">
                      {analysis.evidence_state}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Readiness</span>
                    <span className={`
                      font-semibold px-2.5 py-1 rounded-lg text-xs
                      ${analysis.runway_state === 'COMFORTABLE'
                        ? 'text-emerald-300 bg-emerald-950/50 border border-emerald-700/30'
                        : analysis.runway_state === 'WATCH'
                        ? 'text-orange-300 bg-orange-950/50 border border-orange-700/30'
                        : 'text-red-300 bg-red-950/50 border border-red-700/30'}
                    `}>
                      {analysis.runway_state}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Protection Until</span>
                    <span className="font-medium text-slate-200">
                      {analysis.required_protection_until}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Migration Effort</span>
                    <span className="font-medium text-slate-200">
                      {analysis.migration_effort}
                    </span>
                  </div>
                  {analysis.change_lead_time && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Lead Time</span>
                      <span className="font-medium text-slate-200">
                        {analysis.change_lead_time}
                      </span>
                    </div>
                  )}
                  {analysis.crypto_agility_state && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Crypto Agility</span>
                      <span className="font-medium text-slate-200">
                        {analysis.crypto_agility_state}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Candidates */}
              {analysis.action_candidates && analysis.action_candidates.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-slate-300">
                    Recommended Actions
                  </h4>
                  <div className="space-y-2">
                    {analysis.action_candidates.map((action: any, index: number) => (
                      <div
                        key={index}
                        className="
                          bg-blue-950/40 backdrop-blur-sm
                          border border-blue-700/30
                          rounded-xl p-3 text-sm
                        "
                      >
                        <div className="font-semibold text-blue-300">
                          {action.action_type || 'ACTION'}
                        </div>
                        {action.why && (
                          <div className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                            {action.why}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
