"use client";

import React, { useState } from "react";
import { Copy, Check, Code } from "lucide-react";

interface JsonViewerProps {
  data: string | object | null | undefined;
  title?: string;
}

export default function JsonViewer({
  data,
  title = "Dữ Liệu JSON Phản Hồi (Payload)",
}: JsonViewerProps) {
  const [copied, setCopied] = useState(false);

  if (!data) {
    return (
      <div className="text-xs text-slate-500 italic p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800">
        Không có dữ liệu payload.
      </div>
    );
  }

  let jsonString = "";
  try {
    if (typeof data === "string") {
      const parsed = JSON.parse(data);
      jsonString = JSON.stringify(parsed, null, 2);
    } else {
      jsonString = JSON.stringify(data, null, 2);
    }
  } catch {
    jsonString = String(data);
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden text-xs transition-colors duration-150">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <Code className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
          <span>{title}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition text-[11px] cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
              <span className="text-emerald-600 dark:text-emerald-400">Đã sao chép</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Sao chép</span>
            </>
          )}
        </button>
      </div>

      <pre className="p-3 font-mono text-[11.5px] leading-relaxed text-sky-800 dark:text-sky-300/90 overflow-x-auto max-h-56">
        <code>{jsonString}</code>
      </pre>
    </div>
  );
}
