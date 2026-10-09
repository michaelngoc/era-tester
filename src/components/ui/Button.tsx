import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "emerald" | "danger" | "ghost";
  size?: "xs" | "sm" | "md";
  isLoading?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  className = "",
  ref,
  ...props
}: ButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none";

  const sizeClasses = {
    xs: "px-2.5 py-1 text-[11px] gap-1",
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-xs gap-2",
  }[size];

  const variantClasses = {
    primary:
      "bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20 active:scale-[0.98]",
    secondary:
      "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
    emerald:
      "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 active:scale-[0.98]",
    danger:
      "bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 active:scale-[0.98]",
    ghost:
      "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
  }[variant];

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : null}
      {children}
    </button>
  );
}
