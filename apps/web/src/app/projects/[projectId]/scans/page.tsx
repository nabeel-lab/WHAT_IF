"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RotateCw, ShieldCheck, Clock, FileCode, CheckCircle2, AlertCircle } from "lucide-react";

const API = "http://localhost:8000";

const STATUS_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  COMPLETED: { bg: "rgba(96, 241, 208, 0.12)", text: "#60F1D0", border: "rgba(96, 241, 208, 0.3)" },
  SCANNING: { bg: "rgba(139, 124, 255, 0.12)", text: "#8B7CFF", border: "rgba(139, 124, 255, 0.3)" },
  QUEUED: { bg: "rgba(255, 191, 114, 0.12)", text: "#FFBF72", border: "rgba(255, 191, 114, 0.3)" },
  FAILED: { bg: "rgba(255, 122, 144, 0.12)", text: "#FF7A90", border: "rgba(255, 122, 144, 0.3)" },
};

export default function ScansPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [scans, setScans] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchScans = () => {
    fetch(`${API}/projects/${projectId}/scans`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setScans(d); setLoading(false); });
  };

  useEffect(() => {
    fetch(`${API}/projects`)
      .then(r => r.json())
      .then(data => {
        const p = data.find((p: any) => p.id === projectId);
        if (p) setProject(p);
      });
    fetchScans();
    const interval = setInterval(fetchScans, 3000);
    return () => clearInterval(interval);
  }, [projectId]);

  const handleScanAgain = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      const targetRepo = project?.repository_url || scans[0]?.repository_url || "https://github.com/nabeel-lab/Enterprise_info.git";
      const res = await fetch(`${API}/projects/${projectId}/scans`, {
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
    } catch (e) {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#A8B4C2]/15 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#60F1D0] shadow-[0_0_8px_#60F1D0]" />
            <h1 className="text-xl font-bold text-[#EAF0F6] tracking-wide">Scan History & Mutation Records</h1>
          </div>
          <p className="text-xs text-[#A8B4C2] mt-1 font-mono">
            Cryptographically sealed and immutable discovery snapshots.
          </p>
        </div>
        <button
          onClick={handleScanAgain}
          disabled={scanning}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg border transition-all ${
            scanning
              ? "bg-[#1C2632] text-[#A8B4C2] border-[#A8B4C2]/15 cursor-not-allowed"
              : "bg-[#60F1D0]/15 hover:bg-[#60F1D0]/25 text-[#60F1D0] border border-[#60F1D0]/30 shadow-[0_0_12px_#60F1D015]"
          }`}
        >
          <RotateCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
          <span>{scanning ? "Scanning…" : "Launch New Scan"}</span>
        </button>
      </div>

      {scanning && (
        <div className="p-4 rounded-xl border border-[#60F1D0]/30 bg-[#60F1D0]/5 text-xs text-[#60F1D0] flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#60F1D0] animate-ping" />
          <span>Scan execution in progress. Capturing static AST, interprocedural call graph, and runtime evidence.</span>
        </div>
      )}

      <div className="panel overflow-hidden border-[#A8B4C2]/15 bg-[#151C25]">
        <table className="data-table">
          <thead>
            <tr>
              <th>Scan ID</th>
              <th>Git Commit</th>
              <th>Pipeline State</th>
              <th>Started</th>
              <th>Completed</th>
              <th>Assets</th>
              <th>Files</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#A8B4C2]/10 text-xs">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-[#A8B4C2]">Loading scan history…</td></tr>
            ) : scans.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-[#A8B4C2]">
                  No scans recorded. Click <strong>Launch New Scan</strong> to create the initial baseline.
                </td>
              </tr>
            ) : scans.map((scan: any) => {
              const statusStyle = STATUS_BADGE[scan.status] || { bg: "rgba(168, 180, 194, 0.1)", text: "#A8B4C2", border: "rgba(168, 180, 194, 0.2)" };
              return (
                <tr
                  key={scan.id}
                  className="hover:bg-[#1C2632] cursor-pointer transition-colors group"
                  onClick={() => router.push(`/projects/${projectId}/scans/${scan.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-[#60F1D0] font-semibold">
                    {scan.id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#EAF0F6]">
                    {scan.commit_sha ? scan.commit_sha.slice(0, 10) : <span className="text-[#A8B4C2]">UNKNOWN</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span 
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium border inline-flex items-center gap-1.5 ${
                        scan.status === "SCANNING" || scan.status === "RUNNING" || scan.status === "QUEUED" ? "animate-pulse" : ""
                      }`}
                      style={{ backgroundColor: statusStyle.bg, color: statusStyle.text, borderColor: statusStyle.border }}
                    >
                      {(scan.status === "SCANNING" || scan.status === "RUNNING") && (
                        <RotateCw className="w-2.5 h-2.5 animate-spin" />
                      )}
                      {scan.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#A8B4C2] font-mono">
                    {scan.started_at ? new Date(scan.started_at).toLocaleDateString() + " " + new Date(scan.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#A8B4C2] font-mono">
                    {scan.completed_at ? new Date(scan.completed_at).toLocaleDateString() + " " + new Date(scan.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (
                      scan.status === "SCANNING" || scan.status === "RUNNING" ? (
                        <span className="text-[#8B7CFF] animate-pulse font-semibold">Running…</span>
                      ) : "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#EAF0F6] font-mono font-semibold">{scan.findings_count ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-[#A8B4C2] font-mono">{scan.files_scanned ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-[#A8B4C2] font-mono">
        &bull; Each scan record is immutable. Diff comparison analyzes deltas between consecutive baseline snapshots.
      </p>
    </div>
  );
}
