"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BackLink } from "@/components/ui/BackLink";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pill } from "@/components/ui/Pill";
import { ADVISOR_STATUS_TONE, advisorStatusNote, describeAdvisorError, fetchAdvisor, type Advisor } from "@/features/communication";

const PHONE_ICON = "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z";
const MAIL_ICON = "M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zM22 6l-10 7L2 6";
const INFO_ICON = "M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01";

function Icon({ d, className = "h-4 w-4" }: { d: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const initials = (name: string) => name.replace(/^Dr\.\s*/, "").split(" ").map((p) => p[0]).join("").slice(0, 2);

function Field({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line-soft bg-surface/50 p-3.5 transition-colors hover:bg-surface">
      {icon && (
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-brand-green shadow-2xs">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">{label}</p>
        <div className="mt-1 text-[14px] font-semibold text-ink break-words">{value}</div>
      </div>
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <Card className="flex flex-col h-full overflow-hidden p-0 shadow-card">
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-3.5 sm:py-4 bg-surface/40">
        {icon}
        <h2 className="text-[15.5px] font-semibold text-ink">{title}</h2>
      </div>
      <div className="flex-1 p-4 sm:p-5">{children}</div>
    </Card>
  );
}

// Read-only advisor page for the DA: who the expert is and how to reach them outside OpenAgriNet.
export function AdvisorDetails({ id }: { id: string }) {
  // Keyed by id, so opening another advisor shows Loading until its record arrives.
  const [loaded, setLoaded] = useState<{ id: string; advisor?: Advisor; error?: string } | null>(null);
  useEffect(() => {
    let current = true;
    fetchAdvisor(id)
      .then((advisor) => current && setLoaded({ id, advisor }))
      .catch((err: unknown) => current && setLoaded({ id, error: describeAdvisorError(err) }));
    return () => {
      current = false;
    };
  }, [id]);
  const result = loaded?.id === id ? loaded : null;
  const advisor = result?.advisor;

  if (!result) {
    return (
      <div className="flex w-full flex-col gap-4">
        <BackLink href="/advisors" />
        <Card className="shadow-card"><p className="py-10 text-center text-[14px] text-ink-soft">Loading advisor…</p></Card>
      </div>
    );
  }

  if (!advisor) {
    return (
      <div className="flex w-full flex-col gap-4">
        <BackLink href="/advisors" />
        <Card className="shadow-card">
          <EmptyState tone="error" title="Couldn't open this advisor" hint={result.error ?? "Advisor not found."} />
        </Card>
      </div>
    );
  }

  return <AdvisorView advisor={advisor} />;
}

function AdvisorView({ advisor }: { advisor: Advisor }) {
  const tel = `tel:${advisor.phone.replace(/\s/g, "")}`;

  return (
    <div className="flex w-full flex-col gap-4">
      <BackLink href="/advisors" label="Back" />

      <PageHeader
        title="Advisor Details"
        description="Expertise and contact details for specialist advisory support."
        showDescription
        actions={
          <Pill tone={ADVISOR_STATUS_TONE[advisor.status]} dot className="px-3 py-1 text-[13px] font-semibold">
            {advisor.status}
          </Pill>
        }
      />

      {/* Main Advisor Profile Card */}
      <Card className="overflow-hidden p-0 shadow-card">
        <div className="flex flex-col gap-4 border-b border-line bg-gradient-to-r from-surface/80 via-white to-white p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            <span className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-green text-[20px] sm:text-[22px] font-bold text-white shadow-xs">
              {initials(advisor.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <h2 className="text-[18px] sm:text-[20px] font-bold text-ink truncate">{advisor.name}</h2>
                <Pill tone={ADVISOR_STATUS_TONE[advisor.status]} dot className="px-2.5 py-0.5 text-[12px]">{advisor.status}</Pill>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] sm:text-[13.5px] text-ink-soft">
                <span className="font-semibold text-brand-green">{advisor.expertise}</span>
                <span className="text-muted">•</span>
                <span className="font-mono text-xs bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded text-slate-600 font-medium">{advisor.id}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 w-full sm:w-auto">
            <a
              href={tel}
              className="inline-flex h-9 sm:h-10 flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl bg-brand-green px-4 sm:px-5 text-[13px] sm:text-[14px] font-semibold text-white transition-colors hover:bg-brand-green-dark shadow-xs"
            >
              <Icon d={PHONE_ICON} className="h-4 w-4" />
              <span>Call</span>
            </a>
            <a
              href={`mailto:${advisor.email}`}
              className="inline-flex h-9 sm:h-10 flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 sm:px-5 text-[13px] sm:text-[14px] font-semibold text-ink transition-colors hover:border-brand-green hover:text-brand-green shadow-xs"
            >
              <Icon d={MAIL_ICON} className="h-4 w-4" />
              <span>Email</span>
            </a>
          </div>
        </div>

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4 p-4 sm:p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Expertise area"
            value={advisor.expertise}
            icon={
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            }
          />
          <Field
            label="MoA unit / directorate"
            value={advisor.unit}
            icon={
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h1M14 10h1M9 14h1M14 14h1M9 18h1M14 18h1" />
              </svg>
            }
          />
          <Field
            label="Directory status"
            value={
              <span className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-brand-green">{advisor.status}</span>
                <span className="text-muted font-normal text-xs">• {advisorStatusNote(advisor)}</span>
              </span>
            }
            icon={
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            }
          />
          <Field
            label="Region"
            value={advisor.region}
            icon={
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            }
          />
          <Field
            label="Woreda"
            value={advisor.woreda}
            icon={
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                <line x1="8" y1="2" x2="8" y2="18" />
                <line x1="16" y1="6" x2="16" y2="22" />
              </svg>
            }
          />
          <Field
            label="Directory last updated"
            value={`${advisor.updatedAt} EAT`}
            icon={
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
          />
        </div>
      </Card>

      {/* Bottom Side-by-Side Cards with Balanced Heights */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Contact Channels"
          icon={
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Icon d={PHONE_ICON} className="h-3.5 w-3.5" />
            </span>
          }
        >
          <div className="flex flex-col h-full justify-between gap-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-xl border border-line bg-surface/50 p-3 sm:p-3.5 transition-colors hover:bg-surface">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                    <Icon d={PHONE_ICON} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Phone</p>
                    <p className="font-semibold text-ink text-[14px] truncate">{advisor.phone}</p>
                  </div>
                </div>
                <a
                  href={tel}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-green px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-green-dark shrink-0 shadow-2xs"
                >
                  <Icon d={PHONE_ICON} className="h-3 w-3" />
                  <span>Call now</span>
                </a>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-line bg-surface/50 p-3 sm:p-3.5 transition-colors hover:bg-surface">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 border border-blue-200 text-blue-700">
                    <Icon d={MAIL_ICON} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Email</p>
                    <p className="font-semibold text-ink text-[14px] truncate">{advisor.email}</p>
                  </div>
                </div>
                <a
                  href={`mailto:${advisor.email}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand-green hover:text-brand-green shrink-0 shadow-2xs"
                >
                  <Icon d={MAIL_ICON} className="h-3 w-3" />
                  <span>Send email</span>
                </a>
              </div>
            </div>

            <p className="text-[12px] text-muted flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>Illustrative phone and email; confirm details before contacting.</span>
            </p>
          </div>
        </SectionCard>

        <SectionCard
          title="About This Directory"
          icon={
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Icon d={INFO_ICON} className="h-3.5 w-3.5" />
            </span>
          }
        >
          <div className="flex flex-col h-full justify-between gap-4">
            <p className="text-[13.5px] sm:text-[14px] leading-relaxed text-ink-soft">
              Development Agents can reference the expert&apos;s specialism and geographic coverage to request specialist advice. Records are maintained outside this DA view; this is neither the DA registry nor a MoA staff HR record.
            </p>
            <div className="flex gap-3 rounded-xl border border-brand-green/20 bg-brand-mint/60 p-3.5 sm:p-4">
              <Icon d={INFO_ICON} className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" />
              <div>
                <p className="text-[14px] font-semibold text-brand-green">External contact handoff</p>
                <p className="mt-1 text-[12.5px] sm:text-[13px] leading-relaxed text-ink-soft">
                  Calling opens your device&apos;s phone app; emailing opens your default mail client. No advisory request, ticket or response deadline is created inside OpenAgriNet.
                </p>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
