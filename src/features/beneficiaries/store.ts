import { create } from "zustand";
import type { Farmer } from "@/features/farmers";
import type { Beneficiary } from "./data";

export interface LinkResult {
  added: string[];
  /** Already linked to the chosen segment, so left as they were. */
  skipped: string[];
}

interface BeneficiariesState {
  rows: Beneficiary[];
  /** Links farmers to a segment as Pending verification; a farmer already in another segment moves to this one. */
  link: (farmers: Farmer[], segmentId: string) => LinkResult;
  /** Detaches the segment link only; the Farmer Registry record is never touched. */
  remove: (id: string) => void;
}

// Shared by My Farmers (bulk add) and Beneficiaries. In memory only: links reset on reload until the API lands.
export const useBeneficiariesStore = create<BeneficiariesState>()((set, get) => ({
  rows: [],
  link: (farmers, segmentId) => {
    const current = get().rows;
    const result: LinkResult = { added: [], skipped: [] };
    const fresh: Beneficiary[] = [];
    for (const f of farmers) {
      const existing = current.find((b) => b.id === f.id);
      if (existing && existing.status !== "Removed" && existing.segmentId === segmentId) {
        result.skipped.push(f.name);
        continue;
      }
      result.added.push(f.name);
      fresh.push({ id: f.id, name: f.name, avatar: f.avatar, kebele: f.kebele, crop: f.crop, livestock: f.livestock, segmentId, status: "Pending verification", linkedAt: "Just now" });
    }
    const freshIds = new Set(fresh.map((b) => b.id));
    set({ rows: [...fresh, ...current.filter((b) => !freshIds.has(b.id))] });
    return result;
  },
  remove: (id) => set((s) => ({ rows: s.rows.map((b) => (b.id === id ? { ...b, status: "Removed" } : b)) })),
}));
