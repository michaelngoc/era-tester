"use client";

import React, { useState } from "react";
import { Copy, Check, Code } from "lucide-react";

interface JsonViewerProps {
  data: string | object | null | undefined;
  title?: string;
}

export default function JsonViewer({ data, title = "Response Payload" }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);

  if (!data) {
    return (
      <div className="text-xs text-slate-500 italic p-3 bg-slate-950/40 rounded-lg border border-slate-800">
        Không có dữ liệu payload.
      </div>
    );
  }

  let jsonString = "";
  try {
    if (typeof data === "string") {
      // Thử parse xem có phải json hợp lệ không
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
    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden text-xs">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 text-slate-400">
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <Code className="w-3.5 h-3.5 text-sky-400" />
          <span>{title}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-[11px] cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Đã copy</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <pre className="p-3 font-mono text-[11.5px] leading-relaxed text-sky-300/90 overflow-x-auto max-h-56">
        <code>{jsonString}</code>
      </pre>
    </div>
  );
}
