"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
export interface FlowModalProps {
  open: boolean;
  moduleId: number;
  moduleName?: string;
  defaultTitle?: string;
  onClose: () => void;
  onSuccess: (newFlow: any) => void;
}

export function FlowModal({
  open,
  moduleId,
  moduleName,
  defaultTitle = "",
  onClose,
  onSuccess,
}: FlowModalProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle);
      setError("");
    }
  }, [open, defaultTitle]);

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
          templateType: "custom",
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
          placeholder="VD: Luồng Quản Lý Giỏ Hàng & Thanh Toán"
        />

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
