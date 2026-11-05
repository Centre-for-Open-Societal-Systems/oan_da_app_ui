import { describe, expect, it } from "vitest";
import { choicesFor, labelOf } from "./fields";

describe("choicesFor", () => {
  it("prefers the registry's list", () => {
    const gender = [{ value: "GENDER_F", label: "Female" }];
    expect(choicesFor({ Farmer: { gender } }, "gender")).toEqual(gender);
  });

  it("keeps gender, marital status and education selectable without the registry", () => {
    expect(choicesFor(null, "gender")?.map((o) => o.value)).toEqual(["male", "female"]);
    expect(choicesFor(null, "marital_status")?.length).toBeGreaterThan(0);
    expect(choicesFor({}, "education_level")?.length).toBeGreaterThan(0);
  });

  it("has no fallback for other lists", () => {
    expect(choicesFor(null, "crop")).toBeUndefined();
  });

  it("labels a fallback value for the review", () => {
    expect(labelOf(null, "gender", "male")).toBe("Male");
  });
});
