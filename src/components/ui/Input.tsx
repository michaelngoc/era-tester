import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  ref?: React.Ref<HTMLInputElement>;
}

export function Input({
  label,
  helperText,
  error,
  id,
  className = "",
  ref,
  ...props
}: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-2xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors duration-150 ${
          error
            ? "border-rose-500 focus:border-rose-500"
            : "border-slate-200 dark:border-slate-800 focus:border-sky-500"
        } ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-[10.5px] text-rose-500 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
