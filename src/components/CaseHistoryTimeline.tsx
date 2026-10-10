"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Clock,
  GitCommit,
  Send,
  Sparkles,
  FileCode,
  Image as ImageIcon,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";

export interface HistoryItem {
  id: number;
  case_id: number;
  run_id?: number | null;
  run_title?: string | null;
  actor_id?: number | null;
  actor_name?: string | null;
  action: string;
  from_status?: string | null;
  to_status?: string | null;
  note?: string | null;
  git_commit_hash?: string | null;
  evidence_urls?: string[] | null;
  response_payload?: any | null;
  old_snapshot?: any | null;
  created_at: string;
}

export interface CaseHistoryTimelineProps {
  caseId: number;
  className?: string;
  userRole?: string;
  onRollbackSuccess?: (restoredCase: any) => void;
}

export default function CaseHistoryTimeline({
  caseId,
  className = "",
  userRole,
  onRollbackSuccess,
}: CaseHistoryTimelineProps) {
  const { toast, confirm } = useToast();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [rollingBackId, setRollingBackId] = useState<number | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/cases/${caseId}/history`);
      const data = await res.json();
      if (data?.history) {
        setHistory(data.history);
      }
    } catch (err) {
      console.error("Lỗi tải lịch sử test:", err);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSubmittingNote(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "NOTE_ADDED",
          note: newNote.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.historyItem) {
        setHistory((prev) => [data.historyItem, ...prev]);
        setNewNote("");
      }
    } catch (err) {
      console.error("Lỗi thêm ghi chú:", err);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleRollback = async (item: HistoryItem) => {
    if (!item.old_snapshot) return;
    const confirmed = await confirm({
      title: "Xác nhận khôi phục bản chụp",
      message: `Bạn có chắc chắn muốn đưa kịch bản kiểm thử về bản chụp tại mốc thời gian này?\n• Tiêu đề: "${item.old_snapshot.title}"\n• Trạng thái: ${item.old_snapshot.status}\n• Mức độ ưu tiên: ${item.old_snapshot.priority}`,
      confirmText: "Khôi Phục",
      cancelText: "Hủy",
      variant: "primary",
    });
    if (!confirmed) return;

    setRollingBackId(item.id);
    try {
      const res = await fetch(`/api/cases/${caseId}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historyId: item.id }),
      });
      const data = await res.json();
      if (data.success && data.case) {
        toast.success(data.message || "Đã khôi phục thành công kịch bản kiểm thử!");
        await fetchHistory();
        if (onRollbackSuccess) {
          onRollbackSuccess(data.case);
        }
      } else {
        toast.error(data.error || "Không thể khôi phục bản chụp này");
      }
    } catch (err: any) {
      console.error("Rollback error:", err);
      toast.error("Lỗi kết nối khi gửi yêu cầu khôi phục!");
    } finally {
      setRollingBackId(null);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "ROLLBACK_RESTORE":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <RotateCcw className="w-3 h-3" />
            Khôi Phục Bản Chụp
          </span>
        );
      case "CONTENT_UPDATE":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
            Cập Nhật Nội Dung
          </span>
        );
      case "AUTO_GIT_VERIFY":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Git Tự Động Verify
          </span>
        );
      case "CLAIM_BUG":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            Dev Đã Nhận Sửa
          </span>
        );
      case "STATUS_CHANGE":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
            Đổi Trạng Thái
          </span>
        );
      case "RUN_INIT":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            Khởi Tạo Đợt Test
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30">
            Ghi Chú
          </span>
        );
    }
  };

  const formatStatus = (status?: string | null) => {
    switch (status) {
      case "NEW":
        return <span className="font-bold text-rose-500">Lỗi Phát Sinh (NEW)</span>;
      case "FIX":
        return <span className="font-bold text-sky-500">Đang Khắc Phục (FIX)</span>;
      case "VERIFY":
        return <span className="font-bold text-purple-500">Chờ Xác Minh (VERIFY)</span>;
      case "CLOSED":
        return <span className="font-bold text-emerald-500">Kiểm Thử Đạt (CLOSED)</span>;
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-xs text-slate-500">
        <span className="inline-block w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mr-2" />
        Đang tải dòng thời gian lịch sử...
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Form thêm ghi chú / trao đổi */}
      <form onSubmit={handleAddNote} className="flex gap-2">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Thêm ghi chú kiểm thử hoặc phản hồi cho dev/tester..."
          className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
        />
        <Button type="submit" variant="primary" size="sm" isLoading={submittingNote}>
          <Send className="w-3.5 h-3.5" />
          <span>Gửi</span>
        </Button>
      </form>

      {/* Danh sách Timeline dọc */}
      <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {history.map((item) => (
          <div key={item.id} className="relative group">
            {/* Điểm nút Timeline */}
            <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-sky-500 ring-4 ring-white dark:ring-slate-900 shadow-sm" />

            <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-2 text-xs">
              {/* Header của mục lịch sử */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {item.actor_name || "Hệ Thống Git"}
                  </span>
                  {getActionBadge(item.action)}
                </div>

                <div className="flex items-center gap-1.5 text-[10.5px] text-slate-400 font-mono">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(item.created_at).toLocaleString("vi-VN")}</span>
                </div>
              </div>

              {/* Chuyển dịch trạng thái nếu có */}
              {item.from_status && item.to_status && item.from_status !== item.to_status && (
                <div className="text-[11px] bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                  <span className="text-slate-500">Chuyển:</span>
                  {formatStatus(item.from_status)}
                  <span className="text-slate-400">➔</span>
                  {formatStatus(item.to_status)}
                </div>
              )}

              {/* Nội dung ghi chú */}
              {item.note && (
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                  {item.note}
                </p>
              )}

              {/* Commit Hash liên quan */}
              {item.git_commit_hash && (
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 font-mono text-[11px] text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-800">
                  <GitCommit className="w-3.5 h-3.5" />
                  <span>Commit: {item.git_commit_hash.slice(0, 7)}</span>
                </div>
              )}

              {/* Đợt test liên quan */}
              {item.run_title && (
                <span className="ml-2 text-[10px] text-slate-400">
                  (Đợt: {item.run_title})
                </span>
              )}

              {/* Ảnh / Video bằng chứng đính kèm */}
              {item.evidence_urls && item.evidence_urls.length > 0 && (
                <div className="pt-1.5">
                  <div className="text-[10px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    <span>Bằng chứng của lần test này ({item.evidence_urls.length}):</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.evidence_urls.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative block w-14 h-14 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt="Bằng chứng"
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Payload JSON ghi nhận */}
              {item.response_payload && (
                <details className="pt-1 text-[11px]">
                  <summary className="cursor-pointer text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 font-mono">
                    <FileCode className="w-3 h-3" />
                    <span>Xem Response Payload</span>
                  </summary>
                  <pre className="mt-1 p-2 bg-slate-950 text-emerald-400 rounded-xl overflow-x-auto font-mono text-[10px]">
                    {typeof item.response_payload === "string"
                      ? item.response_payload
                      : JSON.stringify(item.response_payload, null, 2)}
                  </pre>
                </details>
              )}

              {/* Bản chụp Snapshot & 1-Click Rollback */}
              {item.old_snapshot && (
                <div className="mt-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[11px] text-amber-900 dark:text-amber-200 space-y-0.5">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>📸 Bản Chụp Nội Dung (Snapshot):</span>
                    </div>
                    <div className="text-[11px] text-slate-700 dark:text-slate-300 font-mono">
                      &quot;{item.old_snapshot.title}&quot; • Trạng thái: {item.old_snapshot.status} • Ưu tiên: {item.old_snapshot.priority}
                    </div>
                  </div>

                  {userRole !== "DEVELOPER" && (
                    <button
                      type="button"
                      onClick={() => handleRollback(item)}
                      disabled={rollingBackId === item.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-100 bg-amber-200/80 hover:bg-amber-300 dark:bg-amber-500/25 dark:hover:bg-amber-500/40 border border-amber-300 dark:border-amber-500/40 transition shadow-sm cursor-pointer disabled:opacity-50"
                      title="Khôi phục lại toàn bộ nội dung kịch bản theo bản chụp này"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{rollingBackId === item.id ? "Đang hoàn tác..." : "Khôi Phục Bản Này"}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {history.length === 0 && (
          <div className="text-center py-6 text-slate-400 text-xs italic">
            Chưa có dòng lịch sử nào. Khi có thay đổi trạng thái hoặc commit Git, lịch sử sẽ tự động hiển thị ở đây.
          </div>
        )}
      </div>
    </div>
  );
}
