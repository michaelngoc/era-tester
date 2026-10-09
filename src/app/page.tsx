"use client";

import React, { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/Navbar";
import KanbanBoard from "@/components/KanbanBoard";
import FlowDiagram from "@/components/FlowDiagram";
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
  TrendingUp,
  Wrench,
  Eye,
  Terminal,
  Activity,
} from "lucide-react";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [cases, setCases] = useState<TestCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);

  const [viewMode, setViewMode] = useState<"flow" | "kanban">("flow");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal thêm module
  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  const [newModuleName, setNewModuleName] = useState("");
  const [newFilePatterns, setNewFilePatterns] = useState("");

  // Modal thêm test case
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
  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data?.projects) {
        setProjects(data.projects);
        if (!selectedProject && data.projects.length > 0) {
          setSelectedProject(data.projects[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // 3. Tải modules khi đổi project
  const fetchModules = async (projId: number) => {
    try {
      const res = await fetch(`/api/modules?projectId=${projId}`);
      const data = await res.json();
      if (data?.modules) {
        setModules(data.modules);
        if (data.modules.length > 0) {
          setSelectedModule(data.modules[0]);
        } else {
          setSelectedModule(null);
          setCases([]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedProject?.id) {
      fetchModules(selectedProject.id);
    }
  }, [selectedProject]);

  // 4. Tải test cases khi đổi module
  const fetchCases = async (modId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cases?moduleId=${modId}`);
      const data = await res.json();
      if (data?.cases) {
        setCases(data.cases);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedModule?.id) {
      fetchCases(selectedModule.id);
    }
  }, [selectedModule]);

  // Đổi trạng thái case
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

  // Tạo module mới
  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleName.trim() || !selectedProject?.id) return;

    try {
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject.id,
          name: newModuleName.trim(),
          filePatterns: newFilePatterns,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModuleModal(false);
        setNewModuleName("");
        setNewFilePatterns("");
        fetchModules(selectedProject.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Tạo test case mới
  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseTitle.trim() || !selectedModule?.id) return;

    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: selectedModule.id,
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
        setCases([data.case, ...cases]);
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
              <span className="text-[10px] font-mono text-slate-500 font-bold">
                {projects.length} PROJECTS
              </span>
            </div>

            <div className="space-y-1">
              {projects.map((p) => {
                const isActive = selectedProject?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProject(p)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                      isActive
                        ? "bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-600/25 border border-sky-400/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FolderGit2 className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-sky-400"}`} />
                      <span className="truncate">{p.name}</span>
                    </div>

                    {p.new_bugs > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-sm">
                        {p.new_bugs}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modules List Section */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Nhóm Test / Modules
              </span>

              <button
                onClick={() => setShowAddModuleModal(true)}
                title="Tạo nhóm kiểm thử mới"
                className="flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-semibold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {modules.map((m) => {
                const isSelected = selectedModule?.id === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModule(m)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? "bg-slate-800/90 text-sky-300 font-semibold border border-sky-500/30 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Layers className={`w-4 h-4 shrink-0 ${isSelected ? "text-sky-400" : "text-slate-500"}`} />
                      <span className="truncate">{m.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {m.count_git_impacted > 0 && (
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-slate-950 border border-slate-800 text-slate-400">
                        {m.total_cases || 0}
                      </span>
                    </div>
                  </button>
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
        <main className="flex-1 flex flex-col p-6 overflow-hidden">
          {/* Top Bar: Module Header & KPI Cards */}
          <div className="pb-5 mb-5 border-b border-slate-800/80 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {selectedModule?.name || "Chọn nhóm kiểm thử"}
                  </h2>

                  {selectedModule?.file_patterns?.length > 0 && (
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-lg bg-slate-900 text-sky-400 border border-sky-500/25">
                      Git: {selectedModule.file_patterns.join(", ")}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-1">
                  Dự án: <strong className="text-slate-200">{selectedProject?.name}</strong> • Tự động đối chiếu thay đổi mã nguồn từ nhánh <code>tester</code>.
                </p>
              </div>

              {/* View Mode Switcher & Add Button */}
              <div className="flex items-center gap-3">
                <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner">
                  <button
                    onClick={() => setViewMode("flow")}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                      viewMode === "flow"
                        ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Network className="w-3.5 h-3.5" />
                    <span>Sơ Đồ Mô Phỏng</span>
                  </button>

                  <button
                    onClick={() => setViewMode("kanban")}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
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
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-2xl transition-all shadow-lg shadow-sky-600/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Test Case</span>
                </button>
              </div>
            </div>

            {/* KPI Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                <div className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Tổng Kịch Bản
                </div>
                <div className="text-xl font-bold font-mono text-white">{stats.total}</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                <div className="text-[10.5px] font-semibold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Đã Pass
                </div>
                <div className="text-xl font-bold font-mono text-emerald-300">{stats.passed}</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                <div className="text-[10.5px] font-semibold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Báo Lỗi (New)
                </div>
                <div className="text-xl font-bold font-mono text-rose-300">{stats.bugs}</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                <div className="text-[10.5px] font-semibold text-sky-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Wrench className="w-3 h-3" />
                  Dev Đang Sửa
                </div>
                <div className="text-xl font-bold font-mono text-sky-300">{stats.fixing}</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                <div className="text-[10.5px] font-semibold text-purple-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  Chờ Xác Minh
                </div>
                <div className="text-xl font-bold font-mono text-purple-300">{stats.verify}</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-amber-900/40 bg-amber-950/10">
                <div className="text-[10.5px] font-semibold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <GitCommit className="w-3 h-3 animate-pulse" />
                  Cần Re-Test (Git)
                </div>
                <div className="text-xl font-bold font-mono text-amber-300">{stats.gitImpacted}</div>
              </div>
            </div>

            {/* Instant Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nhanh kịch bản kiểm thử theo tên, input, mã lỗi..."
                className="w-full pl-10 pr-4 py-2 bg-slate-900/90 border border-slate-800 rounded-2xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* View Canvas */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Đang tải dữ liệu kiểm thử...
              </div>
            ) : displayedCases.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800/80 rounded-3xl">
                <CheckCircle2 className="w-12 h-12 text-slate-600 mb-3" />
                <h3 className="text-sm font-bold text-slate-300">
                  {searchQuery ? "Không tìm thấy kịch bản phù hợp" : "Chưa có kịch bản kiểm thử"}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  {searchQuery
                    ? "Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc."
                    : "Bắt đầu bằng cách bấm nút 'Thêm Test Case' ở phía trên."}
                </p>
              </div>
            ) : viewMode === "flow" ? (
              <FlowDiagram cases={displayedCases} onSelectCase={(c) => setSelectedCase(c)} />
            ) : (
              <KanbanBoard
                cases={displayedCases}
                onSelectCase={(c) => setSelectedCase(c)}
                onStatusChange={handleStatusChange}
                onAddNewCase={() => setShowAddCaseModal(true)}
              />
            )}
          </div>
        </main>
      </div>

      {/* Modal Chi Tiết / Sửa Test Case */}
      <CaseDetailModal
        testCase={selectedCase}
        onClose={() => setSelectedCase(null)}
        onUpdate={(updated) => {
          setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          setSelectedCase(null);
        }}
        onDelete={(id) => {
          fetch(`/api/cases/${id}`, { method: "DELETE" }).then(() => {
            setCases((prev) => prev.filter((c) => c.id !== id));
            setSelectedCase(null);
          });
        }}
      />

      {/* Modal Thêm Module Mới */}
      {showAddModuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Tạo Nhóm Kiểm Thử Mới</h3>
            <form onSubmit={handleCreateModule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tên Nhóm (Module)
                </label>
                <input
                  type="text"
                  required
                  value={newModuleName}
                  onChange={(e) => setNewModuleName(e.target.value)}
                  placeholder="VD: Visual Article List Block hoặc Login Flow"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Quy Tắc File Git (File Patterns để nhận diện tự động)
                </label>
                <input
                  type="text"
                  value={newFilePatterns}
                  onChange={(e) => setNewFilePatterns(e.target.value)}
                  placeholder="client/**/article*, manage/**/article*"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                />
                <p className="text-[10.5px] text-slate-500 mt-1.5 leading-relaxed">
                  Khi Dev push vào nhánh <code>tester</code>, nếu có file khớp các pattern này thì hệ thống sẽ tự động bật cảnh báo cho Tester!
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModuleModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-2xl shadow-md cursor-pointer"
                >
                  Tạo Nhóm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm Test Case Mới */}
      {showAddCaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Thêm Bước / Kịch Bản Kiểm Thử</h3>
            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tiêu Đề Kịch Bản / Flow Step
                </label>
                <input
                  type="text"
                  required
                  value={newCaseTitle}
                  onChange={(e) => setNewCaseTitle(e.target.value)}
                  placeholder="VD: Kiểm tra lọc bài viết theo danh mục Tin Tức"
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
                  placeholder="category_id = 5, page = 1"
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
                    placeholder="Hiển thị đúng 10 bài viết thuộc category 5"
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
                    placeholder="Không load được bài viết, báo lỗi màn hình trắng"
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
