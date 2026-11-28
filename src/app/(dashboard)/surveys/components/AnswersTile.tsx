"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Pill } from "@/components/ui/Pill";
import { Select } from "@/components/ui/Select";
import { describeSurveyError, downloadSurveyResponses, getSurveyTemplate, listSurveyResponses, type Parameter, type SurveyResponseRecord } from "@/features/surveys";

const answerText = (value: string | string[] | undefined) => (Array.isArray(value) ? value.join(", ") : value) || "—";

/** The questions the Supervisor wrote (older templates also stored consent / Farmer ID / Kebele rows: not listed). */
export const writtenQuestions = (parameters: Parameter[] | undefined) => (parameters ?? []).filter((p) => p.type !== "consent" && p.type !== "auto");

const distinct = (values: (string | null | undefined)[]) => [...new Set(values.filter((v): v is string => Boolean(v)))].sort();

// Farmer answers for one template (GET /surveys/{id}/responses): one row per response; View answers lists each question with its answer.
// Pass `questions` when the template is already loaded; otherwise the tile reads them from the template itself.
// `defaultWoreda` (a Woreda code) is the Woreda the filter starts on.
export function AnswersTile({ surveyId, questions: given, name, onClose, defaultWoreda = "" }: { surveyId: string; questions?: Parameter[]; name?: string; onClose?: () => void; defaultWoreda?: string }) {
  const [fetched, setFetched] = useState<Parameter[]>([]);
  const questions = given ?? fetched;
  const [rows, setRows] = useState<SurveyResponseRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [woreda, setWoreda] = useState(defaultWoreda);
  const [kebele, setKebele] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  /** The response whose answers are open in the View answers dialog. */
  const [viewing, setViewing] = useState<SurveyResponseRecord | null>(null);
  const farmerOf = (r: SurveyResponseRecord) => (answerText(r.answers.p2) === "—" ? r.farmer_id : answerText(r.answers.p2));

  useEffect(() => {
    if (given) return;
    let current = true;
    getSurveyTemplate(surveyId)
      .then((t) => current && setFetched(writtenQuestions(t.parameters)))
      .catch(() => current && setFetched([]));
    return () => {
      current = false;
    };
  }, [surveyId, given]);

  useEffect(() => {
    let current = true;
    listSurveyResponses(surveyId)
      .then(({ items, total: t }) => {
        if (!current) return;
        setRows(items);
        setTotal(t);
        setState("ready");
      })
      .catch((err: unknown) => {
        if (!current) return;
        setError(describeSurveyError(err));
        setState("error");
      });
    return () => {
      current = false;
    };
  }, [surveyId]);

  // The starting Woreda stays in the list even when it has no answers yet.
  const woredas = distinct([...rows.map((r) => r.woreda), defaultWoreda]);
  // Kebeles of the picked Woreda only, so the two filters cannot contradict each other.
  const kebeles = distinct(rows.filter((r) => !woreda || r.woreda === woreda).map((r) => r.kebele));
  const visible = rows.filter((r) => (!woreda || r.woreda === woreda) && (!kebele || r.kebele === kebele));
  const filtered = Boolean(woreda || kebele);

  const exportXlsx = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await downloadSurveyResponses(surveyId);
    } catch (err) {
      setExportError(describeSurveyError(err));
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<SurveyResponseRecord>[] = useMemo(
    () => [
      {
        key: "sno",
        header: "S.No.",
        align: "center",
        className: "w-16 min-w-[64px] whitespace-nowrap",
        cell: (r) => <span className="text-[13px] font-medium text-muted">{visible.indexOf(r) + 1}</span>,
      },
      {
        key: "farmer_id",
        header: "Farmer ID",
        className: "min-w-[150px] whitespace-nowrap",
        cell: (r) => <span className="font-semibold text-ink">{farmerOf(r)}</span>,
      },
      {
        key: "collector",
        header: "Collector DA",
        className: "min-w-[140px] whitespace-nowrap",
        cell: (r) => <span className="font-mono text-[13px] text-ink">{r.collector_da_id}</span>,
      },
      {
        key: "woreda",
        header: "Woreda",
        className: "min-w-[120px] whitespace-nowrap",
        cell: (r) => <span className="text-ink">{r.woreda ?? "—"}</span>,
      },
      {
        key: "kebele",
        header: "Kebele",
        className: "min-w-[120px] whitespace-nowrap",
        cell: (r) => <span className="text-ink">{r.kebele ?? "—"}</span>,
      },
      {
        key: "consent",
        header: "Consent",
        className: "min-w-[110px] whitespace-nowrap",
        cell: (r) =>
          r.consent?.toLowerCase() === "granted" || r.consent?.toLowerCase() === "yes" ? (
            <Pill tone="green" dot>Granted</Pill>
          ) : r.consent?.toLowerCase() === "denied" || r.consent?.toLowerCase() === "no" ? (
            <Pill tone="red" dot>Denied</Pill>
          ) : (
            <span className="text-[13px] capitalize text-ink">{r.consent ?? "—"}</span>
          ),
      },
      {
        key: "actions",
        header: <span className="sr-only">Action</span>,
        align: "right",
        className: "min-w-[130px] whitespace-nowrap",
        cell: (r) => (
          <span className="flex justify-end">
            <button
              type="button"
              onClick={() => setViewing(r)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] font-semibold text-brand-green hover:border-brand-green hover:bg-brand-wash/30 transition-all shadow-2xs whitespace-nowrap"
            >
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span>View answers</span>
            </button>
          </span>
        ),
      },
    ],
    [visible],
  );

  return (
    <Card className="overflow-hidden rounded-2xl border border-line bg-white p-0 shadow-card">
      <div className="flex flex-col gap-3.5 border-b border-line px-4 py-3.5 sm:px-5 sm:py-4 lg:flex-row lg:items-center lg:justify-between bg-white">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] sm:text-[18px] font-bold text-ink">
              Answers{name ? ` · ${name}` : ""}{" "}
              <span className="font-normal text-ink-soft">
                ({filtered ? `${visible.length} of ${total}` : total})
              </span>
            </h2>
            {filtered && (
              <span className="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-ink-soft border border-line-soft">
                Filtered
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12px] sm:text-[12.5px] text-ink-soft">
            One row per response · open View answers to see what the farmer answered
            {total > rows.length ? ` · showing first ${rows.length}` : ""}
          </p>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center w-full lg:w-auto">
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
            <Select
              aria-label="Woreda"
              className="h-10 w-full sm:w-44 rounded-xl font-medium"
              value={woreda}
              onChange={(e) => {
                setWoreda(e.target.value);
                setKebele("");
              }}
            >
              <option value="">All Woredas</option>
              {woredas.map((w) => (
                <option key={w}>{w}</option>
              ))}
            </Select>
            <Select
              aria-label="Kebele"
              className="h-10 w-full sm:w-44 rounded-xl font-medium"
              value={kebele}
              onChange={(e) => setKebele(e.target.value)}
            >
              <option value="">All Kebeles</option>
              {kebeles.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </Select>
          </div>
          <Button
            variant="outline"
            className="h-10 w-full sm:w-auto gap-2 whitespace-nowrap px-4 rounded-xl font-semibold border-line hover:border-brand-green hover:text-brand-green"
            disabled={exporting}
            onClick={exportXlsx}
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
            </svg>
            <span>{exporting ? "Exporting…" : "Export Excel"}</span>
          </Button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 self-center px-2 py-1 text-[13px] font-semibold text-ink-soft hover:text-ink transition-colors"
            >
              Hide
            </button>
          )}
        </div>
      </div>

      {error && <p className="border-b border-line-soft px-4 py-2.5 text-[13px] font-medium text-danger">{error}</p>}
      {exportError && <p className="border-b border-line-soft px-4 py-2.5 text-[13px] font-medium text-danger">{exportError}</p>}

      <DataTable
        itemLabel="responses"
        columns={columns}
        rows={visible}
        rowKey={(r) => r.id}
        minWidth="760px"
        state={state}
        onRetry={() => {
          setState("loading");
          setError(null);
          listSurveyResponses(surveyId)
            .then(({ items, total: t }) => {
              setRows(items);
              setTotal(t);
              setState("ready");
            })
            .catch((err: unknown) => {
              setError(describeSurveyError(err));
              setState("error");
            });
        }}
        emptyTitle={filtered ? "No answers match your filters" : "No answers yet"}
        emptyHint={filtered ? "Clear Woreda/Kebele filters or try different ones." : "They appear here as DAs submit responses."}
      />

      <Modal
        isOpen={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title="Survey Response Answers"
        subtitle={viewing ? `Farmer ${farmerOf(viewing)} · collected by ${viewing.collector_da_id}${viewing.kebele ? ` · ${viewing.kebele}` : ""}` : undefined}
        size="lg"
        bodyClassName="p-0 max-h-[70vh] overflow-y-auto"
        footer={<Button variant="outline" className="px-5 font-semibold rounded-xl" onClick={() => setViewing(null)}>Close</Button>}
      >
        {viewing && (
          <>
            <div className="flex flex-wrap items-center gap-3 border-b border-line-soft bg-surface/50 px-5 py-3 text-[13px] text-ink-soft">
              <div>
                Consent: <span className="font-semibold capitalize text-ink">{viewing.consent ?? "—"}</span>
              </div>
              <span className="text-muted">·</span>
              <div>
                Sync Status: <span className="font-semibold text-ink">{viewing.sync_state}</span>
              </div>
              {viewing.woreda && (
                <>
                  <span className="text-muted">·</span>
                  <div>Woreda: <span className="font-semibold text-ink">{viewing.woreda}</span></div>
                </>
              )}
            </div>
            {questions.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13.5px] text-ink-soft">This template has no questions.</p>
            ) : (
              <ol className="divide-y divide-line-soft">
                {questions.map((q, i) => (
                  <li key={q.id} className="px-5 py-4">
                    <div className="flex items-start gap-2">
                      <span className="inline-flex items-center justify-center rounded-md bg-brand-wash px-2 py-0.5 text-[11.5px] font-bold text-brand-green border border-brand-green/20 shrink-0 mt-0.5">
                        Q{i + 1}
                      </span>
                      <p className="text-[14px] font-semibold text-ink leading-snug">{q.prompt}</p>
                    </div>
                    <div className="mt-2.5 ml-8 rounded-xl bg-surface/70 p-3 border border-line-soft/80">
                      <p className="text-[11.5px] font-medium text-ink-soft uppercase tracking-wider">Farmer&apos;s Answer</p>
                      <p className="mt-1 whitespace-pre-wrap text-[13.5px] font-semibold text-ink">
                        {answerText(viewing.answers[q.id])}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </Modal>
    </Card>
  );
}