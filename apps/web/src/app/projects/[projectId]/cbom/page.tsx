"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Download, FileText, ArrowRight, Shield, Key, FileCode, Sparkles } from "lucide-react";
import AssistantDrawer from "@/components/investigation/AssistantDrawer";

const API = "http://localhost:8000";

const ALGO_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  RSA: { bg: "rgba(139, 124, 255, 0.12)", text: "#8B7CFF", border: "rgba(139, 124, 255, 0.3)" },
  AES: { bg: "rgba(96, 241, 208, 0.12)", text: "#60F1D0", border: "rgba(96, 241, 208, 0.3)" },
  EC: { bg: "rgba(117, 183, 255, 0.12)", text: "#75B7FF", border: "rgba(117, 183, 255, 0.3)" },
  ECDSA: { bg: "rgba(117, 183, 255, 0.12)", text: "#75B7FF", border: "rgba(117, 183, 255, 0.3)" },
  "AWS KMS": { bg: "rgba(255, 191, 114, 0.12)", text: "#FFBF72", border: "rgba(255, 191, 114, 0.3)" },
  SHA1: { bg: "rgba(255, 122, 144, 0.12)", text: "#FF7A90", border: "rgba(255, 122, 144, 0.3)" },
  MD5: { bg: "rgba(255, 122, 144, 0.12)", text: "#FF7A90", border: "rgba(255, 122, 144, 0.3)" },
  HASH: { bg: "rgba(168, 180, 194, 0.12)", text: "#A8B4C2", border: "rgba(168, 180, 194, 0.3)" },
  SYMMETRIC: { bg: "rgba(96, 241, 208, 0.12)", text: "#60F1D0", border: "rgba(96, 241, 208, 0.3)" },
  TLS: { bg: "rgba(117, 183, 255, 0.12)", text: "#75B7FF", border: "rgba(117, 183, 255, 0.3)" },
};

function AlgoBadge({ algo }: { algo: string }) {
  const upper = algo?.toUpperCase();
  const style = ALGO_STYLE[upper] || { bg: "rgba(168, 180, 194, 0.1)", text: "#A8B4C2", border: "rgba(168, 180, 194, 0.2)" };
  return (
    <span 
      className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold border inline-block"
      style={{ backgroundColor: style.bg, color: style.text, borderColor: style.border }}
    >
      {algo || "—"}
    </span>
  );
}

export default function CBOMPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [cbom, setCbom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scanId, setScanId] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeEntity, setActiveEntity] = useState<{ id?: string; type?: string; question?: string }>({});

  const askAssistant = (type: string, id: string, question: string) => {
    setActiveEntity({ type, id, question });
    setDrawerOpen(true);
  };

  useEffect(() => {
    const url = scanId
      ? `${API}/projects/${projectId}/cbom?scan_id=${scanId}`
      : `${API}/projects/${projectId}/cbom`;

    fetch(url)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCbom(d); setLoading(false); });
  }, [projectId, scanId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[#A8B4C2] gap-2">
        <span className="w-2 h-2 rounded-full bg-[#60F1D0] animate-ping" />
        Loading Cryptographic Bill of Materials…
      </div>
    );
  }

  if (!cbom?.scan_id) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <div className="text-[#A8B4C2] text-sm">No completed scan found to generate CBOM artifact.</div>
        <Link 
          href={`/projects/${projectId}/scans`}
          className="text-xs text-[#60F1D0] hover:underline font-mono"
        >
          Go to Scans to execute a baseline scan →
        </Link>
      </div>
    );
  }

  const assets: any[] = cbom.sections?.crypto_assets || [];
  const certs: any[] = cbom.sections?.certificates || [];
  const keys: any[] = cbom.sections?.key_metadata || [];
  const totals = cbom.totals || {};

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#A8B4C2]/15 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#60F1D0] shadow-[0_0_8px_#60F1D0]" />
            <h1 className="text-xl font-bold text-[#EAF0F6] tracking-wide">
              Cryptographic Bill of Materials (CBOM)
            </h1>
          </div>
          <p className="text-xs text-[#A8B4C2] mt-1 font-mono">
            CycloneDX-compliant cryptographic inventory with provenance and algorithm posture.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => askAssistant("CBOM", cbom.scan_id, "Explain this CBOM inventory, cryptographic assets, certificates, and key metadata.")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#60F1D0]/10 hover:bg-[#60F1D0]/20 text-[#60F1D0] border border-[#60F1D0]/30 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask ECDAT</span>
          </button>

          <button 
            onClick={() => window.open(`${API}/projects/${projectId}/cbom?scan_id=${cbom.scan_id}`, "_blank")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#60F1D0]/15 hover:bg-[#60F1D0]/25 text-[#60F1D0] border border-[#60F1D0]/30 transition-all shadow-[0_0_12px_#60F1D015]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CBOM JSON</span>
          </button>
        </div>
      </div>

      {/* Provenance Console Bar */}
      <div className="panel p-4 bg-[#151C25] border-[#A8B4C2]/15 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <span className="text-[11px] font-mono text-[#A8B4C2] block">SEALED SCAN ID</span>
            <span className="text-xs font-mono text-[#60F1D0] font-semibold">{cbom.scan_id}</span>
          </div>
          <div className="h-6 w-[1px] bg-[#A8B4C2]/15 hidden sm:block" />
          <div>
            <span className="text-[11px] font-mono text-[#A8B4C2] block">VCS COMMIT</span>
            <span className="text-xs font-mono text-[#EAF0F6]">
              {cbom.commit_sha ? cbom.commit_sha.slice(0, 10) : "NO_COMMIT_HASH"}
            </span>
          </div>
          <div className="h-6 w-[1px] bg-[#A8B4C2]/15 hidden sm:block" />
          <div>
            <span className="text-[11px] font-mono text-[#A8B4C2] block">TIMESTAMP</span>
            <span className="text-xs text-[#EAF0F6]">
              {cbom.completed_at ? new Date(cbom.completed_at).toLocaleString() : "—"}
            </span>
          </div>
        </div>

        {/* Totals in compact telemetry capsules */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1 rounded-lg bg-[#1C2632] border border-[#A8B4C2]/15 text-xs font-mono">
            <span className="text-[#60F1D0] font-bold">{totals.crypto_assets ?? 0}</span>
            <span className="text-[#A8B4C2] ml-1.5">Assets</span>
          </div>
          <div className="px-3 py-1 rounded-lg bg-[#1C2632] border border-[#A8B4C2]/15 text-xs font-mono">
            <span className="text-[#75B7FF] font-bold">{totals.certificates ?? 0}</span>
            <span className="text-[#A8B4C2] ml-1.5">Certificates</span>
          </div>
          <div className="px-3 py-1 rounded-lg bg-[#1C2632] border border-[#A8B4C2]/15 text-xs font-mono">
            <span className="text-[#FFBF72] font-bold">{totals.key_metadata ?? 0}</span>
            <span className="text-[#A8B4C2] ml-1.5">Keys</span>
          </div>
        </div>
      </div>

      {/* 1. Cryptographic Assets Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-[#EAF0F6] uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-[#60F1D0]" />
            Cryptographic Assets
          </h2>
          <span className="text-[11px] font-mono text-[#A8B4C2]">Logical Assets Discovered</span>
        </div>

        <div className="panel overflow-hidden border-[#A8B4C2]/15 bg-[#151C25]">
          <table className="data-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Type</th>
                <th>Occurrences</th>
                <th>Detection Scope</th>
                <th>Context Mappings</th>
                <th>Migration Posture</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#A8B4C2]/10 text-xs">
              {assets.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[#A8B4C2]">No crypto assets discovered</td></tr>
              ) : assets.map((a: any) => {
                const paths = a.crypto_path_count || 0;
                const contextStr = paths > 0 
                  ? `${paths} Paths` + (a.context?.provider ? `, ${a.context.provider}` : "")
                  : (a.context?.provider || "—");

                return (
                  <tr
                    key={a.id}
                    className="hover:bg-[#1C2632] cursor-pointer transition-colors group"
                    onClick={() => router.push(`/projects/${projectId}/findings/${a.id}${cbom.scan_id ? `?scan_id=${cbom.scan_id}` : ""}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-mono font-semibold text-[#60F1D0] group-hover:text-[#60F1D0]">{a.name}</div>
                      <div className="text-[11px] text-[#A8B4C2] font-mono mt-0.5">{a.role}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#EAF0F6] capitalize">{a.asset_type || "—"}</td>
                    <td className="px-4 py-3 text-xs font-mono text-[#A8B4C2]">{a.evidence_count}</td>
                    <td className="px-4 py-3 text-xs text-[#A8B4C2]">Static AST Analysis</td>
                    <td className="px-4 py-3 text-xs font-mono text-[#EAF0F6]">{contextStr}</td>
                    <td className="px-4 py-3">
                      {a.analysis?.effort ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                          a.analysis.effort === "HIGH" ? "bg-[#FF7A90]/15 text-[#FF7A90] border border-[#FF7A90]/30" :
                          a.analysis.effort === "MEDIUM" ? "bg-[#FFBF72]/15 text-[#FFBF72] border border-[#FFBF72]/30" :
                          "bg-[#8B7CFF]/15 text-[#8B7CFF] border border-[#8B7CFF]/30"
                        }`}>
                          {a.analysis.effort} EFFORT
                        </span>
                      ) : (
                        <span className="text-xs text-[#A8B4C2]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Certificates Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-[#EAF0F6] uppercase tracking-wider flex items-center gap-2">
            <FileCode className="w-3.5 h-3.5 text-[#75B7FF]" />
            X.509 Certificates
          </h2>
          <span className="text-[11px] font-mono text-[#A8B4C2]">{certs.length} Discovered</span>
        </div>

        {certs.length === 0 ? (
          <div className="panel p-6 text-center text-[#A8B4C2] text-xs border-[#A8B4C2]/15 bg-[#151C25]/40">
            No X.509 certificates discovered in this scan.
          </div>
        ) : (
          <div className="panel overflow-hidden border-[#A8B4C2]/15 bg-[#151C25]">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Issuer</th>
                  <th>Algorithm</th>
                  <th>Key Size</th>
                  <th>Valid Until</th>
                  <th>Source File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#A8B4C2]/10 text-xs">
                {certs.map((c: any) => (
                  <tr key={c.id} className="hover:bg-[#1C2632] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[#EAF0F6]">{c.subject || "—"}</td>
                    <td className="px-4 py-3 text-xs text-[#A8B4C2]">{c.issuer || "—"}</td>
                    <td className="px-4 py-3"><AlgoBadge algo={c.public_key_algorithm} /></td>
                    <td className="px-4 py-3 text-xs font-mono text-[#A8B4C2]">{c.key_size ? `${c.key_size} bit` : "—"}</td>
                    <td className="px-4 py-3 text-xs font-mono text-[#EAF0F6]">
                      {c.valid_until ? new Date(c.valid_until).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-[#A8B4C2] truncate max-w-xs">{c.file_path}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Key Metadata Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-[#EAF0F6] uppercase tracking-wider flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-[#FFBF72]" />
            Key Context Metadata
          </h2>
          <span className="text-[11px] font-mono text-[#A8B4C2]">{keys.length} Contexts</span>
        </div>

        {keys.length === 0 ? (
          <div className="panel p-6 text-center text-[#A8B4C2] text-xs border-[#A8B4C2]/15 bg-[#151C25]/40">
            No key metadata declarations discovered in this scan.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {keys.map((k: any) => (
              <div key={k.id} className="panel p-4 bg-[#151C25] border-[#A8B4C2]/15 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-[#EAF0F6] text-xs">{k.key_id_name}</span>
                  <AlgoBadge algo={k.algorithm} />
                </div>
                <div className="text-[11px] text-[#A8B4C2] space-y-1 font-mono">
                  <div>Management: <span className="text-[#EAF0F6]">{k.key_type || "—"}</span></div>
                  <div>Rotation: <span className="text-[#60F1D0]">{k.rotation_state || "DECLARED"}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AssistantDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        projectId={projectId}
        scanId={scanId || cbom?.scan_id}
        entityType={activeEntity.type}
        entityId={activeEntity.id}
        initialQuestion={activeEntity.question}
      />
    </div>
  );
}
