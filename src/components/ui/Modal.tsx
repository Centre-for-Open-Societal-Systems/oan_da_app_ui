"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Small line under the title. */
  subtitle?: ReactNode;
  /** Leading tile next to the title (e.g. initials). */
  icon?: ReactNode;
  /** Inline element after the title, e.g. a status pill. */
  titleAddon?: ReactNode;
  size?: "md" | "lg" | "xl";
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Extra classes for the scrollable body (defaults to p-4). */
  bodyClassName?: string;
  /** Drop the title bar (e.g. centred confirmation dialogs); the body must then render an element with id="modal-title". */
  hideHeader?: boolean;
}

const SIZE_CLASSES = { md: "max-w-[480px]", lg: "max-w-[620px]", xl: "max-w-[720px]" };

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  titleAddon,
  size = "md",
  children,
  footer,
  className,
  bodyClassName,
  hideHeader,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex animate-fade-in items-center justify-center bg-ink/40 p-3 backdrop-blur-[2px] sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn("flex max-h-[calc(100dvh-1.5rem)] w-full animate-pop-in flex-col overflow-hidden rounded-xl bg-white shadow-2xl sm:max-h-[calc(100dvh-5rem)]", SIZE_CLASSES[size], className)}
      >
        {/* items-start keeps the close button pinned to the title row when the subtitle wraps on narrow screens */}
        {!hideHeader && (
          <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-4 sm:gap-4 sm:px-6">
            <div className="flex min-w-0 items-start gap-3.5">
              {icon}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 id="modal-title" className="text-[16px] font-semibold leading-snug text-ink sm:text-[18px]">{title}</h2>
                  {titleAddon}
                </div>
                {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-ink transition-colors hover:bg-slate-200"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        )}

        <div className={cn("overflow-y-auto p-4 green-scrollbar", bodyClassName)}>{children}</div>

        {footer && (
          // On phones the action buttons share the row equally; from sm up they keep their natural width
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line bg-surface px-4 py-3 sm:py-4 [&>button]:flex-1 [&>button]:whitespace-nowrap sm:[&>button]:flex-none">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
