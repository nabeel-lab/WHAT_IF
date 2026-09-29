"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    fetch(`http://localhost:8000/projects`)
      .then(res => res.json())
      .then(data => {
        const proj = data.find((p: any) => p.id === projectId);
        if (proj) setProject(proj);
      });

    const fetchSummary = () => {
      fetch(`http://localhost:8000/projects/${projectId}/summary`)
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch summary");
          return res.json();
        })
        .then(data => { 
          if (data) setSummary(data); 
          setSummaryError(null);
        })
        .catch(e => {
          setSummaryError(String(e));
        });
    };

    fetchSummary();
    const interval = setInterval(fetchSummary, 5000);
    return () => clearInterval(interval);
  }, [projectId]);

  const scanId = summary?.latest_completed_scan_id;
  const disc = summary?.discovery || {};
  const verif = summary?.verification || {};
  const isInvestigation = pathname?.includes("/investigation");

  const navItems = [
    { name: "Overview",       href: `/projects/${projectId}/overview` },
    { name: "Investigation",  href: `/projects/${projectId}/investigation` },
    { name: "CBOM",           href: `/projects/${projectId}/cbom` },
    { name: "Scans",          href: `/projects/${projectId}/scans` },
    { name: "Findings",       href: `/projects/${projectId}/findings` },
    { name: "Crypto Paths",   href: `/projects/${projectId}/paths` },
    { name: "Data",           href: `/projects/${projectId}/data` },
    { name: "Keys",           href: `/projects/${projectId}/keys` },
    { name: "Controls",       href: `/projects/${projectId}/controls` },
    { name: "Readiness",      href: `/projects/${projectId}/readiness` },
    { name: "Evidence",       href: `/projects/${projectId}/evidence` },
  ];

  return (
    <div className="flex flex-1 min-h-[calc(100vh-3.5rem)] bg-[#0B0F14]">
      {/* Sidebar */}
      <aside className="w-60 border-r border-[#A8B4C2]/15 bg-[#151C25] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#A8B4C2]/15">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#60F1D0] shadow-[0_0_6px_#60F1D0]" />
            <h2 className="font-semibold text-[#EAF0F6] text-sm truncate">{project?.name || "Loading..."}</h2>
          </div>
          <p className="text-[11px] text-[#A8B4C2] mt-1 font-mono">Workspace</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 text-xs font-medium rounded-lg transition-all duration-150 ${
                  isActive
                    ? "bg-[#1C2632] text-[#60F1D0] border border-[#60F1D0]/30 shadow-[0_0_12px_#60F1D015]"
                    : "text-[#A8B4C2] hover:bg-[#1C2632]/50 hover:text-[#EAF0F6] border border-transparent"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-[#0B0F14] overflow-hidden">
        {/* Persistent Context & Provenance Header */}
        <header className="border-b border-[#A8B4C2]/15 bg-[#151C25]/90 backdrop-blur-md px-6 py-2.5 shrink-0 z-10">
          <div className="flex flex-wrap items-center justify-between gap-y-2 text-xs text-[#A8B4C2]">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 font-medium text-[#EAF0F6]">
                <span className="text-[#A8B4C2] font-normal">Project:</span>
                <span className="font-bold">{project?.name || "..."}</span>
                {project?.name?.toLowerCase() === "enterprise_info" ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#60F1D0]/15 text-[#60F1D0] border border-[#60F1D0]/30 font-semibold">
                    DEMO PROJECT
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#4E9FFF]/15 text-[#4E9FFF] border border-[#4E9FFF]/30 font-semibold">
                    REAL PROJECT
                  </span>
                )}
              </div>
              <div className="h-3 w-[1px] bg-[#A8B4C2]/20" />
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#A8B4C2]">
                <span>Source:</span>
                <span className="text-[#EAF0F6] bg-[#1C2632] px-2 py-0.5 rounded border border-[#A8B4C2]/15">
                  {summary?.latest_completed_scan_repository_url
                    ? summary.latest_completed_scan_repository_url.replace("https://github.com/", "")
                    : project?.name === "Enterprise_info"
                    ? "nabeel-lab/Enterprise_info"
                    : "Repository / Archive"}
                </span>
              </div>
              <div className="h-3 w-[1px] bg-[#A8B4C2]/20" />
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#1C2632] border border-[#A8B4C2]/15">
                <span className="w-1.5 h-1.5 rounded-full bg-[#60F1D0]" />
                <span className="text-[#EAF0F6] font-semibold">{summary ? disc.crypto_assets ?? 0 : "..."}</span>
                <span className="text-[#A8B4C2]">Assets</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#1C2632] border border-[#A8B4C2]/15">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B7CFF]" />
                <span className="text-[#EAF0F6] font-semibold">{summary ? verif.reachable_paths ?? 0 : "..."}</span>
                <span className="text-[#A8B4C2]">Reachable</span>
              </div>
            </div>

            {scanId ? (
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <div className="px-2 py-0.5 rounded bg-[#1C2632] border border-[#A8B4C2]/20">
                  <span className="text-[#A8B4C2]">CURRENT SCAN: </span>
                  <span className="text-[#60F1D0] font-semibold">{scanId.slice(0, 8)}</span>
                </div>
                {summary?.latest_completed_scan_commit_sha && (
                  <div className="px-2 py-0.5 rounded bg-[#1C2632] border border-[#A8B4C2]/20">
                    <span className="text-[#A8B4C2]">SHA </span>
                    <span className="text-[#EAF0F6]">{summary.latest_completed_scan_commit_sha.slice(0, 7)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[11px] font-mono text-[#A8B4C2] bg-[#1C2632] px-2.5 py-0.5 rounded border border-[#A8B4C2]/15">
                NO ACTIVE SCAN
              </div>
            )}
          </div>
        </header>

        {summaryError && (
          <div className="bg-[#FF7A90]/10 border-b border-[#FF7A90]/30 px-6 py-2 flex items-center justify-between text-xs text-[#FF7A90] shrink-0">
            <div>
              <span className="font-semibold">Summary Connection Note:</span> {summaryError}
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="px-2.5 py-0.5 bg-[#1C2632] border border-[#FF7A90]/30 rounded text-[#FF7A90] hover:bg-[#1C2632]/80 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Page Content */}
        <div className={`flex-1 ${isInvestigation ? "p-0 overflow-hidden relative" : "overflow-y-auto p-8"}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
