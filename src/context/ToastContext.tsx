"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary";
}

interface ToastContextType {
  toast: {
    success: (message: string, title?: string, duration?: number) => void;
    error: (message: string, title?: string, duration?: number) => void;
    warning: (message: string, title?: string, duration?: number) => void;
    info: (message: string, title?: string, duration?: number) => void;
  };
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (val: boolean) => void;
  } | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, title?: string, duration: number = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setToasts((prev) => [...prev, { id, type, message, title, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toast = React.useMemo(
    () => ({
      success: (msg: string, title?: string, duration?: number) =>
        addToast("success", msg, title, duration),
      error: (msg: string, title?: string, duration?: number) =>
        addToast("error", msg, title, duration || 5000),
      warning: (msg: string, title?: string, duration?: number) =>
        addToast("warning", msg, title, duration),
      info: (msg: string, title?: string, duration?: number) =>
        addToast("info", msg, title, duration),
    }),
    [addToast]
  );

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmDialog({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleConfirmClose = (result: boolean) => {
    if (confirmDialog) {
      confirmDialog.resolve(result);
      setConfirmDialog(null);
    }
  };

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          const typeConfig = {
            success: {
              icon: CheckCircle2,
              iconColor: "text-emerald-500",
              border: "border-emerald-500/30 dark:border-emerald-500/20",
              bg: "bg-white/95 dark:bg-slate-900/95 shadow-emerald-500/10",
              titleColor: "text-emerald-700 dark:text-emerald-400",
            },
            error: {
              icon: AlertCircle,
              iconColor: "text-rose-500",
              border: "border-rose-500/30 dark:border-rose-500/20",
              bg: "bg-white/95 dark:bg-slate-900/95 shadow-rose-500/10",
              titleColor: "text-rose-700 dark:text-rose-400",
            },
            warning: {
              icon: AlertTriangle,
              iconColor: "text-amber-500",
              border: "border-amber-500/30 dark:border-amber-500/20",
              bg: "bg-white/95 dark:bg-slate-900/95 shadow-amber-500/10",
              titleColor: "text-amber-700 dark:text-amber-400",
            },
            info: {
              icon: Info,
              iconColor: "text-sky-500",
              border: "border-sky-500/30 dark:border-sky-500/20",
              bg: "bg-white/95 dark:bg-slate-900/95 shadow-sky-500/10",
              titleColor: "text-sky-700 dark:text-sky-400",
            },
          }[t.type];

          const IconComponent = typeConfig.icon;

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-xl transition-all duration-200 animate-in slide-in-from-bottom-3 ${typeConfig.bg} ${typeConfig.border}`}
            >
              <IconComponent className={`w-5 h-5 shrink-0 mt-0.5 ${typeConfig.iconColor}`} />
              <div className="flex-1 min-w-0">
                {t.title && (
                  <h4 className={`text-xs font-bold mb-0.5 ${typeConfig.titleColor}`}>
                    {t.title}
                  </h4>
                )}
                <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed break-words">
                  {t.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-150 transition-colors">
            <div className="flex items-start gap-3.5 mb-4">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmDialog.options.variant === "primary"
                    ? "bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30"
                    : "bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30"
                }`}
              >
                {confirmDialog.options.variant === "primary" ? (
                  <Info className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                  {confirmDialog.options.title || "Xác nhận hành động"}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {confirmDialog.options.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                {confirmDialog.options.cancelText || "Hủy bỏ"}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmClose(true)}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md transition cursor-pointer ${
                  confirmDialog.options.variant === "primary"
                    ? "bg-sky-600 hover:bg-sky-500 shadow-sky-600/20"
                    : "bg-rose-600 hover:bg-rose-500 shadow-rose-600/20"
                }`}
              >
                {confirmDialog.options.confirmText || "Đồng ý"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
