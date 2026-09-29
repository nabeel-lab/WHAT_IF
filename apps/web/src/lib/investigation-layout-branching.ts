/**
 * Investigation Graph Layout Engine with Branching
 * 
 * Deterministic horizontal spine layout with above/below branching.
 * Main flow: Data → Crypto → Key/Cert → Service → Control → Analysis
 */

import type { InvestigationGraph, InvestigationNode, InvestigationEdge } from '@/types/investigation-graph';

export interface LayoutPosition {
  x: number;
  y: number;
}

export interface BranchingLayoutConfig {
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

const DEFAULT_BRANCHING_CONFIG: BranchingLayoutConfig = {
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
 * Compute branching layout with expand/collapse support
 */
export function computeBranchingLayout(
  graph: InvestigationGraph,
  visibleNodeIds: Set<string>,
  config: Partial<BranchingLayoutConfig> = {}
): Map<string, LayoutPosition> {
  const fullConfig = { ...DEFAULT_BRANCHING_CONFIG, ...config };
  const positions = new Map<string, LayoutPosition>();

  // Filter to visible nodes only
  const visibleNodes = graph.nodes.filter(node => visibleNodeIds.has(node.id));

  // Group nodes by category
  const nodesByCategory = new Map<string, InvestigationNode[]>();
  visibleNodes.forEach(node => {
    const category = node.data.category;
    if (!nodesByCategory.has(category)) {
      nodesByCategory.set(category, []);
    }
    nodesByCategory.get(category)!.push(node);
  });

  // Layout each category in its lane
  layoutLane(
    nodesByCategory.get('DATA_ASSET') || [],
    fullConfig.lanes.DATA,
    fullConfig.centerY,
    fullConfig.verticalSpacing,
    fullConfig.branchSpacing,
    graph,
    positions
  );

  layoutLane(
    nodesByCategory.get('CRYPTO_ASSET') || [],
    fullConfig.lanes.CRYPTO,
    fullConfig.centerY,
    fullConfig.verticalSpacing,
    fullConfig.branchSpacing,
    graph,
    positions
  );

  layoutLane(
    [...(nodesByCategory.get('KEY_CONTEXT') || []),
     ...(nodesByCategory.get('CERTIFICATE') || []),
     ...(nodesByCategory.get('PROVIDER') || [])],
    fullConfig.lanes.KEY_CERT_PROVIDER,
    fullConfig.centerY,
    fullConfig.verticalSpacing,
    fullConfig.branchSpacing,
    graph,
    positions
  );

  layoutLane(
    nodesByCategory.get('SERVICE') || [],
    fullConfig.lanes.SERVICE,
    fullConfig.centerY,
    fullConfig.verticalSpacing,
    fullConfig.branchSpacing,
    graph,
    positions
  );

  layoutLane(
    nodesByCategory.get('CONTROL') || [],
    fullConfig.lanes.CONTROL,
    fullConfig.centerY,
    fullConfig.verticalSpacing,
    fullConfig.branchSpacing,
    graph,
    positions
  );

  layoutLane(
    nodesByCategory.get('ANALYSIS') || [],
    fullConfig.lanes.ANALYSIS,
    fullConfig.centerY,
    fullConfig.verticalSpacing,
    fullConfig.branchSpacing,
    graph,
    positions
  );

  return positions;
}

/**
 * Layout nodes in a lane with branching
 */
function layoutLane(
  nodes: InvestigationNode[],
  x: number,
  centerY: number,
  verticalSpacing: number,
  branchSpacing: number,
  graph: InvestigationGraph,
  positions: Map<string, LayoutPosition>
): void {
  if (nodes.length === 0) return;

  // Main spine nodes (center)
  const spineNodes: InvestigationNode[] = [];
  const branchNodes: InvestigationNode[] = [];

  // Determine which nodes are on spine vs branches
  // Nodes with many connections are spine, others branch
  nodes.forEach(node => {
    const outgoing = graph.edgesBySource.get(node.id) || [];
    const incoming = graph.edgesByTarget.get(node.id) || [];
    const connectionCount = outgoing.length + incoming.length;

    if (connectionCount >= 2) {
      spineNodes.push(node);
    } else {
      branchNodes.push(node);
    }
  });

  // If no clear spine, treat first half as spine
  if (spineNodes.length === 0) {
    const mid = Math.floor(nodes.length / 2);
    spineNodes.push(...nodes.slice(0, Math.max(1, mid)));
    branchNodes.push(...nodes.slice(Math.max(1, mid)));
  }

  // Layout spine nodes vertically centered
  const spineHeight = (spineNodes.length - 1) * verticalSpacing;
  const spineStartY = centerY - spineHeight / 2;

  spineNodes.forEach((node, index) => {
    positions.set(node.id, {
      x,
      y: spineStartY + index * verticalSpacing,
    });
  });

  // Layout branch nodes alternating above/below
  branchNodes.forEach((node, index) => {
    const above = index % 2 === 0;
    const branchIndex = Math.floor(index / 2);
    const baseY = spineNodes.length > 0 ? positions.get(spineNodes[0].id)!.y : centerY;

    positions.set(node.id, {
      x,
      y: above 
        ? baseY - branchSpacing * (branchIndex + 1)
        : baseY + branchSpacing * (branchIndex + 1),
    });
  });
}

/**
 * Get descendants of a node for expansion
 */
export function getNodeDescendants(
  graph: InvestigationGraph,
  nodeId: string,
  maxDepth: number = 1
): Set<string> {
  const descendants = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [{ id: nodeId, depth: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    
    if (visited.has(id) || depth > maxDepth) continue;
    visited.add(id);

    if (id !== nodeId) {
      descendants.add(id);
    }

    // Add outgoing connections
    const outgoing = graph.edgesBySource.get(id) || [];
    outgoing.forEach(edge => {
      if (!visited.has(edge.target)) {
        queue.push({ id: edge.target, depth: depth + 1 });
      }
    });
  }

  return descendants;
}

/**
 * Get ancestors of a node (nodes that connect to it)
 */
export function getNodeAncestors(
  graph: InvestigationGraph,
  nodeId: string,
  maxDepth: number = 1
): Set<string> {
  const ancestors = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [{ id: nodeId, depth: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    
    if (visited.has(id) || depth > maxDepth) continue;
    visited.add(id);

    if (id !== nodeId) {
      ancestors.add(id);
    }

    // Add incoming connections
    const incoming = graph.edgesByTarget.get(id) || [];
    incoming.forEach(edge => {
      if (!visited.has(edge.source)) {
        queue.push({ id: edge.source, depth: depth + 1 });
      }
    });
  }

  return ancestors;
}

/**
 * Get connected neighborhood for focus mode
 */
export function getConnectedNeighborhood(
  graph: InvestigationGraph,
  nodeId: string
): Set<string> {
  const neighborhood = new Set<string>();
  neighborhood.add(nodeId);

  // Add all directly connected nodes
  const outgoing = graph.edgesBySource.get(nodeId) || [];
  outgoing.forEach(edge => neighborhood.add(edge.target));

  const incoming = graph.edgesByTarget.get(nodeId) || [];
  incoming.forEach(edge => neighborhood.add(edge.source));

  return neighborhood;
}

/**
 * Check if a node is expandable
 */
export function isNodeExpandable(
  graph: InvestigationGraph,
  nodeId: string,
  currentlyVisibleNodes: Set<string>
): boolean {
  const descendants = getNodeDescendants(graph, nodeId, 1);
  // Node is expandable if it has descendants that are not currently visible
  return Array.from(descendants).some(id => !currentlyVisibleNodes.has(id));
}

/**
 * Check if a node is collapsible
 */
export function isNodeCollapsible(
  graph: InvestigationGraph,
  nodeId: string,
  currentlyVisibleNodes: Set<string>
): boolean {
  const descendants = getNodeDescendants(graph, nodeId, 1);
  // Node is collapsible if it has descendants that are currently visible
  return Array.from(descendants).some(id => currentlyVisibleNodes.has(id));
}

/**
 * Compute bounding box for visible nodes
 */
export function computeGraphBounds(positions: Map<string, LayoutPosition>): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
} {
  if (positions.size === 0) {
    return { 
      minX: 0, maxX: 0, minY: 0, maxY: 0, 
      width: 0, height: 0, centerX: 0, centerY: 0 
    };
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
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}
