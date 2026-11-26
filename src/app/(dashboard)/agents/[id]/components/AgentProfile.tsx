"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { SegmentTabs } from "@/components/ui/SegmentTabs";
import { Modal } from "@/components/ui/Modal";
import { FileDropInput } from "@/components/ui/FileDropInput";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { FormField } from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { ACTIVE_TONE, APPROVAL_TONE, FAYDA_TONE, ONBOARDING_QUEUE, PUBLICATION_TONE, SYNC_EVENTS } from "@/features/agents";
import type { Agent } from "@/features/agents";
import { downloadCsv } from "@/lib/download";
import { BackLink } from "@/components/ui/BackLink";
import { cn } from "@/lib/utils";

type Tab = "overview" | "activity" | "documents" | "history";

interface ActivityItem {
  at: string;
  title: string;
  text: string;
  tag: string;
  tone: "emerald" | "blue" | "violet" | "amber";
}

const ACTIVITIES: ActivityItem[] = [
  {
    at: "14 Sep 2026, 09:12",
    title: "Crop Survey Visit Completed",
    text: "Completed crop survey visit — Abebe Bekele (Bako 01), ODK submission correlated.",
    tag: "Farm Visit",
    tone: "emerald",
  },
  {
    at: "13 Sep 2026, 15:40",
    title: "Weekly Visit Schedule Created",
    text: "Planned 4 visits for week of 15 Sep (2 crop, 1 livestock, 1 advisory).",
    tag: "Work Planning",
    tone: "blue",
  },
  {
    at: "12 Sep 2026, 11:02",
    title: "Farmer Advisory SMS Broadcast",
    text: "Sent knowledge snippet ‘Teff row-planting spacing’ to 62 linked farmers via SMS.",
    tag: "Advisory Broadcast",
    tone: "violet",
  },
  {
    at: "10 Sep 2026, 08:15",
    title: "Equipment Maintenance Ticket",
    text: "Raised internal issue ISS-2041 (equipment) — motorcycle repair delayed.",
    tag: "Support & Equipment",
    tone: "amber",
  },
];

interface AgentDocument {
  name: string;
  state: "Verified" | "Agrilearn-auto" | "Pending verification";
  date: string;
  course: string;
  issuer: string;
  issuedOn: string;
  verificationId: string;
}

const DOCUMENTS: AgentDocument[] = [
  { name: "Diploma — Crop Production (Ambo ATVET)", state: "Verified", date: "Verified 04 Apr 2019", course: "Diploma in Crop Production", issuer: "Ambo ATVET College", issuedOn: "15 Jul 2018", verificationId: "WOR-VER-2019-0412" },
  { name: "Agrilearn — Integrated Pest Management", state: "Agrilearn-auto", date: "Synced 22 Aug 2026", course: "Integrated Pest Management (IPM) — Level 2", issuer: "Agrilearn (MoA e-learning)", issuedOn: "20 Aug 2026", verificationId: "AGL-IPM-2026-88314" },
  { name: "First-aid certificate (Red Cross)", state: "Pending verification", date: "Uploaded 09 Sep 2026", course: "Basic First Aid", issuer: "Ethiopian Red Cross Society", issuedOn: "02 Sep 2026", verificationId: "Pending — assigned on verification" },
];

const DOC_TONE = { Verified: "green", "Agrilearn-auto": "blue", "Pending verification": "amber" } as const;

function FieldCard({
  label,
  value,
  icon,
  mono,
  badge,
  href,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  mono?: boolean;
  badge?: React.ReactNode;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line-soft bg-surface/50 p-3 sm:p-3.5 transition-all hover:bg-surface hover:border-line">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-brand-green shadow-2xs">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1.5">
          <p className="text-[11px] sm:text-[11.5px] font-semibold uppercase tracking-wider text-muted">{label}</p>
          {badge}
        </div>
        <div className={cn("mt-1 text-[13.5px] sm:text-[14px] font-semibold text-ink break-words", mono && "font-mono font-medium")}>
          {href ? (
            <a href={href} className="hover:text-brand-green hover:underline">
              {value}
            </a>
          ) : (
            value
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[12px] font-medium uppercase tracking-wider text-muted">{label}</dt>
      <dd className={mono ? "mt-1 font-mono text-[13.5px] text-ink" : "mt-1 text-[14px] text-ink"}>{value}</dd>
    </div>
  );
}

// Appendix C.2 "DA profile 360": tabs Overview / Activity / Documents / History; Request update.
export function AgentProfile({ agent }: { agent: Agent }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateFiles, setUpdateFiles] = useState<File[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [viewDoc, setViewDoc] = useState<AgentDocument | null>(null);
  const initials = agent.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("");
  const onboarding = ONBOARDING_QUEUE.find((o) => o.daId === agent.daId);
  const syncEvents = SYNC_EVENTS.filter((e) => e.entityRef.startsWith(agent.daId));

  const auditEvents = onboarding?.audit ?? [
    { actor: "MoA sync", role: "System", action: "Record received and published to OpenAgriNet Master", at: agent.joinedAt },
    { actor: "Fayda Gateway", role: "Identity Service", action: `National identity verification status: ${agent.faydaStatus}`, at: agent.joinedAt },
    { actor: "Woreda Supervisor", role: "Supervisor", action: `Deployment assigned to Kebele ${agent.kebele}, Woreda ${agent.woreda}`, at: agent.joinedAt },
  ];

  return (
    <div className="flex w-full flex-col gap-3.5 sm:gap-4 md:gap-5">
      <BackLink href="/agents" label="Back" />

      {/* Profile Header Card */}
      <Card className="p-4 sm:p-5 md:p-6 shadow-card rounded-2xl border border-line">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-green to-emerald-700 text-[18px] sm:text-[22px] font-bold text-white shadow-sm ring-4 ring-emerald-50">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[19px] sm:text-[22px] md:text-[24px] font-bold tracking-tight text-ink">
                  {agent.fullName}
                </h1>
                <Pill tone={ACTIVE_TONE[agent.activeStatus]} dot>
                  {agent.activeStatus}
                </Pill>
                <Pill tone={FAYDA_TONE[agent.faydaStatus]}>
                  Fayda {agent.faydaStatus}
                </Pill>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] sm:text-[13.5px] text-ink-soft">
                <span className="font-mono font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11.5px] sm:text-[12px]">
                  {agent.daId}
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-medium text-slate-700">{agent.specialisation}</span>
                <span className="text-slate-300">•</span>
                <span>{agent.kebele === "—" ? "Unassigned" : `${agent.kebele}, ${agent.woreda}`}</span>
                <span className="text-slate-300">•</span>
                <span>{agent.region}</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center w-full sm:w-auto pt-1 sm:pt-0 border-t border-line-soft sm:border-t-0">
            <button
              type="button"
              onClick={() => { setUpdateFiles([]); setUpdateOpen(true); }}
              className="w-full sm:w-auto inline-flex h-9 sm:h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-brand-green bg-white px-4 text-[13px] sm:text-[13.5px] font-semibold text-brand-green transition-colors hover:bg-brand-wash shadow-xs"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
              <span>Request update</span>
            </button>
          </div>
        </div>
      </Card>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <StatCard label="Linked farmers" value={agent.farmerCount.toLocaleString()} hint="From Farmer Registry" accent="border-l-brand-green" tile="bg-brand-tint text-brand-green" icon={<svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" /></svg>} />
        <StatCard label="Approval" value={agent.approvalStatus} accent="border-l-blue-600" tile="bg-blue-50 text-blue-600" icon={<svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>} />
        <StatCard label="MoA publication" value={agent.moaPublication} hint="Separate from approval" accent="border-l-amber-600" tile="bg-warning-wash text-amber-600" icon={<svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>} />
        <StatCard label="In service since" value={agent.joinedAt.split(" ").slice(-1)[0]} hint={agent.joinedAt} accent="border-l-violet-600" tile="bg-violet-50 text-violet-600" icon={<svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>} />
      </div>

      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}

      {/* Tabs Container Card */}
      <Card className="overflow-hidden p-0 shadow-card rounded-2xl border border-line bg-white">
        <SegmentTabs<Tab>
          className="rounded-none border-0 border-b border-line shadow-none bg-slate-50/50"
          tabs={[
            {
              key: "overview",
              label: "Overview",
              icon: (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              ),
            },
            {
              key: "activity",
              label: "Activity",
              icon: (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              ),
            },
            {
              key: "documents",
              label: "Documents",
              count: DOCUMENTS.length,
              icon: (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              ),
            },
            {
              key: "history",
              label: "History",
              icon: (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              ),
            },
          ]}
          active={tab}
          onChange={setTab}
        />

        {/* Informational banner when inspecting sample preview tabs */}
        {tab !== "overview" && (
          <div className="flex items-center gap-2.5 border-b border-blue-100 bg-gradient-to-r from-blue-50/80 via-blue-50/40 to-transparent px-4 sm:px-5 py-2.5 text-[12px] sm:text-[12.5px] text-blue-900">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
            </span>
            <p className="min-w-0 flex-1 leading-normal">
              <span className="font-semibold text-blue-950">Sample preview:</span> The DA Registry does not provide live {tab === "activity" ? "activity logs" : tab === "documents" ? "documents" : "audit history"} yet. The profile header, stats, and Overview tab are live from the registry.
            </p>
          </div>
        )}

        {/* Tab 1: Overview */}
        {tab === "overview" && (
          <div className="grid grid-cols-1 gap-5 p-4 sm:p-5 md:p-6 lg:grid-cols-12 lg:gap-6">
            <div className="flex flex-col gap-3.5 lg:col-span-7">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-brand-green">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="20" y1="8" x2="20" y2="14" />
                      <line x1="23" y1="11" x2="17" y2="11" />
                    </svg>
                  </span>
                  <h3 className="text-[14px] sm:text-[15px] font-bold text-ink">Personal & Registry Information</h3>
                </div>
                <span className="text-[11.5px] font-medium text-muted">ID: {agent.daId}</span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5">
                <FieldCard
                  label="DA-ID"
                  value={agent.daId}
                  mono
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="4" width="18" height="16" rx="3" />
                      <circle cx="9" cy="10" r="2" />
                      <line x1="15" y1="8" x2="17" y2="8" />
                      <line x1="15" y1="12" x2="17" y2="12" />
                      <line x1="7" y1="16" x2="17" y2="16" />
                    </svg>
                  }
                  badge={<span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Primary</span>}
                />
                <FieldCard
                  label="Fayda ID"
                  value={agent.faydaId}
                  mono
                  icon={
                    <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                  }
                  badge={<span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">National ID</span>}
                />
                <FieldCard
                  label="Phone"
                  value={agent.phone}
                  href={`tel:${agent.phone}`}
                  icon={
                    <svg className="h-4 w-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" />
                    </svg>
                  }
                />
                <FieldCard
                  label="Education tier"
                  value={agent.educationTier}
                  icon={
                    <svg className="h-4 w-4 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                      <path d="M6 12v5c3 3 9 3 12 0v-5" />
                    </svg>
                  }
                />
                <FieldCard
                  label="Specialisation"
                  value={agent.specialisation}
                  icon={
                    <svg className="h-4 w-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
                    </svg>
                  }
                />
                <FieldCard
                  label="Source"
                  value={agent.source}
                  icon={
                    <svg className="h-4 w-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <ellipse cx="12" cy="5" rx="9" ry="3" />
                      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                    </svg>
                  }
                />
              </div>
            </div>

            {/* Kebele Assignment Featured Card */}
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-line bg-gradient-to-b from-slate-50/70 to-white p-4 sm:p-5 shadow-2xs lg:col-span-5">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-brand-green border border-emerald-200/60 shadow-2xs">
                      <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-[14px] sm:text-[14.5px] font-bold text-ink">Kebele Assignment</h3>
                      <p className="text-[11.5px] text-muted">Field operations deployment</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-emerald-700 border border-emerald-200/70">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    {agent.kebele === "—" ? "Unassigned" : "Assigned"}
                  </span>
                </div>

                {agent.kebele === "—" ? (
                  <div className="mt-4 rounded-xl border border-dashed border-line bg-surface/40 p-4 text-center">
                    <p className="text-[13px] text-ink-soft">
                      Not assigned to any kebele.
                    </p>
                    <Link href="/assignments" className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-green hover:underline">
                      <span>Assign a kebele</span>
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </Link>
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-line-soft bg-white p-3.5 shadow-2xs">
                    <div className="p-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Kebele</span>
                      <p className="mt-1 text-[13.5px] font-bold text-ink">{agent.kebele}</p>
                    </div>
                    <div className="p-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Woreda</span>
                      <p className="mt-1 text-[13.5px] font-bold text-ink">{agent.woreda}</p>
                    </div>
                    <div className="border-t border-line-soft pt-2.5 p-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Geofence</span>
                      <div className="mt-1 flex items-center gap-1 text-[12.5px] font-medium text-emerald-700">
                        <svg className="h-3.5 w-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>In-boundary (validated)</span>
                      </div>
                    </div>
                    <div className="border-t border-line-soft pt-2.5 p-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Effective Since</span>
                      <p className="mt-1 text-[12.5px] font-semibold text-ink">{agent.joinedAt}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-line-soft pt-3.5 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[12px] font-medium text-muted">Registry Synchronization:</span>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={APPROVAL_TONE[agent.approvalStatus]} dot>Registry: {agent.approvalStatus}</Pill>
                  <Pill tone={PUBLICATION_TONE[agent.moaPublication]}>MoA: {agent.moaPublication}</Pill>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Activity */}
        {tab === "activity" && (
          <div className="p-4 sm:p-5 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-line-soft">
              <div>
                <h3 className="text-[14px] sm:text-[15px] font-bold text-ink">Recent Agent Activity</h3>
                <p className="text-[12px] text-muted">Field operations, farmer communications, and system logging</p>
              </div>
              <span className="text-[11.5px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md self-start sm:self-auto border border-slate-200/60">
                {ACTIVITIES.length} activities recorded
              </span>
            </div>

            <div className="relative mt-5 pl-7 sm:pl-9 space-y-4 sm:space-y-5 before:absolute before:left-[11px] sm:before:left-[15px] before:top-3 before:bottom-3 before:w-[2px] before:bg-slate-200">
              {ACTIVITIES.map((a) => {
                const toneMap: Record<string, { badge: string; node: string; icon: React.ReactNode }> = {
                  emerald: {
                    badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
                    node: "bg-emerald-50 text-emerald-600 border-emerald-400 ring-4 ring-emerald-50/50",
                    icon: (
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ),
                  },
                  blue: {
                    badge: "bg-blue-50 text-blue-700 border-blue-200/80",
                    node: "bg-blue-50 text-blue-600 border-blue-400 ring-4 ring-blue-50/50",
                    icon: (
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    ),
                  },
                  violet: {
                    badge: "bg-violet-50 text-violet-700 border-violet-200/80",
                    node: "bg-violet-50 text-violet-600 border-violet-400 ring-4 ring-violet-50/50",
                    icon: (
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    ),
                  },
                  amber: {
                    badge: "bg-amber-50 text-amber-700 border-amber-200/80",
                    node: "bg-amber-50 text-amber-600 border-amber-400 ring-4 ring-amber-50/50",
                    icon: (
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    ),
                  },
                };
                const theme = toneMap[a.tone] || toneMap.blue;

                return (
                  <div key={a.at} className="relative group">
                    <span className={cn("absolute -left-[27px] sm:-left-[35px] top-3.5 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full border-2 transition-transform group-hover:scale-110 shadow-2xs", theme.node)}>
                      {theme.icon}
                    </span>
                    <div className="rounded-xl border border-line-soft bg-white p-3.5 sm:p-4 hover:border-line hover:shadow-xs transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-[13.5px] sm:text-[14px] text-ink">{a.title}</span>
                          <span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-tight", theme.badge)}>
                            {a.tag}
                          </span>
                        </div>
                        <span className="text-[11.5px] sm:text-[12px] font-medium text-muted flex items-center gap-1.5 shrink-0">
                          <svg className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          {a.at}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[13px] sm:text-[13.5px] text-ink-soft leading-relaxed">{a.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Documents */}
        {tab === "documents" && (
          <div className="p-4 sm:p-5 md:p-6 flex flex-col gap-4 sm:gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line-soft">
              <div>
                <h3 className="text-[14px] sm:text-[15px] font-bold text-ink">Certifications & Accreditations</h3>
                <p className="text-[12px] text-muted">Verified academic diplomas, Agrilearn training modules, and safety credentials</p>
              </div>
              <span className="text-[12px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                {DOCUMENTS.length} Documents on record
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {DOCUMENTS.map((d) => {
                const isVerified = d.state === "Verified";
                const isAgrilearn = d.state === "Agrilearn-auto";

                return (
                  <div
                    key={d.name}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 rounded-xl border border-line-soft bg-white p-3.5 sm:p-4 hover:border-line hover:shadow-xs transition-all shadow-2xs"
                  >
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-2xs",
                          isVerified
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                            : isAgrilearn
                              ? "bg-blue-50 text-blue-700 border-blue-200/80"
                              : "bg-amber-50 text-amber-700 border-amber-200/80"
                        )}
                      >
                        {isVerified ? (
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                            <path d="M6 12v5c3 3 9 3 12 0v-5" />
                          </svg>
                        ) : isAgrilearn ? (
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-[13.5px] sm:text-[14.5px] font-bold text-ink break-words">{d.name}</h4>
                          <Pill tone={DOC_TONE[d.state]} dot>{d.state}</Pill>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-muted">
                          <span className="font-medium text-slate-700">{d.issuer}</span>
                          <span className="text-slate-300">•</span>
                          <span>{d.date}</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200/60">
                            ID: {d.verificationId}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => setViewDoc(d)}
                        className="inline-flex items-center gap-1.5 h-8.5 px-3 rounded-lg border border-line bg-white text-[12.5px] font-semibold text-slate-700 hover:bg-zinc-50 hover:text-ink transition-colors shadow-2xs"
                      >
                        <svg className="h-3.5 w-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          downloadCsv(
                            `${agent.daId}-${d.verificationId.startsWith("Pending") ? "document" : d.verificationId}.csv`,
                            [d],
                            [
                              { header: "DA-ID", value: () => agent.daId },
                              { header: "Holder", value: () => agent.fullName },
                              { header: "Course", value: (item) => item.course },
                              { header: "Issuer", value: (item) => item.issuer },
                              { header: "Issued on", value: (item) => item.issuedOn },
                              { header: "Verification ID", value: (item) => item.verificationId },
                              { header: "Status", value: (item) => `${item.state} (${item.date})` },
                            ]
                          );
                          setNotice(`Downloaded certificate details for “${d.name}”.`);
                        }}
                        className="inline-flex items-center gap-1.5 h-8.5 px-3 rounded-lg border border-emerald-200 bg-emerald-50 text-[12.5px] font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                        </svg>
                        <span className="hidden sm:inline">Download</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-line-soft bg-slate-50/70 p-3 sm:p-3.5 text-[12px] text-muted">
              <svg className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <p className="leading-relaxed">
                Agrilearn certificates sync automatically and are read-only. External uploads route to the Woreda officer for verification (FR-07b).
              </p>
            </div>
          </div>
        )}

        {/* Tab 4: History */}
        {tab === "history" && (
          <div className="p-4 sm:p-5 md:p-6 flex flex-col gap-5 sm:gap-6">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line-soft">
                <div>
                  <h3 className="text-[14px] sm:text-[15px] font-bold text-ink">Audit Trail & Lifecycle</h3>
                  <p className="text-[12px] text-muted">Immutable log of system registrations, verification checks, and supervisory actions</p>
                </div>
                <span className="text-[11.5px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md self-start sm:self-auto border border-slate-200/60">
                  Compliance Log
                </span>
              </div>

              <div className="relative mt-4 pl-7 sm:pl-9 space-y-4 before:absolute before:left-[11px] sm:before:left-[15px] before:top-3 before:bottom-3 before:w-[2px] before:bg-slate-200">
                {auditEvents.map((e, index) => (
                  <div key={`${e.at}-${e.actor}-${e.action}-${index}`} className="relative group">
                    <span className="absolute -left-[27px] sm:-left-[35px] top-3.5 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full border-2 bg-emerald-50 text-emerald-600 border-emerald-400 ring-4 ring-emerald-50/50 shadow-2xs">
                      <span className="h-2 w-2 rounded-full bg-emerald-600" />
                    </span>
                    <div className="rounded-xl border border-line-soft bg-white p-3.5 sm:p-4 hover:border-line hover:shadow-xs transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-[13.5px] sm:text-[14px] text-ink">{e.actor}</span>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200/60">
                            {e.role}
                          </span>
                        </div>
                        <span className="text-[11.5px] sm:text-[12px] font-medium text-muted flex items-center gap-1.5 shrink-0">
                          <svg className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          {e.at}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[13px] sm:text-[13.5px] text-ink-soft leading-relaxed">{e.action}</p>
                      {e.note && (
                        <div className="mt-2 rounded-lg bg-amber-50/70 border border-amber-200/60 p-2.5 text-[12.5px] italic text-amber-900">
                          “{e.note}”
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Registry Sync Events */}
            <div className="border-t border-line-soft pt-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line-soft">
                <div>
                  <h3 className="text-[14px] sm:text-[15px] font-bold text-ink">Registry Synchronization Events</h3>
                  <p className="text-[12px] text-muted">Inter-system sync events between OpenAgriNet and MoA Master Registry</p>
                </div>
                <span className="text-[11.5px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md self-start sm:self-auto border border-slate-200/60">
                  {syncEvents.length} Sync Events
                </span>
              </div>

              {syncEvents.length > 0 ? (
                <div className="mt-4 flex flex-col gap-2.5">
                  {syncEvents.map((s) => (
                    <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-line-soft bg-white p-3.5 hover:border-line transition-all">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[12px] font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
                          {s.id}
                        </span>
                        <span className="text-[11.5px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                          {s.direction}
                        </span>
                        <Pill tone={s.outcome === "Success" ? "green" : s.outcome === "Failed" ? "red" : "amber"}>
                          {s.outcome}
                        </Pill>
                        <span className="text-[13px] text-ink break-words">{s.detail}</span>
                      </div>
                      <span className="text-[11.5px] sm:text-[12px] text-muted shrink-0 flex items-center gap-1">
                        <svg className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {s.at}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-[13.5px] font-bold text-emerald-950">Master Registry Synchronized</h4>
                      <p className="text-[12px] text-emerald-700 mt-0.5">
                        This agent record is synchronized with the MoA Master Registry. No sync exceptions or pending retries.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Document View Modal */}
      {viewDoc && (
        <Modal
          isOpen
          onClose={() => setViewDoc(null)}
          title={viewDoc.state === "Agrilearn-auto" ? "Agrilearn Certificate" : "Document Details"}
          subtitle={`${agent.fullName} · ${agent.daId}`}
          titleAddon={<Pill tone={DOC_TONE[viewDoc.state]}>{viewDoc.state}</Pill>}
          footer={
            <>
              <Button variant="outline" onClick={() => setViewDoc(null)}>Close</Button>
              <Button
                variant="brand"
                onClick={() => {
                  downloadCsv(`${agent.daId}-${viewDoc.verificationId.startsWith("Pending") ? "document" : viewDoc.verificationId}.csv`, [viewDoc], [
                    { header: "DA-ID", value: () => agent.daId },
                    { header: "Holder", value: () => agent.fullName },
                    { header: "Course", value: (d) => d.course },
                    { header: "Issuer", value: (d) => d.issuer },
                    { header: "Issued on", value: (d) => d.issuedOn },
                    { header: "Verification ID", value: (d) => d.verificationId },
                    { header: "Status", value: (d) => `${d.state} (${d.date})` },
                  ]);
                  setNotice(`Downloaded certificate details for “${viewDoc.name}”.`);
                  setViewDoc(null);
                }}
              >
                Download
              </Button>
            </>
          }
        >
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Course" value={viewDoc.course} /></div>
            <Field label="Issuer" value={viewDoc.issuer} />
            <Field label="Issued on" value={viewDoc.issuedOn} />
            <Field label="Verification ID" value={viewDoc.verificationId} mono />
            <Field label="Status" value={viewDoc.date} />
          </dl>
          <p className="mt-4 text-[12.5px] text-muted">
            {viewDoc.state === "Agrilearn-auto"
              ? "Synced automatically from Agrilearn and read-only — corrections are made in Agrilearn."
              : viewDoc.state === "Verified"
                ? "Verified by the Woreda officer against the issuing institution."
                : "Awaiting Woreda officer verification (FR-07b)."}
          </p>
        </Modal>
      )}

      {/* Request Update Modal */}
      <Modal isOpen={updateOpen} onClose={() => setUpdateOpen(false)} title="Request an Update" subtitle={`${agent.fullName} · ${agent.daId}`}
        footer={<><Button variant="outline" onClick={() => setUpdateOpen(false)}>Cancel</Button><Button variant="brand" onClick={() => { setUpdateOpen(false); setNotice(`Update request${updateFiles.length ? ` with ${updateFiles.length} supporting document${updateFiles.length === 1 ? "" : "s"}` : ""} sent to the Woreda supervisor for review. Verified identity fields (name, Fayda ID) can only change via Fayda re-verification.`); }}>Submit request</Button></>}
      >
        <div className="flex flex-col gap-4">
          <FormField label="Field to update" htmlFor="update-field" required>
            <Select id="update-field" defaultValue="phone">
              <option value="phone">Phone</option>
              <option value="tier">Education tier</option>
              <option value="spec">Specialisation</option>
              <option value="kebele">Assigned kebele (routes to Assignment)</option>
            </Select>
          </FormField>
          <FormField label="New value" htmlFor="update-value" required>
            <input id="update-value" className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm focus:border-emerald-600 focus:outline-none" placeholder="Enter the updated value" />
          </FormField>
          <FormField label="Reason for update" htmlFor="update-reason" required hint="Recorded in the audit trail with your identity and timestamp.">
            <Textarea id="update-reason" rows={3} placeholder="Why this record needs updating" />
          </FormField>
          <FileDropInput label="Supporting documents" actionLabel="Upload documents" files={updateFiles} onChange={setUpdateFiles} />
        </div>
      </Modal>
    </div>
  );
}
