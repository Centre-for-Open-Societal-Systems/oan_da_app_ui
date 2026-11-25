"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export const PAGE_SIZES = [10, 25, 50];

/** Client-side paging over the rows a table is showing (after its search and filters). */
export function usePagination<T>(rows: T[], initialPageSize = PAGE_SIZES[0]) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  // Filters or search can shrink the list under the current page — clamp instead of showing an empty page.
  const current = Math.min(page, totalPages);
  const pageRows = rows.slice((current - 1) * pageSize, current * pageSize);

  return {
    pageRows,
    paginationProps: {
      page: current,
      pageSize,
      total: rows.length,
      onPageChange: setPage,
      onPageSizeChange: (size: number) => {
        setPageSize(size);
        setPage(1);
      },
    },
  };
}

/** 1 2 3 … 10 at the start, 1 … 4 5 6 … 10 in the middle, 1 … 8 9 10 at the end. */
function pageItems(page: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3].forEach((p) => pages.add(p));
  if (page >= totalPages - 2) [totalPages - 2, totalPages - 1].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const items: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) items.push("gap");
    items.push(p);
  });
  return items;
}

interface TablePaginationProps {
  page: number;
  pageSize: number;
  /** Number of rows across all pages. */
  total: number;
  /** Page count as the server reports it; worked out from total and pageSize when absent. */
  totalPages?: number;
  /** Noun shown after the total, e.g. "farmers". */
  itemLabel: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const BOX = "flex h-8 min-w-8 items-center justify-center rounded-lg border px-2.5 text-sm font-semibold transition-all duration-200";

function PageSizeDropdown({
  value,
  options = PAGE_SIZES,
  onChange,
}: {
  value: number;
  options?: number[];
  onChange: (size: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const onScrollOrResize = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [isOpen]);

  const toggle = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < 140 && rect.top > 140;

      setMenuStyle({
        position: "fixed",
        left: rect.left,
        minWidth: Math.max(rect.width, 68),
        zIndex: 110,
        ...(openUpward
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
      });
    }
    setIsOpen(true);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Rows per page"
        className={cn(
          "inline-flex h-8 items-center justify-between gap-1.5 rounded-md border bg-white px-2.5 text-[12.5px] sm:text-[13px] font-medium text-slate-700 shadow-xs transition-all duration-150 focus:outline-none",
          isOpen
            ? "border-brand-green ring-2 ring-brand-green/20"
            : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50"
        )}
      >
        <span>{value}</span>
        <svg
          className={cn(
            "h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ease-out",
            isOpen && "rotate-180 text-brand-green"
          )}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label="Select rows per page"
            style={menuStyle}
            className="animate-dropdown-in overflow-hidden rounded-lg border border-line bg-white p-1 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.18)]"
          >
            {options.map((size) => {
              const isSelected = size === value;
              return (
                <button
                  key={size}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(size);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2.5 rounded-md px-2.5 py-1.5 text-left text-xs sm:text-[12.5px] font-medium transition-colors",
                    isSelected
                      ? "bg-brand-wash font-semibold text-brand-green"
                      : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                  )}
                >
                  <span>{size}</span>
                  {isSelected && (
                    <svg
                      className="h-3.5 w-3.5 shrink-0 text-brand-green"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}

// Table footer: "Showing [10] of N items" on the left, Previous · 1 2 3 … 10 · Next on the right.
export function TablePagination({ page, pageSize, total, totalPages: serverPages, itemLabel, onPageChange, onPageSizeChange }: TablePaginationProps) {
  const totalPages = Math.max(1, serverPages ?? Math.ceil(total / pageSize));

  // Every list shows its footer (even a single page) so the total and page size are always visible; only an empty list has none.
  if (total === 0) return null;

  return (
        <div className="flex flex-col gap-2.5 border-t border-line px-3.5 py-3 sm:px-6 sm:py-3.5 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
          <div className="flex items-center justify-center min-[480px]:justify-start gap-2 text-[12.5px] sm:text-[13.5px] text-slate-600 whitespace-nowrap">
            <span>Showing</span>
            <PageSizeDropdown
              value={pageSize}
              options={PAGE_SIZES}
              onChange={onPageSizeChange}
            />
            <span>of {total.toLocaleString()} {itemLabel}</span>
          </div>

            <nav className="flex items-center justify-center min-[480px]:justify-end gap-1.5 sm:gap-2 shrink-0" aria-label="Pagination">
              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
                className={cn(BOX, "gap-1.5 border-zinc-200 bg-white px-2.5 sm:px-3 text-slate-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-line-soft disabled:text-subtle disabled:hover:bg-white text-[12px] sm:text-sm")}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                <span className="hidden sm:inline">Previous</span>
              </button>

              {pageItems(page, totalPages).map((item, i) =>
                item === "gap" ? (
                  <span key={`gap-${i}`} className={cn(BOX, "border-zinc-200 bg-white text-slate-700 text-xs sm:text-sm")} aria-hidden="true">…</span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onPageChange(item)}
                    aria-current={page === item ? "page" : undefined}
                    aria-label={`Page ${item}`}
                    className={cn(
                      BOX,
                      "text-xs sm:text-sm",
                      page === item ? "border-brand-green-bright bg-brand-green-bright text-white shadow-md" : "border-transparent text-gray-600 hover:-translate-y-0.5 hover:border-gray-200 hover:bg-white hover:text-brand-green-bright hover:shadow-md",
                    )}
                  >
                    {item}
                  </button>
                ),
              )}

              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
                className={cn(BOX, "gap-1.5 border-zinc-200 bg-white px-2.5 sm:px-3 text-ink hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-line-soft disabled:text-subtle disabled:hover:bg-white text-[12px] sm:text-sm")}
              >
                <span className="hidden sm:inline">Next</span>
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </nav>
        </div>
        );
}
