"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Banner } from "@/components/ui/Banner";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { DateRangeDropdown } from "@/app/(dashboard)/dashboard/components/DateRangeDropdown";
import { useAuthStore } from "@/store/useAuthStore";
import { formatLabel, type ExportFormat } from "@/lib/export";
import { cn } from "@/lib/utils";

interface Report {
  id: string;
  name: string;
  description: string;
  scope: "Woreda" | "Region" | "National";
  part: 1 | 2;
  lastRun: string;
  formats: ExportFormat[];
}

const REPORTS: Report[] = [
  { id: "r-registry", name: "DA master registry extract", description: "All DAs with Fayda status, active status, kebele, farmer count and approval/publication state.", scope: "Region", part: 1, lastRun: "14 Sep 2026, 06:00", formats: ["csv", "xlsx"] },
  { id: "r-coverage", name: "Kebele coverage", description: "Agents, linked farmers and households per kebele; uncovered and flagged kebeles.", scope: "Woreda", part: 1, lastRun: "14 Sep 2026, 06:00", formats: ["pdf", "csv"] },
  { id: "r-sync", name: "MoA reconciliation report", description: "Every registry-sync event with direction, outcome, retry count and reconciliation decision.", scope: "National", part: 1, lastRun: "08 Sep 2026, 10:30", formats: ["csv"] },
  { id: "r-exceptions", name: "Data-quality exceptions", description: "Open and resolved exceptions by kind, age and owning module.", scope: "Region", part: 1, lastRun: "14 Sep 2026, 06:00", formats: ["xlsx"] },
  { id: "r-visits", name: "Visit activity", description: "Planned vs completed visits, on-time rate, missed/rescheduled by agent and kebele.", scope: "Woreda", part: 1, lastRun: "15 Sep 2026, 06:00", formats: ["pdf", "csv"] },
  { id: "r-broadcast", name: "Dissemination log", description: "Broadcast dispatches with audience, channels and delivery outcomes.", scope: "Woreda", part: 1, lastRun: "14 Sep 2026, 06:00", formats: ["csv"] },
  { id: "r-grievance", name: "Grievance summary (external)", description: "Case IDs and categories by kebele — identity fields withheld per FR-12a.", scope: "Woreda", part: 1, lastRun: "15 Sep 2026, 06:00", formats: ["pdf"] },
  { id: "r-sla", name: "SLA compliance", description: "Visit cadence and response timeliness at DA, Woreda and regional level.", scope: "Region", part: 2, lastRun: "—", formats: ["pdf"] },
];

const PERIODS = ["This week", "This month", "This quarter", "Meher 2026"] as const;
const FORMAT_ORDER: ExportFormat[] = ["csv", "xlsx", "pdf"];

const Icon = ({ d, className = "h-5 w-5" }: { d: string; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

interface ReportTheme {
  tile: string;
  cardBg: string;
  accentBorder: string;
}

const REPORT_THEMES: Record<string, ReportTheme> = {
  "r-registry": {
    tile: "bg-emerald-100/90 text-emerald-800 border border-emerald-300 shadow-2xs",
    cardBg: "bg-gradient-to-b from-emerald-50/40 via-white to-white hover:border-emerald-300",
    accentBorder: "border-t-[3px] border-t-emerald-500",
  },
  "r-coverage": {
    tile: "bg-indigo-100/90 text-indigo-800 border border-indigo-300 shadow-2xs",
    cardBg: "bg-gradient-to-b from-indigo-50/40 via-white to-white hover:border-indigo-300",
    accentBorder: "border-t-[3px] border-t-indigo-500",
  },
  "r-sync": {
    tile: "bg-purple-100/90 text-purple-800 border border-purple-300 shadow-2xs",
    cardBg: "bg-gradient-to-b from-purple-50/40 via-white to-white hover:border-purple-300",
    accentBorder: "border-t-[3px] border-t-purple-500",
  },
  "r-exceptions": {
    tile: "bg-amber-100/90 text-amber-800 border border-amber-300 shadow-2xs",
    cardBg: "bg-gradient-to-b from-amber-50/40 via-white to-white hover:border-amber-300",
    accentBorder: "border-t-[3px] border-t-amber-500",
  },
  "r-visits": {
    tile: "bg-teal-100/90 text-teal-800 border border-teal-300 shadow-2xs",
    cardBg: "bg-gradient-to-b from-teal-50/40 via-white to-white hover:border-teal-300",
    accentBorder: "border-t-[3px] border-t-teal-500",
  },
  "r-broadcast": {
    tile: "bg-sky-100/90 text-sky-800 border border-sky-300 shadow-2xs",
    cardBg: "bg-gradient-to-b from-sky-50/40 via-white to-white hover:border-sky-300",
    accentBorder: "border-t-[3px] border-t-sky-500",
  },
  "r-grievance": {
    tile: "bg-rose-100/90 text-rose-800 border border-rose-300 shadow-2xs",
    cardBg: "bg-gradient-to-b from-rose-50/40 via-white to-white hover:border-rose-300",
    accentBorder: "border-t-[3px] border-t-rose-500",
  },
  "r-sla": {
    tile: "bg-violet-100/90 text-violet-800 border border-violet-300 shadow-2xs",
    cardBg: "bg-gradient-to-b from-violet-50/40 via-white to-white hover:border-violet-300",
    accentBorder: "border-t-[3px] border-t-violet-500",
  },
};

// 1. DA master registry extract: Official ID badge / directory card with verified seal
function RegistryIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="9.5" y="2.5" width="5" height="2" rx="1" fill="currentColor" />
      <circle cx="8" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.8 16c.4-1.8 1.8-2.6 3.2-2.6s2.8.8 3.2 2.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M13.5 9h4.5M13.5 12h4.5M13.5 15h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="17.5" cy="15" r="2" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M16.8 15l.5.5 1-.9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 2. Kebele coverage: Geographic 3-fold territory map with kebele location pin marker
function CoverageIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 6.5l5.5-2.5 5 2.5 7.5-3.5v14.5l-7.5 3.5-5-2.5-5.5 2.5V6.5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M8.5 4v14.5M13.5 6.5V21" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2 2" strokeOpacity="0.6" />
      <path
        d="M16 11.5c1.4-1.4 2-2.3 2-3.5a2.5 2.5 0 00-5 0c0 1.2.6 2.1 2 3.5l.5.5.5-.5z"
        fill="currentColor"
        fillOpacity="0.25"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="8" r="0.9" fill="currentColor" />
    </svg>
  );
}

// 3. MoA reconciliation report: Ministry database stacks with 2-way sync data exchange
function ReconciliationIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="5" rx="7" ry="2.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 5v3.5c0 1.2 3.1 2.2 7 2.2s7-1 7-2.2V5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 14v3.5c0 1.2 3.1 2.2 7 2.2s7-1 7-2.2V14" stroke="currentColor" strokeWidth="1.7" />
      <ellipse cx="12" cy="14" rx="7" ry="2.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 10.5l-1.5 1.5 1.5 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 12h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15 13.5l1.5-1.5-1.5-1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.5 12h-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// 4. Data-quality exceptions: Data audit sheet with warning exception shield & alert
function ExceptionsIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3.5" width="13" height="17" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6 7.5h7M6 11h4M6 14.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M17 10l4.5 1.8v3.6c0 3.1-2.2 4.9-4.5 5.6-2.3-.7-4.5-2.5-4.5-5.6v-3.6L17 10z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M17 13.5v2.2M17 18h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// 5. Visit activity: Field inspection clipboard with checked visits and schedule clock
function VisitActivityIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="17" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 4V2.8a.8.8 0 01.8-.8h4.4a.8.8 0 01.8.8V4" stroke="currentColor" strokeWidth="1.7" />
      <rect x="8" y="3" width="8" height="2.5" rx="1" fill="currentColor" fillOpacity="0.15" />
      <path d="M7.5 9.5l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.5 10h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7.5 14.5l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.5 15h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16.5" cy="17.5" r="2.5" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M16.5 16.2v1.3h1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// 6. Dissemination log: Transmission broadcast antenna with outward communication radio waves
function DisseminationIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 11v10M9 21h6M8 17h8M10 13h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="9" r="2" fill="currentColor" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 6a5 5 0 000 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15.5 6a5 5 0 010 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5.5 3.5a9 9 0 000 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18.5 3.5a9 9 0 010 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// 7. Grievance summary (external): Confidential case dossier with protective security shield
function GrievanceIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 6.5a2 2 0 012-2h4.5l2 2H19a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2v-12z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M12 10.5l3.5 1.4v2.8c0 2.4-1.7 3.8-3.5 4.3-1.8-.5-3.5-1.9-3.5-4.3v-2.8l3.5-1.4z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="14" r="0.9" fill="currentColor" />
      <path d="M12 14.8v1.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function ReportCardIcon({ reportId, className = "h-5 w-5" }: { reportId: string; className?: string }) {
  switch (reportId) {
    case "r-registry":
      return <RegistryIcon className={className} />;
    case "r-coverage":
      return <CoverageIcon className={className} />;
    case "r-sync":
      return <ReconciliationIcon className={className} />;
    case "r-exceptions":
      return <ExceptionsIcon className={className} />;
    case "r-visits":
      return <VisitActivityIcon className={className} />;
    case "r-broadcast":
      return <DisseminationIcon className={className} />;
    case "r-grievance":
      return <GrievanceIcon className={className} />;
    default:
      return <RegistryIcon className={className} />;
  }
}

function ExcelIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="20" height="18" rx="2.5" fill="#107C41" />
      <path d="M10 7h10M10 12h10M10 17h10M15 7v10" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.45" />
      <rect x="2" y="5.5" width="10" height="13" rx="1.5" fill="#0C5E31" />
      <path d="M4.5 9l5 6m0-6l-5 6" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PdfIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="20" height="18" rx="2.5" fill="#E5252A" />
      <path
        d="M17.5 15.6c-.8-.9-2.5-1.3-4.5-1.2-.5-.6-1-1.6-1.4-2.8.5-1.7.9-3.1.6-3.5-.3-.4-1-.2-1.3.6-.3 1.1.1 2.6.8 4-1 2-1.8 3.5-2.3 4.2-.5.6-.7 1.1-.3 1.4.3.3 1 .1 1.8-.8 1.6-.6 3.4-.9 4.9-1.1.9.7 1.6.9 2 .8.4-.2.4-.7 0-1.6zm-6.4-1.1c-.5.8-.9 1.2-1.1 1.2-.1 0-.1-.1.1-.3.2-.3.6-.9 1-1zm.8-5.3c.2-.3.3-.4.4-.3.1.2 0 .7-.2 1.3-.2-.5-.2-.8-.2-1zm1 4.5c.6.1 1.1.3 1.7.4-.9.2-1.6.3-2.5.5.3-.3.5-.6.8-.9zm4 2.2c-.2.2-.4.2-.8-.1.4-.2.8-.1.8.1z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

function CsvIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="20" height="18" rx="2.5" fill="#059669" />
      <path d="M7 9.5a1.8 1.8 0 00-1.8 1.8v1.4a1.8 1.8 0 001.8 1.8h.7" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12.8 9.8a1.3 1.3 0 00-1.3-.2c-.7 0-1.2.4-1.2.9 0 1.2 2.3.6 2.3 2 0 .8-.7 1.5-1.6 1.5-.7 0-1.2-.3-1.4-.7" stroke="#FFFFFF" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M15.2 9.5l1.6 4.8 1.6-4.8" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 18h15" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.4" strokeLinecap="round" />
    </svg>
  );
}

function FormatBrandIcon({ format, className = "h-3.5 w-3.5" }: { format: string; className?: string }) {
  const f = format.toLowerCase();
  if (f === "xlsx") return <ExcelIcon className={className} />;
  if (f === "pdf") return <PdfIcon className={className} />;
  if (f === "csv") return <CsvIcon className={className} />;
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

const FORMAT_STYLES: Record<ExportFormat, string> = {
  csv: "bg-emerald-50/90 text-[#047857] border border-[#059669]/35 hover:bg-emerald-100 hover:border-[#059669]/60 focus:ring-2 focus:ring-emerald-500/20",
  xlsx: "bg-emerald-50/90 text-[#107C41] border border-[#107C41]/35 hover:bg-emerald-100 hover:border-[#107C41]/60 focus:ring-2 focus:ring-[#107C41]/20",
  pdf: "bg-red-50/90 text-[#DC2626] border border-[#DC2626]/35 hover:bg-red-100 hover:border-[#DC2626]/60 focus:ring-2 focus:ring-[#DC2626]/20",
};

const SCOPE_STYLES: Record<string, string> = {
  Woreda: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Region: "bg-indigo-50 text-indigo-700 border-indigo-200",
  National: "bg-purple-50 text-purple-700 border-purple-200",
};

interface ScopeOption {
  value: string;
  label: string;
  description: string;
  icon: string;
  iconBg: string;
}

const SCOPE_OPTIONS: ScopeOption[] = [
  {
    value: "All",
    label: "All scopes",
    description: "All available registry & operational reports",
    iconBg: "bg-slate-100 text-slate-600",
    icon: "M4 6h16M4 10h16M4 14h16M4 18h16",
  },
  {
    value: "Woreda",
    label: "Woreda",
    description: "Operational DA & kebele level reports",
    iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-200/70",
    icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    value: "Region",
    label: "Region",
    description: "Regional summary & registry extracts",
    iconBg: "bg-indigo-50 text-indigo-600 border border-indigo-200/70",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  },
  {
    value: "National",
    label: "National",
    description: "Ministry-wide sync & reconciliation",
    iconBg: "bg-purple-50 text-purple-600 border border-purple-200/70",
    icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
];

interface FormatOption {
  value: string;
  label: string;
  description: string;
  iconBg: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    value: "All",
    label: "All formats",
    description: "CSV, Excel and PDF export formats",
    iconBg: "bg-slate-100 text-slate-600",
  },
  {
    value: "csv",
    label: "CSV",
    description: "Comma-separated raw data table",
    iconBg: "bg-emerald-50 text-[#047857] border border-[#059669]/30",
  },
  {
    value: "xlsx",
    label: "Excel (XLSX)",
    description: "Microsoft Excel spreadsheet workbook",
    iconBg: "bg-emerald-50 text-[#107C41] border border-[#107C41]/30",
  },
  {
    value: "pdf",
    label: "PDF",
    description: "Adobe Acrobat print-ready summary",
    iconBg: "bg-red-50 text-[#DC2626] border border-[#DC2626]/30",
  },
];

function ScopeDropdown({
  value,
  onChange,
  reports,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  reports: Report[];
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const selectedOption = SCOPE_OPTIONS.find((o) => o.value === value) ?? SCOPE_OPTIONS[0];
  const selectedCount = value === "All" ? reports.length : reports.filter((r) => r.scope === value).length;

  return (
    <div className={cn("relative w-full sm:w-auto", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          "flex h-10 w-full sm:w-[175px] lg:w-[190px] items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 text-[13px] font-medium text-ink transition-all shadow-2xs",
          "hover:border-slate-300 hover:bg-slate-50/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/30 cursor-pointer",
          isOpen ? "border-brand-green ring-2 ring-brand-green/20" : ""
        )}
      >
        <div className="flex items-center gap-1.5 truncate min-w-0">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-ink-soft">
            <Icon d={selectedOption.icon} className="h-3.5 w-3.5" />
          </span>
          <span className="truncate font-semibold text-ink text-[12.5px] sm:text-[13px]">{selectedOption.label}</span>
          <span className="flex items-center justify-center min-w-[20px] h-5 rounded-full bg-brand-green px-1.5 text-[10.5px] sm:text-[11px] font-bold text-white shrink-0">
            {selectedCount}
          </span>
        </div>
        <svg
          className={cn("h-4 w-4 shrink-0 text-ink-soft transition-transform duration-200", isOpen && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute top-full right-0 mt-1.5 w-[280px] rounded-2xl border border-zinc-200/90 bg-white p-1.5 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.16)] z-50 overflow-hidden animate-in fade-in duration-150"
        >
          <div className="px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-muted">
            Filter by Scope
          </div>
          <div className="flex flex-col gap-0.5">
            {SCOPE_OPTIONS.map((opt) => {
              const isSelected = value === opt.value;
              const count = opt.value === "All" ? reports.length : reports.filter((r) => r.scope === opt.value).length;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer group",
                    isSelected
                      ? "bg-brand-wash text-brand-green font-semibold"
                      : "text-ink hover:bg-slate-50"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105",
                      opt.iconBg
                    )}
                  >
                    <Icon d={opt.icon} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold">{opt.label}</span>
                    </div>
                    <p className="text-[11px] text-ink-soft truncate font-normal leading-tight mt-0.5">
                      {opt.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-bold",
                        isSelected ? "bg-brand-green text-white" : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {count}
                    </span>
                    {isSelected && (
                      <svg className="h-4 w-4 text-brand-green shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function FormatDropdown({
  value,
  onChange,
  reports,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  reports: Report[];
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const selectedOption = FORMAT_OPTIONS.find((o) => o.value === value) ?? FORMAT_OPTIONS[0];
  const selectedCount =
    value === "All"
      ? reports.length
      : reports.filter((r) => r.formats.includes(value as ExportFormat)).length;

  return (
    <div className={cn("relative w-full sm:w-auto", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          "flex h-10 w-full sm:w-[175px] lg:w-[190px] items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 text-[13px] font-medium text-ink transition-all shadow-2xs",
          "hover:border-slate-300 hover:bg-slate-50/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/30 cursor-pointer",
          isOpen ? "border-brand-green ring-2 ring-brand-green/20" : ""
        )}
      >
        <div className="flex items-center gap-1.5 truncate min-w-0">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-ink-soft">
            <FormatBrandIcon format={selectedOption.value} className="h-3.5 w-3.5 shrink-0" />
          </span>
          <span className="truncate font-semibold text-ink text-[12.5px] sm:text-[13px]">{selectedOption.label}</span>
          <span className="flex items-center justify-center min-w-[20px] h-5 rounded-full bg-brand-green px-1.5 text-[10.5px] sm:text-[11px] font-bold text-white shrink-0">
            {selectedCount}
          </span>
        </div>
        <svg
          className={cn("h-4 w-4 shrink-0 text-ink-soft transition-transform duration-200", isOpen && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute top-full left-0 sm:left-auto sm:right-0 mt-1.5 w-[280px] rounded-2xl border border-zinc-200/90 bg-white p-1.5 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.16)] z-50 overflow-hidden animate-in fade-in duration-150"
        >
          <div className="px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-muted">
            Filter by Format
          </div>
          <div className="flex flex-col gap-0.5">
            {FORMAT_OPTIONS.map((opt) => {
              const isSelected = value === opt.value;
              const count =
                opt.value === "All"
                  ? reports.length
                  : reports.filter((r) => r.formats.includes(opt.value as ExportFormat)).length;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer group",
                    isSelected
                      ? "bg-brand-wash text-brand-green font-semibold"
                      : "text-ink hover:bg-slate-50"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105",
                      opt.iconBg
                    )}
                  >
                    <FormatBrandIcon format={opt.value} className="h-4 w-4 shrink-0" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold">{opt.label}</span>
                    </div>
                    <p className="text-[11px] text-ink-soft truncate font-normal leading-tight mt-0.5">
                      {opt.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-bold",
                        isSelected ? "bg-brand-green text-white" : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {count}
                    </span>
                    {isSelected && (
                      <svg className="h-4 w-4 text-brand-green shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function ReportsList() {
  const role = useAuthStore((s) => s.role);
  const [period, setPeriod] = useState<string>("This month");
  const [query, setQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState<string>("All");
  const [formatFilter, setFormatFilter] = useState<string>("All");
  const [notice, setNotice] = useState<string | null>(null);

  const scopeNote = role === "Executive" ? "Regional roll-ups; operational DA detail by drill-down only." : role === "Supervisor" ? "Scoped to your Woreda." : "For all regions.";

  // Part 2 reports are not exportable yet, so they stay off the list.
  const q = query.trim().toLowerCase();
  const allAvailableReports = REPORTS.filter((r) => r.part === 1);
  const reports = allAvailableReports.filter((r) => {
    if (scopeFilter !== "All" && r.scope !== scopeFilter) return false;
    if (formatFilter !== "All" && !r.formats.includes(formatFilter as ExportFormat)) return false;
    if (!q) return true;
    return r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col gap-4 min-w-0">
      {/* Top Header Card with Title, Badge, Description, and Actions (Date Range) */}
      <PageHeader
        title="Reports"
        titleAddon={
          <span className="inline-flex items-center rounded-full bg-brand-wash px-2.5 py-0.5 text-[11.5px] font-semibold text-brand-green border border-brand-green/20">
            Exports & Downloads
          </span>
        }
        description="Role-scoped data exports across registry, coverage, visit activity, and exceptions."
        showDescription
        actions={
          <DateRangeDropdown
            ranges={PERIODS}
            defaultValue={period}
            onChange={setPeriod}
            className="w-full sm:w-44 [&_button]:h-10 [&_button]:rounded-xl"
          />
        }
      />

      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}

      {/* Main Reports Catalogue Card */}
      <Card className="rounded-2xl border border-line bg-white p-0 shadow-card min-w-0 max-w-full">
        {/* Toolbar with Title, Scope Info, and Filters (Search, Format, Scope) */}
        <div className="flex flex-col gap-3.5 p-3.5 sm:p-5 lg:flex-row lg:items-center lg:justify-between border-b border-line-soft bg-white min-w-0 rounded-t-2xl">
          <div className="min-w-0 shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] sm:text-[18px] font-bold text-ink tracking-tight">Available Reports</h2>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                {reports.length}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[12px] sm:text-[12.5px] text-ink-soft">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate">Scope: <strong className="font-semibold text-ink">{scopeNote}</strong></span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center w-full lg:w-auto min-w-0">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search report name or description…"
              className="w-full sm:w-56 md:w-60 lg:w-64 [&_input]:w-full [&_input]:h-10 [&_input]:rounded-xl"
            />

            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
              <FormatDropdown
                value={formatFilter}
                onChange={setFormatFilter}
                reports={allAvailableReports}
                className="w-full sm:w-auto"
              />
              <ScopeDropdown
                value={scopeFilter}
                onChange={setScopeFilter}
                reports={allAvailableReports}
                className="w-full sm:w-auto"
              />
            </div>
          </div>
        </div>

        {/* Report Cards Grid - 3 cards per row on desktop (lg), 2 on tablet (sm), 1 on mobile */}
        {reports.length === 0 ? (
          <div className="px-4 py-12">
            <EmptyState
              title="No reports match your filters"
              hint="Try clearing your search query or switching scope and format."
              actionLabel={query || scopeFilter !== "All" || formatFilter !== "All" ? "Clear all filters" : undefined}
              onAction={
                query || scopeFilter !== "All" || formatFilter !== "All"
                  ? () => {
                    setQuery("");
                    setScopeFilter("All");
                    setFormatFilter("All");
                  }
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 lg:gap-4.5 p-3.5 sm:p-5 bg-surface/20 rounded-b-2xl">
            {reports.map((r) => (
              <div
                key={r.id}
                className={cn(
                  "group relative flex flex-col justify-between rounded-2xl border border-line p-4 sm:p-4.5 lg:p-5 shadow-card transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg min-w-0 h-full",
                  REPORT_THEMES[r.id]?.accentBorder || "border-t-[3px] border-t-emerald-500",
                  REPORT_THEMES[r.id]?.cardBg || "bg-white"
                )}
              >
                {/* Header: Icon + Name + Scope Pill */}
                <div className="flex items-start justify-between gap-2.5 min-w-0">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <span
                      className={cn(
                        "flex h-9.5 w-9.5 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-xs",
                        REPORT_THEMES[r.id]?.tile || "bg-brand-wash text-brand-green"
                      )}
                    >
                      <ReportCardIcon reportId={r.id} className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3
                        className="text-[14px] sm:text-[14.5px] font-bold text-ink leading-snug group-hover:text-brand-green transition-colors line-clamp-1"
                        title={r.name}
                      >
                        {r.name}
                      </h3>
                      <p
                        className="mt-1 text-[12px] sm:text-[12.5px] text-ink-soft leading-relaxed line-clamp-2 min-h-[36px]"
                        title={r.description}
                      >
                        {r.description}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10.5px] sm:text-[11px] font-semibold border",
                      SCOPE_STYLES[r.scope] || "bg-slate-50 text-slate-700 border-slate-200"
                    )}
                  >
                    {r.scope}
                  </span>
                </div>

                {/* Footer: Last Run + Download Format Action Buttons */}
                <div className="mt-3.5 pt-3 border-t border-line-soft flex items-center justify-between gap-1.5 min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] sm:text-[11.5px] text-muted min-w-0">
                    <svg className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="truncate">
                      <span className="hidden min-[420px]:inline xl:inline">Last run: </span>
                      <span className="font-medium text-ink-soft">{r.lastRun}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {FORMAT_ORDER.filter((f) => r.formats.includes(f)).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setNotice(`${r.name} (${formatLabel(f)}, ${period}) queued — you'll be notified when the export is ready.`)}
                        aria-label={`Download ${r.name} as ${f.toUpperCase()}`}
                        className={cn(
                          "h-7 sm:h-7.5 px-2.5 rounded-lg text-[11px] sm:text-[11.5px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer",
                          FORMAT_STYLES[f]
                        )}
                      >
                        <FormatBrandIcon format={f} className="h-3.5 w-3.5 shrink-0" />
                        <span>{f}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
