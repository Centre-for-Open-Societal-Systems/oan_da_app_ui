"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Pill } from "@/components/ui/Pill";
import { cn, todayIso } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import {
  SURVEY_STATUS_TONE,
  TRANSLATION_LANGUAGES,
  canWriteSurveys,
  closeSurveyTemplate,
  describeSurveyError,
  downloadSurveyResponses,
  getSurveyTemplate,
  reopenSurveyTemplate,
  type SurveyTask,
} from "@/features/surveys";
import { AnswersTile, writtenQuestions } from "../../../components/AnswersTile";
import { CreateTemplateModal } from "../../../components/CreateTemplateModal";

const Icon = ({ d, className = "h-4 w-4" }: { d: string; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

const TYPE_LABEL: Record<string, string> = { consent: "Consent", auto: "Auto-filled", rating: "Rating 1–5", single: "Single choice", multi: "Multi-select", text: "Free text", lookup: "Lookup" };

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-2.5 last:border-b-0">
    <dt className="text-ink-soft">{label}</dt>
    <dd className="text-right font-semibold text-ink">{children}</dd>
  </div>
);

// One published template (GET /surveys/templates/{id}): questions + translations, settings, and PATCH actions.
export function TemplateDetail({ id }: { id: string }) {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const canWrite = canWriteSurveys(role);
  const [template, setTemplate] = useState<SurveyTask | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplate = useCallback(() => {
    getSurveyTemplate(id).then(setTemplate).catch((err: unknown) => setLoadError(describeSurveyError(err)));
  }, [id]);
  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);
  const load = () => {
    setLoadError(null);
    fetchTemplate();
  };

  const back = (
    <Link href="/surveys?view=templates" className="mb-1 inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-soft hover:text-brand-green">
      <Icon d="M15 18l-6-6 6-6" className="h-3.5 w-3.5" /> Survey templates
    </Link>
  );

  if (loadError) return <Card className="shadow-card">{back}<EmptyState tone="error" title="Couldn't open this template" hint={loadError} actionLabel="Retry" onAction={load} /></Card>;
  if (!template) return <Card className="shadow-card">{back}<p className="py-10 text-center text-[14px] text-ink-soft">Loading template…</p></Card>;

  const closed = template.status === "Closed";
  // An expired window reads as Closed too; reopening it needs a later close date (Edit).
  const expired = template.window_close < todayIso();

  const run = async (action: () => Promise<string>, message: string) => {
    setBusy(true);
    setError(null);
    try {
      setTemplate(await getSurveyTemplate(await action()));
      setNotice(message);
    } catch (err) {
      setError(describeSurveyError(err));
    } finally {
      setBusy(false);
      setConfirmClose(false);
    }
  };

  const exportXlsx = async () => {
    setError(null);
    try {
      await downloadSurveyResponses(template.id);
    } catch (err) {
      setError(describeSurveyError(err));
    }
  };

  const questions = writtenQuestions(template.parameters);

  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="flex flex-col gap-4 px-5 py-4 shadow-card lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          {back}
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[24px] font-bold tracking-tight text-ink">{template.name}</h1>
            <Pill tone={SURVEY_STATUS_TONE[template.status]} dot>{template.status}</Pill>
            <Pill tone="blue">Template {template.templateVersion}</Pill>
          </div>
          <p className="mt-1 text-[13.5px] text-ink-soft">{template.type} · {template.window.open} → {template.window.close} · ~{template.estMinutes} min per farmer</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="outline" className="h-10 gap-2 px-4 font-semibold" onClick={() => router.push(`/surveys?view=results&survey=${encodeURIComponent(template.id)}`)}>
            <Icon d="M6 20V12M12 20V6M18 20v-5" /> Results
          </Button>
          <Button variant="outline" className="h-10 gap-2 px-4 font-semibold" onClick={exportXlsx}>
            <Icon d="M12 3v12M7 10l5 5 5-5M5 21h14" /> Export Excel
          </Button>
          {canWrite && (
            <>
              {closed ? (
                !expired && <Button variant="outline" className="h-10 px-4 font-semibold" disabled={busy} onClick={() => run(() => reopenSurveyTemplate(template.id), "The survey is open again.")}>Reopen</Button>
              ) : (
                <Button variant="outline" className="h-10 px-4 font-semibold text-danger" disabled={busy} onClick={() => setConfirmClose(true)}>Close survey</Button>
              )}
              <Button variant="brand" className="h-10 px-5" onClick={() => setEditing(true)}>Edit</Button>
            </>
          )}
        </div>
      </Card>

      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}
      {error && <Banner tone="error" onDismiss={() => setError(null)}>{error}</Banner>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="self-start overflow-hidden p-0 shadow-card">
          <div className="border-b border-line px-4 py-3.5">
            <h2 className="text-[17px] font-semibold text-ink">Questions <span className="font-normal text-ink-soft">({questions.length})</span></h2>
            <p className="text-[12.5px] text-ink-soft">Asked in this order, after the farmer&apos;s consent · Farmer ID and Kebele are filled in automatically</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-line bg-surface text-[12px] font-semibold uppercase tracking-wide text-ink-soft">
                  <th scope="col" className="w-12 px-4 py-2.5">No.</th>
                  <th scope="col" className="px-3 py-2.5">Question</th>
                  <th scope="col" className="px-3 py-2.5">Answer type</th>
                  <th scope="col" className="px-4 py-2.5">Required</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((p, i) => (
                  <tr key={p.id} className="border-b border-line-soft align-top last:border-b-0">
                    <td className="px-4 py-3 text-ink-soft">{i + 1}</td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-ink">{p.prompt}</p>
                      {p.options && p.options.length > 0 && <p className="mt-0.5 text-[12.5px] text-ink-soft">Options: {p.options.join(", ")}</p>}
                      {p.helper && <p className="mt-0.5 text-[12.5px] text-muted">{p.helper}</p>}
                      {TRANSLATION_LANGUAGES.filter((l) => p.translations?.[l]).map((l) => (
                        <p key={l} className="mt-0.5 text-[12.5px] text-ink-soft"><span className="font-medium text-ink">{l}:</span> {p.translations![l]}</p>
                      ))}
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn("whitespace-nowrap rounded-full border px-2 py-px text-[10.5px] font-semibold uppercase tracking-wide", p.type === "auto" || p.type === "consent" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-600")}>
                        {TYPE_LABEL[p.type] ?? p.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink">{p.required ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden p-0 shadow-card">
            <h2 className="border-b border-line px-4 py-3.5 text-[17px] font-semibold text-ink">Template settings</h2>
            <dl className="text-[13.5px]">
              <Row label="Survey type">{template.type}</Row>
              <Row label="Woreda">{template.woreda ?? "—"}</Row>
              <Row label="Assigned to">{template.assignmentMode === "Selected" ? `${template.assignedUsers?.length ?? 0} selected DAs` : "Every DA in the Woreda"}</Row>
              <Row label="Languages">{template.languages.join(", ")}</Row>
              <Row label="Collected">{template.collected}{template.queued ? ` · ${template.queued} queued` : ""}</Row>
              <Row label="Version">{template.templateVersion}</Row>
            </dl>
          </Card>
          {template.assignmentMode === "Selected" && (template.assignedUsers?.length ?? 0) > 0 && (
            <Card className="overflow-hidden p-0 shadow-card">
              <h2 className="border-b border-line px-4 py-3.5 text-[17px] font-semibold text-ink">Assigned DAs</h2>
              <ul className="text-[13.5px]">
                {template.assignedUsers!.map((d) => <li key={d} className="border-b border-line-soft px-4 py-2.5 font-mono text-ink last:border-b-0">{d}</li>)}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <AnswersTile key={template.id} surveyId={template.id} questions={questions} />

      {editing && (
        <CreateTemplateModal
          template={template}
          onClose={() => setEditing(false)}
          onSaved={(saved, mode) => {
            setEditing(false);
            if (mode === "versioned") {
              router.push(`/surveys/templates/${encodeURIComponent(saved.id)}`);
              return;
            }
            setTemplate(saved);
            setNotice("Template updated.");
          }}
        />
      )}

      <Modal isOpen={confirmClose} onClose={() => setConfirmClose(false)} title="Close this survey?" subtitle={template.name} size="md" bodyClassName="p-5"
        footer={
          <>
            <Button variant="outline" className="px-5 font-semibold" onClick={() => setConfirmClose(false)} disabled={busy}>Cancel</Button>
            <Button variant="brand" className="px-5" disabled={busy} onClick={() => run(() => closeSurveyTemplate(template.id), "The survey is closed. DAs can no longer submit responses.")}>{busy ? "Closing…" : "Close survey"}</Button>
          </>
        }
      >
        <p className="text-[14px] text-ink-soft">DAs can no longer submit responses. Collected responses, results and the Excel export stay available.</p>
      </Modal>
    </div>
  );
}
