"use client";

import React from "react";
import FlowDiagram from "@/components/FlowDiagram";
import KanbanBoard from "@/components/KanbanBoard";
import { TestCase } from "@/components/CaseDetailModal";
import { Workflow, Sparkles } from "lucide-react";

export interface DashboardCanvasProps {
  loading: boolean;
  viewMode: "flow" | "kanban";
  selectedFlow: any;
  displayedCases: TestCase[];
  onSelectStep: (step: any) => void;
  onSaveFlowLayout: (nodes: any[], edges: any[]) => void;
  onSelectCase: (c: TestCase) => void;
  onStatusChange: (id: number, status: "NEW" | "FIX" | "VERIFY" | "CLOSED") => void;
  onAddNewCase: () => void;
  onClaimTask: (id: number, action: "claim_bug" | "claim_test") => void;
  onOpenFlowModal: (templateType: "login" | "custom") => void;
}

export function DashboardCanvas({
  loading,
  viewMode,
  selectedFlow,
  displayedCases,
  onSelectStep,
  onSaveFlowLayout,
  onSelectCase,
  onStatusChange,
  onAddNewCase,
  onClaimTask,
  onOpenFlowModal,
}: DashboardCanvasProps) {
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span>Đang tải dữ liệu kiểm thử...</span>
        </div>
      </div>
    );
  }

  if (viewMode === "flow") {
    if (selectedFlow) {
      return (
        <FlowDiagram
          cases={displayedCases}
          flowNodes={selectedFlow?.nodes}
          flowEdges={selectedFlow?.edges}
          onSelectStep={onSelectStep}
          onSaveFlow={onSaveFlowLayout}
        />
      );
    }

    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-300 dark:border-slate-800/80 rounded-3xl bg-white/50 dark:bg-slate-900/30">
        <Workflow className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-3" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-300">
          Chưa Có Luồng Thao Tác Cho Nhóm Này
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">
          Sơ đồ luồng (User Flow) giúp tester mô phỏng trực quan từng bước người dùng
          thao tác (VD: Vào trang đăng nhập ➔ Nhập tài khoản/mật khẩu ➔ Nhấn gửi ➔ Báo
          lỗi) và quản lý danh sách kịch bản kiểm thử từng bước.
        </p>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={() => onOpenFlowModal("login")}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-2xl shadow-lg transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Tạo Mẫu Luồng Đăng Nhập (4 bước & 8 kịch bản mẫu)</span>
          </button>
          <button
            onClick={() => onOpenFlowModal("custom")}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-2xl transition cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            Tạo Luồng Trống Tùy Chỉnh
          </button>
        </div>
      </div>
    );
  }

  return (
    <KanbanBoard
      cases={displayedCases}
      onSelectCase={onSelectCase}
      onStatusChange={onStatusChange}
      onAddNewCase={onAddNewCase}
      onClaimTask={onClaimTask}
    />
  );
}
