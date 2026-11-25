import { describe, expect, it } from "vitest";
import { addDays, ethiopianMonthLength, fromEthiopian, toEthiopian, weekdayOf } from "./ethiopian";

describe("ethiopian calendar", () => {
  it("converts known dates", () => {
    expect(toEthiopian("2026-12-10")).toEqual({ year: 2019, month: 4, day: 1 });
    expect(toEthiopian("2027-01-07")).toEqual({ year: 2019, month: 4, day: 29 });
    expect(toEthiopian("2026-09-11")).toEqual({ year: 2019, month: 1, day: 1 });
    expect(toEthiopian("2027-09-12")).toEqual({ year: 2020, month: 1, day: 1 });
  });

  it("round-trips every day across a leap Pagume", () => {
    for (let iso = "2026-09-11", i = 0; i < 800; iso = addDays(iso, 1), i++) expect(fromEthiopian(toEthiopian(iso))).toBe(iso);
  });

  it("gives Pagume 6 days in a leap year", () => {
    expect(ethiopianMonthLength(2019, 13)).toBe(6);
    expect(ethiopianMonthLength(2020, 13)).toBe(5);
    expect(ethiopianMonthLength(2019, 4)).toBe(30);
  });

  it("finds the weekday", () => {
    expect(weekdayOf("2026-12-14")).toBe(1);
    expect(weekdayOf("2026-12-13")).toBe(0);
  });
});
