"use client";

import React, { useState } from "react";
import { TestCase } from "./CaseDetailModal";
import {
  X,
  Plus,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Eye,
  Trash2,
  Sparkles,
  LogIn,
  LogOut,
  Code2,
  Image as ImageIcon,
  Copy,
  Check,
  Upload,
  ExternalLink,
  Edit3,
  FileText,
  User,
  ZoomIn,
} from "lucide-react";

interface StepChecklistDrawerProps {
  step: {
    id: string;
    title: string;
    description?: string;
  } | null;
  cases: TestCase[];
  moduleId: number;
  flowId?: number | null;
  onClose: () => void;
  onSelectCase: (testCase: TestCase) => void;
  onAddCase: (newCase: Partial<TestCase>) => Promise<void>;
  onUpdateCase?: (updated: TestCase) => void;
  onStatusChange: (id: number, nextStatus: "NEW" | "FIX" | "VERIFY" | "CLOSED") => void;
  onDeleteCase: (id: number) => void;
  onDeleteStep?: (stepId: string) => void;
  onClaimTask?: (id: number, action: "claim_bug" | "claim_test") => void;
}

export default function StepChecklistDrawer({
  step,
  cases,
  moduleId,
  flowId,
  onClose,
  onSelectCase,
  onAddCase,
  onUpdateCase,
  onStatusChange,
  onDeleteCase,
  onDeleteStep,
  onClaimTask,
}: StepChecklistDrawerProps) {
  // Form tạo kịch bản mới
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newInput, setNewInput] = useState("");
  const [newOutput, setNewOutput] = useState("");
  const [newExpected, setNewExpected] = useState("");
  const [newActual, setNewActual] = useState("");
  const [newResponseJson, setNewResponseJson] = useState("");
  const [newEvidenceUrls, setNewEvidenceUrls] = useState<string[]>([]);
  const [newStatus, setNewStatus] = useState<"NEW" | "CLOSED">("CLOSED");
  const [newPriority, setNewPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [submitting, setSubmitting] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  // Xem ảnh phóng to Lightbox
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Copy feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Upload ảnh trực tiếp cho một kịch bản đã có
  const [uploadingCaseId, setUploadingCaseId] = useState<number | null>(null);

  if (!step) return null;

  // Lọc các test cases thuộc bước này
  const stepCases = cases.filter((c) => c.node_id === step.id);
  const passedCount = stepCases.filter((c) => c.status === "CLOSED").length;
  const bugsCount = stepCases.filter((c) => c.status === "NEW").length;
  const fixingCount = stepCases.filter((c) => c.status === "FIX").length;
  const verifyingCount = stepCases.filter((c) => c.status === "VERIFY").length;

  const handleCopyText = (key: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleUploadFileForNewForm = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingEvidence(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data?.url) {
        setNewEvidenceUrls((prev) => [...prev, data.url]);
      } else {
        alert("Tải lên thất bại: " + (data?.error || "Lỗi không xác định"));
      }
    } catch (err: any) {
      alert("Lỗi tải lên: " + err.message);
    } finally {
      setUploadingEvidence(false);
      e.target.value = "";
    }
  };

  const handleAddAttachmentToCase = async (
    caseItem: TestCase,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCaseId(caseItem.id);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data?.url) {
        const nextUrls = [...(caseItem.evidence_urls || []), data.url];
        const updateRes = await fetch(`/api/cases/${caseItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ evidence_urls: nextUrls }),
        });
        const updateData = await updateRes.json();
        if (updateData.success && updateData.case && onUpdateCase) {
          onUpdateCase(updateData.case);
        }
      } else {
        alert("Tải lên thất bại: " + (data?.error || "Lỗi không xác định"));
      }
    } catch (err: any) {
      alert("Lỗi tải ảnh: " + err.message);
    } finally {
      setUploadingCaseId(null);
      e.target.value = "";
    }
  };

  const handleCreateChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSubmitting(true);
    try {
      await onAddCase({
        module_id: moduleId,
        flow_id: flowId || null,
        node_id: step.id,
        title: newTitle.trim(),
        input_data: newInput.trim(),
        output_data: newOutput.trim(),
        expected_result: newExpected.trim(),
        actual_result: newActual.trim(),
        response_payload: newResponseJson.trim(),
        evidence_urls: newEvidenceUrls,
        status: newStatus,
        priority: newPriority,
      });

      // Reset form
      setNewTitle("");
      setNewInput("");
      setNewOutput("");
      setNewExpected("");
      setNewActual("");
      setNewResponseJson("");
      setNewEvidenceUrls([]);
      setNewStatus("CLOSED");
      setShowAddForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const formatJsonDisplay = (raw?: string | null) => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
    }
  };

  return (
    <>
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl lg:max-w-3xl bg-white/98 dark:bg-slate-900/98 backdrop-blur-2xl border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 transition-colors duration-150">
        {/* Header Drawer */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-start justify-between">
          <div className="flex-1 mr-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-mono font-bold text-sky-600 dark:text-sky-400 px-2.5 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20">
                {step.id}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Chi Tiết Bước & Danh Sách Kịch Bản</span>
            </div>

            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                {step.title}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                ({stepCases.length})
              </span>
            </div>

            {step.description && (
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{step.description}</p>
            )}

            {/* Quick stats badge */}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                Tổng Kịch Bản: <strong>{stepCases.length}</strong>
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Đạt: {passedCount}
              </span>
              {bugsCount > 0 && (
                <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Lỗi Phát Sinh: {bugsCount}
                </span>
              )}
              {fixingCount > 0 && (
                <span className="text-sky-600 dark:text-sky-400 font-medium flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5" />
                  Đang Khắc Phục: {fixingCount}
                </span>
              )}
              {verifyingCount > 0 && (
                <span className="text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  Chờ Xác Minh: {verifyingCount}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Đóng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thân Drawer: Danh sách kịch bản */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span>Kịch Bản Kiểm Thử Bước Này</span>
              <span className="text-sky-600 dark:text-sky-400 font-mono">({stepCases.length})</span>
            </span>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-md shadow-sky-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Kịch Bản</span>
            </button>
          </div>

          {/* Form Thêm Kịch Bản Mới */}
          {showAddForm && (
            <form
              onSubmit={handleCreateChecklist}
              className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-sky-500/40 shadow-xl space-y-4 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sky-500" />
                  Thêm Kịch Bản Kiểm Thử Cho Bước ({step.id})
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs"
                >
                  Đóng
                </button>
              </div>

              {/* Tiêu đề */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tiêu đề kịch bản / điều kiện test <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="VD: Để trống ô Email -> Hiển thị lỗi đỏ 'Vui lòng nhập email'"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Hàng 1: Input & Output */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <LogIn className="w-3.5 h-3.5 text-sky-500" />
                    <span>Dữ Liệu Đầu Vào (Input)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={newInput}
                    onChange={(e) => setNewInput(e.target.value)}
                    placeholder="email: '', password: '123'"
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <LogOut className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Dữ Liệu Đầu Ra (Output)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={newOutput}
                    onChange={(e) => setNewOutput(e.target.value)}
                    placeholder="Thông báo lỗi hoặc mã HTTP 400"
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Hàng 2: Expected Result & Actual Result */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Kết Quả Mong Đợi (Expected Result)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={newExpected}
                    onChange={(e) => setNewExpected(e.target.value)}
                    placeholder="Hiển thị thông báo đỏ yêu cầu nhập email"
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                    <span>Kết Quả Thực Tế (Actual Result)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={newActual}
                    onChange={(e) => setNewActual(e.target.value)}
                    placeholder="Ghi nhận lỗi thực tế nếu không đúng mong đợi"
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Hàng 3: Response JSON / Payload */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Code2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>Dữ Liệu JSON Phản Hồi (Payload)</span>
                </label>
                <textarea
                  rows={3}
                  value={newResponseJson}
                  onChange={(e) => setNewResponseJson(e.target.value)}
                  placeholder='VD: { "status": 400, "message": "Email is required" }'
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Hàng 4: Bằng chứng (Screenshots/Logs) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-purple-500" />
                  <span>Ảnh Chụp Màn Hình & Nhật Ký Lỗi (Bằng chứng)</span>
                </label>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {newEvidenceUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative group w-16 h-16 rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-900 shrink-0"
                    >
                      <img src={url} alt="Bằng chứng" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setNewEvidenceUrls((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  <label className="flex flex-col items-center justify-center w-28 h-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-300 transition cursor-pointer">
                    <Upload className="w-4 h-4 mb-0.5" />
                    <span className="text-[10px] font-medium">
                      {uploadingEvidence ? "Đang tải..." : "+ Tải ảnh S3"}
                    </span>
                    <input
                      type="file"
                      accept="image/*,.log,.txt"
                      disabled={uploadingEvidence}
                      onChange={handleUploadFileForNewForm}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Hàng 5: Trạng thái & Priority */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Trạng thái khởi tạo
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="CLOSED">Đạt (Passed)</option>
                    <option value="NEW">Báo Lỗi (Bug - Phát sinh lỗi)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Mức độ ưu tiên
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="LOW">Thấp (Low)</option>
                    <option value="MEDIUM">Trung bình (Medium)</option>
                    <option value="HIGH">Cao (High)</option>
                    <option value="CRITICAL">Khẩn cấp (Critical)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-900">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition"
                >
                  {submitting ? "Đang lưu..." : "Lưu Kịch Bản Kiểm Thử"}
                </button>
              </div>
            </form>
          )}

          {/* Danh sách Kịch Bản Items */}
          {stepCases.map((item) => {
            const formattedJson = formatJsonDisplay(item.response_payload);
            const evidences = item.evidence_urls || [];

            return (
              <div
                key={item.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 shadow-md dark:shadow-xl space-y-3.5 transition group"
              >
                {/* Header card: ID, Status, Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      #{item.id}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        item.status === "CLOSED"
                          ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
                          : item.status === "NEW"
                          ? "bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30"
                          : item.status === "FIX"
                          ? "bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30"
                          : "bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30"
                      }`}
                    >
                      {item.status === "CLOSED" && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {item.status === "NEW" && <AlertCircle className="w-3.5 h-3.5" />}
                      {item.status === "FIX" && <Wrench className="w-3.5 h-3.5" />}
                      {item.status === "VERIFY" && <Eye className="w-3.5 h-3.5" />}
                      <span>
                        {item.status === "CLOSED"
                          ? "Đã Đạt"
                          : item.status === "NEW"
                          ? "Báo Lỗi"
                          : item.status === "FIX"
                          ? "Đang Sửa"
                          : "Chờ Xác Minh"}
                      </span>
                    </span>

                    {/* Priority Badge */}
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      [
                      {item.priority === "CRITICAL"
                        ? "Khẩn Cấp"
                        : item.priority === "HIGH"
                        ? "Cao"
                        : item.priority === "LOW"
                        ? "Thấp"
                        : "Trung Bình"}
                      ]
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Nút Nhận Sửa (cho Dev khi có bug) */}
                    {item.status === "NEW" && onClaimTask && (
                      <button
                        type="button"
                        onClick={() => onClaimTask(item.id, "claim_bug")}
                        className="px-2.5 py-1 rounded-xl text-[10.5px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition cursor-pointer"
                        title="Nhận sửa lỗi này (Gán ID của bạn & chuyển sang Đang Sửa)"
                      >
                        Nhận Sửa
                      </button>
                    )}

                    {/* Nút Nhận Test (cho Tester khi có Git thay đổi) */}
                    {item.is_impacted_by_git && onClaimTask && (
                      <button
                        type="button"
                        onClick={() => onClaimTask(item.id, "claim_test")}
                        className="px-2.5 py-1 rounded-xl text-[10.5px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 shadow-sm transition cursor-pointer"
                        title="Nhận kiểm thử lại kịch bản này"
                      >
                        Nhận Test
                      </button>
                    )}

                    {/* Toggle Pass / Fail */}
                    <button
                      type="button"
                      onClick={() => {
                        const next = item.status === "CLOSED" ? "NEW" : "CLOSED";
                        onStatusChange(item.id, next);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-[10.5px] font-semibold border transition cursor-pointer ${
                        item.status === "CLOSED"
                          ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100"
                          : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
                      }`}
                      title="1-click đổi trạng thái Đạt / Báo Lỗi"
                    >
                      {item.status === "CLOSED" ? "Báo Lỗi" : "Đánh Dấu Đạt"}
                    </button>

                    {/* Nút Sửa Chi Tiết (mở CaseDetailModal) */}
                    <button
                      type="button"
                      onClick={() => onSelectCase(item)}
                      className="p-1 text-slate-400 hover:text-sky-600 dark:hover:text-sky-300 rounded transition cursor-pointer"
                      title="Chỉnh sửa toàn diện / gán người"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Nút Xóa */}
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Xóa kịch bản "${item.title}"?`)) {
                          onDeleteCase(item.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded transition cursor-pointer"
                      title="Xóa kịch bản"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tiêu đề kịch bản */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-300 transition leading-snug">
                    {item.title}
                  </h4>
                </div>

                {/* 6 TRƯỜNG DỮ LIỆU ĐẦY ĐỦ CỦA KỊCH BẢN */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* 1. DỮ LIỆU ĐẦU VÀO (INPUT) */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 text-[11px]">
                        <LogIn className="w-3.5 h-3.5 text-sky-500" />
                        <span>1. Đầu Vào (Input)</span>
                      </span>
                      {item.input_data && (
                        <button
                          type="button"
                          onClick={() => handleCopyText(`input-${item.id}`, item.input_data || "")}
                          className="text-[10px] text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKey === `input-${item.id}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400">Đã sao chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Sao chép</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="font-mono text-slate-800 dark:text-slate-300 bg-white dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800/60 break-all whitespace-pre-wrap leading-relaxed text-[11px]">
                      {item.input_data || <span className="text-slate-400 italic">(Chưa có dữ liệu input)</span>}
                    </div>
                  </div>

                  {/* 2. DỮ LIỆU ĐẦU RA (OUTPUT) */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 text-[11px]">
                        <LogOut className="w-3.5 h-3.5 text-indigo-500" />
                        <span>2. Đầu Ra (Output)</span>
                      </span>
                      {item.output_data && (
                        <button
                          type="button"
                          onClick={() => handleCopyText(`output-${item.id}`, item.output_data || "")}
                          className="text-[10px] text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKey === `output-${item.id}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400">Đã sao chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Sao chép</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="font-mono text-slate-800 dark:text-slate-300 bg-white dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800/60 break-all whitespace-pre-wrap leading-relaxed text-[11px]">
                      {item.output_data || <span className="text-slate-400 italic">(Chưa có dữ liệu output)</span>}
                    </div>
                  </div>

                  {/* 3. KẾT QUẢ MONG ĐỢI (EXPECTED RESULT) */}
                  <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/15 border border-emerald-200 dark:border-emerald-800/30">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300 text-[11px]">
                        3. Kết Quả Mong Đợi (Expected Result)
                      </span>
                    </div>
                    <div className="text-emerald-900 dark:text-emerald-100/90 leading-relaxed text-[11.5px]">
                      {item.expected_result || (
                        <span className="text-slate-400 italic">(Chưa nhập kết quả mong đợi)</span>
                      )}
                    </div>
                  </div>

                  {/* 4. KẾT QUẢ THỰC TẾ (ACTUAL RESULT) */}
                  <div
                    className={`p-3 rounded-2xl border ${
                      item.status === "NEW"
                        ? "bg-rose-50/70 dark:bg-rose-950/25 border-rose-200 dark:border-rose-800/50"
                        : "bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <AlertCircle
                        className={`w-3.5 h-3.5 ${
                          item.status === "NEW" ? "text-rose-500" : "text-slate-500"
                        }`}
                      />
                      <span
                        className={`font-semibold text-[11px] ${
                          item.status === "NEW" ? "text-rose-700 dark:text-rose-300" : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        4. Kết Quả Thực Tế (Actual Result)
                      </span>
                    </div>
                    <div
                      className={`leading-relaxed text-[11.5px] ${
                        item.status === "NEW" ? "text-rose-900 dark:text-rose-200" : "text-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {item.actual_result || (
                        <span className="text-slate-400 italic">(Chưa ghi nhận kết quả thực tế)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 5. RESPONSE JSON / PAYLOAD */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 text-[11px]">
                      <Code2 className="w-3.5 h-3.5 text-amber-500" />
                      <span>5. Dữ Liệu JSON Phản Hồi (Payload)</span>
                    </span>
                    {formattedJson && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(`json-${item.id}`, formattedJson)}
                        className="text-[10px] text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === `json-${item.id}` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400">Đã sao chép JSON</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Sao chép JSON</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {formattedJson ? (
                    <pre className="max-h-44 overflow-y-auto p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-amber-700 dark:text-amber-300/90 leading-tight">
                      <code>{formattedJson}</code>
                    </pre>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic bg-white/60 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-200 dark:border-slate-900">
                      Không có payload JSON được lưu.
                    </div>
                  )}
                </div>

                {/* 6. BẰNG CHỨNG (SCREENSHOTS / LOGS) */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 text-[11px]">
                      <ImageIcon className="w-3.5 h-3.5 text-purple-500" />
                      <span>6. Ảnh Chụp Màn Hình & Nhật Ký Lỗi (Bằng chứng)</span>
                      <span className="text-slate-500 font-mono">({evidences.length})</span>
                    </span>

                    {/* Nút đính kèm ảnh ngay tại card */}
                    <label className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10.5px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 border border-purple-200 dark:border-purple-500/30 transition cursor-pointer">
                      <Upload className="w-3 h-3" />
                      <span>{uploadingCaseId === item.id ? "Đang tải..." : "+ Thêm ảnh/log"}</span>
                      <input
                        type="file"
                        accept="image/*,.log,.txt"
                        disabled={uploadingCaseId === item.id}
                        onChange={(e) => handleAddAttachmentToCase(item, e)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {evidences.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                      {evidences.map((url, i) => {
                        const isImage = /\.(png|jpg|jpeg|webp|gif)$/i.test(url) || url.includes("images");

                        return (
                          <div
                            key={i}
                            className="group/img relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-sm"
                          >
                            {isImage ? (
                              <div
                                onClick={() => setPreviewImage(url)}
                                className="w-full h-20 relative cursor-pointer overflow-hidden"
                              >
                                <img
                                  src={url}
                                  alt="Bằng chứng"
                                  className="w-full h-full object-cover group-hover/img:scale-105 transition duration-200"
                                />
                                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition">
                                  <ZoomIn className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            ) : (
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full h-20 p-2 flex flex-col items-center justify-center text-center text-slate-500 hover:text-sky-600 dark:hover:text-sky-300"
                              >
                                <FileText className="w-5 h-5 mb-1 text-slate-400" />
                                <span className="text-[10px] truncate max-w-full font-mono">Xem file log</span>
                              </a>
                            )}

                            <div className="p-1.5 flex items-center justify-between bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800/80 text-[10px]">
                              <span className="text-slate-500 font-mono">#Tệp {i + 1}</span>
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 flex items-center gap-0.5"
                                title="Mở link gốc"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic bg-white/60 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-200 dark:border-slate-900">
                      Chưa có ảnh chụp màn hình hoặc nhật ký lỗi đính kèm.
                    </div>
                  )}
                </div>

                {/* Footer card: Người phụ trách */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Phụ trách:</span>
                    <span
                      className={`font-semibold ${
                        item.assigned_name ? "text-slate-800 dark:text-slate-300" : "text-amber-600 dark:text-amber-500/80 italic"
                      }`}
                    >
                      {item.assigned_name || (item.status === "NEW" ? "Chưa có Dev nhận" : "Chưa phân công")}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectCase(item)}
                    className="text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer font-sans"
                  >
                    <span>Mở modal chi tiết</span>
                  </button>
                </div>
              </div>
            );
          })}

          {stepCases.length === 0 && !showAddForm && (
            <div className="text-center py-12 text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 bg-slate-50 dark:bg-slate-950/40">
              <Sparkles className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">Bước này chưa có kịch bản kiểm thử nào</p>
              <p className="mt-1 max-w-sm mx-auto text-slate-500">
                Nhấp nút <strong>"+ Thêm Kịch Bản"</strong> ở góc trên để tạo kịch bản với đầy đủ Input, Output, Kết quả mong đợi, Thực tế, Payload JSON và Bằng chứng.
              </p>
            </div>
          )}
        </div>

        {/* Footer Drawer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs">
          {onDeleteStep ? (
            <button
              onClick={() => {
                if (confirm(`Bạn có chắc muốn xóa bước "${step.title}" khỏi sơ đồ?`)) {
                  onDeleteStep(step.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa bước này khỏi sơ đồ</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Lightbox Modal Xem Ảnh Toàn Màn Hình */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-150"
        >
          <div className="relative max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-2">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-950/80 text-white hover:bg-rose-600 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Ảnh phóng to"
              className="max-w-full max-h-[85vh] object-contain rounded-xl mx-auto"
            />
          </div>
        </div>
      )}
    </>
  );
}
