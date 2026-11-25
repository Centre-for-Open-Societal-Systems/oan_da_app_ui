"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { SupervisorKpiHelp } from "@/features/performance";

const CARD_WIDTH = 340;

// "?" button that opens a small help card (what is counted, out of what, who enters it). The card is portalled with
// fixed positioning so the table's horizontal scroll container can't clip it.
export function KpiHelp({ title, help }: { title: string; help: SupervisorKpiHelp }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  const open = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pos) return setPos(null);
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.max(12, Math.min(r.left - 12, window.innerWidth - CARD_WIDTH - 12));
    setPos({ top: r.bottom + 8, left });
  };

  const lines: [string, string][] = [];
  if (help.counted) lines.push(["Counted", help.counted]);
  if (help.outOf) lines.push(["Out of", help.outOf]);
  if (help.enteredBy) lines.push(["Entered by", help.enteredBy]);
  if (help.evidence) lines.push(["Evidence", help.evidence]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={open}
        aria-label={`About ${title}`}
        aria-expanded={pos !== null}
        className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-slate-400 text-[11px] font-semibold text-slate-500 transition-colors hover:border-brand-green hover:text-brand-green"
      >
        ?
      </button>
      {pos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[120]" onClick={() => setPos(null)} />
            <div
              role="dialog"
              aria-label={title}
              style={{ top: pos.top, left: pos.left, width: CARD_WIDTH }}
              className="fixed z-[121] max-w-[calc(100vw-24px)] rounded-xl border border-line bg-white p-5 shadow-2xl"
            >
              <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
              <p className="mt-2.5 text-[14px] text-ink">{help.summary}</p>
              {lines.length > 0 && (
                <div className="mt-3 rounded-lg bg-surface px-3.5 py-3 text-[13px] leading-relaxed text-ink-soft">
                  {lines.map(([label, value]) => (
                    <p key={label}>{label}: {value}</p>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => setPos(null)} className="mt-3.5 text-[14px] font-semibold text-brand-green hover:underline">
                Got it
              </button>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
