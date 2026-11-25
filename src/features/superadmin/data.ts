// Mock data for the Super Admin screens (Department · Users · Roles · Dashboard). No backend yet: the pages
// seed their local state from these lists, so edits last until the page is reloaded.

export const DEPARTMENT_TYPES = ["Federal Ministry", "Regional Bureau", "Zone Office", "Woreda Office"] as const;
export type DepartmentType = (typeof DEPARTMENT_TYPES)[number];

export interface Department {
  id: string;
  name: string;
  type: DepartmentType;
  code: string;
  region: string;
  active: boolean;
}

export const DEPARTMENTS: Department[] = [
  { id: "d1", name: "Ministry of Health", type: "Federal Ministry", code: "DPT-05317", region: "Federal", active: true },
  { id: "d2", name: "Ambo Health Office", type: "Woreda Office", code: "DPT-05318", region: "Oromia", active: false },
  { id: "d3", name: "Dendi Education Office", type: "Woreda Office", code: "DPT-05319", region: "Oromia", active: true },
  { id: "d4", name: "Bako Tibe Agriculture", type: "Woreda Office", code: "DPT-05320", region: "Oromia", active: true },
  { id: "d5", name: "Dedo Water Office", type: "Woreda Office", code: "DPT-05321", region: "Oromia", active: false },
  { id: "d6", name: "Kobo Finance Office", type: "Woreda Office", code: "DPT-05322", region: "Amhara", active: true },
  { id: "d7", name: "Dubti Trade Office", type: "Woreda Office", code: "DPT-05323", region: "Afar", active: true },
  { id: "d8", name: "Awbare Revenue Office", type: "Woreda Office", code: "DPT-05324", region: "Somali", active: true },
  { id: "d9", name: "Abobo Land Office", type: "Woreda Office", code: "DPT-05325", region: "Gambela", active: false },
  { id: "d10", name: "Bullen Roads Office", type: "Woreda Office", code: "DPT-05326", region: "Benishangul-Gumuz", active: true },
  { id: "d11", name: "Ministry of Agriculture", type: "Federal Ministry", code: "DPT-05327", region: "Federal", active: true },
  { id: "d12", name: "Ministry of Water and Energy", type: "Federal Ministry", code: "DPT-05328", region: "Federal", active: true },
  { id: "d13", name: "Oromia Agriculture Bureau", type: "Regional Bureau", code: "DPT-05329", region: "Oromia", active: true },
  { id: "d14", name: "Amhara Agriculture Bureau", type: "Regional Bureau", code: "DPT-05330", region: "Amhara", active: true },
  { id: "d15", name: "Tigray Agriculture Bureau", type: "Regional Bureau", code: "DPT-05331", region: "Tigray", active: false },
  { id: "d16", name: "SNNP Livestock Bureau", type: "Regional Bureau", code: "DPT-05332", region: "SNNP", active: true },
  { id: "d17", name: "West Shewa Zone Office", type: "Zone Office", code: "DPT-05333", region: "Oromia", active: true },
  { id: "d18", name: "East Gojjam Zone Office", type: "Zone Office", code: "DPT-05334", region: "Amhara", active: true },
  { id: "d19", name: "Guji Zone Office", type: "Zone Office", code: "DPT-05335", region: "Oromia", active: false },
  { id: "d20", name: "Jimma Cooperative Office", type: "Woreda Office", code: "DPT-05336", region: "Oromia", active: true },
  { id: "d21", name: "Sidama Extension Office", type: "Zone Office", code: "DPT-05337", region: "Sidama", active: true },
  { id: "d22", name: "Gode Pastoral Office", type: "Woreda Office", code: "DPT-05338", region: "Somali", active: true },
  { id: "d23", name: "Hawassa Market Office", type: "Woreda Office", code: "DPT-05339", region: "Sidama", active: true },
  { id: "d24", name: "Mekelle Irrigation Office", type: "Woreda Office", code: "DPT-05340", region: "Tigray", active: false },
];

// Fills the directory out to 100 rows so the pager shows 1 2 3 … 10, like a real national list.
const EXTRA_WOREDAS = ["Gimbi", "Nekemte", "Adama", "Bishoftu", "Debre Birhan", "Bahir Dar", "Gondar", "Dessie", "Semera", "Jijiga", "Gambela", "Assosa", "Wolaita Sodo", "Arba Minch", "Dilla", "Shashemene", "Harar", "Dire Dawa", "Axum", "Adigrat"];
const EXTRA_OFFICES = ["Agriculture Office", "Livestock Office", "Cooperative Office", "Extension Office", "Irrigation Office"];
const EXTRA_REGIONS = ["Oromia", "Oromia", "Oromia", "Oromia", "Oromia", "Amhara", "Amhara", "Amhara", "Afar", "Somali", "Gambela", "Benishangul-Gumuz", "SNNP", "SNNP", "Sidama", "Sidama", "Oromia", "Somali", "Tigray", "Tigray"];

DEPARTMENTS.push(
  ...Array.from({ length: 100 - DEPARTMENTS.length }, (_, i): Department => {
    const n = DEPARTMENTS.length + i + 1;
    return {
      id: `d${n}`,
      name: `${EXTRA_WOREDAS[i % EXTRA_WOREDAS.length]} ${EXTRA_OFFICES[i % EXTRA_OFFICES.length]}`,
      type: "Woreda Office",
      code: `DPT-${String(5316 + n).padStart(5, "0")}`,
      region: EXTRA_REGIONS[i % EXTRA_REGIONS.length],
      active: i % 5 !== 3,
    };
  }),
);

export const REGION_OPTIONS = ["Federal", "Oromia", "Amhara", "Tigray", "Afar", "Somali", "SNNP", "Sidama", "Gambela", "Benishangul-Gumuz"];

export const DEFAULT_ROLE_NAMES = ["Development Agent", "Supervisor", "Admin", "Super Admin", "Communication Officer"] as const;
export type RoleName = (typeof DEFAULT_ROLE_NAMES)[number];

export interface SuperAdminUser {
  id: string;
  name: string;
  /** Generated, never typed: USR-ET-0001. */
  code: string;
  role: RoleName;
  region: string;
  zone: string;
  woreda: string;
  kebele: string;
  active: boolean;
  dob: string;
  gender: "Male" | "Female";
  email: string;
  mobile: string;
  /** Department name, one of DEPARTMENTS. */
  department: string;
  departmentType: DepartmentType;
  /** Services the user can work in, from SERVICES. */
  service: string[];
  /** Registries and catalogues the user can access, from REGISTRIES. */
  registry: string[];
  /** Entities ticked under the chosen registries (see REGISTRY_ENTITIES). */
  entities: string[];
}

export const GENDERS = ["Male", "Female"] as const;
export const SERVICES = ["DA Service", "Agricultural Extension", "Livestock Health", "Crop Advisory", "Market Linkage", "Irrigation Support", "Input Supply"];
export const REGISTRIES = ["Livestock", "Farmer Registry", "Agent Registry", "Land Registry", "Livestock Catalogue", "Crop Catalogue", "Input Catalogue"];

/** Entities each registry or catalogue holds; the user form lists these once the registry is ticked. Names are unique across registries. */
export const REGISTRY_ENTITIES: Record<string, string[]> = {
  Livestock: ["Cattle", "Sheep", "Goat", "Poultry"],
  "Farmer Registry": ["Farmer Profile", "Household", "Farm Plot", "Cooperative Membership"],
  "Agent Registry": ["Agent Profile", "Training Record", "Assignment"],
  "Land Registry": ["Land Holding", "Plot Boundary", "Land Certificate"],
  "Livestock Catalogue": ["Breed", "Vaccine", "Feed"],
  "Crop Catalogue": ["Crop", "Variety", "Season"],
  "Input Catalogue": ["Seed", "Fertilizer", "Pesticide"],
};

/** Region → zone → woredas, for the cascading Coverage dropdowns. Every kebele is "Kebele 01" … "Kebele 12". */
export const GEOGRAPHY: Record<string, Record<string, string[]>> = {
  Oromia: { Shewa: ["Bako"], "West Shewa": ["Ambo", "Dendi", "Bako Tibe"], "East Shewa": ["Adama"], Jimma: ["Dedo"] },
  Amhara: { "North Wollo": ["Kobo"], "East Gojjam": ["Debre Markos"] },
  Afar: { "Zone 1": ["Dubti"] },
  Somali: { Fafan: ["Awbare"], Shabelle: ["Gode"] },
  Gambela: { Anywaa: ["Abobo"] },
  "Benishangul-Gumuz": { Metekel: ["Bullen"] },
  Tigray: { "Central Tigray": ["Axum"] },
  SNNP: { Gurage: ["Wolkite"] },
  Sidama: { "Sidama Zone": ["Hawassa"] },
};
export const KEBELES = Array.from({ length: 12 }, (_, i) => `Kebele ${String(i + 1).padStart(2, "0")}`);

/** "Oromia → West Shewa → Ambo → Kebele 01": the area a user acts within, widest first. */
export const coverageOf = (u: Pick<SuperAdminUser, "region" | "zone" | "woreda" | "kebele">) =>
  [u.region, u.zone, u.woreda, u.kebele].filter(Boolean).join(" → ");

// Personal, department and service details are derived from the row number, so every mock user is complete.
const user = (n: number, name: string, role: RoleName, region: string, zone: string, woreda: string, kebele: string, active: boolean): SuperAdminUser => {
  const dept = DEPARTMENTS[((n - 1) * 3) % DEPARTMENTS.length];
  return {
    id: `u${n}`,
    name,
    code: `USR-ET-${String(n).padStart(4, "0")}`,
    role,
    region,
    zone,
    woreda,
    kebele,
    active,
    dob: `${1980 + ((n * 7 + 12) % 25)}-${String(1 + ((n * 5) % 12)).padStart(2, "0")}-${String(1 + ((n * 23) % 28)).padStart(2, "0")}`,
    gender: n % 2 === 1 ? "Female" : "Male",
    email: `${name.toLowerCase().replace(/[^a-z]+/g, "")}@gmail.com`,
    mobile: `+251 011 ${231 + n * 3} ${5675 + n * 3}`,
    department: dept.name,
    departmentType: dept.type,
    service: [SERVICES[(n - 1) % SERVICES.length]],
    registry: [REGISTRIES[(n - 1) % REGISTRIES.length]],
    entities: REGISTRY_ENTITIES[REGISTRIES[(n - 1) % REGISTRIES.length]],
  };
};

export const SA_USERS: SuperAdminUser[] = [
  user(1, "Abebe Kebede", "Development Agent", "Oromia", "Shewa", "Bako", "Kebele 01", true),
  user(2, "Almaz Tesfaye", "Supervisor", "Oromia", "West Shewa", "Ambo", "Kebele 01", false),
  user(3, "Dawit Bekele", "Admin", "Oromia", "West Shewa", "Dendi", "Kebele 02", true),
  user(4, "Hana Tadesse", "Super Admin", "Oromia", "West Shewa", "Bako Tibe", "Kebele 03", true),
  user(5, "Chala Gemechu", "Communication Officer", "Oromia", "Jimma", "Dedo", "Kebele 04", false),
  user(6, "Meron Getachew", "Development Agent", "Amhara", "North Wollo", "Kobo", "Kebele 05", true),
  user(7, "Tigist Alemu", "Supervisor", "Afar", "Zone 1", "Dubti", "Kebele 06", true),
  user(8, "Ahmed Mohammed", "Admin", "Somali", "Fafan", "Awbare", "Kebele 07", true),
  user(9, "Lemlem Gebre", "Super Admin", "Gambela", "Anywaa", "Abobo", "Kebele 08", false),
  user(10, "Biftu Daba", "Communication Officer", "Benishangul-Gumuz", "Metekel", "Bullen", "Kebele 09", true),
];

// Fills the directory out to 100 rows so the pager shows 1 2 3 … 10.
const EXTRA_NAMES = ["Selam Bekele", "Yonas Haile", "Liya Mengistu", "Abel Worku", "Meseret Fikre", "Biruk Tadesse", "Kidist Assefa", "Henok Girma", "Rahel Demissie", "Samuel Tsegaye"];
const EXTRA_AREAS: [string, string, string][] = [["Oromia", "East Shewa", "Adama"], ["Amhara", "East Gojjam", "Debre Markos"], ["Tigray", "Central Tigray", "Axum"], ["SNNP", "Gurage", "Wolkite"], ["Sidama", "Sidama Zone", "Hawassa"], ["Somali", "Shabelle", "Gode"]];
const EXTRA_ROLES: RoleName[] = ["Development Agent", "Development Agent", "Supervisor", "Supervisor", "Development Agent", "Communication Officer", "Admin"];

SA_USERS.push(
  ...Array.from({ length: 100 - SA_USERS.length }, (_, i) => {
    const n = SA_USERS.length + i + 1;
    const [region, zone, woreda] = EXTRA_AREAS[i % EXTRA_AREAS.length];
    return user(n, `${EXTRA_NAMES[i % EXTRA_NAMES.length]}${i >= EXTRA_NAMES.length ? ` ${Math.floor(i / EXTRA_NAMES.length) + 1}` : ""}`, EXTRA_ROLES[i % EXTRA_ROLES.length], region, zone, woreda, `Kebele ${String((i % 12) + 1).padStart(2, "0")}`, i % 4 !== 2);
  }),
);

export const PERMISSION_ACTIONS = ["read", "write", "edit", "delete"] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
export type PermissionSet = Record<PermissionAction, boolean>;

/** The modules a role's Read / Write / Edit / Delete access is set for. */
export const PERMISSION_MODULES = ["Farmer Registry", "Agent Registry", "Lifecycle Management", "Training", "Reviews"];

/** Roles that can be added from the Add Role dropdown (the ones already in the directory are left out). */
export const ROLE_CATALOGUE = [...DEFAULT_ROLE_NAMES, "Executive", "Auditor", "Registry Officer", "Field Coordinator", "Data Entry Operator"];

export interface SuperAdminRole {
  id: string;
  name: string;
  active: boolean;
  permissions: Record<string, PermissionSet>;
}

export const emptyPermissions = (): Record<string, PermissionSet> =>
  Object.fromEntries(PERMISSION_MODULES.map((m) => [m, { read: false, write: false, edit: false, delete: false }]));

const grant = (actions: readonly PermissionAction[]): Record<string, PermissionSet> =>
  Object.fromEntries(PERMISSION_MODULES.map((m) => [m, { read: actions.includes("read"), write: actions.includes("write"), edit: actions.includes("edit"), delete: actions.includes("delete") }]));

const SEED_ACCESS: Record<RoleName, readonly PermissionAction[]> = {
  "Development Agent": ["read", "write"],
  Supervisor: ["read", "write", "edit"],
  Admin: ["read", "write", "edit", "delete"],
  "Super Admin": ["read", "write", "edit", "delete"],
  "Communication Officer": ["read"],
};

export const SA_ROLES: SuperAdminRole[] = DEFAULT_ROLE_NAMES.map((name, i) => ({ id: `r${i + 1}`, name, active: true, permissions: grant(SEED_ACCESS[name]) }));

export const SA_STATS = {
  departments: DEPARTMENTS.length,
  activeDepartments: DEPARTMENTS.filter((d) => d.active).length,
  users: SA_USERS.length,
  roles: SA_ROLES.length,
};

export const RECENT_SA_ACTIVITY = [
  { id: "a1", text: "Department “Guji Zone Office” was deactivated", by: "Tadesse Alemu", when: "Today, 09:12" },
  { id: "a2", text: "Role “Supervisor” assigned to Biruk Tadesse", by: "Tadesse Alemu", when: "Yesterday, 16:40" },
  { id: "a3", text: "Department “Hawassa Market Office” was created", by: "Tadesse Alemu", when: "Yesterday, 11:05" },
  { id: "a4", text: "User Hana Girma was set inactive", by: "Yonas Haile", when: "24 Oct 2026" },
  { id: "a5", text: "Permissions for “Communication Officer” were reviewed", by: "Tadesse Alemu", when: "22 Oct 2026" },
];
