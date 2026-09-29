/**
 * Investigation Graph Builder Tests
 */

import {
  buildInvestigationGraph,
  validateInvestigationGraph,
  type GraphBuilderInput,
} from '../investigation-graph';
import type {
  CryptoPath,
  CryptoAsset,
  DataAsset,
  KeyContext,
  Certificate,
  Control,
  ReachabilityResult,
  RuntimeEvent,
  AnalysisResult,
} from '@/types/investigation-graph';

const SCAN_ID = '059bfc23-cf81-4e62-a336-b4ee9e7e34e0';
const PROJECT_ID = 'test-project-id';

describe('buildInvestigationGraph', () => {
  it('should create nodes from crypto assets', () => {
    const input: GraphBuilderInput = {
      scanId: SCAN_ID,
      cryptoPaths: [],
      cryptoAssets: [
        {
          id: 'asset-1',
          scan_id: SCAN_ID,
          name: 'RSA',
          algorithm: 'RSA-2048',
          role: 'key_generation',
          asset_type: 'algorithm',
          created_at: new Date().toISOString(),
        },
      ],
      dataAssets: [],
      keyContexts: [],
      certificates: [],
      controls: [],
      reachabilityResults: [],
      runtimeEvents: [],
      analysisResults: [],
    };

    const graph = buildInvestigationGraph(input);

    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].id).toBe('crypto:asset-1');
    expect(graph.nodes[0].data.category).toBe('CRYPTO_ASSET');
    expect(graph.nodes[0].data.label).toBe('RSA');
  });

  it('should not create nodes for certificates in crypto_assets', () => {
    const input: GraphBuilderInput = {
      scanId: SCAN_ID,
      cryptoPaths: [],
      cryptoAssets: [
        {
          id: 'asset-1',
          scan_id: SCAN_ID,
          name: 'Certificate:test',
          algorithm: 'RSA',
          role: 'authentication',
          asset_type: 'certificate',
          created_at: new Date().toISOString(),
        },
      ],
      dataAssets: [],
      keyContexts: [],
      certificates: [],
      controls: [],
      reachabilityResults: [],
      runtimeEvents: [],
      analysisResults: [],
    };

    const graph = buildInvestigationGraph(input);

    expect(graph.nodes).toHaveLength(0);
  });

  it('should create CryptoPath → DataAsset relationship', () => {
    const cryptoAsset: CryptoAsset = {
      id: 'crypto-1',
      scan_id: SCAN_ID,
      name: 'AES',
      algorithm: 'AES-256-GCM',
      role: 'encryption',
      asset_type: 'algorithm',
      created_at: new Date().toISOString(),
    };

    const dataAsset: DataAsset = {
      id: 'data-1',
      project_id: PROJECT_ID,
      name: 'UserCredentials',
      classification: 'PII',
      created_at: new Date().toISOString(),
    };

    const cryptoPath: CryptoPath = {
      id: 'path-1',
      project_id: PROJECT_ID,
      path_id_name: 'AES-UserCreds',
      crypto_asset_id: 'crypto-1',
      data_asset_id: 'data-1',
      created_at: new Date().toISOString(),
    };

    const input: GraphBuilderInput = {
      scanId: SCAN_ID,
      cryptoPaths: [cryptoPath],
      cryptoAssets: [cryptoAsset],
      dataAssets: [dataAsset],
      keyContexts: [],
      certificates: [],
      controls: [],
      reachabilityResults: [],
      runtimeEvents: [],
      analysisResults: [],
    };

    const graph = buildInvestigationGraph(input);

    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
    
    const edge = graph.edges[0];
    expect(edge.relationType).toBe('PROTECTS');
    expect(edge.source).toBe('crypto:crypto-1');
    expect(edge.target).toBe('data:data-1');
    expect(edge.metadata?.pathId).toBe('path-1');
  });

  it('should create CryptoPath → CryptoAsset relationship', () => {
    const cryptoAsset: CryptoAsset = {
      id: 'crypto-1',
      scan_id: SCAN_ID,
      name: 'RSA',
      algorithm: 'RSA-2048',
      role: 'key_generation',
      asset_type: 'algorithm',
      created_at: new Date().toISOString(),
    };

    const cryptoPath: CryptoPath = {
      id: 'path-1',
      project_id: PROJECT_ID,
      path_id_name: 'RSA-Path',
      crypto_asset_id: 'crypto-1',
      created_at: new Date().toISOString(),
    };

    const input: GraphBuilderInput = {
      scanId: SCAN_ID,
      cryptoPaths: [cryptoPath],
      cryptoAssets: [cryptoAsset],
      dataAssets: [],
      keyContexts: [],
      certificates: [],
      controls: [],
      reachabilityResults: [],
      runtimeEvents: [],
      analysisResults: [],
    };

    const graph = buildInvestigationGraph(input);

    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].relationType).toBe('USES_CRYPTO');
  });

  it('should create CryptoPath → KeyContext relationship', () => {
    const cryptoAsset: CryptoAsset = {
      id: 'crypto-1',
      scan_id: SCAN_ID,
      name: 'RSA',
      algorithm: 'RSA-2048',
      role: 'key_generation',
      asset_type: 'algorithm',
      created_at: new Date().toISOString(),
    };

    const keyContext: KeyContext = {
      id: 'key-1',
      project_id: PROJECT_ID,
      key_id_name: 'ServerPrivateKey',
      algorithm: 'RSA',
      created_at: new Date().toISOString(),
    };

    const cryptoPath: CryptoPath = {
      id: 'path-1',
      project_id: PROJECT_ID,
      path_id_name: 'RSA-ServerKey',
      crypto_asset_id: 'crypto-1',
      key_context_id: 'key-1',
      created_at: new Date().toISOString(),
    };

    const input: GraphBuilderInput = {
      scanId: SCAN_ID,
      cryptoPaths: [cryptoPath],
      cryptoAssets: [cryptoAsset],
      dataAssets: [],
      keyContexts: [keyContext],
      certificates: [],
      controls: [],
      reachabilityResults: [],
      runtimeEvents: [],
      analysisResults: [],
    };

    const graph = buildInvestigationGraph(input);

    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges.some(e => e.relationType === 'USES_KEY')).toBe(true);
  });

  it('should deduplicate nodes when same entity referenced multiple times', () => {
    const keyContext: KeyContext = {
      id: 'key-1',
      project_id: PROJECT_ID,
      key_id_name: 'SharedKey',
      created_at: new Date().toISOString(),
    };

    const cryptoAsset1: CryptoAsset = {
      id: 'crypto-1',
      scan_id: SCAN_ID,
      name: 'RSA',
      algorithm: 'RSA-2048',
      role: 'key_generation',
      asset_type: 'algorithm',
      created_at: new Date().toISOString(),
    };

    const cryptoAsset2: CryptoAsset = {
      id: 'crypto-2',
      scan_id: SCAN_ID,
      name: 'AES',
      algorithm: 'AES-256',
      role: 'encryption',
      asset_type: 'algorithm',
      created_at: new Date().toISOString(),
    };

    const path1: CryptoPath = {
      id: 'path-1',
      project_id: PROJECT_ID,
      path_id_name: 'RSA-SharedKey',
      crypto_asset_id: 'crypto-1',
      key_context_id: 'key-1',
      created_at: new Date().toISOString(),
    };

    const path2: CryptoPath = {
      id: 'path-2',
      project_id: PROJECT_ID,
      path_id_name: 'AES-SharedKey',
      crypto_asset_id: 'crypto-2',
      key_context_id: 'key-1',
      created_at: new Date().toISOString(),
    };

    const input: GraphBuilderInput = {
      scanId: SCAN_ID,
      cryptoPaths: [path1, path2],
      cryptoAssets: [cryptoAsset1, cryptoAsset2],
      dataAssets: [],
      keyContexts: [keyContext],
      certificates: [],
      controls: [],
      reachabilityResults: [],
      runtimeEvents: [],
      analysisResults: [],
    };

    const graph = buildInvestigationGraph(input);

    // Should have 3 nodes: 2 crypto assets + 1 shared key context
    expect(graph.nodes).toHaveLength(3);
    
    // Should have only 1 key context node
    const keyNodes = graph.nodes.filter(n => n.data.category === 'KEY_CONTEXT');
    expect(keyNodes).toHaveLength(1);
    
    // Should have 2 edges to the same key
    const keyEdges = graph.edges.filter(e => e.relationType === 'USES_KEY');
    expect(keyEdges).toHaveLength(2);
  });

  it('should create runtime evidence relationships', () => {
    const cryptoAsset: CryptoAsset = {
      id: 'crypto-1',
      scan_id: SCAN_ID,
      name: 'MD5',
      algorithm: 'MD5',
      role: 'hashing',
      asset_type: 'algorithm',
      created_at: new Date().toISOString(),
    };

    const runtimeEvent: RuntimeEvent = {
      id: 'event-1',
      scan_id: SCAN_ID,
      asset_id: 'crypto-1',
      event_type: 'crypto_call',
      algorithm: 'MD5',
      role: 'hashing',
      entrypoint: '/api/hash',
      timestamp: new Date().toISOString(),
      runtime_run_id: 'run-1',
    };

    const input: GraphBuilderInput = {
      scanId: SCAN_ID,
      cryptoPaths: [],
      cryptoAssets: [cryptoAsset],
      dataAssets: [],
      keyContexts: [],
      certificates: [],
      controls: [],
      reachabilityResults: [],
      runtimeEvents: [runtimeEvent],
      analysisResults: [],
    };

    const graph = buildInvestigationGraph(input);

    expect(graph.nodes).toHaveLength(2); // crypto + runtime event
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].relationType).toBe('RUNTIME_EVIDENCE');
  });

  it('should compute evidence state correctly', () => {
    const cryptoAsset: CryptoAsset = {
      id: 'crypto-1',
      scan_id: SCAN_ID,
      name: 'RSA',
      algorithm: 'RSA-2048',
      role: 'key_generation',
      asset_type: 'algorithm',
      created_at: new Date().toISOString(),
    };

    const reachability: ReachabilityResult = {
      id: 'reach-1',
      asset_id: 'crypto-1',
      status: 'REACHABLE',
      created_at: new Date().toISOString(),
    };

    const runtimeEvent: RuntimeEvent = {
      id: 'event-1',
      scan_id: SCAN_ID,
      asset_id: 'crypto-1',
      event_type: 'crypto_call',
      algorithm: 'RSA-2048',
      role: 'key_generation',
      entrypoint: '/api/generate',
      timestamp: new Date().toISOString(),
      runtime_run_id: 'run-1',
    };

    const input: GraphBuilderInput = {
      scanId: SCAN_ID,
      cryptoPaths: [],
      cryptoAssets: [cryptoAsset],
      dataAssets: [],
      keyContexts: [],
      certificates: [],
      controls: [],
      reachabilityResults: [reachability],
      runtimeEvents: [runtimeEvent],
      analysisResults: [],
    };

    const graph = buildInvestigationGraph(input);

    const cryptoNode = graph.nodes.find(n => n.data.category === 'CRYPTO_ASSET');
    expect(cryptoNode).toBeDefined();
    expect(cryptoNode!.data.evidenceState).toEqual({
      discovered: true,
      reachable: true,
      runtimeObserved: true,
      rawState: 'DISCOVERED→REACHABLE→RUNTIME_OBSERVED',
    });
  });

  it('should handle NOT_OBSERVED state correctly', () => {
    const cryptoAsset: CryptoAsset = {
      id: 'crypto-1',
      scan_id: SCAN_ID,
      name: 'SHA256',
      algorithm: 'SHA-256',
      role: 'hashing',
      asset_type: 'algorithm',
      created_at: new Date().toISOString(),
    };

    const reachability: ReachabilityResult = {
      id: 'reach-1',
      asset_id: 'crypto-1',
      status: 'REACHABLE',
      created_at: new Date().toISOString(),
    };

    const input: GraphBuilderInput = {
      scanId: SCAN_ID,
      cryptoPaths: [],
      cryptoAssets: [cryptoAsset],
      dataAssets: [],
      keyContexts: [],
      certificates: [],
      controls: [],
      reachabilityResults: [reachability],
      runtimeEvents: [], // No runtime events
      analysisResults: [],
    };

    const graph = buildInvestigationGraph(input);

    const cryptoNode = graph.nodes.find(n => n.data.category === 'CRYPTO_ASSET');
    expect(cryptoNode!.data.evidenceState).toEqual({
      discovered: true,
      reachable: true,
      runtimeObserved: false,
      rawState: 'DISCOVERED→REACHABLE→NOT_OBSERVED',
    });
  });

  it('should create service nodes from entrypoints', () => {
    const cryptoAsset: CryptoAsset = {
      id: 'crypto-1',
      scan_id: SCAN_ID,
      name: 'AES',
      algorithm: 'AES-256',
      role: 'encryption',
      asset_type: 'algorithm',
      created_at: new Date().toISOString(),
    };

    const path1: CryptoPath = {
      id: 'path-1',
      project_id: PROJECT_ID,
      path_id_name: 'AES-Path1',
      crypto_asset_id: 'crypto-1',
      entrypoint: '/api/encrypt',
      created_at: new Date().toISOString(),
    };

    const path2: CryptoPath = {
      id: 'path-2',
      project_id: PROJECT_ID,
      path_id_name: 'AES-Path2',
      crypto_asset_id: 'crypto-1',
      entrypoint: '/api/encrypt',
      created_at: new Date().toISOString(),
    };

    const input: GraphBuilderInput = {
      scanId: SCAN_ID,
      cryptoPaths: [path1, path2],
      cryptoAssets: [cryptoAsset],
      dataAssets: [],
      keyContexts: [],
      certificates: [],
      controls: [],
      reachabilityResults: [],
      runtimeEvents: [],
      analysisResults: [],
    };

    const graph = buildInvestigationGraph(input);

    const serviceNode = graph.nodes.find(n => n.data.category === 'SERVICE');
    expect(serviceNode).toBeDefined();
    expect(serviceNode!.data.label).toBe('/api/encrypt');
    if (serviceNode!.data.category === 'SERVICE') {
      expect(serviceNode!.data.service.pathCount).toBe(2);
    }
  });
});

describe('validateInvestigationGraph', () => {
  it('should pass validation for valid graph', () => {
    const input: GraphBuilderInput = {
      scanId: SCAN_ID,
      cryptoPaths: [],
      cryptoAssets: [
        {
          id: 'asset-1',
          scan_id: SCAN_ID,
          name: 'RSA',
          algorithm: 'RSA-2048',
          role: 'key_generation',
          asset_type: 'algorithm',
          created_at: new Date().toISOString(),
        },
      ],
      dataAssets: [],
      keyContexts: [],
      certificates: [],
      controls: [],
      reachabilityResults: [],
      runtimeEvents: [],
      analysisResults: [],
    };

    const graph = buildInvestigationGraph(input);
    const validation = validateInvestigationGraph(graph);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should detect dangling edges', () => {
    const graph = {
      scanId: SCAN_ID,
      nodes: [],
      edges: [
        {
          id: 'edge-1',
          source: 'nonexistent-1',
          target: 'nonexistent-2',
          relationType: 'USES_CRYPTO' as const,
        },
      ],
      nodeIndex: new Map(),
      edgesBySource: new Map(),
      edgesByTarget: new Map(),
    };

    const validation = validateInvestigationGraph(graph);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.type === 'DANGLING_EDGE')).toBe(true);
  });

  it('should detect isolated nodes as warnings', () => {
    const input: GraphBuilderInput = {
      scanId: SCAN_ID,
      cryptoPaths: [],
      cryptoAssets: [
        {
          id: 'asset-1',
          scan_id: SCAN_ID,
          name: 'RSA',
          algorithm: 'RSA-2048',
          role: 'key_generation',
          asset_type: 'algorithm',
          created_at: new Date().toISOString(),
        },
      ],
      dataAssets: [],
      keyContexts: [],
      certificates: [],
      controls: [],
      reachabilityResults: [],
      runtimeEvents: [],
      analysisResults: [],
    };

    const graph = buildInvestigationGraph(input);
    const validation = validateInvestigationGraph(graph);

    expect(validation.valid).toBe(true);
    expect(validation.warnings.length).toBeGreaterThan(0);
    expect(validation.warnings[0]).toContain('isolated nodes');
  });
});
