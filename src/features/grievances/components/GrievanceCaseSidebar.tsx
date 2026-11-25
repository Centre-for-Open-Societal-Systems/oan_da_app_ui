"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dropdown } from "@/components/ui/Dropdown";
import { FormField } from "@/components/ui/FormField";
import { cn } from "@/lib/utils";
import { FarmerAvatar } from "@/features/farmers";
import { CASE_STATUSES, DEPARTMENTS, OFFICERS } from "../data";
import type { GrievanceCase } from "../types";

function Panel({ icon, title, action, children }: { icon: ReactNode; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          {icon}
          {title}
        </div>
        {action}
      </header>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

interface SlaTrackerProps {
  sla: GrievanceCase["sla"];
  /** Set once a deferral has been submitted and is awaiting L2 approval. */
  pendingDeferral: { days: number; approver: string } | null;
  onDefer: () => void;
}

function SlaTracker({ sla, pendingDeferral, onDefer }: SlaTrackerProps) {
  const overdue = sla.consumedPct >= 100;
  return (
    <Panel
      icon={
        <svg className="h-4 w-4 text-danger" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.96 8.96 0 0012 4a9 9 0 109 9c0-2.12-.74-4.07-1.97-5.61z" />
        </svg>
      }
      title="SLA Tracker"
      action={
        overdue && (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[12px] font-semibold text-danger">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1 5h2v6h-2V7zm0 8h2v2h-2v-2z" /></svg>
            Overdue
          </span>
        )
      }
    >
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-muted">SLA Consumed</span>
        <span className={cn("font-semibold", overdue ? "text-danger" : "text-ink")}>{sla.consumedPct}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-danger"
          style={{ width: `${Math.min(sla.consumedPct, 100)}%` }}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-center">
        <div className="rounded-lg bg-surface px-3 py-2.5">
          <p className="text-[12px] text-muted">Submitted</p>
          <p className="mt-0.5 text-[13.5px] font-semibold text-ink">{sla.submittedOn}</p>
        </div>
        <div className="rounded-lg bg-red-50 px-3 py-2.5">
          <p className="text-[12px] text-red-500">Due Date</p>
          <p className="mt-0.5 text-[13.5px] font-semibold text-danger">{sla.dueOn}</p>
        </div>
      </div>
      {pendingDeferral ? (
        <Banner tone="warning" className="mt-4">Deferral of <span className="font-semibold">+{pendingDeferral.days} days</span> pending approval from {pendingDeferral.approver}.</Banner>
      ) : (
        <Button type="button" variant="brand" onClick={onDefer} className="mt-4 w-full gap-2">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18M12 14v4M10 16h4" />
          </svg>
          Defer SLA
        </Button>
      )}
    </Panel>
  );
}

function CaseManagement({ onSaved }: { onSaved: (summary: string) => void }) {
  const [status, setStatus] = useState("");
  const [officer, setOfficer] = useState("");
  const [department, setDepartment] = useState("");
  const [escalated, setEscalated] = useState(false);
  const canSave = status || officer || department || escalated;

  const save = () => {
    if (!canSave) return;
    const parts = [status && `status → ${status}`, officer && `assigned to ${officer}`, department && department, escalated && "escalated"].filter(Boolean);
    onSaved(parts.join(" · "));
  };

  return (
    <Panel
      icon={<svg className="h-4 w-4 text-indigo-600" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0116 0z" /></svg>}
      title="Case Management"
    >
      <div className="flex flex-col gap-4">
        <FormField label="Status" htmlFor="caseStatus">
          <Dropdown id="caseStatus" value={status} onChange={setStatus} options={CASE_STATUSES} placeholder="Select Status" align="right" />
        </FormField>
        <FormField label="Assigned Officer" htmlFor="caseOfficer">
          <Dropdown id="caseOfficer" value={officer} onChange={setOfficer} options={OFFICERS} placeholder="Select Officer" align="right" />
        </FormField>
        <FormField label="Department" htmlFor="caseDepartment">
          <Dropdown id="caseDepartment" value={department} onChange={setDepartment} options={DEPARTMENTS} placeholder="Select Department" align="right" />
        </FormField>
        <label className="flex cursor-pointer items-center gap-3 text-[14px] text-ink">
          <Checkbox checked={escalated} onChange={(e) => setEscalated(e.target.checked)} />
          Escalated
        </label>
        {!canSave && <p className="text-[12.5px] text-muted">Set at least one field above to enable Save Assignment.</p>}
        <Button type="button" variant="brand" onClick={save} disabled={!canSave} className="w-full gap-2">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><path d="M17 21v-8H7v8M7 3v5h8" />
          </svg>
          Save Assignment
        </Button>
      </div>
    </Panel>
  );
}

const DetailIcon = ({ d }: { d: string }) => (
  <svg className="h-3.5 w-3.5 text-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

function SubmitterDetails({ data }: { data: GrievanceCase }) {
  const { grievance, submitter } = data;
  const rows: { icon: string; label: string; value: string }[] = [
    { icon: "M20.6 13.4L13.4 20.6a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8zM7 7h.01", label: "Category", value: grievance.category },
    { icon: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 8v4M12 16h.01", label: "Type", value: grievance.type },
    { icon: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0zM12 13a3 3 0 100-6 3 3 0 000 6z", label: "Location", value: `${grievance.region} / ${grievance.woreda}` },
    { icon: "M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6", label: "Kebele", value: submitter.kebele },
    { icon: "M4 4h16v16H4zM4 9h16", label: "Channel", value: submitter.channel },
    { icon: "M3 5h18v16H3zM8 3v4M16 3v4M3 10h18", label: "Submitted", value: submitter.submittedOn },
  ];

  return (
    <Panel
      icon={<svg className="h-4 w-4 text-indigo-600" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0116 0z" /></svg>}
      title="Submitter Details"
    >
      <div className="flex items-center gap-3">
        <span className="rounded-full p-0.5 ring-2 ring-line">
          <FarmerAvatar name={submitter.name} avatar={submitter.avatar} size="lg" className="h-14 w-14" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold text-ink">{submitter.name}</p>
          <p className="text-[13px] text-muted">{submitter.kind}</p>
          <span className="mt-1 inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[12px] font-semibold text-indigo-600">{submitter.faydaId}</span>
        </div>
      </div>
      <dl className="mt-4 flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="flex items-center gap-1.5 text-[11.5px] text-subtle">
              <DetailIcon d={row.icon} />
              {row.label}
            </dt>
            <dd className="mt-0.5 pl-5 text-[13.5px] text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

function ThreadSummary({ deptResponses, internalNotes, attachments }: { deptResponses: number; internalNotes: number; attachments: number }) {
  const rows = [
    { label: "Dept responses", value: deptResponses, tile: "bg-orange-50 text-orange-600", icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h18v-2H3v2zM5 10h2v7H5v-7zm4 0h2v7H9v-7zm4 0h2v7h-2v-7zm4 0h2v7h-2v-7zM12 2L2 7v2h20V7L12 2z" /></svg> },
    { label: "Internal notes", value: internalNotes, tile: "bg-info-tint text-blue-600", icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17.9 17.9A10 10 0 016.1 6.1M9.9 4.2A10 10 0 0121.8 12a10 10 0 01-1.5 2.5M3 3l18 18" /><path d="M9.9 9.9a3 3 0 004.2 4.2" /></svg> },
    { label: "Attachments", value: attachments, tile: "bg-indigo-50 text-indigo-600", icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21.4 11.05l-9.2 9.2a6 6 0 01-8.5-8.5l9.2-9.2a4 4 0 015.7 5.7l-9.2 9.2a2 2 0 01-2.8-2.8l8.5-8.5" /></svg> },
  ];
  return (
    <Panel
      icon={<svg className="h-4 w-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.5 1.5M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.5-1.5" /></svg>}
      title="Thread Summary"
    >
      <ul className="-mx-4 -my-4 divide-y divide-line-soft">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-3 px-4 py-3">
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", row.tile)}>{row.icon}</span>
            <span className="flex-1 text-[13.5px] text-slate-700">{row.label}</span>
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-2 text-[12.5px] font-semibold text-slate-700">{row.value}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

interface GrievanceCaseSidebarProps {
  data: GrievanceCase;
  deptResponses: number;
  internalNotes: number;
  attachments: number;
  onAssignmentSaved: (summary: string) => void;
  pendingDeferral: { days: number; approver: string } | null;
  onDeferSla: () => void;
}

export function GrievanceCaseSidebar({
  data,
  deptResponses,
  internalNotes,
  attachments,
  onAssignmentSaved,
  pendingDeferral,
  onDeferSla,
}: GrievanceCaseSidebarProps) {
  return (
    <aside className="flex flex-col gap-4">
      <SlaTracker sla={data.sla} pendingDeferral={pendingDeferral} onDefer={onDeferSla} />
      <CaseManagement onSaved={onAssignmentSaved} />
      <SubmitterDetails data={data} />
      <ThreadSummary deptResponses={deptResponses} internalNotes={internalNotes} attachments={attachments} />
    </aside>
  );
}
