"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { tabClass } from "./PageTabs";

export interface SegmentTab<K extends string> {
  key: K;
  label: string;
  count?: number;
}

// In-page state tabs (no routing). Same look as PageTabs so hub link-tabs and local tabs read alike.
// Page-level tabs go in PageHeader's `tabBar`; `actions` sits at the right end of the bar (e.g. an "Add" button for the whole card).
// `more` adds a last tab that opens a menu of further tabs; while one of them is active the tab shows its label.
export function SegmentTabs<K extends string>({ tabs, active, onChange, className, actions, label, more }: { tabs: SegmentTab<K>[]; active: K; onChange: (key: K) => void; className?: string; actions?: ReactNode; label?: string; more?: SegmentTab<K>[] }) {
  return (
    <div className={cn("flex w-full items-center justify-between rounded-t-xl border border-line bg-white shadow-card overflow-hidden", className)}>
      <div role="tablist" aria-label={label} className="flex min-w-0 flex-1 items-center overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button key={tab.key} type="button" role="tab" aria-selected={isActive} onClick={() => onChange(tab.key)} className={tabClass(isActive)}>
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", isActive ? "bg-brand-green text-white" : "bg-line-soft text-slate-600")}>{tab.count}</span>
              )}
            </button>
          );
        })}
        {more && more.length > 0 && <MoreTab tabs={more} active={active} onChange={onChange} />}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2 py-2 pr-4">{actions}</div>}
    </div>
  );
}

function MoreTab<K extends string>({ tabs, active, onChange }: { tabs: SegmentTab<K>[]; active: K; onChange: (key: K) => void }) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const selected = tabs.find((t) => t.key === active);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    // The menu is fixed to the viewport, so a scroll or resize would leave it behind: close it instead.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const toggle = () => {
    if (open) return setOpen(false);
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setStyle({ top: rect.bottom + 4, left: rect.left, minWidth: rect.width });
    setOpen(true);
  };

  return (
    <>
      <button ref={buttonRef} type="button" role="tab" aria-selected={!!selected} aria-haspopup="menu" aria-expanded={open} onClick={toggle} className={tabClass(!!selected)}>
        {selected?.label ?? "More"}
        <svg className={cn("h-4 w-4 transition-transform", open && "rotate-180")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open &&
        createPortal(
          <ul ref={menuRef} role="menu" style={style} className="fixed z-[110] animate-dropdown-in overflow-hidden rounded-lg border border-line bg-white py-0.5 text-[14px] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)]">
            {tabs.map((tab) => (
              <li key={tab.key} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onChange(tab.key);
                    setOpen(false);
                  }}
                  className={cn("block w-full whitespace-nowrap px-4 py-3 text-left text-slate-700 hover:bg-surface", tab.key === active && "bg-brand-mint font-medium text-brand-green")}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
}
