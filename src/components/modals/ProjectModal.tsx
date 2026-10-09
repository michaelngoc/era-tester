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
  notify_deploy_roles?: string[];
}

export interface ProjectModalProps {
  open: boolean;
  mode: "create" | "edit";
  initialData?: ProjectModalData | null;
  onClose: () => void;
  onSuccess: (savedProject: any) => void;
}

const AVAILABLE_DEPLOY_ROLES = [
  { role: "LEADER", label: "Leader (Trưởng Nhóm / Phụ Trách)" },
  { role: "CTO", label: "CTO (Giám Đốc Công Nghệ)" },
  { role: "SUPER_ADMIN", label: "Super Admin (Quản Trị Tối Cao)" },
  { role: "PM", label: "PM (Quản Lý Dự Án)" },
  { role: "PO", label: "PO (Chủ Sở Hữu Sản Phẩm)" },
  { role: "QA", label: "QA (Đảm Bảo Chất Lượng)" },
  { role: "QC", label: "QC (Kiểm Thử Viên)" },
];

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
  const [notifyRoles, setNotifyRoles] = useState<string[]>(["LEADER"]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialData) {
        setName(initialData.name || "");
        setSlug(initialData.slug || "");
        setDesc(initialData.description || "");
        setRepo(initialData.github_repo || "");
        const roles = Array.isArray(initialData.notify_deploy_roles)
          ? initialData.notify_deploy_roles
          : typeof initialData.notify_deploy_roles === "string"
          ? JSON.parse(initialData.notify_deploy_roles)
          : ["LEADER"];
        setNotifyRoles(roles);
      } else {
        setName("");
        setSlug("");
        setDesc("");
        setRepo("");
        setNotifyRoles(["LEADER"]);
      }
      setError("");
    }
  }, [open, mode, initialData]);

  const toggleRole = (role: string) => {
    setNotifyRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

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
            notifyDeployRoles: notifyRoles.length > 0 ? notifyRoles : ["LEADER"],
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
            notifyDeployRoles: notifyRoles.length > 0 ? notifyRoles : ["LEADER"],
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

        {/* Cấu hình vai trò nhận email sau khi Deploy xong */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 space-y-2.5">
          <div>
            <label className="text-xs font-bold text-indigo-900 dark:text-indigo-200 block">
              📧 Nhận Email Thông Báo Sau Khi Deploy Production:
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Chọn các chức vụ sẽ nhận email báo cáo khi Dev hoàn tất merge & deploy Prod:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {AVAILABLE_DEPLOY_ROLES.map(({ role, label }) => {
              const checked = notifyRoles.includes(role);
              return (
                <label
                  key={role}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer select-none transition ${
                    checked
                      ? "bg-indigo-100/70 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-700 font-semibold text-indigo-950 dark:text-indigo-200"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleRole(role)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        </div>

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
