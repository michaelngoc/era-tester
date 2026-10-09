import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "sky" | "emerald" | "amber" | "rose" | "purple";
  size?: "xs" | "sm";
}

export function Badge({
  children,
  variant = "neutral",
  size = "sm",
  className = "",
  ...props
}: BadgeProps) {
  const sizeClasses = {
    xs: "px-1.5 py-0.2 text-[10px]",
    sm: "px-2 py-0.5 text-[11px]",
  }[size];

  const variantClasses = {
    neutral:
      "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
    sky: "bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30",
    emerald:
      "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30",
    amber:
      "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30",
    rose: "bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30",
    purple:
      "bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30",
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-lg ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
