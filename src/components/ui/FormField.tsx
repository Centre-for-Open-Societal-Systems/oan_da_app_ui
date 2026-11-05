import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  /** Helper text shown below the control. */
  hint?: string;
  /** Renders the hint in the error colour. */
  hintTone?: "muted" | "error";
  className?: string;
  children: ReactNode;
}

export function FormField({ label, htmlFor, required, hint, hintTone = "muted", className, children }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", hint && hintTone === "error" && "field-invalid", className)}>
      <label htmlFor={htmlFor} className="text-[14px] font-medium text-ink">
        {label}
        {required && <span className="ml-1 text-danger">*</span>}
      </label>
      {children}
      {hint && (
        <p className={cn("text-[12.5px]", hintTone === "error" ? "text-danger" : "text-gray-500")}>
          {hint}
        </p>
      )}
    </div>
  );
}
