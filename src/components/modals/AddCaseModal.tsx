"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

export interface AddCaseModalProps {
  open: boolean;
  moduleId: number;
  flowId?: number | null;
  nodeId?: string | null;
  onClose: () => void;
  onSuccess: (newCase: any) => void;
}

export function AddCaseModal({
  open,
  moduleId,
  flowId,
  nodeId,
  onClose,
  onSuccess,
}: AddCaseModalProps) {
  const [title, setTitle] = useState("");
  const [inputData, setInputData] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [actualResult, setActualResult] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle("");
      setInputData("");
      setExpectedResult("");
      setActualResult("");
      setError("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Vui lòng nhập tiêu đề kịch bản");
      return;
    }
    if (!moduleId) {
      setError("Chưa chọn nhóm kiểm thử");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          flowId: flowId || null,
          nodeId: nodeId || "step-1",
          title: title.trim(),
          inputData,
          expectedResult,
          actualResult,
          status: "NEW",
        }),
      });
      const data = await res.json();
      if (data.success && data.case) {
        onSuccess(data.case);
        onClose();
      } else {
        setError(data.error || "Không thể tạo kịch bản");
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
      title="Thêm Bước / Kịch Bản Kiểm Thử"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        ) : null}

        <Input
          label="Tiêu Đề Kịch Bản / Bước Kiểm Thử"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="VD: Kiểm tra validate bỏ trống ô Email hoặc nút Login"
        />

        <Input
          label="Dữ Liệu Đầu Vào (Input)"
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          placeholder="email: '', password: '123'"
          className="font-mono"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Textarea
            label="Kết Quả Mong Đợi (Expected)"
            rows={2}
            value={expectedResult}
            onChange={(e) => setExpectedResult(e.target.value)}
            placeholder="Hiển thị thông báo đỏ yêu cầu nhập email"
          />

          <Textarea
            label="Kết Quả Thực Tế (Nếu lỗi)"
            rows={2}
            value={actualResult}
            onChange={(e) => setActualResult(e.target.value)}
            placeholder="Không có thông báo nào xuất hiện"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" isLoading={submitting}>
            Thêm Kịch Bản
          </Button>
        </div>
      </form>
    </Modal>
  );
}
