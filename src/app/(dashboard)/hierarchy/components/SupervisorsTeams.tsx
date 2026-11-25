"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pill } from "@/components/ui/Pill";
import { Select } from "@/components/ui/Select";
import { canManageTeams, chainTo, selfIn, teamOfKebele, teamsModeFor, woredasFor, type ChangeLogEntry, type IndividualAssignment, type Team } from "@/features/hierarchy";
import { useAuthStore } from "@/store/useAuthStore";
import { useViewer } from "./HierarchyTree";

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="px-4 py-4">
      <p className="text-[13.5px] text-ink-soft">{label}</p>
      <p className="mt-1.5 truncate text-[22px] font-semibold leading-tight text-ink sm:text-[26px]">{value}</p>
    </Card>
  );
}

function teamColumns(editable: boolean): Column<Team>[] {
  const cols: Column<Team>[] = [
    { key: "team", header: "Team", cell: (t) => <span className="font-medium text-ink">{t.name}</span> },
    { key: "kebeles", header: "Kebeles", className: "min-w-[240px]", cell: (t) => t.kebeles.join(", ") },
    { key: "agents", header: "Agents", cell: (t) => t.agents },
    { key: "lead", header: "Lead · Reports to", cell: (t) => t.lead },
    { key: "delegate", header: "Delegate", cell: (t) => t.delegate },
    { key: "individual", header: "Individual", cell: (t) => t.individual },
    { key: "status", header: "Status", cell: (t) => <Pill tone={t.status === "Active" ? "green" : "slate"}>{t.status}</Pill> },
  ];
  if (editable)
    cols.push({
      key: "edit",
      header: <span className="sr-only">Edit</span>,
      align: "right",
      cell: (t) => (
        <button type="button" aria-label={`Edit ${t.name}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-soft hover:bg-surface hover:text-ink">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" />
          </svg>
        </button>
      ),
    });
  return cols;
}

const INDIVIDUAL_COLUMNS: Column<IndividualAssignment>[] = [
  { key: "agent", header: "Agent", cell: (a) => <span className="font-medium text-ink">{a.agent}</span> },
  { key: "kebele", header: "Kebele · team", cell: (a) => `${a.kebele} · ${a.team}` },
  { key: "specialism", header: "Specialism", cell: (a) => a.specialism },
  { key: "reportsTo", header: "Reports to", cell: (a) => a.reportsTo },
  { key: "why", header: "Why", cell: (a) => a.why },
  {
    key: "since",
    header: "Since",
    cell: (a) => (
      <span className="inline-flex items-center gap-3 whitespace-nowrap">
        {a.since}
        <Pill tone="blue">Individual</Pill>
      </span>
    ),
  },
];

function ChangeLog({ entries }: { entries: ChangeLogEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <Card className="p-0">
      <div className="flex items-center gap-2 px-5 pt-4 pb-2">
        <h2 className="text-[16px] font-semibold text-ink">Change log</h2>
        <span title="Changes to teams, kebeles and reporting lines" className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-[11px] font-semibold text-ink-soft">
          ?
        </span>
      </div>
      <ul className="px-5">
        {entries.map((entry) => (
          <li key={`${entry.on}-${entry.text}`} className="border-b border-line-soft py-3 last:border-b-0">
            <p className="text-[14px] text-ink">{entry.text}</p>
            <p className="mt-0.5 text-[12.5px] text-muted">
              {entry.by} · {entry.on}
            </p>
          </li>
        ))}
      </ul>
      <div className="border-t border-line-soft px-5 py-3">
        <button type="button" className="text-[14px] font-semibold text-brand-green hover:underline">
          Full history
        </button>
      </div>
    </Card>
  );
}

const Location = ({ children }: { children: React.ReactNode }) => <span className="w-fit rounded-lg border border-line bg-white px-3 py-2 text-[14px] text-ink">{children}</span>;

// Supervisors and teams of a woreda, by role (see teamsModeFor):
//   DA         → their own team, who they report to, and changes to their team;
//   Supervisor → their woreda's teams, which they manage;
//   Admin      → any woreda, managed; Executive → woredas of their region, read only; Comms → any woreda, read only.
// UI only: static sample data, no API.
export function SupervisorsTeams() {
  const role = useAuthStore((s) => s.role);
  const viewer = useViewer();
  const mode = teamsModeFor(role);
  const editable = canManageTeams(role);
  const woredas = woredasFor(role, viewer);
  const [picked, setPicked] = useState(woredas[0]?.id ?? "");
  const woreda = woredas.find((w) => w.id === picked) ?? woredas[0];

  if (!woreda) return <Card className="py-8 text-center text-[14px] text-muted">No woredas in your scope.</Card>;
  const path = `${woreda.region} › ${woreda.name} woreda`;
  const agents = woreda.teams.reduce((n, t) => n + t.agents, 0);

  // ---- DA: own team -----------------------------------------------------------------------------------------
  if (mode === "own") {
    const self = selfIn(role, viewer);
    const team = teamOfKebele(woreda.teams, self?.place ?? viewer.kebele);
    const supervisor = self ? chainTo(self.id).at(-2) : undefined;
    const mentions = (text: string) => !!team && (text.includes(team.name) || team.kebeles.some((k) => text.includes(k)) || (!!self && text.includes(self.name)));
    return (
      <div className="flex flex-col gap-4">
        <Location>
          {path}
          {self && <span className="text-ink-soft"> · {self.place} kebele</span>}
        </Location>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="My team" value={team?.name ?? "—"} />
          <Stat label="Reports to" value={supervisor?.name ?? team?.lead ?? "—"} />
          <Stat label="Delegate" value={team?.delegate ?? "—"} />
          <Stat label="Agents in team" value={team?.agents ?? "—"} />
        </div>
        <Card className="overflow-hidden p-0">
          <DataTable
            title={<h2 className="text-[16px] font-semibold text-ink">My team</h2>}
            columns={teamColumns(false)}
            rows={team ? [team] : []}
            rowKey={(t) => t.id}
            paginate={false}
            minWidth="760px"
            emptyTitle="You are not in a team yet"
            emptyHint="Your supervisor adds your kebele to a team."
          />
        </Card>
        <ChangeLog entries={woreda.changeLog.filter((e) => mentions(e.text))} />
      </div>
    );
  }

  // ---- Supervisor / Admin / Executive / Comms: a woreda's teams -----------------------------------------------
  return (
    <div className="flex flex-col gap-4">
      {mode === "browse" && woredas.length > 1 ? (
        <div className="w-full sm:w-[340px]">
          <Select value={woreda.id} onChange={(e) => setPicked(e.target.value)} aria-label="Woreda">
            {woredas.map((w) => (
              <option key={w.id} value={w.id}>
                {w.region} › {w.name} woreda
              </option>
            ))}
          </Select>
        </div>
      ) : (
        <Location>{path}</Location>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Supervisors" value={woreda.supervisors} />
        <Stat label="Teams" value={woreda.teams.length} />
        <Stat label="Agents" value={agents} />
        <Stat label="Set individually" value={woreda.individuals.length} />
      </div>

      <Card className="overflow-hidden p-0">
        <DataTable
          title={<h2 className="text-[16px] font-semibold text-ink">Teams in {woreda.name} woreda</h2>}
          columns={teamColumns(editable)}
          rows={woreda.teams}
          rowKey={(t) => t.id}
          paginate={false}
          emptyTitle="No teams yet"
          emptyHint="Create a team to group this woreda's kebeles under a supervisor."
        />
      </Card>

      <Card className="overflow-hidden p-0">
        <DataTable
          title={<h2 className="text-[16px] font-semibold text-ink">Set individually</h2>}
          columns={INDIVIDUAL_COLUMNS}
          rows={woreda.individuals}
          rowKey={(a) => a.agent}
          paginate={false}
          emptyTitle="No agents set individually"
          emptyHint="Every agent reports to their team lead."
        />
        {editable && (
          <div className="border-t border-line-soft px-4 py-3">
            <button type="button" className="text-[14px] font-semibold text-brand-green hover:underline">
              + Set an agent individually
            </button>
          </div>
        )}
      </Card>

      <ChangeLog entries={woreda.changeLog} />
    </div>
  );
}
