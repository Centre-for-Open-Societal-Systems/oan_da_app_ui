"use client";

import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SegmentTabs } from "@/components/ui/SegmentTabs";
import { Select } from "@/components/ui/Select";
import { downloadTable } from "@/lib/export";
import { PageIntro, SELECT_CLASS } from "../leave-admin/shared";
import { AssignTab, ChainsTab, LeaveTypesTab, OverridesTab, RulesTab } from "./ConfigTabs";
import { AssignModal, ImportPolicyModal, LeaveTypeModal, PublishModal, RuleModal } from "./LeaveConfigModals";
import { FEDERAL, LEAVE_TYPES, OVERRIDES, POLICIES, RULES, type LeaveTypeRow, type RuleRow } from "./data";

type TabKey = "types" | "rules" | "overrides" | "chains" | "assign";
const TABS: { key: TabKey; label: string }[] = [
  { key: "types", label: "Leave types" },
  { key: "rules", label: "Rules" },
  { key: "overrides", label: "Regional overrides" },
  { key: "chains", label: "Approval chains" },
  { key: "assign", label: "Assign to agents" },
];

type Dialog = "import" | "publish" | "assign" | null;

// Leave policy editor: leave types, rules, regional overrides, approval chains and assignment. Edits stay in this page
// until the leave configuration API exists; "Publish changes" summarises what was changed since the last publish.
export function LeaveConfigure() {
  const [policy, setPolicy] = useState(FEDERAL);
  const [tab, setTab] = useState<TabKey>("types");
  const [types, setTypes] = useState(LEAVE_TYPES);
  const [rules, setRules] = useState(RULES);
  const [overrides, setOverrides] = useState(OVERRIDES);
  const [changes, setChanges] = useState({ rules: 0, types: 0 });
  const [dialog, setDialog] = useState<Dialog>(null);
  const [typeForm, setTypeForm] = useState<{ row: LeaveTypeRow | null } | null>(null);
  const [ruleForm, setRuleForm] = useState<{ row: RuleRow | null } | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "info"; title: string; text?: string } | null>(null);
  const [assigned, setAssigned] = useState(false);

  const region = policy === FEDERAL ? "Oromia" : policy;

  const saveType = (row: LeaveTypeRow) => {
    const isNew = !types.some((t) => t.id === row.id);
    setTypes((prev) => (isNew ? [...prev, row] : prev.map((t) => (t.id === row.id ? row : t))));
    if (isNew) setChanges((c) => ({ ...c, types: c.types + 1 }));
    setTypeForm(null);
  };
  const saveRule = (row: RuleRow) => {
    setRules((prev) => (prev.some((r) => r.id === row.id) ? prev.map((r) => (r.id === row.id ? row : r)) : [...prev, row]));
    setChanges((c) => ({ ...c, rules: c.rules + 1 }));
    setRuleForm(null);
  };

  const publish = () => {
    setDialog(null);
    setChanges({ rules: 0, types: 0 });
    setNotice({ tone: "success", title: "Leave policy published", text: "Allowances are being recalculated and region admins are notified." });
  };
  const downloadBlank = () =>
    downloadTable("xlsx", "leave-policy-blank", [] as LeaveTypeRow[], [
      { header: "Leave type", value: (r) => r.type },
      { header: "Base days", value: (r) => String(r.baseDays) },
      { header: "Counts", value: (r) => r.counts },
      { header: "Who", value: (r) => r.who },
      { header: "Document", value: (r) => r.document },
    ], "Leave types");

  return (
    <div className="flex w-full flex-col gap-5">
      <PageIntro title="Leave Configure" help="Set up the leave types, rules, approval chains and regional overrides of a policy. Changes apply once you publish them." description="Configure leave policies, leave types, approval workflows, and team leave settings to manage employee time off efficiently.">
        <Select value={policy} onChange={(e) => setPolicy(e.target.value)} className={SELECT_CLASS}>
          {POLICIES.map((p) => <option key={p}>{p}</option>)}
        </Select>
        <Button variant="brandOutline" className="h-10" onClick={() => setDialog("import")}>Import current policy</Button>
        <Button variant="brand" className="h-10" onClick={() => setDialog("publish")}>Publish changes</Button>
      </PageIntro>

      {notice && <Banner tone={notice.tone} title={notice.title} onDismiss={() => setNotice(null)}>{notice.text}</Banner>}

      <Card className="overflow-hidden p-0">
        <SegmentTabs tabs={TABS} active={tab} onChange={setTab} label="Leave configuration" className="rounded-none border-0 border-b shadow-none" />
        <div className="p-4 sm:p-6">
          {tab === "types" && <LeaveTypesTab rows={types} onAdd={() => setTypeForm({ row: null })} onEdit={(row) => setTypeForm({ row })} />}
          {tab === "rules" && <RulesTab rows={rules} onAdd={() => setRuleForm({ row: null })} onEdit={(row) => setRuleForm({ row })} />}
          {tab === "overrides" && <OverridesTab rows={overrides} region={region} onChange={(id, value) => setOverrides((prev) => prev.map((o) => (o.id === id ? { ...o, value } : o)))} />}
          {tab === "chains" && <ChainsTab />}
          {tab === "assign" && <AssignTab assigned={assigned} onAssign={() => setDialog("assign")} />}
        </div>
      </Card>

      {typeForm && <LeaveTypeModal existing={typeForm.row} takenNames={types.map((t) => t.type)} onClose={() => setTypeForm(null)} onSave={saveType} />}
      {ruleForm && <RuleModal existing={ruleForm.row} leaveTypes={types.map((t) => t.type)} onClose={() => setRuleForm(null)} onSave={saveRule} />}
      {dialog === "import" && (
        <ImportPolicyModal
          onClose={() => setDialog(null)}
          onDownloadBlank={downloadBlank}
          onCheck={(name) => {
            setDialog(null);
            setNotice({ tone: "info", title: `${name} checked`, text: "No problems found. Nothing has changed yet." });
          }}
        />
      )}
      {dialog === "publish" && <PublishModal rules={changes.rules} types={changes.types} onClose={() => setDialog(null)} onPublish={publish} />}
      {dialog === "assign" && (
        <AssignModal
          policy={policy}
          onClose={() => setDialog(null)}
          onAssign={() => {
            setAssigned(true);
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}
