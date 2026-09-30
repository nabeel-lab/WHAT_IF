'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProgressiveExplorationGraph from '@/components/investigation/ProgressiveExplorationGraph';
import AssistantDrawer from '@/components/investigation/AssistantDrawer';
import { loadInvestigationData } from '@/lib/load-investigation-data';
import type { GraphBuilderInput } from '@/lib/investigation-graph';

export default function InvestigationWorkspace() {
  const params = useParams();
  const projectId = (params?.projectId as string) || 'p-1';
  const [data, setData] = useState<GraphBuilderInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const result = await loadInvestigationData({
        projectId,
        includeIsolatedEntities: true,
      });

      setData(result);
    } catch (err) {
      console.error('Error loading investigation data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load investigation data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full" style={{ backgroundColor: '#0B0F14' }}>
        <div className="text-sm text-[#A8B4C2] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#60F1D0] animate-ping" />
          Loading investigation workspace...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full w-full" style={{ backgroundColor: '#0B0F14' }}>
        <div className="text-center p-6 rounded-xl border border-[#FF7A90]/30 bg-[#151C25]">
          <div className="text-sm font-semibold text-[#FF7A90] mb-1">Error Loading Data</div>
          <div className="text-xs text-[#A8B4C2]">{error}</div>
          <button
            onClick={loadData}
            className="mt-3 text-xs font-semibold px-4 py-1.5 rounded-lg bg-[#60F1D0]/15 text-[#60F1D0] border border-[#60F1D0]/30 hover:bg-[#60F1D0]/25 transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full w-full" style={{ backgroundColor: '#0B0F14' }}>
        <div className="text-sm text-[#A8B4C2]">No investigation data available</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex overflow-hidden relative min-w-0 min-h-0" style={{ backgroundColor: '#04070D' }}>
      <div className="flex-1 h-full min-w-0 min-h-0 relative">
        <ProgressiveExplorationGraph
          data={data}
          projectId={projectId}
          scanId={data.scanId}
          onOpenAssistant={(entityType, entityId) => {
            setAssistantOpen(true);
          }}
        />
      </div>

      <AssistantDrawer
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        projectId={projectId}
        scanId={data.scanId}
      />
    </div>
  );
}
