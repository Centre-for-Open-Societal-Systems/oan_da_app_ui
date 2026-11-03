"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { DetailRows } from "../lifecycle/components/shared";
import {
  AGENTS, ANNUAL_BASE, ASSIGN_COUNT, CONDITIONS, EFFECTS, LEAVE_NAME_CATALOG, POLICIES, WHEN_OPTIONS,
  type CountsAs, type LeaveTypeRow, type RuleRow, type Who,
} from "./data";

const FIELD = "h-11";
const BODY = "p-4 sm:px-6 sm:py-5";

function Footer({ onCancel, confirm, onConfirm, disabled }: { onCancel: () => void; confirm: string; onConfirm: () => void; disabled?: boolean }) {
  return (
    <>
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
      <Button variant="brand" onClick={onConfirm} disabled={disabled}>{confirm}</Button>
    </>
  );
}

const Row2 = ({ children }: { children: ReactNode }) => <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;

// ---- Add / edit a leave type -------------------------------------------------------------------------------------

export function LeaveTypeModal({ existing, takenNames, onClose, onSave }: { existing: LeaveTypeRow | null; takenNames: string[]; onClose: () => void; onSave: (row: LeaveTypeRow) => void }) {
  const [name, setName] = useState(existing?.type ?? "");
  const [baseDays, setBaseDays] = useState(String(existing?.baseDays ?? 10));
  const [counts, setCounts] = useState<CountsAs>(existing?.counts ?? "Working");
  const [who, setWho] = useState<Who>(existing?.who ?? "All");
  const [notice, setNotice] = useState(existing?.notice ?? "10 days");
  const [document, setDocument] = useState(existing?.document ?? "");
  const [legalBasis, setLegalBasis] = useState(existing?.legalBasis ?? "To confirm");

  const names = existing ? [existing.type, ...LEAVE_NAME_CATALOG] : LEAVE_NAME_CATALOG.filter((n) => !takenNames.includes(n));
  const valid = name !== "" && Number(baseDays) > 0;

  const save = () =>
    onSave({
      id: existing?.id ?? `lt-${Date.now()}`,
      type: name,
      baseDays: Number(baseDays),
      counts,
      who,
      rule: existing?.rule ?? "",
      document: document.trim() || "None",
      status: existing?.status ?? "To confirm",
      notice: notice.trim(),
      legalBasis: legalBasis.trim(),
    });

  return (
    <Modal isOpen onClose={onClose} title={existing ? "Edit a leave type" : "Add a leave type"} size="md" bodyClassName={BODY} footer={<Footer onCancel={onClose} confirm={existing ? "Save changes" : "Add leave type"} onConfirm={save} disabled={!valid} />}>
      <div className="flex flex-col gap-4">
        <FormField label="Name" htmlFor="lt-name">
          <Select id="lt-name" value={name} onChange={(e) => setName(e.target.value)} className={FIELD}>
            <option value="" disabled>e.g. Sick leave</option>
            {names.map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
        </FormField>
        <Row2>
          <FormField label="Base days" htmlFor="lt-days">
            <Input id="lt-days" type="number" min={1} value={baseDays} onChange={(e) => setBaseDays(e.target.value)} />
          </FormField>
          <FormField label="Count" htmlFor="lt-count">
            <Select id="lt-count" value={counts} onChange={(e) => setCounts(e.target.value as CountsAs)} className={FIELD}>
              <option value="Working">Working days</option>
              <option value="Calendar">Calendar days</option>
            </Select>
          </FormField>
        </Row2>
        <Row2>
          <FormField label="Who can take it" htmlFor="lt-who">
            <Select id="lt-who" value={who} onChange={(e) => setWho(e.target.value as Who)} className={FIELD}>
              <option value="All">All</option>
              <option value="Women">Women</option>
              <option value="Men">Men</option>
            </Select>
          </FormField>
          <FormField label="Notice" htmlFor="lt-notice">
            <Input id="lt-notice" value={notice} onChange={(e) => setNotice(e.target.value)} />
          </FormField>
        </Row2>
        <FormField label="Document needed" htmlFor="lt-doc">
          <Input id="lt-doc" value={document} onChange={(e) => setDocument(e.target.value)} placeholder="e.g. Admission letter" />
        </FormField>
        <FormField label="Legal basis" htmlFor="lt-legal">
          <Input id="lt-legal" value={legalBasis} onChange={(e) => setLegalBasis(e.target.value)} />
        </FormField>
      </div>
    </Modal>
  );
}

// ---- Add / edit a rule -------------------------------------------------------------------------------------------

/** What the rule would give two sample agents, as in "Tadesse Alemu: 20 + 4 = 24 days". */
function rulePreview(effect: string, days: number, cap: number) {
  if (effect !== "Add days") return "This rule changes who can take the leave, not the number of days. Allowances stay as they are.";
  return ["a-1", "a-3"]
    .map((id) => AGENTS.find((a) => a.id === id)!)
    .map((a) => {
      const add = Math.max(0, Math.floor(a.months / 12) - 1) * days;
      const raw = ANNUAL_BASE + add;
      const total = cap > 0 ? Math.min(raw, cap) : raw;
      return `${a.name}: ${ANNUAL_BASE} + ${total - ANNUAL_BASE} = ${total}${cap > 0 && raw >= cap ? " (cap)" : " days"}`;
    })
    .join(" · ");
}

export function RuleModal({ existing, leaveTypes, onClose, onSave }: { existing: RuleRow | null; leaveTypes: string[]; onClose: () => void; onSave: (row: RuleRow) => void }) {
  const [type, setType] = useState(existing?.type ?? leaveTypes[0]);
  const [scope, setScope] = useState(existing?.scope === "Federal" || !existing ? POLICIES[0] : existing.scope);
  const [condition, setCondition] = useState(existing?.condition ?? CONDITIONS[0]);
  const [when, setWhen] = useState(existing?.when ?? WHEN_OPTIONS[0]);
  const [effect, setEffect] = useState(existing?.effect ?? EFFECTS[0]);
  const [days, setDays] = useState(String(existing?.days || 1));
  const [cap, setCap] = useState(existing ? (existing.cap ? `${existing.cap} days` : "") : "30 days");

  const capNumber = Number(cap.replace(/\D/g, "")) || 0;
  const adds = effect === "Add days";

  const save = () =>
    onSave({ id: existing?.id ?? `r-${Date.now()}`, type, condition, when, effect, days: adds ? Number(days) || 1 : 0, cap: adds ? capNumber : 0, scope: scope === POLICIES[0] ? "Federal" : scope });

  return (
    <Modal isOpen onClose={onClose} title={existing ? "Edit rule" : "Add rule"} size="md" bodyClassName={BODY} footer={<Footer onCancel={onClose} confirm="Save rule" onConfirm={save} />}>
      <div className="flex flex-col gap-4">
        <Row2>
          <FormField label="Leave type" htmlFor="rl-type">
            <Select id="rl-type" value={type} onChange={(e) => setType(e.target.value)} className={FIELD}>
              {leaveTypes.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </FormField>
          <FormField label="Scope" htmlFor="rl-scope">
            <Select id="rl-scope" value={scope} onChange={(e) => setScope(e.target.value)} className={FIELD}>
              {POLICIES.map((p) => <option key={p}>{p}</option>)}
            </Select>
          </FormField>
        </Row2>
        <Row2>
          <FormField label="Condition" htmlFor="rl-cond">
            <Select id="rl-cond" value={condition} onChange={(e) => setCondition(e.target.value)} className={FIELD}>
              {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </FormField>
          <FormField label="When" htmlFor="rl-when">
            <Select id="rl-when" value={when} onChange={(e) => setWhen(e.target.value)} className={FIELD}>
              {WHEN_OPTIONS.map((w) => <option key={w}>{w}</option>)}
            </Select>
          </FormField>
        </Row2>
        <Row2>
          <FormField label="Effect" htmlFor="rl-effect">
            <Select id="rl-effect" value={effect} onChange={(e) => setEffect(e.target.value)} className={FIELD}>
              {EFFECTS.map((x) => <option key={x}>{x}</option>)}
            </Select>
          </FormField>
          <FormField label="Days" htmlFor="rl-days">
            <Select id="rl-days" value={days} onChange={(e) => setDays(e.target.value)} disabled={!adds} className={FIELD}>
              {[1, 2, 3, 5, 10, 30].map((d) => <option key={d} value={String(d)}>{d}</option>)}
            </Select>
          </FormField>
        </Row2>
        <FormField label="Cap" htmlFor="rl-cap">
          <Input id="rl-cap" value={cap} onChange={(e) => setCap(e.target.value)} disabled={!adds} placeholder="e.g. 30 days" />
        </FormField>
        <div className="rounded-xl bg-surface px-4 py-3">
          <p className="text-[14px] font-semibold text-ink">Preview</p>
          <p className="mt-1.5 text-[14px] text-ink-soft">{rulePreview(effect, Number(days) || 1, adds ? capNumber : 0)}</p>
        </div>
      </div>
    </Modal>
  );
}

// ---- Import a policy workbook ------------------------------------------------------------------------------------

export function ImportPolicyModal({ onClose, onCheck, onDownloadBlank }: { onClose: () => void; onCheck: (fileName: string) => void; onDownloadBlank: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = (list: FileList | null) => {
    const f = list?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".xlsx")) {
      setError("Use the policy workbook (.xlsx).");
      return;
    }
    setError(null);
    setFile(f);
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    pick(e.dataTransfer.files);
  };

  return (
    <Modal isOpen onClose={onClose} title="Import current policy" size="md" bodyClassName={BODY} footer={<Footer onCancel={onClose} confirm="Check file" onConfirm={() => file && onCheck(file.name)} disabled={!file} />}>
      <div className="flex flex-col gap-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), inputRef.current?.click())}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={cn("flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-colors", isDragging ? "border-brand-green bg-brand-tint" : "border-slate-300 bg-surface-alt hover:border-brand-green/60")}
        >
          <p className="text-[15px] font-bold text-ink">Drop the leave policy workbook here</p>
          <p className="text-[12.5px] text-ink-soft">Leave types, durations, rules, approval levels, calendar · .xlsx</p>
          {file && <span className="mt-1 rounded-lg border border-line bg-white px-4 py-2 text-[14px] font-medium text-ink">{file.name}</span>}
          <input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
        </div>
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        <p className="text-[14px] text-ink-soft">Every row is checked first. Nothing changes until you import.</p>
        <button type="button" onClick={onDownloadBlank} className="w-fit text-[14px] font-semibold text-brand-green hover:underline">Download the blank policy workbook</button>
      </div>
    </Modal>
  );
}

// ---- Publish ----------------------------------------------------------------------------------------------------

export function PublishModal({ rules, types, onClose, onPublish }: { rules: number; types: number; onClose: () => void; onPublish: () => void }) {
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const changes = [rules > 0 && plural(rules, "rule", "rules"), types > 0 && plural(types, "new leave type", "new leave types")].filter(Boolean).join(" · ");
  return (
    <Modal isOpen onClose={onClose} title="Publish leave policy changes?" size="md" bodyClassName={BODY} footer={<Footer onCancel={onClose} confirm="Publish" onConfirm={onPublish} />}>
      <p className="mb-4 text-[14px] text-ink-soft">Allowances for 71,860 agents are recalculated from the new rules. Region admins are notified. Leave already approved is not changed.</p>
      <DetailRows
        boxed
        rows={[
          { label: "Changes", value: changes || "No changes yet" },
          { label: "Recalculated for", value: "71,860 agents" },
          { label: "Region admins told", value: "12 regions" },
          { label: "Approved leave", value: "Not changed" },
        ]}
      />
    </Modal>
  );
}

// ---- Assign the policy ------------------------------------------------------------------------------------------

export function AssignModal({ policy, onClose, onAssign }: { policy: string; onClose: () => void; onAssign: () => void }) {
  const region = policy === POLICIES[0] ? "Oromia" : policy;
  return (
    <Modal isOpen onClose={onClose} title={`Assign the policy to ${ASSIGN_COUNT} agents?`} size="md" bodyClassName={BODY} footer={<Footer onCancel={onClose} confirm="Assign" onConfirm={onAssign} />}>
      <p className="mb-4 text-[14px] text-ink-soft">Development agents and supervisors in Bako Tibe woreda get the {region} leave policy. Their allowances are worked out from the rules; agents see how.</p>
      <DetailRows
        boxed
        rows={[
          { label: "Policy", value: `${region} leave policy 2019` },
          { label: "Area", value: "Bako Tibe woreda" },
          { label: "Designation", value: "All designations" },
          { label: "Agents", value: `${ASSIGN_COUNT} agents` },
        ]}
      />
    </Modal>
  );
}
