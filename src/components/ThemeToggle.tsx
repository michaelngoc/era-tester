"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
        theme === "dark"
          ? "bg-slate-900 border-slate-800 text-amber-400 hover:text-amber-300 hover:bg-slate-800 hover:border-slate-700"
          : "bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-200 hover:border-slate-400"
      } ${className}`}
      title={
        theme === "dark"
          ? "Chuyển sang Giao diện Sáng (Light Mode)"
          : "Chuyển sang Giao diện Tối (Dark Mode)"
      }
      aria-label="Đổi giao diện Sáng / Tối"
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 transition-transform duration-200 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 transition-transform duration-200 -rotate-12 hover:rotate-0 text-slate-800" />
      )}
    </button>
  );
}
