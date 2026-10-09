"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Upload,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Trash2,
  GitCommit,
  Save,
  Image as ImageIcon,
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
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData(testCase);
  }, [testCase]);

  if (!testCase || !formData) return null;

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

        // Update to DB
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-mono text-slate-400">Case #{formData.id}</span>
              {formData.is_impacted_by_git && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <GitCommit className="w-3 h-3" />
                  Code Changed (Git Push)
                </span>
              )}
            </div>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="text-lg font-bold text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-sky-500 focus:outline-none w-full"
            />
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Trạng thái & Ưu tiên */}
        <div className="grid grid-cols-2 gap-4 my-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
              Trạng thái (Workflow)
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="NEW">🔴 NEW (Mới / Bug)</option>
              <option value="FIX">🔵 FIX (Dev đã sửa)</option>
              <option value="VERIFY">🟣 VERIFY (Đang xác minh)</option>
              <option value="CLOSED">🟢 CLOSED (Đã đóng / Hoàn tất)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
              Mức độ ưu tiên
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="LOW">Thấp (Low)</option>
              <option value="MEDIUM">Trung bình (Medium)</option>
              <option value="HIGH">Cao (High)</option>
              <option value="CRITICAL">Nghiêm trọng (Critical)</option>
            </select>
          </div>
        </div>

        {/* Cột Input & Output */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
              Dữ liệu Đầu Vào (Input)
            </label>
            <textarea
              rows={3}
              value={formData.input_data || ""}
              onChange={(e) => setFormData({ ...formData, input_data: e.target.value })}
              placeholder="VD: { email: 'admin@eraweb.io', role: 'admin' }"
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
              Dữ liệu Đầu Ra (Output)
            </label>
            <textarea
              rows={3}
              value={formData.output_data || ""}
              onChange={(e) => setFormData({ ...formData, output_data: e.target.value })}
              placeholder="VD: HTTP 200 OK hoặc Token trả về"
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Kết quả mong đợi vs Thực tế */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
              Kết Quả Mong Đợi (Expected)
            </label>
            <textarea
              rows={3}
              value={formData.expected_result || ""}
              onChange={(e) => setFormData({ ...formData, expected_result: e.target.value })}
              placeholder="Hệ thống chuyển hướng vào dashboard và lưu session"
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
              Kết Quả Thực Tế (Actual Result)
            </label>
            <textarea
              rows={3}
              value={formData.actual_result || ""}
              onChange={(e) => setFormData({ ...formData, actual_result: e.target.value })}
              placeholder="Báo lỗi 500 hoặc không hiển thị modal"
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Response JSON Viewer */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-semibold uppercase text-slate-400">
              Response Return / Result JSON
            </label>
          </div>
          <textarea
            rows={3}
            value={formData.response_payload || ""}
            onChange={(e) => setFormData({ ...formData, response_payload: e.target.value })}
            placeholder='Dán payload JSON kết quả tại đây: { "status": 200, "message": "OK" }'
            className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-sky-400 focus:outline-none focus:border-sky-500 mb-2"
          />
          {formData.response_payload && (
            <JsonViewer data={formData.response_payload} title="Format JSON Xem Thử" />
          )}
        </div>

        {/* Evidence S3 Upload */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[11px] font-semibold uppercase text-slate-400">
              Bằng Chứng Lỗi (Ảnh / Video AWS S3)
            </label>
            <label className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>{uploading ? "Đang upload..." : "Tải ảnh/video lên S3"}</span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {(formData.evidence_urls || []).map((url, idx) => (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-sky-400 hover:border-sky-500/50 transition"
              >
                <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                <span>Bằng chứng #{idx + 1}</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
            ))}
            {(!formData.evidence_urls || formData.evidence_urls.length === 0) && (
              <p className="text-xs text-slate-500 italic">Chưa có ảnh hoặc video đính kèm.</p>
            )}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
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
              Xóa test case
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
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
