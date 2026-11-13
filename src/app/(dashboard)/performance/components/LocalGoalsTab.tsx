"use client";

import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Pill } from "@/components/ui/Pill";
import {
  GOAL_DUE_OPTIONS,
  LOCAL_GOALS,
  LOCAL_GOAL_STATUS_TONE,
  TARGET_ROWS,
  type LocalGoal,
} from "@/features/performance";

const KPI_OPTIONS = TARGET_ROWS.filter((r) => !r.fixed).map((r) => r.kpi);

function AddGoalModal({ first, onClose, onAdd }: { first: string; onClose: () => void; onAdd: (goal: LocalGoal) => void }) {
  const [goal, setGoal] = useState("");
  const [feedsKpi, setFeedsKpi] = useState(KPI_OPTIONS[0]);
  const [target, setTarget] = useState("");
  const [due, setDue] = useState(GOAL_DUE_OPTIONS[0]);

  // "2 field days" → counts towards 2; a target without a number can't be tracked.
  const amount = Number(target.match(/\d+/)?.[0] ?? 0);
  const valid = goal.trim() !== "" && amount > 0;

  const add = () => {
    if (!valid) return;
    onAdd({ id: `g-${Date.now()}`, goal: goal.trim(), feedsKpi, target: target.trim(), done: 0, of: amount, due: due.replace(/ \d+$/, ""), status: "On track" });
    onClose();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Add a local goal for ${first}`}
      size="md"
      bodyClassName="p-5"
      icon={
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-tint text-brand-green">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 14l2 2 4-4" />
          </svg>
        </span>
      }
      footer={
        <>
          <Button variant="outline" className="px-6 font-semibold" onClick={onClose}>Cancel</Button>
          <Button variant="brand" className="px-6" disabled={!valid} onClick={add}>Add goal</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormField label="Goal" htmlFor="goal-title" required>
          <Input id="goal-title" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Hold 2 farmer field days on row planting" />
        </FormField>
        <FormField label="Feeds KPI" htmlFor="goal-kpi">
          <Dropdown id="goal-kpi" value={feedsKpi} onChange={setFeedsKpi} options={KPI_OPTIONS} />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Target" htmlFor="goal-target" required hint={target !== "" && amount === 0 ? "Start with a number, e.g. 2 field days." : "Needs a number above 0, e.g. 2 field days."} hintTone={target !== "" && amount === 0 ? "error" : "muted"}>
            <Input id="goal-target" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="2 field days" />
          </FormField>
          <FormField label="Due" htmlFor="goal-due">
            <Dropdown id="goal-due" value={due} onChange={setDue} options={GOAL_DUE_OPTIONS} />
          </FormField>
        </div>
        {!valid && <p className="text-[12.5px] text-muted">Complete every field marked * to enable Add goal.</p>}
        <p className="text-[13px] text-muted">{first} is told in the app. Progress counts towards the KPI it feeds.</p>
      </div>
    </Modal>
  );
}

// Local goals tab: goals the supervisor sets for one agent, each feeding a KPI.
export function LocalGoalsTab({ first }: { first: string }) {
  const [goals, setGoals] = useState<LocalGoal[]>(LOCAL_GOALS);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}
      <div className="flex justify-end">
        <Button variant="brand" className="h-10 px-5" onClick={() => setAdding(true)}>Add local goal</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[860px] border-collapse text-left">
          <thead>
            <tr className="bg-surface text-[13px] font-semibold text-slate-500">
              <th className="px-5 py-3.5 font-semibold">Goal</th>
              <th className="px-4 py-3.5 font-semibold">Feeds KPI</th>
              <th className="px-4 py-3.5 font-semibold">Target</th>
              <th className="px-4 py-3.5 font-semibold">Progress</th>
              <th className="px-4 py-3.5 font-semibold">Due</th>
              <th className="px-4 py-3.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="text-[14px] text-slate-700">
            {goals.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6"><EmptyState title="No local goals yet" hint={`Add a goal for ${first} to track it here.`} /></td></tr>
            )}
            {goals.map((g) => (
              <tr key={g.id} className="border-t border-line-soft">
                <td className="max-w-[260px] px-5 py-3.5 font-medium text-ink">{g.goal}</td>
                <td className="px-4 py-3.5">{g.feedsKpi}</td>
                <td className="whitespace-nowrap px-4 py-3.5">{g.target}</td>
                <td className="px-4 py-3.5">
                  <div className="w-[170px]">
                    <p className="text-right font-mono text-[12px] text-brand-green">{g.done} of {g.of}</p>
                    <div className="h-1.5 overflow-hidden rounded-full bg-line-soft" role="progressbar" aria-valuenow={g.done} aria-valuemin={0} aria-valuemax={g.of}>
                      <div className="h-full rounded-full bg-brand-green" style={{ width: `${Math.min(100, (g.done / g.of) * 100)}%` }} />
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3.5">{g.due}</td>
                <td className="px-4 py-3.5"><Pill tone={LOCAL_GOAL_STATUS_TONE[g.status]} className="px-2.5 py-0.5 text-[12.5px]">{g.status}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding && (
        <AddGoalModal
          first={first}
          onClose={() => setAdding(false)}
          onAdd={(goal) => {
            setGoals((prev) => [...prev, goal]);
            setNotice(`Local goal added for ${first}.`);
          }}
        />
      )}
    </div>
  );
}
