'use client';

import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';

interface CryptoAssetNodeProps {
  data: {
    asset: any;
    evidenceState: {
      discovered: boolean;
      reachable: boolean;
      runtimeObserved: boolean;
    };
    reachability?: any;
    runtimeEvents: any[];
    analysis?: any;
    onSelect: () => void;
  };
}

function CryptoAssetNode({ data }: CryptoAssetNodeProps) {
  const { asset, evidenceState, runtimeEvents, analysis } = data;

  // Determine node status color
  const getStatusColor = () => {
    if (evidenceState.runtimeObserved) return 'border-green-500 bg-green-50';
    if (evidenceState.reachable) return 'border-amber-500 bg-amber-50';
    return 'border-gray-400 bg-white';
  };

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 shadow-lg ${getStatusColor()} min-w-[250px] cursor-pointer hover:shadow-xl transition-shadow`}
      onClick={data.onSelect}
    >
      <Handle type="target" position={Position.Left} />
      
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">{asset.name}</h3>
          {evidenceState.runtimeObserved && (
            <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
              {runtimeEvents.length} event{runtimeEvents.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Algorithm */}
        <div className="text-sm text-gray-600">
          <span className="font-mono bg-gray-200 px-2 py-0.5 rounded">
            {asset.algorithm}
          </span>
        </div>

        {/* Evidence State */}
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="font-medium">DISCOVERED</span>
          </div>
          
          <div className="flex items-center gap-2">
            {evidenceState.reachable ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : (
              <Circle className="w-4 h-4 text-gray-400" />
            )}
            <span className={evidenceState.reachable ? 'font-medium' : 'text-gray-500'}>
              REACHABLE
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {evidenceState.runtimeObserved ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : (
              <Circle className="w-4 h-4 text-gray-400" />
            )}
            <span className={evidenceState.runtimeObserved ? 'font-medium' : 'text-gray-500'}>
              RUNTIME OBSERVED
            </span>
          </div>
        </div>

        {/* Analysis Result */}
        {analysis && (
          <div className="pt-2 border-t border-gray-300">
            <div className="text-xs space-y-1">
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
                <span className="text-gray-600">Effort:</span>
                <span className="font-medium">{analysis.migration_effort}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export default memo(CryptoAssetNode);
