"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

export interface ProjectModalData {
  id?: number;
  name: string;
  slug: string;
  description?: string;
  github_repo?: string;
}

export interface ProjectModalProps {
  open: boolean;
  mode: "create" | "edit";
  initialData?: ProjectModalData | null;
  onClose: () => void;
  onSuccess: (savedProject: any) => void;
}

export function ProjectModal({
  open,
  mode,
  initialData,
  onClose,
  onSuccess,
}: ProjectModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [desc, setDesc] = useState("");
  const [repo, setRepo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialData) {
        setName(initialData.name || "");
        setSlug(initialData.slug || "");
        setDesc(initialData.description || "");
        setRepo(initialData.github_repo || "");
      } else {
        setName("");
        setSlug("");
        setDesc("");
        setRepo("");
      }
      setError("");
    }
  }, [open, mode, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Vui lòng nhập tên dự án");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (mode === "create") {
        const cleanSlug =
          slug.trim() || name.trim().toLowerCase().replace(/[^a-z0-9]/g, "-");
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            slug: cleanSlug,
            description: desc,
            githubRepo: repo,
          }),
        });
        const data = await res.json();
        if (data.success && data.project) {
          onSuccess(data.project);
          onClose();
        } else {
          setError(data.error || "Không thể tạo dự án");
        }
      } else if (initialData?.id) {
        const res = await fetch(`/api/projects/${initialData.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            slug: slug.trim(),
            description: desc,
            githubRepo: repo,
          }),
        });
        const data = await res.json();
        if (data.success && data.project) {
          onSuccess(data.project);
          onClose();
        } else {
          setError(data.error || "Không thể cập nhật dự án");
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
      title={mode === "create" ? "Tạo Dự Án Mới" : "Chỉnh Sửa Dự Án"}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        ) : null}

        <Input
          label="Tên Dự Án (Bắt buộc)"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="VD: Era Web Client hoặc Gemsocial App"
        />

        <Input
          label="Slug / Mã Định Danh"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="VD: client, manage, gemsocial"
          className="font-mono"
        />

        <Input
          label="Kho GitHub Repository (Tùy chọn)"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          placeholder="VD: michaelngoc/era-tester"
          className="font-mono"
        />

        <Textarea
          label="Mô Tả Dự Án"
          rows={2}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Mô tả phạm vi hoặc đối tượng kiểm thử của dự án"
        />

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" isLoading={submitting}>
            {mode === "create" ? "Tạo Dự Án" : "Lưu Thay Đổi"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
