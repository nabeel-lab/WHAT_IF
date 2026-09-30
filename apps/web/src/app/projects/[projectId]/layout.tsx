"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Compass,
  Layers,
  Activity,
  GitBranch,
  Database,
  Key,
  ShieldCheck,
  FileCode,
  Sliders,
  FileText,
  History,
  RotateCw,
  Plus,
  Radio,
  ExternalLink,
  ChevronRight
} from "lucide-react";

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    fetch(`${apiUrl}/projects`)
      .then(res => res.json())
      .then(data => {
        const proj = data.find((p: any) => p.id === projectId);
        if (proj) setProject(proj);
      })
      .catch(console.error);

    const fetchSummary = () => {
      fetch(`${apiUrl}/projects/${projectId}/summary`)
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
    const interval = setInterval(fetchSummary, 6000);
    return () => clearInterval(interval);
  }, [projectId]);

  const scanId = summary?.latest_completed_scan_id;
  const disc = summary?.discovery || {};
  const verif = summary?.verification || {};
  const isInvestigation = pathname?.includes("/investigation");

  // Conceptual Navigation Groups for the Digital Instrument
  const NAV_SECTIONS = [
    {
      group: "INVESTIGATE",
      items: [
        { name: "Overview", href: `/projects/${projectId}/overview`, icon: Compass },
        { name: "Findings", href: `/projects/${projectId}/findings`, icon: Layers },
        { name: "Spatial Investigation", href: `/projects/${projectId}/investigation`, icon: Activity, highlight: true },
      ]
    },
    {
      group: "UNDERSTAND",
      items: [
        { name: "Crypto Paths", href: `/projects/${projectId}/paths`, icon: GitBranch },
        { name: "Protected Data", href: `/projects/${projectId}/data`, icon: Database },
        { name: "Key Inventory", href: `/projects/${projectId}/keys`, icon: Key },
        { name: "Controls", href: `/projects/${projectId}/controls`, icon: ShieldCheck },
        { name: "Raw Evidence", href: `/projects/${projectId}/evidence`, icon: FileCode },
      ]
    },
    {
      group: "DECIDE",
      items: [
        { name: "Readiness Posture", href: `/projects/${projectId}/readiness`, icon: Radio },
      ]
    },
    {
      group: "ARTIFACTS",
      items: [
        { name: "CBOM (CycloneDX)", href: `/projects/${projectId}/cbom`, icon: FileText },
        { name: "Reports & Audits", href: `/projects/${projectId}/reports`, icon: FileText },
        { name: "Scan History", href: `/projects/${projectId}/scans/history`, icon: History },
      ]
    }
  ];

  return (
    <div className="flex flex-1 min-h-[calc(100vh-3.5rem)] bg-[#0B0F14]">
      
      {/* ─── Ergonomic Instrument Rail (Navigation Console) ─── */}
      <aside className="w-64 border-r border-[#A8B4C2]/12 liquid-glass flex flex-col shrink-0 select-none" style={{ borderRadius: 0 }}>
        
        {/* Workspace Provenance Header */}
        <div className="p-4 border-b border-[#A8B4C2]/12 bg-[#151C25]/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono text-[#60F1D0] tracking-wider uppercase font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#60F1D0] shadow-[0_0_8px_#60F1D0]" />
              ACTIVE WORKSPACE
            </span>
            <Link
              href="/"
              className="text-[10px] font-mono text-[#A8B4C2] hover:text-[#EAF0F6] transition-colors"
            >
              Switch ↗
            </Link>
          </div>
          <h2 className="font-bold text-[#EAF0F6] text-sm truncate" title={project?.name}>
            {project?.name || "Initializing..."}
          </h2>
          <div className="text-[11px] text-[#A8B4C2] mt-1 font-mono truncate">
            {summary?.latest_completed_scan_repository_url
              ? summary.latest_completed_scan_repository_url.replace("https://github.com/", "")
              : project?.name === "Enterprise_info"
              ? "nabeel-lab/Enterprise_info"
              : "Source: Local / Git"}
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.group} className="space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-mono font-bold tracking-wider text-[#A8B4C2]/60 uppercase">
                {section.group}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== `/projects/${projectId}/overview` && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center justify-between px-3 py-2 text-xs font-mono rounded-xl transition-all duration-150 ${
                      isActive
                        ? "bg-[#1C2632] text-[#60F1D0] border border-[#60F1D0]/30 shadow-[0_0_16px_rgba(96,241,208,0.1)] font-semibold"
                        : "text-[#A8B4C2] hover:bg-[#1C2632]/50 hover:text-[#EAF0F6] border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                        isActive ? "text-[#60F1D0]" : "text-[#A8B4C2] group-hover:text-[#EAF0F6]"
                      }`} />
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.highlight && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#60F1D0] shadow-[0_0_6px_#60F1D0]" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Rail Footer Action: New Scan */}
        <div className="p-3 border-t border-[#A8B4C2]/12 bg-[#151C25]/40">
          <Link
            href={`/projects/${projectId}/scans/new`}
            className="w-full btn-secondary text-xs py-2 flex items-center justify-center gap-2"
          >
            <RotateCw className="w-3.5 h-3.5 text-[#60F1D0]" />
            <span>Launch Scan</span>
          </Link>
        </div>

      </aside>

      {/* ─── Main Content Area & Spatial Provenance Bar ─── */}
      <div className="flex-1 flex flex-col bg-[#0B0F14] overflow-hidden min-w-0">
        
        {/* Persistent Provenance Bar */}
        <header className="border-b border-[#A8B4C2]/12 glass-dock px-6 py-2.5 shrink-0 z-20" style={{ borderRadius: 0 }}>
          <div className="flex flex-wrap items-center justify-between gap-y-2 text-xs">
            
            {/* Left Telemetry Chips */}
            <div className="flex items-center gap-3 flex-wrap font-mono">
              <div className="flex items-center gap-1.5 text-[#EAF0F6]">
                <span className="text-[#A8B4C2]">ENV:</span>
                <span className="font-semibold px-2 py-0.5 rounded bg-[#1C2632] border border-[#A8B4C2]/15">
                  {project?.name || "..."}
                </span>
              </div>

              <div className="h-3 w-px bg-[#A8B4C2]/20" />

              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1C2632]/80 border border-[#60F1D0]/30 text-[#60F1D0]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#60F1D0] shadow-[0_0_6px_#60F1D0]" />
                <span className="font-bold">{summary ? (disc.crypto_assets ?? 0) : "..."}</span>
                <span className="text-[#A8B4C2]">Cryptographic Assets</span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1C2632]/80 border border-[#8B7CFF]/30 text-[#8B7CFF]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B7CFF]" />
                <span className="font-bold">{summary ? (verif.reachable_paths ?? 0) : "..."}</span>
                <span className="text-[#A8B4C2]">Reachable</span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1C2632]/80 border border-[#75B7FF]/30 text-[#75B7FF]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#75B7FF]" />
                <span className="font-bold">{summary ? (disc.data_assets ?? 0) : "..."}</span>
                <span className="text-[#A8B4C2]">Data Assets</span>
              </div>
            </div>

            {/* Right Scan State */}
            {scanId ? (
              <div className="flex items-center gap-2.5 font-mono text-[11px]">
                <Link
                  href={`/projects/${projectId}/scans/${scanId}`}
                  className="px-2.5 py-1 rounded-lg bg-[#1C2632] border border-[#A8B4C2]/20 text-[#A8B4C2] hover:text-[#60F1D0] hover:border-[#60F1D0]/40 transition-colors flex items-center gap-1.5"
                >
                  <span className="text-[#A8B4C2]">SCAN</span>
                  <span className="text-[#60F1D0] font-semibold">{scanId.slice(0, 8)}</span>
                </Link>
                {summary?.latest_completed_scan_commit_sha && (
                  <div className="px-2 py-1 rounded-lg bg-[#1C2632] border border-[#A8B4C2]/15 text-[#EAF0F6]">
                    SHA: {summary.latest_completed_scan_commit_sha.slice(0, 7)}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[11px] font-mono text-[#A8B4C2] bg-[#1C2632] px-2.5 py-1 rounded-lg border border-[#A8B4C2]/15">
                NO COMPLETED SCAN
              </div>
            )}

          </div>
        </header>

        {summaryError && (
          <div className="bg-[#FF7A90]/10 border-b border-[#FF7A90]/30 px-6 py-2 flex items-center justify-between text-xs text-[#FF7A90] shrink-0 font-mono">
            <span>Summary Telemetry: {summaryError}</span>
            <button
              onClick={() => window.location.reload()}
              className="px-2 py-0.5 bg-[#1C2632] border border-[#FF7A90]/30 rounded text-[#FF7A90] hover:bg-white/5"
            >
              Retry
            </button>
          </div>
        )}

        {/* Content Viewport */}
        <div className={`flex-1 ${isInvestigation ? "p-0 overflow-hidden relative" : "overflow-y-auto p-8"}`}>
          {children}
        </div>

      </div>

    </div>
  );
}
