import { describe, expect, it } from "vitest";
import type { Farmer } from "../types";
import { joinNames, MAX_BATCH_FARMERS, planEach, toggleFarmer } from "./planVisit";

const farmer = (id: string) => ({ id, name: `Farmer ${id}` }) as Farmer;

describe("toggleFarmer", () => {
  it("adds a farmer and removes them on a second toggle", () => {
    const one = toggleFarmer([], farmer("a"));
    expect(one.map((f) => f.id)).toEqual(["a"]);
    expect(toggleFarmer(one, farmer("a"))).toEqual([]);
  });

  it("keeps a full batch at MAX_BATCH_FARMERS but still allows removing", () => {
    const full = Array.from({ length: MAX_BATCH_FARMERS }, (_, i) => farmer(String(i)));
    expect(toggleFarmer(full, farmer("x"))).toBe(full);
    expect(toggleFarmer(full, farmer("0"))).toHaveLength(MAX_BATCH_FARMERS - 1);
  });
});

describe("joinNames", () => {
  it("joins one, two and more names", () => {
    expect(joinNames([])).toBe("");
    expect(joinNames(["A"])).toBe("A");
    expect(joinNames(["A", "B"])).toBe("A and B");
    expect(joinNames(["A", "B", "C"])).toBe("A, B and C");
  });
});

describe("planEach", () => {
  it("plans every farmer in order and reports the failures separately", async () => {
    const calls: string[] = [];
    const out = await planEach([farmer("a"), farmer("b"), farmer("c")], async (f) => {
      calls.push(f.id);
      if (f.id === "b") throw new Error("Farmer not in your scope");
      return { name: `V-${f.id}` };
    });
    expect(calls).toEqual(["a", "b", "c"]);
    expect(out.planned.map((p) => p.visit.name)).toEqual(["V-a", "V-c"]);
    expect(out.failed).toEqual([{ farmer: farmer("b"), reason: "Farmer not in your scope" }]);
  });
});
