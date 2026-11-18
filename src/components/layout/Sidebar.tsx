"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSidebar } from "@/contexts/SidebarContext";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";
import { navForRole, ROLE_LABELS, ROLE_SCOPES, type NavItem as NavEntry } from "@/lib/rbac";
import { NavIcon } from "./NavIcon";

interface TooltipState {
  title: string;
  /** Viewport y of the hovered link's vertical centre */
  top: number;
}

interface NavItemProps {
  item: NavEntry;
  active: boolean;
  expanded: boolean;
  onNavigate: () => void;
  onHover: (tooltip: TooltipState | null) => void;
}

// One rail link. On desktop the label collapses with the rail; the mobile drawer is always full width.
// When collapsed, hovering reports the label + position so the parent can float a tooltip beside the rail
// (the rail itself clips overflow, so the tooltip can't live inside the link).
// Part 2 items are rendered disabled so the §2.4 nav shape is complete without dead routes.
function NavItem({ item, active, expanded, onNavigate, onHover }: NavItemProps) {
  const disabled = item.part === 2;
  const label = disabled ? `${item.title} · Part 2 preview` : item.title;
  const className = cn(
    "flex items-center gap-3.5 h-11 rounded-lg text-[14.5px] transition-all duration-200",
    active ? "bg-brand-green-bright text-white font-semibold shadow-sm" : "text-sidebar-text",
    !active && !disabled && "hover:bg-sidebar-hover hover:text-white",
    disabled && "cursor-not-allowed opacity-45",
    // Collapsed rail: the icon is centred in the link and the (hidden) label leaves no gap behind it.
    expanded ? "px-4" : "px-4 lg:justify-center lg:gap-0 lg:px-0"
  );
  const content = (
    <>
      <div className="shrink-0"><NavIcon href={item.href} /></div>
      <span
        className={cn(
          "flex min-w-0 items-center gap-2 whitespace-nowrap transition-all duration-300 ease-in-out",
          active ? "font-semibold" : "font-medium",
          expanded ? "max-w-[170px] opacity-100 translate-x-0" : "max-w-[170px] opacity-100 translate-x-0 lg:max-w-0 lg:opacity-0 lg:-translate-x-2"
        )}
      >
        <span className="truncate">{item.title}</span>
        {disabled && <span className="shrink-0 rounded bg-white/15 px-1.5 py-px text-[10px] font-semibold ">Part 2 preview</span>}
      </span>
    </>
  );
  const hoverProps = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      if (expanded) return;
      const rect = e.currentTarget.getBoundingClientRect();
      onHover({ title: label, top: rect.top + rect.height / 2 });
    },
    onMouseLeave: () => onHover(null),
  };

  if (disabled) {
    return (
      <div role="link" aria-disabled="true" aria-label={label} className={className} {...hoverProps}>
        {content}
      </div>
    );
  }
  return (
    <Link
      href={item.href}
      onClick={() => {
        onHover(null);
        onNavigate();
      }}
      className={className}
      aria-label={item.title}
      {...hoverProps}
    >
      {content}
    </Link>
  );
}

function SectionHeader({ title, open, expanded, onToggle }: { title: string; open: boolean; expanded: boolean; onToggle: () => void }) {
  return (
    <div
      className={cn(
        "mt-2 flex items-center justify-between rounded-lg px-4 cursor-pointer select-none overflow-hidden whitespace-nowrap hover:bg-sidebar-hover transition-all duration-300 ease-in-out",
        expanded ? "h-8 opacity-100" : "h-8 opacity-100 lg:mt-0 lg:h-0 lg:opacity-0 lg:pointer-events-none"
      )}
      onClick={onToggle}
    >
      <span className="text-[11px] font-semibold text-sidebar-subtext tracking-wider uppercase">{title}</span>
      <svg className={cn("w-4 h-4 text-sidebar-subtext transition-transform", !open && "-rotate-90")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}

// Appendix D: the signed-in identity + role is shown in the sidebar footer. The role is read-only —
// it comes from the account signed in at /login and drives nav visibility and RBAC-gated actions.
function IdentityFooter({ expanded }: { expanded: boolean }) {
  const { user, role, profile } = useAuthStore();
  const name = user?.name ?? "Tadesse Alemu";
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return (
    <div className={cn("shrink-0 border-t border-sidebar-line transition-[padding] duration-300", expanded ? "px-5 py-3.5" : "px-5 py-3.5 lg:px-[18px]")}>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gold text-[13px] font-bold text-brand-green-deep" title={`${name} · ${profile?.roleLabel ?? ROLE_LABELS[role]}`}>{initials}</div>
        <div className={cn("min-w-0 flex-1 overflow-hidden whitespace-nowrap transition-all duration-300", expanded ? "max-w-[170px] opacity-100" : "max-w-[170px] opacity-100 lg:max-w-0 lg:opacity-0")}>
          <p className="truncate text-[13px] font-semibold text-white">{name}</p>
          <p className="truncate text-[11px] text-sidebar-subtext">{profile?.scopeLabel ?? ROLE_SCOPES[role]}</p>
        </div>
      </div>
    </div>
  );
}

// Routes without their own nav item, mapped to the item(s) that own them for the active state.
const OWNERS: Record<string, string | string[]> = {
  "/visits": "/farmers",
  "/assignments": "/farmers",
  "/sync": "/dashboard",
  "/performance/teams": ["/agents", "/my-teams"],
};
// Routes that are a tab of another module's strip (see ModuleStrip) — their parent stays active over their own item.
const TAB_PARENTS: Record<string, string> = { "/registry-sync": "/agents" };

export function Sidebar() {
  const { isOpen, isMobileOpen, closeMobile } = useSidebar();
  const pathname = usePathname();
  const role = useAuthStore((s) => s.role);
  const groups = navForRole(role);

  // Collapsed section headers, keyed by group title
  const [closedGroups, setClosedGroups] = useState<Set<string>>(new Set());
  const toggleGroup = (title: string) =>
    setClosedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });

  // Label floated beside the collapsed rail for the link under the cursor
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // A route change (link tap, back button) always dismisses the mobile drawer
  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  // Nested routes (/farmers/123, /visits/5/outcome, /agents/daid) keep their parent link active. The longest
  // matching href wins so /farmers/new can't be claimed by a shorter sibling.
  const items = groups.flatMap((g) => g.items);
  const bestMatch = (path: string) =>
    items.filter((item) => path === item.href || path.startsWith(item.href + "/")).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  // Direct match first; fall back to the owning item only when the route has no nav item of its own for this role.
  const ownerEntry = Object.entries(OWNERS).find(([p]) => pathname === p || pathname.startsWith(p + "/"))?.[1];
  const ownerMatch = ownerEntry
    ? (Array.isArray(ownerEntry) ? ownerEntry : [ownerEntry]).map((p) => bestMatch(p)).find(Boolean)
    : undefined;
  // Module tabs always light up their parent module, even when the tab also has its own nav item.
  const tabParent = Object.entries(TAB_PARENTS).find(([p]) => pathname === p || pathname.startsWith(p + "/"))?.[1];
  const activeHref = (tabParent && bestMatch(tabParent)) || bestMatch(pathname) || ownerMatch;

  const navItemProps = { expanded: isOpen, onNavigate: closeMobile, onHover: setTooltip };

  return (
    <>
      {/* Collapsed-rail tooltip. Lives outside the <aside> because it clips overflow and its transform would trap position:fixed. */}
      {!isOpen && tooltip && (
        <div
          role="tooltip"
          className="pointer-events-none fixed left-[72px] z-[90] hidden -translate-y-1/2 items-center lg:flex"
          style={{ top: tooltip.top }}
        >
          <span className="h-0 w-0 border-y-[6px] border-r-[6px] border-y-transparent border-r-brand-green-deep" />
          <span className="whitespace-nowrap rounded-md bg-brand-green-deep px-3 py-1.5 text-[13px] font-medium text-white shadow-lg">
            {tooltip.title}
          </span>
        </div>
      )}

      {/* Backdrop for the mobile drawer */}
      <div
        aria-hidden="true"
        onClick={closeMobile}
        className={cn(
          "fixed inset-0 z-[70] bg-ink/50 backdrop-blur-[1px] transition-opacity duration-300 lg:hidden",
          isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[80] flex h-full w-[260px] shrink-0 flex-col bg-brand-green-deep text-white shadow-xl transition-[transform,width] duration-300 ease-in-out",
          "lg:static lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          isOpen ? "lg:w-[260px]" : "lg:w-[72px]"
        )}
      >
        {/* Brand Header */}
        <div className={cn("flex items-center gap-3.5 shrink-0 border-b border-sidebar-line h-16 transition-[padding] duration-300 ease-in-out", isOpen ? "px-5" : "px-5 lg:px-[18px]")}>
          <div className="w-9 h-9 shrink-0 bg-white rounded-lg flex items-center justify-center text-brand-green">
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.4993 7.152V5.25C10.4993 4.45435 10.8153 3.69129 11.3778 3.12868C11.9404 2.56607 12.7034 2.25 13.499 2.25H14.6238C14.7233 2.25 14.8187 2.28951 14.889 2.35984C14.9593 2.43016 14.9988 2.52554 14.9988 2.625V3.75C14.9988 4.54565 14.6828 5.30871 14.1202 5.87132C13.5577 6.43393 12.7947 6.75 11.9991 6.75C11.2035 6.75 10.4405 7.06607 9.87799 7.62868C9.31544 8.19129 8.9994 8.95435 8.9994 9.75M8.9994 9.75C8.9994 11.25 9.74933 12 9.74933 13.5C9.74933 14.3114 9.48618 15.1009 8.9994 15.75M8.9994 9.75C8.9994 9.05358 8.80549 8.37092 8.4394 7.77851C8.0733 7.1861 7.54949 6.70735 6.92666 6.3959C6.30382 6.08445 5.60657 5.95261 4.91304 6.01515C4.2195 6.0777 3.55708 6.33215 3 6.75C3 7.44642 3.19391 8.12908 3.56 8.72149C3.9261 9.3139 4.44991 9.79265 5.07274 10.1041C5.69558 10.4156 6.39283 10.5474 7.08636 10.4848C7.7799 10.4223 8.44232 10.1679 8.9994 9.75ZM3.74993 15.75H14.2489" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className={cn("flex min-w-0 flex-col whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out", isOpen ? "max-w-[170px] opacity-100 translate-x-0" : "max-w-[170px] opacity-100 translate-x-0 lg:max-w-0 lg:opacity-0 lg:-translate-x-2")}>
            <span className="text-[16px] font-semibold leading-tight tracking-wide">Development Agent</span>
            <span className="mt-1 text-[12px] tracking-wide text-sidebar-subtext">Ethiopia OpenAgriNet</span>
          </div>

          {/* Close (mobile drawer only) */}
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close menu"
            className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Navigation — 6 collapsible groups (§2.4), filtered by role */}
        {/* On the collapsed rail the scrollbar is hidden: its 6px would narrow the links from the right and push the icons off-centre. */}
        <nav
          onScroll={() => setTooltip(null)}
          className={cn("flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-3 py-3 sidebar-scrollbar", !isOpen && "lg:[scrollbar-width:none]! lg:[&::-webkit-scrollbar]:hidden")}
        >
          {groups.map((group) => {
            const open = !closedGroups.has(group.title);
            return (
              <div key={group.title || "top"} className="flex flex-col">
                {group.title && <SectionHeader title={group.title} open={open} expanded={isOpen} onToggle={() => toggleGroup(group.title)} />}
                {(open || !isOpen) && (
                  <div className="flex flex-col gap-1">
                    {group.items.map((item) => (
                      <NavItem key={item.href} item={item} active={item.href === activeHref} {...navItemProps} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <IdentityFooter expanded={isOpen} />
      </aside>
    </>
  );
}
