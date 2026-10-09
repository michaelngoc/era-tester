"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Lỗi đăng xuất:", e);
      setLoggingOut(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loggingOut}
      title="Đăng xuất khỏi hệ thống"
      className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-50"
    >
      <LogOut className={`w-4 h-4 ${loggingOut ? "animate-spin" : ""}`} />
    </button>
  );
}
