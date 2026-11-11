"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Pill } from "@/components/ui/Pill";
import { TablePagination, usePagination } from "@/components/ui/TablePagination";
import { cn } from "@/lib/utils";
import { TEMPLATE_SETTINGS, formatStamp, kindMeta, readinessOf, relativeTime, useTemplateCatalogStore, type SurveyTemplate, type TemplateParam } from "@/features/surveys";
import { SurveyToast, type ToastState } from "../../../components/SurveyToast";
import { AddParameterDrawer } from "./AddParameterDrawer";
import { MobilePreviewModal } from "./MobilePreviewModal";

const Icon = ({ d, className = "h-4 w-4", strokeWidth = 2 }: { d: string; className?: string; strokeWidth?: number }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const NO_CHANGES: string[] = [];
const NO_PARAMS: TemplateParam[] = [];
const ALERT = "M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z";
const Tag = ({ className, children }: { className: string; children: ReactNode }) => (
  <span className={cn("whitespace-nowrap rounded-full border px-2 py-px text-[10.5px] font-semibold uppercase tracking-wide", className)}>{children}</span>
);

function Metric({ title, value, hint, accent, tile, icon }: { title: string; value: ReactNode; hint: string; accent: string; tile: string; icon: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 rounded-xl border border-line border-l-4 bg-white px-3.5 py-3", accent)}>
      <div className="min-w-0">
        <p className="text-[13.5px] text-ink-soft">{title}</p>
        <p className="mt-1 text-[28px] font-bold leading-none text-ink">{value}</p>
        <p className="mt-1.5 truncate text-[11.5px] text-ink-soft">{hint}</p>
      </div>
      <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", tile)}><Icon d={icon} className="h-6 w-6" /></span>
    </div>
  );
}

const SideCard = ({ title, children, className }: { title: string; children: ReactNode; className?: string }) => (
  <Card className={cn("overflow-hidden p-0 shadow-card", className)}>
    <h2 className="border-b border-line px-4 py-3.5 text-[17px] font-semibold text-ink">{title}</h2>
    {children}
  </Card>
);

function ParamRow({ q, index, highlighted, dragging, onDragStart, onDrop, onDragEnd }: {
  q: TemplateParam; index: number; highlighted: boolean; dragging: boolean;
  onDragStart: () => void; onDrop: () => void; onDragEnd: () => void;
}) {
  const meta = kindMeta(q.kind);
  return (
    <li draggable onDragStart={onDragStart} onDragOver={(e) => e.preventDefault()} onDrop={onDrop} onDragEnd={onDragEnd}
      className={cn("flex items-center gap-3 border-b border-line-soft px-4 py-3 transition-colors last:border-b-0",
        highlighted ? "border border-brand-green bg-brand-wash" : "hover:bg-surface", dragging && "opacity-40")}>
      <span className="cursor-grab text-slate-300" title="Drag to reorder" aria-hidden="true"><Icon d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" strokeWidth={3} /></span>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-white text-[11.5px] text-ink-soft">{index + 1}</span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-ink">
          {q.title}
          {q.required && <Tag className="border-brand-border bg-brand-mint text-brand-green">Required</Tag>}
          {q.condition && <Tag className="border-amber-200 bg-amber-50 text-amber-700">Conditional</Tag>}
          {q.needsTranslation && <Tag className="border-danger-border bg-danger-wash text-danger">Needs translation</Tag>}
        </p>
        <p className="mt-0.5 truncate text-[12.5px] text-ink-soft">{q.detail}</p>
      </div>
      <Tag className={meta.tone}>{meta.badge}</Tag>
    </li>
  );
}

// P7.7+: builder for one template — readiness, ordered parameters, settings, languages and the publish checklist.
export function TemplateBuilder() {
  const { id } = useParams<{ id: string }>();
  const template = useTemplateCatalogStore((s) => s.templates.find((t) => t.id === id));
  const changes = useTemplateCatalogStore((s) => s.changes[id] ?? NO_CHANGES);
  const lastSavedChanges = useTemplateCatalogStore((s) => s.lastSavedChanges[id] ?? NO_CHANGES);
  const { update, addParam, moveParam, saveDraft } = useTemplateCatalogStore.getState();

  const [adding, setAdding] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [showChanges, setShowChanges] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [flashLanguages, setFlashLanguages] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const languagesRef = useRef<HTMLDivElement>(null);
  const approvalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refresh "Autosaved … ago" every 30 seconds.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => () => { if (approvalTimer.current) clearTimeout(approvalTimer.current); }, []);

  const dismissToast = () => setToast(null);
  // Hooks run before the not-found return, so page over an empty list when the template is missing.
  const { pageRows: pageParams, paginationProps } = usePagination(template?.params ?? NO_PARAMS);
  const offset = (paginationProps.page - 1) * paginationProps.pageSize;

  if (!template) {
    return (
      <Card className="shadow-card">
        <EmptyState title="Template not found" hint="It may have been created in another session. Templates are kept in memory until the survey API lands." />
        <div className="mt-4 flex justify-center"><Link href="/surveys?view=templates" className="text-[14px] font-semibold text-brand-green hover:underline">Back to templates</Link></div>
      </Card>
    );
  }

  const r = readinessOf(template);
  const isDraft = template.status === "Draft";
  const dirty = changes.length > 0;

  const save = (t: SurveyTemplate = template) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setToast({ tone: "error", message: "Couldn't save the draft. You are offline — changes stay on this device and sync when you reconnect.", action: { label: "Retry", onClick: () => save() } });
      return false;
    }
    saveDraft(t.id);
    const savedAt = useTemplateCatalogStore.getState().templates.find((x) => x.id === t.id)?.savedAt ?? t.savedAt;
    setToast({ tone: "success", message: `Draft saved · ${t.name} · ${formatStamp(savedAt)}`, action: { label: "View changes", onClick: () => setShowChanges(true) } });
    return true;
  };

  const publish = () => {
    if (!r.ready) return setBlocked(true);
    update(template.id, { status: "Active", beingCreated: false }, "Published template");
    saveDraft(template.id);
    setToast({ tone: "success", message: `${template.name} is published and available to deploy.` });
  };

  const markTranslated = (name: string) => {
    const languages = template.languages.map((l) => (l.name === name ? { ...l, translated: true } : l));
    // Once every language is done, the translator has covered the newer questions too.
    const params = languages.every((l) => l.translated) ? template.params.map((q) => ({ ...q, needsTranslation: false })) : template.params;
    update(template.id, { languages, params }, `Marked ${name} as translated`);
  };

  const translateQuestions = () => update(template.id, { params: template.params.map((q) => ({ ...q, needsTranslation: false })) }, "Marked new questions as translated");

  const requestApproval = () => {
    update(template.id, { approval: "requested" }, "Requested Woreda supervisor approval");
    setToast({ tone: "success", message: "Approval requested from your Woreda supervisor." });
    // Mock reviewer: approves a few seconds later until the approval API exists.
    approvalTimer.current = setTimeout(() => {
      useTemplateCatalogStore.getState().update(template.id, { approval: "approved" }, "Approved by Woreda supervisor");
      setToast({ tone: "success", message: `${template.name} was approved by your Woreda supervisor.` });
    }, 4000);
  };

  const goToLanguages = () => {
    setBlocked(false);
    languagesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashLanguages(true);
    setTimeout(() => setFlashLanguages(false), 1600);
  };

  const blockers: { key: string; title: string; detail: string; action?: ReactNode }[] = [];
  if (r.pendingLanguages.length > 0)
    blockers.push({ key: "lang", title: `${r.pendingLanguages.length} language${r.pendingLanguages.length === 1 ? "" : "s"} pending translation`, detail: `${r.pendingLanguages.join(", ").replace(/, ([^,]*)$/, ", and $1")} still need translation`, action: <Button variant="brandOutline" size="sm" className="rounded-full px-4" onClick={goToLanguages}>Go to Languages</Button> });
  else if (r.untranslatedParams > 0)
    blockers.push({ key: "params-lang", title: `${r.untranslatedParams} question${r.untranslatedParams === 1 ? "" : "s"} need translation`, detail: "Added after the languages were translated", action: <Button variant="brandOutline" size="sm" className="rounded-full px-4" onClick={translateQuestions}>Mark translated</Button> });
  if (template.approval !== "approved")
    blockers.push({ key: "approval", title: template.approval === "requested" ? "Approval requested" : "Awaiting supervisor approval", detail: template.approval === "requested" ? "Waiting for your Woreda supervisor to review" : "Not yet reviewed by your Woreda supervisor", action: <Button variant="brandOutline" size="sm" className="rounded-full px-4" disabled={template.approval === "requested"} onClick={requestApproval}>{template.approval === "requested" ? "Requested" : "Request approval"}</Button> });
  r.checklist.filter((c) => !c.done && !["languages", "approval"].includes(c.key)).forEach((c) => blockers.push({ key: c.key, title: c.label, detail: "Fix this in the parameter list before publishing" }));

  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="flex flex-col gap-4 px-5 py-4 shadow-card lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <Link href="/surveys?view=templates" className="mb-1 inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-soft hover:text-brand-green">
            <Icon d="M15 18l-6-6 6-6" className="h-3.5 w-3.5" /> Survey templates
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[24px] font-bold tracking-tight text-ink">{template.name}</h1>
            <Pill tone={isDraft ? "amber" : template.status === "Active" ? "green" : "slate"} className="px-2.5 py-0.5 text-[11.5px] uppercase">{template.status}</Pill>
            <Pill tone="slate" className="px-2.5 py-0.5 text-[11.5px] uppercase">{dirty ? "Unsaved changes" : `Autosaved ${relativeTime(template.savedAt, now).replace("minutes", "min").replace("minute", "min")}`}</Pill>
          </div>
          <p className="mt-1 text-[13.5px] text-ink-soft">{template.description}</p>
        </div>
        {isDraft && (
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="outline" className="h-10 px-4 font-semibold" onClick={() => save()}>Save draft</Button>
            <Button variant="outline" className="h-10 gap-2 px-4 font-semibold" onClick={() => setPreviewing(true)}>
              <Icon d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 100-6 3 3 0 000 6z" /> Preview on mobile
            </Button>
            <Button variant="brand" className="h-10 px-5" onClick={publish}>Publish template</Button>
          </div>
        )}
        {!isDraft && (
          <Button variant="outline" className="h-10 gap-2 px-4 font-semibold" onClick={() => setPreviewing(true)}>
            <Icon d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 100-6 3 3 0 000 6z" /> Preview on mobile
          </Button>
        )}
      </Card>

      <Card className="overflow-hidden p-0 shadow-card">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-[17px] font-semibold text-ink">Template readiness</h2>
          <span className="text-[12.5px] text-ink-soft">4 key metrics</span>
        </div>
        <div className="flex flex-col gap-4 px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric title="Parameters defined" value={`${r.defined}/${r.total}`} hint={r.defined === r.total ? "Every question is complete" : `${r.total - r.defined} need text or options`} accent="border-l-brand-green" tile="bg-brand-mint text-brand-green" icon="M22 11.1V12a10 10 0 11-5.9-9.1M22 4L12 14l-3-3" />
            <Metric title="Required" value={r.required} hint="Must be answered to continue" accent="border-l-violet-500" tile="bg-violet-50 text-violet-600" icon="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3z" />
            <Metric title="Translations" value={`${r.translated}/${template.languages.length}`} hint={r.pendingLanguages.length ? `${r.pendingLanguages.length} pending` : "All languages ready"} accent="border-l-amber-500" tile="bg-amber-50 text-amber-600" icon={ALERT} />
            <Metric title="Est. completion" value={`~${r.estMinutes} min`} hint="Per farmer, offline" accent="border-l-blue-600" tile="bg-blue-50 text-blue-600" icon="M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2" />
          </div>
          {r.pendingLanguages.length > 0 && (
            <p className="flex items-center gap-2 rounded-lg border border-amber-200 border-l-4 border-l-amber-400 bg-amber-50 px-4 py-2.5 text-[13.5px] font-semibold text-amber-800">
              <Icon d={ALERT} /> {r.pendingLanguages.length} language{r.pendingLanguages.length === 1 ? "" : "s"} pending translation before publish
            </p>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="self-start overflow-hidden p-0 shadow-card">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
            <div>
              <h2 className="text-[17px] font-semibold text-ink">Parameters <span className="font-normal text-ink-soft">({template.params.length})</span></h2>
              <p className="text-[12.5px] text-ink-soft">{isDraft ? "Drag to reorder · shown to the farmer in this sequence" : "Shown to the farmer in this sequence"}</p>
            </div>
            {isDraft && <Button variant="brand" className="h-10 gap-1.5 px-4" onClick={() => setAdding(true)}><Icon d="M12 5v14M5 12h14" strokeWidth={2.5} /> Add parameter</Button>}
          </div>
          <ul>
            {pageParams.map((q, n) => {
              // Positions are survey-wide, so reorder and numbering use the index across all pages.
              const i = offset + n;
              return (
                <ParamRow key={q.id} q={q} index={i} highlighted={q.id === highlightId} dragging={dragIndex === i}
                  onDragStart={() => isDraft && setDragIndex(i)}
                  onDrop={() => { if (dragIndex !== null && isDraft) moveParam(template.id, dragIndex, i); setDragIndex(null); }}
                  onDragEnd={() => setDragIndex(null)} />
              );
            })}
          </ul>
          <TablePagination {...paginationProps} itemLabel="parameters" />
        </Card>

        <div className="flex flex-col gap-4">
          <SideCard title="Template settings">
            <dl className="text-[13.5px]">
              {[{ label: "Survey type", value: template.type }, ...TEMPLATE_SETTINGS, { label: "Version", value: `v${template.version} · ${template.status.toLowerCase()}` }].map((s) => (
                <div key={s.label} className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-2.5 last:border-b-0">
                  <dt className="text-ink-soft">{s.label}</dt>
                  <dd className={cn("text-right font-semibold", "highlight" in s && s.highlight ? "text-brand-green" : "text-ink")}>{s.value}</dd>
                </div>
              ))}
            </dl>
          </SideCard>

          <div ref={languagesRef} className={cn("rounded-xl transition-shadow", flashLanguages && "ring-2 ring-amber-400 ring-offset-2")}>
            <SideCard title="Languages">
              <ul className="text-[13.5px]">
                {template.languages.map((l) => (
                  <li key={l.name} className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-2.5 last:border-b-0">
                    <span className="text-ink">{l.name}</span>
                    {l.translated ? (
                      <Tag className="border-brand-border bg-brand-mint text-brand-green">Translated</Tag>
                    ) : (
                      <span className="flex items-center gap-2">
                        {isDraft && <button type="button" onClick={() => markTranslated(l.name)} className="text-[12px] font-semibold text-brand-green hover:underline">Mark translated</button>}
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-px text-[11.5px] font-semibold text-amber-700">Pending</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </SideCard>
          </div>

          <SideCard title="Publish checklist">
            <ul className="text-[14px]">
              {r.checklist.map((c) => (
                <li key={c.key} className="flex items-center gap-3 border-b border-line-soft px-4 py-3 last:border-b-0">
                  {c.done ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-green text-white"><Icon d="M5 13l4 4L19 7" className="h-3 w-3" strokeWidth={3} /></span>
                  ) : (
                    <span className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300" />
                  )}
                  <span className={c.done ? "text-ink" : "text-ink-soft"}>{c.label}</span>
                  {c.key === "approval" && template.approval === "requested" && <span className="ml-auto text-[11.5px] font-semibold text-amber-700">Requested</span>}
                </li>
              ))}
            </ul>
          </SideCard>
        </div>
      </div>

      <AddParameterDrawer
        isOpen={adding}
        onClose={() => setAdding(false)}
        params={template.params}
        languageCount={template.languages.length}
        sourceLanguage={template.languages.find((l) => l.name === "English") ? "English" : template.languages[0]?.name ?? "English"}
        onAdd={(param, index) => {
          addParam(template.id, param, index);
          setAdding(false);
          setHighlightId(param.id);
          // Jump to the page that holds the new parameter so its highlight is visible.
          paginationProps.onPageChange(Math.floor(index / paginationProps.pageSize) + 1);
          setToast({ tone: "success", message: `“${param.title}” added as #${index + 1}.` });
        }}
      />

      {previewing && <MobilePreviewModal template={template} onClose={() => setPreviewing(false)} />}

      <Modal isOpen={blocked} onClose={() => setBlocked(false)} title="Not ready to publish yet" subtitle="Resolve these items first. Everything else in the publish checklist is complete." size="lg" bodyClassName="p-6"
        footer={
          <>
            <Button variant="outline" className="px-5 font-semibold" onClick={() => setBlocked(false)}>Keep editing</Button>
            <Button variant="brand" className="px-5" onClick={() => { if (save()) setBlocked(false); }}>Save as draft</Button>
          </>
        }
      >
        <ul className="overflow-hidden rounded-xl border border-line">
          {blockers.map((b) => (
            <li key={b.key} className="flex flex-col gap-3 border-b border-line-soft px-4 py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green" />
                <div>
                  <p className="text-[14.5px] font-semibold text-ink">{b.title}</p>
                  <p className="text-[13px] text-ink-soft">{b.detail}</p>
                </div>
              </div>
              {b.action}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12.5px] text-muted">You can keep working and publish once these are resolved — the template will stay saved as a draft.</p>
      </Modal>

      <Modal isOpen={showChanges} onClose={() => setShowChanges(false)} title="Changes in this save" subtitle={`${template.name} · ${formatStamp(template.savedAt)}`} size="md" bodyClassName="p-5"
        footer={<Button variant="outline" className="px-5 font-semibold" onClick={() => setShowChanges(false)}>Close</Button>}
      >
        {lastSavedChanges.length === 0 ? (
          <p className="text-[14px] text-ink-soft">No edits since the previous save.</p>
        ) : (
          <ol className="flex flex-col gap-2 text-[14px] text-ink">
            {lastSavedChanges.map((c, i) => (
              <li key={i} className="flex gap-3 rounded-lg bg-surface px-3 py-2"><span className="text-ink-soft">{i + 1}.</span>{c}</li>
            ))}
          </ol>
        )}
      </Modal>

      <SurveyToast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
