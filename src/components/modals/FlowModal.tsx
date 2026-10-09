"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Sparkles, Workflow } from "lucide-react";

export interface FlowModalProps {
  open: boolean;
  moduleId: number;
  moduleName?: string;
  defaultTitle?: string;
  defaultTemplateType?: "login" | "custom";
  onClose: () => void;
  onSuccess: (newFlow: any) => void;
}

export function FlowModal({
  open,
  moduleId,
  moduleName,
  defaultTitle = "",
  defaultTemplateType = "login",
  onClose,
  onSuccess,
}: FlowModalProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [templateType, setTemplateType] = useState<"login" | "custom">(defaultTemplateType);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle);
      setTemplateType(defaultTemplateType);
      setError("");
    }
  }, [open, defaultTitle, defaultTemplateType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Vui lòng nhập tiêu đề luồng");
      return;
    }
    if (!moduleId) {
      setError("Chưa chọn nhóm kiểm thử");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          title: title.trim(),
          templateType,
        }),
      });
      const data = await res.json();
      if (data.success && data.flow) {
        onSuccess(data.flow);
        onClose();
      } else {
        setError(data.error || "Không thể tạo sơ đồ luồng");
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
      title="Tạo Sơ Đồ Luồng Mới (User Flow)"
      description={moduleName ? `Nhóm: ${moduleName}` : undefined}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        ) : null}

        <Input
          label="Tiêu Đề Luồng Thao Tác"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="VD: Luồng Đăng Nhập & Phân Quyền"
        />

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Chọn Loại Mẫu Luồng
          </label>
          <div className="space-y-2">
            <div
              onClick={() => setTemplateType("login")}
              className={`flex items-start gap-3 p-3 rounded-2xl border transition cursor-pointer ${
                templateType === "login"
                  ? "bg-sky-50 dark:bg-sky-500/10 border-sky-500 text-slate-900 dark:text-white"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Mẫu Luồng Đăng Nhập (Khuyên Dùng)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Tự sinh sẵn 4 bước chuẩn (Mở /login ➔ Nhập email/mật khẩu ➔ Nhấn nút đăng nhập ➔ Xử lý kết quả) kèm 8 kịch bản kiểm thử chi tiết (bỏ trống ô input, mật khẩu ngắn, nút quay chờ, báo lỗi sai pass, v.v.).
                </div>
              </div>
            </div>

            <div
              onClick={() => setTemplateType("custom")}
              className={`flex items-start gap-3 p-3 rounded-2xl border transition cursor-pointer ${
                templateType === "custom"
                  ? "bg-sky-50 dark:bg-sky-500/10 border-sky-500 text-slate-900 dark:text-white"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <Workflow className="w-4 h-4 text-sky-500 dark:text-sky-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Tùy Chỉnh (Luồng Trống)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Khởi tạo sơ đồ cơ bản để bạn tự do tạo thêm các bước thao tác và kịch bản riêng biệt.
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
            Tạo Luồng Thao Tác
          </Button>
        </div>
      </form>
    </Modal>
  );
}
