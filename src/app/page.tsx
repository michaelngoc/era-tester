"use client";

import React, { useState, useEffect } from "react";
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
  AlertTriangle,
  FolderPlus,
} from "lucide-react";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [cases, setCases] = useState<TestCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);

  const [viewMode, setViewMode] = useState<"kanban" | "flow">("flow");
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

  const gitImpactedCount = cases.filter((c) => c.is_impacted_by_git).length;
  const newBugsCount = cases.filter((c) => c.status === "NEW").length;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar user={user} />

      {/* Main workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Projects & Modules */}
        <aside className="w-72 bg-slate-900/60 border-r border-slate-800 flex flex-col shrink-0">
          {/* Projects Select */}
          <div className="p-4 border-b border-slate-800">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Dự Án Đang Kiểm Thử
            </label>
            <div className="space-y-1">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProject(p)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    selectedProject?.id === p.id
                      ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="w-3.5 h-3.5" />
                    <span>{p.name}</span>
                  </div>
                  {p.new_bugs > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white">
                      {p.new_bugs}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Modules List */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Nhóm Test / Modules
              </label>
              <button
                onClick={() => setShowAddModuleModal(true)}
                title="Tạo nhóm test mới"
                className="p-1 rounded-lg text-sky-400 hover:bg-sky-500/10 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              {modules.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModule(m)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                    selectedModule?.id === m.id
                      ? "bg-slate-800 text-sky-400 font-semibold border border-slate-700"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Layers className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                    <span className="truncate">{m.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {m.count_git_impacted > 0 && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                    <span className="text-[10px] text-slate-500">{m.total_cases || 0}</span>
                  </div>
                </button>
              ))}

              {modules.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-500">
                  Chưa có nhóm test nào. Bấm [+] để tạo mới.
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Center Main Stage */}
        <main className="flex-1 flex flex-col p-6 overflow-hidden">
          {/* Top Bar: Module Title & Stats & Switch View */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {selectedModule?.name || "Chọn một nhóm test"}
                </h2>
                {selectedModule?.file_patterns?.length > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                    Git Rule: {selectedModule.file_patterns.join(", ")}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                <span>Tổng test case: <strong>{cases.length}</strong></span>
                <span className="text-rose-400">Lỗi (New): <strong>{newBugsCount}</strong></span>
                {gitImpactedCount > 0 && (
                  <span className="flex items-center gap-1 text-amber-400 font-semibold animate-pulse">
                    <GitCommit className="w-3.5 h-3.5" />
                    Cần re-test do Git: {gitImpactedCount}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Toggle Sơ đồ mô phỏng vs Kanban */}
              <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
                <button
                  onClick={() => setViewMode("flow")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    viewMode === "flow"
                      ? "bg-sky-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  Sơ Đồ Mô Phỏng
                </button>

                <button
                  onClick={() => setViewMode("kanban")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    viewMode === "kanban"
                      ? "bg-sky-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Kanban className="w-3.5 h-3.5" />
                  Bảng Trạng Thái
                </button>
              </div>

              {/* Button Tạo Case */}
              <button
                onClick={() => setShowAddCaseModal(true)}
                disabled={!selectedModule}
                className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-sky-600/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Thêm Test Case
              </button>
            </div>
          </div>

          {/* View Canvas */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Đang tải dữ liệu kiểm thử...
              </div>
            ) : cases.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-2xl">
                <CheckCircle2 className="w-10 h-10 text-slate-600 mb-2" />
                <h3 className="text-sm font-semibold text-slate-300">Nhóm này chưa có kịch bản test</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Tạo các bước kiểm thử hoặc user flow bằng nút "Thêm Test Case" ở góc trên.
                </p>
              </div>
            ) : viewMode === "flow" ? (
              <FlowDiagram cases={cases} onSelectCase={(c) => setSelectedCase(c)} />
            ) : (
              <KanbanBoard
                cases={cases}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Tạo Nhóm Kiểm Thử Mới</h3>
            <form onSubmit={handleCreateModule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tên nhóm (Module)
                </label>
                <input
                  type="text"
                  required
                  value={newModuleName}
                  onChange={(e) => setNewModuleName(e.target.value)}
                  placeholder="VD: Visual Article List Block hoặc Login Flow"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Quy tắc file Git (File Patterns để nhận diện tự động)
                </label>
                <input
                  type="text"
                  value={newFilePatterns}
                  onChange={(e) => setNewFilePatterns(e.target.value)}
                  placeholder="client/**/article*, manage/**/article*"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Khi Dev push vào nhánh tester, nếu có file khớp các pattern này thì hệ thống sẽ tự động bật cảnh báo cho Tester!
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModuleModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl shadow-md cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Thêm Bước / Kịch Bản Kiểm Thử</h3>
            <form onSubmit={handleCreateCase} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tiêu đề bước kiểm thử / Flow
                </label>
                <input
                  type="text"
                  required
                  value={newCaseTitle}
                  onChange={(e) => setNewCaseTitle(e.target.value)}
                  placeholder="VD: Kiểm tra lọc bài viết theo danh mục Tin Tức"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Dữ liệu đầu vào (Input)
                </label>
                <input
                  type="text"
                  value={newCaseInput}
                  onChange={(e) => setNewCaseInput(e.target.value)}
                  placeholder="category_id = 5, page = 1"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Kết quả mong đợi (Expected)
                  </label>
                  <textarea
                    rows={2}
                    value={newCaseExpected}
                    onChange={(e) => setNewCaseExpected(e.target.value)}
                    placeholder="Hiển thị đúng 10 bài viết thuộc category 5"
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Kết quả thực tế (Nếu đang có Bug)
                  </label>
                  <textarea
                    rows={2}
                    value={newCaseActual}
                    onChange={(e) => setNewCaseActual(e.target.value)}
                    placeholder="Không load được bài viết, báo lỗi màn hình trắng"
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCaseModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl shadow-md cursor-pointer"
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
