// Employee hierarchy (who reports to whom) and the supervisors-and-teams view of a woreda.
// UI only for now: there is no Employee / Teams / reporting-line API, so everything here is static sample data.
// Swap for the API when it lands.

export type EmployeeRole = "Admin" | "Executive" | "WoredaHead" | "Supervisor" | "DA";

export const EMPLOYEE_ROLE_LABELS: Record<EmployeeRole, string> = {
  Admin: "Programme admin",
  Executive: "Region executive",
  WoredaHead: "Woreda head",
  Supervisor: "Supervisor",
  DA: "Development agent",
};

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  /** Where they sit, e.g. "Oromia", "Bako Tibe woreda", "Team North", or a DA's kebele. */
  place: string;
  specialism?: string;
  /** Set when an agent reports to someone other than their team lead. */
  individual?: boolean;
  reports?: Employee[];
}

const da = (id: string, name: string, kebele: string, specialism: string, individual = false): Employee => ({ id, name, role: "DA", place: kebele, specialism, individual });

export const EMPLOYEE_TREE: Employee = {
  id: "mulugeta",
  name: "Mulugeta Haile",
  role: "Admin",
  place: "Federal",
  reports: [
    {
      id: "kenenisa",
      name: "Kenenisa Bekele",
      role: "Executive",
      place: "Oromia",
      reports: [
        {
          id: "abdi",
          name: "Abdi Mohammed",
          role: "WoredaHead",
          place: "Bako Tibe woreda",
          reports: [
            {
              id: "ayana",
              name: "Ayana Bekele",
              role: "Supervisor",
              place: "Team North",
              reports: [
                da("chaltu", "Chaltu Fayisa", "Bari Abo", "Crop production"),
                da("gemechu", "Gemechu Tolosa", "Dembi Dima", "Natural resources"),
                da("hawi", "Hawi Lemma", "Dembi Gobu", "Crop production"),
              ],
            },
            {
              id: "dereje",
              name: "Dereje Tadesse",
              role: "Supervisor",
              place: "Team South",
              reports: [
                da("bekele", "Bekele Gutema", "Tulu Sangota", "Livestock", true),
                da("lensa", "Lensa Abera", "Seden Kite", "Crop production"),
                da("tolera", "Tolera Dinka", "Bachara Oda Gibe", "Livestock"),
                da("meseret", "Meseret Alemu", "Gedo", "Natural resources"),
              ],
            },
          ],
        },
        {
          id: "fatuma",
          name: "Fatuma Ali",
          role: "WoredaHead",
          place: "Ambo woreda",
          reports: [
            {
              id: "girma",
              name: "Girma Wolde",
              role: "Supervisor",
              place: "Team Ambo",
              reports: [da("sena", "Sena Tadesse", "Awaro Kora", "Crop production"), da("robel", "Robel Assefa", "Guder", "Livestock")],
            },
          ],
        },
      ],
    },
    {
      id: "yohannes",
      name: "Yohannes Tesfaye",
      role: "Executive",
      place: "Amhara",
      reports: [
        {
          id: "selam",
          name: "Selam Getachew",
          role: "WoredaHead",
          place: "Bahir Dar Zuria woreda",
          reports: [{ id: "mekdes", name: "Mekdes Haile", role: "Supervisor", place: "Team Lake", reports: [da("abel", "Abel Mulu", "Zenzelma", "Crop production")] }],
        },
      ],
    },
  ],
};

/** Every Development Agent under an employee. */
export const agentsUnder = (e: Employee): number => (e.reports ?? []).reduce((n, r) => n + (r.role === "DA" ? 1 : agentsUnder(r)), 0);

/** The employee with `id` in the tree, or null. */
export function findEmployee(id: string, root: Employee = EMPLOYEE_TREE): Employee | null {
  if (root.id === id) return root;
  for (const r of root.reports ?? []) {
    const hit = findEmployee(id, r);
    if (hit) return hit;
  }
  return null;
}

/** The chain from the top down to `id` (inclusive), or [] when not found. */
export function chainTo(id: string, root: Employee = EMPLOYEE_TREE): Employee[] {
  if (root.id === id) return [root];
  for (const r of root.reports ?? []) {
    const path = chainTo(id, r);
    if (path.length) return [root, ...path];
  }
  return [];
}

/** True when the employee or anyone under them matches the search (name, role, place, specialism). */
export function employeeMatches(e: Employee, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const own = [e.name, EMPLOYEE_ROLE_LABELS[e.role], e.place, e.specialism ?? ""].some((v) => v.toLowerCase().includes(q));
  return own || (e.reports ?? []).some((r) => employeeMatches(r, q));
}

// ---- Supervisors and teams ---------------------------------------------------------------------------------

export interface Team {
  id: string;
  name: string;
  kebeles: string[];
  agents: number;
  lead: string;
  delegate: string;
  individual: number;
  status: "Active" | "Inactive";
}

export interface IndividualAssignment {
  agent: string;
  kebele: string;
  team: string;
  specialism: string;
  reportsTo: string;
  why: string;
  since: string;
}

export interface ChangeLogEntry {
  text: string;
  by: string;
  on: string;
}

export interface WoredaTeams {
  id: string;
  name: string;
  region: string;
  supervisors: number;
  teams: Team[];
  individuals: IndividualAssignment[];
  changeLog: ChangeLogEntry[];
}

export const WOREDA_TEAMS: WoredaTeams[] = [
  {
    id: "bako-tibe",
    name: "Bako Tibe",
    region: "Oromia",
    supervisors: 2,
    teams: [
      { id: "north", name: "Team North", kebeles: ["Dembi Dima", "Dembi Gobu", "Bari Abo", "Tulu Sangota"], agents: 12, lead: "Ayana Bekele", delegate: "Dereje Tadesse", individual: 1, status: "Active" },
      { id: "south", name: "Team South", kebeles: ["Seden Kite", "Bachara Oda Gibe", "Gedo"], agents: 10, lead: "Dereje Tadesse", delegate: "Ayana Bekele", individual: 0, status: "Active" },
    ],
    individuals: [{ agent: "Bekele Gutema", kebele: "Tulu Sangota", team: "Team North", specialism: "Livestock", reportsTo: "Dereje Tadesse", why: "Livestock lead", since: "3 Hamle 2019" }],
    changeLog: [
      { text: "Bekele Gutema set to report to Dereje Tadesse", by: "Abdi Mohammed (woreda office head)", on: "3 Hamle 2019" },
      { text: "Gedo kebele moved to Team South", by: "Abdi Mohammed (woreda office head)", on: "2 Hamle 2019" },
      { text: "Team South created, lead Dereje Tadesse", by: "Kenenisa Bekele (Oromia region admin)", on: "1 Hamle 2019" },
      { text: "Team North created, lead Ayana Bekele", by: "Kenenisa Bekele (Oromia region admin)", on: "1 Hamle 2019" },
    ],
  },
  {
    id: "ambo",
    name: "Ambo",
    region: "Oromia",
    supervisors: 1,
    teams: [{ id: "ambo", name: "Team Ambo", kebeles: ["Awaro Kora", "Guder"], agents: 8, lead: "Girma Wolde", delegate: "Fatuma Ali", individual: 0, status: "Active" }],
    individuals: [],
    changeLog: [{ text: "Team Ambo created, lead Girma Wolde", by: "Kenenisa Bekele (Oromia region admin)", on: "5 Sene 2019" }],
  },
  {
    id: "bahir-dar-zuria",
    name: "Bahir Dar Zuria",
    region: "Amhara",
    supervisors: 1,
    teams: [{ id: "lake", name: "Team Lake", kebeles: ["Zenzelma", "Robit"], agents: 6, lead: "Mekdes Haile", delegate: "Selam Getachew", individual: 0, status: "Active" }],
    individuals: [],
    changeLog: [{ text: "Team Lake created, lead Mekdes Haile", by: "Yohannes Tesfaye (Amhara region admin)", on: "12 Sene 2019" }],
  },
];

/** The DA's team: the one holding their Kebele (by name), else the first. */
export const teamOfKebele = (teams: Team[], kebele: string | null | undefined): Team | undefined =>
  teams.find((t) => !!kebele && t.kebeles.some((k) => k.toLowerCase() === kebele.toLowerCase())) ?? teams[0];
