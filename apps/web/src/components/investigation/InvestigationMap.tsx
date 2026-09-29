'use client';

import { useCallback, useMemo } from 'react';
import { Node, Edge, useNodesState, useEdgesState, useReactFlow } from 'reactflow';
import 'reactflow/dist/style.css';
import type { CryptoAsset, ReachabilityResult, RuntimeEvent, AnalysisResult } from '@/types/investigation';
import SpatialCanvas from './spatial/SpatialCanvas';
import GlassNode from './spatial/GlassNode';
import SpatialToolbar from './spatial/SpatialToolbar';

interface InvestigationMapProps {
  assets: CryptoAsset[];
  reachability: Record<string, ReachabilityResult>;
  runtimeEvents: Record<string, RuntimeEvent[]>;
  analysisResults: Record<string, AnalysisResult>;
  onSelectAsset: (assetId: string) => void;
}

const nodeTypes = {
  glassNode: GlassNode,
};

export default function InvestigationMap({
  assets,
  reachability,
  runtimeEvents,
  analysisResults,
  onSelectAsset,
}: InvestigationMapProps) {
  
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // Filter out certificates for now, focus on crypto paths
    const cryptoPaths = assets.filter(a => !a.name.startsWith('Certificate:'));
    
    // Create nodes for each crypto asset - horizontal layout
    cryptoPaths.forEach((asset, index) => {
      const reach = reachability[asset.id];
      const events = runtimeEvents[asset.id] || [];
      const analysis = analysisResults[asset.id];
      
      // Determine evidence state
      const discovered = true; // All assets are discovered
      const reachableStatus = reach?.status === 'REACHABLE';
      const runtimeObserved = events.length > 0;
      
      nodes.push({
        id: asset.id,
        type: 'glassNode',
        position: { x: index * 380, y: 250 },
        data: {
          asset,
          evidenceState: {
            discovered,
            reachable: reachableStatus,
            runtimeObserved,
          },
          reachability: reach,
          runtimeEvents: events,
          analysis,
          onSelect: () => onSelectAsset(asset.id),
        },
      });
    });

    return { nodes, edges };
  }, [assets, reachability, runtimeEvents, analysisResults, onSelectAsset]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="w-full h-full relative">
      <SpatialCanvas
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(event, node) => {
          if (node.data.onSelect) {
            node.data.onSelect();
          }
        }}
      >
        <SpatialToolbarWrapper />
      </SpatialCanvas>
    </div>
  );
}

// Wrapper component to access React Flow instance
function SpatialToolbarWrapper() {
  const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow();

  return (
    <SpatialToolbar
      onFitView={() => fitView({ duration: 400, padding: 0.2 })}
      onZoomIn={() => zoomIn({ duration: 200 })}
      onZoomOut={() => zoomOut({ duration: 200 })}
      onRecenter={() => {
        setCenter(500, 300, { duration: 400, zoom: 1 });
      }}
    />
  );
}
