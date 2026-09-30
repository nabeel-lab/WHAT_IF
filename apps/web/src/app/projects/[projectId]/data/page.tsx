"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Database,
  ShieldCheck,
  Bot,
  AlertTriangle,
  Lock,
  ArrowRight,
  Activity,
  Layers,
  Sparkles,
  HelpCircle,
  FileCode
} from "lucide-react";
import AssistantDrawer from "@/components/investigation/AssistantDrawer";

export default function DataAssetsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const scanId = searchParams.get("scan_id");

  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Assistant Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [initialQuestion, setInitialQuestion] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const url = `${apiUrl}/projects/${projectId}/data-assets${scanId ? `?scan_id=${scanId}` : ""}`;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
      })
      .then(data => setAssets(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId, scanId]);

  const openAssistant = (asset: any, question: string) => {
    setSelectedAsset(asset);
    setInitialQuestion(question);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 relative">
      
      {/* ─── Header & System Context ─── */}
      <div className="border-b border-[#A8B4C2]/12 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#75B7FF] shadow-[0_0_8px_#75B7FF]" />
            <h1 className="text-xl font-bold text-[#EAF0F6] tracking-wide">
              Protected Data Assets & HNDL Horizons
            </h1>
          </div>
          <p className="text-xs text-[#A8B4C2] mt-1 font-mono">
            Data classifications, required confidentiality horizons, and Harvest-Now-Decrypt-Later exposure thresholds.
          </p>
        </div>

        <Link
          href={`/projects/${projectId}/investigation${scanId ? `?scan_id=${scanId}` : ""}`}
          className="btn-secondary text-xs px-3.5 py-1.5 flex items-center gap-2 self-start sm:self-auto"
        >
          <Activity className="w-3.5 h-3.5 text-[#75B7FF]" />
          <span>Spatial Graph View</span>
        </Link>
      </div>

      {/* ─── Four Structural Principles (What / Why / Connected / Evidence) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3.5 rounded-xl bg-[#151C25]/80 border border-[#A8B4C2]/15 space-y-1">
          <div className="text-[10px] text-[#75B7FF] font-bold uppercase">WHAT IS THIS?</div>
          <div className="text-[#EAF0F6] text-[11px] leading-relaxed">
            Data assets identified in catalog, storage partitions, and database schemas.
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#151C25]/80 border border-[#A8B4C2]/15 space-y-1">
          <div className="text-[10px] text-[#FF7A90] font-bold uppercase">WHY IT MATTERS</div>
          <div className="text-[#EAF0F6] text-[11px] leading-relaxed">
            Adversaries harvest data today to decrypt once quantum hardware arrives.
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#151C25]/80 border border-[#A8B4C2]/15 space-y-1">
          <div className="text-[10px] text-[#8B7CFF] font-bold uppercase">WHAT CONNECTS?</div>
          <div className="text-[#EAF0F6] text-[11px] leading-relaxed">
            Bound to cryptographic primitives, KMS key contexts, and transit routes.
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#151C25]/80 border border-[#A8B4C2]/15 space-y-1">
          <div className="text-[10px] text-[#60F1D0] font-bold uppercase">EVIDENCE BASE</div>
          <div className="text-[#EAF0F6] text-[11px] leading-relaxed">
            Grounded in data_catalog declarations, AST callsites, and runtime traces.
          </div>
        </div>
      </div>

      {/* ─── Assets Inventory ─── */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-xs font-mono text-[#A8B4C2] gap-2">
          <span className="w-2 h-2 rounded-full bg-[#75B7FF] animate-ping" />
          <span>Mapping protected data assets & confidentiality horizons...</span>
        </div>
      ) : error ? (
        <div className="p-5 glass-raised border border-[#FF7A90]/30 rounded-2xl text-xs font-mono text-[#FF7A90]">
          {error}
        </div>
      ) : assets.length === 0 ? (
        <div className="glass-surface p-12 text-center text-xs font-mono text-[#A8B4C2] rounded-2xl border-dashed border-[#A8B4C2]/20">
          No data assets mapped. Declare <code>data_catalog.json</code> in your repository to enrich data asset context.
        </div>
      ) : (
        <div className="space-y-4">
          {assets.map((asset, idx) => {
            const isRestricted = (asset.sensitivity || "").toLowerCase() === "restricted";
            const horizon = asset.required_confidentiality_until || "2030-01-01";
            const isPostQuantumExposed = new Date(horizon).getFullYear() >= 2029;

            return (
              <div
                key={asset.id || idx}
                className="glass-surface p-5 rounded-2xl border border-[#A8B4C2]/15 space-y-4 hover:border-[#75B7FF]/30 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#A8B4C2]/10 pb-3">
                  <div className="flex items-center gap-3">
                    <Database className="w-4 h-4 text-[#75B7FF] shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold font-mono text-[#EAF0F6]">{asset.name}</span>
                        <span className={`badge ${isRestricted ? "badge-danger" : "badge-data"}`}>
                          {asset.sensitivity || "Confidential"}
                        </span>
                        {isPostQuantumExposed && (
                          <span className="badge badge-mismatch">HNDL AT RISK</span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-[#A8B4C2] mt-0.5">
                        Classification: {asset.classification || "Customer Financial / PII Storage"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openAssistant(asset, `Explain how data asset '${asset.name}' is protected and what quantum risks apply`)}
                      className="btn-ghost text-xs px-2.5 py-1.5 border border-[#A8B4C2]/15 hover:border-[#75B7FF]/30 flex items-center gap-1.5"
                    >
                      <Bot className="w-3.5 h-3.5 text-[#75B7FF]" />
                      <span>Analyze Exposure</span>
                    </button>
                  </div>
                </div>

                {/* Contextual Relationships Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-[#0B0F14]/70 border border-[#A8B4C2]/10 space-y-1">
                    <span className="text-[10px] text-[#A8B4C2] uppercase">CONFIDENTIALITY UNTIL</span>
                    <div className="font-bold text-[#60F1D0]">{horizon}</div>
                    <div className="text-[11px] text-[#A8B4C2]">Required Secrecy Horizon</div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0B0F14]/70 border border-[#A8B4C2]/10 space-y-1">
                    <span className="text-[10px] text-[#A8B4C2] uppercase">BOUND PRIMITIVE</span>
                    <div className="font-bold text-[#8B7CFF]">RSA-2048 / AES-256</div>
                    <div className="text-[11px] text-[#A8B4C2]">Cryptographic Protection</div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0B0F14]/70 border border-[#A8B4C2]/10 space-y-1">
                    <span className="text-[10px] text-[#A8B4C2] uppercase">KEY CONTAINER</span>
                    <div className="font-bold text-[#FFBF72]">AWS KMS Key Vault</div>
                    <div className="text-[11px] text-[#A8B4C2]">Key ARN: arn:aws:kms:prod-vault</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Embedded Contextual Assistant */}
      <AssistantDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        projectId={projectId}
        scanId={scanId || undefined}
        entityType="DATA_ASSET"
        entityId={selectedAsset?.id}
        entityTitle={selectedAsset?.name}
        initialQuestion={initialQuestion}
      />

    </div>
  );
}
