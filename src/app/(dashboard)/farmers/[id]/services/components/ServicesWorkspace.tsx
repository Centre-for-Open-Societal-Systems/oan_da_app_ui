"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pill } from "@/components/ui/Pill";
import { SegmentTabs } from "@/components/ui/SegmentTabs";
import { Banner } from "@/components/ui/Banner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { Farmer } from "@/features/farmers";
import { cn, todayIso } from "@/lib/utils";

type Tab = "credit" | "marketplace";

// Access-to-Credit loan-origination stages (FR-05b-iii). Assessment/approval happen at the partner bank.
const STAGES = ["Submitted", "Document review", "Credit assessment", "Final approval", "Disbursement"] as const;
const APPLICATION = {
  ref: "ATC-2026-04471",
  lender: "Cooperative Bank of Oromia",
  amount: "ETB 18,000",
  tenure: "12 months",
  product: "Seasonal input loan",
  currentStage: 2,
  stages: [
    { at: "02 Sep 2026, 10:15", actor: "Tadesse Alemu (DA)" },
    { at: "04 Sep 2026, 14:30", actor: "CBO — Bako branch" },
    { at: "In progress since 08 Sep", actor: "CBO credit desk" },
    { at: "—", actor: "" },
    { at: "—", actor: "" },
  ],
};

const SERVICE_CATALOGUE = ["Mechanisation — tractor hire", "Veterinary — vaccination", "Input supply — certified seed", "Storage — warehouse receipt", "Transport — market delivery", "Advisory — soil testing"];

export function ServicesWorkspace({ farmer }: { farmer: Farmer }) {
  const [tab, setTab] = useState<Tab>("credit");
  const [newCredit, setNewCredit] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "warning"; text: string } | null>(null);
  const [credit, setCredit] = useState({ product: "Seasonal input loan", amount: "", tenure: "12", purpose: "", docs: 0 });
  const [payment, setPayment] = useState({ service: SERVICE_CATALOGUE[0], provider: "", date: todayIso(), category: "Mechanisation", payee: "", amount: "", method: "Mobile money", notes: "" });

  const submitCredit = () => {
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    setNewCredit(false);
    setNotice({ tone: offline ? "warning" : "success", text: offline ? "Application saved on this device (Awaiting sync). It will be submitted to the partner bank when connectivity returns; the reference is assigned then." : `Application submitted for ${farmer.name} — reference will be issued by the partner bank. Status here mirrors the bank's workflow.` });
  };

  return (
    <>
      <PageHeader
        title={`Services - ${farmer.name}`}
        description="Credit and Marketplace are unrelated transactions with different counterparties and lifecycles, so they are kept on separate tabs."
        showDescription
      />
      {notice && <Banner tone={notice.tone} onDismiss={() => setNotice(null)}>{notice.text}</Banner>}
      <Card className="overflow-hidden p-0 shadow-card">
        <div className="border-b border-line">
          <SegmentTabs<Tab> className="rounded-none border-0 shadow-none" tabs={[{ key: "credit", label: "Credit" }, { key: "marketplace", label: "Marketplace" }]} active={tab} onChange={setTab} />
        </div>

        {tab === "credit" && (
          <div className="flex flex-col gap-5 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="flex flex-wrap items-center gap-3 text-[16px] font-bold text-ink">Active application <Pill tone="amber" dot>{STAGES[APPLICATION.currentStage]}</Pill></h2>
              <Button type="button" variant="brand" size="md" onClick={() => setNewCredit(true)} className="shrink-0">New credit application</Button>
            </div>

            {/* Same columns as the stage cards below, so the details line up with them. */}
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[["Reference", APPLICATION.ref], ["Lender", APPLICATION.lender], ["Amount", APPLICATION.amount], ["Tenure", APPLICATION.tenure], ["Product", APPLICATION.product]].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11.5px] font-medium uppercase tracking-wide text-muted">{k}</dt>
                  <dd className="mt-1 text-[14px] font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>

            {/* 5-stage workflow with per-stage timestamp/actor and a current-stage marker */}
            <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {STAGES.map((s, i) => {
                const done = i < APPLICATION.currentStage;
                const current = i === APPLICATION.currentStage;
                return (
                  <li key={s} className={cn("min-h-[114px] rounded-lg border p-4", current ? "border-brand-green bg-brand-mint" : done ? "border-line bg-white" : "border-line bg-surface")}>
                    <div className="flex items-center gap-2">
                      {done ? (
                        <svg className="h-5 w-5 shrink-0 text-brand-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                          <path d="M22 4L12 14.01l-3-3" />
                        </svg>
                      ) : (
                        <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border bg-white text-[11px] font-semibold", current ? "border-brand-green text-brand-green" : "border-slate-300 text-muted")}>{i + 1}</span>
                      )}
                      <span className={cn("text-[13.5px] font-semibold", current || done ? "text-ink" : "text-muted")}>{s}</span>
                    </div>
                    <p className="mt-3 text-[12.5px] text-muted">{APPLICATION.stages[i].at}</p>
                    {APPLICATION.stages[i].actor && <p className="text-[12.5px] text-muted">{APPLICATION.stages[i].actor}</p>}
                    {current && <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-brand-green">Current stage</p>}
                  </li>
                );
              })}
            </ol>

            <div className="flex flex-wrap items-center gap-2">
              {["Documents (4)", "Add note", "Statement"].map((a) => (
                <Button key={a} type="button" variant="outline" size="md" onClick={() => setNotice({ tone: "success", text: `${a.replace(/ \(\d+\)/, "")} — opens the bank-mirrored record; nothing is adjudicated here.` })} >{a}</Button>
              ))}
            </div>
            <Banner tone="info">
              Assessment and approval occur at the partner bank. This view mirrors their status — the registry does not adjudicate credit.
            </Banner>
          </div>
        )}

        {tab === "marketplace" && (
          <div className="flex flex-col gap-5 p-5">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Record a service payment</h2>
              <p className="mt-1 text-[13px] text-ink-soft">A payment is recorded against an identified service from the OpenAgriNet service catalogue — not a bare transfer.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Service being paid for" htmlFor="mk-service" required>
                <Select id="mk-service" value={payment.service} onChange={(e) => setPayment({ ...payment, service: e.target.value, category: e.target.value.split(" — ")[0] })}>{SERVICE_CATALOGUE.map((s) => <option key={s}>{s}</option>)}</Select>
              </FormField>
              <FormField label="Service category" htmlFor="mk-cat" hint="From the OpenAgriNet service catalogue">
                <Input id="mk-cat" value={payment.category} readOnly className="bg-zinc-50" />
              </FormField>
              <FormField label="Provider" htmlFor="mk-provider" required>
                <Input id="mk-provider" value={payment.provider} onChange={(e) => setPayment({ ...payment, provider: e.target.value })} placeholder="e.g. Bako Mechanisation Cooperative" />
              </FormField>
              <FormField label="Service date" htmlFor="mk-date" required>
                <Input id="mk-date" type="date" value={payment.date} onChange={(e) => setPayment({ ...payment, date: e.target.value })} />
              </FormField>
              <FormField label="Payee" htmlFor="mk-payee" required>
                <Input id="mk-payee" value={payment.payee} onChange={(e) => setPayment({ ...payment, payee: e.target.value })} placeholder="Account / wallet holder" />
              </FormField>
              <FormField label="Amount (ETB)" htmlFor="mk-amount" required>
                <Input id="mk-amount" type="number" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} placeholder="0.00" />
              </FormField>
              <FormField label="Method" htmlFor="mk-method" required>
                <Select id="mk-method" value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}><option>Mobile money</option><option>Bank transfer</option><option>Cash (receipted)</option></Select>
              </FormField>
              <FormField label="Notes" htmlFor="mk-notes" className="md:col-span-2">
                <Textarea id="mk-notes" rows={2} value={payment.notes} onChange={(e) => setPayment({ ...payment, notes: e.target.value })} />
              </FormField>
            </div>
            {(!payment.amount || !payment.payee || !payment.provider) && <p className="text-[12.5px] text-muted">Complete every field marked * to enable Pay.</p>}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Pill tone="slate">Payment gateway WIP · e-Mandate · QR · IPS · payee management · reconciliation</Pill>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="md" onClick={() => setNotice({ tone: "success", text: "Payment draft saved on this device." })}>Save draft</Button>
                <Button type="button" variant="brand" size="md" disabled={!payment.amount || !payment.payee || !payment.provider} onClick={() => setNotice({ tone: "warning", text: "Payment recorded against the service and queued — the gateway is not yet live, so no funds move until it is." })}>Pay</Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* FR-05b-v mobile credit-application capture */}
      <Modal isOpen={newCredit} onClose={() => setNewCredit(false)} title="New Credit Application" subtitle={`${farmer.name} · ${farmer.id} · Fayda ${farmer.status}`} size="lg"
        footer={<><Button variant="outline" onClick={() => setNewCredit(false)}>Cancel</Button><Button variant="brand" disabled={!credit.amount || credit.purpose.trim().length < 3 || farmer.status !== "Verified"} onClick={submitCredit}>Submit application</Button></>}
      >
        {farmer.status !== "Verified" && <Banner tone="warning" className="mb-4">This farmer is not Fayda-verified. A credit application requires a verified identity.</Banner>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Farmer" htmlFor="cr-farmer"><Input id="cr-farmer" value={`${farmer.name} · ${farmer.id}`} readOnly className="bg-zinc-50" /></FormField>
          <FormField label="Partner bank" htmlFor="cr-bank"><Input id="cr-bank" value="Cooperative Bank of Oromia" readOnly className="bg-zinc-50" /></FormField>
          <FormField label="Loan product" htmlFor="cr-product" required>
            <Select id="cr-product" value={credit.product} onChange={(e) => setCredit({ ...credit, product: e.target.value })}><option>Seasonal input loan</option><option>Livestock working capital</option><option>Irrigation equipment</option></Select>
          </FormField>
          <FormField label="Amount requested (ETB)" htmlFor="cr-amount" required>
            <Input id="cr-amount" type="number" value={credit.amount} onChange={(e) => setCredit({ ...credit, amount: e.target.value })} placeholder="e.g. 15000" />
          </FormField>
          <FormField label="Tenure (months)" htmlFor="cr-tenure" required>
            <Select id="cr-tenure" value={credit.tenure} onChange={(e) => setCredit({ ...credit, tenure: e.target.value })}>{["6", "12", "18", "24"].map((t) => <option key={t} value={t}>{t}</option>)}</Select>
          </FormField>
          <FormField label="Supporting documents" htmlFor="cr-docs" hint={`${credit.docs} attached`}>
            <button id="cr-docs" type="button" onClick={() => setCredit({ ...credit, docs: credit.docs + 1 })} className="h-11 w-full rounded-lg border border-dashed border-zinc-300 text-[13.5px] font-medium text-slate-700 hover:border-brand-green">Add document / photo</button>
          </FormField>
          <FormField label="Purpose" htmlFor="cr-purpose" required hint="At least 3 characters." hintTone={credit.purpose.trim().length > 0 && credit.purpose.trim().length < 3 ? "error" : "muted"} className="sm:col-span-2">
            <Textarea id="cr-purpose" rows={3} value={credit.purpose} onChange={(e) => setCredit({ ...credit, purpose: e.target.value })} placeholder="What the loan will fund" />
          </FormField>
          {(!credit.amount || credit.purpose.trim().length < 3) && <p className="text-[12.5px] text-muted sm:col-span-2">Complete every field marked * to enable Submit application.</p>}
        </div>
        <Banner tone="info" className="mt-4">
          <p><span className="font-semibold">Consent:</span> {farmer.name} consented to share identity, holding and credit data with the partner bank (valid to 30 Jun 2027). Consent can be withdrawn from the farmer profile at any time before submission; a withdrawn consent stops this application.</p>
          <p className="mt-1">If offline, the application is saved on the device and queued (Awaiting sync).</p>
        </Banner>
      </Modal>
    </>
  );
}
