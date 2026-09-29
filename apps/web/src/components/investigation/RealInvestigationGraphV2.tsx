/**
 * Real Investigation Graph Renderer V2
 * 
 * With spatial branching, expand/collapse, and focus mode.
 */

'use client';

import { useMemo, useCallback, useState } from 'react';
import { Node, Edge, useNodesState, useEdgesState, useReactFlow } from 'reactflow';
import 'reactflow/dist/style.css';
import type { InvestigationGraph } from '@/types/investigation-graph';
import {
  computeBranchingLayout,
  getConnectedNeighborhood,
  getNodeDescendants,
  isNodeExpandable,
  isNodeCollapsible,
  computeGraphBounds,
} from '@/lib/investigation-layout-branching';
import SpatialCanvas from './spatial/SpatialCanvas';
import InvestigationNode from './nodes/InvestigationNode';
import SpatialToolbar from './spatial/SpatialToolbar';
import AvoidanceEdge from './edges/AvoidanceEdge';

interface RealInvestigationGraphV2Props {
  graph: InvestigationGraph;
  onSelectNode: (nodeId: string) => void;
}

const nodeTypes = {
  investigationNode: InvestigationNode,
};

const edgeTypes = {
  avoidanceEdge: AvoidanceEdge,
};

// Design spec colors
const GLASS_SURFACE = '#151C25';
const PRIMARY_TEXT = '#EAF0F6';
const MUTED_TEXT = '#A8B4C2';
const CRYPTO_TEAL = '#60F1D0';

// Categories to render as visual nodes
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

export default function RealInvestigationGraphV2({
  graph,
  onSelectNode,
}: RealInvestigationGraphV2Props) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [focusMode, setFocusMode] = useState<boolean>(false);

  // Compute visible nodes based on expansion state
  const visibleNodeIds = useMemo(() => {
    const visible = new Set<string>();

    // Start with all visual nodes
    graph.nodes.forEach(node => {
      if (VISUAL_NODE_CATEGORIES.has(node.data.category)) {
        visible.add(node.id);
      }
    });

    // In initial state, show only nodes with high connectivity (spine)
    // Hide branch nodes until their parent is expanded
    if (expandedNodes.size === 0) {
      // Keep only well-connected nodes for initial view
      const initialVisible = new Set<string>();
      graph.nodes.forEach(node => {
        if (!VISUAL_NODE_CATEGORIES.has(node.data.category)) return;

        const outgoing = graph.edgesBySource.get(node.id) || [];
        const incoming = graph.edgesByTarget.get(node.id) || [];
        const connectionCount = outgoing.length + incoming.length;

        // Show if well-connected (spine) or has no connections (isolated)
        if (connectionCount >= 2 || connectionCount === 0) {
          initialVisible.add(node.id);
        }
      });

      return initialVisible;
    }

    // Show expanded descendants
    expandedNodes.forEach(nodeId => {
      const descendants = getNodeDescendants(graph, nodeId, 1);
      descendants.forEach(id => {
        if (VISUAL_NODE_CATEGORIES.has(graph.nodeIndex.get(id)?.data.category || '')) {
          visible.add(id);
        }
      });
    });

    return visible;
  }, [graph, expandedNodes]);

  // Compute React Flow nodes and edges
  const { nodes: initialNodes, edges: initialEdges, stats } = useMemo(() => {
    // Filter to visible nodes
    const visualNodes = graph.nodes.filter(node =>
      VISUAL_NODE_CATEGORIES.has(node.data.category) && visibleNodeIds.has(node.id)
    );

    // Compute branching layout
    const layoutPositions = computeBranchingLayout(
      graph,
      visibleNodeIds
    );

    // Get connected neighborhood for focus mode
    const neighborhood = selectedNodeId && focusMode
      ? getConnectedNeighborhood(graph, selectedNodeId)
      : null;

    // Check expand/collapse state for each node
    const expandableNodes = new Map<string, boolean>();
    const collapsibleNodes = new Map<string, boolean>();
    visualNodes.forEach(node => {
      expandableNodes.set(node.id, isNodeExpandable(graph, node.id, visibleNodeIds));
      collapsibleNodes.set(node.id, isNodeCollapsible(graph, node.id, visibleNodeIds));
    });

    // Convert to React Flow nodes
    const nodes: Node[] = visualNodes.map(node => {
      const position = layoutPositions.get(node.id) || { x: 0, y: 0 };
      const isSelected = node.id === selectedNodeId;
      const isDimmed = neighborhood ? !neighborhood.has(node.id) : false;
      const isExpandable = expandableNodes.get(node.id) || false;
      const isCollapsible = collapsibleNodes.get(node.id) || false;

      return {
        id: node.id,
        type: 'investigationNode',
        position,
        data: {
          nodeData: node.data,
          isSelected,
          isDimmed,
          isExpandable,
          isCollapsible,
          onSelect: () => {
            setSelectedNodeId(node.id);
            onSelectNode(node.id);
          },
          onExpand: isExpandable ? () => handleExpand(node.id) : undefined,
          onCollapse: isCollapsible ? () => handleCollapse(node.id) : undefined,
        },
        draggable: true,
      };
    });

    // Filter edges to visible nodes
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
        type: 'avoidanceEdge',
        animated: false,
        style: {
          stroke: isConnectedToSelected ? CRYPTO_TEAL + '99' : MUTED_TEXT + '20',
          strokeWidth: isConnectedToSelected ? 2.5 : 1,
          transition: 'all 240ms ease-out',
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

    return {
      nodes,
      edges,
      stats: {
        totalVisibleNodes: visualNodes.length,
        totalEdges: visualEdges.length,
        byCategory: Object.fromEntries(categoryCount),
        expandedCount: expandedNodes.size,
      },
    };
  }, [graph, visibleNodeIds, selectedNodeId, focusMode, expandedNodes, onSelectNode]);

  // Log statistics
  useMemo(() => {
    console.log('=== BRANCHING GRAPH STATISTICS ===');
    console.log('Visible Nodes:', stats.totalVisibleNodes);
    console.log('Edges:', stats.totalEdges);
    console.log('Expanded Nodes:', stats.expandedCount);
    console.log('By Category:', stats.byCategory);
    console.log('==================================');
  }, [stats]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when layout changes (with animation)
  useMemo(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  const handleExpand = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      next.add(nodeId);
      return next;
    });
  }, []);

  const handleCollapse = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      next.delete(nodeId);
      // Also remove any descendants from expanded set
      const descendants = getNodeDescendants(graph, nodeId, 2);
      descendants.forEach(id => next.delete(id));
      return next;
    });
  }, [graph]);

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (node.data.onSelect) {
        node.data.onSelect();
      }
    },
    []
  );

  const toggleFocusMode = useCallback(() => {
    setFocusMode(prev => !prev);
  }, []);

  return (
    <div className="w-full h-full relative">
      <SpatialCanvas
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
      >
        <SpatialToolbarWrapper 
          selectedNodeId={selectedNodeId}
          focusMode={focusMode}
          onToggleFocus={toggleFocusMode}
        />
      </SpatialCanvas>
    </div>
  );
}

// Wrapper component to access React Flow instance
function SpatialToolbarWrapper({ 
  selectedNodeId, 
  focusMode,
  onToggleFocus 
}: { 
  selectedNodeId: string | null;
  focusMode: boolean;
  onToggleFocus: () => void;
}) {
  const { fitView, zoomIn, zoomOut, setCenter, getNode } = useReactFlow();

  const handleRecenter = useCallback(() => {
    if (selectedNodeId) {
      const node = getNode(selectedNodeId);
      if (node) {
        // Center on selected node without changing zoom
        setCenter(node.position.x + 150, node.position.y, {
          duration: 300,
        });
      }
    } else {
      fitView({ duration: 300, padding: 0.2 });
    }
  }, [selectedNodeId, getNode, setCenter, fitView]);

  return (
    <div>
      <SpatialToolbar
        onFitView={() => fitView({ duration: 300, padding: 0.2 })}
        onZoomIn={() => zoomIn({ duration: 180 })}
        onZoomOut={() => zoomOut({ duration: 180 })}
        onRecenter={handleRecenter}
      />
      {/* Focus mode toggle button */}
      <button
        onClick={onToggleFocus}
        className="absolute bottom-6 left-6 z-10 px-4 py-2.5 rounded-full shadow-2xl transition-all duration-200 hover:scale-105 flex items-center gap-2 text-sm font-medium tracking-wide"
        style={{
          backgroundColor: GLASS_SURFACE + 'CC',
          border: `1px solid ${focusMode ? CRYPTO_TEAL : MUTED_TEXT}40`,
          color: focusMode ? CRYPTO_TEAL : PRIMARY_TEXT,
          backdropFilter: 'blur(12px)',
        }}
      >
        <div 
          className="w-2 h-2 rounded-full transition-all duration-200" 
          style={{ 
            backgroundColor: focusMode ? CRYPTO_TEAL : MUTED_TEXT + '60',
            boxShadow: focusMode ? `0 0 8px ${CRYPTO_TEAL}` : 'none'
          }} 
        />
        {focusMode ? 'Focus Active' : 'Focus Mode'}
      </button>
    </div>
  );
}
