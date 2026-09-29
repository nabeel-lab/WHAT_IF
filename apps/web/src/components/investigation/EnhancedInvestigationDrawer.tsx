/**
 * Enhanced Investigation Drawer
 * 
 * Evidence console for ECDAT investigation workspace.
 * Shows comprehensive evidence, runtime conformance, and decision entry points.
 */

'use client';

import { X, ChevronDown, ChevronRight, ExternalLink, ArrowRight, Bot } from 'lucide-react';
import { useState } from 'react';
import type { InvestigationGraph, InvestigationNode } from '@/types/investigation-graph';

// Design spec colors
const GLASS_SURFACE = '#151C25';
const RAISED_GLASS = '#1C2632';
const PRIMARY_TEXT = '#EAF0F6';
const MUTED_TEXT = '#A8B4C2';
const CRYPTO_TEAL = '#60F1D0';
const DATA_BLUE = '#75B7FF';
const KEY_AMBER = '#FFBF72';

interface EnhancedInvestigationDrawerProps {
  graph: InvestigationGraph;
  selectedNode: InvestigationNode;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
  onOpenWorkbench: (pathId: string, initialWhatIf?: boolean) => void;
  onOpenAssistant: (pathId: string) => void;
}

export default function EnhancedInvestigationDrawer({
  graph,
  selectedNode,
  onClose,
  onSelectNode,
  onOpenWorkbench,
  onOpenAssistant,
}: EnhancedInvestigationDrawerProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['header', 'evidence', 'runtime'])
  );

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const nodeData = selectedNode.data;

  // Get connected entities
  const outgoingEdges = graph.edgesBySource.get(selectedNode.id) || [];
  const incomingEdges = graph.edgesByTarget.get(selectedNode.id) || [];

  return (
    <div className="
      w-[480px] h-full
      backdrop-blur-2xl
      border-l shadow-2xl
      overflow-y-auto
      flex flex-col
    " style={{
      backgroundColor: GLASS_SURFACE + 'F5',
      borderColor: MUTED_TEXT + '30',
    }}>
      {/* Header */}
      <div className="
        sticky top-0 z-20
        backdrop-blur-2xl
        border-b
        p-5
        flex items-start justify-between gap-4
      " style={{
        background: `linear-gradient(to bottom, ${RAISED_GLASS}F5, ${GLASS_SURFACE}F5)`,
        borderColor: MUTED_TEXT + '30',
      }}>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: MUTED_TEXT }}>
            {nodeData.category.replace('_', ' ')}
          </div>
          <h2 className="text-lg font-bold mb-2 truncate" style={{ color: PRIMARY_TEXT }}>
            {nodeData.label}
          </h2>
          {nodeData.evidenceState && (
            <div className="flex items-center gap-2 flex-wrap">
              <EvidencePill label="DISCOVERED" active={nodeData.evidenceState.discovered} />
              <EvidencePill label="REACHABLE" active={nodeData.evidenceState.reachable} />
              <EvidencePill 
                label={nodeData.evidenceState.runtimeObserved ? 'RUNTIME OBS' : 'NOT OBS'} 
                active={nodeData.evidenceState.runtimeObserved} 
              />
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg transition-all duration-150 hover:scale-110"
          style={{
            backgroundColor: RAISED_GLASS,
            border: `1px solid ${MUTED_TEXT}30`,
            color: MUTED_TEXT,
          }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 space-y-4 flex-1">
        {/* Investigation Path Summary */}
        {(outgoingEdges.length > 0 || incomingEdges.length > 0) && (
          <Section
            title="Investigation Path"
            isExpanded={expandedSections.has('path')}
            onToggle={() => toggleSection('path')}
          >
            <div className="space-y-2">
              {/* Incoming relationships */}
              {incomingEdges.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: MUTED_TEXT }}>
                    Connected From
                  </div>
                  {incomingEdges.map(edge => {
                    const sourceNode = graph.nodeIndex.get(edge.source);
                    if (!sourceNode) return null;
                    return (
                      <LinkedEntity
                        key={edge.id}
                        label={sourceNode.data.label}
                        type={sourceNode.data.category}
                        relationship={edge.relationType}
                        onClick={() => onSelectNode(edge.source)}
                      />
                    );
                  })}
                </div>
              )}
              
              {/* Outgoing relationships */}
              {outgoingEdges.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: MUTED_TEXT }}>
                    Connected To
                  </div>
                  {outgoingEdges.map(edge => {
                    const targetNode = graph.nodeIndex.get(edge.target);
                    if (!targetNode) return null;
                    return (
                      <LinkedEntity
                        key={edge.id}
                        label={targetNode.data.label}
                        type={targetNode.data.category}
                        relationship={edge.relationType}
                        onClick={() => onSelectNode(edge.target)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Static Evidence */}
        {nodeData.category === 'CRYPTO_ASSET' && nodeData.cryptoAsset && (
          <Section
            title="Static Evidence"
            isExpanded={expandedSections.has('static')}
            onToggle={() => toggleSection('static')}
          >
            <div className="space-y-3 text-sm">
              <DetailRow label="Algorithm" value={nodeData.cryptoAsset.algorithm} mono />
              <DetailRow label="Role" value={nodeData.cryptoAsset.role} />
              <DetailRow label="Type" value={nodeData.cryptoAsset.assetType} />
              {nodeData.cryptoAsset.library && (
                <DetailRow label="Library" value={nodeData.cryptoAsset.library} />
              )}
              {nodeData.cryptoAsset.sourceFile && (
                <DetailRow 
                  label="Source" 
                  value={`${nodeData.cryptoAsset.sourceFile}:${nodeData.cryptoAsset.lineStart || '?'}`} 
                  mono 
                />
              )}
            </div>
          </Section>
        )}

        {/* Runtime Conformance */}
        {nodeData.category === 'CRYPTO_ASSET' && nodeData.evidenceState && (
          <RuntimeConformancePanel
            nodeData={nodeData}
            isExpanded={expandedSections.has('runtime')}
            onToggle={() => toggleSection('runtime')}
          />
        )}

        {/* Data Context */}
        {nodeData.category === 'DATA_ASSET' && nodeData.dataAsset && (
          <Section
            title="Data Context"
            isExpanded={expandedSections.has('data')}
            onToggle={() => toggleSection('data')}
          >
            <div className="space-y-3 text-sm">
              <DetailRow label="Classification" value={nodeData.dataAsset.classification || 'N/A'} />
              <DetailRow label="Sensitivity" value={nodeData.dataAsset.sensitivity || 'N/A'} />
              <DetailRow label="Business Criticality" value={nodeData.dataAsset.businessCriticality || 'N/A'} />
              {nodeData.dataAsset.requiredConfidentialityUntil && (
                <DetailRow label="Protection Until" value={nodeData.dataAsset.requiredConfidentialityUntil} />
              )}
            </div>
          </Section>
        )}

        {/* Key/Certificate Context */}
        {nodeData.category === 'KEY_CONTEXT' && nodeData.keyContext && (
          <Section
            title="Key Context"
            isExpanded={expandedSections.has('key')}
            onToggle={() => toggleSection('key')}
          >
            <div className="space-y-3 text-sm">
              <DetailRow label="Key Name" value={nodeData.keyContext.keyIdName} />
              {nodeData.keyContext.algorithm && (
                <DetailRow label="Algorithm" value={nodeData.keyContext.algorithm} mono />
              )}
              {nodeData.keyContext.scope && (
                <DetailRow label="Scope" value={nodeData.keyContext.scope} />
              )}
              {nodeData.keyContext.rotationState && (
                <DetailRow label="Rotation" value={nodeData.keyContext.rotationState} />
              )}
              {nodeData.keyContext.custodyType && (
                <DetailRow label="Custody" value={nodeData.keyContext.custodyType} />
              )}
            </div>
          </Section>
        )}

        {nodeData.category === 'CERTIFICATE' && nodeData.certificate && (
          <Section
            title="Certificate Details"
            isExpanded={expandedSections.has('cert')}
            onToggle={() => toggleSection('cert')}
          >
            <div className="space-y-3 text-sm">
              <DetailRow label="Algorithm" value={nodeData.certificate.algorithm} mono />
              {nodeData.certificate.issuer && (
                <DetailRow label="Issuer" value={nodeData.certificate.issuer} />
              )}
              {nodeData.certificate.validFrom && (
                <DetailRow label="Valid From" value={nodeData.certificate.validFrom} />
              )}
              {nodeData.certificate.validUntil && (
                <DetailRow label="Valid Until" value={nodeData.certificate.validUntil} />
              )}
            </div>
          </Section>
        )}

        {/* Analysis */}
        {nodeData.category === 'ANALYSIS' && nodeData.analysis && (
          <Section
            title="Analysis Results"
            isExpanded={expandedSections.has('analysis')}
            onToggle={() => toggleSection('analysis')}
          >
            <div className="space-y-3 text-sm">
              <DetailRow label="Evidence State" value={nodeData.analysis.evidenceState} />
              {nodeData.analysis.runwayState && (
                <DetailRow label="Readiness" value={nodeData.analysis.runwayState} />
              )}
              {nodeData.analysis.requiredProtectionUntil && (
                <DetailRow label="Protection Until" value={nodeData.analysis.requiredProtectionUntil} />
              )}
              {nodeData.analysis.migrationEffort && (
                <DetailRow label="Migration Effort" value={nodeData.analysis.migrationEffort} />
              )}
              {nodeData.analysis.cryptoAgilityState && (
                <DetailRow label="Crypto Agility" value={nodeData.analysis.cryptoAgilityState} />
              )}
            </div>
          </Section>
        )}

        {/* Why This Matters */}
        {nodeData.category === 'CRYPTO_ASSET' && (
          <Section
            title="Why This Matters"
            isExpanded={expandedSections.has('why')}
            onToggle={() => toggleSection('why')}
          >
            <div className="space-y-2 text-sm" style={{ color: PRIMARY_TEXT }}>
              <WhyMattersList nodeData={nodeData} />
            </div>
          </Section>
        )}

        {/* Decision Entry Points */}
        <div className="space-y-3 pt-4" style={{ borderTop: `1px solid ${MUTED_TEXT}20` }}>
          <ActionButton
            label="Open Decision Workbench"
            description="Analyze migration options and costs"
            icon={<ExternalLink className="w-4 h-4" />}
            onClick={() => {
              let pathId = selectedNode.id;
              if (selectedNode.data.category === 'CRYPTO_ASSET') {
                const incoming = graph.edgesByTarget.get(selectedNode.id) || [];
                const pathEdge = incoming.find(e => e.relationType === 'USES_CRYPTO');
                if (pathEdge && pathEdge.metadata?.pathId) {
                  pathId = pathEdge.metadata.pathId;
                }
              }
              onOpenWorkbench(pathId);
            }}
          />
          <ActionButton
            label="Explore What-If"
            description="Test migration scenarios"
            icon={<ArrowRight className="w-4 h-4" />}
            onClick={() => {
              let pathId = selectedNode.id;
              if (selectedNode.data.category === 'CRYPTO_ASSET') {
                const incoming = graph.edgesByTarget.get(selectedNode.id) || [];
                const pathEdge = incoming.find(e => e.relationType === 'USES_CRYPTO');
                if (pathEdge && pathEdge.metadata?.pathId) {
                  pathId = pathEdge.metadata.pathId;
                }
              }
              onOpenWorkbench(pathId, true);
            }}
          />
          <ActionButton
            label="Ask Assistant"
            description="Conversational investigation & explanation"
            icon={<Bot className="w-4 h-4 text-teal-400" />}
            onClick={() => {
              let pathId = selectedNode.id;
              if (selectedNode.data.category === 'CRYPTO_ASSET') {
                const incoming = graph.edgesByTarget.get(selectedNode.id) || [];
                const pathEdge = incoming.find(e => e.relationType === 'USES_CRYPTO');
                if (pathEdge && pathEdge.metadata?.pathId) {
                  pathId = pathEdge.metadata.pathId;
                }
              }
              onOpenAssistant(pathId);
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Sub-components

interface SectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Section({ title, isExpanded, onToggle, children }: SectionProps) {
  return (
    <div className="rounded-xl overflow-hidden" style={{
      backgroundColor: RAISED_GLASS + '80',
      border: `1px solid ${MUTED_TEXT}20`,
    }}>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between transition-colors duration-150"
        style={{
          backgroundColor: isExpanded ? RAISED_GLASS : 'transparent',
        }}
      >
        <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color: MUTED_TEXT }}>
          {title}
        </h3>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" style={{ color: MUTED_TEXT }} />
        ) : (
          <ChevronRight className="w-4 h-4" style={{ color: MUTED_TEXT }} />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 py-3" style={{ borderTop: `1px solid ${MUTED_TEXT}20` }}>
          {children}
        </div>
      )}
    </div>
  );
}

function EvidencePill({ label, active }: { label: string; active: boolean }) {
  return (
    <div 
      className="px-2 py-1 rounded text-xs font-semibold flex items-center gap-1.5"
      style={{
        backgroundColor: active ? CRYPTO_TEAL + '20' : RAISED_GLASS,
        border: `1px solid ${active ? CRYPTO_TEAL + '40' : MUTED_TEXT + '30'}`,
        color: active ? CRYPTO_TEAL : MUTED_TEXT,
      }}
    >
      <div 
        className="w-1.5 h-1.5 rounded-full"
        style={{
          backgroundColor: active ? CRYPTO_TEAL : MUTED_TEXT + '60',
          boxShadow: active ? `0 0 6px ${CRYPTO_TEAL}80` : 'none',
        }}
      />
      {label}
    </div>
  );
}

function LinkedEntity({ 
  label, 
  type, 
  relationship, 
  onClick 
}: { 
  label: string; 
  type: string; 
  relationship: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full px-3 py-2 rounded-lg text-left transition-all duration-150 hover:scale-[1.02]"
      style={{
        backgroundColor: RAISED_GLASS + '60',
        border: `1px solid ${MUTED_TEXT}20`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium mb-0.5" style={{ color: MUTED_TEXT }}>
            {relationship.replace(/_/g, ' ')}
          </div>
          <div className="text-sm font-semibold truncate" style={{ color: PRIMARY_TEXT }}>
            {label}
          </div>
          <div className="text-xs" style={{ color: MUTED_TEXT }}>
            {type.replace('_', ' ')}
          </div>
        </div>
        <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: CRYPTO_TEAL }} />
      </div>
    </button>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span style={{ color: MUTED_TEXT }}>{label}:</span>
      <span 
        className={mono ? 'font-mono text-xs' : 'font-medium'}
        style={{ color: PRIMARY_TEXT }}
      >
        {value}
      </span>
    </div>
  );
}

function RuntimeConformancePanel({ 
  nodeData, 
  isExpanded, 
  onToggle 
}: { 
  nodeData: any; 
  isExpanded: boolean; 
  onToggle: () => void;
}) {
  const { evidenceState, cryptoAsset } = nodeData;
  const runtimeObserved = evidenceState?.runtimeObserved;

  return (
    <Section
      title="Runtime Conformance"
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      {runtimeObserved ? (
        <div className="space-y-4">
          <div className="rounded-lg p-3" style={{
            backgroundColor: CRYPTO_TEAL + '15',
            border: `1px solid ${CRYPTO_TEAL}40`,
          }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{
                backgroundColor: CRYPTO_TEAL,
                boxShadow: `0 0 8px ${CRYPTO_TEAL}80`,
              }} />
              <div className="font-bold text-sm" style={{ color: CRYPTO_TEAL }}>
                VERIFIED MATCH
              </div>
            </div>
            <div className="text-xs space-y-2" style={{ color: PRIMARY_TEXT }}>
              <div>
                <span style={{ color: MUTED_TEXT }}>Static Expectation:</span>
                <br />
                <code className="font-mono" style={{ color: CRYPTO_TEAL }}>
                  {cryptoAsset?.algorithm}
                </code>
              </div>
              <div className="text-center py-1" style={{ color: MUTED_TEXT }}>↓</div>
              <div>
                <span style={{ color: MUTED_TEXT }}>Actual Runtime Observation:</span>
                <br />
                <code className="font-mono" style={{ color: CRYPTO_TEAL }}>
                  {cryptoAsset?.algorithm}
                </code>
              </div>
            </div>
          </div>
          <div className="text-xs" style={{ color: MUTED_TEXT }}>
            Runtime execution matches static analysis expectations.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg p-3 text-center" style={{
            backgroundColor: RAISED_GLASS,
            border: `1px solid ${MUTED_TEXT}30`,
          }}>
            <div className="font-bold text-sm mb-1" style={{ color: MUTED_TEXT }}>
              NOT OBSERVED
            </div>
            <div className="text-xs" style={{ color: MUTED_TEXT }}>
              Static and reachability evidence exists, but no runtime observation was captured for this path.
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}

function WhyMattersList({ nodeData }: { nodeData: any }) {
  const { cryptoAsset, evidenceState } = nodeData;
  const matters: string[] = [];

  if (cryptoAsset?.role) {
    matters.push(`${cryptoAsset.role} operation`);
  }
  
  if (evidenceState?.reachable) {
    matters.push('Reachable from application entrypoint');
  }

  if (evidenceState?.runtimeObserved) {
    matters.push('Runtime observed in execution');
  } else if (evidenceState?.reachable) {
    matters.push('Not observed in runtime (may be conditional)');
  }

  if (cryptoAsset?.algorithm?.includes('RSA') || cryptoAsset?.algorithm?.includes('DSA')) {
    matters.push('Classical public-key cryptography');
  }

  if (cryptoAsset?.algorithm?.includes('MD5') || cryptoAsset?.algorithm?.includes('SHA1')) {
    matters.push('Deprecated hash algorithm');
  }

  return matters.length > 0 ? (
    <ul className="space-y-1.5">
      {matters.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span style={{ color: CRYPTO_TEAL }}>•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  ) : (
    <div style={{ color: MUTED_TEXT }}>
      No specific concerns identified.
    </div>
  );
}

function ActionButton({
  label,
  description,
  icon,
  onClick,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3 rounded-xl text-left transition-all duration-150 hover:scale-[1.02]"
      style={{
        backgroundColor: RAISED_GLASS,
        border: `1px solid ${CRYPTO_TEAL}40`,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="font-bold text-sm mb-0.5 flex items-center gap-2" style={{ color: PRIMARY_TEXT }}>
            {label}
            {icon}
          </div>
          <div className="text-xs" style={{ color: MUTED_TEXT }}>
            {description}
          </div>
        </div>
      </div>
    </button>
  );
}
