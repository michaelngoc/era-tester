"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { 
  FileCode2, 
  Plus, 
  X, 
  AlignLeft, 
  Tags, 
  Sparkles, 
  Check, 
  FolderGit2, 
  ShieldAlert,
  UserCheck
} from "lucide-react";

export interface ModuleModalData {
  id?: number;
  name: string;
  file_patterns?: string[];
  assigned_testers?: number[];
}

export interface TesterOption {
  id: number;
  email: string;
  full_name?: string | null;
  role?: string;
}

export interface ModuleModalProps {
  open: boolean;
  mode: "create" | "edit";
  projectId: number;
  initialData?: ModuleModalData | null;
  availableTesters: TesterOption[];
  onClose: () => void;
  onSuccess: (savedModule: any) => void;
}

const COMMON_PRESETS = [
  "src/app/**",
  "src/components/**",
  "src/lib/**",
  "src/api/**",
  "src/proxy.ts",
];

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
  // Quản lý patterns dưới dạng mảng các chuỗi riêng biệt
  const [patternsList, setPatternsList] = useState<string[]>([]);
  const [newPatternInput, setNewPatternInput] = useState("");
  const [viewMode, setViewMode] = useState<"chips" | "textarea">("chips");
  const [rawTextareaValue, setRawTextareaValue] = useState("");

  const [assignedTesters, setAssignedTesters] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialData) {
        setName(initialData.name || "");
        const raw = Array.isArray(initialData.file_patterns)
          ? initialData.file_patterns
          : [];
        setPatternsList(raw);
        setRawTextareaValue(raw.join("\n"));
        setAssignedTesters(
          Array.isArray(initialData.assigned_testers)
            ? initialData.assigned_testers
            : []
        );
      } else {
        setName("");
        setPatternsList([]);
        setRawTextareaValue("");
        setAssignedTesters([]);
      }
      setNewPatternInput("");
      setViewMode("chips");
      setError("");
    }
  }, [open, mode, initialData]);

  // Thêm một hoặc nhiều pattern
  const addPatterns = (text: string) => {
    if (!text.trim()) return;
    const items = text
      .split(/[,\n;]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const merged = Array.from(new Set([...patternsList, ...items]));
    setPatternsList(merged);
    setRawTextareaValue(merged.join("\n"));
    setNewPatternInput("");
  };

  // Xóa một pattern
  const removePattern = (patternToRemove: string) => {
    const updated = patternsList.filter((p) => p !== patternToRemove);
    setPatternsList(updated);
    setRawTextareaValue(updated.join("\n"));
  };

  // Đồng bộ từ textarea sang danh sách tags
  const handleTextareaChange = (text: string) => {
    setRawTextareaValue(text);
    const items = text
      .split(/\r?\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    setPatternsList(items);
  };

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addPatterns(newPatternInput);
    }
  };

  const toggleTester = (id: number) => {
    setAssignedTesters((prev) =>
      prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id]
    );
  };

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
      const payloadPatterns = viewMode === "textarea"
        ? rawTextareaValue.split(/\r?\n/).map(p => p.trim()).filter(Boolean)
        : patternsList;

      if (mode === "create") {
        const res = await fetch("/api/modules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            name: name.trim(),
            filePatterns: payloadPatterns,
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
            filePatterns: payloadPatterns,
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Tạo Nhóm Kiểm Thử Mới" : "Chỉnh Sửa Nhóm Kiểm Thử"}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Tên Module */}
        <Input
          label="Tên Nhóm (Module)"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="VD: Xác Thực & Bảo Mật Điều Hướng (manage/login)"
        />

        {/* QUY TẮC FILE GIT (FILE PATTERNS) - TỐI ƯU UI/UX ĐỈNH CAO */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-sky-500" />
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Quy Tắc File Git (File Patterns)
              </label>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                {patternsList.length} quy tắc
              </span>
            </div>

            {/* Toggle chế độ xem */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setRawTextareaValue(patternsList.join("\n"));
                  setViewMode("chips");
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  viewMode === "chips"
                    ? "bg-sky-500 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
                title="Xem dạng thẻ Tags trực quan"
              >
                <Tags className="w-3 h-3" />
                <span>Dạng Thẻ</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRawTextareaValue(patternsList.join("\n"));
                  setViewMode("textarea");
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  viewMode === "textarea"
                    ? "bg-sky-500 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
                title="Soạn thảo nhiều dòng dạng Textarea"
              >
                <AlignLeft className="w-3 h-3" />
                <span>Đa Dòng</span>
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Khi Dev push vào GitHub, mọi file thay đổi khớp mẫu bên dưới sẽ <strong>tự động kích hoạt</strong> kịch bản test và gửi thông báo trực tiếp.
          </p>

          {viewMode === "chips" ? (
            <div className="space-y-3">
              {/* Danh sách thẻ Tags */}
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl min-h-[70px] content-start">
                {patternsList.map((pattern) => (
                  <div
                    key={pattern}
                    className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 text-xs font-mono text-slate-800 dark:text-slate-200 shadow-2xs hover:border-sky-400 transition"
                  >
                    <FileCode2 className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <span className="truncate max-w-[320px]">{pattern}</span>
                    <button
                      type="button"
                      onClick={() => removePattern(pattern)}
                      className="ml-1 text-slate-400 hover:text-rose-500 p-0.5 rounded-md transition cursor-pointer"
                      title="Xóa quy tắc này"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {patternsList.length === 0 && (
                  <div className="w-full text-center py-4 text-xs text-slate-400 italic">
                    Chưa có quy tắc file nào. Hãy nhập đường dẫn file bên dưới hoặc chọn gợi ý nhanh.
                  </div>
                )}
              </div>

              {/* Ô nhập thêm pattern mới */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={newPatternInput}
                    onChange={(e) => setNewPatternInput(e.target.value)}
                    onKeyDown={handleKeyDownInput}
                    placeholder="VD: src/app/login/** hoặc src/proxy.ts (nhấn Enter hoặc dấu phẩy để thêm)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => addPatterns(newPatternInput)}
                  className="px-3.5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-sky-600/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm</span>
                </button>
              </div>

              {/* Gợi ý nhanh (Quick Presets) */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10.5px] font-semibold text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Gợi ý nhanh:
                </span>
                {COMMON_PRESETS.map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => addPatterns(preset)}
                    className="px-2 py-0.5 rounded-lg text-[10.5px] font-mono bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-100 dark:hover:bg-sky-950/50 hover:text-sky-600 dark:hover:text-sky-400 transition cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Chế độ Textarea Đa Dòng */
            <div className="space-y-2">
              <textarea
                value={rawTextareaValue}
                onChange={(e) => handleTextareaChange(e.target.value)}
                rows={6}
                placeholder="Mỗi quy tắc trên 1 dòng:&#10;src/proxy.ts&#10;src/middleware.ts&#10;src/app/login/**&#10;src/components/Website/Create/**"
                className="w-full p-3 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 leading-relaxed"
              />
              <p className="text-[10px] text-slate-400 italic">
                * Hỗ trợ copy/paste hàng loạt danh sách file từ Git commit hoặc VS Code.
              </p>
            </div>
          )}
        </div>

        {/* NHÂN SỰ PHỤ TRÁCH KIỂM THỬ (QA, QC, TESTER, CTO, DEV, LEADER) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-500" />
              <span>Nhân Sự Phụ Trách Kiểm Thử (QA / QC / Tester / CTO)</span>
            </label>
            <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
              Đã chọn: <strong>{assignedTesters.length}</strong> người
            </span>
          </div>

          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
            {availableTesters.map((t) => {
              const isChecked = assignedTesters.includes(t.id);
              const roleDisplay = t.role === "SUPER_ADMIN" 
                ? "Admin"
                : t.role === "CTO"
                ? "CTO"
                : t.role === "QA"
                ? "QA"
                : t.role === "QC"
                ? "QC"
                : t.role === "LEADER"
                ? "Lead"
                : t.role === "DEVELOPER"
                ? "Dev"
                : "Tester";

              return (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => toggleTester(t.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                    isChecked
                      ? "bg-sky-500 text-white border-sky-400 shadow-sm shadow-sky-500/25"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isChecked ? "bg-white" : "bg-emerald-500"}`} />
                  <span>{t.full_name || t.email}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                    isChecked 
                      ? "bg-white/20 text-white" 
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                  }`}>
                    {roleDisplay}
                  </span>
                </button>
              );
            })}

            {availableTesters.length === 0 && (
              <span className="text-xs text-slate-500 italic p-1">
                Không tìm thấy nhân sự phù hợp...
              </span>
            )}
          </div>
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Chọn bất kỳ ai phụ trách kiểm thử (QA, QC, Tester, Leader, CTO). Khi có commit thay đổi file khớp mẫu, hệ thống sẽ tự động gán task và gửi email thông báo trực tiếp.
          </p>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800/80">
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
