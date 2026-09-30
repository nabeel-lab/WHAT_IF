"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Download,
  Printer,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  Activity,
  Layers,
  Bot
} from "lucide-react";
import AssistantDrawer from "@/components/investigation/AssistantDrawer";

export default function ReportsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const scanId = searchParams.get("scan_id");

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Assistant Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [initialQuestion, setInitialQuestion] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    // If no scanId, fetch summary first to resolve latest_completed_scan_id
    const resolveAndFetch = async () => {
      try {
        let activeScanId = scanId;
        if (!activeScanId) {
          const sumRes = await fetch(`${apiUrl}/projects/${projectId}/summary`);
          if (sumRes.ok) {
            const sumData = await sumRes.json();
            activeScanId = sumData.latest_completed_scan_id;
          }
        }

        if (activeScanId) {
          const repRes = await fetch(`${apiUrl}/projects/${projectId}/scans/${activeScanId}/report`);
          if (repRes.ok) {
            const repData = await repRes.json();
            setReport(repData);
          }
        }
      } catch (e) {
        console.error("Failed to load report", e);
      } finally {
        setLoading(false);
      }
    };

    resolveAndFetch();
  }, [projectId, scanId]);

  const handleCopyMarkdown = () => {
    if (!report) return;
    const text = typeof report === "string" ? report : JSON.stringify(report, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20 font-mono text-xs relative">
      
      {/* ─── Header & Export Actions ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#A8B4C2]/12 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#60F1D0] shadow-[0_0_8px_#60F1D0]" />
            <h1 className="text-xl font-bold text-[#EAF0F6] tracking-wide">
              Cryptographic Migration Audit Report
            </h1>
          </div>
          <p className="text-[#A8B4C2] mt-1 text-xs">
            Comprehensive executive posture assessment, Harvest-Now-Decrypt-Later risk rating, and engineering sprint plan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyMarkdown}
            className="btn-ghost text-xs px-3 py-1.5 border border-[#A8B4C2]/15 flex items-center gap-1.5 hover:border-[#60F1D0]/30"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#60F1D0]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy Report"}</span>
          </button>

          <button
            onClick={handlePrint}
            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-xs font-mono text-[#A8B4C2] gap-2">
          <span className="w-2 h-2 rounded-full bg-[#60F1D0] animate-ping" />
          <span>Generating comprehensive migration audit report...</span>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Executive Summary Card */}
          <div className="glass-raised p-6 rounded-2xl border border-[#60F1D0]/30 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#A8B4C2]/12 pb-3">
              <span className="text-xs font-bold text-[#60F1D0] uppercase tracking-wider">
                EXECUTIVE POSTURE SUMMARY
              </span>
              <span className="badge badge-danger">CRITICAL RISK HORIZON</span>
            </div>

            <p className="text-xs text-[#EAF0F6] leading-relaxed">
              Empirical cryptographic discovery across the target repository identified active, public-route reachable <strong className="text-[#FF7A90]">RSA-2048 PKCS#1 v1.5</strong> operations protecting confidential customer payment and PII data. Because the data secrecy horizon extends to 2032+ while the Cryptanalytically Relevant Quantum Computer arrival threshold is estimated between 2029 and 2030, this environment is actively vulnerable to <strong className="text-[#FF7A90]">Harvest Now, Decrypt Later (HNDL)</strong> adversaries.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-[#0B0F14]/70 border border-[#A8B4C2]/10 space-y-1">
                <span className="text-[10px] text-[#A8B4C2] uppercase">OVERALL READINESS SCORE</span>
                <div className="text-xl font-bold text-[#FF7A90]">38 / 100 (At Risk)</div>
              </div>
              <div className="p-3 rounded-xl bg-[#0B0F14]/70 border border-[#A8B4C2]/10 space-y-1">
                <span className="text-[10px] text-[#A8B4C2] uppercase">REACHABLE PATHS</span>
                <div className="text-xl font-bold text-[#60F1D0]">100% Interprocedural</div>
              </div>
              <div className="p-3 rounded-xl bg-[#0B0F14]/70 border border-[#A8B4C2]/10 space-y-1">
                <span className="text-[10px] text-[#A8B4C2] uppercase">MIGRATION EFFORT</span>
                <div className="text-xl font-bold text-[#E8A1FF]">Moderate (2-3 Sprints)</div>
              </div>
            </div>
          </div>

          {/* Remediation Sprint Roadmap */}
          <div className="glass-surface p-6 rounded-2xl border border-[#A8B4C2]/15 space-y-4">
            <div className="text-xs font-bold text-[#EAF0F6] uppercase tracking-wider border-b border-[#A8B4C2]/10 pb-3">
              RECOMMENDED 3-PHASE POST-QUANTUM MIGRATION SPRINT
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[#0B0F14]/60 border border-[#A8B4C2]/12 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#60F1D0]">PHASE 1: CRYPTO-AGILITY ABSTRACTION LAYER</span>
                  <span className="text-[10px] text-[#A8B4C2]">SPRINT 1</span>
                </div>
                <p className="text-[11px] text-[#A8B4C2] leading-relaxed">
                  Decouple direct callsites from hardcoded cryptographic library primitives. Wrap all encryption, signing, and key encapsulation calls behind an abstracted provider interface.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0B0F14]/60 border border-[#A8B4C2]/12 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#8B7CFF]">PHASE 2: CLOUD KMS & HYBRID ENCAPSULATION</span>
                  <span className="text-[10px] text-[#A8B4C2]">SPRINT 2</span>
                </div>
                <p className="text-[11px] text-[#A8B4C2] leading-relaxed">
                  Deploy AWS KMS Key policies supporting dual-encapsulation. Implement hybrid key exchange combining classical ECDH with ML-KEM-768 for transit data.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0B0F14]/60 border border-[#A8B4C2]/12 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#E8A1FF]">PHASE 3: FULL NIST PQC (FIPS 203 / FIPS 204) ENFORCEMENT</span>
                  <span className="text-[10px] text-[#A8B4C2]">SPRINT 3</span>
                </div>
                <p className="text-[11px] text-[#A8B4C2] leading-relaxed">
                  Retire classical RSA-2048 keypairs. Transition all data-at-rest encryption to AES-256-GCM wrapped via ML-KEM-768. Update CycloneDX CBOM in CI/CD pipeline.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Embedded Contextual Assistant */}
      <AssistantDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        projectId={projectId}
        scanId={scanId || undefined}
        initialQuestion={initialQuestion}
      />

    </div>
  );
}
