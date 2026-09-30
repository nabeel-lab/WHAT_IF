"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  RotateCw,
  ShieldCheck,
  Clock,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  GitBranch,
  Terminal,
  Activity
} from "lucide-react";

export default function ScansPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [scans, setScans] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchScans = () => {
    fetch(`${apiUrl}/projects/${projectId}/scans`)
      .then(r => (r.ok ? r.json() : []))
      .then(d => {
        setScans(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetch(`${apiUrl}/projects`)
      .then(r => r.json())
      .then(data => {
        const p = data.find((p: any) => p.id === projectId);
        if (p) setProject(p);
      })
      .catch(console.error);

    fetchScans();
    const interval = setInterval(fetchScans, 4000);
    return () => clearInterval(interval);
  }, [projectId]);

  const handleScanAgain = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      const targetRepo = project?.repository_url || scans[0]?.repository_url || "https://github.com/nabeel-lab/Enterprise_info.git";
      const res = await fetch(`${apiUrl}/projects/${projectId}/scans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          repository_url: targetRepo,
          source_type: "GIT_REPOSITORY",
          branch: "main",
          scope: "full",
          language: "python",
          environment: "production",
          static_analysis_enabled: true,
          verification_enabled: true,
          runtime_enabled: true,
          context_enabled: true,
        }),
      });

      if (res.ok) {
        const scan = await res.json();
        router.push(`/projects/${projectId}/scans/${scan.id}`);
      } else if (res.status === 409) {
        const detail = await res.json();
        const activeScanId = detail.detail.match(/Scan #(.*?) is already running/)?.[1];
        if (activeScanId) {
          router.push(`/projects/${projectId}/scans/${activeScanId}`);
        } else {
          alert(detail.detail || "A scan is already active.");
          setScanning(false);
        }
      } else {
        alert("Failed to start scan");
        setScanning(false);
      }
    } catch {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20 font-mono text-xs relative">
      
      {/* ─── Header & Action Bar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#A8B4C2]/12 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#60F1D0] shadow-[0_0_8px_#60F1D0]" />
            <h1 className="text-xl font-bold text-[#EAF0F6] tracking-wide">
              Scan Pipeline Orchestrator
            </h1>
          </div>
          <p className="text-[#A8B4C2] mt-1 text-xs">
            Manage multi-tier cryptographic discovery runs, trigger live telemetry, and review execution logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleScanAgain}
            disabled={scanning}
            className="btn-secondary text-xs px-3.5 py-1.5 flex items-center gap-2 disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin text-[#60F1D0]" : ""}`} />
            <span>{scanning ? "Triggering..." : "Scan Repository"}</span>
          </button>

          <Link
            href={`/projects/${projectId}/scans/new`}
            className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Configure New Scan</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-xs font-mono text-[#A8B4C2] gap-2">
          <span className="w-2 h-2 rounded-full bg-[#60F1D0] animate-ping" />
          <span>Polling scan execution queue...</span>
        </div>
      ) : scans.length === 0 ? (
        <div className="glass-surface p-12 text-center text-[#A8B4C2] rounded-2xl border-dashed border-[#A8B4C2]/20 space-y-3">
          <Activity className="w-8 h-8 text-[#60F1D0]/50 mx-auto" />
          <div className="text-[#EAF0F6] font-bold">No discovery scans executed for this workspace.</div>
          <p>Initialize a scan to establish the cryptographic evidence baseline.</p>
          <Link
            href={`/projects/${projectId}/scans/new`}
            className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-2"
          >
            <span>Launch First Scan</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="glass-surface rounded-2xl border border-[#A8B4C2]/15 overflow-hidden">
            <div className="p-4 border-b border-[#A8B4C2]/10 bg-[#1C2632]/50 text-[#A8B4C2] font-semibold flex items-center justify-between">
              <span>ACTIVE & HISTORICAL RUNS ({scans.length})</span>
              <span>VERIFICATION STAGES</span>
            </div>
            <div className="divide-y divide-[#A8B4C2]/10">
              {scans.map((s) => {
                const isCompleted = s.status === "COMPLETED";
                const isScanning = s.status === "SCANNING";
                const isFailed = s.status === "FAILED";

                return (
                  <div
                    key={s.id}
                    className="p-4 hover:bg-[#1C2632]/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-[#EAF0F6]">Scan #{s.id.slice(0, 8)}</span>
                        <span
                          className={`badge ${
                            isCompleted ? "badge-success" : isScanning ? "badge-analysis" : isFailed ? "badge-danger" : "badge-neutral"
                          }`}
                        >
                          {s.status}
                        </span>
                        {s.commit_sha && (
                          <span className="badge badge-neutral">SHA: {s.commit_sha.slice(0, 7)}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#A8B4C2]">
                        Repository: <code className="text-[#60F1D0]">{s.repository_url || "Local File Intake"}</code> · Branch: <code className="text-[#EAF0F6]">{s.branch || "main"}</code>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Link
                        href={`/projects/${projectId}/scans/${s.id}`}
                        className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 text-[#60F1D0] hover:bg-[#60F1D0]/10 border border-[#A8B4C2]/15 hover:border-[#60F1D0]/30"
                      >
                        <span>Inspect Stage Progress</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
