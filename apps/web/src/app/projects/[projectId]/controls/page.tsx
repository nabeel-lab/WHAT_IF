"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  Activity,
  Bot,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Sliders
} from "lucide-react";
import AssistantDrawer from "@/components/investigation/AssistantDrawer";

export default function ControlsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const scanId = searchParams.get("scan_id");

  const [controls, setControls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Assistant Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedControl, setSelectedControl] = useState<any>(null);
  const [initialQuestion, setInitialQuestion] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    fetch(`${apiUrl}/projects/${projectId}/controls`)
      .then(res => {
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
      })
      .then(data => setControls(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  const openAssistant = (control: any, question: string) => {
    setSelectedControl(control);
    setInitialQuestion(question);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 relative">
      
      {/* ─── Header Console ─── */}
      <div className="border-b border-[#A8B4C2]/12 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#60F1D0] shadow-[0_0_8px_#60F1D0]" />
            <h1 className="text-xl font-bold text-[#EAF0F6] tracking-wide">
              Cryptographic Controls & Agility Policies
            </h1>
          </div>
          <p className="text-xs text-[#A8B4C2] mt-1 font-mono">
            Security controls, key encapsulation mechanisms, and algorithmic enforcement parameters across system assets.
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

      {/* ─── Four Structural Principles ─── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3.5 rounded-xl bg-[#151C25]/80 border border-[#A8B4C2]/15 space-y-1">
          <div className="text-[10px] text-[#60F1D0] font-bold uppercase">WHAT IS THIS?</div>
          <div className="text-[#EAF0F6] text-[11px] leading-relaxed">
            Technical security policies governing algorithm selection and encapsulation.
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#151C25]/80 border border-[#A8B4C2]/15 space-y-1">
          <div className="text-[10px] text-[#FF7A90] font-bold uppercase">WHY IT MATTERS</div>
          <div className="text-[#EAF0F6] text-[11px] leading-relaxed">
            Without crypto-agility wrappers, swapping an algorithm requires rewriting call sites.
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#151C25]/80 border border-[#A8B4C2]/15 space-y-1">
          <div className="text-[10px] text-[#8B7CFF] font-bold uppercase">WHAT CONNECTS?</div>
          <div className="text-[#EAF0F6] text-[11px] leading-relaxed">
            Enforces policy bounds over cryptographic assets and transit routes.
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#151C25]/80 border border-[#A8B4C2]/15 space-y-1">
          <div className="text-[10px] text-[#FFBF72] font-bold uppercase">EVIDENCE BASE</div>
          <div className="text-[#EAF0F6] text-[11px] leading-relaxed">
            Derived from crypto.yaml policies, CI enforcement gates, and AST checks.
          </div>
        </div>
      </div>

      {/* ─── Controls Inventory List ─── */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-xs font-mono text-[#A8B4C2] gap-2">
          <span className="w-2 h-2 rounded-full bg-[#60F1D0] animate-ping" />
          <span>Auditing cryptographic control policies...</span>
        </div>
      ) : error ? (
        <div className="p-5 glass-raised border border-[#FF7A90]/30 rounded-2xl text-xs font-mono text-[#FF7A90]">
          {error}
        </div>
      ) : controls.length === 0 ? (
        <div className="glass-surface p-12 text-center text-xs font-mono text-[#A8B4C2] rounded-2xl border-dashed border-[#A8B4C2]/20">
          No cryptographic control policies declared. Configure <code>crypto.yaml</code> to establish governance enforcement.
        </div>
      ) : (
        <div className="space-y-4">
          {controls.map((c, idx) => {
            const isEnforced = c.status === "ACTIVE" || c.status === "ENFORCED" || !c.mismatch;
            return (
              <div
                key={c.id || idx}
                className="glass-surface p-5 rounded-2xl border border-[#A8B4C2]/15 space-y-4 hover:border-[#60F1D0]/30 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#A8B4C2]/10 pb-3">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-[#60F1D0] shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold font-mono text-[#EAF0F6]">{c.name || "Cryptographic Control"}</span>
                        <span className={`badge ${isEnforced ? "badge-success" : "badge-mismatch"}`}>
                          {isEnforced ? "POLICY ENFORCED" : "MISMATCH DETECTED"}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-[#A8B4C2] mt-0.5">
                        Type: {c.control_type || "Algorithmic Guardrail"} · Target: {c.target_asset || "All Primitives"}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => openAssistant(c, `Explain cryptographic control '${c.name}' and whether it is compliant with PQC`)}
                    className="btn-ghost text-xs px-2.5 py-1.5 border border-[#A8B4C2]/15 hover:border-[#60F1D0]/30 flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <Bot className="w-3.5 h-3.5 text-[#60F1D0]" />
                    <span>Explain Policy</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-[#0B0F14]/70 border border-[#A8B4C2]/10 space-y-1">
                    <span className="text-[10px] text-[#A8B4C2] uppercase">ENCAPSULATION MODE</span>
                    <div className="font-bold text-[#60F1D0]">{c.encapsulation || "Standard Wrapper"}</div>
                    <div className="text-[11px] text-[#A8B4C2]">Provider Abstraction</div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0B0F14]/70 border border-[#A8B4C2]/10 space-y-1">
                    <span className="text-[10px] text-[#A8B4C2] uppercase">MINIMUM KEY LENGTH</span>
                    <div className="font-bold text-[#8B7CFF]">{c.min_key_size || "2048-bit / 256-bit"}</div>
                    <div className="text-[11px] text-[#A8B4C2]">Enforcement Constraint</div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0B0F14]/70 border border-[#A8B4C2]/10 space-y-1">
                    <span className="text-[10px] text-[#A8B4C2] uppercase">PQC READINESS</span>
                    <div className="font-bold text-[#E8A1FF]">FIPS 203 Pending</div>
                    <div className="text-[11px] text-[#A8B4C2]">ML-KEM Upgrade Planned</div>
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
        entityType="CONTROL"
        entityId={selectedControl?.id}
        entityTitle={selectedControl?.name}
        initialQuestion={initialQuestion}
      />

    </div>
  );
}
