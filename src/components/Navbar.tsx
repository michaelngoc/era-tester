import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  FolderGit2,
  Users,
  GitBranch,
  ExternalLink,
  Code2,
  Archive,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import LogoutButton from "./LogoutButton";

export interface NavbarProps {
  user: {
    id: number;
    email: string;
    fullName: string;
    role: string;
  } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(" ");
      if (parts.length > 1) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    return (email || "US").slice(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 h-16 bg-white/85 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/80 px-6 flex items-center justify-between transition-colors duration-150">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative p-2.5 bg-gradient-to-br from-sky-500/20 to-indigo-500/10 border border-sky-500/30 rounded-xl text-sky-500 dark:text-sky-400 group-hover:border-sky-400/50 group-hover:scale-105 transition-all duration-200 shadow-sm shadow-sky-500/10">
            <ShieldCheck className="w-5 h-5 text-sky-500 dark:text-sky-400" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-slate-100 tracking-tight text-base font-sans">
                Eraweb Tester Hub
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/30">
                v1.3
              </span>
            </div>
            <span className="block text-[10.5px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">
              Bộ Công Cụ QA/QC & Giám Sát Git
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1.5 pl-6 border-l border-slate-200 dark:border-slate-800/80">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-all duration-150 cursor-pointer"
          >
            <FolderGit2 className="w-4 h-4 text-sky-500 dark:text-sky-400" />
            Dự Án Kiểm Thử
          </Link>

          <Link
            href="/runs"
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-all duration-150 cursor-pointer"
          >
            <Archive className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            Nhật Ký Chạy Test
          </Link>

          {user?.role === "SUPER_ADMIN" && (
            <Link
              href="/admin/users"
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 hover:bg-amber-500/10 rounded-xl transition-all duration-150 cursor-pointer"
            >
              <Users className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              Duyệt Thành Viên
            </Link>
          )}

          <a
            href="https://github.com/michaelngoc/era-tester"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40 rounded-xl transition-all duration-150 cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5" />
            Kho GitHub
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {/* Nút chuyển đổi Giao diện Sáng / Tối (Client Island) */}
        <ThemeToggle />

        {/* Branch tester badge with live pulsing beacon */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-mono font-medium shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <GitBranch className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
          <span>
            nhánh: <strong className="text-emerald-700 dark:text-emerald-300">tester</strong>
          </span>
        </div>

        {user ? (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800/80">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                {user.fullName || user.email}
              </div>
              <div className="text-[10px] font-medium tracking-wide">
                {user.role === "SUPER_ADMIN" ? (
                  <span className="text-amber-600 dark:text-amber-400 font-bold tracking-wider uppercase text-[9.5px]">
                    Quản Trị Tối Cao
                  </span>
                ) : user.role === "DEVELOPER" ? (
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold tracking-wider uppercase text-[9.5px]">
                    Lập Trình Viên (Dev)
                  </span>
                ) : (
                  <span className="text-sky-600 dark:text-sky-400 font-bold tracking-wider uppercase text-[9.5px]">
                    Kiểm Thử Viên (QA)
                  </span>
                )}
              </div>
            </div>

            {/* Avatar Pill */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center border border-white/10 shadow-sm">
              {getInitials(user.fullName, user.email)}
            </div>

            {/* Logout Client Island */}
            <LogoutButton />
          </div>
        ) : (
          <Link
            href="/login"
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-sky-600/20 cursor-pointer"
          >
            Đăng nhập
          </Link>
        )}
      </div>
    </header>
  );
}
