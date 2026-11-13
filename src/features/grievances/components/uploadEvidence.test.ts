import { describe, expect, it } from "vitest";
import { MAX_EVIDENCE_BYTES, pickEvidence } from "./UploadEvidenceModal";

const file = (name: string, size = 1000) => ({ name, size }) as File;

describe("pickEvidence", () => {
  it("accepts PDF, PNG, JPG, CSV, Excel and MP3", () => {
    const picked = ["a.pdf", "b.PNG", "c.jpeg", "d.csv", "e.xlsx", "f.xls", "g.mp3"].map((n) => file(n));
    expect(pickEvidence([], picked)).toEqual({ added: picked, skipped: [] });
  });
  it("skips other types, files over 10 MB and duplicates", () => {
    const current = [file("a.pdf")];
    const { added, skipped } = pickEvidence(current, [file("x.exe"), file("big.pdf", MAX_EVIDENCE_BYTES + 1), file("a.pdf"), file("ok.png")]);
    expect(added.map((f) => f.name)).toEqual(["ok.png"]);
    expect(skipped).toEqual(["x.exe: file type not allowed", "big.pdf: larger than 10 MB", "a.pdf: already selected"]);
  });
  it("stops at 10 documents", () => {
    const current = Array.from({ length: 9 }, (_, i) => file(`f${i}.pdf`));
    const { added, skipped } = pickEvidence(current, [file("y.pdf"), file("z.pdf")]);
    expect(added.map((f) => f.name)).toEqual(["y.pdf"]);
    expect(skipped).toEqual(["z.pdf: limit of 10 documents reached"]);
  });
});
