import type { PillTone } from "@/components/ui/Pill";
import type {
  ActiveStatus,
  Agent,
  ApprovalStatus,
  DataException,
  FaydaCheck,
  FaydaStatus,
  IssuanceEvent,
  IssuanceState,
  OnboardingRecord,
  SyncEvent,
  SyncOutcome,
} from "./types";

export const WOREDAS = ["Bako Tibe", "Ambo", "Dendi", "Cheliya"];

export const AGENTS: Agent[] = [
  { daId: "DA-OR-000341", fullName: "Tadesse Alemu", faydaId: "3512 4498 7712", faydaStatus: "Verified", activeStatus: "Active", educationTier: "Diploma", kebele: "Bako 01", woreda: "Bako Tibe", region: "Oromia", farmerCount: 248, approvalStatus: "Published", moaPublication: "Published", phone: "+251 91 234 5678", specialisation: "Crop production", joinedAt: "12 Mar 2019", updatedAt: "14 Sep 2026, 09:12", source: "MoA sync" },
  { daId: "DA-OR-000342", fullName: "Hana Girma", faydaId: "3512 5510 0921", faydaStatus: "Verified", activeStatus: "Active", educationTier: "Degree", kebele: "Dambi Gobu", woreda: "Bako Tibe", region: "Oromia", farmerCount: 193, approvalStatus: "Published", moaPublication: "Published", phone: "+251 91 118 2210", specialisation: "Livestock", joinedAt: "03 Jul 2020", updatedAt: "13 Sep 2026, 16:40", source: "MoA sync" },
  { daId: "DA-OR-000347", fullName: "Kebede Alemu", faydaId: "3512 7733 1188", faydaStatus: "Verified", activeStatus: "On-leave", educationTier: "Degree", kebele: "Koye Feche", woreda: "Bako Tibe", region: "Oromia", farmerCount: 211, approvalStatus: "Published", moaPublication: "Published", phone: "+251 92 771 9080", specialisation: "Natural resources", joinedAt: "21 Jan 2017", updatedAt: "10 Sep 2026, 11:05", source: "Bulk import" },
  { daId: "DA-OR-000352", fullName: "Meseret Bekele", faydaId: "3512 8804 6621", faydaStatus: "Pending", activeStatus: "Unassigned", educationTier: "Diploma", kebele: "—", woreda: "Bako Tibe", region: "Oromia", farmerCount: 0, approvalStatus: "Awaiting review", moaPublication: "Not sent", phone: "+251 91 455 7712", specialisation: "Crop production", joinedAt: "01 Sep 2026", updatedAt: "12 Sep 2026, 08:30", source: "Bulk import" },
  { daId: "DA-OR-000353", fullName: "Yohannes Tesfaye", faydaId: "3512 9012 3345", faydaStatus: "Mismatch", activeStatus: "Unassigned", educationTier: "Certificate", kebele: "—", woreda: "Bako Tibe", region: "Oromia", farmerCount: 0, approvalStatus: "Changes requested", moaPublication: "Not sent", phone: "+251 93 220 1187", specialisation: "Crop production", joinedAt: "01 Sep 2026", updatedAt: "11 Sep 2026, 14:22", source: "Bulk import" },
  { daId: "DA-OR-000355", fullName: "Selamawit Haile", faydaId: "3512 6677 2201", faydaStatus: "Verified", activeStatus: "Active", educationTier: "Diploma", kebele: "Amarti Gibe", woreda: "Bako Tibe", region: "Oromia", farmerCount: 176, approvalStatus: "Approved", moaPublication: "Failed", phone: "+251 91 902 4410", specialisation: "Livestock", joinedAt: "15 Aug 2026", updatedAt: "14 Sep 2026, 07:55", source: "MoA sync" },
  { daId: "DA-OR-000361", fullName: "Abebe Wolde", faydaId: "3512 1120 9934", faydaStatus: "Verified", activeStatus: "Active", educationTier: "Masters", kebele: "Awaro", woreda: "Ambo", region: "Oromia", farmerCount: 230, approvalStatus: "Published", moaPublication: "Published", phone: "+251 91 611 0034", specialisation: "Agronomy", joinedAt: "09 Feb 2015", updatedAt: "08 Sep 2026, 10:02", source: "MoA sync" },
  { daId: "DA-OR-000362", fullName: "Rahel Mulugeta", faydaId: "3512 4433 8890", faydaStatus: "Verified", activeStatus: "Active", educationTier: "Degree", kebele: "Ginchi", woreda: "Dendi", region: "Oromia", farmerCount: 204, approvalStatus: "Published", moaPublication: "Pending", phone: "+251 92 330 5561", specialisation: "Horticulture", joinedAt: "30 Nov 2021", updatedAt: "14 Sep 2026, 12:18", source: "MoA sync" },
  { daId: "DA-OR-000368", fullName: "Dawit Assefa", faydaId: "3512 2299 7710", faydaStatus: "Verified", activeStatus: "Separated", educationTier: "Diploma", kebele: "—", woreda: "Cheliya", region: "Oromia", farmerCount: 0, approvalStatus: "Published", moaPublication: "Published", phone: "+251 91 780 2231", specialisation: "Crop production", joinedAt: "02 May 2016", updatedAt: "30 Jun 2026, 17:00", source: "MoA sync" },
  { daId: "DA-OR-000371", fullName: "Tigist Negash", faydaId: "3512 5566 4412", faydaStatus: "Pending", activeStatus: "Unassigned", educationTier: "Degree", kebele: "—", woreda: "Ambo", region: "Oromia", farmerCount: 0, approvalStatus: "Draft", moaPublication: "Not sent", phone: "+251 93 118 9902", specialisation: "Livestock", joinedAt: "10 Sep 2026", updatedAt: "10 Sep 2026, 09:45", source: "MoA sync" },
  { daId: "DA-OR-000374", fullName: "Birtukan Lemma", faydaId: "3512 3381 0457", faydaStatus: "Mismatch", activeStatus: "Unassigned", educationTier: "Certificate", kebele: "—", woreda: "Ambo", region: "Oromia", farmerCount: 0, approvalStatus: "Rejected", moaPublication: "Not sent", phone: "+251 92 604 3318", specialisation: "Horticulture", joinedAt: "03 Sep 2026", updatedAt: "09 Sep 2026, 13:10", source: "Bulk import" },
];

export const TOTAL_AGENTS = 1_284;

export const getAgent = (daId: string) => AGENTS.find((a) => a.daId === daId);

export const FAYDA_TONE: Record<FaydaStatus, PillTone> = { Verified: "green", Pending: "amber", Mismatch: "red" };
export const ACTIVE_TONE: Record<ActiveStatus, PillTone> = { Active: "green", "On-leave": "amber", Separated: "slate", Unassigned: "blue" };
export const APPROVAL_TONE: Record<ApprovalStatus, PillTone> = { Draft: "slate", "Awaiting review": "amber", "Changes requested": "purple", Approved: "blue", Published: "green", Rejected: "red" };
export const PUBLICATION_TONE: Record<Agent["moaPublication"], PillTone> = { Published: "green", Pending: "amber", Failed: "red", "Not sent": "slate" };
export const ISSUANCE_TONE: Record<IssuanceState, PillTone> = { Generated: "green", Queued: "amber", Exception: "red", "Failed-retry": "purple" };
export const SYNC_TONE: Record<SyncOutcome, PillTone> = { Success: "green", Failed: "red", Pending: "amber", Reconciled: "blue" };

export const ISSUANCE_EVENTS: IssuanceEvent[] = [
  { daId: "DA-OR-000355", fullName: "Selamawit Haile", faydaMatch: "Match", uniqueness: "Unique", state: "Generated", generatedAt: "15 Aug 2026, 10:12", retryCount: 0 },
  { daId: "DA-OR-000352", fullName: "Meseret Bekele", faydaMatch: "Pending", uniqueness: "Unique", state: "Queued", reason: "Awaiting Fayda verification response", generatedAt: "12 Sep 2026, 08:30", retryCount: 0 },
  { daId: "DA-OR-000353", fullName: "Yohannes Tesfaye", faydaMatch: "Mismatch", uniqueness: "Unique", state: "Exception", reason: "Fayda mismatch — date of birth differs from registry", generatedAt: "11 Sep 2026, 14:22", retryCount: 1 },
  { daId: "DA-OR-000371", fullName: "Tigist Negash", faydaMatch: "Pending", uniqueness: "Pending", state: "Queued", reason: "MoA sync record incomplete (no Fayda ID on inbound payload)", generatedAt: "10 Sep 2026, 09:45", retryCount: 0 },
  { daId: "PENDING-0092", fullName: "Bekele Tadesse", faydaMatch: "Match", uniqueness: "Duplicate", state: "Exception", reason: "Duplicate identity — Fayda already linked to DA-OR-000361", generatedAt: "09 Sep 2026, 15:02", retryCount: 0 },
  { daId: "PENDING-0093", fullName: "Almaz Kassa", faydaMatch: "Pending", uniqueness: "Pending", state: "Failed-retry", reason: "Fayda service timeout (3 attempts)", generatedAt: "08 Sep 2026, 11:47", retryCount: 3 },
];

export const DATA_EXCEPTIONS: DataException[] = [
  { id: "EXC-1201", kind: "Duplicate identity", daId: "PENDING-0092", fullName: "Bekele Tadesse", detail: "Fayda 3512 1120 9934 is already linked to DA-OR-000361 (Abebe Wolde).", raisedAt: "09 Sep 2026" },
  { id: "EXC-1198", kind: "Fayda mismatch", daId: "DA-OR-000353", fullName: "Yohannes Tesfaye", detail: "Date of birth on Fayda (14 Feb 1994) differs from import (14 Feb 1991).", raisedAt: "11 Sep 2026" },
  { id: "EXC-1194", kind: "Missing mandatory field", daId: "DA-OR-000371", fullName: "Tigist Negash", detail: "Education tier and Fayda ID missing on inbound MoA record.", raisedAt: "10 Sep 2026" },
  { id: "EXC-1190", kind: "Invalid Kebele reference", daId: "DA-OR-000362", fullName: "Rahel Mulugeta", detail: "MoA payload references kebele code OR-DN-017 which is not in master data.", raisedAt: "07 Sep 2026" },
  { id: "EXC-1187", kind: "Failed sync", daId: "DA-OR-000355", fullName: "Selamawit Haile", detail: "MoA publication rejected: HTTP 502 from MoA gateway (retry 2 of 3).", raisedAt: "14 Sep 2026" },
];

export const FAYDA_CHECKS: FaydaCheck[] = [
  { daId: "DA-OR-000352", fullName: "Meseret Bekele", faydaId: "3512 8804 6621", registryName: "Meseret Bekele", faydaName: "—", dobMatch: false, result: "Pending", checkedAt: "Awaiting response" },
  { daId: "DA-OR-000353", fullName: "Yohannes Tesfaye", faydaId: "3512 9012 3345", registryName: "Yohannes Tesfaye", faydaName: "Yohannes Tesfaye Bekele", dobMatch: false, result: "Mismatch", checkedAt: "11 Sep 2026, 14:20" },
  { daId: "PENDING-0092", fullName: "Bekele Tadesse", faydaId: "3512 1120 9934", registryName: "Bekele Tadesse", faydaName: "Abebe Wolde", dobMatch: false, result: "Mismatch", duplicateOf: "DA-OR-000361", checkedAt: "09 Sep 2026, 15:00" },
  { daId: "DA-OR-000371", fullName: "Tigist Negash", faydaId: "3512 5566 4412", registryName: "Tigist Negash", faydaName: "—", dobMatch: false, result: "Pending", checkedAt: "Awaiting response" },
  { daId: "DA-OR-000355", fullName: "Selamawit Haile", faydaId: "3512 6677 2201", registryName: "Selamawit Haile", faydaName: "Selamawit Haile", dobMatch: true, result: "Verified", checkedAt: "15 Aug 2026, 10:10" },
];

export const ONBOARDING_QUEUE: OnboardingRecord[] = [
  {
    daId: "DA-OR-000352", fullName: "Meseret Bekele", woreda: "Bako Tibe", kebele: "Proposed: Bako 02", source: "Bulk import", autoCheck: "Warnings",
    autoCheckNotes: ["Fayda verification pending (queued 12 Sep)", "Uniqueness check passed", "Education certificate attached (Diploma, Ambo ATVET)"],
    status: "Awaiting review", submittedAt: "12 Sep 2026, 08:30",
    audit: [
      { actor: "Bulk import job #204", role: "System", action: "Record created (shadow state)", at: "12 Sep 2026, 08:30" },
      { actor: "DA Identity service", role: "System", action: "DA-ID queued — awaiting Fayda response", at: "12 Sep 2026, 08:31" },
      { actor: "Routing", role: "System", action: "Routed to Woreda scope: Bako Tibe", at: "12 Sep 2026, 08:31" },
    ],
  },
  {
    daId: "DA-OR-000353", fullName: "Yohannes Tesfaye", woreda: "Bako Tibe", kebele: "Proposed: Koye Feche", source: "Bulk import", autoCheck: "Failed",
    autoCheckNotes: ["Fayda mismatch: date of birth differs", "Uniqueness check passed"],
    status: "Changes requested", submittedAt: "11 Sep 2026, 14:22",
    audit: [
      { actor: "Bulk import job #203", role: "System", action: "Record created (shadow state)", at: "11 Sep 2026, 14:22" },
      { actor: "DA Identity service", role: "System", action: "Issuance exception — Fayda mismatch", at: "11 Sep 2026, 14:23" },
      { actor: "Kebede Alemu", role: "Supervisor", action: "Requested changes", note: "Confirm DOB with Fayda card and re-submit.", at: "11 Sep 2026, 16:05" },
    ],
  },
  {
    daId: "DA-OR-000355", fullName: "Selamawit Haile", woreda: "Bako Tibe", kebele: "Amarti Gibe", source: "MoA sync", autoCheck: "Passed",
    autoCheckNotes: ["Fayda verified", "Uniqueness check passed", "Kebele reference valid"],
    status: "Approved", submittedAt: "15 Aug 2026, 10:12",
    audit: [
      { actor: "MoA sync", role: "System", action: "Record received from MoA master", at: "15 Aug 2026, 10:12" },
      { actor: "DA Identity service", role: "System", action: "DA-ID generated", at: "15 Aug 2026, 10:12" },
      { actor: "Kebede Alemu", role: "Supervisor", action: "Approved — published to DA Registry (Gen 2)", at: "16 Aug 2026, 09:40" },
      { actor: "MoA publication", role: "System", action: "MoA publication failed (HTTP 502) — retry scheduled", at: "14 Sep 2026, 07:55" },
    ],
  },
  {
    daId: "DA-OR-000371", fullName: "Tigist Negash", woreda: "Ambo", kebele: "Proposed: Gosu Kora", source: "MoA sync", autoCheck: "Warnings",
    autoCheckNotes: ["Education tier missing on inbound record", "Fayda ID missing — verification not started"],
    status: "Draft", submittedAt: "10 Sep 2026, 09:45",
    audit: [{ actor: "MoA sync", role: "System", action: "Record received from MoA master (incomplete)", at: "10 Sep 2026, 09:45" }],
  },
];

export const SYNC_EVENTS: SyncEvent[] = [
  { id: "SYN-88213", entityType: "DA record", entityRef: "DA-OR-000355", direction: "OAN → MoA", outcome: "Failed", detail: "MoA gateway returned HTTP 502", retryCount: 2, at: "14 Sep 2026, 07:55" },
  { id: "SYN-88210", entityType: "DA record", entityRef: "DA-OR-000362", direction: "OAN → MoA", outcome: "Pending", detail: "Awaiting MoA receipt", retryCount: 0, at: "14 Sep 2026, 12:18" },
  { id: "SYN-88204", entityType: "Kebele assignment", entityRef: "DA-OR-000342 · Dambi Gobu", direction: "OAN → MoA", outcome: "Success", detail: "Receipt MOA-7781-2026", retryCount: 0, at: "13 Sep 2026, 16:41" },
  { id: "SYN-88199", entityType: "DA record", entityRef: "DA-OR-000371", direction: "MoA → OAN", outcome: "Failed", detail: "Validation: missing fayda_id, education_tier", retryCount: 1, at: "10 Sep 2026, 09:45" },
  { id: "SYN-88190", entityType: "Lifecycle", entityRef: "DA-OR-000347 · On-leave", direction: "OAN → MoA", outcome: "Success", detail: "Receipt MOA-7742-2026", retryCount: 0, at: "10 Sep 2026, 11:06" },
  { id: "SYN-88171", entityType: "DA record", entityRef: "DA-OR-000362", direction: "MoA → OAN", outcome: "Reconciled", detail: "Kebele code OR-DN-017 mapped to Ginchi by admin", retryCount: 0, at: "08 Sep 2026, 10:30" },
  { id: "SYN-88160", entityType: "Approval", entityRef: "DA-OR-000341", direction: "OAN → MoA", outcome: "Success", detail: "Receipt MOA-7690-2026", retryCount: 0, at: "05 Sep 2026, 15:12" },
  { id: "SYN-88144", entityType: "DA record", entityRef: "Batch #203 (42 records)", direction: "MoA → OAN", outcome: "Success", detail: "42 received · 40 accepted · 2 exceptions", retryCount: 0, at: "01 Sep 2026, 06:00" },
];
