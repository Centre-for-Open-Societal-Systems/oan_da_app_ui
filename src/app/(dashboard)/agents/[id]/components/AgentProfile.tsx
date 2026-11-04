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

type Tab = "overview" | "activity" | "documents" | "history";

const ACTIVITY = [
  { at: "14 Sep 2026, 09:12", text: "Completed crop survey visit — Abebe Bekele (Bako 01), ODK submission correlated." },
  { at: "13 Sep 2026, 15:40", text: "Planned 4 visits for week of 15 Sep (2 crop, 1 livestock, 1 advisory)." },
  { at: "12 Sep 2026, 11:02", text: "Sent knowledge snippet ‘Teff row-planting spacing’ to 62 linked farmers via SMS." },
  { at: "10 Sep 2026, 08:15", text: "Raised internal issue ISS-2041 (equipment) — motorcycle repair delayed." },
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

  return (
    <div className="flex w-full flex-col gap-4">
      <BackLink href="/agents" label="Back to Agents" />

      {/* Header */}
      <Card className="shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-green text-[20px] font-bold text-white">{initials}</div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[20px] font-semibold tracking-tight text-ink sm:text-[22px]">{agent.fullName}</h1>
                <Pill tone={ACTIVE_TONE[agent.activeStatus]} dot>{agent.activeStatus}</Pill>
                <Pill tone={FAYDA_TONE[agent.faydaStatus]}>Fayda {agent.faydaStatus}</Pill>
              </div>
              <p className="mt-1 text-[13.5px] text-ink-soft">
                <span className="font-mono">{agent.daId}</span> · {agent.specialisation} · {agent.kebele === "—" ? "Unassigned" : `${agent.kebele}, ${agent.woreda}`} · {agent.region}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => { setUpdateFiles([]); setUpdateOpen(true); }} className="inline-flex h-9 items-center whitespace-nowrap rounded-md border border-brand-green bg-white px-3.5 text-[13.5px] font-semibold text-brand-green transition-colors hover:bg-brand-wash">Request update</button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Linked farmers" value={agent.farmerCount.toLocaleString()} hint="From Farmer Registry" accent="border-l-brand-green" tile="bg-brand-tint text-brand-green" icon={<svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" /></svg>} />
        <StatCard label="Approval" value={agent.approvalStatus} accent="border-l-blue-600" tile="bg-blue-50 text-blue-600" icon={<svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>} />
        <StatCard label="MoA publication" value={agent.moaPublication} hint="Separate from approval" accent="border-l-amber-600" tile="bg-warning-wash text-amber-600" icon={<svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>} />
        <StatCard label="In service since" value={agent.joinedAt.split(" ").slice(-1)[0]} hint={agent.joinedAt} accent="border-l-violet-600" tile="bg-violet-50 text-violet-600" icon={<svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>} />
      </div>

      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}

      <Card className="overflow-hidden p-0 shadow-card">
        <SegmentTabs<Tab> tabs={[{ key: "overview", label: "Overview" }, { key: "activity", label: "Activity" }, { key: "documents", label: "Documents", count: DOCUMENTS.length }, { key: "history", label: "History" }]} active={tab} onChange={setTab} />

        {/* The registry record feeds the header, stats and Overview; the other tabs have no registry API yet. */}
        {tab !== "overview" && (
          <p className="border-b border-line bg-blue-50 px-5 py-2.5 text-[12.5px] text-blue-900">
            Sample data: the DA Registry does not provide {tab === "activity" ? "activity" : tab === "documents" ? "documents" : "history"} yet. The header, stats and Overview tab are live from the registry.
          </p>
        )}

        {tab === "overview" && (
          <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-2">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="DA-ID" value={agent.daId} mono />
              <Field label="Fayda ID" value={agent.faydaId} mono />
              <Field label="Phone" value={agent.phone} />
              <Field label="Education tier" value={agent.educationTier} />
              <Field label="Specialisation" value={agent.specialisation} />
              <Field label="Source" value={agent.source} />
            </dl>
            <div className="rounded-lg border border-line bg-surface p-4">
              <h3 className="text-[13.5px] font-semibold text-ink">Kebele assignment</h3>
              {agent.kebele === "—" ? (
                <p className="mt-2 text-[13.5px] text-ink-soft">Not assigned. <Link href="/assignments" className="font-semibold text-brand-green hover:underline">Assign a kebele</Link> once onboarding is approved.</p>
              ) : (
                <dl className="mt-3 grid grid-cols-2 gap-3">
                  <Field label="Kebele" value={agent.kebele} />
                  <Field label="Woreda" value={agent.woreda} />
                  <Field label="Geofence" value="In-boundary (validated)" />
                  <Field label="Effective" value={agent.joinedAt} />
                </dl>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Pill tone={APPROVAL_TONE[agent.approvalStatus]}>Registry: {agent.approvalStatus}</Pill>
                <Pill tone={PUBLICATION_TONE[agent.moaPublication]}>MoA: {agent.moaPublication}</Pill>
              </div>
            </div>
          </div>
        )}

        {tab === "activity" && (
          <ul className="divide-y divide-line-soft">
            {ACTIVITY.map((a) => (
              <li key={a.at} className="flex gap-4 px-5 py-3.5">
                <span className="w-40 shrink-0 text-[12.5px] text-muted">{a.at}</span>
                <span className="text-[14px] text-ink">{a.text}</span>
              </li>
            ))}
          </ul>
        )}

        {tab === "documents" && (
          <ul className="divide-y divide-line-soft">
            {DOCUMENTS.map((d) => (
              <li key={d.name} className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[14px] font-medium text-ink">{d.name}</p>
                  <p className="text-[12.5px] text-muted">{d.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={DOC_TONE[d.state]}>{d.state}</Pill>
                  <button type="button" onClick={() => setViewDoc(d)} className="rounded-md border border-zinc-200 px-2.5 py-1 text-[12.5px] font-medium text-slate-700 hover:bg-zinc-50">View</button>
                </div>
              </li>
            ))}
            <li className="px-5 py-3 text-[12.5px] text-muted">Agrilearn certificates sync automatically and are read-only. External uploads route to the Woreda officer for verification (FR-07b).</li>
          </ul>
        )}

        {tab === "history" && (
          <div className="p-5">
            <h3 className="text-[13.5px] font-semibold text-ink">Audit trail</h3>
            <ol className="mt-3 space-y-3 border-l-2 border-line pl-4">
              {(onboarding?.audit ?? [{ actor: "MoA sync", role: "System", action: "Record received and published", at: agent.joinedAt }]).map((e) => (
                <li key={`${e.at}-${e.actor}-${e.action}`} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-green" />
                  <p className="text-[13.5px] text-ink"><span className="font-semibold">{e.actor}</span> <span className="text-muted">({e.role})</span> — {e.action}</p>
                  {e.note && <p className="text-[13px] italic text-ink-soft">“{e.note}”</p>}
                  <p className="text-[12px] text-subtle">{e.at}</p>
                </li>
              ))}
            </ol>
            {syncEvents.length > 0 && (
              <>
                <h3 className="mt-6 text-[13.5px] font-semibold text-ink">Registry sync events</h3>
                <ul className="mt-2 space-y-1.5 text-[13px] text-ink-soft">
                  {syncEvents.map((s) => <li key={s.id}><span className="font-mono text-[12px]">{s.id}</span> · {s.direction} · {s.outcome} — {s.detail} <span className="text-subtle">({s.at})</span></li>)}
                </ul>
              </>
            )}
          </div>
        )}
      </Card>

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
