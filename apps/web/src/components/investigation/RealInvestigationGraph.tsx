/**
 * Real Investigation Graph Renderer
 * 
 * Renders the canonical investigation graph from TASK 20B.1 data layer.
 * Uses deterministic horizontal spine layout.
 */

'use client';

import { useMemo, useCallback, useState } from 'react';
import { Node, Edge, useNodesState, useEdgesState, useReactFlow } from 'reactflow';
import 'reactflow/dist/style.css';
import type { InvestigationGraph } from '@/types/investigation-graph';
import { computeGraphLayout, getConnectedNeighborhood } from '@/lib/investigation-layout';
import SpatialCanvas from './spatial/SpatialCanvas';
import InvestigationNode from './nodes/InvestigationNode';
import SpatialToolbar from './spatial/SpatialToolbar';

interface RealInvestigationGraphProps {
  graph: InvestigationGraph;
  onSelectNode: (nodeId: string) => void;
}

const nodeTypes = {
  investigationNode: InvestigationNode,
};

// Design spec colors
const MUTED_TEXT = '#A8B4C2';
const CRYPTO_TEAL = '#60F1D0';

// Categories to render as visual nodes (per requirements)
const VISUAL_NODE_CATEGORIES = new Set([
  'DATA_ASSET',
  'CRYPTO_ASSET',
  'KEY_CONTEXT',
  'CERTIFICATE',
  'PROVIDER',
  'SERVICE',
  'CONTROL',
  'ANALYSIS',
]);

export default function RealInvestigationGraph({
  graph,
  onSelectNode,
}: RealInvestigationGraphProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNodeExpansion = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Compute React Flow nodes and edges from canonical graph
  const { nodes: initialNodes, edges: initialEdges, stats } = useMemo(() => {
    // Filter to visual nodes only (exclude REACHABILITY and RUNTIME_EVENT)
    const visualNodes = graph.nodes.filter(node =>
      VISUAL_NODE_CATEGORIES.has(node.data.category)
    );

    // Compute deterministic layout
    const layoutPositions = computeGraphLayout(
      { ...graph, nodes: visualNodes },
      expandedNodes
    );

    // Get connected neighborhood if a node is selected
    const neighborhood = selectedNodeId
      ? getConnectedNeighborhood(graph, selectedNodeId)
      : null;

    // Convert to React Flow nodes
    const nodes: Node[] = visualNodes.map(node => {
      const position = layoutPositions.get(node.id) || { x: 0, y: 0 };
      const isSelected = node.id === selectedNodeId;
      const isDimmed = neighborhood ? !neighborhood.has(node.id) : false;

      return {
        id: node.id,
        type: 'investigationNode',
        position,
        data: {
          nodeData: node.data,
          isSelected,
          isDimmed,
          onSelect: () => {
            setSelectedNodeId(node.id);
            onSelectNode(node.id);
          },
        },
        draggable: true,
      };
    });

    // Filter edges to only those connecting visual nodes
    const visualNodeIds = new Set(visualNodes.map(n => n.id));
    const visualEdges = graph.edges.filter(
      edge => visualNodeIds.has(edge.source) && visualNodeIds.has(edge.target)
    );

    // Convert to React Flow edges
    const edges: Edge[] = visualEdges.map(edge => {
      const isConnectedToSelected = neighborhood
        ? neighborhood.has(edge.source) && neighborhood.has(edge.target)
        : true;

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: false,
        style: {
          stroke: isConnectedToSelected ? CRYPTO_TEAL + '80' : MUTED_TEXT + '30',
          strokeWidth: isConnectedToSelected ? 2 : 1.5,
        },
        label: edge.relationType,
        labelStyle: {
          fontSize: 10,
          fill: MUTED_TEXT,
          fontWeight: 500,
        },
        labelBgStyle: {
          fill: '#151C25',
          fillOpacity: 0.8,
        },
      };
    });

    // Compute statistics
    const categoryCount = new Map<string, number>();
    visualNodes.forEach(node => {
      const cat = node.data.category;
      categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
    });

    const edgeTypeCount = new Map<string, number>();
    visualEdges.forEach(edge => {
      const type = edge.relationType;
      edgeTypeCount.set(type, (edgeTypeCount.get(type) || 0) + 1);
    });

    const nonRenderedCategories = graph.nodes
      .filter(node => !VISUAL_NODE_CATEGORIES.has(node.data.category))
      .map(node => node.data.category);
    const nonRenderedCount = new Map<string, number>();
    nonRenderedCategories.forEach(cat => {
      nonRenderedCount.set(cat, (nonRenderedCount.get(cat) || 0) + 1);
    });

    return {
      nodes,
      edges,
      stats: {
        totalBackendNodes: graph.nodes.length,
        totalVisualNodes: visualNodes.length,
        totalEdges: visualEdges.length,
        byCategory: Object.fromEntries(categoryCount),
        byEdgeType: Object.fromEntries(edgeTypeCount),
        nonRenderedCategories: Object.fromEntries(nonRenderedCount),
      },
    };
  }, [graph, selectedNodeId, onSelectNode]);

  // Log statistics (for requirements)
  useMemo(() => {
    console.log('=== INVESTIGATION GRAPH STATISTICS ===');
    console.log('Scan ID:', graph.scanId);
    console.log('Total Backend Nodes:', stats.totalBackendNodes);
    console.log('Total Visual Nodes:', stats.totalVisualNodes);
    console.log('Total Edges:', stats.totalEdges);
    console.log('\nNodes by Category:', stats.byCategory);
    console.log('\nEdges by Type:', stats.byEdgeType);
    console.log('\nNon-Rendered Categories:', stats.nonRenderedCategories);
    console.log('======================================');
  }, [graph.scanId, stats]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (node.data.onSelect) {
        node.data.onSelect();
      }
    },
    []
  );

  return (
    <div className="w-full h-full relative">
      <SpatialCanvas
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
      >
        <SpatialToolbarWrapper selectedNodeId={selectedNodeId} />
      </SpatialCanvas>
    </div>
  );
}

// Wrapper component to access React Flow instance
function SpatialToolbarWrapper({ selectedNodeId }: { selectedNodeId: string | null }) {
  const { fitView, zoomIn, zoomOut, setCenter, getNode } = useReactFlow();

  const handleRecenter = useCallback(() => {
    if (selectedNodeId) {
      const node = getNode(selectedNodeId);
      if (node) {
        setCenter(node.position.x + 150, node.position.y, {
          duration: 400,
          zoom: 1,
        });
      }
    } else {
      fitView({ duration: 400, padding: 0.2 });
    }
  }, [selectedNodeId, getNode, setCenter, fitView]);

  return (
    <SpatialToolbar
      onFitView={() => fitView({ duration: 400, padding: 0.2 })}
      onZoomIn={() => zoomIn({ duration: 200 })}
      onZoomOut={() => zoomOut({ duration: 200 })}
    />
  );
}
