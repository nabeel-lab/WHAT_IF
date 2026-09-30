"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  GitCompare,
  History,
  ArrowRight,
  ShieldCheck,
  RotateCw,
  Plus,
  Minus,
  AlertTriangle
} from "lucide-react";

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

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchScans = async () => {
      try {
        const res = await fetch(`${apiUrl}/projects/${projectId}/scans`);
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
      const res = await fetch(`${apiUrl}/projects/${projectId}/scans/${selectedScanA}/compare/${selectedScanB}`);
      if (res.ok) {
        setComparison(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setComparing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-xs font-mono text-[#A8B4C2] gap-2">
        <span className="w-2 h-2 rounded-full bg-[#60F1D0] animate-ping" />
        <span>Loading historical scan execution logs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20 font-mono text-xs relative">
      
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#A8B4C2]/12 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#60F1D0] shadow-[0_0_8px_#60F1D0]" />
            <h1 className="text-xl font-bold text-[#EAF0F6] tracking-wide">
              Scan History & Differential Comparison
            </h1>
          </div>
          <p className="text-[#A8B4C2] mt-1 text-xs">
            Review immutable scan baselines and analyze cryptographic posture drift between commits.
          </p>
        </div>

        <Link
          href={`/projects/${projectId}/scans/new`}
          className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Launch New Scan</span>
        </Link>
      </div>

      {scans.length < 2 ? (
        <div className="glass-surface p-12 text-center text-[#A8B4C2] rounded-2xl border-dashed border-[#A8B4C2]/20 space-y-3">
          <History className="w-8 h-8 text-[#A8B4C2]/40 mx-auto" />
          <div className="text-[#EAF0F6] font-bold">At least 2 completed scans are required to compute differential drift.</div>
          <p>Execute additional scans on different branches or commits to analyze cryptographic evolution.</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Comparison Selector Console */}
          <div className="glass-raised p-5 rounded-2xl border border-[#A8B4C2]/15 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-xs font-bold text-[#60F1D0] uppercase">
              <GitCompare className="w-4 h-4" />
              <span>CONFIGURE SCAN-TO-SCAN COMPARATOR</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-[#A8B4C2] mb-1">BASELINE SCAN (ORIGIN)</label>
                <select
                  value={selectedScanA}
                  onChange={(e) => setSelectedScanA(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0F14] border border-[#A8B4C2]/20 text-xs text-[#EAF0F6] outline-none focus:border-[#60F1D0]"
                >
                  {scans.map((s) => (
                    <option key={s.id} value={s.id}>
                      Scan #{s.id.slice(0, 8)} ({s.commit_sha ? `SHA: ${s.commit_sha.slice(0, 7)}` : new Date(s.created_at).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[#A8B4C2] mb-1">TARGET SCAN (EVOLUTION)</label>
                <select
                  value={selectedScanB}
                  onChange={(e) => setSelectedScanB(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0F14] border border-[#A8B4C2]/20 text-xs text-[#EAF0F6] outline-none focus:border-[#60F1D0]"
                >
                  {scans.map((s) => (
                    <option key={s.id} value={s.id}>
                      Scan #{s.id.slice(0, 8)} ({s.commit_sha ? `SHA: ${s.commit_sha.slice(0, 7)}` : new Date(s.created_at).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleCompare}
                disabled={comparing || selectedScanA === selectedScanB}
                className="btn-primary text-xs px-5 py-2 disabled:opacity-50 flex items-center gap-2"
              >
                <GitCompare className={`w-3.5 h-3.5 ${comparing ? "animate-spin" : ""}`} />
                <span>{comparing ? "Comparing Scans..." : "Compute Differential Drift"}</span>
              </button>
            </div>
          </div>

          {/* Differential Results */}
          {comparison && (
            <div className="glass-surface p-6 rounded-2xl border border-[#60F1D0]/30 space-y-4 shadow-xl">
              <div className="text-xs font-bold text-[#EAF0F6] uppercase tracking-wider border-b border-[#A8B4C2]/10 pb-3">
                DIFFERENTIAL CRYPTOGRAPHIC ANALYSIS
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#0B0F14]/70 border border-[#60F1D0]/20 space-y-1">
                  <span className="text-[10px] text-[#A8B4C2] uppercase">NEW PRIMITIVES ADDED</span>
                  <div className="text-lg font-bold text-[#60F1D0]">
                    +{comparison.added_assets?.length ?? 0}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0B0F14]/70 border border-[#FF7A90]/20 space-y-1">
                  <span className="text-[10px] text-[#A8B4C2] uppercase">RETIRED PRIMITIVES</span>
                  <div className="text-lg font-bold text-[#FF7A90]">
                    -{comparison.removed_assets?.length ?? 0}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0B0F14]/70 border border-[#8B7CFF]/20 space-y-1">
                  <span className="text-[10px] text-[#A8B4C2] uppercase">REACHABILITY DELTA</span>
                  <div className="text-lg font-bold text-[#8B7CFF]">
                    {comparison.reachability_delta ?? "Unchanged (Stable)"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* All Historical Scans List */}
          <div className="glass-surface rounded-2xl border border-[#A8B4C2]/15 overflow-hidden">
            <div className="p-4 border-b border-[#A8B4C2]/10 bg-[#1C2632]/50 text-[#A8B4C2] font-semibold flex items-center justify-between">
              <span>SCAN EXECUTION HISTORY ({scans.length})</span>
              <span>STATUS</span>
            </div>
            <div className="divide-y divide-[#A8B4C2]/10">
              {scans.map((s) => (
                <div
                  key={s.id}
                  className="p-4 hover:bg-[#1C2632]/40 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#EAF0F6]">Scan #{s.id.slice(0, 8)}</span>
                      {s.commit_sha && (
                        <span className="badge badge-neutral">SHA: {s.commit_sha.slice(0, 7)}</span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#A8B4C2]">
                      Completed: {new Date(s.created_at).toLocaleString()} · Target: {s.repository_url || "Local file intake"}
                    </div>
                  </div>

                  <Link
                    href={`/projects/${projectId}/scans/${s.id}`}
                    className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1 text-[#60F1D0] hover:bg-[#60F1D0]/10"
                  >
                    <span>View Telemetry</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
