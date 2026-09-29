/**
 * Investigation Data Loader
 * 
 * Loads all backend data needed to build the investigation graph.
 */


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
import type { GraphBuilderInput } from './investigation-graph';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface LoadInvestigationDataOptions {
  projectId?: string;
  scanId?: string;
  includeIsolatedEntities?: boolean;
}

export async function loadInvestigationData(
  options: LoadInvestigationDataOptions
): Promise<GraphBuilderInput> {
  const { projectId = 'p-1', scanId, includeIsolatedEntities = true } = options;

  const queryParam = scanId ? `?scan_id=${scanId}` : '';

  const [
    pathsRes,
    findingsRes,
    dataRes,
    keysRes,
    controlsRes,
    evidenceRes,
    summaryRes,
    projectsRes,
  ] = await Promise.all([
    fetch(`${API_BASE}/projects/${projectId}/crypto-paths${queryParam}`).then(r => r.json()).catch(() => []),
    fetch(`${API_BASE}/projects/${projectId}/findings${queryParam}`).then(r => r.json()).catch(() => []),
    fetch(`${API_BASE}/projects/${projectId}/data-assets${queryParam}`).then(r => r.json()).catch(() => []),
    fetch(`${API_BASE}/projects/${projectId}/keys${queryParam}`).then(r => r.json()).catch(() => []),
    fetch(`${API_BASE}/projects/${projectId}/controls${queryParam}`).then(r => r.json()).catch(() => []),
    fetch(`${API_BASE}/projects/${projectId}/evidence${queryParam}`).then(r => r.json()).catch(() => []),
    fetch(`${API_BASE}/projects/${projectId}/summary${queryParam}`).then(r => r.json()).catch(() => ({})),
    fetch(`${API_BASE}/projects`).then(r => r.json()).catch(() => []),
  ]);

  const cryptoPaths = Array.isArray(pathsRes) ? (pathsRes as CryptoPath[]) : [];
  const findingsList = Array.isArray(findingsRes) ? findingsRes : [];
  const allDataAssets = Array.isArray(dataRes) ? (dataRes as DataAsset[]) : [];
  const allKeyContexts = Array.isArray(keysRes) ? (keysRes as KeyContext[]) : [];
  const allControls = Array.isArray(controlsRes) ? (controlsRes as Control[]) : [];
  const allEvidence = Array.isArray(evidenceRes) ? evidenceRes : [];
  const projectObj = Array.isArray(projectsRes) ? projectsRes.find((p: any) => p.id === projectId) : null;
  const projectName = projectObj?.name || 'Enterprise_info';

  const resolvedScanId = scanId || summaryRes?.latest_completed_scan_id || '059bfc23-cf81-4e62-a336-b4ee9e7e34e0';

  const cryptoAssets: CryptoAsset[] = [];
  const reachabilityResults: ReachabilityResult[] = [];
  const runtimeEvents: RuntimeEvent[] = [];
  const analysisResults: AnalysisResult[] = [];

  for (const item of findingsList) {
    const asset = item.finding as CryptoAsset;
    if (asset) {
      cryptoAssets.push(asset);
    }
    if (item.reachability) {
      reachabilityResults.push(item.reachability as ReachabilityResult);
    }
    if (Array.isArray(item.runtime)) {
      for (const rt of item.runtime) {
        runtimeEvents.push(rt as RuntimeEvent);
      }
    }
  }

  // Filter entities based on crypto_paths if not including isolated entities
  let dataAssets = allDataAssets;
  let keyContexts = allKeyContexts;
  let controls = allControls;

  if (!includeIsolatedEntities) {
    const linkedDataAssetIds = new Set(
      cryptoPaths.filter(p => p.data_asset_id).map(p => p.data_asset_id!)
    );
    const linkedKeyContextIds = new Set(
      cryptoPaths.filter(p => p.key_context_id).map(p => p.key_context_id!)
    );
    const linkedCryptoAssetIds = new Set(
      cryptoPaths.map(p => p.crypto_asset_id)
    );

    dataAssets = allDataAssets.filter(d => linkedDataAssetIds.has(d.id));
    keyContexts = allKeyContexts.filter(k => linkedKeyContextIds.has(k.id));
    controls = allControls.filter(c => 
      c.crypto_asset_id && linkedCryptoAssetIds.has(c.crypto_asset_id)
    );
  } else {
    // Filter controls to only include those for crypto_assets in this scan
    const cryptoAssetIds = new Set(cryptoAssets.map(a => a.id));
    controls = allControls.filter(c => 
      c.crypto_asset_id && cryptoAssetIds.has(c.crypto_asset_id)
    );
  }

  const certificates: Certificate[] = [];

  return {
    scanId: resolvedScanId,
    cryptoPaths,
    cryptoAssets,
    dataAssets,
    keyContexts,
    certificates,
    controls,
    reachabilityResults,
    runtimeEvents,
    analysisResults,
    evidence: allEvidence,
    rawFindings: findingsList,
    projectName,
  };
}

/**
 * Load investigation data and provide statistics
 */
export async function loadInvestigationDataWithStats(
  options: LoadInvestigationDataOptions
) {
  const data = await loadInvestigationData(options);

  const stats = {
    cryptoPaths: data.cryptoPaths.length,
    cryptoAssets: data.cryptoAssets.filter(a => !a.name.startsWith('Certificate:')).length,
    dataAssets: data.dataAssets.length,
    keyContexts: data.keyContexts.length,
    certificates: data.certificates.length,
    controls: data.controls.length,
    reachabilityResults: data.reachabilityResults.length,
    runtimeEvents: data.runtimeEvents.length,
    analysisResults: data.analysisResults.length,
  };

  return { data, stats };
}
