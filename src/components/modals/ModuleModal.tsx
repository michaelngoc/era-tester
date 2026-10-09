"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export interface ModuleModalData {
  id?: number;
  name: string;
  file_patterns?: string[];
  assigned_testers?: number[];
}

export interface ModuleModalProps {
  open: boolean;
  mode: "create" | "edit";
  projectId: number;
  initialData?: ModuleModalData | null;
  availableTesters: Array<{ id: number; email: string; full_name?: string | null }>;
  onClose: () => void;
  onSuccess: (savedModule: any) => void;
}

export function ModuleModal({
  open,
  mode,
  projectId,
  initialData,
  availableTesters,
  onClose,
  onSuccess,
}: ModuleModalProps) {
  const [name, setName] = useState("");
  const [patterns, setPatterns] = useState("");
  const [assignedTesters, setAssignedTesters] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialData) {
        setName(initialData.name || "");
        setPatterns(
          Array.isArray(initialData.file_patterns)
            ? initialData.file_patterns.join(", ")
            : ""
        );
        setAssignedTesters(
          Array.isArray(initialData.assigned_testers)
            ? initialData.assigned_testers
            : []
        );
      } else {
        setName("");
        setPatterns("");
        setAssignedTesters([]);
      }
      setError("");
    }
  }, [open, mode, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Vui lòng nhập tên nhóm kiểm thử");
      return;
    }
    if (!projectId) {
      setError("Chưa chọn dự án");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (mode === "create") {
        const res = await fetch("/api/modules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            name: name.trim(),
            filePatterns: patterns,
            assignedTesters,
          }),
        });
        const data = await res.json();
        if (data.success && data.module) {
          onSuccess(data.module);
          onClose();
        } else {
          setError(data.error || "Không thể tạo nhóm kiểm thử");
        }
      } else if (initialData?.id) {
        const res = await fetch(`/api/modules/${initialData.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            filePatterns: patterns,
            assignedTesters,
          }),
        });
        const data = await res.json();
        if (data.success && data.module) {
          onSuccess(data.module);
          onClose();
        } else {
          setError(data.error || "Không thể cập nhật nhóm");
        }
      }
    } catch {
      setError("Đã xảy ra lỗi kết nối, vui lòng thử lại");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTester = (id: number) => {
    setAssignedTesters((prev) =>
      prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id]
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Tạo Nhóm Kiểm Thử Mới" : "Chỉnh Sửa Nhóm Kiểm Thử"}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        ) : null}

        <Input
          label="Tên Nhóm (Module)"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="VD: Authentication / Login Flow hoặc Article Block"
        />

        <Input
          label="Quy Tắc File Git (File Patterns)"
          value={patterns}
          onChange={(e) => setPatterns(e.target.value)}
          placeholder="src/app/login/**, src/components/auth/**"
          helperText="Khi Dev push vào nhánh tester, các file thay đổi khớp mẫu này sẽ tự động kích hoạt cảnh báo cho Tester!"
          className="font-mono"
        />

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Kiểm Thử Viên Phụ Trách (Tự động gán & gửi email khi Git thay đổi)
          </label>
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
            {availableTesters.map((t) => {
              const isChecked = assignedTesters.includes(t.id);
              return (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => toggleTester(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                    isChecked
                      ? "bg-sky-500 text-white border-sky-400 shadow-sm shadow-sky-500/25"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-current opacity-70" />
                  <span>{t.full_name || t.email}</span>
                </button>
              );
            })}
            {availableTesters.length === 0 && (
              <span className="text-xs text-slate-500 italic p-1">
                Đang tải danh sách kiểm thử viên...
              </span>
            )}
          </div>
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            Chọn các Tester để khi có commit thay đổi liên quan, hệ thống tự động gán task và gửi thông báo trực tiếp.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" isLoading={submitting}>
            {mode === "create" ? "Tạo Nhóm" : "Lưu Thay Đổi"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
