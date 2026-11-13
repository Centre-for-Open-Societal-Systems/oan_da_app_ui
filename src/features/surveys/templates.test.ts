import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import { describeSurveyError } from "./api";
import type { SurveyTask } from "./data";
import { templateErrors, templateInputFrom, templatePatch, toTemplateBody, type TemplateInput } from "./templates";

const input = (over: Partial<TemplateInput> = {}): TemplateInput => ({
  name: "Meher season farmer satisfaction",
  type: "Satisfaction",
  open: "2026-11-03",
  close: "2026-11-30",
  languages: ["English", "Amharic"],
  targetFarmers: 20,
  woreda: "ET04-W01",
  assignmentMode: "Woreda",
  assignedDaIds: [],
  questions: [
    { id: 1, prompt: "How useful was the advice?", type: "rating", options: "", required: true, translations: { Amharic: "ምክሩ ምን ያህል ጠቃሚ ነበር?", "Afaan Oromoo": "Gorsa" } },
    { id: 2, prompt: "Did you apply it?", type: "single", options: "Yes fully, Partly, No", required: true, translations: {} },
  ],
  ...over,
});

describe("toTemplateBody", () => {
  it("matches the POST /surveys/templates contract", () => {
    expect(toTemplateBody(input(), "srv-1")).toEqual({
      name: "Meher season farmer satisfaction",
      type: "Satisfaction",
      open: "2026-11-03",
      close: "2026-11-30",
      languages: ["English", "Amharic"],
      targetFarmers: 20,
      // Afaan Oromoo is not a survey language here, so its translation is left out.
      questions: [
        { prompt: "How useful was the advice?", type: "rating", options: "", required: true, translations: { Amharic: "ምክሩ ምን ያህል ጠቃሚ ነበር?" } },
        { prompt: "Did you apply it?", type: "single", options: ["Yes fully", "Partly", "No"], required: true },
      ],
      woreda: "ET04-W01",
      assignmentMode: "Woreda",
      client_op_id: "srv-1",
    });
  });

  it("sends assignedDaIds only for Selected mode and leaves out an empty Woreda", () => {
    const body = toTemplateBody(input({ woreda: "", assignmentMode: "Selected", assignedDaIds: ["DA-1"] }), "srv-2");
    expect(body.woreda).toBeUndefined();
    expect(body.assignedDaIds).toEqual(["DA-1"]);
  });
});

describe("templateErrors", () => {
  it("flags a Selected survey with no DA and a missing Woreda when required", () => {
    const errors = templateErrors(input({ woreda: "", assignmentMode: "Selected" }), { woredaRequired: true });
    expect(errors).toContain("Pick the Woreda to publish to.");
    expect(errors).toContain("Pick at least one DA, or publish to the whole Woreda.");
  });
  it("needs two choices for choice questions", () => {
    expect(templateErrors(input({ questions: [{ id: 1, prompt: "Pick", type: "multi", options: "Only", required: true, translations: {} }] }))).toEqual(["Question 1 needs at least two choices."]);
  });
});

const task: SurveyTask = {
  id: "DA-SRV-2026-0000001", name: "Meher", templateVersion: "FSS-T1-v1.0", type: "Satisfaction",
  window: { open: "03 Nov 2026", close: "30 Nov 2026" }, window_open: "2026-11-03", window_close: "2026-11-30",
  languages: ["English", "Amharic"], targetFarmers: 20, collected: 0, queued: 0, status: "Open", estMinutes: 3, answered: [],
  woreda: "ET04-W01", assignmentMode: "Woreda", assignedDaIds: [],
  parameters: [
    { id: "p1", order: 1, prompt: "Consent", type: "consent", required: true },
    { id: "p2", order: 2, prompt: "Farmer ID", type: "auto", required: true, prefill: "Farmer Registry" },
    { id: "p3", order: 3, prompt: "Kebele", type: "auto", required: true, prefill: "DA assignment" },
    { id: "p4", order: 4, prompt: "Useful?", type: "rating", required: true, translations: { Amharic: "ጠቃሚ?" } },
  ],
};

describe("templatePatch", () => {
  it("sends only the changed keys", () => {
    const before = templateInputFrom(task);
    expect(before.questions).toHaveLength(1);
    expect(templatePatch(before, { ...before, close: "2026-12-15", targetFarmers: 25 })).toEqual({ close: "2026-12-15", targetFarmers: 25 });
    expect(templatePatch(before, before)).toEqual({});
  });
  it("sends the full question list when a question changes", () => {
    const before = templateInputFrom(task);
    const after = { ...before, questions: [{ ...before.questions[0], prompt: "Useful advice?" }] };
    expect(templatePatch(before, after).questions).toEqual([{ prompt: "Useful advice?", type: "rating", options: "", required: true, translations: { Amharic: "ጠቃሚ?" } }]);
  });
});

describe("describeSurveyError", () => {
  it("maps capture statuses to the documented messages", () => {
    expect(describeSurveyError(new ApiError("x", 409), "submit")).toBe("A response for this farmer already exists for this survey.");
    expect(describeSurveyError(new ApiError("x", 403), "submit")).toBe("This farmer is not in your assigned Kebele for this survey.");
    expect(describeSurveyError(new ApiError("This survey window is closed.", 400), "submit")).toBe("This survey window is closed.");
  });
});
