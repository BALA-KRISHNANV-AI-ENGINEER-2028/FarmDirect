import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

interface FieldWrapperProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function Field({ label, hint, error, required, children }: FieldWrapperProps) {
  return (
    <label className="block">
      {label && (
        <span className="block text-label-md font-semibold text-on-surface mb-1.5">
          {label}
          {required && <span className="text-error ml-0.5">*</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="block mt-1 text-label-sm text-on-surface-variant">{hint}</span>}
      {error && <span className="block mt-1 text-label-sm text-error">{error}</span>}
    </label>
  );
}

const baseInputStyles =
  "w-full bg-beige border border-surface-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-colors";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(baseInputStyles, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(baseInputStyles, "resize-none", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(baseInputStyles, "appearance-none cursor-pointer", className)} {...props}>
      {children}
    </select>
  );
}
