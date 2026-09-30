'use client';

import { memo } from 'react';
import { Handle, Position } from 'reactflow';

interface GlassNodeProps {
  data: {
    asset: any;
    evidenceState: {
      discovered: boolean;
      reachable: boolean;
      runtimeObserved: boolean;
    };
    runtimeEvents: any[];
    analysis?: any;
    onSelect: () => void;
  };
}

// Design spec colors
const GLASS_SURFACE = '#151C25';
const RAISED_GLASS = '#1C2632';
const PRIMARY_TEXT = '#EAF0F6';
const MUTED_TEXT = '#A8B4C2';
const EVIDENCE_TEAL = '#60F1D0';

function GlassNode({ data }: GlassNodeProps) {
  const { asset, evidenceState, runtimeEvents, analysis } = data;

  // Determine visual treatment based on evidence state
  const getNodeStyle = () => {
    if (evidenceState.runtimeObserved) {
      // Runtime observed - teal accent
      return {
        backgroundColor: GLASS_SURFACE + 'E6',
        borderColor: EVIDENCE_TEAL + '60',
        borderWidth: '1px',
      };
    }
    if (evidenceState.reachable) {
      // Reachable - subtle accent
      return {
        backgroundColor: GLASS_SURFACE + 'E6',
        borderColor: MUTED_TEXT + '50',
        borderWidth: '1px',
      };
    }
    // Discovered only
    return {
      backgroundColor: GLASS_SURFACE + 'CC',
      borderColor: MUTED_TEXT + '30',
      borderWidth: '1px',
    };
  };

  const nodeStyle = getNodeStyle();

  return (
    <div
      className="rounded-2xl shadow-2xl transition-all duration-150 cursor-pointer hover:scale-[1.02] min-w-[280px] max-w-[320px] liquid-glass-card"
      style={{
        ...nodeStyle,
        backdropFilter: 'blur(16px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
      }}
      onClick={data.onSelect}
    >
      {/* Visible frosted glass gradient overlay */}
      <div 
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: `linear-gradient(160deg, ${PRIMARY_TEXT}0A 0%, transparent 35%, ${EVIDENCE_TEAL}06 60%, transparent 100%)`,
        }}
      />
      {/* Top edge shimmer line */}
      <div 
        className="absolute top-0 left-4 right-4 h-px pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, ${PRIMARY_TEXT}20, ${EVIDENCE_TEAL}30, ${PRIMARY_TEXT}20, transparent)`,
        }}
      />

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 10,
          height: 10,
          backgroundColor: GLASS_SURFACE,
          border: `2px solid ${MUTED_TEXT}60`,
        }}
      />

      <div className="relative z-10 px-5 py-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <h3 
            className="font-bold text-base leading-tight flex-1"
            style={{ color: PRIMARY_TEXT }}
          >
            {asset.name}
          </h3>
          {evidenceState.runtimeObserved && runtimeEvents.length > 0 && (
            <span 
              className="text-xs px-2 py-1 rounded-full font-medium shadow-lg"
              style={{
                backgroundColor: EVIDENCE_TEAL + 'E6',
                color: GLASS_SURFACE,
              }}
            >
              {runtimeEvents.length}
            </span>
          )}
        </div>

        {/* Algorithm */}
        <div>
          <code 
            className="font-mono text-sm px-2.5 py-1 rounded-lg"
            style={{
              backgroundColor: RAISED_GLASS + 'CC',
              color: EVIDENCE_TEAL,
              border: `1px solid ${MUTED_TEXT}20`,
            }}
          >
            {asset.algorithm}
          </code>
        </div>

        {/* Evidence State Indicators */}
        <div className="space-y-1.5 pt-1">
          <EvidenceDot label="DISCOVERED" active={evidenceState.discovered} />
          <EvidenceDot label="REACHABLE" active={evidenceState.reachable} />
          <EvidenceDot label="RUNTIME OBSERVED" active={evidenceState.runtimeObserved} />
        </div>

        {/* Analysis Summary */}
        {analysis && (
          <div 
            className="pt-3 mt-3 space-y-2 text-xs"
            style={{
              borderTop: `1px solid ${MUTED_TEXT}20`,
            }}
          >
            <div className="flex justify-between items-center">
              <span style={{ color: MUTED_TEXT }}>Readiness</span>
              <span 
                className="font-semibold px-2 py-0.5 rounded"
                style={{
                  color: analysis.runway_state === 'COMFORTABLE' ? EVIDENCE_TEAL :
                    analysis.runway_state === 'WATCH' ? '#FFBF72' : '#FF7A90',
                  backgroundColor: RAISED_GLASS + '80',
                }}
              >
                {analysis.runway_state}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: MUTED_TEXT }}>Migration</span>
              <span style={{ color: PRIMARY_TEXT }} className="font-medium">
                {analysis.migration_effort}
              </span>
            </div>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 10,
          height: 10,
          backgroundColor: GLASS_SURFACE,
          border: `2px solid ${MUTED_TEXT}60`,
        }}
      />
    </div>
  );
}

// Evidence indicator component
interface EvidenceDotProps {
  label: string;
  active: boolean;
}

function EvidenceDot({ label, active }: EvidenceDotProps) {
  return (
    <div className="flex items-center gap-2">
      <div 
        className="w-1.5 h-1.5 rounded-full transition-all duration-150"
        style={{
          backgroundColor: active ? EVIDENCE_TEAL : MUTED_TEXT + '40',
          boxShadow: active ? `0 0 8px ${EVIDENCE_TEAL}80` : 'none',
        }}
      />
      <span 
        className="text-xs font-medium tracking-wide"
        style={{ color: active ? PRIMARY_TEXT : MUTED_TEXT }}
      >
        {label}
      </span>
    </div>
  );
}

export default memo(GlassNode);
