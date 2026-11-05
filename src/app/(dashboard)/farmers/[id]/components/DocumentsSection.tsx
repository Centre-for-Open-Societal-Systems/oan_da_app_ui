import { SectionCard } from "./SectionCard";

// No API returns a farmer's documents yet (backend task: fetch them from all registries), so nothing is listed.
export function DocumentsSection() {
  return (
    <SectionCard title="Documents" bodyClassName="p-4">
      <p className="py-4 text-center text-[13.5px] text-muted">No documents</p>
    </SectionCard>
  );
}
