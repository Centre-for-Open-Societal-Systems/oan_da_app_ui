"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/utils";
import { PARAM_KINDS, kindMeta, type ParamKind, type TemplateParam } from "@/features/surveys";

const Icon = ({ d, className = "h-4 w-4", strokeWidth = 2 }: { d: string; className?: string; strokeWidth?: number }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const ALERT = "M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z";

/** Default answer options per kind, so the Configure step starts with something sensible. */
const DEFAULT_OPTIONS: Partial<Record<ParamKind, string[]>> = { single: ["Yes", "Partly", "No"], multi: ["Option 1", "Option 2", "Option 3"] };

const DETAIL: Record<ParamKind, (opts: string[], help: string) => string> = {
  consent: () => "Yes / No · survey ends if declined",
  single: (o) => o.join(" · "),
  multi: (o) => o.join(" · "),
  rating: () => "1 = very dissatisfied · 5 = very satisfied",
  yesno: () => "Yes · No",
  short: () => "One line · up to 100 characters",
  long: () => "Optional · max 300 characters · voice-to-text enabled",
  number: () => "Whole or decimal number",
  date: () => "Date picker",
  lookup: () => "Links the response to a visit record",
  auto: () => "Read-only · from the registry",
};

function ToggleRow({ title, hint, checked, onChange, children }: { title: string; hint: string; checked: boolean; onChange: (v: boolean) => void; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-line px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold text-ink">{title}</p>
          <p className="text-[12.5px] text-ink-soft">{hint}</p>
        </div>
        <Switch checked={checked} onChange={onChange} label={title} />
      </div>
      {children}
    </div>
  );
}

const FieldError = ({ children }: { children: ReactNode }) => (
  <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-danger"><Icon d={ALERT} className="h-3.5 w-3.5" />{children}</p>
);

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Existing parameters, for the position list and skip-logic sources. */
  params: TemplateParam[];
  languageCount: number;
  sourceLanguage: string;
  onAdd: (param: TemplateParam, index: number) => void;
}

// P7.12–P7.14: Step 1 picks how farmers answer, Step 2 configures the question, options, logic and position.
export function AddParameterDrawer(props: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);
  if (!mounted || !props.isOpen) return null;
  // Remounting the body per open resets the form.
  return createPortal(<DrawerBody {...props} />, document.body);
}

function DrawerBody({ onClose, params, languageCount, sourceLanguage, onAdd }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [kind, setKind] = useState<ParamKind>("single");
  const [title, setTitle] = useState("");
  const [helpText, setHelpText] = useState("");
  const [options, setOptions] = useState<string[]>(DEFAULT_OPTIONS.single!);
  const [required, setRequired] = useState(true);
  const [conditional, setConditional] = useState(false);
  const [condParam, setCondParam] = useState("");
  const [condOp, setCondOp] = useState<"equals" | "notEquals">("equals");
  const [condValue, setCondValue] = useState("");
  const [offline, setOffline] = useState(true);
  const [position, setPosition] = useState(String(params.length));
  const [tried, setTried] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const meta = kindMeta(kind);
  const filledOptions = options.map((o) => o.trim()).filter(Boolean);
  const insertAt = Number(position);
  // Skip logic can only depend on questions asked earlier that have a fixed answer list.
  const condSources = params.slice(0, insertAt).filter((q) => q.options?.length || q.kind === "yesno" || q.kind === "rating");
  const condSource = condSources.find((q) => q.id === condParam);
  const condValues = condSource ? (condSource.kind === "yesno" ? ["Yes", "No"] : condSource.kind === "rating" ? ["1", "2", "3", "4", "5"] : condSource.options ?? []) : [];

  const titleError = title.trim() === "" ? "Enter the question text" : "";
  const optionsError = meta.hasOptions && filledOptions.length < 2 ? "Add at least 2 options" : "";
  const condError = conditional && (!condParam || !condValue) ? "Pick the earlier question and answer" : "";
  const valid = !titleError && !optionsError && !condError;

  const pickKind = (k: ParamKind) => {
    setKind(k);
    if (kindMeta(k).hasOptions && !kindMeta(kind).hasOptions) setOptions(DEFAULT_OPTIONS[k] ?? ["", ""]);
  };

  const submit = () => {
    setTried(true);
    if (!valid) return;
    const sourceIndex = params.findIndex((q) => q.id === condParam);
    const condition = conditional ? { paramId: condParam, op: condOp, value: condValue } : undefined;
    const detail = DETAIL[kind](filledOptions, helpText) + (condition ? ` · shown only if Q${sourceIndex + 1} ${condOp === "equals" ? "=" : "≠"} ${condValue}` : "");
    onAdd({
      id: `q-${Date.now().toString(36)}`,
      kind,
      title: title.trim(),
      detail,
      helpText: helpText.trim() || undefined,
      options: meta.hasOptions ? filledOptions : kind === "consent" ? ["Yes, I agree", "No, I don't want to"] : undefined,
      required,
      offline,
      condition,
      needsTranslation: languageCount > 1,
    }, insertAt);
  };

  const moveOption = (from: number, to: number) => {
    if (from === to) return;
    setOptions((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const positionOptions = [
    ...params.map((q, i) => ({ value: String(i), label: `Before #${i + 1} · ${q.title}` })),
    { value: String(params.length), label: `End of survey · #${params.length + 1}` },
  ];

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 animate-fade-in bg-ink/30" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-labelledby="ap-title" className="absolute inset-y-0 right-0 flex w-full max-w-[580px] flex-col bg-white shadow-2xl">
        <header className="border-b border-line px-6 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="ap-title" className="text-[20px] font-bold text-ink">Add parameter</h2>
              <p className="text-[13px] text-ink-soft">{step === 1 ? "Step 1 of 2 · Choose how farmers will answer" : `Step 2 of 2 · ${meta.label}`}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink hover:bg-surface">
              <Icon d="M6 6l12 12M18 6L6 18" strokeWidth={2.5} />
            </button>
          </div>
          <ol className="mt-4 flex items-center gap-3 text-[13.5px]">
            <li className={cn("flex items-center gap-2", step === 1 ? "font-semibold text-ink" : "text-ink-soft")}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-green text-[12px] font-semibold text-white">
                {step === 1 ? "1" : <Icon d="M5 13l4 4L19 7" className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
              Choose type
            </li>
            <span className={cn("h-0.5 w-10 rounded", step === 2 ? "bg-brand-green" : "bg-line")} />
            <li className={cn("flex items-center gap-2", step === 2 ? "font-semibold text-ink" : "text-ink-soft")}>
              <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold", step === 2 ? "bg-brand-green text-white" : "border border-line text-ink-soft")}>2</span>
              Configure
            </li>
          </ol>
        </header>

        <div className="green-scrollbar flex-1 overflow-y-auto px-6 py-5">
          {step === 1 ? (
            <div role="radiogroup" aria-label="Parameter type" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PARAM_KINDS.map((k) => {
                const on = k.kind === kind;
                return (
                  <button key={k.kind} type="button" role="radio" aria-checked={on} onClick={() => pickKind(k.kind)}
                    className={cn("flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors", on ? "border-brand-green bg-brand-wash ring-1 ring-brand-green" : "border-line hover:bg-surface")}>
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", k.tile)}><Icon d={k.icon} className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-semibold text-ink">{k.label}</span>
                      <span className="block text-[12.5px] text-ink-soft">{k.hint}</span>
                    </span>
                    {on && (
                      <svg className="h-5 w-5 shrink-0 text-brand-green" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.7 7.7l-5.5 5.5a1 1 0 01-1.4 0l-2.5-2.5a1 1 0 111.4-1.4l1.8 1.8 4.8-4.8a1 1 0 111.4 1.4z" /></svg>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-3">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white", meta.tile.split(" ").find((c) => c.startsWith("text-")))}><Icon d={meta.icon} className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold text-ink">{meta.label}</span>
                  <span className="block text-[12.5px] text-ink-soft">{meta.hint}</span>
                </span>
                <button type="button" onClick={() => setStep(1)} className="text-[13.5px] font-semibold text-blue-600 hover:underline">Change</button>
              </div>

              <div>
                <label htmlFor="ap-q" className="text-[14px] font-medium text-ink">Question ({sourceLanguage}) <span className="text-danger">*</span></label>
                <input id="ap-q" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Type the question farmers will see" autoFocus
                  className={cn("mt-2 h-11 w-full rounded-lg border bg-white px-3 text-[14px] text-ink outline-none placeholder:text-subtle focus:ring-2", tried && titleError ? "border-danger focus:ring-danger/20" : "border-line focus:border-brand-green focus:ring-brand-green/20")} />
                {tried && titleError && <FieldError>{titleError}</FieldError>}
              </div>

              <div>
                <label htmlFor="ap-help" className="text-[14px] font-medium text-ink">Help text (optional)</label>
                <textarea id="ap-help" rows={2} value={helpText} onChange={(e) => setHelpText(e.target.value)} placeholder="Tell farmers how to answer"
                  className="mt-2 w-full resize-none rounded-lg border border-line bg-white px-3 py-2.5 text-[14px] text-ink outline-none placeholder:text-subtle focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" />
              </div>

              {meta.hasOptions && (
                <div>
                  <p className="text-[14px] font-medium text-ink">Answer options <span className="text-danger">*</span></p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {options.map((o, i) => (
                      <li key={i} draggable onDragStart={() => setDragIndex(i)} onDragOver={(e) => e.preventDefault()}
                        onDrop={() => { if (dragIndex !== null) moveOption(dragIndex, i); setDragIndex(null); }}
                        className={cn("flex items-center gap-2 rounded-lg border bg-white px-3", tried && optionsError && !o.trim() ? "border-danger" : "border-line", dragIndex === i && "opacity-50")}>
                        <span className="cursor-grab text-slate-400" aria-hidden="true"><Icon d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" strokeWidth={3} /></span>
                        <input value={o} aria-label={`Option ${i + 1}`} placeholder={`Option ${i + 1}`}
                          onChange={(e) => setOptions((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                          className="h-10 min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-subtle" />
                        <button type="button" aria-label={`Remove option ${i + 1}`} onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))} className="text-slate-400 hover:text-danger">
                          <Icon d="M6 6l12 12M18 6L6 18" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => setOptions((prev) => [...prev, ""])} className="mt-2.5 flex items-center gap-1.5 text-[13.5px] font-semibold text-brand-green hover:underline">
                    <Icon d="M12 5v14M5 12h14" strokeWidth={2.5} /> Add option
                  </button>
                  {tried && optionsError && <FieldError>{optionsError}</FieldError>}
                </div>
              )}

              <ToggleRow title="Required" hint="Farmer must answer to continue" checked={required} onChange={setRequired} />
              <ToggleRow title="Show only if…" hint="Add skip logic based on an earlier answer" checked={conditional} onChange={setConditional}>
                {conditional && (
                  <div className="mt-3 flex flex-col gap-2 border-t border-line-soft pt-3">
                    {condSources.length === 0 ? (
                      <p className="text-[12.5px] text-ink-soft">No earlier question with a fixed answer list. Move this question further down to add skip logic.</p>
                    ) : (
                      <>
                        <Dropdown value={condParam} onChange={(v) => { setCondParam(v); setCondValue(""); }} placeholder="Earlier question…"
                          options={condSources.map((q) => ({ value: q.id, label: `Q${params.indexOf(q) + 1} · ${q.title}` }))} />
                        <div className="grid grid-cols-2 gap-2">
                          <Dropdown value={condOp} onChange={(v) => setCondOp(v as "equals" | "notEquals")} options={[{ value: "equals", label: "is" }, { value: "notEquals", label: "is not" }]} />
                          <Dropdown value={condValue} onChange={setCondValue} options={condValues} placeholder="Answer…" disabled={!condSource} />
                        </div>
                        {tried && condError && <FieldError>{condError}</FieldError>}
                      </>
                    )}
                  </div>
                )}
              </ToggleRow>
              <ToggleRow title="Works offline" hint="Collected on the device and synced later" checked={offline} onChange={setOffline} />

              <div>
                <p className="text-[14px] font-medium text-ink">Position</p>
                <Dropdown className="mt-2" value={position} onChange={(v) => { setPosition(v); setCondParam(""); setCondValue(""); }} options={positionOptions} />
              </div>

              {languageCount > 1 && (
                <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-800">
                  <Icon d="M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01" className="mt-0.5 h-4 w-4 shrink-0" />
                  The new question is marked &quot;Needs translation&quot; in all {languageCount} languages until it is translated.
                </p>
              )}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-line bg-surface px-6 py-4">
          {step === 1 ? (
            <>
              <Button variant="outline" className="px-5 font-semibold" onClick={onClose}>Cancel</Button>
              <Button variant="brand" className="gap-2 px-5" onClick={() => { setStep(2); setTried(false); }}>Continue <Icon d="M5 12h14M13 6l6 6-6 6" /></Button>
            </>
          ) : (
            <>
              <Button variant="outline" className="gap-2 px-5 font-semibold" onClick={() => setStep(1)}><Icon d="M19 12H5M11 18l-6-6 6-6" /> Back</Button>
              <Button variant="brand" className="gap-2 px-5" onClick={submit}><Icon d="M12 5v14M5 12h14" strokeWidth={2.5} /> Add parameter</Button>
            </>
          )}
        </footer>
      </aside>
    </div>
  );
}
