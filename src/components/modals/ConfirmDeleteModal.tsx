"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface ConfirmDeleteModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmTarget: string;
  targetLabel?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
  isLoading?: boolean;
}

export function ConfirmDeleteModal({
  open,
  title,
  description,
  confirmTarget,
  targetLabel = "tên",
  onConfirm,
  onClose,
  isLoading = false,
}: ConfirmDeleteModalProps) {
  const [typedValue, setTypedValue] = useState("");

  useEffect(() => {
    if (open) {
      setTypedValue("");
    }
  }, [open]);

  if (!open) return null;

  const isMatched = typedValue.trim() === confirmTarget.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMatched || isLoading) return;
    await onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Xác thực an toàn cấp Quản trị viên
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {description}
        </p>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Nhập chính xác {targetLabel}{" "}
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400 select-all">
                {confirmTarget}
              </span>{" "}
              để xác nhận:
            </label>
            <input
              type="text"
              autoFocus
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              placeholder={confirmTarget}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 transition"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
            >
              Hủy
            </Button>
            <button
              type="submit"
              disabled={!isMatched || isLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-rose-600/25 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isLoading ? "Đang xử lý..." : "Xác Nhận Xóa Mềm"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
