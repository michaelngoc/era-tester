"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Mail,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  CheckSquare,
  Code2,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"TESTER" | "DEVELOPER">("TESTER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    let normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail && !normalizedEmail.includes("@")) {
      normalizedEmail = `${normalizedEmail}@eragroup.com.vn`;
    }

    if (!normalizedEmail.endsWith("@eragroup.com.vn")) {
      setError("Hệ thống chỉ chấp nhận email nội bộ có đuôi @eragroup.com.vn");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email: normalizedEmail, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Đăng ký thất bại");
        return;
      }

      setSuccessMsg(data.message);
      if (data.user?.status === "ACTIVE") {
        setTimeout(() => router.push("/login"), 1500);
      }
    } catch (err: any) {
      setError(err.message || "Lỗi mạng hoặc máy chủ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 transition-colors duration-150 relative">
      {/* Nút ThemeToggle góc trên */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl backdrop-blur-sm transition-colors duration-150">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 mb-3 shadow-sm">
            <UserPlus className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Đăng Ký Thành Viên
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gia nhập nhóm QA/QC & Dev Eraweb
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-3.5 mb-6 text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-3 p-3.5 mb-6 text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
            <div>
              <p className="font-semibold text-emerald-800 dark:text-emerald-200">Thành công</p>
              <p className="mt-1">{successMsg}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Họ và tên
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Email công ty (@eragroup.com.vn)
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ten.ho@eragroup.com.vn"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:emerald-500 transition"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              Có thể nhập đầy đủ hoặc chỉ tên user (ví dụ: <span className="text-emerald-600 dark:text-emerald-400 font-mono">ten.ho</span>)
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Vai trò chính
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("TESTER")}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                  role === "TESTER"
                    ? "bg-sky-500/15 border-sky-500 text-sky-950 dark:text-white shadow-sm"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <CheckSquare className={`w-4 h-4 ${role === "TESTER" ? "text-sky-500 dark:text-sky-400" : "text-slate-400 dark:text-slate-500"}`} />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Kiểm Thử Viên (QA)</span>
                </div>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight">
                  Tạo kịch bản, kiểm thử luồng, báo cáo lỗi
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRole("DEVELOPER")}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                  role === "DEVELOPER"
                    ? "bg-indigo-500/15 border-indigo-500 text-indigo-950 dark:text-white shadow-sm"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Code2 className={`w-4 h-4 ${role === "DEVELOPER" ? "text-indigo-500 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`} />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Lập Trình Viên (Dev)</span>
                </div>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight">
                  Nhận nhiệm vụ sửa bug, đẩy mã fix
                </p>
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0 mt-0.5" />
            <span>
              Sau khi đăng ký, tài khoản sẽ được gửi đến <strong>Quản Trị Viên (Super Admin)</strong> để phê duyệt trước khi bạn có thể truy cập dự án.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            {loading ? "Đang tạo tài khoản..." : "Đăng ký thành viên"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Đã có tài khoản?{" "}
          <Link href="/login" className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold">
            Quay lại Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
