"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Download,
  FileText,
  ArrowRight,
  Shield,
  Key,
  FileCode,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Bot
} from "lucide-react";
import AssistantDrawer from "@/components/investigation/AssistantDrawer";

export default function CBOMPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const scanId = searchParams.get("scan_id");

  const [cbom, setCbom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ASSETS" | "CERTS" | "KEYS" | "JSON">("ASSETS");
  const [copied, setCopied] = useState(false);

  // Assistant Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeEntity, setActiveEntity] = useState<{ id?: string; type?: string; question?: string }>({});

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const askAssistant = (type: string, id: string, question: string) => {
    setActiveEntity({ type, id, question });
    setDrawerOpen(true);
  };

  useEffect(() => {
    const url = scanId
      ? `${apiUrl}/projects/${projectId}/cbom?scan_id=${scanId}`
      : `${apiUrl}/projects/${projectId}/cbom`;

    fetch(url)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d) setCbom(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId, scanId]);

  const handleCopyJSON = () => {
    if (!cbom) return;
    navigator.clipboard.writeText(JSON.stringify(cbom, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJSON = () => {
    if (!cbom) return;
    const blob = new Blob([JSON.stringify(cbom, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cbom-cyclonedx-${scanId || "latest"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-xs font-mono text-[#A8B4C2] gap-2">
        <span className="w-2 h-2 rounded-full bg-[#60F1D0] animate-ping" />
        <span>Compiling CycloneDX 1.6 Cryptographic Bill of Materials...</span>
      </div>
    );
  }

  if (!cbom?.scan_id && !cbom?.sections) {
    return (
      <div className="glass-surface p-12 text-center space-y-3 rounded-2xl border-dashed border-[#A8B4C2]/20 max-w-xl mx-auto font-mono text-xs">
        <div className="text-[#EAF0F6] font-bold">No completed scan found to generate CBOM artifact.</div>
        <p className="text-[#A8B4C2]">Execute an automated scan to construct the formal cryptographic bill of materials.</p>
        <Link
          href={`/projects/${projectId}/scans/new`}
          className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-1.5 mt-2"
        >
          <span>Launch Scan →</span>
        </Link>
      </div>
    );
  }

  const assets: any[] = cbom.sections?.crypto_assets || [];
  const certs: any[] = cbom.sections?.certificates || [];
  const keys: any[] = cbom.sections?.key_metadata || [];
  const totals = cbom.totals || {
    crypto_assets: assets.length,
    certificates: certs.length,
    key_metadata: keys.length,
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 font-mono text-xs relative">
      
      {/* ─── Header & Export Controls ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#A8B4C2]/12 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#60F1D0] shadow-[0_0_8px_#60F1D0]" />
            <h1 className="text-xl font-bold text-[#EAF0F6] tracking-wide">
              Cryptographic Bill of Materials (CBOM)
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-[#60F1D0]/10 text-[#60F1D0] border border-[#60F1D0]/25 text-[10px] font-bold">
              CycloneDX 1.6 Compliant
            </span>
          </div>
          <p className="text-[#A8B4C2] mt-1 text-xs">
            Deterministic, audit-ready cryptographic bill of materials documenting primitives, key wrappers, and certificates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyJSON}
            className="btn-ghost text-xs px-3 py-1.5 border border-[#A8B4C2]/15 flex items-center gap-1.5 hover:border-[#60F1D0]/30"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#60F1D0]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied JSON" : "Copy CBOM"}</span>
          </button>

          <button
            onClick={handleDownloadJSON}
            className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CycloneDX JSON</span>
          </button>
        </div>
      </div>

      {/* ─── CBOM Spec Metadata Bar ─── */}
      <div className="glass-surface p-4 rounded-xl border border-[#A8B4C2]/15 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <span className="text-[10px] text-[#A8B4C2] uppercase block">CBOM SERIAL NUMBER</span>
            <span className="text-[#EAF0F6] font-bold">urn:uuid:{cbom.serial_number || cbom.scan_id}</span>
          </div>
          <div className="h-6 w-px bg-[#A8B4C2]/15 hidden sm:block" />
          <div>
            <span className="text-[10px] text-[#A8B4C2] uppercase block">SPECIFICATION</span>
            <span className="text-[#60F1D0] font-bold">CycloneDX 1.6-CBOM</span>
          </div>
          <div className="h-6 w-px bg-[#A8B4C2]/15 hidden sm:block" />
          <div>
            <span className="text-[10px] text-[#A8B4C2] uppercase block">TARGET COMMIT</span>
            <span className="text-[#EAF0F6] font-bold">{cbom.commit_sha?.slice(0, 10) || "HEAD"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge badge-success">DETERMINISTIC COMPILATION</span>
        </div>
      </div>

      {/* ─── Navigation Tabs ─── */}
      <div className="flex items-center gap-2 border-b border-[#A8B4C2]/12 pb-1">
        <button
          onClick={() => setActiveTab("ASSETS")}
          className={`px-4 py-2 rounded-t-xl font-bold transition-all ${
            activeTab === "ASSETS"
              ? "bg-[#1C2632] text-[#60F1D0] border-t border-x border-[#60F1D0]/30 shadow"
              : "text-[#A8B4C2] hover:text-[#EAF0F6]"
          }`}
        >
          Cryptographic Assets ({totals.crypto_assets ?? assets.length})
        </button>

        <button
          onClick={() => setActiveTab("CERTS")}
          className={`px-4 py-2 rounded-t-xl font-bold transition-all ${
            activeTab === "CERTS"
              ? "bg-[#1C2632] text-[#75B7FF] border-t border-x border-[#75B7FF]/30 shadow"
              : "text-[#A8B4C2] hover:text-[#EAF0F6]"
          }`}
        >
          Certificates ({totals.certificates ?? certs.length})
        </button>

        <button
          onClick={() => setActiveTab("KEYS")}
          className={`px-4 py-2 rounded-t-xl font-bold transition-all ${
            activeTab === "KEYS"
              ? "bg-[#1C2632] text-[#FFBF72] border-t border-x border-[#FFBF72]/30 shadow"
              : "text-[#A8B4C2] hover:text-[#EAF0F6]"
          }`}
        >
          Key Metadata ({totals.key_metadata ?? keys.length})
        </button>

        <button
          onClick={() => setActiveTab("JSON")}
          className={`px-4 py-2 rounded-t-xl font-bold transition-all ${
            activeTab === "JSON"
              ? "bg-[#1C2632] text-[#E8A1FF] border-t border-x border-[#E8A1FF]/30 shadow"
              : "text-[#A8B4C2] hover:text-[#EAF0F6]"
          }`}
        >
          Raw CycloneDX Artifact
        </button>
      </div>

      {/* ─── Tab Content ─── */}
      {activeTab === "ASSETS" && (
        <div className="space-y-4">
          {assets.map((asset: any, idx: number) => (
            <div
              key={asset.id || idx}
              className="glass-surface p-5 rounded-2xl border border-[#A8B4C2]/15 space-y-3 hover:border-[#60F1D0]/30 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#A8B4C2]/10 pb-3">
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-[#60F1D0] shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#EAF0F6]">{asset.algorithm || asset.name}</span>
                      <span className="badge badge-neutral">{asset.role || "GENERAL"}</span>
                      {asset.quantum_safe ? (
                        <span className="badge badge-success">PQC RESISTANT</span>
                      ) : (
                        <span className="badge badge-danger">CLASSICAL / BREAKABLE</span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#A8B4C2] mt-0.5">
                      Library: <span className="text-[#60F1D0]">{asset.library || "Native Primitives"}</span> · Primitive Type: <span className="text-[#EAF0F6]">{asset.primitive_type || "Asymmetric Encryption"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => askAssistant("CRYPTO_ASSET", asset.id, `Explain CBOM asset '${asset.algorithm || asset.name}'`)}
                    className="btn-ghost text-xs px-2.5 py-1.5 border border-[#A8B4C2]/15 hover:border-[#60F1D0]/30 flex items-center gap-1"
                  >
                    <Bot className="w-3.5 h-3.5 text-[#60F1D0]" />
                    <span>Explain Asset</span>
                  </button>

                  <Link
                    href={`/projects/${projectId}/findings/${asset.id}${scanId ? `?scan_id=${scanId}` : ""}`}
                    className="btn-ghost text-xs px-2.5 py-1.5 text-[#60F1D0] hover:bg-[#60F1D0]/10 flex items-center gap-1"
                  >
                    <span>Inspect Record</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#0B0F14]/70 border border-[#A8B4C2]/10 space-y-1">
                  <span className="text-[10px] text-[#A8B4C2] uppercase">KEY SIZE / CURVE</span>
                  <div className="font-bold text-[#EAF0F6]">{asset.key_size ? `${asset.key_size}-bit` : "Standard Parameter"}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0B0F14]/70 border border-[#A8B4C2]/10 space-y-1">
                  <span className="text-[10px] text-[#A8B4C2] uppercase">NIST MIGRATION TARGET</span>
                  <div className="font-bold text-[#60F1D0]">{asset.migration_target || "ML-KEM-768"}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0B0F14]/70 border border-[#A8B4C2]/10 space-y-1">
                  <span className="text-[10px] text-[#A8B4C2] uppercase">FILE OCCURRENCES</span>
                  <div className="font-bold text-[#8B7CFF]">{asset.occurrences_count || 1} Occurrences</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "CERTS" && (
        <div className="space-y-4">
          {certs.length === 0 ? (
            <div className="glass-surface p-12 text-center text-[#A8B4C2] rounded-2xl border-dashed border-[#A8B4C2]/20">
              No X.509 certificates detected in target source or binary headers.
            </div>
          ) : (
            certs.map((c: any, i: number) => (
              <div key={i} className="glass-surface p-5 rounded-2xl border border-[#A8B4C2]/15 space-y-2">
                <div className="text-sm font-bold text-[#EAF0F6]">{c.subject || `Certificate #${i + 1}`}</div>
                <div className="text-[#A8B4C2]">Issuer: {c.issuer || "Self-Signed / Internal CA"}</div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "KEYS" && (
        <div className="space-y-4">
          {keys.map((k: any, i: number) => (
            <div key={i} className="glass-surface p-5 rounded-2xl border border-[#A8B4C2]/15 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#FFBF72]">{k.name || `Key #${i + 1}`}</span>
                <span className="badge badge-key">{k.key_type || "KMS Key"}</span>
              </div>
              <div className="text-[#A8B4C2]">Rotation: {k.rotation || "Annual Policy"} · Scope: {k.scope || "Service Partition"}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "JSON" && (
        <div className="rounded-2xl border border-[#A8B4C2]/15 bg-[#0B0F14] p-4 overflow-x-auto shadow-2xl">
          <pre className="text-[11px] text-[#60F1D0]">
            <code>{JSON.stringify(cbom, null, 2)}</code>
          </pre>
        </div>
      )}

      {/* Embedded Contextual Assistant */}
      <AssistantDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        projectId={projectId}
        scanId={scanId || undefined}
        entityType={activeEntity.type}
        entityId={activeEntity.id}
        initialQuestion={activeEntity.question}
      />

    </div>
  );
}
