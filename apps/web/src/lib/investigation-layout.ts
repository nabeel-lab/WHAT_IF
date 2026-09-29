/**
 * Investigation Graph Layout Engine
 * 
 * Deterministic horizontal spine layout with spatial branching.
 * Main flow: Data → Crypto → Key/Cert → Service → Control → Analysis
 * Branches extend above/below the main horizontal spine.
 */

import type { InvestigationGraph, InvestigationNode } from '@/types/investigation-graph';

export interface LayoutPosition {
  x: number;
  y: number;
}

export interface LayoutConfig {
  horizontalSpacing: number;
  verticalSpacing: number;
  branchSpacing: number;
  centerY: number;
  lanes: {
    DATA: number;
    CRYPTO: number;
    KEY_CERT_PROVIDER: number;
    SERVICE: number;
    CONTROL: number;
    ANALYSIS: number;
  };
}

const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  horizontalSpacing: 420,
  verticalSpacing: 180,
  branchSpacing: 140,
  centerY: 300,
  lanes: {
    DATA: 0,
    CRYPTO: 420,
    KEY_CERT_PROVIDER: 840,
    SERVICE: 1260,
    CONTROL: 1680,
    ANALYSIS: 2100,
  },
};

/**
 * Compute deterministic layout positions for all graph nodes with branching support
 */
export function computeGraphLayout(
  graph: InvestigationGraph,
  expandedNodes: Set<string>,
  config: Partial<LayoutConfig> = {}
): Map<string, LayoutPosition> {
  const fullConfig = { ...DEFAULT_LAYOUT_CONFIG, ...config };
  const positions = new Map<string, LayoutPosition>();

  // Determine which nodes should be visible based on expansion state
  const visibleNodes = getVisibleNodes(graph, expandedNodes);

  // Group visible nodes by category
  const nodesByCategory = new Map<string, InvestigationNode[]>();
  visibleNodes.forEach(node => {
    const category = node.data.category;
    if (!nodesByCategory.has(category)) {
      nodesByCategory.set(category, []);
    }
    nodesByCategory.get(category)!.push(node);
  });

  // Layout DATA nodes in lane 0
  const dataNodes = nodesByCategory.get('DATA_ASSET') || [];
  layoutLaneWithBranching(
    dataNodes,
    fullConfig.lanes.DATA,
    fullConfig.centerY,
    fullConfig.verticalSpacing,
    fullConfig.branchSpacing,
    graph,
    expandedNodes,
    positions
  );

  // Layout CRYPTO nodes in lane 1
  const cryptoNodes = nodesByCategory.get('CRYPTO_ASSET') || [];
  layoutLaneWithBranching(
    cryptoNodes,
    fullConfig.lanes.CRYPTO,
    fullConfig.centerY,
    fullConfig.verticalSpacing,
    fullConfig.branchSpacing,
    graph,
    expandedNodes,
    positions
  );

  // Layout KEY/CERT/PROVIDER nodes in lane 2 (mixed)
  const keyNodes = nodesByCategory.get('KEY_CONTEXT') || [];
  const certNodes = nodesByCategory.get('CERTIFICATE') || [];
  const providerNodes = nodesByCategory.get('PROVIDER') || [];
  const lane2Nodes = [...keyNodes, ...certNodes, ...providerNodes];
  layoutLaneWithBranching(
    lane2Nodes,
    fullConfig.lanes.KEY_CERT_PROVIDER,
    fullConfig.centerY,
    fullConfig.verticalSpacing,
    fullConfig.branchSpacing,
    graph,
    expandedNodes,
    positions
  );

  // Layout SERVICE nodes in lane 3
  const serviceNodes = nodesByCategory.get('SERVICE') || [];
  layoutLaneWithBranching(
    serviceNodes,
    fullConfig.lanes.SERVICE,
    fullConfig.centerY,
    fullConfig.verticalSpacing,
    fullConfig.branchSpacing,
    graph,
    expandedNodes,
    positions
  );

  // Layout CONTROL nodes in lane 4
  const controlNodes = nodesByCategory.get('CONTROL') || [];
  layoutLaneWithBranching(
    controlNodes,
    fullConfig.lanes.CONTROL,
    fullConfig.centerY,
    fullConfig.verticalSpacing,
    fullConfig.branchSpacing,
    graph,
    expandedNodes,
    positions
  );

  // Layout ANALYSIS nodes in lane 5
  const analysisNodes = nodesByCategory.get('ANALYSIS') || [];
  layoutLaneWithBranching(
    analysisNodes,
    fullConfig.lanes.ANALYSIS,
    fullConfig.centerY,
    fullConfig.verticalSpacing,
    fullConfig.branchSpacing,
    graph,
    expandedNodes,
    positions
  );

  return positions;
}

/**
 * Get visible nodes based on expansion state
 */
function getVisibleNodes(
  graph: InvestigationGraph,
  expandedNodes: Set<string>
): InvestigationNode[] {
  // For now, all nodes are visible (expansion controls visibility at render level)
  // In future, can implement true visibility filtering here
  return graph.nodes;
}

/**
 * Layout nodes in a lane with branching support
 */
function layoutLaneWithBranching(
  nodes: InvestigationNode[],
  x: number,
  centerY: number,
  mainSpacing: number,
  branchSpacing: number,
  graph: InvestigationGraph,
  expandedNodes: Set<string>,
  positions: Map<string, LayoutPosition>
): void {
  if (nodes.length === 0) return;

  // Calculate total height for main spine nodes
  const totalHeight = (nodes.length - 1) * mainSpacing;
  let currentY = centerY - totalHeight / 2;

  nodes.forEach((node, index) => {
    // Main spine position
    positions.set(node.id, { x, y: currentY });

    // Check if node is expanded and has children
    if (expandedNodes.has(node.id)) {
      const children = getDirectChildren(graph, node.id);
      
      // Layout children as branches above/below
      if (children.length > 0) {
        layoutBranches(children, x, currentY, branchSpacing, positions);
      }
    }

    currentY += mainSpacing;
  });
}

/**
 * Get direct children of a node (outgoing edges)
 */
function getDirectChildren(graph: InvestigationGraph, nodeId: string): InvestigationNode[] {
  const edges = graph.edgesBySource.get(nodeId) || [];
  const children: InvestigationNode[] = [];
  
  edges.forEach(edge => {
    const childNode = graph.nodeIndex.get(edge.target);
    if (childNode && childNode.id !== nodeId) { // Avoid self-loops
      children.push(childNode);
    }
  });

  return children;
}

/**
 * Layout branches above/below a parent node
 */
function layoutBranches(
  branches: InvestigationNode[],
  parentX: number,
  parentY: number,
  branchSpacing: number,
  positions: Map<string, LayoutPosition>
): void {
  if (branches.length === 0) return;

  // Alternate branches above and below parent
  branches.forEach((branch, index) => {
    const isAbove = index % 2 === 0;
    const branchIndex = Math.floor(index / 2) + 1;
    const offset = branchIndex * branchSpacing;
    
    positions.set(branch.id, {
      x: parentX,
      y: isAbove ? parentY - offset : parentY + offset,
    });
  });
}

/**
 * Get connected neighborhood for a node (for highlighting)
 */
export function getConnectedNeighborhood(
  graph: InvestigationGraph,
  nodeId: string
): Set<string> {
  const neighborhood = new Set<string>();
  neighborhood.add(nodeId);

  // BFS to find connected nodes (1 level)
  const queue = [nodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    // Find outgoing edges
    const outgoing = graph.edgesBySource.get(current) || [];
    outgoing.forEach(edge => {
      neighborhood.add(edge.target);
    });

    // Find incoming edges
    const incoming = graph.edgesByTarget.get(current) || [];
    incoming.forEach(edge => {
      neighborhood.add(edge.source);
    });
  }

  return neighborhood;
}

/**
 * Compute bounding box for graph
 */
export function computeGraphBounds(positions: Map<string, LayoutPosition>): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (positions.size === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  positions.forEach(pos => {
    minX = Math.min(minX, pos.x);
    maxX = Math.max(maxX, pos.x);
    minY = Math.min(minY, pos.y);
    maxY = Math.max(maxY, pos.y);
  });

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
