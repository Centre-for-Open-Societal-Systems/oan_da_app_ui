"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { describeSurveyError, downloadSurveyResponses, getSurveyTemplate, listSurveyResponses, type Parameter, type SurveyResponseRecord } from "@/features/surveys";

const answerText = (value: string | string[] | undefined) => (Array.isArray(value) ? value.join(", ") : value) || "—";

/** The questions the Supervisor wrote. Consent, Farmer ID and Kebele are on every survey and are not listed. */
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

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-[17px] font-semibold text-ink">Answers{name ? ` · ${name}` : ""} <span className="font-normal text-ink-soft">({filtered ? `${visible.length} of ${total}` : total})</span></h2>
          <p className="text-[12.5px] text-ink-soft">One row per response · open View answers to see what the farmer answered{total > rows.length ? ` · showing the first ${rows.length}` : ""}</p>
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center w-full lg:w-auto">
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
            <Select aria-label="Woreda" className="h-9 sm:h-10 w-full sm:w-44" value={woreda} onChange={(e) => { setWoreda(e.target.value); setKebele(""); }}>
              <option value="">All Woredas</option>
              {woredas.map((w) => <option key={w}>{w}</option>)}
            </Select>
            <Select aria-label="Kebele" className="h-9 sm:h-10 w-full sm:w-44" value={kebele} onChange={(e) => setKebele(e.target.value)}>
              <option value="">All Kebeles</option>
              {kebeles.map((k) => <option key={k}>{k}</option>)}
            </Select>
          </div>
          <Button variant="outline" className="h-9 sm:h-10 w-full sm:w-auto whitespace-nowrap px-4 font-semibold" disabled={exporting} onClick={exportXlsx}>{exporting ? "Exporting…" : "Export Excel"}</Button>
          {onClose && <button type="button" onClick={onClose} className="shrink-0 self-center px-1 text-[13px] font-semibold text-ink-soft hover:text-ink">Hide</button>}
        </div>
      </div>
      {exportError && <p className="border-b border-line-soft px-4 py-2.5 text-[13px] font-medium text-danger">{exportError}</p>}
      {state === "loading" ? (
        <p className="px-4 py-8 text-center text-[13.5px] text-ink-soft">Loading answers…</p>
      ) : state === "error" ? (
        <p className="px-4 py-8 text-center text-[13.5px] font-medium text-danger">{error}</p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13.5px] text-ink-soft">No answers yet. They appear here as DAs submit responses.</p>
      ) : visible.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13.5px] text-ink-soft">No answers match this Woreda and Kebele.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-surface text-[12px] font-semibold uppercase tracking-wide text-ink-soft">
                <th scope="col" className="w-12 px-4 py-2.5">No.</th>
                <th scope="col" className="px-3 py-2.5">Farmer ID</th>
                <th scope="col" className="px-3 py-2.5">Collector DA</th>
                <th scope="col" className="px-3 py-2.5">Woreda</th>
                <th scope="col" className="px-3 py-2.5">Kebele</th>
                <th scope="col" className="px-3 py-2.5">Consent</th>
                <th scope="col" className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r, i) => (
                <tr key={r.id} className="border-b border-line-soft align-top last:border-b-0">
                  <td className="px-4 py-3 text-ink-soft">{i + 1}</td>
                  <td className="px-3 py-3 font-medium text-ink">{farmerOf(r)}</td>
                  <td className="px-3 py-3 text-ink">{r.collector_da_id}</td>
                  <td className="px-3 py-3 text-ink">{r.woreda ?? "—"}</td>
                  <td className="px-3 py-3 text-ink">{r.kebele ?? "—"}</td>
                  <td className="px-3 py-3 capitalize text-ink">{r.consent ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => setViewing(r)} className="whitespace-nowrap rounded-md border border-brand-green px-3 py-1.5 text-[12.5px] font-semibold text-brand-green transition-colors hover:bg-brand-wash">View answers</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title="Answers"
        subtitle={viewing ? `Farmer ${farmerOf(viewing)} · collected by ${viewing.collector_da_id}${viewing.kebele ? ` · ${viewing.kebele}` : ""}` : undefined}
        size="lg"
        bodyClassName="p-0"
        footer={<Button variant="outline" className="px-5 font-semibold" onClick={() => setViewing(null)}>Close</Button>}
      >
        {viewing && (
          <>
            <p className="border-b border-line-soft px-5 py-3 text-[13px] text-ink-soft">
              Consent: <span className="font-semibold capitalize text-ink">{viewing.consent ?? "—"}</span> · Status: <span className="font-semibold text-ink">{viewing.sync_state}</span>
            </p>
            {questions.length === 0 ? (
              <p className="px-5 py-6 text-[13.5px] text-ink-soft">This template has no questions.</p>
            ) : (
              <ol>
                {questions.map((q, i) => (
                  <li key={q.id} className="border-b border-line-soft px-5 py-3.5 last:border-b-0">
                    <p className="text-[14px] font-semibold text-ink"><span className="mr-1.5 text-brand-green">Question {i + 1}:</span>{q.prompt}</p>
                    <p className="mt-1 whitespace-pre-wrap text-[14px] text-ink"><span className="mr-1.5 text-ink-soft">Answer:</span>{answerText(viewing.answers[q.id])}</p>
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