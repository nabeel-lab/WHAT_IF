"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Shield } from "lucide-react";

export default function Findings() {
  const router = useRouter();
  const [findings, setFindings] = useState<any[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFindings();
  }, []);

  const fetchFindings = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const projRes = await fetch(`${apiUrl}/projects`);
      if (projRes.ok) {
        const projects = await projRes.json();
        if (projects.length > 0) {
          setProjectId(projects[0].id);
          const res = await fetch(`${apiUrl}/projects/${projects[0].id}/findings`);
          if (res.ok) {
            const data = await res.json();
            setFindings(data);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-8 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#A8B4C2]/15 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#60F1D0] shadow-[0_0_8px_#60F1D0]" />
            <h1 className="text-xl font-bold text-[#EAF0F6] tracking-wide">Global Cryptographic Findings</h1>
          </div>
          <p className="text-xs text-[#A8B4C2] mt-1 font-mono">
            Direct inventory across active workspaces.
          </p>
        </div>

        {projectId && (
          <Link
            href={`/projects/${projectId}/findings`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#60F1D0]/15 text-[#60F1D0] border border-[#60F1D0]/30 hover:bg-[#60F1D0]/25 transition-all shadow-[0_0_12px_#60F1D015]"
          >
            <span>Open Project Inventory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      <div className="panel overflow-hidden border-[#A8B4C2]/15 bg-[#151C25]">
        <table className="data-table">
          <thead>
            <tr>
              <th>Algorithm</th>
              <th>Role</th>
              <th>Source File</th>
              <th>Reachability</th>
              <th>Runtime</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#A8B4C2]/10 text-xs">
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-[#A8B4C2]">Loading findings…</td></tr>
            ) : findings.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-[#A8B4C2]">No findings available. Run an automated scan.</td></tr>
            ) : (
              findings.map((f: any) => {
                const data = f.finding || f;
                const reachability = f.reachability?.status || "UNKNOWN";
                const runtime = f.runtime && f.runtime.length > 0 ? "OBSERVED" : "NOT OBSERVED";

                return (
                  <tr 
                    key={data.id} 
                    className="hover:bg-[#1C2632] cursor-pointer transition-colors group"
                    onClick={() => {
                      if (projectId) {
                        router.push(`/projects/${projectId}/findings/${data.id}`);
                      } else {
                        router.push(`/findings/${data.id}`);
                      }
                    }}
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-[#60F1D0]">
                      {data.algorithm || data.name}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#EAF0F6] capitalize">{data.role || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#A8B4C2]">
                      {data.source_file}:{data.line_start}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${reachability === "REACHABLE" ? "badge-analysis" : "badge-neutral"}`}>
                        {reachability}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${runtime === "OBSERVED" ? "badge-success" : "badge-neutral"}`}>
                        {runtime}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-xs text-[#60F1D0] group-hover:underline inline-flex items-center gap-1">
                        <span>Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
