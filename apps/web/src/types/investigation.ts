// Investigation workspace types based on backend schema

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
}

export interface ReachabilityResult {
  id: string;
  asset_id: string;
  status: 'REACHABLE' | 'NOT_REACHABLE';
  entrypoint?: string;
  source_file?: string;
  source_line?: number;
}

export interface RuntimeEvent {
  id: string;
  scan_id: string;
  asset_id: string;
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
  finding_id: string;
  evidence_state: string;
  runway_state: string;
  required_protection_until: string;
  migration_effort: string;
  change_lead_time?: string;
  crypto_agility_state?: string;
  action_candidates?: any[];
}

export interface CryptoPath {
  id: string;
  path_id_name: string;
  entrypoint?: string;
  crypto_asset_id: string;
  relationship_type?: string;
}

export interface EvidenceState {
  discovered: boolean;
  reachable: boolean;
  runtimeObserved: boolean;
}

export interface InvestigationNode {
  id: string;
  type: 'crypto' | 'data' | 'key' | 'service' | 'control' | 'analysis';
  data: {
    label: string;
    details: any;
    evidenceState?: EvidenceState;
  };
  position: { x: number; y: number };
}

export interface InvestigationEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  label?: string;
}
