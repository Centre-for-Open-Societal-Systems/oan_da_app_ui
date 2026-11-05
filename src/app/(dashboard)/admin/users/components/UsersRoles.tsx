"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdvancedFiltersButton } from "@/components/ui/AdvancedFiltersButton";
import { RowAction } from "@/components/ui/RowAction";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pill, type PillTone } from "@/components/ui/Pill";
import { Banner } from "@/components/ui/Banner";
import { SearchInput } from "@/components/ui/SearchInput";
import { SegmentTabs } from "@/components/ui/SegmentTabs";
import { FilterDropdown, type FilterOption } from "@/components/ui/FilterDropdown";
import { AdvancedFiltersDrawer, type FilterFieldConfig, type FilterSelection } from "@/components/ui/AdvancedFiltersDrawer";
import { areaLabel, areaNameMap, loadScopeAreas } from "@/features/assignments";
import { createRbacAssignment, generatePassword, isAssignableRole, listRbacAssignments, registerUser, revokeRbacAssignment, toPortalRoleFromBackend, updateRbacAssignment, type RbacAssignmentRecord } from "@/features/users";
import { ApiError } from "@/lib/api";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/rbac";
import { matchesQuery, searchPlaceholder } from "@/lib/search";
import { useAuthStore } from "@/store/useAuthStore";
import { UserFormModal, parseDisplayDate, type UserFormValues } from "./UserFormModal";

// §5 RBAC assignment: user_id, role, active, region_scope, woreda_scope, effective_from/to, assigned_by.
interface RbacAssignment {
  /** Backend assignment id (e.g. "DA-RBAC-00111"); absent on the sample rows. */
  assignmentId?: string;
  userId: string;
  name: string;
  faydaId: string;
  phone: string;
  email: string;
  role: Role;
  daId: string;
  active: boolean;
  regionScope: string;
  woredaScope: string;
  effectiveFrom: string;
  effectiveTo: string;
  assignedBy: string;
}

const USERS: RbacAssignment[] = [
  { userId: "U-1001", name: "Tadesse Alemu", faydaId: "3512 4498 7712", phone: "+251 91 234 5678", email: "tadesse.alemu@gmail.com", role: "DA", daId: "", active: true, regionScope: "Oromia", woredaScope: "Bako Tibe", effectiveFrom: "12 Mar 2019", effectiveTo: "—", assignedBy: "System (onboarding)" },
  { userId: "U-1002", name: "Kebede Alemu", faydaId: "3512 7733 1188", phone: "+251 92 771 9080", email: "kebede.alemu@gmail.com", role: "Supervisor", daId: "", active: true, regionScope: "Oromia", woredaScope: "Bako Tibe", effectiveFrom: "01 Jan 2024", effectiveTo: "—", assignedBy: "Yonas Haile (Admin)" },
  { userId: "U-1003", name: "Almaz Tesfaye", faydaId: "3512 2201 8843", phone: "+251 91 300 4412", email: "almaz.tesfaye@gmail.com", role: "CommsOfficer", daId: "", active: true, regionScope: "Oromia", woredaScope: "Bako Tibe", effectiveFrom: "15 May 2025", effectiveTo: "—", assignedBy: "Yonas Haile (Admin)" },
  { userId: "U-1004", name: "Getachew Bekele", faydaId: "3512 9910 3321", phone: "+251 91 900 1234", email: "getachew.bekele@gmail.com", role: "Executive", daId: "", active: true, regionScope: "Oromia", woredaScope: "All (read)", effectiveFrom: "01 Jul 2023", effectiveTo: "—", assignedBy: "Yonas Haile (Admin)" },
  { userId: "U-1005", name: "Yonas Haile", faydaId: "3512 1188 5544", phone: "+251 91 555 0101", email: "yonas.haile@gmail.com", role: "Admin", daId: "", active: true, regionScope: "All regions", woredaScope: "All", effectiveFrom: "01 Jan 2023", effectiveTo: "—", assignedBy: "ATI root" },
  { userId: "U-1006", name: "Dawit Assefa", faydaId: "3512 2299 7710", phone: "+251 91 780 2231", email: "dawit.assefa@gmail.com", role: "DA", daId: "", active: false, regionScope: "Oromia", woredaScope: "Cheliya", effectiveFrom: "02 May 2016", effectiveTo: "30 Jun 2026", assignedBy: "System (separation)" },
];

const ROLE_TONE: Record<Role, PillTone> = { DA: "green", Supervisor: "blue", Executive: "purple", Admin: "red", CommsOfficer: "amber", SuperAdmin: "red" };

const PERMISSIONS: { role: Role; can: string; cannot: string }[] = [
  { role: "DA", can: "Own profile; self-service (approval-gated); field capture; linked farmers; raise/track grievances; report issues; complete surveys", cannot: "Approve onboarding/lifecycle; assign agents; edit segment rules; KPI entry; executive dashboards; triage grievances; resolve issues" },
  { role: "Supervisor", can: "Approve/reject onboarding & lifecycle; assign/reassign agents; team KPIs; all team visits; internal-issue queue", cannot: "Cross-Woreda edits; admin of users/roles/master data; edit KPI governance formulas" },
  { role: "Executive", can: "Read regional roll-ups, SLA, reports; drill down to DA detail", cannot: "Any edit; approvals; assignments; identity changes" },
  { role: "Admin", can: "Users/roles/scopes; routing & sync config; master data; audit; KPI governance", cannot: "Delete immutable audit records; act outside the audit trail" },
  { role: "CommsOfficer", can: "Alert inbox; craft/dispatch broadcasts; knowledge dissemination", cannot: "DA identity edits; approvals; assignments" },
];

type Tab = "users" | "matrix";

const SEARCH_PLACEHOLDER = searchPlaceholder(["User", "Role", "Scope", "Active", "Effective", "Assigned by"]);

const optionsOf = (values: string[], order?: readonly string[], label?: (v: string) => string): FilterOption[] =>
  (order ?? [...new Set(values)]).map((value) => ({ value, label: label ? label(value) : value, count: values.filter((v) => v === value).length }));

const formatIso = (iso: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");

/** A backend assignment as a table row. The record carries the user id only (no name, phone or Fayda id), so that id is the name. */
function toRow(r: RbacAssignmentRecord): RbacAssignment | null {
  const role = toPortalRoleFromBackend(r.role);
  if (!role) return null;
  return {
    assignmentId: r.name,
    userId: r.user,
    name: r.user,
    faydaId: "",
    phone: "",
    email: r.user.includes("@") && !r.user.endsWith(".internal") ? r.user : "",
    role,
    daId: r.da_id ?? "",
    active: !!r.active,
    regionScope: r.region_scope ?? "",
    woredaScope: r.woreda_scope ?? "",
    effectiveFrom: formatIso(r.effective_from),
    effectiveTo: formatIso(r.effective_to),
    assignedBy: r.assigned_by,
  };
}

const activeLabel = (u: RbacAssignment) => (u.active ? "Active" : "Inactive");

interface UserFilters extends FilterSelection {
  role: Set<string>;
  active: Set<string>;
  region: Set<string>;
  scope: Set<string>;
}
const EMPTY: UserFilters = { role: new Set(), active: new Set(), region: new Set(), scope: new Set() };

export function UsersRoles() {
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState(USERS);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<RbacAssignment | null>(null);
  const [notice, setNotice] = useState<ReactNode>(null);
  const [adding, setAdding] = useState(false);
  // Account registered but its role not yet assigned (the second call failed). Saving again reuses it
  // instead of registering the same email twice, which the backend rejects.
  const registered = useRef<{ email: string; userId: string; password: string } | null>(null);
  const hasBackendSession = useAuthStore((s) => !!s.tokens);
  const [loadNote, setLoadNote] = useState<{ tone: "warning" | "info"; text: string } | null>(null);

  // With a backend sign-in the table is GET /rbac-assignments; without one, or if the call fails, it keeps the sample rows.
  useEffect(() => {
    if (!hasBackendSession) return;
    let current = true;
    listRbacAssignments()
      .then(({ items }) => {
        if (!current) return;
        const rows = items.map(toRow).filter((r): r is RbacAssignment => !!r);
        setUsers(rows);
        setLoadNote(rows.length < items.length ? { tone: "info", text: `${items.length - rows.length} assignment(s) with a role this portal does not use were left out.` } : null);
      })
      .catch((err) => current && setLoadNote({ tone: "warning", text: `${err instanceof Error ? err.message : "Could not load users."} Showing sample data.` }));
    return () => {
      current = false;
    };
  }, [hasBackendSession]);
  // Scopes are stored as area-master codes; the names make the table readable. Older rows that hold a name show as is.
  const [areaNames, setAreaNames] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!hasBackendSession) return;
    let current = true;
    loadScopeAreas()
      .then((areas) => current && setAreaNames(areaNameMap(areas)))
      .catch(() => {
        // Codes stay visible on their own.
      });
    return () => {
      current = false;
    };
  }, [hasBackendSession]);
  const scopeText = (code: string) => areaLabel(areaNames, code);
  const signedInName = `${useAuthStore((s) => s.user?.name) ?? "Admin"} (Admin)`;
  const [filters, setFilters] = useState<UserFilters>(EMPTY);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const activeFilterCount = Object.values(filters).filter((set) => set.size > 0).length;
  const setFilter = (key: keyof UserFilters) => (next: Set<string>) => setFilters((prev) => ({ ...prev, [key]: next }));

  const roleOptions = optionsOf(users.map((u) => u.role), ROLES, (r) => ROLE_LABELS[r as Role]);
  const activeOptions = optionsOf(users.map(activeLabel), ["Active", "Inactive"]);
  const regionOptions = optionsOf(users.map((u) => u.regionScope), undefined, scopeText);
  const scopeOptions = optionsOf(users.map((u) => u.woredaScope), undefined, scopeText);
  const filterFields: FilterFieldConfig[] = [
    { key: "role", label: "Role", allLabel: "All roles", placeholder: "All Roles", options: roleOptions },
    { key: "active", label: "Active", allLabel: "All users", placeholder: "All", options: activeOptions },
    { key: "region", label: "Region scope", allLabel: "All regions", placeholder: "All Regions", options: regionOptions },
    { key: "scope", label: "Woreda scope", allLabel: "All woreda scopes", placeholder: "All Woreda Scopes", options: scopeOptions },
  ];

  // Add user = two backend calls from one form: register the account with a generated password, then
  // bind its role and scope with an RBAC assignment. Throwing keeps the form open with the message.
  const addUser = async (draft: UserFormValues) => {
    if (!hasBackendSession) throw new Error("Adding users needs a backend sign-in. Sign out, then sign in with your Administrator account.");
    if (!isAssignableRole(draft.role)) throw new Error(`${ROLE_LABELS[draft.role]} cannot be assigned from here.`);
    const role = draft.role;

    const effectiveTo = parseDisplayDate(draft.effectiveTo);
    const newUser = {
      fullName: draft.name,
      email: draft.email,
      password: generatePassword(),
      role,
      daId: draft.daId,
      regionScope: draft.regionScope,
      // Region-wide roles carry no Woreda (the form gives "").
      woredaScope: draft.woredaScope || undefined,
      effectiveFrom: parseDisplayDate(draft.effectiveFrom),
      effectiveTo: effectiveTo || undefined,
    };

    // A staff (SSO) account already exists: its first sign-in created it, so only the role and scope are assigned.
    if (draft.existingUserId) {
      const userId = draft.existingUserId;
      let assignment: RbacAssignmentRecord;
      try {
        assignment = await createRbacAssignment(userId, newUser);
      } catch (err) {
        const reason = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
        throw new Error(`${reason} If the account was not found, ask the user to sign in once with their staff account, then save again.`);
      }
      setUsers((prev) => [{ assignmentId: assignment.name, userId, faydaId: "", ...draft, name: draft.name || userId, active: true, assignedBy: signedInName }, ...prev]);
      setAdding(false);
      setTab("users");
      setNotice(`${draft.name || userId} assigned ${ROLE_LABELS[role]} · ${scopeText(draft.woredaScope || draft.regionScope)}. They sign in with their staff account; the role applies at their next sign-in.`);
      return;
    }

    let account = registered.current?.email === draft.email ? registered.current : null;
    let assignment: RbacAssignmentRecord | undefined;
    try {
      if (!account) {
        const userId = await registerUser(newUser);
        account = registered.current = { email: draft.email, userId, password: newUser.password };
      }
      assignment = await createRbacAssignment(account.userId, newUser);
    } catch (err) {
      const reason = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
      throw new Error(account ? `The account for ${draft.email} was created, but its role could not be assigned: ${reason} Fix the details and save again; the account will not be created twice.` : reason);
    }

    registered.current = null;
    const { userId, password } = account;
    // Fayda linking happens at first sign-in, so a new account starts without one
    setUsers((prev) => [{ assignmentId: assignment?.name, userId, faydaId: "", ...draft, active: true, assignedBy: signedInName }, ...prev]);
    setAdding(false);
    setTab("users");
    setNotice(
      <>
        {draft.name} added as {ROLE_LABELS[role]} · {scopeText(draft.woredaScope || draft.regionScope)}. They sign in with <span className="font-semibold">{draft.email}</span> and the temporary password{" "}
        <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-[13px] font-semibold">{password}</code>{" "}
        <button type="button" onClick={() => void navigator.clipboard?.writeText(password)} className="font-semibold underline underline-offset-2 hover:no-underline">Copy</button>
        . Share it with them now; it is not shown again.
      </>,
    );
  };

  const rows = users.filter(
    (u) =>
      (filters.role.size === 0 || filters.role.has(u.role)) &&
      (filters.active.size === 0 || filters.active.has(activeLabel(u))) &&
      (filters.region.size === 0 || filters.region.has(u.regionScope)) &&
      (filters.scope.size === 0 || filters.scope.has(u.woredaScope)) &&
      matchesQuery(query, u, ROLE_LABELS[u.role], activeLabel(u)),
  );

  // A backend row is saved with PATCH (scope, dates) and, when set Inactive, revoke. A sample row only changes locally.
  const saveEdit = async (values: UserFormValues) => {
    if (!editing) return;
    let saved: Partial<RbacAssignment> = {};
    if (editing.assignmentId) {
      if (values.role !== editing.role) throw new Error("A role change is a new assignment. Add the user again with the new role, then set this one Inactive.");
      if (values.active && !editing.active) throw new Error("A revoked assignment cannot be switched back on. Add a new assignment instead.");
      try {
        let record = await updateRbacAssignment(editing.assignmentId, {
          ...(values.regionScope && { region_scope: values.regionScope }),
          ...(values.woredaScope && { woreda_scope: values.woredaScope }),
          ...(parseDisplayDate(values.effectiveFrom) && { effective_from: parseDisplayDate(values.effectiveFrom) }),
          ...(parseDisplayDate(values.effectiveTo) && { effective_to: parseDisplayDate(values.effectiveTo) }),
        });
        if (!values.active && editing.active) record = await revokeRbacAssignment(editing.assignmentId);
        saved = toRow(record) ?? {};
      } catch (err) {
        throw new Error(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      }
    }
    setUsers((prev) => prev.map((u) => (u.userId === editing.userId && u.assignmentId === editing.assignmentId ? { ...u, ...values, ...saved, name: u.name, assignedBy: saved.assignedBy ?? "Yonas Haile (Admin)" } : u)));
    setNotice(`${values.name} (${editing.userId}) updated — ${ROLE_LABELS[values.role]} · ${scopeText(values.woredaScope || values.regionScope)} · ${values.active ? "Active" : "Inactive"}. Recorded in the audit log with your identity and timestamp.`);
    setEditing(null);
  };

  const columns: Column<RbacAssignment>[] = [
    { key: "user", header: "User", cell: (u) => <span><span className="font-medium text-ink">{u.name}</span><span className="block font-mono text-[12px] text-muted">{u.userId} · {u.faydaId ? `Fayda ${u.faydaId}` : "Fayda not linked yet"}</span></span> },
    { key: "role", header: <FilterDropdown label="Role" allLabel="All roles" options={roleOptions} selected={filters.role} onApply={setFilter("role")} />, cell: (u) => <Pill tone={ROLE_TONE[u.role]}>{ROLE_LABELS[u.role]}</Pill> },
    { key: "scope", header: <FilterDropdown label="Scope" allLabel="All woreda scopes" options={scopeOptions} selected={filters.scope} onApply={setFilter("scope")} />, cell: (u) => <span className="text-[13px]">{scopeText(u.regionScope)}<span className="block text-[12px] text-muted">{scopeText(u.woredaScope)}</span></span> },
    { key: "active", header: <FilterDropdown label="Active" allLabel="All users" options={activeOptions} selected={filters.active} onApply={setFilter("active")} />, cell: (u) => <Pill tone={u.active ? "green" : "slate"} dot>{u.active ? "Active" : "Inactive"}</Pill> },
    { key: "eff", header: "Effective", cell: (u) => <span className="text-[13px] text-muted">{u.effectiveFrom} → {u.effectiveTo}</span> },
    { key: "by", header: "Assigned by", cell: (u) => <span className="text-[13px] text-muted">{u.assignedBy}</span> },
    { key: "actions", header: "Actions", align: "center", cell: (u) => <RowAction icon="edit" onClick={() => setEditing(u)}>Edit</RowAction> },
  ];

  return (
    <>
      <PageHeader
        tabBar={
          <SegmentTabs<Tab>
            tabs={[{ key: "users", label: "Users", count: users.length }, { key: "matrix", label: "RBAC matrix" }]}
            active={tab}
            onChange={setTab}
          />
        }
        title="Users & Roles"
        description="Cross-region administration of users, roles and Woreda/region scopes (Appendix B/D). Every assignment is audited."
        actions={
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-brand-green px-3.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-green-dark"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add user
        </button>
        }
      />
      {loadNote && <Banner tone={loadNote.tone} onDismiss={() => setLoadNote(null)}>{loadNote.text}</Banner>}
      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}
      <Card className="overflow-hidden p-0 shadow-card">
        {tab === "users" ? (
          <>
            <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold text-ink">Users</h2>
                <p className="mt-0.5 text-[12.5px] text-ink-soft" title="A user acts only within role, active status, Woreda/region scope and function. Visibility does not grant edit rights.">
                  Deny-by-default — access only within role and scope.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:shrink-0">
                <SearchInput value={query} onChange={setQuery} placeholder={SEARCH_PLACEHOLDER} />

                <AdvancedFiltersButton activeCount={activeFilterCount} onClick={() => setIsFiltersOpen(true)} />
              </div>
            </div>
            <DataTable itemLabel="users" columns={columns} rows={rows} rowKey={(u) => u.userId} minWidth="1000px" emptyTitle="No users match the selected filters" emptyHint="Clear a filter or try a different search." />
            <AdvancedFiltersDrawer
              isOpen={isFiltersOpen}
              onClose={() => setIsFiltersOpen(false)}
              fields={filterFields}
              filters={filters}
              onApply={(next) =>
                setFilters({
                  role: next.role ?? new Set(),
                  active: next.active ?? new Set(),
                  region: next.region ?? new Set(),
                  scope: next.scope ?? new Set(),
                })
              }
            />
          </>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-[13.5px]">
              <thead className="border-y border-line bg-surface text-[13px] text-slate-700"><tr><th className="px-4 py-3 font-semibold">Role</th><th className="px-4 py-3 font-semibold">Can</th><th className="px-4 py-3 font-semibold">Cannot (hidden / disabled)</th></tr></thead>
              <tbody>
                {PERMISSIONS.map((p) => (
                  <tr key={p.role} className="border-b border-line-soft align-top">
                    <td className="px-4 py-3"><Pill tone={ROLE_TONE[p.role]}>{ROLE_LABELS[p.role]}</Pill></td>
                    <td className="px-4 py-3 text-ink">{p.can}</td>
                    <td className="px-4 py-3 text-ink-soft">{p.cannot}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {adding && <UserFormModal mode="add" onClose={() => setAdding(false)} onSave={addUser} />}

      {editing && (
        <UserFormModal mode="edit" initial={editing} subtitle={`${editing.name} · ${editing.userId}`} onClose={() => setEditing(null)} onSave={saveEdit} />
      )}
    </>
  );
}
