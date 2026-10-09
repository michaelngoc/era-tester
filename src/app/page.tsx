"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Navbar from "@/components/Navbar";
import KanbanBoard from "@/components/KanbanBoard";
import FlowDiagram from "@/components/FlowDiagram";
import StepChecklistDrawer from "@/components/StepChecklistDrawer";
import CaseDetailModal, { TestCase } from "@/components/CaseDetailModal";
import {
  FolderGit2,
  Layers,
  Plus,
  GitCommit,
  Network,
  Kanban,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  Wrench,
  Eye,
  Pencil,
  Trash2,
  Workflow,
} from "lucide-react";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);

  // Projects state
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projectModal, setProjectModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    data?: any;
  }>({ open: false, mode: "create" });
  const [projectName, setProjectName] = useState("");
  const [projectSlug, setProjectSlug] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectRepo, setProjectRepo] = useState("");

  // Modules state
  const [modules, setModules] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [moduleModal, setModuleModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    data?: any;
  }>({ open: false, mode: "create" });
  const [moduleName, setModuleName] = useState("");
  const [modulePatterns, setModulePatterns] = useState("");

  // Flows state
  const [flows, setFlows] = useState<any[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<any>(null);
  const [flowModal, setFlowModal] = useState<{
    open: boolean;
    title: string;
    templateType: "login" | "custom";
  }>({ open: false, title: "", templateType: "login" });

  // Test Cases state
  const [cases, setCases] = useState<TestCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [selectedStep, setSelectedStep] = useState<{
    id: string;
    title: string;
    description?: string;
  } | null>(null);

  // View & Search
  const [viewMode, setViewMode] = useState<"flow" | "kanban">("flow");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal thêm test case thông thường
  const [showAddCaseModal, setShowAddCaseModal] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [newCaseInput, setNewCaseInput] = useState("");
  const [newCaseExpected, setNewCaseExpected] = useState("");
  const [newCaseActual, setNewCaseActual] = useState("");

  // 1. Kiểm tra session
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) window.location.href = "/login";
        return res.json();
      })
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {
        window.location.href = "/login";
      });
  }, []);

  // 2. Tải danh sách projects
  const fetchProjects = useCallback(async (selectId?: number) => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data?.projects) {
        setProjects(data.projects);
        if (selectId) {
          const match = data.projects.find((p: any) => p.id === selectId);
          if (match) setSelectedProject(match);
        } else if (data.projects.length > 0 && !selectedProject) {
          setSelectedProject(data.projects[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedProject]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // 3. Tải modules khi đổi project
  const fetchModules = useCallback(async (projId: number, selectId?: number) => {
    try {
      const res = await fetch(`/api/modules?projectId=${projId}`);
      const data = await res.json();
      if (data?.modules) {
        setModules(data.modules);
        if (selectId) {
          const match = data.modules.find((m: any) => m.id === selectId);
          if (match) setSelectedModule(match);
        } else if (data.modules.length > 0) {
          setSelectedModule(data.modules[0]);
        } else {
          setSelectedModule(null);
          setFlows([]);
          setSelectedFlow(null);
          setCases([]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (selectedProject?.id) {
      fetchModules(selectedProject.id);
    }
  }, [selectedProject, fetchModules]);

  // 4. Tải flows & cases khi đổi module
  const fetchFlowsAndCases = useCallback(async (modId: number) => {
    setLoading(true);
    try {
      const [flowsRes, casesRes] = await Promise.all([
        fetch(`/api/flows?moduleId=${modId}`),
        fetch(`/api/cases?moduleId=${modId}`),
      ]);

      const flowsData = await flowsRes.json();
      const casesData = await casesRes.json();

      if (flowsData?.flows) {
        setFlows(flowsData.flows);
        if (flowsData.flows.length > 0) {
          setSelectedFlow(flowsData.flows[0]);
        } else {
          setSelectedFlow(null);
        }
      }

      if (casesData?.cases) {
        setCases(casesData.cases);
      } else {
        setCases([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedModule?.id) {
      fetchFlowsAndCases(selectedModule.id);
    }
  }, [selectedModule, fetchFlowsAndCases]);

  // Tải lại test cases
  const reloadCases = async () => {
    if (!selectedModule?.id) return;
    try {
      const res = await fetch(`/api/cases?moduleId=${selectedModule.id}`);
      const data = await res.json();
      if (data?.cases) setCases(data.cases);
    } catch (e) {
      console.error(e);
    }
  };

  // --- THAO TÁC PROJECT CRUD ---
  const handleOpenCreateProject = () => {
    setProjectName("");
    setProjectSlug("");
    setProjectDesc("");
    setProjectRepo("");
    setProjectModal({ open: true, mode: "create" });
  };

  const handleOpenEditProject = (proj: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectName(proj.name || "");
    setProjectSlug(proj.slug || "");
    setProjectDesc(proj.description || "");
    setProjectRepo(proj.github_repo || "");
    setProjectModal({ open: true, mode: "edit", data: proj });
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    try {
      if (projectModal.mode === "create") {
        const slug = projectSlug.trim() || projectName.trim().toLowerCase().replace(/[^a-z0-9]/g, "-");
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: projectName.trim(),
            slug,
            description: projectDesc,
            githubRepo: projectRepo,
          }),
        });
        const data = await res.json();
        if (data.success && data.project) {
          setProjectModal({ open: false, mode: "create" });
          await fetchProjects(data.project.id);
        }
      } else {
        const id = projectModal.data.id;
        const res = await fetch(`/api/projects/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: projectName.trim(),
            slug: projectSlug.trim(),
            description: projectDesc,
            githubRepo: projectRepo,
          }),
        });
        const data = await res.json();
        if (data.success && data.project) {
          setProjectModal({ open: false, mode: "edit" });
          await fetchProjects(id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProject = async (proj: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = confirm(
      `CẢNH BÁO: Bạn có chắc chắn muốn xóa dự án "${proj.name}"?\nToàn bộ nhóm kiểm thử, user flow và checklist liên quan sẽ bị xóa vĩnh viễn!`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/projects/${proj.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        if (selectedProject?.id === proj.id) {
          setSelectedProject(null);
        }
        await fetchProjects();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- THAO TÁC MODULE CRUD ---
  const handleOpenCreateModule = () => {
    setModuleName("");
    setModulePatterns("");
    setModuleModal({ open: true, mode: "create" });
  };

  const handleOpenEditModule = (mod: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setModuleName(mod.name || "");
    setModulePatterns(Array.isArray(mod.file_patterns) ? mod.file_patterns.join(", ") : "");
    setModuleModal({ open: true, mode: "edit", data: mod });
  };

  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleName.trim() || !selectedProject?.id) return;

    try {
      if (moduleModal.mode === "create") {
        const res = await fetch("/api/modules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: selectedProject.id,
            name: moduleName.trim(),
            filePatterns: modulePatterns,
          }),
        });
        const data = await res.json();
        if (data.success && data.module) {
          setModuleModal({ open: false, mode: "create" });
          await fetchModules(selectedProject.id, data.module.id);
        }
      } else {
        const id = moduleModal.data.id;
        const res = await fetch(`/api/modules/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: moduleName.trim(),
            filePatterns: modulePatterns,
          }),
        });
        const data = await res.json();
        if (data.success && data.module) {
          setModuleModal({ open: false, mode: "edit" });
          await fetchModules(selectedProject.id, id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteModule = async (mod: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = confirm(
      `Bạn có chắc muốn xóa nhóm kiểm thử "${mod.name}" và toàn bộ user flows của nó?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/modules/${mod.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        if (selectedModule?.id === mod.id) {
          setSelectedModule(null);
        }
        await fetchModules(selectedProject.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- THAO TÁC USER FLOW CRUD ---
  const handleCreateFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flowModal.title.trim() || !selectedModule?.id) return;

    try {
      const res = await fetch("/api/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: selectedModule.id,
          title: flowModal.title.trim(),
          templateType: flowModal.templateType,
        }),
      });
      const data = await res.json();
      if (data.success && data.flow) {
        setFlowModal({ open: false, title: "", templateType: "login" });
        await fetchFlowsAndCases(selectedModule.id);
        setSelectedFlow(data.flow);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFlow = async (flow: any) => {
    const confirmed = confirm(`Bạn có chắc muốn xóa sơ đồ User Flow "${flow.title}"?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/flows/${flow.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await fetchFlowsAndCases(selectedModule.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveFlowLayout = async (nodes: any[], edges: any[]) => {
    if (!selectedFlow?.id) return;
    try {
      await fetch(`/api/flows/${selectedFlow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges }),
      });
      setSelectedFlow((prev: any) => ({ ...prev, nodes, edges }));
    } catch (err) {
      console.error("Lỗi lưu sơ đồ:", err);
    }
  };

  const handleDeleteStepFromFlow = async (stepId: string) => {
    if (!selectedFlow?.id) return;
    const currentNodes = selectedFlow.nodes || [];
    const currentEdges = selectedFlow.edges || [];
    const nextNodes = currentNodes.filter((n: any) => n.id !== stepId);
    const nextEdges = currentEdges.filter(
      (e: any) => e.source !== stepId && e.target !== stepId
    );
    await handleSaveFlowLayout(nextNodes, nextEdges);
    setSelectedStep(null);
  };

  // --- THAO TÁC TEST CASES & CHECKLISTS ---
  const handleStatusChange = async (
    id: number,
    nextStatus: "NEW" | "FIX" | "VERIFY" | "CLOSED"
  ) => {
    try {
      const res = await fetch(`/api/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success && data.case) {
        setCases((prev) => prev.map((c) => (c.id === id ? data.case : c)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClaimTask = async (id: number, action: "claim_bug" | "claim_test") => {
    try {
      const res = await fetch(`/api/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success && data.case) {
        setCases((prev) => prev.map((c) => (c.id === id ? data.case : c)));
        if (selectedCase?.id === id) setSelectedCase(data.case);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddChecklistCase = async (newCase: Partial<TestCase>) => {
    if (!selectedModule?.id) return;
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newCase,
          moduleId: selectedModule.id,
          flowId: selectedFlow?.id || null,
        }),
      });
      const data = await res.json();
      if (data.success && data.case) {
        setCases((prev) => [data.case, ...prev]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCase = async (id: number) => {
    try {
      await fetch(`/api/cases/${id}`, { method: "DELETE" });
      setCases((prev) => prev.filter((c) => c.id !== id));
      if (selectedCase?.id === id) setSelectedCase(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCaseDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseTitle.trim() || !selectedModule?.id) return;

    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: selectedModule.id,
          flowId: selectedFlow?.id || null,
          nodeId: selectedStep?.id || (selectedFlow?.nodes?.[0]?.id ?? "step-1"),
          title: newCaseTitle.trim(),
          inputData: newCaseInput,
          expectedResult: newCaseExpected,
          actualResult: newCaseActual,
          status: "NEW",
        }),
      });
      const data = await res.json();
      if (data.success && data.case) {
        setShowAddCaseModal(false);
        setNewCaseTitle("");
        setNewCaseInput("");
        setNewCaseExpected("");
        setNewCaseActual("");
        setCases((prev) => [data.case, ...prev]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Lọc test cases theo từ khóa tìm kiếm
  const displayedCases = useMemo(() => {
    if (!searchQuery.trim()) return cases;
    const q = searchQuery.toLowerCase();
    return cases.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.input_data?.toLowerCase().includes(q) ||
        c.actual_result?.toLowerCase().includes(q) ||
        String(c.id).includes(q)
    );
  }, [cases, searchQuery]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = cases.length;
    const passed = cases.filter((c) => c.status === "CLOSED").length;
    const bugs = cases.filter((c) => c.status === "NEW").length;
    const fixing = cases.filter((c) => c.status === "FIX").length;
    const verify = cases.filter((c) => c.status === "VERIFY").length;
    const gitImpacted = cases.filter((c) => c.is_impacted_by_git).length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 100;

    return { total, passed, bugs, fixing, verify, gitImpacted, passRate };
  }, [cases]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col selection:bg-sky-500 selection:text-white">
      <Navbar user={user} />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Projects & Modules */}
        <aside className="w-80 bg-slate-900/60 backdrop-blur-xl border-r border-slate-800/80 flex flex-col shrink-0">
          {/* Projects Select Section */}
          <div className="p-4 border-b border-slate-800/80">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Dự Án Đang Kiểm Thử
              </span>
              <button
                onClick={handleOpenCreateProject}
                title="Tạo dự án mới"
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </button>
            </div>

            <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
              {projects.map((p) => {
                const isActive = selectedProject?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProject(p)}
                    className={`group w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                      isActive
                        ? "bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-600/25 border border-sky-400/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FolderGit2
                        className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-sky-400"}`}
                      />
                      <span className="truncate">{p.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {p.new_bugs > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-sm">
                          {p.new_bugs}
                        </span>
                      )}

                      {/* Quick Edit & Delete Project buttons */}
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditProject(p, e)}
                          title="Sửa dự án"
                          className="p-1 hover:bg-white/20 rounded transition text-slate-300 hover:text-white"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteProject(p, e)}
                          title="Xóa dự án"
                          className="p-1 hover:bg-rose-500/30 rounded transition text-slate-300 hover:text-rose-200"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {projects.length === 0 && (
                <div className="text-center py-4 text-xs text-slate-500 border border-dashed border-slate-800/80 rounded-2xl">
                  Chưa có dự án nào. Bấm &quot;Thêm&quot; để tạo.
                </div>
              )}
            </div>
          </div>

          {/* Modules List Section */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Nhóm Test / Modules
              </span>

              <button
                onClick={handleOpenCreateModule}
                title="Tạo nhóm kiểm thử mới"
                disabled={!selectedProject}
                className="flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-semibold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 disabled:opacity-40 border border-sky-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {modules.map((m) => {
                const isSelected = selectedModule?.id === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedModule(m)}
                    className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? "bg-slate-800/90 text-sky-300 font-semibold border border-sky-500/30 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Layers
                        className={`w-4 h-4 shrink-0 ${isSelected ? "text-sky-400" : "text-slate-500"}`}
                      />
                      <span className="truncate">{m.name}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {m.count_git_impacted > 0 && (
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-slate-950 border border-slate-800 text-slate-400">
                        {m.total_cases || 0}
                      </span>

                      {/* Edit & Delete Module buttons */}
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditModule(m, e)}
                          title="Sửa nhóm test"
                          className="p-1 hover:bg-slate-700 rounded transition text-slate-400 hover:text-sky-300"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteModule(m, e)}
                          title="Xóa nhóm test"
                          className="p-1 hover:bg-slate-700 rounded transition text-slate-400 hover:text-rose-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {modules.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800/80 rounded-2xl">
                  Chưa có nhóm test nào.
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Center Main Stage */}
        <main className="flex-1 flex flex-col p-5 overflow-hidden">
          {/* Top Bar: Module Title & Flow Selector */}
          <div className="pb-4 mb-4 border-b border-slate-800/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    {selectedModule?.name || "Chọn nhóm kiểm thử"}
                  </h2>

                  {selectedModule?.file_patterns?.length > 0 && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-slate-900 text-sky-400 border border-sky-500/25">
                      Git: {selectedModule.file_patterns.join(", ")}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-0.5">
                  Dự án: <strong className="text-slate-200">{selectedProject?.name || "Chưa chọn"}</strong>
                  {selectedProject?.github_repo && (
                    <span className="ml-2 font-mono text-[11px] text-slate-500">
                      ({selectedProject.github_repo})
                    </span>
                  )}
                </p>
              </div>

              {/* View Mode Switcher & Add Button */}
              <div className="flex items-center gap-2.5">
                <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner">
                  <button
                    onClick={() => setViewMode("flow")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                      viewMode === "flow"
                        ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Network className="w-3.5 h-3.5" />
                    <span>Sơ Đồ User Flow</span>
                  </button>

                  <button
                    onClick={() => setViewMode("kanban")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                      viewMode === "kanban"
                        ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Kanban className="w-3.5 h-3.5" />
                    <span>Bảng Trạng Thái</span>
                  </button>
                </div>

                <button
                  onClick={() => setShowAddCaseModal(true)}
                  disabled={!selectedModule}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-2xl transition-all shadow-lg shadow-sky-600/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Test Case</span>
                </button>
              </div>
            </div>

            {/* User Flow Selector Strip */}
            <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 overflow-x-auto py-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mr-1 shrink-0">
                  <Workflow className="w-3.5 h-3.5 text-sky-400" />
                  User Flow:
                </span>

                {flows.map((flow) => {
                  const isCur = selectedFlow?.id === flow.id;
                  return (
                    <div
                      key={flow.id}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 border ${
                        isCur
                          ? "bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                      }`}
                      onClick={() => setSelectedFlow(flow)}
                    >
                      <span>{flow.title}</span>
                      {flow.total_cases > 0 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400">
                          {flow.total_cases}
                        </span>
                      )}

                      {/* Nút xóa flow */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFlow(flow);
                        }}
                        title="Xóa User Flow này"
                        className="ml-1 text-slate-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}

                {flows.length === 0 && (
                  <span className="text-xs text-slate-500 italic">Chưa có User Flow nào</span>
                )}
              </div>

              {/* Nút Tạo User Flow & Template Login Mẫu */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() =>
                    setFlowModal({
                      open: true,
                      title: "Luồng Đăng Nhập & Validate Form",
                      templateType: "login",
                    })
                  }
                  disabled={!selectedModule}
                  title="Tạo sẵn mẫu Login: 4 bước và 8 kịch bản testcases cho ô input, nút login, báo lỗi sai pass..."
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+ Mẫu Flow Đăng Nhập</span>
                </button>

                <button
                  onClick={() =>
                    setFlowModal({
                      open: true,
                      title: "",
                      templateType: "custom",
                    })
                  }
                  disabled={!selectedModule}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo Flow Mới</span>
                </button>
              </div>
            </div>

            {/* KPI Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                  Tổng Kịch Bản
                </div>
                <div className="text-lg font-bold font-mono text-white">{stats.total}</div>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Đã Pass
                </div>
                <div className="text-lg font-bold font-mono text-emerald-300">{stats.passed}</div>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                <div className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Báo Lỗi (New)
                </div>
                <div className="text-lg font-bold font-mono text-rose-300">{stats.bugs}</div>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                <div className="text-[10px] font-semibold text-sky-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                  <Wrench className="w-3 h-3" />
                  Dev Đang Sửa
                </div>
                <div className="text-lg font-bold font-mono text-sky-300">{stats.fixing}</div>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                <div className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  Chờ Xác Minh
                </div>
                <div className="text-lg font-bold font-mono text-purple-300">{stats.verify}</div>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-amber-900/40 bg-amber-950/10">
                <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                  <GitCommit className="w-3 h-3 animate-pulse" />
                  Cần Re-Test (Git)
                </div>
                <div className="text-lg font-bold font-mono text-amber-300">{stats.gitImpacted}</div>
              </div>
            </div>

            {/* Instant Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nhanh kịch bản kiểm thử theo tên, input, kết quả thực tế..."
                className="w-full pl-10 pr-4 py-2 bg-slate-900/90 border border-slate-800 rounded-2xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition shadow-inner"
              />
            </div>
          </div>

          {/* View Canvas */}
          <div className="flex-1 overflow-hidden relative">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Đang tải dữ liệu kiểm thử...
              </div>
            ) : viewMode === "flow" ? (
              selectedFlow ? (
                <FlowDiagram
                  cases={displayedCases}
                  flowNodes={selectedFlow?.nodes}
                  flowEdges={selectedFlow?.edges}
                  onSelectStep={(step) => setSelectedStep(step)}
                  onSaveFlow={(nodes, edges) => handleSaveFlowLayout(nodes, edges)}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800/80 rounded-3xl bg-slate-900/30">
                  <Workflow className="w-12 h-12 text-slate-600 mb-3" />
                  <h3 className="text-sm font-bold text-slate-300">
                    Chưa Có User Flow Cho Nhóm Này
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">
                    User Flow giúp tester mô phỏng trực quan từng bước người dùng thao tác (VD: Vào trang login ➔ Nhập user/pass ➔ Nhấn submit ➔ Báo lỗi) và quản lý checklist kiểm thử từng bước.
                  </p>
                  <div className="flex items-center gap-3 mt-4">
                    <button
                      onClick={() =>
                        setFlowModal({
                          open: true,
                          title: "Luồng Đăng Nhập & Validate Form",
                          templateType: "login",
                        })
                      }
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-2xl shadow-lg transition cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Tạo Mẫu Flow Đăng Nhập (Có sẵn 4 bước & 8 testcase)</span>
                    </button>
                    <button
                      onClick={() =>
                        setFlowModal({
                          open: true,
                          title: "",
                          templateType: "custom",
                        })
                      }
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-2xl transition cursor-pointer"
                    >
                      Tạo Flow Trống Tùy Chỉnh
                    </button>
                  </div>
                </div>
              )
            ) : (
              <KanbanBoard
                cases={displayedCases}
                onSelectCase={(c) => setSelectedCase(c)}
                onStatusChange={handleStatusChange}
                onAddNewCase={() => setShowAddCaseModal(true)}
                onClaimTask={handleClaimTask}
              />
            )}
          </div>
        </main>
      </div>

      {/* Drawer Xem Chi Tiết Bước & Danh Sách Checklist Testcase Của Bước */}
      <StepChecklistDrawer
        step={selectedStep}
        cases={cases}
        moduleId={selectedModule?.id || 0}
        flowId={selectedFlow?.id || null}
        onClose={() => setSelectedStep(null)}
        onSelectCase={(c) => setSelectedCase(c)}
        onAddCase={handleAddChecklistCase}
        onStatusChange={handleStatusChange}
        onDeleteCase={handleDeleteCase}
        onDeleteStep={handleDeleteStepFromFlow}
        onClaimTask={handleClaimTask}
      />

      {/* Modal Chi Tiết / Sửa Test Case Toàn Diện */}
      <CaseDetailModal
        testCase={selectedCase}
        onClose={() => setSelectedCase(null)}
        onUpdate={(updated) => {
          setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          setSelectedCase(null);
        }}
        onDelete={(id) => {
          handleDeleteCase(id);
          setSelectedCase(null);
        }}
      />

      {/* Modal Tạo / Sửa Dự Án (Project) */}
      {projectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">
              {projectModal.mode === "create" ? "Tạo Dự Án Mới" : "Chỉnh Sửa Dự Án"}
            </h3>
            <form onSubmit={handleSaveProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tên Dự Án (Bắt buộc)
                </label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="VD: Era Web Client hoặc Gemsocial App"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Slug / Mã Định Danh
                </label>
                <input
                  type="text"
                  value={projectSlug}
                  onChange={(e) => setProjectSlug(e.target.value)}
                  placeholder="VD: client, manage, gemsocial"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  GitHub Repository (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={projectRepo}
                  onChange={(e) => setProjectRepo(e.target.value)}
                  placeholder="VD: michaelngoc/era-tester"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mô Tả Dự Án
                </label>
                <textarea
                  rows={2}
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="Mô tả phạm vi hoặc đối tượng kiểm thử của dự án"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProjectModal({ open: false, mode: "create" })}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-2xl shadow-md cursor-pointer"
                >
                  {projectModal.mode === "create" ? "Tạo Dự Án" : "Lưu Thay Đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tạo / Sửa Nhóm Test (Module) */}
      {moduleModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">
              {moduleModal.mode === "create" ? "Tạo Nhóm Kiểm Thử Mới" : "Chỉnh Sửa Nhóm Kiểm Thử"}
            </h3>
            <form onSubmit={handleSaveModule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tên Nhóm (Module)
                </label>
                <input
                  type="text"
                  required
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  placeholder="VD: Authentication / Login Flow hoặc Article Block"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Quy Tắc File Git (File Patterns để nhận diện tự động)
                </label>
                <input
                  type="text"
                  value={modulePatterns}
                  onChange={(e) => setModulePatterns(e.target.value)}
                  placeholder="src/app/login/**, src/components/auth/**"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                />
                <p className="text-[10.5px] text-slate-500 mt-1.5 leading-relaxed">
                  Khi Dev push vào nhánh <code>tester</code>, các file thay đổi khớp mẫu này sẽ tự động bật cờ cảnh báo Re-test cho Tester!
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModuleModal({ open: false, mode: "create" })}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-2xl shadow-md cursor-pointer"
                >
                  {moduleModal.mode === "create" ? "Tạo Nhóm" : "Lưu Thay Đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tạo User Flow Mới */}
      {flowModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Tạo Sơ Đồ User Flow Mới</h3>
            <p className="text-xs text-slate-400 mb-4">
              Nhóm: <strong className="text-slate-200">{selectedModule?.name}</strong>
            </p>

            <form onSubmit={handleCreateFlow} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tiêu Đề User Flow
                </label>
                <input
                  type="text"
                  required
                  value={flowModal.title}
                  onChange={(e) => setFlowModal({ ...flowModal, title: e.target.value })}
                  placeholder="VD: Luồng Đăng Nhập & Phân Quyền"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Chọn Loại Template Sơ Đồ
                </label>
                <div className="space-y-2">
                  <label
                    onClick={() => setFlowModal({ ...flowModal, templateType: "login" })}
                    className={`flex items-start gap-3 p-3 rounded-2xl border transition cursor-pointer ${
                      flowModal.templateType === "login"
                        ? "bg-sky-500/10 border-sky-500 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-100">
                        Template Đăng Nhập (Khuyên Dùng)
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        Tự sinh sẵn 4 bước chuẩn (Mở /login ➔ Nhập email/pass ➔ Nhấn nút login ➔ Xử lý kết quả) kèm 8 checklist kịch bản testcase chi tiết (bỏ trống ô input, mật khẩu ngắn, nút quay loading, báo lỗi sai pass, v.v.).
                      </div>
                    </div>
                  </label>

                  <label
                    onClick={() => setFlowModal({ ...flowModal, templateType: "custom" })}
                    className={`flex items-start gap-3 p-3 rounded-2xl border transition cursor-pointer ${
                      flowModal.templateType === "custom"
                        ? "bg-sky-500/10 border-sky-500 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <Workflow className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-100">
                        Tùy Chỉnh (Custom Flow Trống)
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        Khởi tạo sơ đồ cơ bản để bạn tự do tạo thêm các bước thao tác và checklist riêng biệt.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFlowModal({ ...flowModal, open: false })}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold rounded-2xl shadow-md cursor-pointer"
                >
                  Tạo User Flow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm Test Case Nhanh */}
      {showAddCaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Thêm Bước / Kịch Bản Kiểm Thử</h3>
            <form onSubmit={handleCreateCaseDirect} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tiêu Đề Kịch Bản / Flow Step
                </label>
                <input
                  type="text"
                  required
                  value={newCaseTitle}
                  onChange={(e) => setNewCaseTitle(e.target.value)}
                  placeholder="VD: Kiểm tra validate bỏ trống ô Email hoặc nút Login"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Dữ Liệu Đầu Vào (Input)
                </label>
                <input
                  type="text"
                  value={newCaseInput}
                  onChange={(e) => setNewCaseInput(e.target.value)}
                  placeholder="email: '', password: '123'"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Kết Quả Mong Đợi (Expected)
                  </label>
                  <textarea
                    rows={2}
                    value={newCaseExpected}
                    onChange={(e) => setNewCaseExpected(e.target.value)}
                    placeholder="Hiển thị thông báo đỏ yêu cầu nhập email"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Kết Quả Thực Tế (Nếu lỗi)
                  </label>
                  <textarea
                    rows={2}
                    value={newCaseActual}
                    onChange={(e) => setNewCaseActual(e.target.value)}
                    placeholder="Không có thông báo nào xuất hiện"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCaseModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-2xl shadow-md cursor-pointer"
                >
                  Thêm Kịch Bản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
