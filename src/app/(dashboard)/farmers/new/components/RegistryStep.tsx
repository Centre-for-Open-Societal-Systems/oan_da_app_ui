"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Banner } from "@/components/ui/Banner";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { Textarea } from "@/components/ui/Textarea";
import { FormField } from "@/components/ui/FormField";
import { uploadRegistrationDocument, useFieldOptions, type FieldOption, type FieldOptions } from "@/features/farmers";
import { cn } from "@/lib/utils";
import { isFieldVisible, optionsFor, type RegistryField, type RegistrySection, type RegistryTab } from "../registrySpec";

const INPUT_TYPE = { text: "text", number: "number", date: "date", tel: "tel", select: "text", radio: "text", checkbox: "text", textarea: "text", document: "text", derived: "text", capture: "text" } as const;

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

const CALENDAR_ICON = (
  <svg className="h-4 w-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
  </svg>
);

const UPLOAD_ICON = "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12";

const GRID = { 3: "md:grid-cols-2 xl:grid-cols-3", 4: "md:grid-cols-2 xl:grid-cols-4" } as const;

type Setter = (name: string) => (value: string) => void;

// Uploads the identity document to the registry as soon as it is picked; the draft keeps the returned
// document id (what POST /farmers takes) and the file name, never the file itself.
function DocumentInput({ field, values, onChange }: { field: RegistryField; values: Record<string, string>; onChange: Setter }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<{ uploading: boolean; error: string | null }>({ uploading: false, error: null });
  const name = values.identity_document_name ?? "";
  const documentId = values.identity_document_id ?? "";

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_DOCUMENT_BYTES) return setState({ uploading: false, error: "The file is larger than 5 MB." });
    setState({ uploading: true, error: null });
    try {
      const doc = await uploadRegistrationDocument(file);
      onChange("identity_document_id")(doc.document_id);
      onChange("identity_document_name")(doc.file_name || file.name);
      setState({ uploading: false, error: null });
    } catch (err) {
      setState({ uploading: false, error: err instanceof Error ? err.message : "Upload failed. Try again." });
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input type="hidden" name="identity_document_id" value={documentId} readOnly />
      <input type="hidden" name="identity_document_name" value={name} readOnly />
      <button
        type="button"
        id={field.name}
        disabled={state.uploading}
        onClick={() => inputRef.current?.click()}
        className="flex h-11 w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-left text-sm outline-none transition-all duration-150 hover:border-brand-green hover:ring-1 hover:ring-brand-green/20 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 disabled:cursor-wait"
      >
        {state.uploading ? (
          <Spinner className="text-brand-green" />
        ) : (
          <svg className="h-4 w-4 shrink-0 text-brand-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={UPLOAD_ICON} />
          </svg>
        )}
        <span className={cn("truncate", name ? "text-zinc-900" : "text-zinc-400")}>{state.uploading ? "Uploading to the registry…" : name || "Choose a PDF, JPEG or PNG"}</span>
      </button>
      <input ref={inputRef} type="file" accept=".pdf,image/jpeg,image/png" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
      {state.error ? (
        <p className="mt-1.5 text-[12.5px] text-red-700">{state.error}</p>
      ) : documentId ? (
        <p className="mt-1.5 text-[12.5px] text-brand-green">Uploaded to the Farmer Registry. Pick another file to replace it.</p>
      ) : null}
    </>
  );
}

interface FieldProps {
  field: RegistryField;
  value: string;
  values: Record<string, string>;
  options: FieldOption[];
  /** The registry options are still loading. */
  loading: boolean;
  enabled: boolean;
  onChange: (value: string) => void;
  endAdornment?: ReactNode;
}

function Field({ field, value, values, options, loading, enabled, onChange, endAdornment }: FieldProps) {
  const label = field.label;
  const wide = field.wide ? "col-span-full" : undefined;
  const common = { label, htmlFor: field.name, required: field.required, hint: field.hint, className: wide };

  if (field.type === "radio") {
    const selected = value || options[0]?.value || "";
    return (
      <FormField {...common}>
        {/* The hidden input carries the choice into the draft; the radios themselves are display only. */}
        <input type="hidden" id={field.name} name={field.name} value={selected} readOnly />
        <div role="radiogroup" aria-label={label} className="flex h-11 items-center gap-6">
          {options.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
              <input type="radio" checked={selected === option.value} onChange={() => onChange(option.value)} className="h-4 w-4 accent-brand-green" />
              {option.label}
            </label>
          ))}
        </div>
      </FormField>
    );
  }
  if (field.type === "textarea") {
    return (
      <FormField {...common}>
        <Textarea id={field.name} name={field.name} rows={4} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Optional note" />
      </FormField>
    );
  }
  return (
    <FormField {...common}>
      {field.type === "select" ? (
        <Select id={field.name} name={field.name} value={value} disabled={!enabled} onChange={(e) => onChange(e.target.value)}>
          <option value="" disabled>{loading ? "Loading options…" : (field.placeholder ?? `Select ${label}`)}</option>
          {/* A saved code stays selectable while the options load, so the draft does not lose it. */}
          {value && !options.some((o) => o.value === value) && <option value={value}>{value}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
      ) : (
        <Input
          id={field.name}
          name={field.name}
          type={INPUT_TYPE[field.type]}
          value={field.derive ? field.derive(values) : value}
          readOnly={!!field.derive}
          disabled={!enabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? (field.type === "tel" ? "+251 9XXXXXXXX" : `Enter ${label}`)}
          startAdornment={field.type === "date" ? CALENDAR_ICON : undefined}
          endAdornment={endAdornment}
        />
      )}
    </FormField>
  );
}

const PIN_ICON = "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z";

// Grey title bar with a chevron that folds the section away; open by default.
export function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 bg-surface px-5 py-3 text-left">
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold text-ink">{title}</span>
          {description && <span className="mt-0.5 block text-[12.5px] text-ink-soft">{description}</span>}
        </span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink-soft">
          <svg className={cn("h-4 w-4 transition-transform", open && "rotate-180")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
      {/* Hidden, not unmounted, so a folded section's values still reach the draft. */}
      <div className={cn("border-t border-line px-5 py-5", !open && "hidden")}>{children}</div>
    </section>
  );
}

/** Reads the device position into the latitude / longitude fields; the enumerator's also get altitude, accuracy and the capture time. */
function readDevicePosition(onChange: Setter, prefix: "" | "enumerator_", done?: (ok: boolean) => void) {
  if (!("geolocation" in navigator)) return done?.(false);
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      onChange(`${prefix}latitude`)(coords.latitude.toFixed(prefix ? 6 : 4));
      onChange(`${prefix}longitude`)(coords.longitude.toFixed(prefix ? 6 : 4));
      if (prefix) {
        onChange("enumerator_altitude")(coords.altitude === null ? "" : `${Math.round(coords.altitude).toLocaleString("en-US")} m`);
        onChange("enumerator_accuracy")(`± ${coords.accuracy.toFixed(1)} m`);
        onChange("enumerator_gps_captured_at")(new Date().toISOString());
      }
      done?.(true);
    },
    () => done?.(false),
  );
}

const capturedLabel = (iso: string) => {
  const at = new Date(iso);
  const time = at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return at.toDateString() === new Date().toDateString() ? `today at ${time}` : `${at.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} at ${time}`;
};

// Fills the enumerator's GPS readings from the device when the step opens, and again on request.
function GpsCapture({ values, onChange }: { values: Record<string, string>; onChange: Setter }) {
  const [failed, setFailed] = useState(false);
  const capture = () => readDevicePosition(onChange, "enumerator_", (ok) => setFailed(!ok));
  useEffect(() => {
    // Skipped when a reading is already there (a restored draft).
    if (!values.enumerator_latitude) capture();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on open
  }, []);
  const at = values.enumerator_gps_captured_at;
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-2 self-end md:col-span-2">
      <input type="hidden" name="enumerator_gps_captured_at" value={at ?? ""} readOnly />
      <button type="button" onClick={capture} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-[13.5px] font-medium text-ink transition-colors hover:bg-surface">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={PIN_ICON} />
        </svg>
        Recapture location
      </button>
      <span className="text-[12.5px] text-muted">{failed ? "Location unavailable. Enter the readings manually." : at ? `Last captured ${capturedLabel(at)}` : "Not captured yet"}</span>
    </div>
  );
}

// Consecutive checkboxes share one cell under the heading of the first, e.g. "Members included".
function CheckboxGroup({ fields, values, onChange }: { fields: RegistryField[]; values: Record<string, string>; onChange: Setter }) {
  return (
    <FormField label={fields[0].group ?? fields[0].label} htmlFor={fields[0].name}>
      <div className="flex h-11 flex-wrap items-center gap-x-6 gap-y-2">
        {fields.map((field) => {
          const checked = (values[field.name] ?? "Yes") === "Yes";
          return (
            <label key={field.name} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
              {/* The hidden input carries the answer into the draft; the checkbox itself is display only. */}
              <input type="hidden" id={field.name} name={field.name} value={checked ? "Yes" : "No"} readOnly />
              <input type="checkbox" checked={checked} onChange={(e) => onChange(field.name)(e.target.checked ? "Yes" : "No")} className="h-[18px] w-[18px] accent-brand-green" />
              {field.label}
            </label>
          );
        })}
      </div>
    </FormField>
  );
}

function SectionFields({ section, values, fieldOptions, loading, onChange }: { section: RegistrySection; values: Record<string, string>; fieldOptions: FieldOptions; loading: boolean; onChange: Setter }) {
  // Fold each run of checkboxes into one cell.
  const cells: RegistryField[][] = [];
  for (const field of section.fields) {
    const last = cells[cells.length - 1];
    if (field.type === "checkbox" && last?.[0].type === "checkbox") last.push(field);
    else cells.push([field]);
  }
  // The pin fills the device's coordinates, when it allows location access.
  const pinFor = (field: RegistryField) => (
    <button
      type="button"
      onClick={() => readDevicePosition(onChange, field.name.startsWith("enumerator_") ? "enumerator_" : "")}
      aria-label="Use my current location"
      title="Use my current location"
      className="text-zinc-400 transition-colors hover:text-brand-green"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={PIN_ICON} />
      </svg>
    </button>
  );
  return (
    <div className={cn("grid grid-cols-1 content-start gap-x-6 gap-y-5", GRID[section.columns ?? 3])}>
      {cells.map((cell) => {
        const field = cell[0];
        if (field.type === "checkbox") return <CheckboxGroup key={field.name} fields={cell} values={values} onChange={onChange} />;
        if (field.type === "capture") return <GpsCapture key={field.name} values={values} onChange={onChange} />;
        if (field.type === "document") {
          return (
            <FormField key={field.name} label={field.label} htmlFor={field.name} required={field.required} hint={field.hint}>
              <DocumentInput field={field} values={values} onChange={onChange} />
            </FormField>
          );
        }
        return (
          <Field
            key={field.name}
            field={field}
            value={values[field.name] ?? field.defaultValue ?? ""}
            values={values}
            options={optionsFor(field, fieldOptions)}
            loading={loading && !!field.source}
            enabled={isFieldVisible(field, values)}
            onChange={onChange(field.name)}
            endAdornment={field.locate ? pinFor(field) : undefined}
          />
        );
      })}
    </div>
  );
}

interface RegistryStepProps {
  tab: RegistryTab;
  /** Restores a saved draft (field name → value). */
  initial?: Record<string, string>;
  /** Fill the fields the draft has nothing in (e.g. the signed-in enumerator). */
  defaults?: Record<string, string>;
  /** Sits above the sections. */
  leading?: ReactNode;
  /** Sits below the sections. */
  trailing?: ReactNode;
}

/** One Farmer Registry tab as collapsible sections. Dropdowns list the registry's own codes (GET /registries/farmer/field-options). */
export function RegistryStep({ tab, initial = {}, defaults, leading, trailing }: RegistryStepProps) {
  const { options: fieldOptions, loading, error } = useFieldOptions();
  const [values, setValues] = useState(() => {
    const merged = { ...initial };
    for (const [name, value] of Object.entries(defaults ?? {})) if (!merged[name]) merged[name] = value;
    return merged;
  });
  const set: Setter = (name) => (value) => setValues((current) => ({ ...current, [name]: value }));
  const usesOptions = tab.sections.some((section) => section.fields.some((field) => field.source));

  const sections = (
    <div className="flex flex-col gap-5">
      {error && usesOptions && (
        <Banner tone="error" title="Could not load the Farmer Registry options">
          {error} Reload the page to try again.
        </Banner>
      )}
      {leading}
      {tab.sections.map((section) => (
        <Section key={section.title} title={section.title} description={section.description}>
          <SectionFields section={section} values={values} fieldOptions={fieldOptions} loading={loading} onChange={set} />
        </Section>
      ))}
      {trailing}
    </div>
  );

  if (!tab.heading) return sections;
  return (
    <Card className="p-0 shadow-card">
      <div className="border-b border-line px-5 py-4 sm:px-6">
        <h2 className="text-[18px] font-bold text-ink">{tab.heading.title}</h2>
        <p className="mt-0.5 text-[12.5px] text-ink-soft">{tab.heading.description}</p>
      </div>
      <div className="px-4 py-5 sm:px-5">{sections}</div>
    </Card>
  );
}
