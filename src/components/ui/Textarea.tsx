import React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  ref?: React.Ref<HTMLTextAreaElement>;
}

export function Textarea({
  label,
  helperText,
  error,
  id,
  className = "",
  rows = 3,
  ref,
  ...props
}: TextareaProps) {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        className={`w-full p-2.5 bg-slate-50 dark:bg-slate-950 border rounded-2xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors duration-150 ${
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
