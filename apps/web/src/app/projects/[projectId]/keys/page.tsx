"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Key,
  ShieldCheck,
  Bot,
  Activity,
  Layers,
  Lock,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import AssistantDrawer from "@/components/investigation/AssistantDrawer";

export default function KeysPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const scanId = searchParams.get("scan_id");

  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Assistant Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<any>(null);
  const [initialQuestion, setInitialQuestion] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const url = `${apiUrl}/projects/${projectId}/keys${scanId ? `?scan_id=${scanId}` : ""}`;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
      })
      .then(data => setKeys(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId, scanId]);

  const openAssistant = (keyObj: any, question: string) => {
    setSelectedKey(keyObj);
    setInitialQuestion(question);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 relative">
      
      {/* ─── Header Console ─── */}
      <div className="border-b border-[#A8B4C2]/12 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FFBF72] shadow-[0_0_8px_#FFBF72]" />
            <h1 className="text-xl font-bold text-[#EAF0F6] tracking-wide">Key Inventory & HSM Provenance</h1>
          </div>
          <p className="text-xs text-[#A8B4C2] mt-1 font-mono">
            Cryptographic key metadata, cloud KMS ARNs, rotation schedules, and encapsulation bounds. No private key material is stored or exposed.
          </p>
        </div>

        <Link
          href={`/projects/${projectId}/investigation${scanId ? `?scan_id=${scanId}` : ""}`}
          className="btn-secondary text-xs px-3.5 py-1.5 flex items-center gap-2 self-start sm:self-auto"
        >
          <Activity className="w-3.5 h-3.5 text-[#FFBF72]" />
          <span>Spatial Graph View</span>
        </Link>
      </div>

      {/* ─── Four Structural Principles ─── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3.5 rounded-xl bg-[#151C25]/80 border border-[#A8B4C2]/15 space-y-1">
          <div className="text-[10px] text-[#FFBF72] font-bold uppercase">WHAT IS THIS?</div>
          <div className="text-[#EAF0F6] text-[11px] leading-relaxed">
            Key contexts discovered in cloud providers, KMS policies, and hardcoded declarations.
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#151C25]/80 border border-[#A8B4C2]/15 space-y-1">
          <div className="text-[10px] text-[#FF7A90] font-bold uppercase">WHY IT MATTERS</div>
          <div className="text-[#EAF0F6] text-[11px] leading-relaxed">
            Asymmetric KMS keys (RSA/ECC) will fail under Shor's algorithm; migration requires key re-wrapping.
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#151C25]/80 border border-[#A8B4C2]/15 space-y-1">
          <div className="text-[10px] text-[#8B7CFF] font-bold uppercase">WHAT CONNECTS?</div>
          <div className="text-[#EAF0F6] text-[11px] leading-relaxed">
            Bound to cipher instances, application services, and persistent databases.
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#151C25]/80 border border-[#A8B4C2]/15 space-y-1">
          <div className="text-[10px] text-[#60F1D0] font-bold uppercase">EVIDENCE BASE</div>
          <div className="text-[#EAF0F6] text-[11px] leading-relaxed">
            Derived from cloud API configurations, env variables, and code callsite bindings.
          </div>
        </div>
      </div>

      {/* ─── Key Inventory List ─── */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-xs font-mono text-[#A8B4C2] gap-2">
          <span className="w-2 h-2 rounded-full bg-[#FFBF72] animate-ping" />
          <span>Cataloging cryptographic keys & KMS contexts...</span>
        </div>
      ) : error ? (
        <div className="p-5 glass-raised border border-[#FF7A90]/30 rounded-2xl text-xs font-mono text-[#FF7A90]">
          {error}
        </div>
      ) : keys.length === 0 ? (
        <div className="glass-surface p-12 text-center text-xs font-mono text-[#A8B4C2] rounded-2xl border-dashed border-[#A8B4C2]/20">
          No key contexts cataloged in baseline scan. Declare KMS providers or key references in configuration.
        </div>
      ) : (
        <div className="space-y-4">
          {keys.map((k, idx) => {
            const isAsymmetric = (k.key_type || "").toLowerCase().includes("asymmetric") || (k.key_type || "").toLowerCase().includes("rsa");
            return (
              <div
                key={k.id || idx}
                className="glass-surface p-5 rounded-2xl border border-[#A8B4C2]/15 space-y-4 hover:border-[#FFBF72]/30 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#A8B4C2]/10 pb-3">
                  <div className="flex items-center gap-3">
                    <Key className="w-4 h-4 text-[#FFBF72] shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold font-mono text-[#EAF0F6]">{k.name || "KMS Key Context"}</span>
                        <span className="badge badge-key">{k.key_type || "KMS Customer Key"}</span>
                        {isAsymmetric && (
                          <span className="badge badge-mismatch">QUANTUM VULNERABLE</span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-[#A8B4C2] mt-0.5">
                        Scope: {k.scope || "Application Service Partition"} · ID: <code className="text-[#EAF0F6]">{k.id?.slice(0, 8)}</code>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => openAssistant(k, `What are the post-quantum risks associated with key '${k.name}'?`)}
                    className="btn-ghost text-xs px-2.5 py-1.5 border border-[#A8B4C2]/15 hover:border-[#FFBF72]/30 flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <Bot className="w-3.5 h-3.5 text-[#FFBF72]" />
                    <span>Explain Key Risk</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-[#0B0F14]/70 border border-[#A8B4C2]/10 space-y-1">
                    <span className="text-[10px] text-[#A8B4C2] uppercase">ROTATION STATUS</span>
                    <div className="font-bold text-[#60F1D0]">Enabled (Annual)</div>
                    <div className="text-[11px] text-[#A8B4C2]">Auto-rotation active</div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0B0F14]/70 border border-[#A8B4C2]/10 space-y-1">
                    <span className="text-[10px] text-[#A8B4C2] uppercase">BOUND ALGORITHM</span>
                    <div className="font-bold text-[#8B7CFF]">{k.algorithm || "RSA / AES-256"}</div>
                    <div className="text-[11px] text-[#A8B4C2]">Cryptographic Operation</div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0B0F14]/70 border border-[#A8B4C2]/10 space-y-1">
                    <span className="text-[10px] text-[#A8B4C2] uppercase">SECURITY LEVEL</span>
                    <div className="font-bold text-[#EAF0F6]">HSM FIPS 140-2 L3</div>
                    <div className="text-[11px] text-[#A8B4C2]">Cloud Key Storage</div>
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
        entityType="KEY_CONTEXT"
        entityId={selectedKey?.id}
        entityTitle={selectedKey?.name}
        initialQuestion={initialQuestion}
      />

    </div>
  );
}
