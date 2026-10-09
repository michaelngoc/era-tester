"use client";

import React from "react";
import {
  Network,
  Kanban,
  Plus,
  Workflow,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Eye,
  GitCommit,
  Search,
  Rocket,
} from "lucide-react";

export interface DashboardStats {
  total: number;
  passed: number;
  bugs: number;
  fixing: number;
  verify: number;
  deploy?: number;
  gitImpacted: number;
  passRate: number;
}

export interface DashboardHeaderProps {
  userRole?: string;
  selectedProject: any;
  selectedModule: any;
  viewMode: "flow" | "kanban";
  onViewModeChange: (mode: "flow" | "kanban") => void;
  onOpenAddCaseModal: () => void;
  flows: any[];
  selectedFlow: any;
  onSelectFlow: (flow: any) => void;
  onDeleteFlow: (flow: any) => void;
  onOpenFlowModal: () => void;
  stats: DashboardStats;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export function DashboardHeader({
  userRole,
  selectedProject,
  selectedModule,
  viewMode,
  onViewModeChange,
  onOpenAddCaseModal,
  flows,
  selectedFlow,
  onSelectFlow,
  onDeleteFlow,
  onOpenFlowModal,
  stats,
  searchQuery,
  onSearchQueryChange,
}: DashboardHeaderProps) {
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isDev = userRole === "DEVELOPER";
  return (
    <div className="pb-4 mb-4 border-b border-slate-200 dark:border-slate-800/80 space-y-3">
      {/* Module Title & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {selectedModule?.name || "Chọn nhóm kiểm thử"}
            </h2>

            {selectedModule?.file_patterns?.length > 0 && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-slate-900 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/25">
                Git: {selectedModule.file_patterns.join(", ")}
              </span>
            )}

            {selectedModule?.assigned_tester_users?.length > 0 && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                QA:{" "}
                {selectedModule.assigned_tester_users
                  .map((u: any) => u.name || u.email)
                  .join(", ")}
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Dự án:{" "}
            <strong className="text-slate-800 dark:text-slate-200">
              {selectedProject?.name || "Chưa chọn"}
            </strong>
            {selectedProject?.github_repo && (
              <span className="ml-2 font-mono text-[11px] text-slate-400 dark:text-slate-500">
                ({selectedProject.github_repo})
              </span>
            )}
          </p>
        </div>

        {/* View Mode Switcher & Add Case Button */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner">
            <button
              onClick={() => onViewModeChange("flow")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                viewMode === "flow"
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Sơ Đồ Luồng (User Flow)</span>
            </button>

            <button
              onClick={() => onViewModeChange("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Bảng Trạng Thái (Kanban)</span>
            </button>
          </div>

          {!isDev && (
            <button
              onClick={onOpenAddCaseModal}
              disabled={!selectedModule}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-2xl transition-all shadow-lg shadow-sky-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Kịch Bản</span>
            </button>
          )}
        </div>
      </div>

      {/* User Flow Selector Strip */}
      <div className="p-2.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mr-1 shrink-0">
            <Workflow className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
            Luồng Thao Tác:
          </span>

          {flows.map((flow) => {
            const isCur = selectedFlow?.id === flow.id;
            return (
              <div
                key={flow.id}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 border ${
                  isCur
                    ? "bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-500/40 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
                onClick={() => onSelectFlow(flow)}
              >
                <span>{flow.title}</span>
                {flow.total_cases > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                    {flow.total_cases}
                  </span>
                )}

                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFlow(flow);
                    }}
                    title="Xóa Luồng Thao Tác này (Chỉ Super Admin)"
                    className="ml-1 text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {flows.length === 0 && (
            <span className="text-xs text-slate-400 dark:text-slate-500 italic">
              Chưa có Luồng thao tác nào
            </span>
          )}
        </div>

        {/* Action Buttons for User Flows */}
        {!isDev && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onOpenFlowModal()}
              disabled={!selectedModule}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-sky-700 dark:text-sky-400 bg-sky-50 hover:bg-sky-100 dark:bg-sky-500/10 dark:hover:bg-sky-500/20 border border-sky-200 dark:border-sky-500/25 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo Luồng Mới</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 shadow-sm">
          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
            Tổng Kịch Bản
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
            {stats.total}
          </div>
        </div>

        <div className="p-2.5 rounded-2xl bg-rose-50/50 dark:bg-slate-900/80 border border-rose-200 dark:border-slate-800/80">
          <div className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Lỗi Phát Sinh
          </div>
          <div className="text-lg font-bold font-mono text-rose-600 dark:text-rose-300">
            {stats.bugs}
          </div>
        </div>

        <div className="p-2.5 rounded-2xl bg-sky-50/50 dark:bg-slate-900/80 border border-sky-200 dark:border-slate-800/80">
          <div className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
            <Wrench className="w-3 h-3" />
            Đang Khắc Phục
          </div>
          <div className="text-lg font-bold font-mono text-sky-600 dark:text-sky-300">
            {stats.fixing}
          </div>
        </div>

        <div className="p-2.5 rounded-2xl bg-purple-50/50 dark:bg-slate-900/80 border border-purple-200 dark:border-slate-800/80">
          <div className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
            <Eye className="w-3 h-3" />
            Chờ Xác Minh
          </div>
          <div className="text-lg font-bold font-mono text-purple-600 dark:text-purple-300">
            {stats.verify}
          </div>
        </div>

        <div className="p-2.5 rounded-2xl bg-indigo-50/50 dark:bg-slate-900/80 border border-indigo-200 dark:border-slate-800/80">
          <div className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
            <Rocket className="w-3 h-3" />
            Chờ Deploy Prod
          </div>
          <div className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-300">
            {stats.deploy || 0}
          </div>
        </div>

        <div className="p-2.5 rounded-2xl bg-emerald-50/50 dark:bg-slate-900/80 border border-emerald-200 dark:border-slate-800/80">
          <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Đã Live Prod
          </div>
          <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-300">
            {stats.passed}
          </div>
        </div>

        <div className="p-2.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/40">
          <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
            <GitCommit className="w-3 h-3 animate-pulse" />
            Cần Kiểm Lại
          </div>
          <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-300">
            {stats.gitImpacted}
          </div>
        </div>
      </div>

      {/* Instant Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Tìm nhanh kịch bản kiểm thử theo tên, dữ liệu đầu vào, kết quả thực tế..."
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 transition shadow-inner"
        />
      </div>
    </div>
  );
}
