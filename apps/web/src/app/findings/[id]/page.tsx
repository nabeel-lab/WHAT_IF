"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, MapPin, Activity, FileCode, CheckCircle2, AlertTriangle } from "lucide-react";

export default function FindingDetail() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/findings/${params.id}/verification`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    if (params.id) {
      fetchDetail();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[#A8B4C2] gap-2">
        <span className="w-2 h-2 rounded-full bg-[#60F1D0] animate-ping" />
        Loading finding details…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center bg-[#151C25] border border-[#FF7A90]/30 rounded-xl max-w-xl mx-auto my-12">
        <p className="text-sm font-semibold text-[#FF7A90]">Finding not found</p>
        <Link href="/findings" className="mt-3 inline-block text-xs text-[#60F1D0] hover:underline">
          ← Return to findings
        </Link>
      </div>
    );
  }

  const { finding, evidence, reachability, runtime, config_declared, mismatch } = data;

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-8 pb-16">
      <div>
        <Link 
          href="/findings" 
          className="inline-flex items-center gap-1.5 text-xs font-mono text-[#A8B4C2] hover:text-[#EAF0F6] mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Findings</span>
        </Link>

        <div className="flex items-center justify-between border-b border-[#A8B4C2]/15 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#60F1D0] shadow-[0_0_8px_#60F1D0]" />
              <h1 className="text-xl font-bold font-mono text-[#EAF0F6]">
                {finding.algorithm || finding.name} Usage Detected
              </h1>
            </div>
            <p className="text-xs text-[#A8B4C2] font-mono mt-1">
              Rule: <span className="text-[#60F1D0]">{finding.detector_rule}</span>
            </p>
          </div>

          <span className="badge badge-success font-mono uppercase text-xs">
            {finding.confidence} CONFIDENCE
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="panel p-5 bg-[#151C25] border-[#A8B4C2]/15 space-y-3">
          <div className="text-xs font-bold text-[#EAF0F6] uppercase tracking-wider border-b border-[#A8B4C2]/10 pb-2">
            Static AST Detection
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div>File: <span className="text-[#EAF0F6]">{finding.source_file}:{finding.line_start}</span></div>
            <div>Asset Type: <span className="text-[#60F1D0]">{finding.asset_type}</span></div>
            <div>Role: <span className="text-[#EAF0F6]">{finding.role}</span></div>
          </div>
          {finding.snippet && (
            <div className="mt-3 p-3 rounded-lg bg-[#0B0F14] border border-[#A8B4C2]/15 text-xs font-mono text-[#EAF0F6] overflow-x-auto">
              <code>{finding.snippet}</code>
            </div>
          )}
        </div>

        <div className="panel p-5 bg-[#151C25] border-[#A8B4C2]/15 space-y-3">
          <div className="text-xs font-bold text-[#EAF0F6] uppercase tracking-wider border-b border-[#A8B4C2]/10 pb-2">
            Verification Conformance
          </div>
          <div className="divide-y divide-[#A8B4C2]/10 text-xs">
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-[#A8B4C2]">Reachability</span>
              <span className={`badge ${reachability?.status === 'REACHABLE' ? 'badge-analysis' : 'badge-neutral'}`}>
                {reachability?.status || 'UNKNOWN'}
              </span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-[#A8B4C2]">Runtime Telemetry</span>
              <span className={`badge ${runtime && runtime.length > 0 ? 'badge-success' : 'badge-neutral'}`}>
                {runtime && runtime.length > 0 ? 'OBSERVED' : 'NOT OBSERVED'}
              </span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-[#A8B4C2]">Configuration Mismatch</span>
              <span className={`badge ${mismatch ? 'badge-danger' : 'badge-neutral'}`}>
                {mismatch ? 'MISMATCH' : 'ALIGNED'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
