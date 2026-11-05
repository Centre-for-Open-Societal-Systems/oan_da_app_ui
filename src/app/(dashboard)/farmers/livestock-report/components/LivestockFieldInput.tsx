"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import type { LivestockAnimalOption, LivestockFieldDef } from "@/features/farmers";

interface LivestockFieldInputProps {
  id: string;
  field: LivestockFieldDef;
  /** The stored value; for a read-only field, the text to show. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** What the animal picker offers. */
  animals?: LivestockAnimalOption[];
}

const READ_ONLY = "cursor-not-allowed border-gray-200 bg-surface text-ink-soft hover:border-gray-200 hover:ring-0 focus:border-gray-200 focus:ring-0";
const BOOLEAN_CHOICES = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

// One Livestock field, rendered by its type. The form holds strings; what is sent is decided in buildLivestockSections.
export function LivestockFieldInput({ id, field, value, onChange, error, animals }: LivestockFieldInputProps) {
  return (
    <div className={error ? "field-invalid flex min-w-0 flex-col gap-2" : "flex min-w-0 flex-col gap-2"}>
      <label htmlFor={id} className="text-[14px] font-medium text-ink">
        {field.label} {(field.required || field.requiredInRow) && !field.readOnly && <span className="text-danger">*</span>}
      </label>
      <Control id={id} field={field} value={value} onChange={onChange} animals={animals} />
      {error && <p className="text-[12.5px] text-danger">{error}</p>}
    </div>
  );
}

function Choices({ id, label, value, onChange, choices }: { id: string; label: string; value: string; onChange: (v: string) => void; choices: { value: string; label: string }[] }) {
  // A saved value the list no longer has must still show, or the field would look empty.
  const all = value && !choices.some((c) => c.value === value) ? [{ value, label: value }, ...choices] : choices;
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select {label.toLowerCase()}</option>
      {all.map((c) => (
        <option key={c.value} value={c.value}>
          {c.label}
        </option>
      ))}
    </Select>
  );
}

function Control({ id, field, value, onChange, animals }: LivestockFieldInputProps) {
  if (field.readOnly) return <Input id={id} value={value} readOnly placeholder="Filled by the registry" className={READ_ONLY} />;
  switch (field.type) {
    case "select":
      return <Choices id={id} label={field.label} value={value} onChange={onChange} choices={field.choices ?? []} />;
    case "boolean":
      return <Choices id={id} label={field.label} value={value} onChange={onChange} choices={BOOLEAN_CHOICES} />;
    case "animal":
      return <Choices id={id} label="animal" value={value} onChange={onChange} choices={animals ?? []} />;
    case "date":
      return <Input id={id} type="date" value={value} onChange={(e) => onChange(e.target.value)} className={cn("cursor-pointer")} />;
    case "number":
    case "integer":
      return <Input id={id} type="number" inputMode={field.type === "integer" ? "numeric" : "decimal"} step={field.type === "integer" ? 1 : "any"} value={value} onChange={(e) => onChange(e.target.value)} placeholder="0" />;
    default:
      return <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} maxLength={field.maxLength} placeholder={`Enter ${field.label.toLowerCase()}`} />;
  }
}
