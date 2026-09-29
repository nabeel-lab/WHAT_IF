/**
 * Investigation Graph Builder
 * 
 * Converts real backend entities into a canonical investigation graph.
 * Only creates relationships supported by actual database foreign keys.
 */

import type {
  InvestigationGraph,
  InvestigationNode,
  InvestigationEdge,
  NodeEvidenceState,
  CryptoPath,
  CryptoAsset,
  DataAsset,
  KeyContext,
  Certificate,
  Control,
  ReachabilityResult,
  RuntimeEvent,
  AnalysisResult,
  GraphValidationResult,
  GraphValidationError,
} from '@/types/investigation-graph';

// ============================================================================
// GRAPH BUILDER INPUT
// ============================================================================

export interface GraphBuilderInput {
  scanId: string;
  cryptoPaths: CryptoPath[];
  cryptoAssets: CryptoAsset[];
  dataAssets: DataAsset[];
  keyContexts: KeyContext[];
  certificates: Certificate[];
  controls: Control[];
  reachabilityResults: ReachabilityResult[];
  runtimeEvents: RuntimeEvent[];
  analysisResults: AnalysisResult[];
  evidence?: any[];
  rawFindings?: any[];
  projectName?: string;
}

// ============================================================================
// BUILD INVESTIGATION GRAPH
// ============================================================================

export function buildInvestigationGraph(input: GraphBuilderInput): InvestigationGraph {
  const nodes: InvestigationNode[] = [];
  const edges: InvestigationEdge[] = [];
  const nodeIdSet = new Set<string>();
  const edgeIdSet = new Set<string>();

  // Create lookup maps for entity deduplication
  const cryptoAssetMap = new Map(input.cryptoAssets.map(a => [a.id, a]));
  const dataAssetMap = new Map(input.dataAssets.map(a => [a.id, a]));
  const keyContextMap = new Map(input.keyContexts.map(k => [k.id, k]));
  const certificateMap = new Map(input.certificates.map(c => [c.id, c]));
  const reachabilityMap = new Map(input.reachabilityResults.map(r => [r.asset_id, r]));
  const runtimeEventsByAsset = new Map<string, RuntimeEvent[]>();
  const runtimeEventsByPath = new Map<string, RuntimeEvent[]>();
  const controlsByAsset = new Map<string, Control[]>();
  const analysisByFinding = new Map<string, AnalysisResult>();
  const analysisByPath = new Map<string, AnalysisResult>();

  // Group runtime events by asset and path
  input.runtimeEvents.forEach(event => {
    if (!runtimeEventsByAsset.has(event.asset_id)) {
      runtimeEventsByAsset.set(event.asset_id, []);
    }
    runtimeEventsByAsset.get(event.asset_id)!.push(event);

    if (event.crypto_path_id) {
      if (!runtimeEventsByPath.has(event.crypto_path_id)) {
        runtimeEventsByPath.set(event.crypto_path_id, []);
      }
      runtimeEventsByPath.get(event.crypto_path_id)!.push(event);
    }
  });

  // Group controls by asset
  input.controls.forEach(control => {
    if (control.crypto_asset_id) {
      if (!controlsByAsset.has(control.crypto_asset_id)) {
        controlsByAsset.set(control.crypto_asset_id, []);
      }
      controlsByAsset.get(control.crypto_asset_id)!.push(control);
    }
  });

  // Index analysis results
  input.analysisResults.forEach(result => {
    if (result.finding_id) {
      analysisByFinding.set(result.finding_id, result);
    }
    if (result.crypto_path_id) {
      analysisByPath.set(result.crypto_path_id, result);
    }
  });

  // Helper to add node without duplicates
  const addNode = (node: InvestigationNode) => {
    if (!nodeIdSet.has(node.id)) {
      nodes.push(node);
      nodeIdSet.add(node.id);
    }
  };

  // Helper to add edge without duplicates or dangling nodes
  const addEdge = (edge: InvestigationEdge) => {
    if (
      !edgeIdSet.has(edge.id) &&
      nodeIdSet.has(edge.source) &&
      nodeIdSet.has(edge.target) &&
      edge.source !== edge.target
    ) {
      edges.push(edge);
      edgeIdSet.add(edge.id);
    }
  };

  // Helper to compute evidence state from backend data
  const computeEvidenceState = (assetId: string): NodeEvidenceState => {
    const reach = reachabilityMap.get(assetId);
    const events = runtimeEventsByAsset.get(assetId) || [];
    const analysis = analysisByFinding.get(assetId);

    const discovered = true; // All assets in DB are discovered
    const reachable = reach?.status === 'REACHABLE';
    const runtimeObserved = events.length > 0;

    let rawState = 'DISCOVERED';
    if (reachable) rawState += '→REACHABLE';
    if (runtimeObserved) {
      rawState += '→RUNTIME_OBSERVED';
    } else if (reachable) {
      rawState += '→NOT_OBSERVED';
    }

    return { discovered, reachable, runtimeObserved, rawState };
  };

  // ============================================================================
  // CREATE NODES FROM ENTITIES
  // ============================================================================

  // 1. CryptoAsset nodes (only non-certificates)
  input.cryptoAssets
    .filter(asset => !asset.name.startsWith('Certificate:'))
    .forEach(asset => {
      const nodeId = `crypto:${asset.id}`;
      const evidenceState = computeEvidenceState(asset.id);

      addNode({
        id: nodeId,
        data: {
          id: asset.id,
          scanId: input.scanId,
          category: 'CRYPTO_ASSET',
          label: asset.name,
          evidenceState,
          metadata: {
            algorithm: asset.algorithm,
            role: asset.role,
            assetType: asset.asset_type,
          },
          cryptoAsset: {
            id: asset.id,
            name: asset.name,
            algorithm: asset.algorithm,
            role: asset.role,
            assetType: asset.asset_type,
            sourceFile: asset.source_file,
            lineStart: asset.line_start,
            library: asset.library,
          },
        },
      });
    });

  // 2. DataAsset nodes
  input.dataAssets.forEach(asset => {
    const nodeId = `data:${asset.id}`;
    addNode({
      id: nodeId,
      data: {
        id: asset.id,
        scanId: input.scanId,
        category: 'DATA_ASSET',
        label: asset.name,
        metadata: {
          classification: asset.classification,
          sensitivity: asset.sensitivity,
        },
        dataAsset: {
          id: asset.id,
          name: asset.name,
          classification: asset.classification,
          sensitivity: asset.sensitivity,
          businessCriticality: asset.business_criticality,
          requiredConfidentialityUntil: asset.required_confidentiality_until,
        },
      },
    });
  });

  // 3. KeyContext nodes
  input.keyContexts.forEach(key => {
    const nodeId = `key:${key.id}`;
    addNode({
      id: nodeId,
      data: {
        id: key.id,
        scanId: input.scanId,
        category: 'KEY_CONTEXT',
        label: key.key_id_name,
        metadata: {
          algorithm: key.algorithm,
          scope: key.scope,
        },
        keyContext: {
          id: key.id,
          keyIdName: key.key_id_name,
          keyType: key.key_type,
          algorithm: key.algorithm,
          scope: key.scope,
          rotationState: key.rotation_state,
          custodyType: key.custody_type,
        },
      },
    });
  });

  // 4. Certificate nodes
  input.certificates.forEach(cert => {
    const nodeId = `cert:${cert.id}`;
    addNode({
      id: nodeId,
      data: {
        id: cert.id,
        scanId: input.scanId,
        category: 'CERTIFICATE',
        label: cert.name,
        metadata: {
          algorithm: cert.algorithm,
          issuer: cert.issuer,
        },
        certificate: {
          id: cert.id,
          name: cert.name,
          algorithm: cert.algorithm,
          issuer: cert.issuer,
          validFrom: cert.valid_from,
          validUntil: cert.valid_until,
        },
      },
    });
  });

  // 5. Service nodes (from entrypoints - deduplicated)
  const entrypointSet = new Set<string>();
  const entrypointPathCounts = new Map<string, number>();

  input.cryptoPaths.forEach(path => {
    if (path.entrypoint) {
      entrypointSet.add(path.entrypoint);
      entrypointPathCounts.set(
        path.entrypoint,
        (entrypointPathCounts.get(path.entrypoint) || 0) + 1
      );
    }
  });

  entrypointSet.forEach(entrypoint => {
    const nodeId = `service:${entrypoint}`;
    addNode({
      id: nodeId,
      data: {
        id: entrypoint,
        scanId: input.scanId,
        category: 'SERVICE',
        label: entrypoint,
        metadata: {},
        service: {
          entrypoint,
          pathCount: entrypointPathCounts.get(entrypoint) || 0,
        },
      },
    });
  });

  // 6. Control nodes
  input.controls.forEach(control => {
    const nodeId = `control:${control.id}`;
    addNode({
      id: nodeId,
      data: {
        id: control.id,
        scanId: input.scanId,
        category: 'CONTROL',
        label: control.control_name,
        metadata: {
          controlState: control.control_state,
        },
        control: {
          id: control.id,
          controlName: control.control_name,
          controlState: control.control_state,
          evidence: control.evidence,
        },
      },
    });
  });

  // 7. Reachability nodes
  input.reachabilityResults.forEach(reach => {
    const nodeId = `reach:${reach.id}`;
    addNode({
      id: nodeId,
      data: {
        id: reach.id,
        scanId: input.scanId,
        category: 'REACHABILITY',
        label: `Reachability: ${reach.status}`,
        metadata: {
          status: reach.status,
          entrypoint: reach.entrypoint,
        },
        reachability: {
          id: reach.id,
          status: reach.status,
          entrypoint: reach.entrypoint,
          sourceFile: reach.source_file,
          sourceLine: reach.source_line,
        },
      },
    });
  });

  // 8. RuntimeEvent nodes
  input.runtimeEvents.forEach(event => {
    const nodeId = `runtime:${event.id}`;
    addNode({
      id: nodeId,
      data: {
        id: event.id,
        scanId: input.scanId,
        category: 'RUNTIME_EVENT',
        label: `Runtime: ${event.algorithm}`,
        metadata: {
          eventType: event.event_type,
          timestamp: event.timestamp,
        },
        runtimeEvent: {
          id: event.id,
          eventType: event.event_type,
          algorithm: event.algorithm,
          role: event.role,
          entrypoint: event.entrypoint,
          operation: event.operation,
          timestamp: event.timestamp,
          sourceFile: event.source_file,
          sourceLine: event.source_line,
        },
      },
    });
  });

  // 9. Analysis nodes
  input.analysisResults.forEach(analysis => {
    const nodeId = `analysis:${analysis.id}`;
    addNode({
      id: nodeId,
      data: {
        id: analysis.id,
        scanId: input.scanId,
        category: 'ANALYSIS',
        label: `Analysis: ${analysis.evidence_state}`,
        metadata: {
          evidenceState: analysis.evidence_state,
          runwayState: analysis.runway_state,
        },
        analysis: {
          id: analysis.id,
          evidenceState: analysis.evidence_state,
          runwayState: analysis.runway_state,
          requiredProtectionUntil: analysis.required_protection_until,
          migrationEffort: analysis.migration_effort,
          cryptoAgilityState: analysis.crypto_agility_state,
          actionCandidates: analysis.action_candidates,
        },
      },
    });
  });

  // ============================================================================
  // CREATE EDGES FROM REAL RELATIONSHIPS
  // ============================================================================

  // 1. CryptoPath relationships (crypto_paths table foreign keys)
  input.cryptoPaths.forEach(path => {
    // CryptoPath → CryptoAsset (crypto_asset_id)
    if (path.crypto_asset_id && cryptoAssetMap.has(path.crypto_asset_id)) {
      const cryptoAsset = cryptoAssetMap.get(path.crypto_asset_id)!;
      // Only connect if not a certificate
      if (!cryptoAsset.name.startsWith('Certificate:')) {
        addEdge({
          id: `${path.id}:uses_crypto:${path.crypto_asset_id}`,
          source: `crypto:${path.crypto_asset_id}`,
          target: `crypto:${path.crypto_asset_id}`, // Self-loop for now; will refine with path nodes
          relationType: 'USES_CRYPTO',
          metadata: { pathId: path.id, pathName: path.path_id_name },
        });
      }
    }

    // CryptoPath → DataAsset (data_asset_id)
    if (path.data_asset_id && dataAssetMap.has(path.data_asset_id)) {
      const sourceNodeId = path.crypto_asset_id ? `crypto:${path.crypto_asset_id}` : `data:${path.data_asset_id}`;
      addEdge({
        id: `${path.id}:protects:${path.data_asset_id}`,
        source: sourceNodeId,
        target: `data:${path.data_asset_id}`,
        relationType: 'PROTECTS',
        metadata: { pathId: path.id, pathName: path.path_id_name },
      });
    }

    // CryptoPath → KeyContext (key_context_id)
    if (path.key_context_id && keyContextMap.has(path.key_context_id)) {
      const sourceNodeId = path.crypto_asset_id ? `crypto:${path.crypto_asset_id}` : `key:${path.key_context_id}`;
      addEdge({
        id: `${path.id}:uses_key:${path.key_context_id}`,
        source: sourceNodeId,
        target: `key:${path.key_context_id}`,
        relationType: 'USES_KEY',
        metadata: { pathId: path.id, pathName: path.path_id_name },
      });
    }

    // CryptoPath → Service (entrypoint field)
    if (path.entrypoint && entrypointSet.has(path.entrypoint)) {
      const sourceNodeId = path.crypto_asset_id ? `crypto:${path.crypto_asset_id}` : `service:${path.entrypoint}`;
      addEdge({
        id: `${path.id}:exposed_through:${path.entrypoint}`,
        source: sourceNodeId,
        target: `service:${path.entrypoint}`,
        relationType: 'EXPOSED_THROUGH',
        metadata: { pathId: path.id, pathName: path.path_id_name },
      });
    }
  });

  // 2. RuntimeEvent relationships
  input.runtimeEvents.forEach(event => {
    // RuntimeEvent → CryptoAsset (asset_id)
    if (cryptoAssetMap.has(event.asset_id)) {
      const cryptoAsset = cryptoAssetMap.get(event.asset_id)!;
      if (!cryptoAsset.name.startsWith('Certificate:')) {
        addEdge({
          id: `${event.id}:runtime_evidence:${event.asset_id}`,
          source: `runtime:${event.id}`,
          target: `crypto:${event.asset_id}`,
          relationType: 'RUNTIME_EVIDENCE',
          metadata: { timestamp: event.timestamp },
        });
      }
    }

    // RuntimeEvent → CryptoPath (crypto_path_id)
    if (event.crypto_path_id) {
      const path = input.cryptoPaths.find(p => p.id === event.crypto_path_id);
      if (path && path.crypto_asset_id) {
        addEdge({
          id: `${event.id}:path_evidence:${event.crypto_path_id}`,
          source: `runtime:${event.id}`,
          target: `crypto:${path.crypto_asset_id}`,
          relationType: 'PATH_EVIDENCE',
          metadata: { pathId: event.crypto_path_id },
        });
      }
    }
  });

  // 3. Reachability relationships
  input.reachabilityResults.forEach(reach => {
    if (cryptoAssetMap.has(reach.asset_id)) {
      const cryptoAsset = cryptoAssetMap.get(reach.asset_id)!;
      if (!cryptoAsset.name.startsWith('Certificate:')) {
        addEdge({
          id: `${reach.id}:reachability:${reach.asset_id}`,
          source: `reach:${reach.id}`,
          target: `crypto:${reach.asset_id}`,
          relationType: 'REACHABILITY',
          metadata: { status: reach.status },
        });
      }
    }
  });

  // 4. Control relationships
  input.controls.forEach(control => {
    if (control.crypto_asset_id && cryptoAssetMap.has(control.crypto_asset_id)) {
      const cryptoAsset = cryptoAssetMap.get(control.crypto_asset_id)!;
      if (!cryptoAsset.name.startsWith('Certificate:')) {
        addEdge({
          id: `${control.id}:governed_by:${control.crypto_asset_id}`,
          source: `crypto:${control.crypto_asset_id}`,
          target: `control:${control.id}`,
          relationType: 'GOVERNED_BY',
          metadata: { controlName: control.control_name },
        });
      }
    }
  });

  // 5. Certificate relationships
  input.certificates.forEach(cert => {
    if (cert.crypto_asset_id && cryptoAssetMap.has(cert.crypto_asset_id)) {
      const cryptoAsset = cryptoAssetMap.get(cert.crypto_asset_id)!;
      if (!cryptoAsset.name.startsWith('Certificate:')) {
        addEdge({
          id: `${cert.id}:uses_certificate:${cert.crypto_asset_id}`,
          source: `crypto:${cert.crypto_asset_id}`,
          target: `cert:${cert.id}`,
          relationType: 'USES_CERTIFICATE',
          metadata: { certName: cert.name },
        });
      }
    }
  });

  // 6. Analysis relationships
  input.analysisResults.forEach(analysis => {
    // Analysis → Finding (crypto_asset or crypto_path)
    if (analysis.finding_id && cryptoAssetMap.has(analysis.finding_id)) {
      const cryptoAsset = cryptoAssetMap.get(analysis.finding_id)!;
      if (!cryptoAsset.name.startsWith('Certificate:')) {
        addEdge({
          id: `${analysis.id}:analyzed_by:${analysis.finding_id}`,
          source: `crypto:${analysis.finding_id}`,
          target: `analysis:${analysis.id}`,
          relationType: 'ANALYZED_BY',
          metadata: { evidenceState: analysis.evidence_state },
        });
      }
    }

    if (analysis.crypto_path_id) {
      const path = input.cryptoPaths.find(p => p.id === analysis.crypto_path_id);
      if (path && path.crypto_asset_id) {
        addEdge({
          id: `${analysis.id}:analyzed_by_path:${analysis.crypto_path_id}`,
          source: `crypto:${path.crypto_asset_id}`,
          target: `analysis:${analysis.id}`,
          relationType: 'ANALYZED_BY',
          metadata: { pathId: analysis.crypto_path_id },
        });
      }
    }
  });

  // ============================================================================
  // BUILD GRAPH WITH INDEXES
  // ============================================================================

  const nodeIndex = new Map(nodes.map(n => [n.id, n]));
  const edgesBySource = new Map<string, InvestigationEdge[]>();
  const edgesByTarget = new Map<string, InvestigationEdge[]>();

  edges.forEach(edge => {
    if (!edgesBySource.has(edge.source)) {
      edgesBySource.set(edge.source, []);
    }
    edgesBySource.get(edge.source)!.push(edge);

    if (!edgesByTarget.has(edge.target)) {
      edgesByTarget.set(edge.target, []);
    }
    edgesByTarget.get(edge.target)!.push(edge);
  });

  return {
    scanId: input.scanId,
    nodes,
    edges,
    nodeIndex,
    edgesBySource,
    edgesByTarget,
  };
}

// ============================================================================
// GRAPH VALIDATION
// ============================================================================

export function validateInvestigationGraph(graph: InvestigationGraph): GraphValidationResult {
  const errors: GraphValidationError[] = [];
  const warnings: string[] = [];

  // Check for duplicate node IDs
  const nodeIds = new Set<string>();
  graph.nodes.forEach(node => {
    if (nodeIds.has(node.id)) {
      errors.push({
        type: 'DUPLICATE_NODE',
        nodeId: node.id,
        message: `Duplicate node ID: ${node.id}`,
      });
    }
    nodeIds.add(node.id);
  });

  // Check for duplicate edge IDs
  const edgeIds = new Set<string>();
  graph.edges.forEach(edge => {
    if (edgeIds.has(edge.id)) {
      errors.push({
        type: 'DUPLICATE_EDGE',
        edgeId: edge.id,
        message: `Duplicate edge ID: ${edge.id}`,
      });
    }
    edgeIds.add(edge.id);
  });

  // Check for dangling edges
  graph.edges.forEach(edge => {
    if (!graph.nodeIndex.has(edge.source)) {
      errors.push({
        type: 'DANGLING_EDGE',
        edgeId: edge.id,
        message: `Edge ${edge.id} references non-existent source node: ${edge.source}`,
      });
    }
    if (!graph.nodeIndex.has(edge.target)) {
      errors.push({
        type: 'DANGLING_EDGE',
        edgeId: edge.id,
        message: `Edge ${edge.id} references non-existent target node: ${edge.target}`,
      });
    }
  });

  // Check for nodes missing source entity IDs
  graph.nodes.forEach(node => {
    if (!node.data.id) {
      errors.push({
        type: 'MISSING_SOURCE_ID',
        nodeId: node.id,
        message: `Node ${node.id} missing source entity ID`,
      });
    }
  });

  // Check for cross-scan relationships (all nodes should belong to same scan)
  const scanIds = new Set<string>();
  graph.nodes.forEach(node => {
    if (node.data.scanId) {
      scanIds.add(node.data.scanId);
    }
  });
  if (scanIds.size > 1) {
    errors.push({
      type: 'CROSS_SCAN',
      message: `Graph contains nodes from multiple scans: ${Array.from(scanIds).join(', ')}`,
    });
  }

  // Warnings for isolated nodes
  const connectedNodes = new Set<string>();
  graph.edges.forEach(edge => {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  });
  const isolatedNodes = graph.nodes.filter(n => !connectedNodes.has(n.id));
  if (isolatedNodes.length > 0) {
    warnings.push(`${isolatedNodes.length} isolated nodes detected`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
