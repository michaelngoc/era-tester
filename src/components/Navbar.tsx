"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  FolderGit2,
  Users,
  LogOut,
  Bell,
  GitBranch,
} from "lucide-react";

interface NavbarProps {
  user: {
    id: number;
    email: string;
    fullName: string;
    role: "SUPER_ADMIN" | "MEMBER";
  } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400 group-hover:scale-105 transition">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-slate-100 tracking-tight text-base">
              Eraweb Tester Hub
            </span>
            <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              QA/QC & Git Impact Suite
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-800">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition"
          >
            <FolderGit2 className="w-4 h-4 text-sky-400" />
            Dự Án Kiểm Thử
          </Link>

          {user?.role === "SUPER_ADMIN" && (
            <Link
              href="/admin/users"
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 rounded-lg transition"
            >
              <Users className="w-4 h-4 text-amber-400" />
              Duyệt Thành Viên
            </Link>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {/* Branch tester badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium">
          <GitBranch className="w-3.5 h-3.5" />
          <span>Branch: <strong>tester</strong></span>
        </div>

        {user ? (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-200">
                {user.fullName || user.email}
              </div>
              <div className="text-[10px] font-medium text-slate-400">
                {user.role === "SUPER_ADMIN" ? (
                  <span className="text-amber-400 font-semibold">Super Admin</span>
                ) : (
                  <span>Tester / Member</span>
                )}
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Đăng xuất"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition"
          >
            Đăng nhập
          </Link>
        )}
      </div>
    </header>
  );
}
