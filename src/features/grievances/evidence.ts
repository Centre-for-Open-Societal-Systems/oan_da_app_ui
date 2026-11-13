import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** One evidence document attached to a grievance. */
export interface EvidenceDocument {
  id: string;
  ticketId: string;
  name: string;
  size: number;
  /** File extension, lower case (e.g. "pdf"). */
  type: string;
  /** ISO time it was submitted. */
  uploadedAt: string;
}

interface EvidenceState {
  documents: EvidenceDocument[];
  add: (doc: EvidenceDocument) => void;
}

/**
 * DUMMY: no evidence-upload or farmer-documents API exists yet. Submitted documents are kept (name, size and type
 * only, not the file) in this browser so the farmer profile's Documents tab can list them. Replace with the backend
 * calls once they are released.
 */
export const useEvidenceStore = create<EvidenceState>()(
  persist(
    (set) => ({
      documents: [],
      add: (doc) => set((s) => ({ documents: [doc, ...s.documents] })),
    }),
    { name: "da-grievance-evidence", storage: createJSONStorage(() => localStorage) },
  ),
);

/** DUMMY upload of one evidence document: waits briefly, then records it locally. */
export async function uploadEvidenceDocument(ticketId: string, file: File): Promise<EvidenceDocument> {
  await new Promise((r) => setTimeout(r, 500));
  const doc: EvidenceDocument = {
    id: `${ticketId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ticketId,
    name: file.name,
    size: file.size,
    type: file.name.split(".").pop()?.toLowerCase() ?? "",
    uploadedAt: new Date().toISOString(),
  };
  useEvidenceStore.getState().add(doc);
  return doc;
}
