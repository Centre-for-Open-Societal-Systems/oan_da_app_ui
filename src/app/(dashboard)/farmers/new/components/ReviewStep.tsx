"use client";

import { useState, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { optionLabel, useFieldOptions, type FieldOptions } from "@/features/farmers";
import { cn } from "@/lib/utils";
import { householdMembers, registrationProblems } from "../registration";
import { fieldValue, isFieldVisible, LOCATION_HIERARCHY_FIELDS, optionsFor, REGISTRY_TABS, type RegistryField } from "../registrySpec";

interface ReviewStepProps {
  /** Everything entered so far, keyed by registry field name */
  values: Record<string, string>;
  /** Jump back to a step so the agent can edit it */
  onEditStep: (step: number) => void;
}

const icon = (paths: string[]) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {paths.map((d) => (
      <path key={d} d={d} />
    ))}
  </svg>
);

const TAB_ICONS: Record<string, ReactNode> = {
  farmer: icon(["M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2", "M12 11a4 4 0 100-8 4 4 0 000 8z"]),
  household: icon(["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2", "M9 11a4 4 0 100-8 4 4 0 000 8z", "M23 21v-2a4 4 0 00-3-3.87", "M16 3.13a4 4 0 010 7.75"]),
  location: icon(["M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z", "M12 13a3 3 0 100-6 3 3 0 000 6z"]),
  lands: icon(["M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z", "M8 2v16", "M16 6v16"]),
  crops: icon(["M7 20h10", "M10 20c5.5-2.5.8-6.4 3-10", "M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z", "M14.1 6a7 7 0 00-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"]),
  membership: icon(["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2", "M9 11a4 4 0 100-8 4 4 0 000 8z", "M19 8v6", "M22 11h-6"]),
  livestocks: icon(["M11 4a2 2 0 11-4 0 2 2 0 014 0z", "M18 8a2 2 0 11-4 0 2 2 0 014 0z", "M20 16a2 2 0 11-4 0 2 2 0 014 0z", "M9 10a5 5 0 015 5v3.5a3.5 3.5 0 01-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 015.5 10z"]),
  ids: icon(["M3 5h18a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1z", "M7 9h.01", "M11 9h6", "M11 13h6", "M5 16c0-1.1.9-2 2-2s2 .9 2 2"]),
  enumerator: icon(["M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2", "M9 2h6a1 1 0 011 1v2a1 1 0 01-1 1H9a1 1 0 01-1-1V3a1 1 0 011-1z"]),
};

const EDIT_ICON = "M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z";

interface ReviewRow {
  label: string;
  value: string;
  required?: boolean;
}

/** What the agent sees for a field: the option label for codes, the file name for the document. */
function display(field: RegistryField, values: Record<string, string>, options: FieldOptions) {
  if (field.type === "document") return values.identity_document_name || (values.identity_document_id ? "Uploaded" : "");
  if (field.derive) return field.derive(values);
  const value = fieldValue(values, field.name);
  return field.type === "select" || field.type === "radio" ? optionLabel(optionsFor(field, options), value) : value;
}

/** A field counts as filled by what POST /farmers will send: the document by its uploaded id. */
const filled = (field: RegistryField, values: Record<string, string>) => !!(field.type === "document" ? values.identity_document_id : fieldValue(values, field.name).trim());

function rowsFor(tabKey: string, values: Record<string, string>, options: FieldOptions = {}): ReviewRow[] {
  const tab = REGISTRY_TABS.find((item) => item.key === tabKey)!;
  const rows: ReviewRow[] = [];
  if (tabKey === "location") {
    // Kebele is the leaf of the hierarchy, so it is the one the registry needs
    for (const field of LOCATION_HIERARCHY_FIELDS) {
      rows.push({ label: field.label, value: values[`${field.name}_name`] || values[field.name] || "", required: field.name === "kebele" });
    }
  }
  for (const section of tab.sections) {
    for (const field of section.fields) {
      if (field.type === "capture" || !isFieldVisible(field, values)) continue;
      rows.push({ label: field.label, value: filled(field, values) || field.derive ? display(field, values, options) : "", required: field.required });
    }
  }
  if (tabKey === "household") {
    const members = householdMembers(values);
    const relationships = options.HouseholdMember?.relationship_to_the_head;
    rows.push({ label: "Family size", value: String(1 + members.length) });
    members.forEach((m, i) => {
      const name = [m.first_name, m.father_name, m.grandfather_name].filter(Boolean).join(" ");
      const relation = m.relationship ? optionLabel(relationships, m.relationship) : "";
      rows.push({ label: `Member ${i + 1}`, value: [name, relation].filter(Boolean).join(" · ") });
    });
  }
  return rows;
}

/** The handful of facts an agent checks at a glance on the Farmer tab. */
function farmerSummary(values: Record<string, string>, options: FieldOptions): ReviewRow[] {
  const v = (name: string) => values[name]?.trim() ?? "";
  const label = (field: string, value: string) => (value ? optionLabel(options.Farmer?.[field], value) : "");
  const age = REGISTRY_TABS[0].sections.flatMap((s) => s.fields).find((f) => f.name === "estimated_age")?.derive?.(values) ?? "";
  return [
    { label: "Name", value: [v("first_name"), v("middle_name"), v("last_name")].filter(Boolean).join(" "), required: true },
    { label: "Gender · Age", value: [label("gender", v("gender")), age && `${age} years`].filter(Boolean).join(" · "), required: true },
    { label: "Primary phone", value: v("phone_number") },
    { label: "Source of income", value: label("income_sources", v("income_source")) },
    { label: "Education level", value: label("education_level", v("education_level")), required: true },
    { label: "Marital status", value: label("marital_status", v("marital_status")), required: true },
  ];
}

/** "Abebe Bekele Tadesse", or a stand-in until a name is entered. */
export const farmerFullName = (values: Record<string, string>) =>
  [values.first_name, values.middle_name, values.last_name].map((part) => part?.trim()).filter(Boolean).join(" ") || "The farmer";

/** How many of the registry tabs have every required field filled. */
export function tabCompletion(values: Record<string, string>) {
  const complete = REGISTRY_TABS.filter((tab) => rowsFor(tab.key, values).every((row) => !row.required || row.value)).length;
  return { complete, total: REGISTRY_TABS.length };
}

function Rows({ rows }: { rows: ReviewRow[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="text-[12.5px] text-ink-soft">{row.label}</dt>
          <dd className={cn("mt-1 text-[14.5px]", row.value ? "font-medium text-ink" : "text-gray-400")}>{row.value || "Not provided"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ReviewStep({ values, onEditStep }: ReviewStepProps) {
  const [openStep, setOpenStep] = useState<number | null>(1);
  const { options } = useFieldOptions();
  const tabs = REGISTRY_TABS.map((tab) => {
    const rows = rowsFor(tab.key, values, options);
    return { tab, rows, missing: rows.filter((row) => row.required && !row.value).length };
  });
  // Everything the registry would refuse, including the rules that span tabs (members, land for crops).
  const problems = registrationProblems(values);

  return (
    <Card className="p-0 shadow-card">
      <div className="border-b border-line px-5 py-4 sm:px-6">
        <h2 className="text-[18px] font-bold text-ink">Review and submit</h2>
        <p className="mt-0.5 text-[12.5px] text-ink-soft">Check every tab before submitting. Open a tab to review it, or use Edit to jump back.</p>
      </div>

      <div className="flex flex-col gap-3 px-4 py-5 sm:px-5">
        <p
          className={cn(
            "flex items-start gap-2.5 rounded-lg border px-4 py-3 text-[13px]",
            problems.length === 0 ? "border-brand-border bg-brand-mint text-brand-green" : "border-warning-border bg-warning-wash text-orange-700"
          )}
        >
          <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          {problems.length === 0 ? (
            "All required fields are complete. The farmer will be sent to your supervisor for approval after you submit."
          ) : (
            <span>
              {problems.length} {problems.length === 1 ? "thing needs" : "things need"} fixing before you submit:
              <ul className="mt-1.5 list-disc pl-5">
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </span>
          )}
        </p>

        {tabs.map(({ tab, rows, missing }, index) => {
          const step = index + 1;
          const isOpen = openStep === step;
          return (
            <div key={tab.key} className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
              <button
                type="button"
                onClick={() => setOpenStep(isOpen ? null : step)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-100"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-green">{TAB_ICONS[tab.key]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold text-ink">{tab.label}</span>
                  <span className="mt-0.5 block text-[12.5px] text-ink-soft">Review the {tab.label.toLowerCase()} details</span>
                </span>
                {missing > 0 ? (
                  <span className="shrink-0 rounded-md bg-warning-wash px-2.5 py-1 text-[12.5px] font-semibold text-orange-700">{missing} required missing</span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-brand-mint px-2.5 py-1 text-[12.5px] font-semibold text-brand-green">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Complete
                  </span>
                )}
                <svg className={cn("h-5 w-5 shrink-0 text-ink-soft transition-transform", isOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isOpen && (
                <div className="border-t border-line bg-white px-6 py-5">
                  <Rows rows={tab.key === "farmer" ? [...farmerSummary(values, options), ...rows.filter((r) => r.required && !r.value)] : rows} />
                  <button
                    type="button"
                    onClick={() => onEditStep(step)}
                    className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3.5 text-[13.5px] font-medium text-ink shadow-sm transition-colors hover:bg-surface"
                  >
                    <svg className="h-4 w-4 text-brand-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={EDIT_ICON} />
                    </svg>
                    Edit {tab.label}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
