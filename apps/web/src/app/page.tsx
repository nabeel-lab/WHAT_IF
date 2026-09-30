"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ArrowDown,
  Shield,
  ShieldCheck,
  Zap,
  Activity,
  GitBranch,
  FolderGit2,
  Sparkles,
  Key,
  Database,
  Cpu,
  Terminal,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Eye,
  RefreshCw,
  Plus,
  X,
  Search,
  ChevronRight,
  Sliders,
  FileText,
  Radio,
  Lock,
  Compass
} from "lucide-react";
import Cyber3DHero from "@/components/Cyber3DHero";

/* ─── Domain Semantic Tokens ────────────────────────────────────────── */
const TEAL = "#60F1D0";       // Evidence & Verification
const PURPLE = "#8B7CFF";     // Analysis & Call-Graph
const BLUE = "#75B7FF";       // Data Assets & Context
const AMBER = "#FFBF72";      // Keys & Certificates
const MAGENTA = "#E8A1FF";    // Scenarios & Agility
const ROSE = "#FF7A90";       // Mismatch & Exposure
const VOID_BG = "#04070D";

export default function ECDATLandingPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [activeLayer, setActiveLayer] = useState<number | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/projects`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (e) {
      console.error("Failed to load projects", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setCreating(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });
      if (res.ok) {
        const newProj = await res.json();
        const dest = repositoryUrl.trim()
          ? `/projects/${newProj.id}/scans/new?repo=${encodeURIComponent(repositoryUrl.trim())}`
          : `/projects/${newProj.id}/scans/new`;
        router.push(dest);
      } else {
        alert("Failed to initialize project workspace.");
      }
    } catch (err) {
      console.error(err);
      alert("Error initializing project workspace.");
    } finally {
      setCreating(false);
    }
  };

  const demoProject = projects.find(p => p.name.toLowerCase() === "enterprise_info") || projects[0];
  const primaryWorkspaceHref = demoProject
    ? `/projects/${demoProject.id}/investigation`
    : projects.length > 0
    ? `/projects/${projects[0].id}/investigation`
    : "#workspaces";

  return (
    <div
      className="relative min-h-screen text-[#EAF0F6] select-none overflow-x-hidden"
      style={{ backgroundColor: VOID_BG }}
    >
      {/* ─── Ambient Atmospheric Background Lights ─── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute top-[5%] left-[10%] w-[650px] h-[650px] rounded-full blur-[160px] bg-[#60F1D0]/12 animate-float-1" />
        <div className="absolute top-[35%] right-[5%] w-[700px] h-[700px] rounded-full blur-[170px] bg-[#8B7CFF]/14 animate-float-2" />
        <div className="absolute top-[65%] left-[20%] w-[600px] h-[600px] rounded-full blur-[150px] bg-[#75B7FF]/10 animate-float-3" />
        <div className="absolute bottom-[5%] right-[20%] w-[500px] h-[500px] rounded-full blur-[140px] bg-[#E8A1FF]/08 animate-float-1" />
      </div>

      {/* ─── Top Navigation Bar (as in benchmark reference) ─── */}
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#04070D]/80 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#60F1D0]/15 border border-[#60F1D0]/30 flex items-center justify-center text-[#60F1D0] shadow-[0_0_12px_rgba(96,241,208,0.2)] group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-mono text-sm font-extrabold tracking-wider text-[#EAF0F6] group-hover:text-[#60F1D0] transition-colors">
                ECDAT<span className="text-[#60F1D0]">.TECH</span>
              </span>
              <span className="text-[9px] font-mono text-[#A8B4C2] tracking-widest uppercase">
                ENTERPRISE CRYPTO
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-mono tracking-wider text-[#A8B4C2]">
            <a href="#problem" className="hover:text-[#60F1D0] transition-colors">THE PROBLEM</a>
            <a href="#difference" className="hover:text-[#60F1D0] transition-colors">METHODOLOGY</a>
            <a href="#decision" className="hover:text-[#60F1D0] transition-colors">THE DECISION</a>
            <a href="#evidence" className="hover:text-[#60F1D0] transition-colors">EVIDENCE</a>
            <a href="#architecture" className="hover:text-[#60F1D0] transition-colors">ARCHITECTURE</a>
            <a href="#workspaces" className="hover:text-[#60F1D0] transition-colors">WORKSPACES</a>
          </nav>

          {/* Quick Header CTA */}
          <div className="flex items-center gap-3">
            <Link
              href={primaryWorkspaceHref}
              className="px-4 py-2 rounded-xl bg-[#60F1D0]/15 hover:bg-[#60F1D0]/25 border border-[#60F1D0]/40 text-[#60F1D0] text-xs font-mono font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(96,241,208,0.15)] flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#60F1D0] animate-ping" />
              <span>Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1 — 3D CYBER SPATIAL HERO (FIRST THING THAT APPEARS)
          Features expanded 3D Cube, edge-to-edge ECADT backdrop, 
          smooth 6-7s slow rotation, and vanishing/popping templates
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative w-full pt-4 pb-8 overflow-hidden flex flex-col items-center justify-center z-10">
        <div className="w-full">
          <Cyber3DHero />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1B — CORE POSITIONING & EVIDENCE TRAJECTORY (DOWN BELOW)
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative py-16 px-6 max-w-7xl mx-auto z-10 text-center border-t border-white/10">
        
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full liquid-glass-card border border-white/15 text-xs font-mono tracking-widest uppercase mb-6 shadow-[0_0_20px_rgba(96,241,208,0.15)]">
          <span className="w-2 h-2 rounded-full bg-[#60F1D0] shadow-[0_0_8px_#60F1D0] animate-pulse" />
          <span className="text-[#60F1D0] font-bold">ECDAT</span>
          <span className="text-white/30">//</span>
          <span className="text-[#A8B4C2]">ENTERPRISE CRYPTOGRAPHIC DISCOVERY & ANALYSIS</span>
        </div>

        {/* Headline */}
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#EAF0F6] max-w-5xl mx-auto leading-[1.08] mb-5">
          Know what cryptography{" "}
          <span className="bg-gradient-to-r from-[#60F1D0] via-[#00FF88] to-[#75B7FF] bg-clip-text text-transparent">
            actually matters.
          </span>
        </h2>

        {/* Subhead */}
        <p className="text-base sm:text-lg md:text-xl text-[#A8B4C2] font-normal max-w-3xl mx-auto leading-relaxed mb-8">
          Discover it. Verify it. Trace what it protects. Decide what should change.
        </p>

        {/* Primary & Secondary Actions */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
          <Link
            href={primaryWorkspaceHref}
            className="px-8 py-3.5 rounded-xl bg-[#60F1D0] hover:bg-[#60F1D0]/90 text-[#04070D] text-sm font-bold font-mono tracking-wide transition-all shadow-[0_0_30px_rgba(96,241,208,0.4)] hover:shadow-[0_0_40px_rgba(96,241,208,0.6)] hover:scale-[1.02] flex items-center gap-2.5"
          >
            <span>Enter Investigation Workspace</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </Link>

          <a
            href="#problem"
            className="px-7 py-3.5 rounded-xl liquid-glass border border-white/15 text-[#EAF0F6] hover:text-[#60F1D0] hover:border-[#60F1D0]/40 text-sm font-semibold font-mono tracking-wide transition-all hover:bg-white/5 flex items-center gap-2"
          >
            <span>Explore How ECDAT Works</span>
            <ArrowDown className="w-4 h-4 text-[#A8B4C2]" />
          </a>
        </div>

        {/* Floating Abstract Nodes (Code → Crypto → Key → Data → Decision) */}
        <div className="w-full max-w-5xl pt-8">
          <div className="p-5 rounded-2xl liquid-glass border border-white/15 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

            <div className="text-[10px] font-mono tracking-widest text-[#A8B4C2] uppercase mb-4 text-left flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#60F1D0]" />
              <span>DETERMINISTIC EVIDENCE TRAJECTORY</span>
            </div>

            {/* Continuous Animated Pipeline Nodes */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 relative">
              {[
                { label: "SOURCE", sub: "AST Syntax & Symbol Table", color: BLUE, icon: FileCode },
                { label: "DISCOVERY", sub: "Verified Primitives", color: PURPLE, icon: Cpu },
                { label: "RUNTIME EVIDENCE", sub: "Stack Execution Proof", color: TEAL, icon: Eye },
                { label: "CRYPTOGRAPHIC PATH", sub: "Route to Encapsulation", color: AMBER, icon: GitBranch },
                { label: "DECISION", sub: "Sufficient Intervention", color: MAGENTA, icon: Sparkles },
              ].map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.label}
                    className="p-3.5 rounded-xl liquid-glass-card border border-white/10 text-left transition-all hover:border-white/30 group relative"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                        style={{ backgroundColor: `${step.color}20`, color: step.color }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-mono font-bold" style={{ color: step.color }}>
                        0{idx + 1}
                      </span>
                    </div>
                    <div className="font-mono text-xs font-bold text-[#EAF0F6] tracking-wider mb-0.5">
                      {step.label}
                    </div>
                    <div className="text-[10px] text-[#A8B4C2] line-clamp-1">
                      {step.sub}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Continuous Flow Rail */}
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-[#A8B4C2]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#60F1D0] animate-ping" />
                <span>Continuous evidence correlation across enterprise dependency graphs</span>
              </div>
              <span className="hidden sm:inline text-white/30">NIST FIPS 203 / 204 / 205 READY</span>
            </div>
          </div>
        </div>

      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2 — THE PROBLEM
      ═══════════════════════════════════════════════════════════════ */}
      <section id="problem" className="relative py-24 px-6 max-w-7xl mx-auto z-10 border-t border-white/10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Bold Contrarian Statement */}
          <div className="lg:col-span-5 space-y-6">
            <div className="text-xs font-mono text-[#FF7A90] font-bold tracking-widest uppercase flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-[#FF7A90]" />
              <span>THE DISCOVERY FALLACY</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#EAF0F6] leading-tight">
              DISCOVERY IS NOT THE DECISION.
            </h2>

            <p className="text-base text-[#A8B4C2] leading-relaxed">
              A cryptographic algorithm can exist in an application without being equally important.
              Presence alone does not tell an enterprise where to act first.
            </p>

            <div className="p-4 rounded-xl liquid-glass border border-[#FF7A90]/25 text-xs text-[#FF7A90] space-y-1 font-mono">
              <div className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span>Conventional Scanners Fall Short:</span>
              </div>
              <p className="text-white/80">
                Finding 500 instances of RSA-2048 tells security teams nothing about reachability, payload sensitivity, key scoping, or migration feasibility.
              </p>
            </div>
          </div>

          {/* Right Column: Visual Transformation Sequence */}
          <div className="lg:col-span-7">
            <div className="liquid-glass p-7 rounded-2xl border border-white/15 space-y-4 shadow-2xl relative">
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

              <div className="text-xs font-mono text-[#A8B4C2] uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>TRADITIONAL INTAKE</span>
                <span className="text-[#60F1D0]">ECDAT DECISION CHAIN</span>
              </div>

              {/* Transformation Chain */}
              <div className="space-y-2 font-mono text-xs">
                
                {/* Step 1: Raw Detection */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-[#A8B4C2]">
                  <span>01. Cryptographic algorithm detected</span>
                  <span className="text-[10px] text-white/50 px-2 py-0.5 rounded bg-white/5">Presence only</span>
                </div>

                {/* Question Gates */}
                {[
                  { q: "Reachable via live entrypoint?", tag: "Call-Graph CFG", color: PURPLE },
                  { q: "Observed in active runtime execution?", tag: "Dynamic Interception", color: TEAL },
                  { q: "Protects restricted or sensitive data?", tag: "Data Binding", color: BLUE },
                  { q: "Long-lived payload exposure (HNDL)?", tag: "Lifetime Window", color: ROSE },
                  { q: "Shared key scope across services?", tag: "KMS Enclave", color: AMBER },
                  { q: "Engineering migration effort estimated?", tag: "Blast Radius", color: MAGENTA },
                ].map((item, i) => (
                  <div
                    key={item.q}
                    className="p-3 rounded-xl liquid-glass-card border border-white/10 flex items-center justify-between pl-6 relative transition-all hover:border-white/30"
                  >
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[#EAF0F6]">? {item.q}</span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded"
                      style={{ backgroundColor: `${item.color}18`, color: item.color }}
                    >
                      {item.tag}
                    </span>
                  </div>
                ))}

                {/* Final Step: Targeted Action */}
                <div className="p-3.5 rounded-xl bg-[#60F1D0]/15 border border-[#60F1D0]/40 flex items-center justify-between text-[#60F1D0] font-bold shadow-[0_0_15px_rgba(96,241,208,0.2)]">
                  <span>ACTION: Evidence-Backed Security Intervention</span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-[#60F1D0] text-[#04070D]">
                    VERIFIED DECISION
                  </span>
                </div>

              </div>
            </div>
          </div>

        </div>

      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3 — THE ECDAT DIFFERENCE
      ═══════════════════════════════════════════════════════════════ */}
      <section id="difference" className="relative py-28 px-6 max-w-7xl mx-auto z-10 border-t border-white/10 text-center">
        
        <div className="space-y-4 max-w-3xl mx-auto mb-16">
          <div className="text-xs font-mono text-[#8B7CFF] font-bold tracking-widest uppercase">
            THE ARCHITECTURAL PARADIGM
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#EAF0F6]">
            FROM ALGORITHM <br />
            <span className="bg-gradient-to-r from-[#60F1D0] via-[#8B7CFF] to-[#E8A1FF] bg-clip-text text-transparent">
              TO CRYPTOGRAPHIC PATH
            </span>
          </h2>
          <p className="text-base text-[#A8B4C2] leading-relaxed">
            ECDAT connects technical evidence to the context required for an actual engineering decision.
          </p>
        </div>

        {/* Visualized Cryptographic Path Graph */}
        <div className="liquid-glass p-8 rounded-3xl border border-white/15 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

          {/* Connected Spatial Nodes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 relative z-10">
            {[
              { label: "Source Code", type: "AST", color: BLUE, desc: "File callsites" },
              { label: "Reachability", type: "CFG", color: PURPLE, desc: "Exposed route" },
              { label: "Runtime Observation", type: "TELEMETRY", color: TEAL, desc: "Live invocation" },
              { label: "Cryptographic Operation", type: "PRIMITIVE", color: ROSE, desc: "RSA / AES / HASH" },
              { label: "Key Context", type: "ENCLAVE", color: AMBER, desc: "KMS / Hardcoded" },
              { label: "Protected Data", type: "ASSET", color: BLUE, desc: "Restricted payload" },
              { label: "Lifetime / Exposure", type: "HORIZON", color: MAGENTA, desc: "Decryption cliff" },
              { label: "Intervention", type: "DECISION", color: TEAL, desc: "Target solution" },
            ].map((node, i) => (
              <div
                key={node.label}
                className="liquid-glass-card p-4 rounded-xl border border-white/10 text-left space-y-2 flex flex-col justify-between transition-all hover:scale-105 hover:border-white/30"
              >
                <div>
                  <span
                    className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${node.color}20`, color: node.color }}
                  >
                    {node.type}
                  </span>
                  <div className="font-mono text-xs font-bold text-[#EAF0F6] mt-2">
                    {node.label}
                  </div>
                </div>
                <div className="text-[11px] text-[#A8B4C2] font-mono pt-2 border-t border-white/10">
                  {node.desc}
                </div>
              </div>
            ))}
          </div>

          {/* SVG Connecting Flow Lines underneath */}
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#A8B4C2]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#8B7CFF]" />
              <span>Full cryptographic call-graph correlation: Endpoint → Library → Enclave → Storage</span>
            </div>
            <span className="text-[#60F1D0]">ZERO GUESSWORK · EMPIRICALLY GROUNDED</span>
          </div>
        </div>

      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4 — THE DECISION IDEA (HERO INTELLECTUAL STATEMENT)
      ═══════════════════════════════════════════════════════════════ */}
      <section id="decision" className="relative py-28 px-6 max-w-7xl mx-auto z-10 border-t border-white/10">
        
        {/* Large Glass Panel / Hero Quote Box */}
        <div className="liquid-glass p-8 sm:p-12 rounded-3xl border border-white/20 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#60F1D0] to-transparent pointer-events-none" />

          {/* Upper Positioning Copy */}
          <div className="max-w-4xl space-y-3 mb-10">
            <div className="text-xs font-mono text-[#E8A1FF] uppercase font-bold tracking-widest">
              THE DECISION IMPERATIVE
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#EAF0F6] tracking-tight">
              “Migration is one option. <br />
              <span className="text-[#A8B4C2]">It is not automatically the answer.”</span>
            </h2>
            <p className="text-base text-[#A8B4C2] leading-relaxed max-w-2xl">
              ECDAT evaluates the specific path, the protection requirement, the dependencies, and the effort involved in changing the system.
            </p>
          </div>

          {/* ─── Hero Intellectual Statement Highlight Box ─── */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white/[0.04] border border-[#60F1D0]/40 shadow-[0_0_40px_rgba(96,241,208,0.15)] my-10 space-y-4">
            <div className="text-xs font-mono text-[#A8B4C2] uppercase tracking-wider">
              CORE SYSTEM REASONING
            </div>
            <div className="space-y-3">
              <p className="text-base sm:text-lg text-[#A8B4C2] font-mono">
                Instead of asking: <br />
                <span className="text-[#FF7A90] font-semibold">“Is this algorithm vulnerable?”</span>
              </p>
              <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#EAF0F6] leading-snug">
                ECDAT asks: <br />
                <span className="text-[#60F1D0]">
                  “What is the cheapest sufficient security intervention for this specific cryptographic path?”
                </span>
              </p>
            </div>
            <div className="pt-2 text-sm font-mono font-bold text-[#60F1D0] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#60F1D0] shadow-[0_0_8px_#60F1D0]" />
              <span>Find the cheapest sufficient security intervention.</span>
            </div>
          </div>

          {/* Visual Intervention Spectrum */}
          <div className="space-y-4 pt-4">
            <div className="text-xs font-mono text-[#A8B4C2] uppercase tracking-wider">
              INTERVENTION SPECTRUM (LOWER EFFORT → HIGHER EFFORT)
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
              {[
                { name: "HARDEN", desc: "Key rotation & cipher tightening", effort: "Lowest Effort", color: "#60F1D0" },
                { name: "REDUCE BLAST RADIUS", desc: "Scope KMS enclave permissions", effort: "Configuration", color: "#75B7FF" },
                { name: "REDUCE DATA EXPOSURE", desc: "Minimize stored ciphertext TTL", effort: "Architecture", color: "#8B7CFF" },
                { name: "IMPROVE CRYPTO AGILITY", desc: "Abstract library provider calls", effort: "Refactoring", color: "#FFBF72" },
                { name: "HYBRID MIGRATION", desc: "Classical + PQC dual encapsulation", effort: "Protocol Upgrade", color: "#E8A1FF" },
                { name: "FULL MIGRATION", desc: "Native ML-KEM / ML-DSA replacement", effort: "Full System Replacement", color: "#FF7A90" },
              ].map((item, idx) => (
                <div
                  key={item.name}
                  className="p-3.5 rounded-xl liquid-glass-card border border-white/10 text-left space-y-2 flex flex-col justify-between transition-all hover:scale-105"
                  style={{ borderColor: `${item.color}35` }}
                >
                  <div>
                    <span className="text-[10px] font-bold" style={{ color: item.color }}>
                      0{idx + 1}
                    </span>
                    <div className="font-bold text-[#EAF0F6] mt-1 tracking-wider text-[11px]">
                      {item.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#A8B4C2] leading-tight mb-2">
                      {item.desc}
                    </div>
                    <div className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5" style={{ color: item.color }}>
                      {item.effort}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 5 — EVIDENCE
      ═══════════════════════════════════════════════════════════════ */}
      <section id="evidence" className="relative py-28 px-6 max-w-7xl mx-auto z-10 border-t border-white/10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left: Explanatory Copy */}
          <div className="lg:col-span-5 space-y-6">
            <div className="text-xs font-mono text-[#60F1D0] font-bold tracking-widest uppercase">
              RIGOROUS VERIFICATION MODEL
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#EAF0F6] tracking-tight">
              The Evidence Stack
            </h2>

            <p className="text-base text-[#A8B4C2] leading-relaxed">
              ECDAT does not rely on subjective risk matrices. Every security recommendation is substantiated by empirical proofs across code, call-graph, and execution trace.
            </p>

            {/* Prominent Callout */}
            <div className="p-4 rounded-xl liquid-glass border border-[#8B7CFF]/30 space-y-2 font-mono text-xs">
              <div className="text-[#8B7CFF] font-bold uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#60F1D0]" />
                <span>EPISTEMIC GROUNDING</span>
              </div>
              <p className="text-[#EAF0F6] text-sm font-semibold leading-relaxed">
                “Unknown means insufficient evidence — not automatically high risk.”
              </p>
              <p className="text-[#A8B4C2] text-[11px]">
                Distinguishing what is unobserved from what is proven vulnerable prevents alert fatigue and preserves engineering focus.
              </p>
            </div>
          </div>

          {/* Right: Visual Evidence Stack */}
          <div className="lg:col-span-7 space-y-3">
            
            {/* 4 Status Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 font-mono text-xs">
              {[
                { status: "DISCOVERED", color: AMBER, desc: "AST / Symbol Match" },
                { status: "REACHABLE", color: PURPLE, desc: "Live Entrypoint Path" },
                { status: "RUNTIME OBSERVED", color: TEAL, desc: "Stack Frame Verified" },
                { status: "UNKNOWN", color: "#94A3B8", desc: "Awaiting Telemetry" },
              ].map(s => (
                <div key={s.status} className="p-2.5 rounded-lg liquid-glass-card border border-white/10 text-center">
                  <div className="font-bold text-[11px]" style={{ color: s.color }}>{s.status}</div>
                  <div className="text-[10px] text-[#A8B4C2]">{s.desc}</div>
                </div>
              ))}
            </div>

            {/* Stack Layers */}
            {[
              { title: "STATIC DISCOVERY", sub: "AST syntax trees & binary symbol tables", color: AMBER },
              { title: "RUNTIME OBSERVATION", sub: "Live interception hooks with unwound stack traces", color: TEAL },
              { title: "SOURCE PROVENANCE", sub: "Cryptographic commit hash & file line anchors", color: BLUE },
              { title: "REACHABILITY", sub: "Interprocedural call-graph traversal from HTTP handlers", color: PURPLE },
              { title: "DATA CONTEXT", sub: "Data sensitivity taxonomy and payload longevity", color: BLUE },
              { title: "KEY CONTEXT", sub: "KMS rotation policy and encapsulation scoping", color: AMBER },
              { title: "DECISION RULE", sub: "Cheapest sufficient intervention calculation", color: MAGENTA },
            ].map((layer, idx) => (
              <div
                key={layer.title}
                className="liquid-glass-card p-3.5 rounded-xl border border-white/10 flex items-center justify-between font-mono text-xs hover:border-white/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-[#A8B4C2] w-6">0{idx + 1}</span>
                  <div>
                    <span className="font-bold text-[#EAF0F6]">{layer.title}</span>
                    <p className="text-[11px] text-[#A8B4C2] font-sans">{layer.sub}</p>
                  </div>
                </div>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: layer.color, boxShadow: `0 0 8px ${layer.color}` }}
                />
              </div>
            ))}
          </div>

        </div>

      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 6 — LAYERED FUTURE ARCHITECTURE
      ═══════════════════════════════════════════════════════════════ */}
      <section id="architecture" className="relative py-28 px-6 max-w-7xl mx-auto z-10 border-t border-white/10 text-center">
        
        <div className="space-y-4 max-w-3xl mx-auto mb-14">
          <div className="text-xs font-mono text-[#75B7FF] font-bold tracking-widest uppercase">
            PLATFORM EVOLUTION & ARCHITECTURAL DIRECTION
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#EAF0F6] tracking-tight">
            Security decisions can happen at the right layer.
          </h2>
          <p className="text-base text-[#A8B4C2] leading-relaxed">
            Our architecture is designed to evaluate security interventions across the layers surrounding a cryptographic dependency — selecting the appropriate mechanism for the specific path rather than forcing every problem into algorithm replacement.
          </p>
        </div>

        {/* 3D Stepped Layer Stack */}
        <div className="max-w-4xl mx-auto space-y-2 font-mono text-xs text-left">
          {[
            { layer: "APPLICATION", role: "Business Logic & API Contracts", intervention: "Input validation & data minimization", color: TEAL },
            { layer: "PROTOCOL", role: "Transport & Session Encryption", intervention: "TLS 1.3 / WireGuard cipher suites", color: PURPLE },
            { layer: "CRYPTOGRAPHIC ABSTRACTION", role: "Provider Decoupling & Agility Facades", intervention: "Dynamic provider injection", color: BLUE },
            { layer: "CRYPTOGRAPHIC CONSTRUCTION", role: "Primitives & Algorithms (RSA, Kyber)", intervention: "ML-KEM-768 / Hybrid KEM swap", color: ROSE },
            { layer: "KEY MANAGEMENT", role: "KMS Enclaves & HSM Anchors", intervention: "Key rotation & envelope scoping", color: AMBER },
            { layer: "HARDWARE", role: "Silicon Acceleration & TPMs", intervention: "Hardware security module boundary", color: MAGENTA },
            { layer: "DATA LIFECYCLE", role: "Payload Retention & HNDL Horizon", intervention: "Immediate purge & ciphertext expiration", color: BLUE },
            { layer: "GOVERNANCE", role: "NIST PQC & CBOM Compliance Auditing", intervention: "Continuous machine-readable attestations", color: TEAL },
          ].map((item, idx) => (
            <div
              key={item.layer}
              onMouseEnter={() => setActiveLayer(idx)}
              onMouseLeave={() => setActiveLayer(null)}
              className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                activeLayer === idx
                  ? "liquid-glass border-[#60F1D0]/60 shadow-[0_0_20px_rgba(96,241,208,0.2)] -translate-x-1"
                  : "liquid-glass-card border-white/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-[#A8B4C2] w-6">0{idx + 1}</span>
                <span className="font-bold text-[#EAF0F6] text-sm tracking-wider">{item.layer}</span>
                <span className="text-[11px] text-[#A8B4C2] hidden md:inline">({item.role})</span>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                <span className="text-[11px] text-[#A8B4C2]">Intervention:</span>
                <span className="font-semibold text-xs" style={{ color: item.color }}>{item.intervention}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-xs font-mono text-[#A8B4C2]">
          Directional Roadmap · Architecture actively being expanded across layered enterprise infrastructure
        </div>

      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 7 — WHAT THE PRODUCT ACTUALLY GIVES YOU
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative py-28 px-6 max-w-7xl mx-auto z-10 border-t border-white/10">
        
        <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
          <div className="text-xs font-mono text-[#60F1D0] font-bold tracking-widest uppercase">
            PRODUCT CAPABILITIES
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#EAF0F6] tracking-tight">
            What ECDAT Actually Delivers
          </h2>
          <p className="text-base text-[#A8B4C2]">
            Nine core mechanisms that turn discovery into concrete engineering decisions.
          </p>
        </div>

        {/* Compact Spatial Feature Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: "Evidence-Backed Discovery",
              desc: "Code-level detection corroborated by AST syntax trees and compiled native binary symbols.",
              icon: Search,
              color: TEAL,
            },
            {
              title: "Runtime Verification",
              desc: "Dynamic execution proofs captured non-invasively with unwound call stack snippets.",
              icon: Eye,
              color: PURPLE,
            },
            {
              title: "Cryptographic Dependency Paths",
              desc: "Complete end-to-end tracing from exposed API routes to deeply nested algorithms.",
              icon: GitBranch,
              color: BLUE,
            },
            {
              title: "Protected-Data Context",
              desc: "Direct binding of cryptographic operations to the classification of underlying data assets.",
              icon: Database,
              color: BLUE,
            },
            {
              title: "Key-Scope Context",
              desc: "Accurate mapping of KMS encapsulation boundaries, rotation states, and management lifecycles.",
              icon: Key,
              color: AMBER,
            },
            {
              title: "Explainable Recommendations",
              desc: "Deterministic, auditor-ready remediation rationales grounded strictly in verifiable facts.",
              icon: CheckCircle2,
              color: TEAL,
            },
            {
              title: "What-If Analysis",
              desc: "In-memory predictive simulation of algorithm swaps, transit latencies, and blast radius.",
              icon: Sparkles,
              color: MAGENTA,
            },
            {
              title: "CBOM & Reporting",
              desc: "Automated CycloneDX 1.6 Cryptographic Bill of Materials generation for regulatory audits.",
              icon: FileText,
              color: AMBER,
            },
            {
              title: "Contextual AI Explanation",
              desc: "Grounded technical inference assistant that cites exact verified file lines and evidence records.",
              icon: Terminal,
              color: PURPLE,
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="liquid-glass-card p-5 rounded-2xl border border-white/10 space-y-3 transition-all hover:border-white/30 hover:scale-[1.02]"
              >
                <div className="flex items-center justify-between">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}20`, color: item.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono text-[#A8B4C2]">0{idx + 1}</span>
                </div>
                <h3 className="font-mono text-sm font-bold text-[#EAF0F6]">{item.title}</h3>
                <p className="text-xs text-[#A8B4C2] leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>

      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 8 — CTA / ENTER THE PRODUCT & WORKSPACE TRANSITION
      ═══════════════════════════════════════════════════════════════ */}
      <section id="workspaces" className="relative py-28 px-6 max-w-7xl mx-auto z-10 border-t border-white/10">
        
        <div className="liquid-glass p-8 sm:p-14 rounded-3xl border border-white/20 shadow-2xl relative overflow-hidden text-center">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#60F1D0] to-transparent pointer-events-none" />

          <div className="max-w-3xl mx-auto space-y-6 mb-10">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#EAF0F6] leading-tight">
              Stop collecting findings. <br />
              <span className="bg-gradient-to-r from-[#60F1D0] via-[#8B7CFF] to-[#75B7FF] bg-clip-text text-transparent">
                Start making cryptographic decisions.
              </span>
            </h2>
            <p className="text-base text-[#A8B4C2] leading-relaxed">
              Open the investigation graph for your environment or register a new repository target for automated baseline discovery.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link
                href={primaryWorkspaceHref}
                className="px-8 py-4 rounded-xl bg-[#60F1D0] hover:bg-[#60F1D0]/90 text-[#04070D] text-sm font-bold font-mono tracking-wide transition-all shadow-[0_0_30px_rgba(96,241,208,0.4)] hover:shadow-[0_0_40px_rgba(96,241,208,0.6)] hover:scale-[1.02] flex items-center gap-2"
              >
                <span>Enter Investigation Workspace</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </Link>

              <button
                onClick={() => setShowCreateModal(true)}
                className="px-8 py-4 rounded-xl liquid-glass border border-white/20 text-[#EAF0F6] hover:text-[#60F1D0] hover:border-[#60F1D0]/40 text-sm font-semibold font-mono tracking-wide transition-all hover:bg-white/5 flex items-center gap-2"
              >
                <Plus className="w-4 h-4 text-[#60F1D0]" />
                <span>Create New Investigation</span>
              </button>
            </div>

            {/* Provenance Telemetry Line */}
            <div className="pt-8 flex items-center justify-center gap-3 text-xs font-mono text-[#A8B4C2]">
              <span className="text-[#60F1D0]">SOURCE</span>
              <span>→</span>
              <span className="text-[#8B7CFF]">VERIFIED</span>
              <span>→</span>
              <span className="text-[#75B7FF]">ANALYZED</span>
              <span>→</span>
              <span className="text-[#60F1D0] font-bold">INVESTIGATED</span>
            </div>
          </div>

          {/* ─── Integrated Active Workspaces Explorer ─── */}
          <div className="mt-12 pt-8 border-t border-white/10 text-left max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-[#EAF0F6]">
                <FolderGit2 className="w-4 h-4 text-[#60F1D0]" />
                <span className="font-bold">REGISTERED TARGET WORKSPACES</span>
              </div>
              <span className="text-[#A8B4C2]">{projects.length} Environments Available</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs font-mono text-[#A8B4C2] flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#60F1D0] animate-ping" />
                <span>Loading active environments…</span>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Primary Demo Project Card */}
                {demoProject && (
                  <div className="p-5 rounded-2xl liquid-glass-card border border-[#60F1D0]/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#60F1D0] shadow-[0_0_6px_#60F1D0]" />
                        <span className="text-[#60F1D0] font-bold uppercase">PRIMARY RESEARCH BENCHMARK</span>
                        <span className="text-white/40">•</span>
                        <span className="text-[#A8B4C2]">LIVE GRAPH READY</span>
                      </div>
                      <h4 className="text-base font-bold text-[#EAF0F6]">{demoProject.name}</h4>
                      <p className="text-xs text-[#A8B4C2] max-w-md">
                        Enterprise financial microservices baseline with 8 cryptographic assets, call-graph reachability, and runtime telemetry.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        href={`/projects/${demoProject.id}/overview`}
                        className="btn-ghost text-xs px-3.5 py-2 font-mono"
                      >
                        Overview
                      </Link>
                      <Link
                        href={`/projects/${demoProject.id}/investigation`}
                        className="btn-primary text-xs px-4 py-2 flex items-center gap-2 font-mono"
                      >
                        <span>Investigate</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )}

                {/* Additional Projects List */}
                {projects.filter(p => p.id !== demoProject?.id).map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl liquid-glass-card border border-white/10 flex items-center justify-between gap-3 text-xs font-mono"
                  >
                    <div className="truncate">
                      <span className="font-bold text-[#EAF0F6]">{p.name}</span>
                      <span className="text-[#A8B4C2] ml-2 text-[11px] truncate">({p.id})</span>
                    </div>
                    <Link
                      href={`/projects/${p.id}/investigation`}
                      className="text-[#60F1D0] hover:underline flex items-center gap-1 font-semibold shrink-0"
                    >
                      <span>Explore</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/10 py-8 px-6 text-center text-xs font-mono text-[#A8B4C2] relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[#EAF0F6]">
            <span className="w-2 h-2 rounded-full bg-[#60F1D0]" />
            <span className="font-bold">ECDAT</span>
            <span className="text-white/30">—</span>
            <span>Enterprise Cryptographic Discovery & Analysis Tool</span>
          </div>
          <div className="text-white/40">
            NIST FIPS 203 / 204 / 205 (PQC) Framework · CycloneDX 1.6 CBOM
          </div>
        </div>
      </footer>

      {/* ─── Create Project / Connect Repository Modal ─── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-[#04070D]/85 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="liquid-glass p-7 rounded-2xl max-w-lg w-full space-y-6 border border-white/20 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative">
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#60F1D0] to-transparent pointer-events-none" />

            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <FolderGit2 className="w-5 h-5 text-[#60F1D0]" />
                <h3 className="text-base font-bold text-[#EAF0F6]">Register Target Repository</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-[#A8B4C2] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-[#A8B4C2] mb-1.5 uppercase font-semibold">PROJECT NAME</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., PaymentGateway_Services"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full bg-[#0B121C]/80 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#60F1D0]/60 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[#A8B4C2] mb-1.5 uppercase font-semibold">REPOSITORY URL (GIT / HTTPS)</label>
                <input
                  type="text"
                  placeholder="https://github.com/organization/repository.git"
                  value={repositoryUrl}
                  onChange={(e) => setRepositoryUrl(e.target.value)}
                  className="w-full bg-[#0B121C]/80 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#60F1D0]/60 transition-colors"
                />
                <span className="text-[10px] text-white/40 mt-1 block">Optional: Pre-fills scanner source acquisition pipeline</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-ghost text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newProjectName.trim()}
                  className="btn-primary text-xs px-5 py-2.5 font-bold"
                >
                  {creating ? "Initializing Space…" : "Initialize Workspace →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
