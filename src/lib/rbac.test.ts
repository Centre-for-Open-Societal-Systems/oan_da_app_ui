import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NAV_GROUPS, ROLES, navForRole, pageTitleFor, type Role } from "./rbac";

const hrefsFor = (role: Role) => navForRole(role).flatMap((g) => g.items.map((i) => i.href));
const allItems = NAV_GROUPS.flatMap((g) => g.items);

describe("navForRole", () => {
  it("gives every role the Dashboard", () => {
    for (const role of ROLES) expect(hrefsFor(role)).toContain("/dashboard");
  });

  it("is deny-by-default: a role sees exactly the items that list it", () => {
    for (const role of ROLES) {
      const expected = allItems.filter((i) => i.roles.includes(role)).map((i) => i.href).sort();
      expect([...hrefsFor(role)].sort()).toEqual(expected);
    }
  });

  it("keeps admin-only pages away from every other role", () => {
    for (const role of ROLES.filter((r) => r !== "Admin")) {
      expect(hrefsFor(role)).not.toContain("/admin/users");
      expect(hrefsFor(role)).not.toContain("/admin/settings");
      expect(hrefsFor(role)).not.toContain("/approvals");
      expect(hrefsFor(role)).not.toContain("/registry-sync");
    }
  });

  it("gives the DA no officer-only areas", () => {
    const da = hrefsFor("DA");
    for (const href of ["/agents", "/assignments", "/visits", "/admin/reports"]) expect(da).not.toContain(href);
  });

  it("lets the DA broadcast to their farmers", () => {
    expect(navForRole("DA").find((g) => g.title === "Communication")?.items.map((i) => i.href)).toContain("/broadcast");
  });

  it("shows My Teams to the DA only, under Agent Registry", () => {
    expect(navForRole("DA").find((g) => g.title === "Agent Registry")?.items.map((i) => i.href)).toContain("/my-teams");
    for (const role of ROLES.filter((r) => r !== "DA")) expect(hrefsFor(role)).not.toContain("/my-teams");
  });

  it("drops groups with nothing visible", () => {
    for (const role of ROLES) for (const g of navForRole(role)) expect(g.items.length).toBeGreaterThan(0);
  });

  it("puts Agent Registry right after the Dashboard for Admin only", () => {
    expect(navForRole("Admin").map((g) => g.title).slice(0, 3)).toEqual(["", "Agent Registry", "Farmer Management"]);
    expect(navForRole("Supervisor").map((g) => g.title)[1]).toBe("Farmer Management");
  });

  it("does not mutate NAV_GROUPS", () => {
    const before = JSON.stringify(NAV_GROUPS);
    for (const role of ROLES) navForRole(role);
    expect(JSON.stringify(NAV_GROUPS)).toBe(before);
  });
});

describe("NAV_GROUPS", () => {
  it("has unique hrefs", () => {
    const hrefs = allItems.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("has a page for every enabled (Part 1 / shared) item", () => {
    const dashboard = join(__dirname, "..", "app", "(dashboard)");
    for (const item of allItems.filter((i) => i.part !== 2)) {
      expect(existsSync(join(dashboard, item.href, "page.tsx")), `${item.href} has no page.tsx`).toBe(true);
    }
  });
});

describe("pageTitleFor", () => {
  it.each([
    ["/dashboard", "Dashboard"],
    ["/farmers", "My Farmers"],
    ["/farmers/new", "Farmer Registration"],
    ["/farmers/f-1", "Farmer Profile"],
    ["/farmers/f-1/services", "Farmer Services"],
    ["/visits/v-1/outcome", "Visit Outcome"],
    ["/visits/v-1", "Visit Planner"],
    ["/agents/daid", "Agents"],
    ["/agents/fayda", "Agents"],
    ["/registry-sync", "Agents"],
    ["/agents/a-7", "DA Profile"],
    ["/performance/kpi-entry", "KPI Entry"],
    ["/admin/users", "Users & Roles"],
    ["/my-teams", "My Teams"],
    ["/performance/teams", "My Teams"],
    ["/notifications", "Notifications"],
    ["/404-error", "Page not found"],
    ["/nowhere", "Dashboard"],
  ])("%s → %s", (path, title) => {
    expect(pageTitleFor(path)).toBe(title);
  });
});
