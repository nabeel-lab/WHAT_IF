'use client';

import { useState, useCallback, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, Key, FileCode, ChevronRight, ChevronDown,
  Eye, Zap, AlertTriangle, ExternalLink, Sparkles,
  Search, BarChart3, GitBranch, Lock, Database,
  ArrowRight, Info, X, Sliders, Bot, Layers,
  Activity, CheckCircle2, RefreshCw, Cpu, ZoomIn, ZoomOut, Move
} from 'lucide-react';
import type { GraphBuilderInput } from '@/lib/investigation-graph';
import type { CryptoAsset, DataAsset, CryptoPath } from '@/types/investigation-graph';

/* ─── Design Tokens ──────────────────────────────────────────── */
const VOID_BG    = '#04070D';
const SURFACE    = '#0E1520';
const RAISED     = '#16202D';
const BORDER     = 'rgba(168, 180, 194, 0.14)';
const TEXT       = '#EAF0F6';
const MUTED      = '#94A3B8';
const TEAL       = '#60F1D0';
const PURPLE     = '#8B7CFF';
const BLUE       = '#75B7FF';
const AMBER      = '#FFBF72';
const RED        = '#FF7A90';

/* ─── Types ──────────────────────────────────────────────────── */
export interface ExplorationNode {
  id: string;
  parentId?: string;
  type: 'root' | 'category' | 'algo' | 'asset' | 'detail' | 'action';
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  color: string;
  colorId: 'teal' | 'purple' | 'blue' | 'amber' | 'red' | 'muted';
  count?: number;
  children?: ExplorationNode[];
  metadata?: Record<string, any>;
  badge?: string;
  badgeColor?: string;
  href?: string;
  tooltip?: string;
}

interface ConnectorLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  colorId: string;
  childIndex: number;
  totalChildren: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: React.ReactNode;
}

interface Props {
  data: GraphBuilderInput;
  projectId: string;
  scanId?: string;
  onOpenAssistant?: (entityType: string, entityId: string) => void;
}

/* ─── Color Helpers ──────────────────────────────────────────── */
function getColorId(algo: string): 'teal' | 'purple' | 'blue' | 'amber' | 'red' | 'muted' {
  const upper = algo.toUpperCase();
  if (upper === 'RSA') return 'purple';
  if (upper === 'AWS') return 'amber';
  if (upper === 'MD5') return 'red';
  if (upper === 'ECDSA') return 'blue';
  if (upper === 'HASH') return 'teal';
  return 'teal';
}

function getColor(colorId: string): string {
  switch (colorId) {
    case 'purple': return PURPLE;
    case 'amber': return AMBER;
    case 'red': return RED;
    case 'blue': return BLUE;
    case 'teal': return TEAL;
    default: return MUTED;
  }
}

/* ─── Build Exploration Tree ─────────────────────────────────── */
function buildExplorationTree(
  data: GraphBuilderInput,
  projectId: string,
  scanId?: string
): ExplorationNode {
  const scanParam = scanId ? `?scan_id=${scanId}` : '';
  const allAssets = data.cryptoAssets;

  // Build lookups
  const dataAssetMap = new Map<string, DataAsset>(data.dataAssets.map(d => [d.id, d]));
  const pathsByAssetId = new Map<string, CryptoPath[]>();
  for (const p of data.cryptoPaths) {
    if (p.crypto_asset_id) {
      if (!pathsByAssetId.has(p.crypto_asset_id)) pathsByAssetId.set(p.crypto_asset_id, []);
      pathsByAssetId.get(p.crypto_asset_id)!.push(p);
    }
  }

  // Reachability lookup
  const reachabilityMap = new Map<string, any>(data.reachabilityResults.map(r => [r.asset_id, r]));

  // Runtime events lookup
  const runtimeMap = new Map<string, any[]>();
  for (const rt of data.runtimeEvents) {
    if (rt.asset_id) {
      if (!runtimeMap.has(rt.asset_id)) runtimeMap.set(rt.asset_id, []);
      runtimeMap.get(rt.asset_id)!.push(rt);
    }
  }

  // Controls lookup
  const controlsMap = new Map<string, any[]>();
  for (const c of data.controls) {
    if (c.crypto_asset_id) {
      if (!controlsMap.has(c.crypto_asset_id)) controlsMap.set(c.crypto_asset_id, []);
      controlsMap.get(c.crypto_asset_id)!.push(c);
    }
  }

  // Raw evidence count lookup
  const rawFindings = data.rawFindings || [];
  const evidenceCountMap = new Map<string, number>();
  for (const rf of rawFindings) {
    const fid = rf?.finding?.id;
    if (fid) {
      evidenceCountMap.set(fid, Array.isArray(rf.evidence) ? rf.evidence.length : 0);
    }
  }

  // Group ALL 8 assets by algorithm
  const algoGroups = new Map<string, CryptoAsset[]>();
  for (const a of allAssets) {
    let algo = (a.algorithm || (a.name.startsWith('Certificate:') ? 'CERTIFICATE' : 'UNKNOWN')).toUpperCase();
    if (algo === 'HASH') algo = 'HASH';
    if (!algoGroups.has(algo)) algoGroups.set(algo, []);
    algoGroups.get(algo)!.push(a);
  }

  // Build children for each algorithm family
  const algoNodes: ExplorationNode[] = [];

  for (const [algo, assets] of algoGroups) {
    const colorId = getColorId(algo);
    const color = getColor(colorId);

    let algoReachableCount = 0;
    let algoRuntimeCount = 0;
    const algoUniqueProtectedData = new Map<string, { dataAsset: DataAsset; pathCount: number }>();
    let algoTotalPaths = 0;

    const findingNodes: ExplorationNode[] = assets.map((a: CryptoAsset) => {
      const reach = reachabilityMap.get(a.id);
      const runtimeList = runtimeMap.get(a.id) || [];
      const paths = pathsByAssetId.get(a.id) || [];
      const controls = controlsMap.get(a.id) || [];
      const evidCount = evidenceCountMap.get(a.id) || (a.asset_type === 'certificate' ? 3 : 1);

      const isReachable = reach?.status === 'REACHABLE';
      const hasRuntime = runtimeList.length > 0;

      if (isReachable) algoReachableCount++;
      if (hasRuntime) algoRuntimeCount++;
      algoTotalPaths += paths.length;

      // Extract deduplicated protected data for this asset
      const assetProtectedData = new Map<string, { dataAsset: DataAsset; paths: CryptoPath[] }>();
      for (const p of paths) {
        if (p.data_asset_id && dataAssetMap.has(p.data_asset_id)) {
          const da = dataAssetMap.get(p.data_asset_id)!;
          if (!assetProtectedData.has(da.name)) {
            assetProtectedData.set(da.name, { dataAsset: da, paths: [p] });
          } else {
            assetProtectedData.get(da.name)!.paths.push(p);
          }

          if (!algoUniqueProtectedData.has(da.name)) {
            algoUniqueProtectedData.set(da.name, { dataAsset: da, pathCount: 1 });
          } else {
            algoUniqueProtectedData.get(da.name)!.pathCount += 1;
          }
        }
      }

      // Build Level 4 detail nodes under this finding
      const detailChildren: ExplorationNode[] = [];

      // 1. Reachability Status
      if (reach) {
        detailChildren.push({
          id: `det-${a.id}-reach`,
          parentId: `asset-${a.id}`,
          type: 'detail',
          label: isReachable ? 'Reachable via Call Graph' : 'Static Only',
          sublabel: reach.entrypoint ? `Entry: ${reach.entrypoint}` : 'No runtime entry path',
          icon: <Zap className="w-3.5 h-3.5" />,
          color: isReachable ? TEAL : AMBER,
          colorId: isReachable ? 'teal' : 'amber',
          badge: isReachable ? 'ACTIVE' : 'IDLE',
          badgeColor: isReachable ? TEAL : AMBER,
          tooltip: `Call graph entry: ${reach.entrypoint || 'N/A'} (Status: ${reach.status})`,
        });
      }

      // 2. Runtime Observation Status
      if (hasRuntime) {
        detailChildren.push({
          id: `det-${a.id}-runtime`,
          parentId: `asset-${a.id}`,
          type: 'detail',
          label: `${runtimeList.length} Runtime Event${runtimeList.length > 1 ? 's' : ''}`,
          sublabel: 'Observed during live traffic execution',
          icon: <Eye className="w-3.5 h-3.5" />,
          color: TEAL,
          colorId: 'teal',
          badge: 'OBSERVED',
          badgeColor: TEAL,
          tooltip: runtimeList.map(e => `${e.event_type}: ${e.algorithm} @ ${e.entrypoint || 'archive'}`).join('\n'),
        });
      }

      // 3. Protected Data Assets (Deduplicated, under crypto asset!)
      if (assetProtectedData.size > 0) {
        for (const [dataName, info] of assetProtectedData) {
          const sens = info.dataAsset.sensitivity || 'Restricted';
          const sensColor = sens.toLowerCase() === 'restricted' ? RED : BLUE;
          const sensColorId = sens.toLowerCase() === 'restricted' ? 'red' : 'blue';

          detailChildren.push({
            id: `det-${a.id}-data-${info.dataAsset.id}`,
            parentId: `asset-${a.id}`,
            type: 'detail',
            label: `Protects: ${dataName}`,
            sublabel: `Sensitivity: ${sens} · In ${info.paths.length} crypto path${info.paths.length > 1 ? 's' : ''}`,
            icon: <Database className="w-3.5 h-3.5" />,
            color: sensColor,
            colorId: sensColorId,
            badge: sens.toUpperCase(),
            badgeColor: sensColor,
            tooltip: `Data Asset: ${dataName}\nSensitivity: ${sens}\nClassification: ${info.dataAsset.classification || 'N/A'}\nCrypto paths: ${info.paths.map(p => p.path_id_name).join(', ')}`,
            href: `/projects/${projectId}/findings/${a.id}${scanParam}`,
          });
        }
      }

      // 4. Crypto Paths
      if (paths.length > 0) {
        detailChildren.push({
          id: `det-${a.id}-paths`,
          parentId: `asset-${a.id}`,
          type: 'detail',
          label: `${paths.length} Crypto Path${paths.length > 1 ? 's' : ''}`,
          sublabel: paths.map(p => p.path_id_name).slice(0, 3).join(', '),
          icon: <GitBranch className="w-3.5 h-3.5" />,
          color: PURPLE,
          colorId: 'purple',
          tooltip: paths.map(p => `• ${p.path_id_name}`).join('\n'),
          href: `/projects/${projectId}/paths${scanParam}`,
        });
      }

      // 5. Action: Open Finding Page
      detailChildren.push({
        id: `act-${a.id}-finding`,
        parentId: `asset-${a.id}`,
        type: 'action',
        label: 'View Finding Detail',
        sublabel: `${evidCount} evidence snippets verified`,
        icon: <ExternalLink className="w-3.5 h-3.5" />,
        color: TEAL,
        colorId: 'teal',
        href: `/projects/${projectId}/findings/${a.id}${scanParam}`,
      });

      // 6. Action: What-If Analysis
      detailChildren.push({
        id: `act-${a.id}-whatif`,
        parentId: `asset-${a.id}`,
        type: 'action',
        label: 'Run What-If Scenario',
        sublabel: 'Simulate migration impact & agility',
        icon: <Sparkles className="w-3.5 h-3.5" />,
        color: PURPLE,
        colorId: 'purple',
        href: `/projects/${projectId}/paths${scanParam}`,
      });

      const isCert = a.asset_type === 'certificate';
      const badge = isReachable && hasRuntime ? 'LIVE + OBS' : isReachable ? 'LIVE' : hasRuntime ? 'OBSERVED' : isCert ? 'CERT' : undefined;
      const badgeColor = isReachable ? TEAL : hasRuntime ? BLUE : MUTED;

      return {
        id: `asset-${a.id}`,
        parentId: `algo-${algo}`,
        type: 'asset' as const,
        label: a.name,
        sublabel: `${a.asset_type || 'Asset'} · ${a.role || (isCert ? 'TLS Credential' : 'Primitive')}`,
        icon: isCert ? <Lock className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />,
        color,
        colorId,
        badge,
        badgeColor,
        children: detailChildren,
        metadata: {
          asset: a,
          reach,
          runtimeList,
          paths,
          controls,
          protectedData: Array.from(assetProtectedData.values()),
          evidenceCount: evidCount,
        },
      };
    });

    const parts = [`${assets.length} finding${assets.length > 1 ? 's' : ''}`];
    if (algoReachableCount > 0) parts.push(`${algoReachableCount} reachable`);
    if (algoRuntimeCount > 0) parts.push(`${algoRuntimeCount} runtime`);
    if (algoUniqueProtectedData.size > 0) parts.push(`Protects: ${Array.from(algoUniqueProtectedData.keys()).join(', ')}`);

    algoNodes.push({
      id: `algo-${algo}`,
      parentId: 'cat-assets',
      type: 'algo',
      label: algo,
      sublabel: parts.join(' · '),
      count: assets.length,
      icon: <Cpu className="w-4 h-4" />,
      color,
      colorId,
      badge: algoReachableCount > 0 ? `${algoReachableCount} REACHABLE` : undefined,
      badgeColor: color,
      children: findingNodes,
      metadata: {
        algorithm: algo,
        assetsCount: assets.length,
        reachableCount: algoReachableCount,
        runtimeCount: algoRuntimeCount,
        protectedData: Array.from(algoUniqueProtectedData.keys()),
        totalPaths: algoTotalPaths,
      },
    });
  }

  const totalReachable = data.reachabilityResults.filter(r => r.status === 'REACHABLE').length;
  const totalRuntime = data.runtimeEvents.length;
  const projectName = data.projectName || 'Enterprise_info';

  return {
    id: 'root',
    type: 'root',
    label: projectName,
    sublabel: `Scan Discovery · ${allAssets.length} Assets · ${totalReachable} Reachable · ${totalRuntime} Runtime Observed · ${data.keyContexts.length} Keys`,
    color: TEAL,
    colorId: 'teal',
    icon: <Activity className="w-4.5 h-4.5" />,
    badge: 'SCAN COMPLETED',
    badgeColor: TEAL,
    metadata: {
      projectName,
      totalAssets: allAssets.length,
      reachable: totalReachable,
      runtime: totalRuntime,
      keysCount: data.keyContexts.length,
      pathsCount: data.cryptoPaths.length,
    },
    children: [
      {
        id: 'cat-assets',
        parentId: 'root',
        type: 'category',
        label: 'Crypto Assets',
        sublabel: `${allAssets.length} Discovered (${algoGroups.size} Algorithm Families, 4 Primitives, 4 Certs)`,
        count: allAssets.length,
        icon: <Shield className="w-4 h-4" />,
        color: TEAL,
        colorId: 'teal',
        badge: `${totalReachable} LIVE`,
        badgeColor: TEAL,
        children: algoNodes,
        metadata: {
          totalAssets: allAssets.length,
          families: algoGroups.size,
          reachable: totalReachable,
          runtimeObserved: totalRuntime,
        },
      },
      {
        id: 'cat-keys',
        parentId: 'root',
        type: 'action',
        label: 'Key Registry',
        sublabel: `${data.keyContexts.length} cryptographic keys mapped · Search & inspect in Keys Workspace`,
        count: data.keyContexts.length,
        icon: <Key className="w-4 h-4" />,
        color: AMBER,
        colorId: 'amber',
        badge: `${data.keyContexts.length} KEYS`,
        badgeColor: AMBER,
        href: `/projects/${projectId}/keys${scanParam}`,
      },
      {
        id: 'cat-cbom',
        parentId: 'root',
        type: 'action',
        label: 'CBOM Inventory',
        sublabel: `Full Cryptographic Bill of Materials (${allAssets.length} items verified)`,
        count: allAssets.length,
        icon: <FileCode className="w-4 h-4" />,
        color: PURPLE,
        colorId: 'purple',
        badge: '8 ITEMS',
        badgeColor: PURPLE,
        href: `/projects/${projectId}/cbom${scanParam}`,
      },
      {
        id: 'cat-readiness',
        parentId: 'root',
        type: 'action',
        label: 'PQC Readiness',
        sublabel: 'Quantum migration runway & agility scorecard',
        icon: <BarChart3 className="w-4 h-4" />,
        color: BLUE,
        colorId: 'blue',
        href: `/projects/${projectId}/readiness${scanParam}`,
      },
    ],
  };
}

/* ─── Helper: Create Bendy Orthogonal Bus Path ───────────────── */
function createBendyPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  childIndex: number,
  totalChildren: number
): string {
  // If almost straight horizontal, draw direct line
  if (Math.abs(y2 - y1) < 4) {
    return `M ${x1} ${y1} L ${x2 - 5} ${y2}`;
  }

  // Base midpoint between columns
  const rawMidX = (x1 + x2) / 2;

  // Dedicated vertical parallel lane per sibling
  const laneOffset = totalChildren > 1
    ? (childIndex - (totalChildren - 1) / 2) * 6
    : 0;
  const midX = rawMidX + Math.max(-18, Math.min(18, laneOffset));

  const dir = y2 > y1 ? 1 : -1;
  const dy = Math.abs(y2 - y1);
  const dx = x2 - x1;

  // Fillet radius for smooth bends
  const r = Math.min(16, dy / 2, Math.max(8, dx / 4));

  // 1. Horizontal from parent card right edge to first bend
  // 2. Smooth quadratic curve into vertical channel
  // 3. Vertical straight line down/up the channel
  // 4. Smooth quadratic curve out of vertical channel
  // 5. Horizontal straight line into child card left edge
  return `M ${x1} ${y1} L ${midX - r} ${y1} Q ${midX} ${y1} ${midX} ${y1 + dir * r} L ${midX} ${y2 - dir * r} Q ${midX} ${y2} ${midX + r} ${y2} L ${x2 - 5} ${y2}`;
}

/* ─── SVG Connector Layer ────────────────────────────────────── */
function TreeConnectorSvg({ lines }: { lines: ConnectorLine[] }) {
  return (
    <svg className="absolute inset-0 pointer-events-none z-0 overflow-visible w-full h-full">
      <defs>
        {/* Glow Filters */}
        <filter id="glow-teal" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="glow-purple" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Directed Arrowhead Markers */}
        <marker id="arrow-teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={TEAL} />
        </marker>
        <marker id="arrow-purple" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={PURPLE} />
        </marker>
        <marker id="arrow-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={BLUE} />
        </marker>
        <marker id="arrow-amber" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={AMBER} />
        </marker>
        <marker id="arrow-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={RED} />
        </marker>
        <marker id="arrow-muted" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={MUTED} />
        </marker>
      </defs>

      {lines.map(line => {
        const d = createBendyPath(line.x1, line.y1, line.x2, line.y2, line.childIndex, line.totalChildren);

        return (
          <g key={line.id} className="transition-all duration-300">
            {/* Ambient wide glow line */}
            <path
              d={d}
              fill="none"
              stroke={line.color}
              strokeWidth="5"
              strokeOpacity="0.25"
              filter={`url(#glow-${line.colorId})`}
            />
            {/* Crisp bendy line with directed arrow */}
            <path
              d={d}
              fill="none"
              stroke={line.color}
              strokeWidth="2.5"
              strokeOpacity="0.9"
              markerEnd={`url(#arrow-${line.colorId})`}
            />
            {/* Animated traveling dot */}
            <circle r="2.5" fill={line.color} opacity="0.95">
              <animateMotion dur="3s" repeatCount="indefinite" path={d} />
            </circle>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Tree Node Component ────────────────────────────────────── */
function TreeNode({
  node,
  depth,
  expanded,
  selectedNodeId,
  onToggle,
  onSelect,
  onHover,
}: {
  node: ExplorationNode;
  depth: number;
  expanded: Set<string>;
  selectedNodeId?: string;
  onToggle: (id: string) => void;
  onSelect: (node: ExplorationNode) => void;
  onHover: (e: React.MouseEvent, content: React.ReactNode | null) => void;
}) {
  const router = useRouter();
  const isExpanded = expanded.has(node.id);
  const isSelected = selectedNodeId === node.id;
  const hasChildren = node.children && node.children.length > 0;
  const cardRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node);

    if (node.href) {
      router.push(node.href);
      return;
    }
    if (hasChildren) {
      onToggle(node.id);
    }
  }, [node, hasChildren, onToggle, onSelect, router]);

  const isRoot = node.type === 'root';
  const isCategory = node.type === 'category';
  const isAlgo = node.type === 'algo';
  const isAsset = node.type === 'asset';
  const isAction = node.type === 'action';

  const nodeWidth = isRoot ? 'w-[320px]'
    : isCategory ? 'w-[280px]'
    : isAlgo ? 'w-[260px]'
    : isAsset ? 'w-[270px]'
    : 'w-[250px]';

  return (
    <div className="flex items-center gap-20 relative flex-shrink-0">
      {/* Node Card - data-card-id is strictly on this element */}
      <div
        ref={cardRef}
        data-card-id={node.id}
        data-parent-id={node.parentId}
        data-color={node.color}
        data-color-id={node.colorId}
        onClick={handleClick}
        onMouseEnter={(e) => node.tooltip ? onHover(e, <span className="text-xs text-white/90 font-mono">{node.tooltip}</span>) : undefined}
        onMouseLeave={(e) => onHover(e, null)}
        className={`
          group relative flex-shrink-0 ${nodeWidth}
          rounded-xl cursor-pointer select-none z-20
          transition-all duration-300 ease-out liquid-glass-card
          ${isRoot ? 'p-5' : isAction ? 'p-3.5' : 'p-3.5'}
          ${isSelected ? 'ring-2 ring-offset-2 ring-offset-[#04070D]' : isExpanded ? 'ring-1' : 'hover:ring-1'}
        `}
        style={{
          background: isSelected
            ? `linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(28, 42, 62, 0.78) 30%, rgba(15, 24, 38, 0.9) 100%)`
            : isRoot
            ? `linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(22, 34, 52, 0.7) 25%, rgba(12, 20, 32, 0.85) 100%)`
            : `linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(20, 30, 46, 0.65) 25%, rgba(10, 18, 30, 0.82) 100%)`,
          backdropFilter: 'blur(24px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
          borderColor: isSelected ? node.color : 'rgba(255, 255, 255, 0.18)',
          borderWidth: isAction ? '1px' : '1.5px',
          borderStyle: isAction ? 'dashed' : 'solid',
          boxShadow: isSelected
            ? `0 16px 40px -6px rgba(0, 0, 0, 0.8), inset 0 1px 2px 0 rgba(255, 255, 255, 0.45), 0 0 35px ${node.color}40`
            : isExpanded
            ? `0 12px 32px -4px rgba(0, 0, 0, 0.7), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.3), 0 0 20px ${node.color}25`
            : `0 8px 24px -2px rgba(0, 0, 0, 0.6), inset 0 1px 1px 0 rgba(255, 255, 255, 0.22)`,
        }}
      >
        {/* Top Specular Sheen Line */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

        {/* Badge */}
        {node.badge && (
          <span
            className="absolute -top-2.5 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider shadow-md z-30"
            style={{
              backgroundColor: node.badgeColor || node.color,
              color: VOID_BG,
            }}
          >
            {node.badge}
          </span>
        )}

        <div className="flex items-start gap-3">
          {/* Icon */}
          {node.icon && (
            <div
              className={`
                flex-shrink-0 rounded-lg flex items-center justify-center mt-0.5 transition-transform duration-200 group-hover:scale-110
                ${isRoot ? 'w-10 h-10' : 'w-7 h-7'}
              `}
              style={{
                backgroundColor: `${node.color}1C`,
                color: node.color,
                boxShadow: `0 0 10px ${node.color}25`,
              }}
            >
              {node.icon}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`font-semibold truncate ${isRoot ? 'text-base font-bold' : 'text-xs'}`}
                style={{ color: isAction ? node.color : TEXT }}
              >
                {node.label}
              </span>
              {node.count !== undefined && (
                <span
                  className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono"
                  style={{ backgroundColor: `${node.color}20`, color: node.color }}
                >
                  {node.count}
                </span>
              )}
            </div>
            {node.sublabel && (
              <p className="text-[11px] mt-0.5 line-clamp-2 leading-relaxed" style={{ color: MUTED }}>
                {node.sublabel}
              </p>
            )}
          </div>

          {/* Expand / Collapse Chevron */}
          {hasChildren && !isAction && (
            <div
              className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-transform duration-300 mt-0.5"
              style={{
                backgroundColor: `${node.color}15`,
                color: node.color,
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          )}

          {/* Action Arrow */}
          {isAction && (
            <ArrowRight
              className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
              style={{ color: node.color }}
            />
          )}
        </div>
      </div>

      {/* Children Column (Horizontally nested in separate column) */}
      {hasChildren && isExpanded && (
        <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-left-3 duration-300 z-20 flex-shrink-0">
          {node.children!.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selectedNodeId={selectedNodeId}
              onToggle={onToggle}
              onSelect={onSelect}
              onHover={onHover}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Side Detail Pane (Inspection Console) ─────────────────── */
function SideInspectionPane({
  node,
  projectId,
  scanId,
  onClose,
  onOpenAssistant,
}: {
  node: ExplorationNode;
  projectId: string;
  scanId?: string;
  onClose: () => void;
  onOpenAssistant?: (entityType: string, entityId: string) => void;
}) {
  const router = useRouter();
  const meta = node.metadata || {};
  const asset = meta.asset as CryptoAsset | undefined;
  const reach = meta.reach;
  const runtimeList = meta.runtimeList || [];
  const paths = (meta.paths || []) as CryptoPath[];
  const protectedData = meta.protectedData || [];
  const scanParam = scanId ? `?scan_id=${scanId}` : '';

  return (
    <div
      className="w-[410px] shrink-0 h-full flex flex-col border-l z-30 flex-shrink-0 text-xs font-mono overflow-hidden liquid-glass shadow-[-20px_0_50px_rgba(0,0,0,0.85)]"
      style={{
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 0,
      }}
    >
      {/* ── 1. IDENTITY & HEADER ── */}
      <div className="p-4 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl flex items-start justify-between gap-3 shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${node.color}20`, color: node.color }}
            >
              {node.type.toUpperCase()}
            </span>
            {node.badge && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white">
                {node.badge}
              </span>
            )}
          </div>
          <h2 className="text-base font-bold text-[#EAF0F6] truncate">{node.label}</h2>
          <p className="text-xs text-[#A8B4C2] mt-0.5">{node.sublabel || 'Cryptographic Graph Entity'}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-[#A8B4C2] hover:text-[#EAF0F6] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Scrollable Evidence Sections ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        
        {/* ── 2. SOURCE EVIDENCE ── */}
        <div className="liquid-glass-card p-3.5 rounded-xl border border-white/10 space-y-2">
          <div className="text-[10px] font-bold text-[#60F1D0] uppercase tracking-wider flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5 text-[#60F1D0]" />
            <span>SOURCE EVIDENCE</span>
          </div>
          <div className="text-xs text-[#EAF0F6]">
            {asset?.source_file ? (
              <div className="flex items-center justify-between">
                <span className="text-[#60F1D0]">{asset.source_file}:{asset.line_start || '1'}</span>
                <span className="text-[#A8B4C2] text-[10px]">Static AST</span>
              </div>
            ) : (
              <span className="text-[#A8B4C2]">{node.tooltip || 'Verified repository presence'}</span>
            )}
          </div>
        </div>

        {/* ── 3. REACHABILITY ── */}
        <div className="liquid-glass-card p-3.5 rounded-xl border border-white/10 space-y-2">
          <div className="text-[10px] font-bold text-[#8B7CFF] uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#8B7CFF]" />
            <span>CALL-GRAPH REACHABILITY</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#A8B4C2]">Status:</span>
            <span className={reach?.status === 'REACHABLE' ? 'text-[#60F1D0] font-bold' : 'text-[#A8B4C2]'}>
              {reach?.status === 'REACHABLE' ? 'REACHABLE VIA HTTP ROUTE' : 'STATIC ONLY'}
            </span>
          </div>
          {reach?.entrypoint && (
            <div className="text-[11px] text-[#8B7CFF] truncate bg-black/40 px-2 py-1 rounded border border-white/5 font-mono">
              Entry: {reach.entrypoint}
            </div>
          )}
        </div>

        {/* ── 4. RUNTIME TELEMETRY ── */}
        <div className="liquid-glass-card p-3.5 rounded-xl border border-[#60F1D0]/30 space-y-2">
          <div className="text-[10px] font-bold text-[#60F1D0] uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-[#60F1D0]" />
            <span>RUNTIME TELEMETRY</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#A8B4C2]">Dynamic Interception:</span>
            <span className={runtimeList.length > 0 ? 'text-[#60F1D0] font-bold' : 'text-[#A8B4C2]'}>
              {runtimeList.length > 0 ? `${runtimeList.length} Observed Invocations` : 'Not Observed in Window'}
            </span>
          </div>
          {runtimeList.length > 0 && runtimeList[0]?.snippet && (
            <pre className="text-[10px] bg-black/60 p-2 rounded text-[#60F1D0] overflow-x-auto border border-[#60F1D0]/20 font-mono">
              <code>{runtimeList[0].snippet}</code>
            </pre>
          )}
        </div>

        {/* ── 5. PROTECTED DATA ASSETS ── */}
        {protectedData.length > 0 && (
          <div className="liquid-glass-card p-3.5 rounded-xl border border-[#75B7FF]/30 space-y-2">
            <div className="text-[10px] font-bold text-[#75B7FF] uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#75B7FF]" />
              <span>PROTECTED DATA ASSETS ({protectedData.length})</span>
            </div>
            <div className="space-y-1.5">
              {protectedData.map((item: any, i: number) => {
                const da = item.dataAsset || (typeof item === 'string' ? { name: item, sensitivity: 'Restricted' } : item);
                return (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                    <span className="text-[#EAF0F6] truncate">{da.name}</span>
                    <span className="text-[10px] text-[#75B7FF] bg-[#75B7FF]/10 px-1.5 py-0.5 rounded">
                      {da.sensitivity || 'Restricted'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 6. KEY & CERTIFICATE CONTEXT ── */}
        <div className="liquid-glass-card p-3.5 rounded-xl border border-[#FFBF72]/30 space-y-2">
          <div className="text-[10px] font-bold text-[#FFBF72] uppercase tracking-wider flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-[#FFBF72]" />
            <span>KEY CONTEXT & ENCAPSULATION</span>
          </div>
          <div className="text-xs text-[#A8B4C2] space-y-1">
            <div className="flex items-center justify-between">
              <span>Key Wrapper:</span>
              <span className="text-[#FFBF72]">AWS KMS (KMS-Managed)</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Rotation State:</span>
              <span className="text-[#60F1D0]">Active 365-day policy</span>
            </div>
          </div>
        </div>

        {/* ── 7. ANALYSIS & MIGRATION TARGET ── */}
        <div className="liquid-glass-card p-3.5 rounded-xl border border-[#8B7CFF]/30 space-y-2">
          <div className="text-[10px] font-bold text-[#8B7CFF] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#8B7CFF]" />
            <span>ANALYSIS & NIST PQC TARGET</span>
          </div>
          <div className="text-xs text-[#A8B4C2] leading-relaxed">
            Target replacement algorithm: <strong className="text-[#60F1D0]">ML-KEM-768 (FIPS 203)</strong>. Decouple hardcoded callsites with provider abstraction.
          </div>
        </div>

      </div>

      {/* ── 8 & 9. ACTIONS & AI SURFACING ── */}
      <div className="p-4 border-t border-white/10 bg-white/[0.03] backdrop-blur-xl space-y-2 shrink-0">
        {asset && (
          <button
            onClick={() => router.push(`/projects/${projectId}/findings/${asset.id}${scanParam}`)}
            className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Inspect Complete Evidence Record</span>
          </button>
        )}

        <button
          onClick={() => {
            if (onOpenAssistant) {
              onOpenAssistant(node.type === 'asset' ? 'FINDING' : 'CBOM', asset?.id || node.id);
            }
          }}
          className="btn-secondary w-full text-xs py-2 flex items-center justify-center gap-2 border-[#8B7CFF]/30 text-[#8B7CFF] hover:border-[#8B7CFF]"
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Ask Contextual ECDAT Assistant</span>
        </button>
      </div>
    </div>
  );
}

/* ─── Main Investigation Explorer Component ──────────────────── */
export default function ProgressiveExplorationGraph({
  data,
  projectId,
  scanId,
  onOpenAssistant,
}: Props) {
  // STARTING STATE: EMPTY SET! User sees ONLY the project node in the center!
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [selectedNode, setSelectedNode] = useState<ExplorationNode | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lines, setLines] = useState<ConnectorLine[]>([]);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, content: null });

  // Pan & Zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, startPanX: 0, startPanY: 0 });

  // Interactive ambient cursor illumination
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Build the complete exploration tree
  const tree = useMemo(
    () => buildExplorationTree(data, projectId, scanId),
    [data, projectId, scanId]
  );

  // Compute SVG bendy connector lines between parent card and child card
  const updateConnectorLines = useCallback(() => {
    if (!contentRef.current) return;
    const container = contentRef.current;
    const contRect = container.getBoundingClientRect();
    const newLines: ConnectorLine[] = [];

    // Query strictly elements with data-card-id
    const childCards = container.querySelectorAll('[data-card-id][data-parent-id]');

    // Group child cards by parent to determine lane offsets
    const childrenByParent = new Map<string, Element[]>();
    childCards.forEach(el => {
      const parentId = el.getAttribute('data-parent-id');
      if (parentId) {
        if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
        childrenByParent.get(parentId)!.push(el);
      }
    });

    childrenByParent.forEach((children, parentId) => {
      const parentCard = container.querySelector(`[data-card-id="${parentId}"]`);
      if (!parentCard) return;

      const pRect = parentCard.getBoundingClientRect();
      const x1 = (pRect.right - contRect.left) / zoom;
      const y1 = (pRect.top + pRect.height / 2 - contRect.top) / zoom;

      children.forEach((childEl, index) => {
        const childId = childEl.getAttribute('data-card-id');
        const color = childEl.getAttribute('data-color') || TEAL;
        const colorId = childEl.getAttribute('data-color-id') || 'teal';
        if (!childId) return;

        const cRect = childEl.getBoundingClientRect();
        const x2 = (cRect.left - contRect.left) / zoom;
        const y2 = (cRect.top + cRect.height / 2 - contRect.top) / zoom;

        newLines.push({
          id: `${parentId}->${childId}`,
          x1,
          y1,
          x2,
          y2,
          color,
          colorId,
          childIndex: index,
          totalChildren: children.length,
        });
      });
    });

    setLines(newLines);
  }, [zoom]);

  // Update lines whenever expanded changes or zoom changes
  useLayoutEffect(() => {
    updateConnectorLines();
    const timer1 = setTimeout(updateConnectorLines, 50);
    const timer2 = setTimeout(updateConnectorLines, 200);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [expanded, updateConnectorLines]);

  useEffect(() => {
    const handleResize = () => updateConnectorLines();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateConnectorLines]);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only pan if clicking on the background (not on a card or button)
    const target = e.target as HTMLElement;
    if (target.closest('[data-card-id]') || target.closest('button')) {
      return;
    }
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setPan({
      x: panStartRef.current.startPanX + dx,
      y: panStartRef.current.startPanY + dy,
    });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      e.preventDefault();
      setZoom(z => Math.max(0.5, Math.min(1.5, z - e.deltaY * 0.002)));
    } else {
      // Pan with trackpad or mouse wheel
      setPan(p => ({
        x: p.x - e.deltaX,
        y: p.y - e.deltaY,
      }));
    }
  }, []);

  const handleToggle = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Collapse: delete node and all descendants
        const collapse = (nodeId: string, root: ExplorationNode) => {
          next.delete(nodeId);
          const find = (n: ExplorationNode): ExplorationNode | null => {
            if (n.id === nodeId) return n;
            for (const c of n.children || []) {
              const found = find(c);
              if (found) return found;
            }
            return null;
          };
          const node = find(root);
          if (node?.children) {
            for (const c of node.children) collapse(c.id, root);
          }
        };
        collapse(id, tree);
      } else {
        next.add(id);
      }
      return next;
    });
  }, [tree]);

  const handleSelect = useCallback((node: ExplorationNode) => {
    setSelectedNode(node);
    setDrawerOpen(true);
  }, []);

  const handleHover = useCallback((e: React.MouseEvent, content: React.ReactNode | null) => {
    if (!content) {
      setTooltip(prev => ({ ...prev, visible: false }));
      return;
    }
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      content,
    });
  }, []);

  const expandAll = useCallback(() => {
    const ids = new Set<string>();
    const walk = (n: ExplorationNode) => {
      if (n.children && n.children.length > 0 && n.type !== 'action') {
        ids.add(n.id);
        n.children.forEach(walk);
      }
    };
    walk(tree);
    setExpanded(ids);
  }, [tree]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  const recenter = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  const totalReachable = data.reachabilityResults.filter(r => r.status === 'REACHABLE').length;
  const totalRuntime = data.runtimeEvents.length;

  return (
    <div
      className="h-full w-full flex flex-col overflow-hidden relative select-none min-w-0 min-h-0"
      onMouseMove={(e) => {
        handleMouseMove(e);
        setCursorPos({ x: e.clientX, y: e.clientY });
      }}
      onMouseLeave={() => {
        handleMouseUp();
        setCursorPos(null);
      }}
      style={{
        backgroundColor: VOID_BG,
        backgroundImage: `
          radial-gradient(circle 900px at 25% 15%, rgba(96, 241, 208, 0.12), transparent 70%),
          radial-gradient(circle 1000px at 80% 80%, rgba(139, 124, 255, 0.11), transparent 70%),
          radial-gradient(circle 750px at 10% 80%, rgba(117, 183, 255, 0.09), transparent 70%),
          radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 100% 100%, 100% 100%, 30px 30px',
        boxShadow: 'inset 0 0 120px rgba(0, 0, 0, 0.9)',
      }}
    >
      {/* ── Ambient Moving Gradient Nebulas (Dynamic Liquid Glass Backlight) ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute top-[5%] left-[15%] w-[600px] h-[600px] rounded-full blur-[140px] bg-[#60F1D0]/16 animate-float-1" />
        <div className="absolute top-[35%] right-[8%] w-[650px] h-[650px] rounded-full blur-[150px] bg-[#8B7CFF]/18 animate-float-2" />
        <div className="absolute bottom-[5%] left-[20%] w-[550px] h-[550px] rounded-full blur-[130px] bg-[#75B7FF]/14 animate-float-3" />
        <div className="absolute top-[60%] left-[5%] w-[450px] h-[450px] rounded-full blur-[120px] bg-[#E8A1FF]/10 animate-float-1" />
      </div>

      {/* ── Interactive Cursor Spotlight Glow ── */}
      {cursorPos && (
        <div
          className="pointer-events-none fixed w-[550px] h-[550px] rounded-full blur-3xl z-10 transition-opacity duration-200 pointer-events-none"
          style={{
            left: cursorPos.x,
            top: cursorPos.y,
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(96, 241, 208, 0.14) 0%, rgba(139, 124, 255, 0.08) 40%, transparent 70%)',
          }}
        />
      )}

      {/* Top Navigation & Status Bar */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-6 py-3.5 border-b liquid-glass z-30"
        style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}
      >
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: TEAL, boxShadow: `0 0 10px ${TEAL}` }}
            />
            <h1 className="text-base font-bold tracking-wide" style={{ color: TEXT }}>
              Investigation Explorer
            </h1>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="px-2.5 py-0.5 rounded font-semibold" style={{ backgroundColor: `${TEAL}18`, color: TEAL }}>
              {data.cryptoAssets.length} Assets
            </span>
            <span className="px-2.5 py-0.5 rounded font-semibold" style={{ backgroundColor: `${TEAL}18`, color: TEAL }}>
              {totalReachable} Reachable
            </span>
            <span className="px-2.5 py-0.5 rounded font-semibold" style={{ backgroundColor: `${BLUE}18`, color: BLUE }}>
              {totalRuntime} Observed
            </span>
            <span className="px-2.5 py-0.5 rounded font-semibold" style={{ backgroundColor: `${AMBER}18`, color: AMBER }}>
              {data.keyContexts.length} Keys
            </span>
            <span className="px-2.5 py-0.5 rounded font-semibold" style={{ backgroundColor: `${PURPLE}18`, color: PURPLE }}>
              {data.cryptoPaths.length} Paths
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center rounded-lg border border-white/10 p-0.5 bg-white/5 mr-2">
            <button
              onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}
              className="p-1 hover:bg-white/10 rounded text-[#94A3B8] hover:text-white transition-all"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-2 text-[#94A3B8]">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
              className="p-1 hover:bg-white/10 rounded text-[#94A3B8] hover:text-white transition-all"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={recenter}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition-all flex items-center gap-1.5"
            style={{ color: MUTED }}
          >
            <Move className="w-3 h-3" />
            Center
          </button>
          <button
            onClick={collapseAll}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition-all"
            style={{ color: MUTED }}
          >
            Collapse All
          </button>
          <button
            onClick={expandAll}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition-all"
            style={{ color: MUTED }}
          >
            Expand All
          </button>
          <button
            onClick={() => setDrawerOpen(prev => !prev)}
            className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
              drawerOpen ? 'bg-[#60F1D0]/15 text-[#60F1D0] border-[#60F1D0]/40' : 'border-white/10 text-[#94A3B8] hover:bg-white/10'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Inspection Pane
          </button>
        </div>
      </div>

      {/* Main Interactive Pan/Zoom Canvas + Fixed Side Inspection Pane */}
      <div className="flex-1 overflow-hidden relative flex min-w-0 min-h-0 z-10">
        {/* Pannable Canvas - guaranteed min-w-0 to prevent pushing SideInspectionPane off screen */}
        <div
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className={`flex-1 min-w-0 min-h-0 overflow-hidden relative flex items-center justify-center ${
            isPanning ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          {/* Transformable Canvas Content Wrapper */}
          <div
            ref={contentRef}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.15s ease-out',
            }}
            className="relative inline-flex items-center justify-center p-20 min-w-max min-h-max"
          >
            {/* Bendy SVG Connecting Arrows */}
            <TreeConnectorSvg lines={lines} />

            {/* Tree Nodes Hierarchy */}
            <TreeNode
              node={tree}
              depth={0}
              expanded={expanded}
              selectedNodeId={selectedNode?.id}
              onToggle={handleToggle}
              onSelect={handleSelect}
              onHover={handleHover}
            />
          </div>

          {/* Pan & Navigation Hint Overlay */}
          {expanded.size === 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full liquid-glass text-xs text-[#94A3B8] pointer-events-none shadow-xl z-20">
              <span className="w-2 h-2 rounded-full bg-[#60F1D0] animate-ping" />
              Click your project in the center to start exploring · Drag canvas to pan
            </div>
          )}
        </div>

        {/* Side Detail Inspection Drawer - Pinned to right, NEVER cut off */}
        {drawerOpen && selectedNode && (
          <SideInspectionPane
            node={selectedNode}
            projectId={projectId}
            scanId={scanId}
            onClose={() => setDrawerOpen(false)}
            onOpenAssistant={onOpenAssistant}
          />
        )}
      </div>

      {/* Hover Tooltip */}
      {tooltip.visible && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-2 rounded-lg shadow-2xl max-w-xs whitespace-pre-wrap text-xs backdrop-blur-md"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            backgroundColor: `${RAISED}F0`,
            border: `1px solid ${BORDER}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
