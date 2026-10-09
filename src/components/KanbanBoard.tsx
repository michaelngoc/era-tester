"use client";

import React from "react";
import { TestCase } from "./CaseDetailModal";
import {
  AlertCircle,
  Wrench,
  CheckCircle2,
  GitCommit,
  Plus,
  Eye,
  ArrowRight,
  User,
} from "lucide-react";

interface KanbanBoardProps {
  cases: TestCase[];
  onSelectCase: (testCase: TestCase) => void;
  onStatusChange: (id: number, nextStatus: "NEW" | "FIX" | "VERIFY" | "CLOSED") => void;
  onAddNewCase: (status: "NEW" | "FIX" | "VERIFY" | "CLOSED") => void;
}

const COLUMNS = [
  {
    id: "NEW",
    title: "Mới / Báo Lỗi",
    icon: AlertCircle,
    color: "rose",
    bg: "bg-rose-950/10",
    border: "border-rose-900/30",
    headerText: "text-rose-400",
    pillBg: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    nextStatus: "FIX",
    nextLabel: "Sửa (Fix)",
  },
  {
    id: "FIX",
    title: "Dev Đang Sửa",
    icon: Wrench,
    color: "sky",
    bg: "bg-sky-950/10",
    border: "border-sky-900/30",
    headerText: "text-sky-400",
    pillBg: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    nextStatus: "VERIFY",
    nextLabel: "Xác minh",
  },
  {
    id: "VERIFY",
    title: "Chờ Xác Minh",
    icon: Eye,
    color: "purple",
    bg: "bg-purple-950/10",
    border: "border-purple-900/30",
    headerText: "text-purple-400",
    pillBg: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    nextStatus: "CLOSED",
    nextLabel: "Hoàn tất",
  },
  {
    id: "CLOSED",
    title: "Đã Đóng (Passed)",
    icon: CheckCircle2,
    color: "emerald",
    bg: "bg-emerald-950/10",
    border: "border-emerald-900/30",
    headerText: "text-emerald-400",
    pillBg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    nextStatus: null,
    nextLabel: null,
  },
] as const;

export default function KanbanBoard({
  cases,
  onSelectCase,
  onStatusChange,
  onAddNewCase,
}: KanbanBoardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
      {COLUMNS.map((col) => {
        const columnCases = cases.filter((c) => c.status === col.id);
        const Icon = col.icon;

        return (
          <div
            key={col.id}
            className={`flex flex-col h-full rounded-2xl border ${col.border} ${col.bg} p-4 backdrop-blur-xl transition-all duration-200`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 ${col.headerText}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs text-slate-100 tracking-tight">
                  {col.title}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold border ${col.pillBg}`}>
                  {columnCases.length}
                </span>
              </div>

              <button
                onClick={() => onAddNewCase(col.id)}
                title="Thêm test case mới vào cột này"
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Cards List */}
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {columnCases.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectCase(item)}
                  className="group relative p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                >
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-1 mb-2.5">
                    <span className="text-[10px] font-mono font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                      #{item.id}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {item.is_impacted_by_git && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse">
                          <GitCommit className="w-2.5 h-2.5" />
                          GIT
                        </span>
                      )}

                      <span
                        className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          item.priority === "CRITICAL"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : item.priority === "HIGH"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}
                      >
                        {item.priority}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h4 className="text-xs font-semibold text-slate-100 group-hover:text-sky-300 transition-colors line-clamp-2 leading-relaxed mb-2.5">
                    {item.title}
                  </h4>

                  {/* Actual error summary */}
                  {item.actual_result && (
                    <div className="flex items-start gap-1.5 p-2 rounded-xl bg-rose-950/20 border border-rose-900/30 text-[11px] text-rose-300/90 line-clamp-2 mb-3">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <span className="italic">{item.actual_result}</span>
                    </div>
                  )}

                  {/* Card Footer: Assignee & Quick Forward */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                      <User className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">
                        {item.assigned_name || "Chưa giao"}
                      </span>
                    </div>

                    {col.nextStatus && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStatusChange(item.id, col.nextStatus as any);
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-semibold bg-slate-800 hover:bg-sky-600 text-slate-300 hover:text-white transition-all cursor-pointer"
                        title={`Chuyển sang ${col.nextLabel}`}
                      >
                        <span>{col.nextLabel}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {columnCases.length === 0 && (
                <div className="h-32 flex flex-col items-center justify-center text-xs text-slate-500 border border-dashed border-slate-800/80 rounded-2xl p-4">
                  <span>Chưa có thẻ trong cột này</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
