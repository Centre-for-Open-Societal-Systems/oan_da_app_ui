"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BackLink } from "@/components/ui/BackLink";
import { Card } from "@/components/ui/Card";
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

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-[13.5px] text-muted">{label}</p>
      <p className="mt-1 text-[14.5px] font-semibold text-ink">{value}</p>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-0 shadow-card">
      <h2 className="border-b border-line px-5 py-4 text-[15.5px] font-semibold text-ink">{title}</h2>
      <div className="px-5 py-5">{children}</div>
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
      <BackLink href="/advisors" />

      <Card className="px-5 py-4">
        <h1 className="text-[20px] font-bold tracking-tight text-ink sm:text-2xl">Advisor Details</h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">Expertise and contact details for specialist advisory support.</p>
      </Card>

      <Card className="p-0 shadow-card">
        <div className="flex items-center gap-4 border-b border-line px-5 py-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-green text-[22px] font-semibold text-white">{initials(advisor.name)}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-[19px] font-bold text-ink">{advisor.name}</h2>
              <Pill tone={ADVISOR_STATUS_TONE[advisor.status]} className="px-2.5 py-0.5 text-[12.5px]">{advisor.status}</Pill>
            </div>
            <p className="mt-1 text-[14px] text-ink-soft">{advisor.expertise} • {advisor.id}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 px-6 py-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Expertise area" value={advisor.expertise} />
          <Field label="MoA unit / directorate" value={advisor.unit} />
          <Field label="Directory status" value={`${advisor.status} • ${advisorStatusNote(advisor)}`} />
          <Field label="Region" value={advisor.region} />
          <Field label="Woreda" value={advisor.woreda} />
          <Field label="Directory last updated" value={`${advisor.updatedAt} EAT`} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Contact Channels">
          <div className="flex flex-col gap-4">
            <Field label="Phone" value={advisor.phone} />
            <Field label="Email" value={advisor.email} />
            <div className="flex flex-wrap gap-3">
              <a href={tel} className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-green px-5 text-[14px] font-semibold text-white transition-colors hover:bg-brand-green-dark">
                <Icon d={PHONE_ICON} />
                Call advisor
              </a>
              <a href={`mailto:${advisor.email}`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-5 text-[14px] font-semibold text-brand-green transition-colors hover:bg-brand-mint">
                <Icon d={MAIL_ICON} />
                Email advisor
              </a>
            </div>
            <p className="text-[12.5px] text-muted">Illustrative phone and email; confirm details before contacting.</p>
          </div>
        </SectionCard>

        <SectionCard title="About This Directory">
          <p className="text-[14px] leading-relaxed text-ink-soft">
            DAs can reference the expert&apos;s specialism and geographic coverage. Records are maintained outside this DA view; this is neither the DA registry nor a MoA staff HR record.
          </p>
          <div className="mt-5 flex gap-3 rounded-lg bg-brand-mint px-4 py-4">
            <Icon d={INFO_ICON} className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" />
            <div>
              <p className="text-[14.5px] font-semibold text-brand-green">External contact handoff</p>
              <p className="mt-1 text-[13.5px] text-ink-soft">Call opens your device&apos;s phone app; email opens your mail app. No advisory request, ticket or response deadline is created in OpenAgriNet.</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
