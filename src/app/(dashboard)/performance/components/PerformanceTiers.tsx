"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Banner } from "@/components/ui/Banner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import {
  DEFAULT_TIER_THRESHOLDS,
  PERFORMANCE_TIERS,
  tierRules,
  type PerformanceTier,
  type TierCode,
  type TierThresholds,
} from "@/features/performance";

const TONES: Record<PerformanceTier["tone"], { chip: string }> = {
  green: { chip: "bg-brand-mint text-brand-green" },
  blue: { chip: "bg-blue-50 text-blue-700" },
  amber: { chip: "bg-warning-wash text-orange-700" },
  red: { chip: "bg-danger-wash text-danger" },
};

// The editable thresholds, grouped by the tier whose rule they define.
const THRESHOLD_FIELDS: { tier: TierCode; fields: { key: keyof TierThresholds; label: string }[] }[] = [
  { tier: "T1", fields: [{ key: "t1Quality", label: "Quality ≥ (%)" }, { key: "t1Visits", label: "Visits ≥ (% of target)" }, { key: "t1Training", label: "Training ≥ (%)" }] },
  { tier: "T2", fields: [{ key: "t2Quality", label: "Quality ≥ (%)" }, { key: "t2Visits", label: "Visits ≥ (% of target)" }, { key: "t2Training", label: "Training ≥ (%)" }] },
  { tier: "T3", fields: [{ key: "t3Quality", label: "Quality ≥ (%)" }] },
  { tier: "T4", fields: [{ key: "t4Training", label: "Training < (%)" }] },
];

type Draft = Record<keyof TierThresholds, string>;

const toDraft = (t: TierThresholds) => Object.fromEntries(Object.entries(t).map(([k, v]) => [k, String(v)])) as Draft;

function validate(d: Draft): { value?: TierThresholds; error?: string } {
  const value = Object.fromEntries(Object.entries(d).map(([k, v]) => [k, Number(v)])) as unknown as TierThresholds;
  if (Object.values(d).some((v) => v.trim() === "") || Object.values(value).some((v) => !Number.isFinite(v) || v < 0 || v > 100)) {
    return { error: "Every threshold must be a number between 0 and 100." };
  }
  if (!(value.t1Quality > value.t2Quality && value.t2Quality > value.t3Quality)) {
    return { error: "Quality thresholds must step down: T1 > T2 > T3." };
  }
  if (value.t4Training > value.t2Training) {
    return { error: "The T4 training floor can't be above the T2 training threshold." };
  }
  return { value };
}

// Tiers are computed by the backend aggregation engine; supervisors can tune the rule thresholds for the next period.
export function PerformanceTiers() {
  const [thresholds, setThresholds] = useState<TierThresholds>(DEFAULT_TIER_THRESHOLDS);
  const [configOpen, setConfigOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => toDraft(DEFAULT_TIER_THRESHOLDS));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const rules = tierRules(thresholds);
  const previewRules = tierRules(validate(draft).value ?? thresholds);

  const openConfig = () => {
    setDraft(toDraft(thresholds));
    setError(null);
    setConfigOpen(true);
  };

  const save = () => {
    const result = validate(draft);
    if (!result.value) {
      setError(result.error ?? "Check the thresholds.");
      return;
    }
    setThresholds(result.value);
    setConfigOpen(false);
    setNotice("Tier rules saved — tiers are recomputed by the KPI engine next period.");
  };

  return (
    <Card className="px-4 py-4 shadow-card">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Performance tiers</h2>
          <p className="mt-1 text-[12.5px] text-ink-soft">
            Auto-assigned from KPIs by the aggregation engine (backend) — rule-based, recomputed each period. Proposed 4-tier scheme.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-md bg-blue-50 px-2 py-1 text-[12px] font-medium text-blue-700">Backend · KPI engine</span>
          <button type="button" onClick={openConfig} className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-[12px] font-medium text-ink transition-colors hover:bg-zinc-50">
            Configure tiers
          </button>
        </div>
      </div>

      {notice && <Banner tone="success" className="mt-3" onDismiss={() => setNotice(null)}>{notice}</Banner>}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {PERFORMANCE_TIERS.map((tier) => {
          const tone = TONES[tier.tone];
          return (
            <div key={tier.code} className="flex flex-col rounded-xl border border-line p-3.5 transition-all hover:border-brand-green/30 hover:shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={cn("rounded px-1.5 py-0.5 text-[12px] font-semibold", tone.chip)}>{tier.code}</span>
                  <span className="text-[14px] font-semibold text-ink">{tier.name}</span>
                </div>
                <span className="text-[18px] font-semibold text-ink">
                  {tier.count} <span className="text-[12px] font-normal text-muted">DAs</span>
                </span>
              </div>

              <div className="mt-3 flex-1 rounded-lg bg-surface px-3 py-2.5">
                <p className="text-[11.5px] font-medium uppercase tracking-wide text-slate-700">Rule</p>
                <p className="mt-1.5 text-[12.5px] leading-snug text-ink">{rules[tier.code]}</p>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={configOpen}
        onClose={() => setConfigOpen(false)}
        title="Configure Tiers"
        subtitle="Threshold changes apply when the KPI engine next recomputes tiers (next period)."
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setDraft(toDraft(DEFAULT_TIER_THRESHOLDS))}>Reset to proposed</Button>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancel</Button>
            <Button variant="brand" onClick={save}>Save rules</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && <Banner tone="error">{error}</Banner>}
          <p className="text-[12.5px] text-muted">Every threshold is a number from 0 to 100. Quality thresholds step down: T1 &gt; T2 &gt; T3. The T4 training floor cannot be above the T2 training threshold.</p>
          {THRESHOLD_FIELDS.map(({ tier: code, fields }) => {
            const tier = PERFORMANCE_TIERS.find((t) => t.code === code)!;
            return (
              <div key={code} className="rounded-lg border border-line p-3.5">
                <div className="flex items-center gap-2">
                  <span className={cn("rounded px-1.5 py-0.5 text-[12px] font-semibold", TONES[tier.tone].chip)}>{code}</span>
                  <span className="text-[14px] font-semibold text-ink">{tier.name}</span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {fields.map((f) => (
                    <div key={f.key} className="flex flex-col gap-1.5">
                      <label htmlFor={`tier-${f.key}`} className="text-[12.5px] font-medium text-ink-soft">{f.label}</label>
                      <Input
                        id={`tier-${f.key}`}
                        type="number"
                        min={0}
                        max={100}
                        inputMode="numeric"
                        value={draft[f.key]}
                        onChange={(e) => setDraft((prev) => ({ ...prev, [f.key]: e.target.value }))}
                        className="h-9"
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-2.5 text-[12px] text-muted">Rule: {previewRules[code]}</p>
              </div>
            );
          })}
        </div>
      </Modal>
    </Card>
  );
}
