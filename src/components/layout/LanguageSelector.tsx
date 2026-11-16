"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Portal languages: English, Amharic and Afaan Oromo (same look as the Grievance Management portal header).
const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "am", label: "Amharic", flag: "🇪🇹" },
  { code: "om", label: "Afaan Oromo", flag: "🇦🇴" },
];

export function LanguageSelector({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState("en");
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find((l) => l.code === selected) ?? LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-label="Language selector"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="group flex h-9 sm:h-10 items-center justify-between gap-1.5 sm:gap-2 rounded-full md:rounded-lg border border-zinc-200 px-2 sm:px-2.5 md:px-3 py-1.5 font-medium text-slate-600 transition-all duration-300 hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-sm focus:outline-none active:scale-95 shrink-0"
      >
        <span className="flex items-center gap-1.5 sm:gap-2">
          <span className="inline-block origin-bottom-right text-[18px] sm:text-[20px] leading-none transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
            {current.flag}
          </span>
          <span className="hidden truncate text-[13px] md:text-[14px] font-medium sm:inline">
            {current.label}
          </span>
        </span>
        <svg
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-300",
            isOpen ? "rotate-180" : "group-hover:translate-y-0.5"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div
        role="listbox"
        aria-label="Language"
        className={cn(
          "absolute right-0 z-50 mt-2 sm:mt-4 w-48 sm:w-56 origin-top rounded-2xl border border-zinc-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-200",
          isOpen ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-2 scale-95 opacity-0",
        )}
      >
        <div className="py-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              role="option"
              aria-selected={selected === lang.code}
              onClick={() => {
                setSelected(lang.code);
                setIsOpen(false);
              }}
              className={cn(
                "flex w-full items-center px-4 py-3 sm:px-6 sm:py-4 text-left transition-colors",
                selected === lang.code ? "bg-emerald-50" : "hover:bg-slate-50"
              )}
            >
              <span className="mr-3 sm:mr-4 text-[20px] sm:text-[22px] leading-none">{lang.flag}</span>
              <span className={cn("flex-1 text-[14px] sm:text-[16px] tracking-wide", selected === lang.code ? "font-semibold text-emerald-700" : "font-medium text-slate-700")}>
                {lang.label}
              </span>
              {selected === lang.code && (
                <svg className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
