"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@/components/ui/Banner";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pill } from "@/components/ui/Pill";
import { SearchInput } from "@/components/ui/SearchInput";
import { matchesQuery } from "@/lib/search";
import { cn } from "@/lib/utils";
import { relativeTime, useTemplateCatalogStore, type SurveyTemplate, type TemplateStatus } from "@/features/surveys";

const STATUS_TONE: Record<TemplateStatus, "green" | "amber" | "slate"> = { Active: "green", Draft: "amber", Archived: "slate" };

const Icon = ({ d, className = "h-6 w-6" }: { d: string; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

function StatCard({ title, value, hint, accent, tile, icon }: { title: string; value: number; hint: string; accent: string; tile: string; icon: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 rounded-xl border border-line border-l-4 bg-white px-4 py-3.5 shadow-card", accent)}>
      <div className="min-w-0">
        <p className="text-[14px] text-ink-soft">{title}</p>
        <p className="mt-1 text-[28px] font-bold leading-none text-ink">{value}</p>
        <p className="mt-2 truncate text-[12px] text-ink-soft">{hint}</p>
      </div>
      <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", tile)}><Icon d={icon} /></span>
    </div>
  );
}

const languagesLabel = (t: SurveyTemplate) => {
  const done = t.languages.filter((l) => l.translated).length;
  return done === t.languages.length ? `${t.languages.length} language${t.languages.length === 1 ? "" : "s"}` : `${done} of ${t.languages.length} translated`;
};

const ActionLink = ({ children, onClick, tone }: { children: ReactNode; onClick: () => void; tone: "green" | "ink" }) => (
  <button type="button" onClick={onClick} className={cn("text-[13.5px] font-semibold hover:underline", tone === "green" ? "text-brand-green" : "text-ink")}>{children}</button>
);

// P7.6: template catalog with version / deployment status. Drafts continue in the builder; Active ones open a new version.
export function TemplatesView() {
  const router = useRouter();
  const templates = useTemplateCatalogStore((s) => s.templates);
  const duplicate = useTemplateCatalogStore((s) => s.duplicate);
  const editableVersionOf = useTemplateCatalogStore((s) => s.editableVersionOf);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  // Captured once so "x minutes ago" stays stable while the list is open.
  const [now] = useState(() => Date.now());

  const count = (s: TemplateStatus) => templates.filter((t) => t.status === s);
  const drafts = count("Draft");
  const types = new Set(templates.map((t) => t.type)).size;
  const rows = templates.filter((t) => matchesQuery(query, t.name, t.description, t.type, t.status));

  const edit = (t: SurveyTemplate) => router.push(`/surveys/templates/${editableVersionOf(t.id)}`);

  const columns: Column<SurveyTemplate>[] = [
    { key: "sno", header: "S. No.", cell: (t) => rows.indexOf(t) + 1 },
    {
      key: "name", header: "Template", className: "min-w-[280px]", cell: (t) => (
        <span className="block">
          <span className="flex flex-wrap items-center gap-2 font-semibold text-ink">
            {t.name}
            {t.beingCreated && t.status === "Draft" && <Pill tone="amber" className="px-2 py-0 text-[11px] uppercase">Being created</Pill>}
          </span>
          <span className="mt-0.5 block text-[12.5px] text-ink-soft">{t.description}</span>
        </span>
      ),
    },
    { key: "type", header: "Type", cell: (t) => <span className="whitespace-nowrap">{t.type}</span> },
    { key: "params", header: "Parameters", cell: (t) => <span className="font-medium text-ink">{t.params.length}</span> },
    { key: "langs", header: "Languages", cell: (t) => <span className="whitespace-nowrap">{languagesLabel(t)}</span> },
    { key: "status", header: "Status", cell: (t) => <Pill tone={STATUS_TONE[t.status]} className="px-2.5 py-0.5 text-[12.5px]">{t.status}</Pill> },
    { key: "edited", header: "Last edited", cell: (t) => <span className="whitespace-nowrap">{relativeTime(t.savedAt, now)}</span> },
    {
      key: "actions", header: <span className="sr-only">Actions</span>, align: "right", cell: (t) =>
        t.status === "Draft" ? (
          <button type="button" onClick={() => edit(t)} className="whitespace-nowrap rounded-md bg-brand-green px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-green-dark">Continue editing</button>
        ) : (
          <span className="flex justify-end gap-4">
            <ActionLink tone="green" onClick={() => edit(t)}>Edit</ActionLink>
            <ActionLink tone="ink" onClick={() => { duplicate(t.id); setNotice(`“${t.name} (copy)” was added as a draft.`); }}>Duplicate</ActionLink>
          </span>
        ),
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total templates" value={templates.length} hint={`Across ${types} survey types`} accent="border-l-violet-500" tile="bg-violet-50 text-violet-600" icon="M9 13h6M9 17h6M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5zM14 3v5h5" />
        <StatCard title="Active" value={count("Active").length} hint="Available to deploy" accent="border-l-brand-green" tile="bg-brand-mint text-brand-green" icon="M22 11.1V12a10 10 0 11-5.9-9.1M22 4L12 14l-3-3" />
        <StatCard title="In draft" value={drafts.length} hint={drafts.map((d) => d.name).join(", ") || "Nothing in progress"} accent="border-l-blue-500" tile="bg-blue-50 text-blue-600" icon="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        <StatCard title="Archived" value={count("Archived").length} hint="Retained for audit" accent="border-l-orange-500" tile="bg-orange-50 text-orange-600" icon="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
      </div>

      <p className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-[13px] text-blue-700">
        <Icon d="M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01" className="h-4 w-4 shrink-0" />
        Templates are versioned. Editing an Active template creates a new version — deployments in the field continue on the version they were published with.
      </p>

      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}

      <Card className="overflow-hidden p-0 shadow-card">
        <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[17px] font-semibold text-ink">Survey Templates</h2>
            <p className="text-[12.5px] text-ink-soft">Template catalog · Version history · Deployment status</p>
          </div>
          <SearchInput value={query} onChange={setQuery} placeholder="Search template name or type…" />
        </div>
        <DataTable itemLabel="templates" columns={columns} rows={rows} rowKey={(t) => t.id} minWidth="1080px"
          rowClassName={(t) => (t.beingCreated && t.status === "Draft" ? "bg-amber-50/70 hover:bg-amber-50" : undefined)}
          emptyTitle="No templates match your search" emptyHint="Try a different name or survey type." />
      </Card>
    </>
  );
}
