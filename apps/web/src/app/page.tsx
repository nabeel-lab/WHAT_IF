"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck, Database, Layers, Plus, Sparkles, FolderGit2, History, Play } from "lucide-react";

export default function EnterpriseOnboarding() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [creating, setCreating] = useState(false);

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
      console.error(e);
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
        alert("Failed to create project.");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating project.");
    } finally {
      setCreating(false);
    }
  };

  // Categorize projects deterministically
  const isTestWorkspace = (name: string) => {
    const lower = name.toLowerCase();
    return lower.includes("test") || lower.includes("verification") || lower.includes("synthetic");
  };

  const demoProjects = projects.filter(p => p.name.toLowerCase() === "enterprise_info");
  const userProjects = projects.filter(p => p.name.toLowerCase() !== "enterprise_info" && !isTestWorkspace(p.name));
  const testWorkspaces = projects.filter(p => p.name.toLowerCase() !== "enterprise_info" && isTestWorkspace(p.name));

  return (
    <div className="max-w-5xl mx-auto space-y-10 my-12 px-6 pb-20">
      {/* Hero Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#151C25] border border-[#60F1D0]/30 text-xs font-mono text-[#60F1D0] mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#60F1D0] shadow-[0_0_8px_#60F1D0]" />
          POST-QUANTUM READY CRYPTOGRAPHIC OBSERVABILITY
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#EAF0F6]">
          Cryptographic Environment Intelligence
        </h1>
        <p className="text-sm text-[#A8B4C2] max-w-xl mx-auto">
          Deterministic discovery, runtime reachability, and evidence-scoped migration planning across your system architecture.
        </p>
      </div>

      {/* Action Bar / Workspace Entry */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#EAF0F6]">Project Workspaces</h2>
          <p className="text-xs text-[#A8B4C2]">Select a workspace or register a new target repository.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#60F1D0] hover:bg-[#60F1D0]/90 text-[#0B0F14] text-xs font-bold font-mono transition-all shadow-[0_0_15px_rgba(96,241,208,0.25)]"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Repository / Project</span>
        </button>
      </div>

      {/* Modal for Registering New Project */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-[#0B0F14]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="panel p-6 bg-[#151C25] border-[#60F1D0]/30 max-w-md w-full space-y-5 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#A8B4C2]/10 pb-3">
              <h3 className="text-sm font-bold text-[#EAF0F6] flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-[#60F1D0]" />
                <span>Register New Project Workspace</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-xs text-[#A8B4C2] hover:text-[#EAF0F6]"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#A8B4C2] mb-1">PROJECT / SYSTEM NAME</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Core Payment Service"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#1C2632] border border-[#A8B4C2]/20 text-xs font-mono text-[#EAF0F6] focus:border-[#60F1D0] outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-mono text-[#A8B4C2]">GIT REPOSITORY URL (OPTIONAL)</label>
                  <button
                    type="button"
                    onClick={() => setRepositoryUrl("https://github.com/nabeel-lab/Enterprise_info.git")}
                    className="text-[10px] font-mono text-[#60F1D0] hover:underline"
                  >
                    Use Demo Repo
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. https://github.com/user/project.git"
                  value={repositoryUrl}
                  onChange={(e) => setRepositoryUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#1C2632] border border-[#A8B4C2]/20 text-xs font-mono text-[#EAF0F6] focus:border-[#60F1D0] outline-none"
                />
                <span className="text-[10px] text-[#A8B4C2]/70 font-mono mt-1 block">
                  You can specify any repository or use the demo Enterprise_info repository.
                </span>
              </div>

              <div className="text-[11px] text-[#A8B4C2] font-mono leading-relaxed">
                Creating a project will immediately take you to Source Intake (New Scan) to connect your source and launch live analysis.
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#A8B4C2]/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#A8B4C2]/20 text-xs font-mono text-[#A8B4C2] hover:text-[#EAF0F6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newProjectName.trim()}
                  className="px-4 py-1.5 rounded-lg bg-[#60F1D0] hover:bg-[#60F1D0]/90 text-[#0B0F14] text-xs font-bold font-mono transition-all disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create & Intake Source →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-[#A8B4C2] text-center py-16 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#60F1D0] animate-ping" />
          Loading environments...
        </div>
      ) : (
        <div className="space-y-8">
          {/* SECTION 1: PRIMARY DEMO PROJECT */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#60F1D0]" />
                <h3 className="text-xs font-mono font-bold text-[#60F1D0] uppercase tracking-wider">
                  PRIMARY DEMO PROJECT
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#A8B4C2]">Curated Target System</span>
            </div>

            {demoProjects.length > 0 ? (
              demoProjects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-6 rounded-2xl border border-[#60F1D0]/40 bg-gradient-to-r from-[#151C25] via-[#1C2632]/80 to-[#151C25] shadow-[0_0_25px_rgba(96,241,208,0.1)] flex flex-col sm:flex-row justify-between sm:items-center gap-4 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg text-[#EAF0F6] group-hover:text-[#60F1D0] transition-colors">
                        {proj.name}
                      </span>
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#60F1D0]/15 text-[#60F1D0] border border-[#60F1D0]/30 font-semibold">
                        PRIMARY DEMO
                      </span>
                    </div>
                    <div className="text-xs text-[#A8B4C2] space-y-1 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#60F1D0]" />
                        <span>Source: git+https://github.com/nabeel-lab/Enterprise_info.git</span>
                      </div>
                      <div className="text-[11px] text-[#A8B4C2]/80">
                        Baseline RSA, AES, SHA256 discovery + callgraph reachability + runtime harness setup.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => router.push(`/projects/${proj.id}/scans/new`)}
                      className="px-3.5 py-2 rounded-lg border border-[#A8B4C2]/20 hover:border-[#60F1D0]/40 bg-[#1C2632] hover:bg-[#1C2632]/80 text-xs font-mono text-[#A8B4C2] hover:text-[#EAF0F6] transition-all flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 text-[#60F1D0]" />
                      <span>New Scan</span>
                    </button>
                    <button
                      onClick={() => router.push(`/projects/${proj.id}/overview`)}
                      className="px-4 py-2 rounded-lg bg-[#60F1D0] hover:bg-[#60F1D0]/90 text-[#0B0F14] text-xs font-bold transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(96,241,208,0.2)]"
                    >
                      <span>Enter Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-[#A8B4C2] p-4 bg-[#151C25] border border-[#A8B4C2]/15 rounded-xl">
                Demo project loading...
              </div>
            )}
          </div>

          {/* SECTION 2: REAL PROJECTS CREATED BY THE USER */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-t border-[#A8B4C2]/15 pt-6">
              <h3 className="text-xs font-mono font-bold text-[#EAF0F6] uppercase tracking-wider flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-[#4E9FFF]" />
                <span>REAL PROJECTS CREATED BY THE USER</span>
              </h3>
              <span className="text-[11px] font-mono text-[#A8B4C2] px-2 py-0.5 rounded bg-[#1C2632] border border-[#A8B4C2]/15">
                {userProjects.length} Custom Project{userProjects.length !== 1 ? "s" : ""}
              </span>
            </div>

            {userProjects.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-[#A8B4C2]/20 bg-[#151C25]/40 text-center space-y-2">
                <p className="text-xs text-[#A8B4C2]">No custom user projects created yet.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="text-xs font-mono text-[#60F1D0] hover:underline inline-flex items-center gap-1"
                >
                  + Add a custom repository project
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {userProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-5 rounded-xl border border-[#A8B4C2]/15 bg-[#151C25] hover:border-[#60F1D0]/40 transition-all flex justify-between items-center group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-[#EAF0F6] group-hover:text-[#60F1D0] text-sm">
                          {proj.name}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#4E9FFF]/15 text-[#4E9FFF] border border-[#4E9FFF]/30">
                          USER CREATED
                        </span>
                      </div>
                      <div className="text-xs text-[#A8B4C2] font-mono">
                        Registered: {new Date(proj.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => router.push(`/projects/${proj.id}/scans/new`)}
                        className="px-3 py-1.5 rounded-lg border border-[#A8B4C2]/20 hover:border-[#60F1D0]/40 bg-[#1C2632] text-xs font-mono text-[#A8B4C2] hover:text-[#EAF0F6]"
                      >
                        New Scan
                      </button>
                      <button
                        onClick={() => router.push(`/projects/${proj.id}/overview`)}
                        className="px-3.5 py-1.5 rounded-lg bg-[#1C2632] hover:bg-[#60F1D0] hover:text-[#0B0F14] text-xs font-semibold text-[#60F1D0] border border-[#60F1D0]/30 transition-all flex items-center gap-1"
                      >
                        <span>Open</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 3: HISTORICAL TEST / VERIFICATION WORKSPACES */}
          {testWorkspaces.length > 0 && (
            <div className="space-y-3 border-t border-[#A8B4C2]/15 pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-semibold text-[#A8B4C2] uppercase tracking-wider flex items-center gap-2">
                  <History className="w-3.5 h-3.5" />
                  <span>HISTORICAL VERIFICATION RUNS</span>
                </h3>
                <span className="text-[11px] font-mono text-[#A8B4C2]/70">
                  {testWorkspaces.length} Run Record{testWorkspaces.length !== 1 ? "s" : ""} Preserved
                </span>
              </div>
              <p className="text-[11px] text-[#A8B4C2]/70 font-mono">
                System test executions and verification datasets are preserved below for historical scan auditability.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {testWorkspaces.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-3.5 rounded-lg border border-[#A8B4C2]/10 bg-[#151C25]/50 hover:bg-[#151C25] transition-all flex items-center justify-between text-xs"
                  >
                    <div className="truncate pr-2">
                      <div className="font-mono text-[#EAF0F6]/80 truncate">{proj.name}</div>
                      <div className="text-[10px] font-mono text-[#A8B4C2]/60">
                        {new Date(proj.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/projects/${proj.id}/overview`)}
                      className="px-2.5 py-1 rounded bg-[#1C2632] hover:bg-[#1C2632]/80 text-[11px] font-mono text-[#A8B4C2] hover:text-[#EAF0F6] shrink-0 border border-[#A8B4C2]/15"
                    >
                      View Data
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

