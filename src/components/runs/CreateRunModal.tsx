"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Sparkles, CheckCircle2, Workflow } from "lucide-react";

export interface CreateRunModalProps {
  open: boolean;
  projects: Array<{ id: number; name: string }>;
  defaultProjectId?: number;
  onClose: () => void;
  onSuccess: (newRun: any) => void;
}

export default function CreateRunModal({
  open,
  projects,
  defaultProjectId,
  onClose,
  onSuccess,
}: CreateRunModalProps) {
  const [projectId, setProjectId] = useState<number>(
    defaultProjectId || (projects.length > 0 ? projects[0].id : 0)
  );
  const [title, setTitle] = useState("");
  const [runType, setRunType] = useState<"FULL_REGRESSION" | "DAILY_INCREMENTAL" | "MANUAL">(
    "FULL_REGRESSION"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Vui lòng nhập tiêu đề đợt kiểm thử");
      return;
    }
    if (!projectId) {
      setError("Vui lòng chọn dự án");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: title.trim(),
          runType,
        }),
      });
      const data = await res.json();
      if (data.success && data.run) {
        onSuccess(data.run);
        onClose();
        setTitle("");
      } else {
        setError(data.error || "Không thể tạo đợt kiểm thử");
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
      title="Tạo Đợt Kiểm Thử Mới (Test Run / Cycle)"
      description="Gom nhóm các kịch bản kiểm thử để theo dõi tiến độ và nghiệm thu theo phiên bản hoặc đợt phát hành."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        ) : null}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Dự Án Kiểm Thử
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Tiêu Đề Đợt Kiểm Thử (Bắt buộc)"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="VD: Release v4.42 - Nghiệm Thu Sprint 42"
        />

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Chọn Chế Độ Kiểm Thử
          </label>
          <div className="space-y-2">
            <div
              onClick={() => setRunType("FULL_REGRESSION")}
              className={`flex items-start gap-3 p-3 rounded-2xl border transition cursor-pointer ${
                runType === "FULL_REGRESSION"
                  ? "bg-sky-50 dark:bg-sky-500/10 border-sky-500 text-slate-900 dark:text-white"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Kiểm Thử Toàn Diện (Full Regression - Khuyên dùng cuối kỳ)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Nạp toàn bộ kịch bản kiểm thử của dự án vào đợt test để rà soát kỹ lưỡng trước khi bàn giao release.
                </div>
              </div>
            </div>

            <div
              onClick={() => setRunType("DAILY_INCREMENTAL")}
              className={`flex items-start gap-3 p-3 rounded-2xl border transition cursor-pointer ${
                runType === "DAILY_INCREMENTAL"
                  ? "bg-sky-50 dark:bg-sky-500/10 border-sky-500 text-slate-900 dark:text-white"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Kiểm Thử Nhanh Hàng Ngày (Daily Incremental)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Tập trung vào các thay đổi trong ngày từ các commit Git của lập trình viên.
                </div>
              </div>
            </div>

            <div
              onClick={() => setRunType("MANUAL")}
              className={`flex items-start gap-3 p-3 rounded-2xl border transition cursor-pointer ${
                runType === "MANUAL"
                  ? "bg-sky-50 dark:bg-sky-500/10 border-sky-500 text-slate-900 dark:text-white"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
              }`}
            >
              <Workflow className="w-4 h-4 text-sky-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Tùy Chỉnh Đợt Test (Manual Cycle)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Tự do thiết lập phạm vi kịch bản theo yêu cầu cụ thể.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" isLoading={submitting}>
            Khởi Tạo Đợt Test
          </Button>
        </div>
      </form>
    </Modal>
  );
}
