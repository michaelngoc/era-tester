"use client";

import React, { useState, useEffect } from "react";
import CopyCommitSnippet from "./CopyCommitSnippet";
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
  GripVertical,
  ArrowDownCircle,
} from "lucide-react";

interface KanbanBoardProps {
  cases: TestCase[];
  onSelectCase: (testCase: TestCase) => void;
  onStatusChange: (id: number, nextStatus: "NEW" | "FIX" | "VERIFY" | "CLOSED") => void;
  onAddNewCase: (status: "NEW" | "FIX" | "VERIFY" | "CLOSED") => void;
  onClaimTask?: (id: number, action: "claim_bug" | "claim_test") => void;
}

type ColumnStatus = "NEW" | "FIX" | "VERIFY" | "CLOSED";

interface ColumnDef {
  id: ColumnStatus;
  title: string;
  icon: any;
  color: string;
  bg: string;
  border: string;
  headerText: string;
  pillBg: string;
  dropRing: string;
  nextStatus: ColumnStatus | null;
  nextLabel: string | null;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  {
    id: "NEW",
    title: "Lỗi Phát Sinh",
    icon: AlertCircle,
    color: "rose",
    bg: "bg-rose-50/70 dark:bg-rose-950/10",
    border: "border-rose-200 dark:border-rose-900/30",
    headerText: "text-rose-600 dark:text-rose-400",
    pillBg: "bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30",
    dropRing: "ring-2 ring-rose-500/80 bg-rose-500/15 border-rose-400 dark:border-rose-500 shadow-lg shadow-rose-500/20",
    nextStatus: "FIX",
    nextLabel: "Khắc Phục",
  },
  {
    id: "FIX",
    title: "Đang Khắc Phục",
    icon: Wrench,
    color: "sky",
    bg: "bg-sky-50/70 dark:bg-sky-950/10",
    border: "border-sky-200 dark:border-sky-900/30",
    headerText: "text-sky-600 dark:text-sky-400",
    pillBg: "bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30",
    dropRing: "ring-2 ring-sky-500/80 bg-sky-500/15 border-sky-400 dark:border-sky-500 shadow-lg shadow-sky-500/20",
    nextStatus: "VERIFY",
    nextLabel: "Xác Minh",
  },
  {
    id: "VERIFY",
    title: "Chờ Xác Minh",
    icon: Eye,
    color: "purple",
    bg: "bg-purple-50/70 dark:bg-purple-950/10",
    border: "border-purple-200 dark:border-purple-900/30",
    headerText: "text-purple-600 dark:text-purple-400",
    pillBg: "bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30",
    dropRing: "ring-2 ring-purple-500/80 bg-purple-500/15 border-purple-400 dark:border-purple-500 shadow-lg shadow-purple-500/20",
    nextStatus: "CLOSED",
    nextLabel: "Hoàn Tất",
  },
  {
    id: "CLOSED",
    title: "Kiểm Thử Đạt",
    icon: CheckCircle2,
    color: "emerald",
    bg: "bg-emerald-50/70 dark:bg-emerald-950/10",
    border: "border-emerald-200 dark:border-emerald-900/30",
    headerText: "text-emerald-600 dark:text-emerald-400",
    pillBg: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30",
    dropRing: "ring-2 ring-emerald-500/80 bg-emerald-500/15 border-emerald-400 dark:border-emerald-500 shadow-lg shadow-emerald-500/20",
    nextStatus: null,
    nextLabel: null,
  },
];

export default function KanbanBoard({
  cases,
  onSelectCase,
  onStatusChange,
  onAddNewCase,
  onClaimTask,
}: KanbanBoardProps) {
  // Thứ tự các cột trạng thái (có thể kéo thả hoán đổi)
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);

  // Trạng thái kéo thẻ (Card Dragging)
  const [draggingCardId, setDraggingCardId] = useState<number | null>(null);
  const [dragOverColId, setDragOverColId] = useState<ColumnStatus | null>(null);

  // Trạng thái kéo cột (Column Dragging)
  const [draggingColIndex, setDraggingColIndex] = useState<number | null>(null);
  const [dragOverColIndex, setDragOverColIndex] = useState<number | null>(null);

  // Khôi phục thứ tự cột từ localStorage nếu có
  useEffect(() => {
    try {
      const savedOrder = localStorage.getItem("era_tester_kanban_col_order");
      if (savedOrder) {
        const parsedIds: ColumnStatus[] = JSON.parse(savedOrder);
        const reordered = parsedIds
          .map((id) => DEFAULT_COLUMNS.find((c) => c.id === id))
          .filter(Boolean) as ColumnDef[];
        if (reordered.length === DEFAULT_COLUMNS.length) {
          setColumns(reordered);
        }
      }
    } catch {
      // Bỏ qua lỗi parse
    }
  }, []);

  // Lưu thứ tự cột vào localStorage khi thay đổi
  const saveColumnOrder = (newCols: ColumnDef[]) => {
    setColumns(newCols);
    try {
      localStorage.setItem(
        "era_tester_kanban_col_order",
        JSON.stringify(newCols.map((c) => c.id))
      );
    } catch {
      // Bỏ qua lỗi lưu
    }
  };

  // --- XỬ LÝ KÉO THẢ THẺ (DRAG & DROP CARD TO CHANGE STATUS) ---
  const handleCardDragStart = (e: React.DragEvent, card: TestCase) => {
    e.stopPropagation();
    setDraggingCardId(card.id);
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ type: "CARD", cardId: card.id, fromStatus: card.status })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  const handleCardDragEnd = () => {
    setDraggingCardId(null);
    setDragOverColId(null);
  };

  const handleColumnDragOver = (e: React.DragEvent, colId: ColumnStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColId !== colId) {
      setDragOverColId(colId);
    }
  };

  const handleColumnDragLeave = (e: React.DragEvent, colId: ColumnStatus) => {
    // Chỉ bỏ highlight khi thực sự rời khỏi container của cột
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (!e.currentTarget.contains(relatedTarget)) {
      if (dragOverColId === colId) {
        setDragOverColId(null);
      }
    }
  };

  const handleColumnDrop = (e: React.DragEvent, targetColId: ColumnStatus) => {
    e.preventDefault();
    setDragOverColId(null);
    setDraggingCardId(null);

    const rawData = e.dataTransfer.getData("application/json");
    if (!rawData) return;

    try {
      const data = JSON.parse(rawData);

      // 1. Trường hợp thả THẺ: Đổi trạng thái kịch bản kiểm thử
      if (data.type === "CARD" && data.cardId) {
        const cardId = Number(data.cardId);
        if (data.fromStatus !== targetColId) {
          onStatusChange(cardId, targetColId);
        }
      }

      // 2. Trường hợp thả CỘT: Hoán đổi thứ tự cột
      if (data.type === "COLUMN" && typeof data.colIndex === "number") {
        const fromIndex = data.colIndex;
        const toIndex = columns.findIndex((c) => c.id === targetColId);
        if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
          const nextCols = [...columns];
          const [moved] = nextCols.splice(fromIndex, 1);
          nextCols.splice(toIndex, 0, moved);
          saveColumnOrder(nextCols);
        }
      }
    } catch {
      // Bỏ qua lỗi parse dữ liệu kéo thả
    }
  };

  // --- XỬ LÝ KÉO THẢ CỘT (DRAG & DROP COLUMN TO REORDER) ---
  const handleColDragStart = (e: React.DragEvent, index: number) => {
    setDraggingColIndex(index);
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ type: "COLUMN", colIndex: index })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  const handleColDragEnd = () => {
    setDraggingColIndex(null);
    setDragOverColIndex(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full select-none">
      {columns.map((col, index) => {
        const columnCases = cases.filter((c) => c.status === col.id);
        const Icon = col.icon;
        const isDragOver = dragOverColId === col.id;
        const isDraggingThisCol = draggingColIndex === index;

        return (
          <div
            key={col.id}
            onDragOver={(e) => handleColumnDragOver(e, col.id)}
            onDragLeave={(e) => handleColumnDragLeave(e, col.id)}
            onDrop={(e) => handleColumnDrop(e, col.id)}
            className={`flex flex-col h-full rounded-3xl border transition-all duration-200 backdrop-blur-xl relative ${
              isDragOver
                ? col.dropRing
                : isDraggingThisCol
                ? "opacity-50 border-dashed border-sky-400 bg-sky-500/5 scale-[0.98]"
                : `${col.border} ${col.bg} shadow-sm`
            } p-4`}
          >
            {/* Column Header (Có thể kéo thả để đổi thứ tự cột) */}
            <div
              draggable
              onDragStart={(e) => handleColDragStart(e, index)}
              onDragEnd={handleColDragEnd}
              className="group flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-200 dark:border-slate-800/80 cursor-grab active:cursor-grabbing"
              title="Kéo thả để sắp xếp lại thứ tự cột trạng thái"
            >
              <div className="flex items-center gap-2">
                <GripVertical className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition" />
                <div
                  className={`p-1.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 ${col.headerText} shadow-sm`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 tracking-tight">
                  {col.title}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold border ${col.pillBg}`}>
                  {columnCases.length}
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddNewCase(col.id);
                }}
                title="Thêm kịch bản kiểm thử mới vào cột này"
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Drop Zone Visual Indicator Khi Rê Thẻ Vào */}
            {isDragOver && (
              <div className="mb-3 p-3 rounded-2xl border-2 border-dashed border-current flex items-center justify-center gap-2 text-xs font-bold animate-pulse text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/30">
                <ArrowDownCircle className="w-4 h-4 animate-bounce" />
                <span>Thả vào đây để chuyển sang &quot;{col.title}&quot;</span>
              </div>
            )}

            {/* Cards List (Hỗ trợ Kéo thả từng thẻ) */}
            <div className="flex-1 space-y-3 overflow-y-auto pr-1 min-h-[160px]">
              {columnCases.map((item) => {
                const isThisCardDragging = draggingCardId === item.id;

                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleCardDragStart(e, item)}
                    onDragEnd={handleCardDragEnd}
                    onClick={() => onSelectCase(item)}
                    className={`group relative p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-grab active:cursor-grabbing shadow-sm ${
                      isThisCardDragging
                        ? "opacity-35 scale-95 border-sky-400 dark:border-sky-500 shadow-none ring-2 ring-sky-400/50"
                        : ""
                    }`}
                  >
                    {/* Top Badges & Drag Grip */}
                    <div className="flex items-center justify-between gap-1 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <GripVertical className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 shrink-0" />
                        <CopyCommitSnippet compact caseId={item.id} caseTitle={item.title} />
                      </div>

                      <div className="flex items-center gap-1.5">
                        {item.is_impacted_by_git && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 animate-pulse">
                            <GitCommit className="w-2.5 h-2.5" />
                            GIT
                          </span>
                        )}

                        <span
                          className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            item.priority === "CRITICAL"
                              ? "bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30"
                              : item.priority === "HIGH"
                              ? "bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {item.priority === "CRITICAL"
                            ? "Khẩn Cấp"
                            : item.priority === "HIGH"
                            ? "Cao"
                            : item.priority === "LOW"
                            ? "Thấp"
                            : "Trung Bình"}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors line-clamp-2 leading-relaxed mb-2.5">
                      {item.title}
                    </h4>

                    {/* Actual error summary */}
                    {item.actual_result && (
                      <div className="flex items-start gap-1.5 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-[11px] text-rose-800 dark:text-rose-300/90 line-clamp-2 mb-3">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                        <span className="italic">{item.actual_result}</span>
                      </div>
                    )}

                    {/* Card Footer: Assignee, Claim & Quick Forward */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <User className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="truncate max-w-[90px]">
                          {item.assigned_name || (item.status === "NEW" ? "Chưa nhận" : "Chưa phân công")}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Nút Nhận Sửa Bug */}
                        {item.status === "NEW" && onClaimTask && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onClaimTask(item.id, "claim_bug");
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition cursor-pointer"
                            title="Nhận sửa lỗi này (chuyển sang Đang Khắc Phục)"
                          >
                            <Wrench className="w-2.5 h-2.5" />
                            <span>Nhận Sửa</span>
                          </button>
                        )}

                        {/* Nút Nhận Kiểm Thử Lại khi có Git Push */}
                        {item.is_impacted_by_git && onClaimTask && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onClaimTask(item.id, "claim_test");
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 shadow-sm transition cursor-pointer"
                            title="Nhận kiểm thử lại kịch bản này"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Nhận Test</span>
                          </button>
                        )}

                        {col.nextStatus && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStatusChange(item.id, col.nextStatus as any);
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-sky-600 text-slate-700 dark:text-slate-300 hover:text-white transition-all cursor-pointer"
                            title={`Chuyển sang ${col.nextLabel}`}
                          >
                            <span>{col.nextLabel}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {columnCases.length === 0 && (
                <div
                  className={`h-32 flex flex-col items-center justify-center text-xs border border-dashed rounded-2xl p-4 transition-all ${
                    isDragOver
                      ? "border-sky-400 text-sky-500 bg-sky-500/10 font-bold"
                      : "text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800/80"
                  }`}
                >
                  <span>{isDragOver ? "Thả thẻ vào đây" : "Chưa có thẻ trong cột này"}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
