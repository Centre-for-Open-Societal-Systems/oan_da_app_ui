import { describe, expect, it } from "vitest";
import { MAX_EVIDENCE_BYTES } from "../evidence";
import { pickEvidence } from "./UploadEvidenceModal";

const file = (name: string, size = 1000) => ({ name, size }) as File;

describe("pickEvidence", () => {
  it("accepts PDF, PNG, JPG and MP3", () => {
    const picked = ["a.pdf", "b.PNG", "c.jpeg", "d.jpg", "e.mp3"].map((n) => file(n));
    expect(pickEvidence([], picked)).toEqual({ added: picked, skipped: [] });
  });
  it("skips the types the Grievance Service refuses", () => {
    const { added, skipped } = pickEvidence([], [file("d.csv"), file("e.xlsx"), file("f.xls"), file("g.docx"), file("x.exe")]);
    expect(added).toEqual([]);
    expect(skipped).toHaveLength(5);
    expect(skipped[0]).toBe("d.csv: file type not allowed (PDF, PNG, JPG, MP3 Audio only)");
  });
  it("skips empty files, files over 10 MB and duplicates", () => {
    const current = [file("a.pdf")];
    const { added, skipped } = pickEvidence(current, [file("empty.pdf", 0), file("big.pdf", MAX_EVIDENCE_BYTES + 1), file("a.pdf"), file("ok.png")]);
    expect(added.map((f) => f.name)).toEqual(["ok.png"]);
    expect(skipped).toEqual(["empty.pdf: the file is empty", "big.pdf: larger than 10 MB", "a.pdf: already selected"]);
  });
  it("stops at 10 documents", () => {
    const current = Array.from({ length: 9 }, (_, i) => file(`f${i}.pdf`));
    const { added, skipped } = pickEvidence(current, [file("y.pdf"), file("z.pdf")]);
    expect(added.map((f) => f.name)).toEqual(["y.pdf"]);
    expect(skipped).toEqual(["z.pdf: limit of 10 documents reached"]);
  });
  it("leaves room for the documents the grievance already has", () => {
    // 7 already on the grievance: 3 more fit.
    const { added, skipped } = pickEvidence([file("a.pdf")], [file("b.pdf"), file("c.pdf"), file("d.pdf")], 3);
    expect(added.map((f) => f.name)).toEqual(["b.pdf", "c.pdf"]);
    expect(skipped).toEqual(["d.pdf: limit of 10 documents reached"]);
  });
});
