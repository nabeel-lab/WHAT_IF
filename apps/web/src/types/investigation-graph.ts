/**
 * Investigation Graph Data Model
 * 
 * Canonical types for the REAL ECDAT spatial investigation graph.
 * These types represent the actual backend data relationships,
 * not fabricated connections.
 */

// ============================================================================
// NODE CATEGORIES
// ============================================================================

export type NodeCategory =
  | 'DATA_ASSET'
  | 'CRYPTO_ASSET'
  | 'KEY_CONTEXT'
  | 'CERTIFICATE'
  | 'PROVIDER'
  | 'SERVICE'
  | 'CONTROL'
  | 'ANALYSIS'
  | 'REACHABILITY'
  | 'RUNTIME_EVENT';

// ============================================================================
// EDGE RELATIONSHIP TYPES
// ============================================================================

export type EdgeRelationType =
  // CryptoPath → entities (from crypto_paths table foreign keys)
  | 'USES_CRYPTO'        // crypto_path → crypto_asset (crypto_asset_id)
  | 'PROTECTS'           // crypto_path → data_asset (data_asset_id)
  | 'USES_KEY'           // crypto_path → key_context (key_context_id)
  
  // Runtime evidence relationships
  | 'RUNTIME_EVIDENCE'   // runtime_event → crypto_asset (asset_id)
  | 'PATH_EVIDENCE'      // runtime_event → crypto_path (crypto_path_id)
  
  // Analysis relationships
  | 'ANALYZED_BY'        // crypto_asset/crypto_path → analysis_result (finding_id/crypto_path_id)
  | 'REACHABILITY'       // crypto_asset → reachability_result (asset_id)
  
  // Control relationships
  | 'GOVERNED_BY'        // crypto_asset → control (crypto_asset_id)
  
  // Certificate relationships
  | 'USES_CERTIFICATE'   // crypto_asset → certificate (crypto_asset_id)
  
  // Service/entrypoint (from entrypoint field)
  | 'EXPOSED_THROUGH';   // crypto_path → service (entrypoint field)

// ============================================================================
// EVIDENCE STATE (from backend)
// ============================================================================

export type EvidenceState = 'DISCOVERED' | 'REACHABLE' | 'RUNTIME_OBSERVED' | 'NOT_OBSERVED';

export interface NodeEvidenceState {
  discovered: boolean;
  reachable: boolean;
  runtimeObserved: boolean;
  rawState?: string; // e.g., "DISCOVERED→REACHABLE→RUNTIME_OBSERVED"
}

// ============================================================================
// NODE DATA PAYLOADS
// ============================================================================

export interface BaseNodeData {
  id: string;
  scanId: string;
  category: NodeCategory;
  label: string;
  evidenceState?: NodeEvidenceState;
  metadata: Record<string, any>;
}

export interface DataAssetNodeData extends BaseNodeData {
  category: 'DATA_ASSET';
  dataAsset: {
    id: string;
    name: string;
    classification?: string;
    sensitivity?: string;
    businessCriticality?: string;
    requiredConfidentialityUntil?: string;
  };
}

export interface CryptoAssetNodeData extends BaseNodeData {
  category: 'CRYPTO_ASSET';
  cryptoAsset: {
    id: string;
    name: string;
    algorithm: string;
    role: string;
    assetType: string;
    sourceFile?: string;
    lineStart?: number;
    library?: string;
  };
}

export interface KeyContextNodeData extends BaseNodeData {
  category: 'KEY_CONTEXT';
  keyContext: {
    id: string;
    keyIdName: string;
    keyType?: string;
    algorithm?: string;
    scope?: string;
    rotationState?: string;
    custodyType?: string;
  };
}

export interface CertificateNodeData extends BaseNodeData {
  category: 'CERTIFICATE';
  certificate: {
    id: string;
    name: string;
    algorithm: string;
    issuer?: string;
    validFrom?: string;
    validUntil?: string;
  };
}

export interface ServiceNodeData extends BaseNodeData {
  category: 'SERVICE';
  service: {
    entrypoint: string;
    pathCount: number; // How many paths use this entrypoint
  };
}

export interface ControlNodeData extends BaseNodeData {
  category: 'CONTROL';
  control: {
    id: string;
    controlName: string;
    controlState: string;
    evidence?: string;
  };
}

export interface AnalysisNodeData extends BaseNodeData {
  category: 'ANALYSIS';
  analysis: {
    id: string;
    evidenceState: string;
    runwayState?: string;
    requiredProtectionUntil?: string;
    migrationEffort?: string;
    cryptoAgilityState?: string;
    actionCandidates?: any[];
  };
}

export interface ReachabilityNodeData extends BaseNodeData {
  category: 'REACHABILITY';
  reachability: {
    id: string;
    status: 'REACHABLE' | 'NOT_REACHABLE';
    entrypoint?: string;
    sourceFile?: string;
    sourceLine?: number;
  };
}

export interface RuntimeEventNodeData extends BaseNodeData {
  category: 'RUNTIME_EVENT';
  runtimeEvent: {
    id: string;
    eventType: string;
    algorithm: string;
    role: string;
    entrypoint: string;
    operation?: string;
    timestamp: string;
    sourceFile?: string;
    sourceLine?: number;
  };
}

export type InvestigationNodeData =
  | DataAssetNodeData
  | CryptoAssetNodeData
  | KeyContextNodeData
  | CertificateNodeData
  | ServiceNodeData
  | ControlNodeData
  | AnalysisNodeData
  | ReachabilityNodeData
  | RuntimeEventNodeData;

// ============================================================================
// GRAPH STRUCTURES
// ============================================================================

export interface InvestigationNode {
  id: string; // Unique node ID (category:entityId or derived)
  data: InvestigationNodeData;
}

export interface InvestigationEdge {
  id: string; // Unique edge ID
  source: string; // Source node ID
  target: string; // Target node ID
  relationType: EdgeRelationType;
  metadata?: Record<string, any>;
}

export interface InvestigationGraph {
  scanId: string;
  nodes: InvestigationNode[];
  edges: InvestigationEdge[];
  
  // Index for fast lookups
  nodeIndex: Map<string, InvestigationNode>;
  edgesBySource: Map<string, InvestigationEdge[]>;
  edgesByTarget: Map<string, InvestigationEdge[]>;
}

// ============================================================================
// BACKEND ENTITIES (matching actual schema)
// ============================================================================

export interface CryptoPath {
  id: string;
  scan_id?: string;
  project_id: string;
  path_id_name: string;
  entrypoint?: string;
  crypto_asset_id: string;
  key_context_id?: string;
  data_asset_id?: string;
  relationship_type?: string;
  source_file?: string;
  source_line?: number;
  created_at: string;
}

export interface CryptoAsset {
  id: string;
  scan_id: string;
  name: string;
  algorithm: string;
  role: string;
  asset_type: string;
  source_file?: string;
  line_start?: number;
  library?: string;
  created_at: string;
}

export interface DataAsset {
  id: string;
  scan_id?: string;
  project_id: string;
  name: string;
  description?: string;
  classification?: string;
  sensitivity?: string;
  business_criticality?: string;
  required_confidentiality_until?: string;
  retention_period?: string;
  owner_source?: string;
  evidence_source?: string;
  created_at: string;
}

export interface KeyContext {
  id: string;
  scan_id?: string;
  project_id: string;
  key_id_name: string;
  key_type?: string;
  algorithm?: string;
  scope?: string;
  domains?: number;
  services?: number;
  epoch?: number;
  rotation_state?: string;
  custody_type?: string;
  old_versions_retained?: boolean;
  evidence_source?: string;
  created_at: string;
}

export interface Certificate {
  id: string;
  scan_id: string;
  name: string;
  algorithm: string;
  issuer?: string;
  valid_from?: string;
  valid_until?: string;
  crypto_asset_id?: string;
  created_at: string;
}

export interface Control {
  id: string;
  project_id: string;
  crypto_asset_id?: string;
  control_name: string;
  control_state: string;
  evidence?: string;
  created_at: string;
}

export interface ReachabilityResult {
  id: string;
  asset_id: string;
  scan_id?: string;
  status: 'REACHABLE' | 'NOT_REACHABLE';
  entrypoint?: string;
  source_file?: string;
  source_line?: number;
  created_at: string;
}

export interface RuntimeEvent {
  id: string;
  scan_id: string;
  project_id?: string;
  asset_id: string;
  crypto_path_id?: string;
  event_type: string;
  algorithm: string;
  role: string;
  entrypoint: string;
  source_file?: string;
  source_line?: number;
  operation?: string;
  timestamp: string;
  runtime_run_id: string;
}

export interface AnalysisResult {
  id: string;
  analysis_run_id: string;
  finding_id?: string;
  crypto_path_id?: string;
  evidence_state: string;
  evidence_coverage?: string;
  runway_state?: string;
  required_protection_until?: string;
  migration_effort?: string;
  change_lead_time?: string;
  crypto_agility_state?: string;
  action_candidates?: any[];
  created_at: string;
}

// ============================================================================
// GRAPH VALIDATION
// ============================================================================

export interface GraphValidationError {
  type: 'DUPLICATE_NODE' | 'DUPLICATE_EDGE' | 'DANGLING_EDGE' | 'MISSING_SOURCE_ID' | 'CROSS_SCAN' | 'UNSUPPORTED_RELATIONSHIP';
  nodeId?: string;
  edgeId?: string;
  message: string;
}

export interface GraphValidationResult {
  valid: boolean;
  errors: GraphValidationError[];
  warnings: string[];
}
