"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { matchesQuery } from "@/lib/search";
import { cn } from "@/lib/utils";

export interface DropdownOption {
  value: string;
  label: string;
  /** Optional secondary line rendered under the label. */
  description?: string;
  /** Short badge at the right end of the row (e.g. "17 days left"); on the selected row it turns into green text with a check. */
  trailing?: string;
  /** Shown but not selectable, e.g. a "Select …" placeholder row. */
  disabled?: boolean;
}

interface DropdownProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: (string | DropdownOption)[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Classes for the field itself (height, border colour…); `className` sets the wrapper. */
  triggerClassName?: string;
  /** Which edge of the trigger the menu aligns to when it is wider than the trigger. */
  align?: "left" | "right";
  /** Custom trigger content for the selected option; defaults to its label. */
  renderValue?: (option: DropdownOption) => ReactNode;
  /** Makes the field itself a text input: typing filters options by label and description. */
  searchable?: boolean;
  /** Placeholder while the menu is open and nothing is selected yet. */
  searchPlaceholder?: string;
  /** Shown in the menu when the search matches nothing. */
  noResultsText?: string;
}

const normalise = (o: string | DropdownOption): DropdownOption => (typeof o === "string" ? { value: o, label: o } : o);

const MENU_MAX_HEIGHT = 320;
const VIEWPORT_GAP = 14;

// Styled single-select menu (replaces the native <select> where the design shows
// a custom list with row dividers). Keyboard: ↑/↓ move, Enter/Space select, Esc close.
// With `searchable`, the field is typed into directly and Space types a space instead of selecting.
export function Dropdown({
  id,
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled,
  className,
  triggerClassName,
  align = "left",
  renderValue,
  searchable,
  searchPlaceholder = "Search…",
  noResultsText = "No matches found",
}: DropdownProps) {
  const items = options.map(normalise);
  const selected = items.find((o) => o.value === value) ?? null;
  const [isOpen, setIsOpen] = useState(false);
  const [animatingValue, setAnimatingValue] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  // The menu is portalled to <body> and fixed to the viewport, so scrolling, overflow-hidden or transformed
  // parents (e.g. a modal body) never clip it.
  // It opens upward (and shrinks to fit) when there is not enough room below the trigger.
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const visible = searchable && query.trim() ? items.filter((o) => matchesQuery(query, o.label, o.description)) : items;

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setIsOpen(false);
    };
    // A fixed menu would drift away from its trigger, so any outside scroll or resize closes it.
    const onScroll = (e: Event) => {
      if (!menuRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    const onResize = () => setIsOpen(false);
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [isOpen]);

  // Keep the highlighted row visible while navigating with the keyboard
  useEffect(() => {
    if (!isOpen) return;
    // Scroll only the list: scrollIntoView could also scroll the page, which closes the menu
    const list = listRef.current;
    const row = list?.children[highlight] as HTMLElement | undefined;
    if (!list || !row) return;
    if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop;
    else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight;
  }, [highlight, isOpen]);

  const open = () => {
    if (disabled) return;
    setQuery("");
    setHighlight(Math.max(0, items.findIndex((o) => o.value === value)));
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_GAP;
      const spaceAbove = rect.top - VIEWPORT_GAP;
      const up = spaceBelow < MENU_MAX_HEIGHT && spaceAbove > spaceBelow;
      const isNearRightEdge = rect.left + Math.max(rect.width, 200) > window.innerWidth - 12;
      const useRight = align === "right" || isNearRightEdge;
      setMenuStyle({
        maxHeight: Math.max(120, Math.min(MENU_MAX_HEIGHT, up ? spaceAbove : spaceBelow)),
        minWidth: rect.width,
        ...(up ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
        ...(useRight ? { right: Math.max(12, window.innerWidth - rect.right) } : { left: Math.max(12, rect.left) }),
      });
    }
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    (searchable ? searchRef : triggerRef).current?.focus({ preventScroll: true });
  };

  const choose = (option: DropdownOption) => {
    setAnimatingValue(option.value);
    onChange(option.value);
    setTimeout(() => {
      setAnimatingValue(null);
      close();
    }, 140);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!isOpen && (e.key === "ArrowDown" || e.key === "Enter" || (e.key === " " && !searchable))) {
      e.preventDefault();
      open();
      return;
    }
    if (!isOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, visible.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" || (e.key === " " && !searchable)) {
      e.preventDefault();
      if (visible[highlight] && !visible[highlight].disabled) choose(visible[highlight]);
    } else if (e.key === "Escape") {
      // Close only the menu, not a modal it sits in (the modal listens on document too)
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      close();
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  };

  const chevron = (
    <svg className={cn("h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ease-in-out", isOpen && "rotate-180", searchable && "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 9l-7 7-7-7" />
    </svg>
  );

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {searchable ? (
        // The field itself is the search box: closed it shows the selected label, open it holds the query
        // (the current selection stays visible as the placeholder until the user types).
        <>
          <input
            ref={searchRef}
            id={id}
            type="text"
            disabled={disabled}
            value={isOpen ? query : (selected?.label ?? "")}
            onChange={(e) => {
              if (!isOpen) open();
              setQuery(e.target.value);
              setHighlight(0);
            }}
            onClick={() => !isOpen && open()}
            onKeyDown={onKeyDown}
            placeholder={isOpen ? (selected?.label ?? searchPlaceholder) : placeholder}
            role="combobox"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-controls={listId}
            autoComplete="off"
            className={cn(
              "h-11 w-full truncate rounded-lg border bg-white pl-3 pr-10 text-sm text-zinc-900 outline-none transition-all duration-150 placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:hover:border-gray-200 disabled:hover:ring-0",
              isOpen
                ? "border-brand-green ring-2 ring-brand-green/20"
                : "border-gray-200 hover:border-brand-green hover:ring-1 hover:ring-brand-green/20 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20",
              triggerClassName,
            )}
          />
          {chevron}
        </>
      ) : (
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-3 rounded-lg border bg-white px-3 text-left text-sm transition-all duration-150 outline-none cursor-pointer disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:hover:border-gray-200 disabled:hover:ring-0",
          isOpen
            ? "border-brand-green ring-2 ring-brand-green/20"
            : "border-gray-200 hover:border-brand-green hover:ring-1 hover:ring-brand-green/20 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20",
          selected && !selected.disabled ? "text-zinc-900" : "text-zinc-400",
          triggerClassName,
        )}
      >
        <span className="min-w-0 flex-1 truncate">{selected ? (renderValue ? renderValue(selected) : selected.label) : placeholder}</span>
        {chevron}
      </button>
      )}

      {isOpen && createPortal(
        <div
          ref={menuRef}
          className={cn(
            "fixed z-[110] flex animate-dropdown-in origin-top flex-col overflow-hidden rounded-xl border border-line bg-white text-[13.5px] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.22)]",
            searchable ? "max-w-[calc(100vw-2rem)]" : "w-max max-w-[min(440px,calc(100vw-2rem))]"
          )}
          // A searchable menu keeps the field's width so it does not jump around while results filter
          style={searchable ? { ...menuStyle, width: menuStyle.minWidth } : menuStyle}
        >
          <ul ref={listRef} id={listId} role="listbox" className="relative min-h-0 flex-1 overflow-y-auto py-0.5">
            {visible.map((option, i) => {
              const isSelected = option.value === value;
              const isAnimating = option.value === animatingValue;
              const isHighlighted = i === highlight;
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => !option.disabled && choose(option)}
                  className={cn(
                    "cursor-pointer border-b border-line-soft px-4 py-3 text-slate-700 transition-all duration-150 last:border-b-0",
                    isHighlighted && "bg-surface",
                    isSelected && !option.disabled && "bg-brand-mint font-semibold text-brand-green",
                    isAnimating && "bg-emerald-100 font-bold text-brand-green scale-[1.01]",
                    option.disabled && "cursor-default bg-surface font-semibold text-slate-600"
                  )}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <span className={cn("block", searchable ? "truncate" : "whitespace-nowrap")}>{option.label}</span>
                      {option.description && <span className={cn("mt-0.5 block text-[12.5px] text-muted", searchable ? "truncate" : "whitespace-nowrap")}>{option.description}</span>}
                    </div>
                    {option.trailing ? (
                      <span className="flex shrink-0 items-center gap-2">
                        {isSelected ? (
                          <>
                            <span className="whitespace-nowrap text-[13px] font-semibold text-brand-green">{option.trailing}</span>
                            <svg className="h-5 w-5 text-brand-green animate-check-pop" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1.2 14.2l-3.5-3.5 1.4-1.4 2.1 2.1 4.6-4.6 1.4 1.4-6 6z" />
                            </svg>
                          </>
                        ) : (
                          <span className="whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1 text-[12.5px] font-semibold text-ink">{option.trailing}</span>
                        )}
                      </span>
                    ) : (isSelected || isAnimating) && !option.disabled ? (
                      <span className="flex shrink-0 items-center text-brand-green animate-check-pop">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
            {visible.length === 0 && <li className="px-4 py-6 text-center text-[13.5px] text-muted">{noResultsText}</li>}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  );
}
