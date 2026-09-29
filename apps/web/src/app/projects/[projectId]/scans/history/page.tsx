"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GitCompare, History, ArrowRight } from "lucide-react";

export default function ScanHistory() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedScanA, setSelectedScanA] = useState<string>("");
  const [selectedScanB, setSelectedScanB] = useState<string>("");
  
  const [comparison, setComparison] = useState<any>(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    const fetchScans = async () => {
      try {
        const res = await fetch(`http://localhost:8000/projects/${projectId}/scans`);
        if (res.ok) {
          const data = await res.json();
          setScans(data);
          if (data.length >= 2) {
            setSelectedScanA(data[1].id);
            setSelectedScanB(data[0].id);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchScans();
  }, [projectId]);

  const handleCompare = async () => {
    if (!selectedScanA || !selectedScanB) return;
    setComparing(true);
    try {
      const res = await fetch(`http://localhost:8000/projects/${projectId}/scans/${selectedScanA}/compare/${selectedScanB}`);
      if (res.ok) {
        setComparison(await res.json());
      }
    } catch(e) {
      console.error(e);
    } finally {
      setComparing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[#A8B4C2] gap-2">
        <span className="w-2 h-2 rounded-full bg-[#60F1D0] animate-ping" />
        Loading scan history…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <div>
        <Link 
          href={`/projects/${projectId}/overview`} 
          className="inline-flex items-center gap-1.5 text-xs font-mono text-[#A8B4C2] hover:text-[#EAF0F6] mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Overview</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#60F1D0] shadow-[0_0_8px_#60F1D0]" />
          <h1 className="text-xl font-bold text-[#EAF0F6] tracking-wide">Scan History & Mutation Proof</h1>
        </div>
        <p className="text-xs text-[#A8B4C2] mt-1 font-mono">
          Cryptographically sealed immutable records of cryptographic discovery over time.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-bold text-[#EAF0F6] uppercase tracking-wider flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-[#60F1D0]" />
          Historical Baseline Snapshots
        </h2>
        <div className="panel divide-y divide-[#A8B4C2]/10 overflow-hidden border-[#A8B4C2]/15 bg-[#151C25]">
          {scans.length > 0 ? scans.map((s, idx) => (
            <div 
              key={s.id} 
              className="p-4 flex justify-between items-center hover:bg-[#1C2632] transition-colors cursor-pointer group"
              onClick={() => router.push(`/projects/${projectId}/scans/${s.id}`)}
            >
              <div>
                <div className="text-xs font-mono font-semibold text-[#60F1D0] group-hover:text-[#60F1D0]">
                  Scan #{scans.length - idx} &bull; {s.id.slice(0, 8)}
                </div>
                <div className="text-[11px] text-[#A8B4C2] font-mono mt-0.5">
                  Commit: <span className="text-[#EAF0F6]">{s.commit_sha ? s.commit_sha.slice(0, 10) : "UNKNOWN"}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="badge badge-success text-[10px] font-mono">{s.status}</span>
                <div className="text-[11px] text-[#A8B4C2] font-mono mt-1">
                  {new Date(s.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          )) : (
            <div className="p-8 text-center text-xs text-[#A8B4C2]">No scans found.</div>
          )}
        </div>
      </div>

      {scans.length >= 2 && (
        <div className="space-y-4 pt-6 border-t border-[#A8B4C2]/15">
          <h2 className="text-xs font-bold text-[#EAF0F6] uppercase tracking-wider flex items-center gap-2">
            <GitCompare className="w-3.5 h-3.5 text-[#8B7CFF]" />
            Differential Snapshot Comparison
          </h2>
          <div className="panel p-5 bg-[#151C25] border-[#A8B4C2]/15 space-y-4">
            <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="flex-1 space-y-1.5 w-full">
                <label className="text-[11px] font-mono text-[#A8B4C2] block">BASELINE REVISION (A)</label>
                <select 
                  className="w-full text-xs p-2 rounded-lg bg-[#1C2632] border border-[#A8B4C2]/20 text-[#EAF0F6] font-mono outline-none"
                  value={selectedScanA} 
                  onChange={e => setSelectedScanA(e.target.value)}
                >
                  {scans.map((s, idx) => (
                    <option key={s.id} value={s.id}>
                      Scan #{scans.length - idx} ({s.id.slice(0, 8)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="pb-2 text-[#A8B4C2] hidden sm:block">→</div>
              <div className="flex-1 space-y-1.5 w-full">
                <label className="text-[11px] font-mono text-[#A8B4C2] block">TARGET REVISION (B)</label>
                <select 
                  className="w-full text-xs p-2 rounded-lg bg-[#1C2632] border border-[#A8B4C2]/20 text-[#EAF0F6] font-mono outline-none"
                  value={selectedScanB} 
                  onChange={e => setSelectedScanB(e.target.value)}
                >
                  {scans.map((s, idx) => (
                    <option key={s.id} value={s.id}>
                      Scan #{scans.length - idx} ({s.id.slice(0, 8)})
                    </option>
                  ))}
                </select>
              </div>
              <button 
                onClick={handleCompare}
                disabled={comparing || selectedScanA === selectedScanB}
                className="bg-[#8B7CFF] hover:bg-[#8B7CFF]/90 disabled:opacity-50 text-[#0B0F14] font-bold px-5 py-2 rounded-lg text-xs transition-all h-[36px] w-full sm:w-auto shadow-[0_0_12px_#8B7CFF30]"
              >
                {comparing ? "Comparing..." : "Calculate Deltas"}
              </button>
            </div>
          </div>

          {comparison && (
            <div className="panel p-5 bg-[#151C25] border-[#A8B4C2]/15 space-y-4">
              <div className="flex justify-between items-center border-b border-[#A8B4C2]/10 pb-2">
                <span className="text-xs font-bold text-[#EAF0F6] uppercase font-mono">Calculated Revision Deltas</span>
                <div className="text-[11px] text-[#A8B4C2] font-mono">
                  {comparison.scan_a_commit?.substring(0,8)} → {comparison.scan_b_commit?.substring(0,8)}
                </div>
              </div>
              
              {comparison.deltas.length > 0 ? (
                <div className="space-y-2">
                  {comparison.deltas.map((d: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-3 rounded-lg border border-[#A8B4C2]/10 bg-[#1C2632]/50 text-xs font-mono">
                      <span className="text-[#EAF0F6] font-medium">{d.dimension}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[#A8B4C2]">{d.scan_a_val} → {d.scan_b_val}</span>
                        <span className="badge badge-analysis text-[10px]">CHANGED</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 border border-dashed border-[#A8B4C2]/15 rounded-lg text-center text-xs text-[#A8B4C2]">
                  No cryptographic differences found between these two snapshots.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
