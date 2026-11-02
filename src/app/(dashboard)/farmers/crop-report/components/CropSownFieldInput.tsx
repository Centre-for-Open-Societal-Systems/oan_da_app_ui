"use client";

import { Input } from "@/components/ui/Input";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import type { CropSownFieldDef } from "@/features/farmers";

interface CropSownFieldInputProps {
  id: string;
  field: CropSownFieldDef;
  value: string;
  onChange: (value: string) => void;
  /** Fetched from the registries when the farmer was found: shown in its input, but read-only. */
  autoFilled?: boolean;
  /** Replaces the field's built-in options, e.g. regions and zones fetched from the Crop Sown geo levels. */
  options?: readonly string[];
  /** The registry's own required flag; without it the field falls back to the built-in list. */
  required?: boolean;
  /** The check that failed for this field, shown under it. */
  error?: string;
}

const MULTI_SEPARATOR = ", ";
const READ_ONLY = "cursor-not-allowed border-gray-200 bg-surface text-ink-soft hover:border-gray-200 hover:ring-0 focus:border-gray-200 focus:ring-0";

// One Crop Sown field, rendered by its registry type. Values stay strings (multi-select joins with ", ").
export function CropSownFieldInput({ id, field: baseField, value, onChange, autoFilled = false, options, required, error }: CropSownFieldInputProps) {
  // Registry choices turn a text box into a select; a multi-select or radio keeps its kind and takes the new choices.
  const field = options ? { ...baseField, type: baseField.type === "text" || baseField.type === "geo" ? "select" : baseField.type, options } : baseField;
  const isRequired = required ?? field.required ?? false;
  // The registry calculates read-only fields itself (EC dates, yields, cluster ids): shown, never edited.
  const locked = autoFilled || !!field.readOnly;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="flex items-center gap-2 text-[14px] font-medium text-ink">
        <span className="min-w-0">
          {field.label} {isRequired && <span className="text-danger">*</span>}
        </span>
        {autoFilled && (
          <span className="shrink-0 rounded-full bg-[#ECFDF3] border border-[#C9E8D6] px-2 py-px text-[11px] font-semibold text-[#16A34A]" title="Fetched from the farmer's registry record">
            Auto-filled
          </span>
        )}
      </label>
      <div className={cn(error && "rounded-lg ring-1 ring-danger")} aria-invalid={error ? true : undefined}>
        <Control id={id} field={field} value={value} onChange={onChange} autoFilled={locked} />
      </div>
      {error && (
        <p role="alert" className="text-[12.5px] leading-snug text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function Control({ id, field, value, onChange, autoFilled }: CropSownFieldInputProps) {
  switch (field.type) {
    case "select": {
      // A registry value the option list does not know about must still show, or the auto-fill would look empty.
      const known = [...new Set((field.options ?? []).filter(Boolean))];
      const options = value && !known.includes(value) ? [value, ...known] : known;
      return (
        <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={autoFilled} className={cn(autoFilled && READ_ONLY)}>
          <option value="">Select {field.label.toLowerCase()}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      );
    }
    case "multiselect": {
      const selected = value ? value.split(MULTI_SEPARATOR) : [];
      return (
        <MultiSelectDropdown
          id={id}
          placeholder={`Select ${field.label}`}
          options={field.options ?? []}
          selected={selected}
          onChange={(next) => onChange(next.join(MULTI_SEPARATOR))}
          disabled={autoFilled}
          className={cn(autoFilled && READ_ONLY)}
        />
      );
    }
    case "radio":
      return (
        <div id={id} role="radiogroup" aria-label={field.label} className="flex min-h-11 items-center gap-5">
          {field.options?.map((o) => (
            <label key={o} className={cn("flex items-center gap-2 text-[14px] text-ink", autoFilled ? "cursor-not-allowed" : "cursor-pointer")}>
              <input type="radio" name={id} checked={value === o} onChange={() => onChange(o)} disabled={autoFilled} className="h-4 w-4 accent-brand-green" />
              {o}
            </label>
          ))}
        </div>
      );
    case "date":
      return <Input id={id} type="date" value={value} onChange={(e) => onChange(e.target.value)} readOnly={autoFilled} className={cn(!autoFilled && "cursor-pointer", autoFilled && READ_ONLY)} />;
    case "number":
      return (
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={autoFilled}
          placeholder="0"
          className={cn(autoFilled && READ_ONLY)}
        />
      );
    default:
      return (
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={autoFilled}
          placeholder={`Enter ${field.label.toLowerCase()}`}
          className={cn(autoFilled && READ_ONLY)}
        />
      );
  }
}
