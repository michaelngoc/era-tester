"use client";

import React from "react";
import { TestCase } from "./CaseDetailModal";
import {
  AlertCircle,
  Wrench,
  CheckCircle2,
  Check,
  GitCommit,
  Plus,
  Eye,
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
    title: "NEW (Lỗi / Kịch bản mới)",
    icon: AlertCircle,
    color: "rose",
    bg: "bg-rose-950/20",
    border: "border-rose-900/40",
    headerText: "text-rose-400",
  },
  {
    id: "FIX",
    title: "FIX (Dev đã sửa)",
    icon: Wrench,
    color: "sky",
    bg: "bg-sky-950/20",
    border: "border-sky-900/40",
    headerText: "text-sky-400",
  },
  {
    id: "VERIFY",
    title: "VERIFY (Tester xác minh)",
    icon: Eye,
    color: "purple",
    bg: "bg-purple-950/20",
    border: "border-purple-900/40",
    headerText: "text-purple-400",
  },
  {
    id: "CLOSED",
    title: "CLOSED (Hoàn tất / Pass)",
    icon: CheckCircle2,
    color: "emerald",
    bg: "bg-emerald-950/20",
    border: "border-emerald-900/40",
    headerText: "text-emerald-400",
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
            className={`flex flex-col h-full rounded-2xl border ${col.border} ${col.bg} p-3.5 backdrop-blur-sm`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${col.headerText}`} />
                <span className="font-semibold text-xs text-slate-200">
                  {col.title}
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                  {columnCases.length}
                </span>
              </div>

              <button
                onClick={() => onAddNewCase(col.id)}
                title="Thêm test case mới"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Cards List */}
            <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
              {columnCases.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectCase(item)}
                  className="group relative p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:shadow-lg transition cursor-pointer"
                >
                  {/* Badges row */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-[10px] font-mono text-slate-400 font-semibold">
                      #{item.id}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {item.is_impacted_by_git && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                          <GitCommit className="w-2.5 h-2.5" />
                          Git Change
                        </span>
                      )}

                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                          item.priority === "CRITICAL"
                            ? "bg-rose-500/20 text-rose-400"
                            : item.priority === "HIGH"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {item.priority}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h4 className="text-xs font-semibold text-slate-100 group-hover:text-sky-300 transition line-clamp-2 mb-2">
                    {item.title}
                  </h4>

                  {/* Detail summary */}
                  {item.actual_result && (
                    <p className="text-[11px] text-rose-400/90 line-clamp-1 mb-2 italic">
                      Lỗi: {item.actual_result}
                    </p>
                  )}

                  {/* Quick move status footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                    <span>
                      {item.assigned_name ? `Dev: ${item.assigned_name}` : "Chưa giao"}
                    </span>

                    <select
                      value={item.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        onStatusChange(item.id, e.target.value as any);
                      }}
                      className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-slate-300 focus:outline-none"
                    >
                      <option value="NEW">Mới</option>
                      <option value="FIX">Đã sửa</option>
                      <option value="VERIFY">Xác minh</option>
                      <option value="CLOSED">Đã đóng</option>
                    </select>
                  </div>
                </div>
              ))}

              {columnCases.length === 0 && (
                <div className="h-24 flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-800/60 rounded-xl">
                  Trống
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
