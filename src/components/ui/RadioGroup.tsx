"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface RadioOption {
  value: string;
  label?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  id?: string;
  name?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (string | RadioOption)[];
  disabled?: boolean;
  className?: string;
}

export function RadioGroup({
  id,
  name,
  label,
  value,
  onChange,
  options,
  disabled,
  className,
}: RadioGroupProps) {
  const [animatingOption, setAnimatingOption] = useState<string | null>(null);
  const groupName = name ?? id ?? "radio-group";

  const handleSelect = (val: string, isDisabled?: boolean) => {
    if (disabled || isDisabled) return;
    setAnimatingOption(val);
    onChange(val);
    setTimeout(() => {
      setAnimatingOption((current) => (current === val ? null : current));
    }, 450);
  };

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={label}
      className={cn("flex min-h-11 flex-wrap items-center gap-6 sm:gap-7", className)}
    >
      {options.map((opt) => {
        const optValue = typeof opt === "string" ? opt : opt.value;
        const optLabel = typeof opt === "string" ? opt : opt.label ?? opt.value;
        const optDisabled = disabled || (typeof opt === "object" && opt.disabled);
        const isChecked = value === optValue;
        const isAnimating = animatingOption === optValue;

        return (
          <label
            key={optValue}
            className={cn(
              "group relative inline-flex items-center gap-2.5 py-1.5 select-none transition-all duration-150",
              optDisabled
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer active:scale-95"
            )}
          >
            <input
              type="radio"
              name={groupName}
              value={optValue}
              checked={isChecked}
              disabled={optDisabled}
              onChange={() => handleSelect(optValue, optDisabled)}
              className="peer sr-only"
            />

            {/* Custom Radio Button Circle */}
            <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
              {/* Animated Radiating Pulse Ring on Selection */}
              {isAnimating && (
                <span className="absolute -inset-1.5 rounded-full bg-brand-green/30 animate-ping pointer-events-none" />
              )}

              {/* Outer Ring */}
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border-2 bg-white transition-all duration-200",
                  isChecked
                    ? "border-brand-green ring-3 ring-brand-green/20 shadow-xs scale-105"
                    : "border-slate-300 group-hover:border-brand-green/70 group-hover:bg-emerald-50/40",
                  isAnimating && "scale-115 border-brand-green-dark",
                  optDisabled && "border-slate-200 bg-slate-50 group-hover:border-slate-200 group-hover:bg-slate-50",
                  "peer-focus-visible:ring-2 peer-focus-visible:ring-brand-green peer-focus-visible:ring-offset-2"
                )}
              >
                {/* Inner Dot with Spring Pop Transition */}
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full bg-brand-green transition-all duration-200 ease-out transform",
                    isChecked
                      ? "scale-100 opacity-100 shadow-2xs"
                      : "scale-0 opacity-0",
                    isAnimating && "scale-115 bg-emerald-700"
                  )}
                />
              </span>
            </div>

            {/* Option Label Text */}
            <span
              className={cn(
                "text-[13.5px] sm:text-[14px] transition-colors duration-150",
                isChecked
                  ? "font-semibold text-ink"
                  : "font-medium text-slate-700 group-hover:text-ink",
                optDisabled && "text-slate-400 group-hover:text-slate-400"
              )}
            >
              {optLabel}
            </span>
          </label>
        );
      })}
    </div>
  );
}
