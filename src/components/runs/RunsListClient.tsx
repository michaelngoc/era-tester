"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  PlayCircle,
  Archive,
  GitCommit,
  Clock,
  User,
  ExternalLink,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import CreateRunModal from "./CreateRunModal";
import { useToast } from "@/context/ToastContext";

export interface RunItem {
  id: number;
  project_id: number;
  project_name: string;
  github_repo?: string | null;
  title: string;
  run_type: "FULL_REGRESSION" | "DAILY_INCREMENTAL" | "MANUAL";
  git_commit_hash?: string | null;
  git_commit_message?: string | null;
  git_author?: string | null;
  status: "IN_PROGRESS" | "COMPLETED" | "ABORTED";
  total_cases_count?: number;
  passed_cases_count?: number;
  failed_cases_count?: number;
  fixing_cases_count?: number;
  creator_name?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface RunsListClientProps {
  initialRuns: RunItem[];
  projects: Array<{ id: number; name: string }>;
}

export default function RunsListClient({
  initialRuns,
  projects,
}: RunsListClientProps) {
  const { toast, confirm } = useToast();
  const [runs, setRuns] = useState<RunItem[]>(initialRuns);
  const [selectedProjectId, setSelectedProjectId] = useState<number | "ALL">("ALL");
  const [tab, setTab] = useState<"in_progress" | "completed">("in_progress");
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [completingId, setCompletingId] = useState<number | null>(null);

  // Reload runs
  const fetchRuns = async () => {
    try {
      const url =
        selectedProjectId === "ALL"
          ? "/api/runs"
          : `/api/runs?projectId=${selectedProjectId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data?.runs) setRuns(data.runs);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredRuns = useMemo(() => {
    return runs.filter((r) => {
      const matchProj =
        selectedProjectId === "ALL" || r.project_id === selectedProjectId;
      const matchTab =
        tab === "in_progress"
          ? r.status === "IN_PROGRESS"
          : r.status === "COMPLETED";
      return matchProj && matchTab;
    });
  }, [runs, selectedProjectId, tab]);

  // KPIs
  const stats = useMemo(() => {
    const inProgress = runs.filter((r) => r.status === "IN_PROGRESS").length;
    const completed = runs.filter((r) => r.status === "COMPLETED").length;
    const total = runs.length;
    return { inProgress, completed, total };
  }, [runs]);

  const handleCompleteRun = async (runId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: "Chốt nghiệm thu đợt kiểm thử",
      message:
        "Bạn có chắc muốn khóa và chốt nghiệm thu đợt kiểm thử này? Kết quả sẽ được lưu trữ vĩnh viễn vào lịch sử kiểm thử.",
      confirmText: "Khóa & Chốt Đợt",
      cancelText: "Hủy",
      variant: "primary",
    });
    if (!confirmed) return;

    setCompletingId(runId);
    try {
      const res = await fetch(`/api/runs/${runId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Đã khóa và chốt nghiệm thu đợt kiểm thử thành công!");
        await fetchRuns();
      } else {
        toast.error(data.error || "Không thể chốt nghiệm thu");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Lỗi kết nối khi chốt nghiệm thu: " + err.message);
    } finally {
      setCompletingId(null);
    }
  };

  const getRunTypeBadge = (type: string) => {
    switch (type) {
      case "FULL_REGRESSION":
        return (
          <span className="px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            Kiểm Thử Toàn Diện (Full Regression)
          </span>
        );
      case "DAILY_INCREMENTAL":
        return (
          <span className="px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            Kiểm Thử Nhanh Hàng Ngày (Daily)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
            Đợt Test Tùy Chỉnh
          </span>
        );
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Nhật Ký Chạy Test & Đợt Kiểm Thử (Test Runs)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Theo dõi tiến độ, tỷ lệ Pass/Fail theo từng phiên bản, đợt Release và commit Git
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedProjectId}
            onChange={(e) =>
              setSelectedProjectId(
                e.target.value === "ALL" ? "ALL" : Number(e.target.value)
              )
            }
            className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer shadow-sm"
          >
            <option value="ALL">Tất Cả Dự Án</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <Button
            variant="emerald"
            size="md"
            onClick={() => setOpenCreateModal(true)}
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Đợt Test Mới</span>
          </Button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tổng Đợt Kiểm Thử
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">
              {stats.total}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Archive className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900/80 border border-amber-200 dark:border-amber-900/40 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Đang Chạy (In Progress)
            </div>
            <div className="text-2xl font-extrabold font-mono text-amber-600 dark:text-amber-300 mt-1">
              {stats.inProgress}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <PlayCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-900/40 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Đã Chốt Nghiệm Thu
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-300 mt-1">
              {stats.completed}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Lock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tab Switcher: In-Progress vs Completed */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setTab("in_progress")}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
            tab === "in_progress"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
          }`}
        >
          <PlayCircle className="w-4 h-4" />
          <span>Đang Thực Hiện ({stats.inProgress})</span>
        </button>

        <button
          onClick={() => setTab("completed")}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
            tab === "completed"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Lịch Sử Đã Khóa ({stats.completed})</span>
        </button>
      </div>

      {/* Danh Sách Cards Đợt Test */}
      <div className="space-y-4">
        {filteredRuns.map((r) => {
          const total = Number(r.total_cases_count) || 0;
          const passed = Number(r.passed_cases_count) || 0;
          const failed = Number(r.failed_cases_count) || 0;
          const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

          return (
            <div
              key={r.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {r.title}
                    </h3>
                    {getRunTypeBadge(r.run_type)}
                    <span className="text-[11px] font-semibold text-slate-500">
                      Dự án: <strong className="text-slate-800 dark:text-slate-200">{r.project_name}</strong>
                    </span>
                  </div>

                  {r.git_commit_hash && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono pt-0.5">
                      <GitCommit className="w-3.5 h-3.5 text-sky-500" />
                      <span className="text-sky-600 dark:text-sky-400 font-bold">
                        {r.git_commit_hash.slice(0, 7)}
                      </span>
                      <span>—</span>
                      <span className="truncate max-w-md">{r.git_commit_message}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {r.status === "IN_PROGRESS" && (
                    <Button
                      variant="emerald"
                      size="sm"
                      isLoading={completingId === r.id}
                      onClick={(e) => handleCompleteRun(r.id, e)}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Chốt Nghiệm Thu</span>
                    </Button>
                  )}

                  <a
                    href={`/?projectId=${r.project_id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition"
                  >
                    <span>Vào Bảng Test</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Tiến Độ Đạt: <strong className="text-emerald-600 dark:text-emerald-400">{passRate}%</strong> ({passed}/{total} kịch bản)
                  </span>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      Đạt: {passed}
                    </span>
                    <span className="text-rose-600 dark:text-rose-400 font-bold">
                      Lỗi: {failed}
                    </span>
                  </div>
                </div>

                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${passRate}%` }}
                    className="h-full bg-emerald-500 transition-all duration-300"
                  />
                  {failed > 0 && total > 0 && (
                    <div
                      style={{ width: `${Math.round((failed / total) * 100)}%` }}
                      className="h-full bg-rose-500 transition-all duration-300"
                    />
                  )}
                </div>
              </div>

              {/* Footer: User & Time */}
              <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Tạo bởi: {r.creator_name || "Hệ thống"}</span>
                </div>

                <div className="flex items-center gap-1.5 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Khởi tạo: {new Date(r.created_at).toLocaleString("vi-VN")}
                    {r.completed_at ? ` — Đã khóa: ${new Date(r.completed_at).toLocaleString("vi-VN")}` : ""}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredRuns.length === 0 && (
          <div className="text-center py-12 p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white/50 dark:bg-slate-900/30 text-xs text-slate-400">
            Không có đợt kiểm thử nào trong mục này. Bấm &quot;Tạo Đợt Test Mới&quot; để bắt đầu.
          </div>
        )}
      </div>

      {/* Modal Tạo Đợt Test */}
      <CreateRunModal
        open={openCreateModal}
        projects={projects}
        onClose={() => setOpenCreateModal(false)}
        onSuccess={() => fetchRuns()}
      />
    </div>
  );
}
