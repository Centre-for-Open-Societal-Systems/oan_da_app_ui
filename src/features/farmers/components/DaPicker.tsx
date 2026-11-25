"use client";

import type { ApiAgent } from "@/features/agents";
import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";

interface DaPickerProps {
  /** The DAs in the officer's scope; null while loading. */
  agents: ApiAgent[] | null;
  /** Load error, shown under the field. */
  error: string | null;
  value: ApiAgent | null;
  onChange: (agent: ApiAgent | null) => void;
}

const placeLabel = (a: ApiAgent) => a.kebele_name || a.woreda_name || a.kebele || a.woreda || "";

// Officers (Supervisor / Admin) plan a visit for one of their DAs: the visit goes to that DA's plan.
export function DaPicker({ agents, error, value, onChange }: DaPickerProps) {
  const hint = error ?? (agents === null ? "Loading development agents…" : agents.length === 0 ? "No development agent in your scope." : "The visit is added to this DA's plan.");

  return (
    <FormField label="Development agent" htmlFor="visit-da" required hint={hint} hintTone={error ? "error" : "muted"}>
      <Select
        id="visit-da"
        className="h-10"
        value={value?.da_id ?? ""}
        disabled={!agents || agents.length === 0}
        onChange={(e) => onChange(agents?.find((a) => a.da_id === e.target.value) ?? null)}
      >
        <option value="">Select a development agent</option>
        {(agents ?? []).map((a) => (
          <option key={a.da_id} value={a.da_id}>
            {[a.full_name || a.da_id, a.da_id, placeLabel(a)].filter(Boolean).join(" · ")}
          </option>
        ))}
      </Select>
    </FormField>
  );
}
