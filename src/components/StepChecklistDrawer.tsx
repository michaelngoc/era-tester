"use client";

import React, { useState } from "react";
import { TestCase } from "./CaseDetailModal";
import {
  X,
  Plus,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Eye,
  Trash2,
  Sparkles,
} from "lucide-react";

interface StepChecklistDrawerProps {
  step: {
    id: string;
    title: string;
    description?: string;
  } | null;
  cases: TestCase[];
  moduleId: number;
  flowId?: number | null;
  onClose: () => void;
  onSelectCase: (testCase: TestCase) => void;
  onAddCase: (newCase: Partial<TestCase>) => Promise<void>;
  onStatusChange: (id: number, nextStatus: "NEW" | "FIX" | "VERIFY" | "CLOSED") => void;
  onDeleteCase: (id: number) => void;
  onDeleteStep?: (stepId: string) => void;
  onClaimTask?: (id: number, action: "claim_bug" | "claim_test") => void;
}

export default function StepChecklistDrawer({
  step,
  cases,
  moduleId,
  flowId,
  onClose,
  onSelectCase,
  onAddCase,
  onStatusChange,
  onDeleteCase,
  onDeleteStep,
  onClaimTask,
}: StepChecklistDrawerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newInput, setNewInput] = useState("");
  const [newExpected, setNewExpected] = useState("");
  const [newActual, setNewActual] = useState("");
  const [newStatus, setNewStatus] = useState<"NEW" | "CLOSED">("CLOSED");
  const [submitting, setSubmitting] = useState(false);

  if (!step) return null;

  // Lọc các test cases thuộc bước này
  const stepCases = cases.filter((c) => c.node_id === step.id);

  const handleCreateChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSubmitting(true);
    try {
      await onAddCase({
        module_id: moduleId,
        flow_id: flowId || null,
        node_id: step.id,
        title: newTitle.trim(),
        input_data: newInput,
        expected_result: newExpected,
        actual_result: newActual,
        status: newStatus,
        priority: newStatus === "NEW" ? "HIGH" : "MEDIUM",
      });

      setNewTitle("");
      setNewInput("");
      setNewExpected("");
      setNewActual("");
      setShowAddForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const passedCount = stepCases.filter((c) => c.status === "CLOSED").length;
  const bugsCount = stepCases.filter((c) => c.status === "NEW").length;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-slate-900/95 backdrop-blur-2xl border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-900 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono font-bold text-sky-400 px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/20">
              {step.id}
            </span>
            <span className="text-xs text-slate-400 font-medium">Chi Tiết Bước & Checklist</span>
          </div>

          <h3 className="text-base font-bold text-white tracking-tight leading-snug">
            {step.title}
          </h3>

          {step.description && (
            <p className="text-xs text-slate-400 mt-1">{step.description}</p>
          )}

          {/* Quick stats for this step */}
          <div className="flex items-center gap-3 mt-3 text-xs">
            <span className="text-slate-300 font-medium">
              Checklist: <strong>{stepCases.length}</strong>
            </span>
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Đạt: {passedCount}
            </span>
            {bugsCount > 0 && (
              <span className="text-rose-400 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Lỗi: {bugsCount}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Checklist items list */}
      <div className="flex-1 p-5 overflow-y-auto space-y-3">
        <div className="flex items-center justify-between pb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Kịch Bản / Checklist Kiểm Thử Bước Này
          </span>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Checklist</span>
          </button>
        </div>

        {/* Add Checklist Inline Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreateChecklist}
            className="p-4 rounded-2xl bg-slate-950 border border-sky-500/30 space-y-3 animate-in fade-in duration-150"
          >
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              Thêm Kịch Bản Kiểm Thử Cho Bước
            </h4>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Tiêu đề kịch bản / điều kiện test
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="VD: Để trống ô mật khẩu -> Báo lỗi 'Vui lòng nhập mật khẩu'"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10.5px] font-semibold text-slate-400 mb-1">
                  Đầu vào (Input)
                </label>
                <input
                  type="text"
                  value={newInput}
                  onChange={(e) => setNewInput(e.target.value)}
                  placeholder="password: ''"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-semibold text-slate-400 mb-1">
                  Trạng thái ban đầu
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="CLOSED">Đạt (Passed)</option>
                  <option value="NEW">Báo Lỗi (Bug)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10.5px] font-semibold text-slate-400 mb-1">
                  Kết quả mong đợi
                </label>
                <input
                  type="text"
                  value={newExpected}
                  onChange={(e) => setNewExpected(e.target.value)}
                  placeholder="Hiển thị lỗi màu đỏ"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-semibold text-slate-400 mb-1">
                  Kết quả thực tế
                </label>
                <input
                  type="text"
                  value={newActual}
                  onChange={(e) => setNewActual(e.target.value)}
                  placeholder="Thực tế nếu lỗi"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl shadow-md cursor-pointer"
              >
                {submitting ? "Đang lưu..." : "Lưu Kịch Bản"}
              </button>
            </div>
          </form>
        )}

        {/* List of checklists */}
        {stepCases.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectCase(item)}
            className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 hover:shadow-lg transition cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold text-slate-500">
                  #{item.id}
                </span>

                <span
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-bold uppercase tracking-wider ${
                    item.status === "CLOSED"
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : item.status === "NEW"
                      ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                      : item.status === "FIX"
                      ? "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                      : "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                  }`}
                >
                  {item.status === "CLOSED" && <CheckCircle2 className="w-3 h-3" />}
                  {item.status === "NEW" && <AlertCircle className="w-3 h-3" />}
                  {item.status === "FIX" && <Wrench className="w-3 h-3" />}
                  {item.status === "VERIFY" && <Eye className="w-3 h-3" />}
                  <span>{item.status}</span>
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Nút Nhận Sửa Bug */}
                {item.status === "NEW" && onClaimTask && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClaimTask(item.id, "claim_bug");
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition"
                    title="Nhận sửa bug này (chuyển sang FIX)"
                  >
                    Nhận Sửa
                  </button>
                )}

                {/* Nút Nhận Kiểm Thử */}
                {item.is_impacted_by_git && onClaimTask && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClaimTask(item.id, "claim_test");
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-sm transition"
                    title="Nhận kiểm thử lại kịch bản này"
                  >
                    Nhận Test
                  </button>
                )}

                {/* 1-click toggle pass / fail */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = item.status === "CLOSED" ? "NEW" : "CLOSED";
                    onStatusChange(item.id, next);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                    item.status === "CLOSED"
                      ? "bg-rose-950/40 border-rose-800 text-rose-300 hover:bg-rose-900"
                      : "bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:bg-emerald-900"
                  }`}
                  title="Đổi nhanh trạng thái Pass/Fail"
                >
                  {item.status === "CLOSED" ? "Báo Lỗi" : "Đánh Dấu Đạt"}
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Xóa checklist này?")) {
                      onDeleteCase(item.id);
                    }
                  }}
                  className="p-1 text-slate-500 hover:text-rose-400 rounded transition"
                  title="Xóa"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <h5 className="text-xs font-semibold text-slate-200 group-hover:text-sky-300 transition line-clamp-2">
              {item.title}
            </h5>

            {item.input_data && (
              <div className="mt-1.5 text-[11px] font-mono text-slate-400 truncate">
                input: <code>{item.input_data}</code>
              </div>
            )}

            {item.actual_result && item.status === "NEW" && (
              <div className="mt-1.5 text-[10.5px] text-rose-400/90 italic">
                Lỗi: {item.actual_result}
              </div>
            )}

            {/* Hiển thị Người phụ trách */}
            <div className="mt-2 pt-2 border-t border-slate-900 flex items-center justify-between text-[10.5px] text-slate-500 font-mono">
              <span>Phụ trách:</span>
              <span className={`font-semibold ${item.assigned_name ? "text-slate-300" : "text-amber-500/80 italic"}`}>
                {item.assigned_name || (item.status === "NEW" ? "Chưa có Dev nhận" : "Chưa giao")}
              </span>
            </div>
          </div>
        ))}

        {stepCases.length === 0 && !showAddForm && (
          <div className="text-center py-10 text-xs text-slate-500 border border-dashed border-slate-800/80 rounded-2xl p-4">
            Bước này chưa có checklist kiểm thử nào. Bấm "+ Thêm Checklist" để tạo kịch bản cho ô input hoặc nút bấm của bước này.
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-xs">
        {onDeleteStep ? (
          <button
            onClick={() => {
              if (confirm(`Bạn có chắc muốn xóa bước "${step.title}" khỏi sơ đồ?`)) {
                onDeleteStep(step.id);
                onClose();
              }
            }}
            className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa bước này khỏi sơ đồ</span>
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={onClose}
          className="px-4 py-2 font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
