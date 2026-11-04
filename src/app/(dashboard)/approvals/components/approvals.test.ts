import { describe, expect, it } from "vitest";
import type { ChangeRequest } from "@/features/profile";
import { approvalResult, DECISION_API, isOpen, toApprovalRequest } from "./approvals";

const pending: ChangeRequest = {
  name: "DA-PCR-2026-0000069",
  da_id: "DA-6164518738",
  section: "Contact",
  status: "Pending",
  requested_by: "7a70036bdb810271173b277b3fb98fe4@iam.internal",
  reason: "Updated from My profile",
  changes: { mobile: { from: "0921562251", to: "0911000000" } },
  region: "ET12",
  zone: "ET1202",
  woreda: "ET120205",
  registry_sync_state: "Not sent",
  creation: "2026-11-03T18:40:00",
};

describe("toApprovalRequest", () => {
  it("maps a pending request to an open queue row with the change and the DA's Woreda", () => {
    const r = toApprovalRequest(pending, { ET120205: "Dima (Gm)" }, { "DA-6164518738": "QA Rakesh Test" });
    expect(r.id).toBe("DA-PCR-2026-0000069");
    expect(r.status).toBe("Awaiting verification");
    expect(isOpen(r)).toBe(true);
    expect(r.title).toBe("Phone number → 0911000000");
    expect(r.place).toBe("Dima (Gm)");
    expect(r.woredaCode).toBe("ET120205");
    expect(r.submittedBy).toEqual({ name: "QA Rakesh Test", agentId: "DA-6164518738", initials: "QR" });
    expect(r.data.slice(0, 3)).toEqual([
      { label: "Field changed", value: "Phone number" },
      { label: "Previous value", value: "0921562251" },
      { label: "New value", value: "0911000000" },
    ]);
    expect(r.trail.map((s) => s.label)).toEqual(["Submitted", "Awaiting review"]);
    expect(r.trail[1].current).toBe(true);
  });

  it("falls back to codes and the DA-ID until names are known", () => {
    const r = toApprovalRequest(pending);
    expect(r.place).toBe("ET120205");
    expect(r.submittedBy.name).toBe("DA-6164518738");
  });

  it("shows an applied request as approved with the registry steps in the trail", () => {
    const r = toApprovalRequest({
      ...pending,
      status: "Applied",
      approver: "sup@moa.gov.et",
      decided_at: "2026-11-03T19:00:00",
      registry_sync_state: "Accepted",
      registry_reference: "CR-77",
      registry_approval: "Pending",
      applied_at: "2026-11-03T19:00:05",
    });
    expect(r.status).toBe("Approved");
    expect(isOpen(r)).toBe(false);
    expect(r.trail.map((s) => s.label)).toEqual(["Submitted", "Approved", "Sent to the DA Registry", "Registry pending"]);
    expect(r.trail[2].detail).toBe("Registry reference CR-77");
  });

  it("lists every field of a multi-field request", () => {
    const r = toApprovalRequest({ ...pending, section: "Qualifications", changes: { education_tier: { from: "Certificate", to: "Diploma" }, specialisation: { from: "Crop production", to: "Livestock" } } });
    expect(r.title).toBe("Qualifications change — Education level, Specialisation");
    expect(r.data.map((d) => d.label)).toEqual(["Education level (current)", "Education level (requested)", "Specialisation (current)", "Specialisation (requested)", "Section", "DA-ID", "Reason"]);
  });
});

describe("DECISION_API", () => {
  it("sends the backend's decision words", () => {
    expect(DECISION_API).toEqual({ approve: "Approve", changes: "Request changes", reject: "Reject" });
  });
});

describe("approvalResult", () => {
  it("separates what reached the registry from what did not", () => {
    const sent: ChangeRequest = { ...pending, name: "A", status: "Applied", registry_sync_state: "Accepted" };
    const failed: ChangeRequest = { ...pending, name: "B", status: "Approved", registry_sync_state: "Failed", registry_error: "Registry timeout" };
    expect(approvalResult([sent, failed])).toEqual({ sent: 1, failed: [{ id: "B", error: "Registry timeout" }] });
  });
});
