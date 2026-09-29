/**
 * Investigation Node Renderer
 * 
 * Category-specific rendering using GlassNode foundation.
 * Design spec colors from TASK 20A.
 */

'use client';

import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { InvestigationNodeData } from '@/types/investigation-graph';

interface InvestigationNodeProps {
  data: {
    nodeData: InvestigationNodeData;
    isSelected: boolean;
    isDimmed: boolean;
    isExpanded: boolean;
    hasChildren: boolean;
    onSelect: () => void;
    onToggleExpand?: () => void;
  };
}

// Design spec colors from TASK 20A
const GLASS_SURFACE = '#151C25';
const RAISED_GLASS = '#1C2632';
const PRIMARY_TEXT = '#EAF0F6';
const MUTED_TEXT = '#A8B4C2';

// Category colors from design spec
const DATA_BLUE = '#75B7FF';
const CRYPTO_TEAL = '#60F1D0';
const KEY_AMBER = '#FFBF72';
const ANALYSIS_PURPLE = '#8B7CFF';
const NEUTRAL_SLATE = '#8A96A6';

function InvestigationNode({ data }: InvestigationNodeProps) {
  const { nodeData, isSelected, isDimmed, isExpanded, hasChildren, onSelect, onToggleExpand } = data;

  // Get category-specific styling
  const getCategoryStyle = () => {
    const baseAlpha = isDimmed ? '40' : nodeData.evidenceState?.runtimeObserved ? 'E6' : 'CC';
    const borderAlpha = isDimmed ? '20' : isSelected ? 'E6' : nodeData.evidenceState?.runtimeObserved ? '60' : '40';

    switch (nodeData.category) {
      case 'DATA_ASSET':
        return {
          accentColor: DATA_BLUE,
          backgroundColor: GLASS_SURFACE + baseAlpha,
          borderColor: DATA_BLUE + borderAlpha,
        };
      case 'CRYPTO_ASSET':
        return {
          accentColor: CRYPTO_TEAL,
          backgroundColor: GLASS_SURFACE + baseAlpha,
          borderColor: CRYPTO_TEAL + borderAlpha,
        };
      case 'KEY_CONTEXT':
      case 'CERTIFICATE':
        return {
          accentColor: KEY_AMBER,
          backgroundColor: GLASS_SURFACE + baseAlpha,
          borderColor: KEY_AMBER + borderAlpha,
        };
      case 'ANALYSIS':
        return {
          accentColor: ANALYSIS_PURPLE,
          backgroundColor: GLASS_SURFACE + baseAlpha,
          borderColor: ANALYSIS_PURPLE + borderAlpha,
        };
      case 'SERVICE':
      case 'CONTROL':
        return {
          accentColor: NEUTRAL_SLATE,
          backgroundColor: GLASS_SURFACE + baseAlpha,
          borderColor: NEUTRAL_SLATE + borderAlpha,
        };
      default:
        return {
          accentColor: MUTED_TEXT,
          backgroundColor: GLASS_SURFACE + baseAlpha,
          borderColor: MUTED_TEXT + borderAlpha,
        };
    }
  };

  const style = getCategoryStyle();

  return (
    <div
      className={`rounded-[24px] shadow-2xl backdrop-blur-md transition-all duration-200 cursor-pointer min-w-[280px] max-w-[320px] ${
        isSelected ? 'scale-105' : 'hover:scale-[1.02]'
      }`}
      style={{
        backgroundColor: style.backgroundColor,
        borderWidth: isSelected ? '2px' : '1px',
        borderStyle: 'solid',
        borderColor: isSelected ? style.accentColor : style.borderColor,
        opacity: isDimmed ? 0.25 : 1,
        boxShadow: isSelected ? `0 0 20px ${style.accentColor}40` : undefined,
      }}
      onClick={onSelect}
    >
      {/* Subtle inner highlight for glass effect */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${PRIMARY_TEXT}08 0%, transparent 50%)`,
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
          border: `2px solid ${style.accentColor}60`,
        }}
      />

      <div className="relative z-10 px-5 py-4">
        {/* Expand/Collapse Control */}
        {hasChildren && onToggleExpand && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-150 hover:scale-125 opacity-60 hover:opacity-100 z-20"
            style={{
              color: style.accentColor,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronDown className="w-5 h-5" strokeWidth={2.5} />
            ) : (
              <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
            )}
          </button>
        )}

        {nodeData.category === 'DATA_ASSET' && <DataAssetContent nodeData={nodeData} accentColor={style.accentColor} />}
        {nodeData.category === 'CRYPTO_ASSET' && <CryptoAssetContent nodeData={nodeData} accentColor={style.accentColor} />}
        {nodeData.category === 'KEY_CONTEXT' && <KeyContextContent nodeData={nodeData} accentColor={style.accentColor} />}
        {nodeData.category === 'CERTIFICATE' && <CertificateContent nodeData={nodeData} accentColor={style.accentColor} />}
        {nodeData.category === 'SERVICE' && <ServiceContent nodeData={nodeData} accentColor={style.accentColor} />}
        {nodeData.category === 'CONTROL' && <ControlContent nodeData={nodeData} accentColor={style.accentColor} />}
        {nodeData.category === 'ANALYSIS' && <AnalysisContent nodeData={nodeData} accentColor={style.accentColor} />}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 10,
          height: 10,
          backgroundColor: GLASS_SURFACE,
          border: `2px solid ${style.accentColor}60`,
        }}
      />
    </div>
  );
}

// Category-specific content components

function DataAssetContent({ nodeData, accentColor }: { nodeData: InvestigationNodeData; accentColor: string }) {
  if (nodeData.category !== 'DATA_ASSET') return null;
  const { dataAsset } = nodeData;

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-base leading-tight" style={{ color: PRIMARY_TEXT }}>
        {dataAsset.name}
      </h3>
      {dataAsset.classification && (
        <div className="text-xs font-medium" style={{ color: accentColor }}>
          {dataAsset.classification}
        </div>
      )}
      {dataAsset.sensitivity && (
        <div className="text-xs" style={{ color: MUTED_TEXT }}>
          Sensitivity: {dataAsset.sensitivity}
        </div>
      )}
    </div>
  );
}

function CryptoAssetContent({ nodeData, accentColor }: { nodeData: InvestigationNodeData; accentColor: string }) {
  if (nodeData.category !== 'CRYPTO_ASSET') return null;
  const { cryptoAsset, evidenceState } = nodeData;

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-base leading-tight" style={{ color: PRIMARY_TEXT }}>
        {cryptoAsset.name}
      </h3>
      <code
        className="font-mono text-sm px-2.5 py-1 rounded-lg inline-block"
        style={{
          backgroundColor: RAISED_GLASS + 'CC',
          color: accentColor,
          border: `1px solid ${MUTED_TEXT}20`,
        }}
      >
        {cryptoAsset.algorithm}
      </code>
      <div className="text-xs" style={{ color: MUTED_TEXT }}>
        {cryptoAsset.role}
      </div>
      {evidenceState && (
        <div className="space-y-1.5 pt-2" style={{ borderTop: `1px solid ${MUTED_TEXT}20` }}>
          <EvidenceDot label="DISCOVERED" active={evidenceState.discovered} />
          <EvidenceDot label="REACHABLE" active={evidenceState.reachable} />
          <EvidenceDot label="RUNTIME OBS" active={evidenceState.runtimeObserved} />
        </div>
      )}
    </div>
  );
}

function KeyContextContent({ nodeData, accentColor }: { nodeData: InvestigationNodeData; accentColor: string }) {
  if (nodeData.category !== 'KEY_CONTEXT') return null;
  const { keyContext } = nodeData;

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-base leading-tight" style={{ color: PRIMARY_TEXT }}>
        {keyContext.keyIdName}
      </h3>
      {keyContext.algorithm && (
        <code
          className="font-mono text-sm px-2.5 py-1 rounded-lg inline-block"
          style={{
            backgroundColor: RAISED_GLASS + 'CC',
            color: accentColor,
            border: `1px solid ${MUTED_TEXT}20`,
          }}
        >
          {keyContext.algorithm}
        </code>
      )}
      {keyContext.scope && (
        <div className="text-xs" style={{ color: MUTED_TEXT }}>
          Scope: {keyContext.scope}
        </div>
      )}
    </div>
  );
}

function CertificateContent({ nodeData, accentColor }: { nodeData: InvestigationNodeData; accentColor: string }) {
  if (nodeData.category !== 'CERTIFICATE') return null;
  const { certificate } = nodeData;

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-sm leading-tight" style={{ color: PRIMARY_TEXT }}>
        {certificate.name}
      </h3>
      <code
        className="font-mono text-xs px-2.5 py-1 rounded-lg inline-block"
        style={{
          backgroundColor: RAISED_GLASS + 'CC',
          color: accentColor,
          border: `1px solid ${MUTED_TEXT}20`,
        }}
      >
        {certificate.algorithm}
      </code>
      {certificate.issuer && (
        <div className="text-xs" style={{ color: MUTED_TEXT }}>
          Issuer: {certificate.issuer}
        </div>
      )}
    </div>
  );
}

function ServiceContent({ nodeData, accentColor }: { nodeData: InvestigationNodeData; accentColor: string }) {
  if (nodeData.category !== 'SERVICE') return null;
  const { service } = nodeData;

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-base leading-tight font-mono" style={{ color: PRIMARY_TEXT }}>
        {service.entrypoint}
      </h3>
      <div className="text-xs" style={{ color: MUTED_TEXT }}>
        {service.pathCount} {service.pathCount === 1 ? 'path' : 'paths'}
      </div>
    </div>
  );
}

function ControlContent({ nodeData, accentColor }: { nodeData: InvestigationNodeData; accentColor: string }) {
  if (nodeData.category !== 'CONTROL') return null;
  const { control } = nodeData;

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-base leading-tight" style={{ color: PRIMARY_TEXT }}>
        {control.controlName}
      </h3>
      <div
        className="text-xs font-medium px-2 py-1 rounded inline-block"
        style={{
          backgroundColor: RAISED_GLASS + '80',
          color: control.controlState === 'PRESENT' ? CRYPTO_TEAL : 
                 control.controlState === 'ABSENT' ? '#FF7A90' : MUTED_TEXT,
        }}
      >
        {control.controlState}
      </div>
    </div>
  );
}

function AnalysisContent({ nodeData, accentColor }: { nodeData: InvestigationNodeData; accentColor: string }) {
  if (nodeData.category !== 'ANALYSIS') return null;
  const { analysis } = nodeData;

  return (
    <div className="space-y-2">
      <h3 className="font-bold text-sm" style={{ color: PRIMARY_TEXT }}>
        Analysis
      </h3>
      <div className="space-y-1.5 text-xs">
        {analysis.runwayState && (
          <div className="flex justify-between">
            <span style={{ color: MUTED_TEXT }}>Runway</span>
            <span style={{ color: PRIMARY_TEXT }} className="font-medium">
              {analysis.runwayState}
            </span>
          </div>
        )}
        {analysis.migrationEffort && (
          <div className="flex justify-between">
            <span style={{ color: MUTED_TEXT }}>Effort</span>
            <span style={{ color: PRIMARY_TEXT }} className="font-medium">
              {analysis.migrationEffort}
            </span>
          </div>
        )}
        {analysis.cryptoAgilityState && (
          <div className="flex justify-between">
            <span style={{ color: MUTED_TEXT }}>Agility</span>
            <span style={{ color: PRIMARY_TEXT }} className="font-medium">
              {analysis.cryptoAgilityState}
            </span>
          </div>
        )}
      </div>
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
          backgroundColor: active ? CRYPTO_TEAL : MUTED_TEXT + '40',
          boxShadow: active ? `0 0 8px ${CRYPTO_TEAL}80` : 'none',
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

export default memo(InvestigationNode);
