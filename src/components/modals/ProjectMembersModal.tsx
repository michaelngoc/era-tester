"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Users, UserPlus, Trash2, Shield, UserCheck, AlertCircle } from "lucide-react";
import { useToast } from "@/context/ToastContext";

export interface ProjectMembersModalProps {
  open: boolean;
  project: { id: number; name: string } | null;
  currentUser?: any;
  onClose: () => void;
  onUpdated?: () => void;
}

export function ProjectMembersModal({
  open,
  project,
  currentUser,
  onClose,
  onUpdated,
}: ProjectMembersModalProps) {
  const { toast, confirm } = useToast();
  const [members, setMembers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("QA");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isDev = currentUser?.role === "DEVELOPER";

  const fetchMembers = async () => {
    if (!project?.id) return;
    setLoading(true);
    setError("");
    try {
      const [membersRes, usersRes] = await Promise.all([
        fetch(`/api/projects/${project.id}/members`),
        fetch("/api/users"),
      ]);
      const membersData = await membersRes.json();
      const usersData = await usersRes.json();

      setMembers(membersData.members || []);
      setAllUsers(usersData.users || []);
    } catch {
      setError("Không thể tải danh sách thành viên");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && project?.id) {
      setSelectedUserId("");
      setSelectedRole("QA");
      fetchMembers();
    }
  }, [open, project?.id]);

  // Lọc ra các user chưa tham gia dự án này
  const memberUserIds = new Set(members.map((m) => m.user_id));
  const availableUsers = allUsers.filter((u) => !memberUserIds.has(u.id));

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project?.id || !selectedUserId) {
      setError("Vui lòng chọn nhân sự để thêm vào dự án");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${project.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: Number(selectedUserId),
          projectRole: selectedRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedUserId("");
        await fetchMembers();
        if (onUpdated) onUpdated();
        toast.success("Đã thêm thành viên vào dự án!");
      } else {
        setError(data.error || "Không thể thêm thành viên");
        toast.error(data.error || "Không thể thêm thành viên");
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId: number, userName: string) => {
    if (!project?.id) return;
    const ok = await confirm({
      title: "Gỡ thành viên",
      message: `Bạn có chắc muốn gỡ ${userName} khỏi dự án này?`,
      confirmText: "Gỡ thành viên",
      cancelText: "Hủy",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/projects/${project.id}/members?userId=${userId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        await fetchMembers();
        if (onUpdated) onUpdated();
        toast.success(`Đã gỡ ${userName} khỏi dự án`);
      } else {
        toast.error(data.error || "Không thể gỡ thành viên");
      }
    } catch {
      toast.error("Lỗi kết nối khi gỡ thành viên");
    }
  };

  if (!project) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Phân Công Thành Viên Dự Án: ${project.name}`}
      maxWidth="lg"
    >
      <div className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form thêm thành viên mới */}
        {!isDev && (
          <form
            onSubmit={handleAddMember}
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <UserPlus className="w-4 h-4 text-sky-500" />
              <span>Gán Nhân Sự Mới Vào Dự Án</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-6">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  disabled={submitting || availableUsers.length === 0}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer disabled:opacity-50"
                >
                  <option value="">
                    {availableUsers.length === 0
                      ? "-- Tất cả nhân sự đã ở trong dự án --"
                      : "-- Chọn nhân sự để gán vào dự án --"}
                  </option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      [{u.role || "MEMBER"}] {u.full_name || u.email} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="QA">QA (Đảm Bảo CL)</option>
                  <option value="QC">QC (Kiểm Thử)</option>
                  <option value="DEVELOPER">Developer (Phát Triển)</option>
                  <option value="LEADER">Leader (Trưởng Nhóm)</option>
                  <option value="PM">PM (Quản Lý DA)</option>
                  <option value="PO">PO (Chủ Sản Phẩm)</option>
                  <option value="BA">BA (Phân Tích NV)</option>
                  <option value="CTO">CTO (Giám Đốc CN)</option>
                </select>
              </div>

              <div className="sm:col-span-3 flex items-end">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={submitting}
                  disabled={!selectedUserId}
                  className="w-full text-xs py-2"
                >
                  + Thêm Vào Dự Án
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              * Chỉ những thành viên trong danh sách mới có thể xem kịch bản, nhận email thông báo và thao tác trên dự án này.
            </p>
          </form>
        )}

        {/* Danh sách thành viên hiện tại */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
              <Users className="w-4 h-4 text-indigo-500" />
              <span>Danh Sách Thành Viên Hiện Tại ({members.length})</span>
            </div>
            {loading && <span className="text-xs text-slate-400 animate-pulse">Đang tải...</span>}
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80 max-h-72 overflow-y-auto">
            {members.map((m) => (
              <div
                key={m.membership_id}
                className="p-3 bg-white dark:bg-slate-950/60 hover:bg-slate-50 dark:hover:bg-slate-900/40 flex items-center justify-between gap-3 transition"
              >
                <div className="flex items-center gap-3 truncate">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {(m.full_name || m.email || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {m.full_name || m.email}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30">
                        {m.project_role || m.system_role}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                      {m.email}
                    </div>
                  </div>
                </div>

                {!isDev && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(m.user_id, m.full_name || m.email)}
                    title="Gỡ khỏi dự án"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            {members.length === 0 && !loading && (
              <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                Chưa có thành viên nào được phân công vào dự án này.
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
}
