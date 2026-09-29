'use client';

import { X, CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import type { CryptoAsset, ReachabilityResult, RuntimeEvent, AnalysisResult } from '@/types/investigation';

interface EvidencePanelProps {
  assetId: string;
  asset?: CryptoAsset;
  reachability?: ReachabilityResult;
  runtimeEvents: RuntimeEvent[];
  analysis?: AnalysisResult;
  onClose: () => void;
}

export default function EvidencePanel({
  asset,
  reachability,
  runtimeEvents,
  analysis,
  onClose,
}: EvidencePanelProps) {
  if (!asset) return null;

  const discovered = true;
  const reachable = reachability?.status === 'REACHABLE';
  const runtimeObserved = runtimeEvents.length > 0;

  return (
    <div className="w-96 bg-white border-l border-gray-300 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-900 text-white p-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Investigation Detail</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Crypto Asset */}
        <section>
          <h3 className="font-bold text-sm uppercase text-gray-600 mb-2">Crypto Asset</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Name:</span> {asset.name}
            </div>
            <div>
              <span className="font-medium">Algorithm:</span>{' '}
              <code className="bg-gray-100 px-2 py-0.5 rounded">{asset.algorithm}</code>
            </div>
            <div>
              <span className="font-medium">Role:</span> {asset.role}
            </div>
            <div>
              <span className="font-medium">Type:</span> {asset.asset_type}
            </div>
            {asset.source_file && (
              <div>
                <span className="font-medium">Source:</span>{' '}
                <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                  {asset.source_file}:{asset.line_start}
                </code>
              </div>
            )}
          </div>
        </section>

        {/* Evidence State */}
        <section>
          <h3 className="font-bold text-sm uppercase text-gray-600 mb-2">Evidence State</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <div className="font-medium">DISCOVERED</div>
                <div className="text-xs text-gray-600">Found via static scanning</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {reachable ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <Circle className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <div className={`font-medium ${!reachable && 'text-gray-500'}`}>
                  {reachable ? 'REACHABLE' : 'NOT REACHABLE'}
                </div>
                <div className="text-xs text-gray-600">
                  {reachable ? 'Control flow path exists' : 'No control flow path found'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {runtimeObserved ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <Circle className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <div className={`font-medium ${!runtimeObserved && 'text-gray-500'}`}>
                  {runtimeObserved ? 'RUNTIME OBSERVED' : 'NOT OBSERVED'}
                </div>
                <div className="text-xs text-gray-600">
                  {runtimeObserved
                    ? `${runtimeEvents.length} execution event${runtimeEvents.length !== 1 ? 's' : ''}`
                    : 'No runtime execution captured'}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Reachability Evidence */}
        {reachability && (
          <section>
            <h3 className="font-bold text-sm uppercase text-gray-600 mb-2">Reachability Evidence</h3>
            <div className="bg-gray-50 p-3 rounded space-y-2 text-sm">
              <div>
                <span className="font-medium">Status:</span> {reachability.status}
              </div>
              {reachability.entrypoint && (
                <div>
                  <span className="font-medium">Entrypoint:</span>{' '}
                  <code className="bg-white px-2 py-0.5 rounded">{reachability.entrypoint}</code>
                </div>
              )}
              {reachability.source_file && (
                <div>
                  <span className="font-medium">Source:</span>{' '}
                  <code className="bg-white px-2 py-0.5 rounded text-xs">
                    {reachability.source_file}:{reachability.source_line}
                  </code>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Runtime Evidence */}
        <section>
          <h3 className="font-bold text-sm uppercase text-gray-600 mb-2">Runtime Evidence</h3>
          {runtimeObserved ? (
            <div className="space-y-3">
              {runtimeEvents.map((event, index) => (
                <div key={event.id} className="bg-green-50 border border-green-200 p-3 rounded text-sm">
                  <div className="font-medium text-green-900 mb-2">
                    Event {index + 1}: {event.operation || event.event_type}
                  </div>
                  <div className="space-y-1 text-xs">
                    <div>
                      <span className="text-gray-600">Algorithm:</span>{' '}
                      <code className="bg-white px-1 py-0.5 rounded">{event.algorithm}</code>
                    </div>
                    <div>
                      <span className="text-gray-600">Operation:</span> {event.operation || 'N/A'}
                    </div>
                    <div>
                      <span className="text-gray-600">Entrypoint:</span>{' '}
                      <code className="bg-white px-1 py-0.5 rounded">{event.entrypoint}</code>
                    </div>
                    {event.source_file && (
                      <div>
                        <span className="text-gray-600">Source:</span>{' '}
                        <code className="bg-white px-1 py-0.5 rounded">
                          {event.source_file}:{event.source_line}
                        </code>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Runtime Run:</span>{' '}
                      <code className="bg-white px-1 py-0.5 rounded text-xs">
                        {event.runtime_run_id.slice(0, 8)}...
                      </code>
                    </div>
                    <div>
                      <span className="text-gray-600">Timestamp:</span>{' '}
                      {new Date(event.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-green-300">
                    <span className="text-xs text-green-800 font-medium">✓ VERIFIED MATCH</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 p-3 rounded text-sm text-center text-gray-600">
              NOT OBSERVED
              <div className="text-xs mt-1">No runtime execution captured</div>
            </div>
          )}
        </section>

        {/* Analysis */}
        {analysis && (
          <section>
            <h3 className="font-bold text-sm uppercase text-gray-600 mb-2">Analysis</h3>
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Evidence State:</span>
                    <span className="font-medium text-xs">{analysis.evidence_state}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Readiness:</span>
                    <span className={`font-medium ${
                      analysis.runway_state === 'COMFORTABLE' ? 'text-green-600' :
                      analysis.runway_state === 'WATCH' ? 'text-amber-600' :
                      'text-red-600'
                    }`}>
                      {analysis.runway_state}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Protection Until:</span>
                    <span className="font-medium">{analysis.required_protection_until}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Migration Effort:</span>
                    <span className="font-medium">{analysis.migration_effort}</span>
                  </div>
                  {analysis.change_lead_time && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lead Time:</span>
                      <span className="font-medium">{analysis.change_lead_time}</span>
                    </div>
                  )}
                  {analysis.crypto_agility_state && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Crypto Agility:</span>
                      <span className="font-medium">{analysis.crypto_agility_state}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Candidates */}
              {analysis.action_candidates && analysis.action_candidates.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Recommended Actions</h4>
                  <div className="space-y-2">
                    {analysis.action_candidates.map((action: any, index: number) => (
                      <div key={index} className="bg-blue-50 border border-blue-200 p-2 rounded text-sm">
                        <div className="font-medium text-blue-900">{action.action_type || 'ACTION'}</div>
                        {action.why && (
                          <div className="text-xs text-gray-700 mt-1">{action.why}</div>
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
