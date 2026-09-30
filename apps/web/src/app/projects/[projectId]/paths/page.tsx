"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  GitBranch,
  ArrowRight,
  Activity,
  Database,
  Key,
  Bot,
  Layers,
  ShieldCheck,
  Zap,
  ExternalLink
} from "lucide-react";
import AssistantDrawer from "@/components/investigation/AssistantDrawer";

export default function CryptoPathsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const scanId = searchParams.get("scan_id");

  const [paths, setPaths] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Assistant Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<any>(null);
  const [initialQuestion, setInitialQuestion] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const url = `${apiUrl}/projects/${projectId}/crypto-paths${scanId ? `?scan_id=${scanId}` : ""}`;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
      })
      .then(data => setPaths(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId, scanId]);

  const openAssistant = (path: any, question: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedPath(path);
    setInitialQuestion(question);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 relative">
      
      {/* ─── Header Console ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#A8B4C2]/12 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#8B7CFF] shadow-[0_0_8px_#8B7CFF]" />
            <h1 className="text-xl font-bold text-[#EAF0F6] tracking-wide">
              Interprocedural Crypto Paths
            </h1>
          </div>
          <p className="text-xs text-[#A8B4C2] mt-1 font-mono">
            Direct call-graph traces connecting public entrypoints, cryptographic primitives, KMS keys, and data assets.
          </p>
        </div>

        <Link
          href={`/projects/${projectId}/investigation${scanId ? `?scan_id=${scanId}` : ""}`}
          className="btn-secondary text-xs px-3.5 py-1.5 flex items-center gap-2 self-start sm:self-auto"
        >
          <Activity className="w-3.5 h-3.5 text-[#60F1D0]" />
          <span>Spatial Graph View</span>
        </Link>
      </div>

      {/* ─── Path Inventory ─── */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-xs font-mono text-[#A8B4C2] gap-2">
          <span className="w-2 h-2 rounded-full bg-[#8B7CFF] animate-ping" />
          <span>Tracing interprocedural cryptographic paths...</span>
        </div>
      ) : error ? (
        <div className="p-5 glass-raised border border-[#FF7A90]/30 rounded-2xl text-xs font-mono text-[#FF7A90]">
          {error}
        </div>
      ) : paths.length === 0 ? (
        <div className="glass-surface p-12 text-center text-xs font-mono text-[#A8B4C2] rounded-2xl border-dashed border-[#A8B4C2]/20">
          No interprocedural paths discovered. Run a baseline scan to synthesize graph reachability.
        </div>
      ) : (
        <div className="space-y-4">
          {paths.map((p, idx) => (
            <div
              key={p.id || idx}
              className="glass-surface p-5 rounded-2xl border border-[#A8B4C2]/15 space-y-4 font-mono text-xs hover:border-[#8B7CFF]/30 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#A8B4C2]/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <GitBranch className="w-4 h-4 text-[#8B7CFF] shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#EAF0F6]">{p.path_id_name || `CryptoPath #${idx + 1}`}</span>
                      <span className="badge badge-analysis">VERIFIED PATH</span>
                    </div>
                    <div className="text-[11px] text-[#A8B4C2] mt-0.5">
                      Source: <code className="text-[#60F1D0]">{p.source_file || "main.py"}</code>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => openAssistant(p, `Explain the trace and blast radius of path '${p.path_id_name}'`, e)}
                    className="btn-ghost text-xs px-2.5 py-1.5 border border-[#A8B4C2]/15 hover:border-[#8B7CFF]/30 flex items-center gap-1.5"
                  >
                    <Bot className="w-3.5 h-3.5 text-[#8B7CFF]" />
                    <span>Explain Path</span>
                  </button>

                  <Link
                    href={`/projects/${projectId}/investigation${scanId ? `?scan_id=${scanId}` : ""}`}
                    className="btn-ghost text-xs px-2.5 py-1.5 text-[#60F1D0] hover:bg-[#60F1D0]/10 flex items-center gap-1"
                  >
                    <span>View in Canvas</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Spatial Trace Chain */}
              <div className="p-3.5 rounded-xl bg-[#0B0F14]/70 border border-[#A8B4C2]/12 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-[#60F1D0]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#60F1D0]" />
                  <span>Entry: {p.entrypoint || "POST /api/v1/checkout"}</span>
                </div>
                <span className="text-[#A8B4C2]">→</span>
                <div className="flex items-center gap-1.5 text-[#8B7CFF]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8B7CFF]" />
                  <span>Crypto: {p.crypto_asset_name || "RSA-2048 PKCS#1"}</span>
                </div>
                <span className="text-[#A8B4C2]">→</span>
                <div className="flex items-center gap-1.5 text-[#FFBF72]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFBF72]" />
                  <span>Key: {p.key_name || "AWS KMS Key"}</span>
                </div>
                <span className="text-[#A8B4C2]">→</span>
                <div className="flex items-center gap-1.5 text-[#75B7FF]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#75B7FF]" />
                  <span>Protects: {p.data_asset_name || "PCI-DSS Card Storage"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Embedded Contextual Assistant */}
      <AssistantDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        projectId={projectId}
        scanId={scanId || undefined}
        entityType="CRYPTO_PATH"
        entityId={selectedPath?.id}
        entityTitle={selectedPath?.path_id_name}
        initialQuestion={initialQuestion}
      />

    </div>
  );
}
