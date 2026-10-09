"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Upload,
  ExternalLink,
  Trash2,
  GitCommit,
  Save,
  Image as ImageIcon,
  CheckCircle2,
  Wrench,
  FileText,
  Terminal,
  FileCheck,
  Clock,
} from "lucide-react";
import JsonViewer from "./JsonViewer";
import CopyCommitSnippet from "./CopyCommitSnippet";
import CaseHistoryTimeline from "./CaseHistoryTimeline";

export interface TestCase {
  id: number;
  module_id: number;
  flow_id?: number | null;
  node_id?: string | null;
  title: string;
  input_data?: string | null;
  output_data?: string | null;
  expected_result?: string | null;
  actual_result?: string | null;
  response_payload?: string | null;
  evidence_urls?: string[] | null;
  status: "NEW" | "FIX" | "VERIFY" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  is_impacted_by_git?: boolean;
  assigned_to?: number | null;
  assigned_name?: string | null;
  created_by?: number | null;
  creator_name?: string | null;
  created_at?: string;
}

interface CaseDetailModalProps {
  testCase: TestCase | null;
  currentUser?: any;
  onClose: () => void;
  onUpdate: (updated: TestCase) => void;
  onDelete?: (id: number) => void;
}

export default function CaseDetailModal({
  testCase,
  currentUser,
  onClose,
  onUpdate,
  onDelete,
}: CaseDetailModalProps) {
  const [formData, setFormData] = useState<TestCase | null>(null);
  const [activeTab, setActiveTab] = useState<"scenario" | "io" | "json" | "evidence" | "history">("scenario");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<{ testers: any[]; developers: any[] }>({
    testers: [],
    developers: [],
  });

  useEffect(() => {
    setFormData(testCase);
  }, [testCase]);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (data?.testers && data?.developers) {
          setUsers({ testers: data.testers, developers: data.developers });
        }
      })
      .catch((e) => console.error("Could not fetch users for assignment:", e));
  }, []);

  if (!testCase || !formData) return null;

  const isDev = currentUser?.role === "DEVELOPER";
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const canDelete = isSuperAdmin || (testCase.created_by && testCase.created_by === currentUser?.id);

  const handleClaimBug = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/cases/${formData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim_bug" }),
      });
      const data = await res.json();
      if (data.success && data.case) {
        setFormData(data.case);
        onUpdate(data.case);
      }
    } catch (err) {
      console.error("Claim bug error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleClaimTest = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/cases/${formData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim_test" }),
      });
      const data = await res.json();
      if (data.success && data.case) {
        setFormData(data.case);
        onUpdate(data.case);
      }
    } catch (err) {
      console.error("Claim test error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/cases/${formData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          inputData: formData.input_data,
          outputData: formData.output_data,
          expectedResult: formData.expected_result,
          actualResult: formData.actual_result,
          responsePayload: formData.response_payload,
          status: formData.status,
          priority: formData.priority,
          assignedTo: formData.assigned_to,
        }),
      });
      const data = await res.json();
      if (data.success && data.case) {
        onUpdate(data.case);
        onClose();
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body,
      });
      const data = await res.json();

      if (data.success && data.url) {
        const nextUrls = [...(formData.evidence_urls || []), data.url];
        setFormData({ ...formData, evidence_urls: nextUrls });

        await fetch(`/api/cases/${formData.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ evidenceUrls: nextUrls }),
        });
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden transition-colors duration-150">
        {/* Modal Top Header */}
        <div className="p-6 pb-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-slate-800">
                  Kịch Bản #{formData.id}
                </span>

                {formData.is_impacted_by_git && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 animate-pulse">
                    <GitCommit className="w-3.5 h-3.5" />
                    Mã Nguồn Có Thay Đổi Từ Git
                  </span>
                )}
              </div>

              <input
                type="text"
                value={formData.title}
                disabled={isDev}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={`text-lg font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-sky-500 focus:outline-none w-full transition-all pb-1 ${
                  isDev ? "opacity-75 cursor-not-allowed select-text" : ""
                }`}
                placeholder="Nhập tiêu đề kịch bản kiểm thử..."
              />
              {isDev && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1 font-sans">
                  🔒 Lập trình viên không được sửa Tiêu đề, Input & Kết quả kỳ vọng của Tester
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Snippet 1-Click Copy Commit cho Developer */}
          <div className="mt-3">
            <CopyCommitSnippet caseId={formData.id} caseTitle={formData.title} />
          </div>

          {/* Quick Status, Priority, Assignee & Claim Action selectors */}
          <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-semibold">Trạng thái:</span>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="NEW">Lỗi Phát Sinh (Mới)</option>
                <option value="FIX">Đang Khắc Phục (Dev Đang Sửa)</option>
                <option value="VERIFY">Chờ Xác Minh (QA Kiểm Thử Lại)</option>
                <option value="CLOSED">Kiểm Thử Đạt (Hoàn Tất)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-semibold">Mức độ ưu tiên:</span>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="LOW">Thấp (Low)</option>
                <option value="MEDIUM">Trung Bình (Medium)</option>
                <option value="HIGH">Cao (High)</option>
                <option value="CRITICAL">Khẩn Cấp (Critical)</option>
              </select>
            </div>

            {/* Phân công cho Developer / Tester */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-semibold">Phụ trách:</span>
              <select
                value={formData.assigned_to || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    assigned_to: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="">Chưa phân công</option>
                <optgroup label="Kiểm Thử Viên (Tester)">
                  {users.testers.map((t) => (
                    <option key={`t-${t.id}`} value={t.id}>
                      QA: {t.full_name || t.email}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Lập Trình Viên (Dev)">
                  {users.developers.map((d) => (
                    <option key={`d-${d.id}`} value={d.id}>
                      Dev: {d.full_name || d.email}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Action Buttons */}
            {formData.status === "NEW" && (
              <button
                type="button"
                onClick={handleClaimBug}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-md shadow-sky-600/20 transition cursor-pointer"
                title="Tự động gán cho bạn và chuyển trạng thái sang Đang Khắc Phục (FIX)"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Nhận Sửa Lỗi Này</span>
              </button>
            )}

            {formData.is_impacted_by_git && (
              <button
                type="button"
                onClick={handleClaimTest}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-300 dark:border-amber-500/40 shadow-sm transition cursor-pointer"
                title="Tự động gán cho bạn phụ trách kiểm thử kịch bản này"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Nhận Kiểm Thử Lại</span>
              </button>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 pt-2 border-t border-slate-200 dark:border-slate-800/60 text-xs overflow-x-auto">
            <button
              onClick={() => setActiveTab("scenario")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer shrink-0 ${
                activeTab === "scenario"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/60"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Kịch Bản & Kết Quả
            </button>

            <button
              onClick={() => setActiveTab("io")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer shrink-0 ${
                activeTab === "io"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/60"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Đầu Vào & Đầu Ra (I/O)
            </button>

            <button
              onClick={() => setActiveTab("json")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer shrink-0 ${
                activeTab === "json"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/60"
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              Dữ Liệu JSON
            </button>

            <button
              onClick={() => setActiveTab("evidence")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer shrink-0 ${
                activeTab === "evidence"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/60"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Bằng Chứng S3 ({formData.evidence_urls?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer shrink-0 ${
                activeTab === "history"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/60"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Lịch Sử & Audit Log
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {activeTab === "scenario" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Kết Quả Mong Đợi (Expected Result)</span>
                  {isDev && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                      🔒 Chỉ Tester & Super Admin mới được sửa
                    </span>
                  )}
                </label>
                <textarea
                  rows={3}
                  value={formData.expected_result || ""}
                  disabled={isDev}
                  onChange={(e) =>
                    setFormData({ ...formData, expected_result: e.target.value })
                  }
                  placeholder="Mô tả hành vi mong muốn đạt được..."
                  className={`w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-sky-500 transition ${
                    isDev ? "opacity-75 cursor-not-allowed select-text" : ""
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-600 dark:text-rose-400 mb-1.5">
                  Kết Quả Thực Tế (Actual Result / Mô tả lỗi phát sinh)
                </label>
                <textarea
                  rows={3}
                  value={formData.actual_result || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, actual_result: e.target.value })
                  }
                  placeholder="Ghi nhận hiện tượng lỗi thực tế..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-rose-300 dark:border-rose-900/50 rounded-2xl text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-rose-500 transition"
                />
              </div>
            </div>
          )}

          {activeTab === "io" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Dữ Liệu Đầu Vào (Input Data)</span>
                  {isDev && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                      🔒 Đề bài cố định
                    </span>
                  )}
                </label>
                <textarea
                  rows={6}
                  value={formData.input_data || ""}
                  disabled={isDev}
                  onChange={(e) => setFormData({ ...formData, input_data: e.target.value })}
                  placeholder="VD: { email: 'ten.ho@eragroup.com.vn', role: 'admin' }"
                  className={`w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl text-xs font-mono text-slate-900 dark:text-slate-200 focus:outline-none focus:border-sky-500 transition ${
                    isDev ? "opacity-75 cursor-not-allowed select-text" : ""
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Dữ Liệu Đầu Ra (Output Data)</span>
                  {isDev && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                      🔒 Đề bài cố định
                    </span>
                  )}
                </label>
                <textarea
                  rows={6}
                  value={formData.output_data || ""}
                  disabled={isDev}
                  onChange={(e) => setFormData({ ...formData, output_data: e.target.value })}
                  placeholder="VD: HTTP 200 OK kèm thông tin hồ sơ người dùng"
                  className={`w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl text-xs font-mono text-slate-900 dark:text-slate-200 focus:outline-none focus:border-sky-500 transition ${
                    isDev ? "opacity-75 cursor-not-allowed select-text" : ""
                  }`}
                />
              </div>
            </div>
          )}

          {activeTab === "json" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Dán Payload JSON / HTTP Response Trả Về
                </label>
                <textarea
                  rows={4}
                  value={formData.response_payload || ""}
                  onChange={(e) => setFormData({ ...formData, response_payload: e.target.value })}
                  placeholder='Dán JSON response: { "status": 200, "data": { ... } }'
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl text-xs font-mono text-sky-700 dark:text-sky-300 focus:outline-none focus:border-sky-500 transition"
                />
              </div>

              {formData.response_payload && (
                <JsonViewer data={formData.response_payload} title="Format JSON Trực Quan" />
              )}
            </div>
          )}

          {activeTab === "evidence" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Tải Lên Bằng Chứng Lỗi (AWS S3)</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Hỗ trợ ảnh chụp màn hình (.png, .jpg) hoặc tệp nhật ký (.log, .txt).
                  </p>
                </div>

                <label className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md transition cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploading ? "Đang tải lên..." : "Tải Lên S3"}</span>
                  <input
                    type="file"
                    accept="image/*,video/*,.log,.txt"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(formData.evidence_urls || []).map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-sky-500/60 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <ImageIcon className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
                      <span className="truncate font-mono">Bằng chứng #{idx + 1}</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500 shrink-0" />
                  </a>
                ))}

                {(!formData.evidence_urls || formData.evidence_urls.length === 0) && (
                  <div className="col-span-2 text-center py-8 text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl">
                    Chưa có ảnh hoặc nhật ký nào được tải lên cho kịch bản này.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="pt-2">
              <CaseHistoryTimeline
                caseId={formData.id}
                userRole={currentUser?.role}
                onRollbackSuccess={(restoredCase) => {
                  setFormData(restoredCase);
                  onUpdate(restoredCase);
                }}
              />
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between">
          {onDelete && canDelete ? (
            <button
              onClick={() => {
                if (confirm("Bạn có chắc chắn muốn xóa mềm kịch bản này? Dữ liệu vẫn được bảo lưu an toàn trong hệ thống.")) {
                  onDelete(formData.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 py-2 px-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa kịch bản</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Đóng
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 rounded-xl shadow-lg shadow-sky-600/20 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Đang lưu..." : "Lưu Thay Đổi"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
