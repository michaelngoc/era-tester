"use client";

import React, { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";

export interface CopyCommitSnippetProps {
  caseId: number;
  caseTitle: string;
  moduleName?: string;
  compact?: boolean;
  className?: string;
}

export default function CopyCommitSnippet({
  caseId,
  caseTitle,
  moduleName = "core",
  compact = false,
  className = "",
}: CopyCommitSnippetProps) {
  const [copied, setCopied] = useState(false);

  // Clean module slug (e.g., "Authentication" -> "auth")
  const moduleSlug = moduleName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 10) || "core";

  // Sanitize title for commit message
  const cleanTitle = caseTitle.replace(/["\\]/g, "").slice(0, 60);
  const commitMessage = `fix(${moduleSlug}): ${cleanTitle} [#${caseId}]`;
  const fullCommand = `git commit -m "${commitMessage}"`;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(fullCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Lỗi copy clipboard:", err);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleCopy}
        title={`Click để copy: ${fullCommand}`}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono transition-all cursor-pointer ${
          copied
            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40"
            : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
        } ${className}`}
      >
        {copied ? (
          <>
            <Check className="w-2.5 h-2.5 text-emerald-500" />
            <span className="font-bold">Đã copy</span>
          </>
        ) : (
          <>
            <Copy className="w-2.5 h-2.5 text-slate-400" />
            <span>#{caseId}</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div
      className={`p-3 rounded-2xl bg-slate-900 dark:bg-slate-950 border border-slate-800 text-slate-200 shadow-md ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-semibold text-sky-400 flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5" />
          <span>Lệnh Git Commit Tự Động Link Với Kịch Bản Này:</span>
        </span>
        <span className="text-[10px] text-slate-400">Dán vào terminal trước khi git push</span>
      </div>

      <div className="flex items-center justify-between gap-2 bg-slate-950/80 p-2 rounded-xl border border-slate-800/80 font-mono text-xs">
        <code className="text-emerald-400 truncate select-all">{fullCommand}</code>
        <button
          type="button"
          onClick={handleCopy}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition shrink-0 cursor-pointer ${
            copied
              ? "bg-emerald-500 text-white shadow-sm"
              : "bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20"
          }`}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Đã Sao Chép!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Lệnh</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
