"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Upload,
  AlertCircle,
  ExternalLink,
  Trash2,
  GitCommit,
  Save,
  Image as ImageIcon,
  CheckCircle2,
  Wrench,
  Eye,
  Copy,
  Check,
  FileText,
  Terminal,
  FileCheck,
} from "lucide-react";
import JsonViewer from "./JsonViewer";

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
  created_at?: string;
}

interface CaseDetailModalProps {
  testCase: TestCase | null;
  onClose: () => void;
  onUpdate: (updated: TestCase) => void;
  onDelete?: (id: number) => void;
}

export default function CaseDetailModal({
  testCase,
  onClose,
  onUpdate,
  onDelete,
}: CaseDetailModalProps) {
  const [formData, setFormData] = useState<TestCase | null>(null);
  const [activeTab, setActiveTab] = useState<"scenario" | "io" | "json" | "evidence">("scenario");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-6 pb-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono font-bold text-slate-400 px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800">
                  Case #{formData.id}
                </span>

                {formData.is_impacted_by_git && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse">
                    <GitCommit className="w-3.5 h-3.5" />
                    Code Thay Đổi Từ Git Push
                  </span>
                )}
              </div>

              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="text-lg font-bold text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-sky-500 focus:outline-none w-full transition-all pb-1"
                placeholder="Nhập tiêu đề kịch bản kiểm thử..."
              />
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Status, Priority, Assignee & Claim Action selectors */}
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-slate-800/80">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold">Trạng thái:</span>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="NEW">Mới / Báo Lỗi (NEW)</option>
                <option value="FIX">Dev Đang Sửa (FIX)</option>
                <option value="VERIFY">Đang Xác Minh (VERIFY)</option>
                <option value="CLOSED">Đã Đóng (CLOSED - PASSED)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold">Mức độ ưu tiên:</span>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="LOW">Thấp (Low)</option>
                <option value="MEDIUM">Trung Bình (Medium)</option>
                <option value="HIGH">Cao (High)</option>
                <option value="CRITICAL">Khẩn Cấp (Critical)</option>
              </select>
            </div>

            {/* Phân công cho Developer / Tester */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold">Phụ trách:</span>
              <select
                value={formData.assigned_to || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    assigned_to: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer max-w-[190px] truncate"
              >
                <option value="">Chưa gán (Chờ nhận task)</option>
                <optgroup label="Developers (Sửa Bug)">
                  {users.developers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name || d.email} (Dev)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Testers / QA (Kiểm Thử)">
                  {users.testers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name || t.email} (Tester)
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Quick Claim Buttons */}
            {formData.status === "NEW" && (
              <button
                type="button"
                onClick={handleClaimBug}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/25 transition cursor-pointer"
                title="Tự động gán cho bạn và chuyển trạng thái sang Dev Đang Sửa (FIX)"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Nhận Sửa Bug Này</span>
              </button>
            )}

            {formData.is_impacted_by_git && (
              <button
                type="button"
                onClick={handleClaimTest}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 shadow-sm transition cursor-pointer"
                title="Tự động gán cho bạn phụ trách kiểm thử kịch bản này"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Nhận Kiểm Thử Lại</span>
              </button>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 pt-2 border-t border-slate-800/60 text-xs">
            <button
              onClick={() => setActiveTab("scenario")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                activeTab === "scenario"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Kịch Bản & Kết Quả
            </button>

            <button
              onClick={() => setActiveTab("io")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                activeTab === "io"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Đầu Vào & Đầu Ra (I/O)
            </button>

            <button
              onClick={() => setActiveTab("json")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                activeTab === "json"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              Response JSON
            </button>

            <button
              onClick={() => setActiveTab("evidence")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                activeTab === "evidence"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Bằng Chứng S3 ({formData.evidence_urls?.length || 0})
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {activeTab === "scenario" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Kết Quả Mong Đợi (Expected Result)
                </label>
                <textarea
                  rows={3}
                  value={formData.expected_result || ""}
                  onChange={(e) => setFormData({ ...formData, expected_result: e.target.value })}
                  placeholder="Mô tả kết quả chuẩn hệ thống phải đạt được..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Kết Quả Thực Tế (Actual Result / Chi Tiết Lỗi)
                </label>
                <textarea
                  rows={3}
                  value={formData.actual_result || ""}
                  onChange={(e) => setFormData({ ...formData, actual_result: e.target.value })}
                  placeholder="Ghi nhận lỗi thực tế nếu test case thất bại..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-rose-300 placeholder-slate-600 focus:outline-none focus:border-rose-500 transition"
                />
              </div>
            </div>
          )}

          {activeTab === "io" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Dữ Liệu Đầu Vào (Input Data)
                </label>
                <textarea
                  rows={6}
                  value={formData.input_data || ""}
                  onChange={(e) => setFormData({ ...formData, input_data: e.target.value })}
                  placeholder="VD: { email: 'admin@eraweb.io', role: 'admin' }"
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Dữ Liệu Đầu Ra (Output Data)
                </label>
                <textarea
                  rows={6}
                  value={formData.output_data || ""}
                  onChange={(e) => setFormData({ ...formData, output_data: e.target.value })}
                  placeholder="VD: HTTP 200 OK kèm User Profile Object"
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500 transition"
                />
              </div>
            </div>
          )}

          {activeTab === "json" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Dán Payload JSON / HTTP Response Trả Về
                </label>
                <textarea
                  rows={4}
                  value={formData.response_payload || ""}
                  onChange={(e) => setFormData({ ...formData, response_payload: e.target.value })}
                  placeholder='Dán JSON response: { "status": 200, "data": { ... } }'
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono text-sky-300 focus:outline-none focus:border-sky-500 transition"
                />
              </div>

              {formData.response_payload && (
                <JsonViewer data={formData.response_payload} title="Format JSON Trực Quan" />
              )}
            </div>
          )}

          {activeTab === "evidence" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <h4 className="text-xs font-bold text-white">Tải Lên Bằng Chứng Lỗi (AWS S3)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Hỗ trợ ảnh chụp màn hình (.png, .jpg) hoặc video quay luồng (.mp4, .webm).
                  </p>
                </div>

                <label className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md transition cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploading ? "Đang upload..." : "Tải Lên S3"}</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
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
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-sky-500/60 text-xs text-slate-300 hover:text-white transition group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />
                      <span className="truncate font-mono">Bằng chứng #{idx + 1}</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 shrink-0" />
                  </a>
                ))}

                {(!formData.evidence_urls || formData.evidence_urls.length === 0) && (
                  <div className="col-span-2 text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800/80 rounded-2xl">
                    Chưa có ảnh hoặc video nào được tải lên cho test case này.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 px-6 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          {onDelete ? (
            <button
              onClick={() => {
                if (confirm("Bạn có chắc chắn muốn xóa test case này?")) {
                  onDelete(formData.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 py-2 px-3 rounded-xl hover:bg-rose-500/10 transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa test case</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
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
