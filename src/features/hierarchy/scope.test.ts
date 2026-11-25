import { describe, expect, it } from "vitest";
import { EMPLOYEE_TREE, WOREDA_TEAMS, agentsUnder, chainTo, employeeMatches, teamOfKebele } from "./data";
import { canEditStructure, canManageTeams, chainAbove, selfIn, teamsModeFor, treeRootFor, woredasFor } from "./scope";

describe("employee tree by role", () => {
  it("shows Admin and Comms everyone", () => {
    expect(treeRootFor("Admin").id).toBe(EMPLOYEE_TREE.id);
    expect(treeRootFor("CommsOfficer").id).toBe(EMPLOYEE_TREE.id);
  });

  it("starts an Executive at their region, matched by the region on their login", () => {
    expect(treeRootFor("Executive", { region: "Amhara" }).name).toBe("Yohannes Tesfaye");
    expect(treeRootFor("Executive").name).toBe("Kenenisa Bekele");
  });

  it("starts a Supervisor at their woreda head", () => {
    expect(treeRootFor("Supervisor", { name: "Girma Wolde" }).name).toBe("Fatuma Ali");
    expect(treeRootFor("Supervisor").name).toBe("Abdi Mohammed");
  });

  it("shows a DA their supervisor's team, with themselves in it", () => {
    const root = treeRootFor("DA", { kebele: "Gedo" });
    expect(root.name).toBe("Dereje Tadesse");
    expect(selfIn("DA", { kebele: "Gedo" })?.name).toBe("Meseret Alemu");
    expect(chainAbove(root).map((e) => e.name)).toEqual(["Mulugeta Haile", "Kenenisa Bekele", "Abdi Mohammed"]);
  });

  it("counts agents and searches down the tree", () => {
    expect(agentsUnder(chainTo("abdi").at(-1)!)).toBe(7);
    expect(employeeMatches(EMPLOYEE_TREE, "tulu sangota")).toBe(true);
    expect(employeeMatches(EMPLOYEE_TREE, "nobody")).toBe(false);
  });
});

describe("teams by role", () => {
  it("shows a DA their own team, a Supervisor their woreda, and lets the others browse", () => {
    expect(teamsModeFor("DA")).toBe("own");
    expect(teamsModeFor("Supervisor")).toBe("woreda");
    for (const r of ["Admin", "Executive", "CommsOfficer"] as const) expect(teamsModeFor(r)).toBe("browse");
  });

  it("lets only the Supervisor and Admin manage teams, and only the Admin edit the structure", () => {
    expect(canManageTeams("Supervisor")).toBe(true);
    expect(canManageTeams("Admin")).toBe(true);
    expect(canManageTeams("Executive")).toBe(false);
    expect(canManageTeams("DA")).toBe(false);
    expect(canEditStructure("Admin")).toBe(true);
    expect(canEditStructure("Supervisor")).toBe(false);
  });

  it("limits the woredas to the role's scope", () => {
    expect(woredasFor("Admin").length).toBeGreaterThan(1);
    expect(woredasFor("Executive", { region: "Amhara" }).map((w) => w.name)).toEqual(["Bahir Dar Zuria"]);
    expect(woredasFor("Supervisor", { name: "Girma Wolde" }).map((w) => w.name)).toEqual(["Ambo"]);
    expect(woredasFor("DA").map((w) => w.name)).toEqual(["Bako Tibe"]);
  });

  it("puts a DA in the team holding their kebele", () => {
    expect(teamOfKebele(WOREDA_TEAMS[0].teams, "gedo")?.name).toBe("Team South");
    expect(teamOfKebele(WOREDA_TEAMS[0].teams, "Unknown")?.name).toBe("Team North");
  });
});
