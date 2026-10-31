import type { FarmerRegistration } from "@/features/farmers";
import { fieldValue, isFieldVisible, memberCount, memberKey, MEMBER_FIELDS, REGISTRY_TABS } from "./registrySpec";

// Wizard values (one flat record keyed by field name) → the POST /farmers body, and the
// checks that have to pass before it is sent. Kept free of React so it can be unit tested.

type Values = Record<string, string>;

const text = (values: Values, name: string) => (values[name] ?? "").trim();
const yes = (values: Values, name: string) => fieldValue(values, name) === "Yes";
const num = (values: Values, name: string) => {
  const n = Number(text(values, name));
  return text(values, name) === "" || Number.isNaN(n) ? undefined : n;
};
const opt = (value: string) => value || undefined;

const hasLand = (v: Values) => !!(text(v, "land_ownership_type") || text(v, "area_in_hectare"));
const hasCrop = (v: Values) => !!text(v, "commodity");
const hasLivestock = (v: Values) => !!text(v, "livestock_type");

/** Members entered on the Household step, in order. */
export function householdMembers(values: Values) {
  return Array.from({ length: memberCount(values) }, (_, i) => ({
    first_name: text(values, memberKey(i, "first_name")),
    father_name: text(values, memberKey(i, "father_name")),
    grandfather_name: text(values, memberKey(i, "grandfather_name")),
    gender: text(values, memberKey(i, "gender")),
    date_of_birth: text(values, memberKey(i, "birth_date")),
    relationship: text(values, memberKey(i, "relationship")),
  }));
}

/** Everything that would make the registry refuse the registration, in words an agent can act on. */
export function registrationProblems(values: Values): string[] {
  const problems: string[] = [];
  for (const tab of REGISTRY_TABS) {
    for (const section of tab.sections) {
      for (const field of section.fields) {
        if (!field.required || !isFieldVisible(field, values)) continue;
        const value = field.type === "document" ? text(values, "identity_document_id") : fieldValue(values, field.name).trim();
        if (!value) problems.push(`${tab.label}: ${field.label} is required.`);
      }
    }
  }
  if (!text(values, "kebele")) problems.push("Location: pick the region, zone, woreda and kebele.");
  householdMembers(values).forEach((member, i) => {
    for (const { field, label, required } of MEMBER_FIELDS) {
      const key = field === "birth_date" ? "date_of_birth" : field;
      if (required && !member[key as keyof typeof member]) problems.push(`Household: member ${i + 1} needs ${label}.`);
    }
  });
  if (hasLand(values) && (!text(values, "land_ownership_type") || !text(values, "area_in_hectare"))) {
    problems.push("Lands: a parcel needs both Land Ownership Type and Area In Hectare.");
  }
  if ((hasCrop(values) || hasLivestock(values)) && !hasLand(values)) {
    problems.push("Lands: crops and livestock belong to a land parcel; add the parcel first.");
  }
  return problems;
}

/** The POST /farmers body for the wizard's values. */
export function toRegistration(values: Values): FarmerRegistration {
  const members = householdMembers(values);
  const lat = text(values, "latitude");
  const lon = text(values, "longitude");
  const income = text(values, "income_source");
  const clusterMember = yes(values, "is_farmer_cluster_member");

  return {
    first_name: text(values, "first_name"),
    father_name: opt(text(values, "middle_name")),
    grandfather_name: opt(text(values, "last_name")),
    first_name_local: opt(text(values, "first_name_local")),
    middle_name_local: opt(text(values, "middle_name_local")),
    last_name_local: opt(text(values, "last_name_local")),
    language_spoken: opt(text(values, "language_spoken")),
    gender: opt(text(values, "gender")),
    date_of_birth: opt(text(values, "birth_date")),
    phone: opt(text(values, "phone_number").replace(/[\s-]/g, "")),
    kebele: opt(text(values, "kebele")),
    location: lat && lon ? `${lat} ${lon}` : undefined,
    national_id: opt(text(values, "national_id")),
    fayda_rid: opt(text(values, "fayda_rid")),
    marital_status: opt(text(values, "marital_status")),
    education_level: opt(text(values, "education_level")),
    income_sources: income ? [income] : [],
    income_source_other: income === "SOI_OTHERS" ? opt(text(values, "income_source_other")) : undefined,
    is_psnp_user: yes(values, "is_psnp_user"),
    disabled: yes(values, "disabled"),
    disability_type: yes(values, "disabled") ? opt(text(values, "disability_type")) : undefined,
    disability_severity: yes(values, "disabled") ? opt(text(values, "disability_severity")) : undefined,
    household: {
      size: 1 + members.length,
      number_of_children: num(values, "number_of_children"),
      other_land_owner: yes(values, "other_land_owner"),
      // Checkboxes start ticked (see the Household step), so an untouched one counts as Yes.
      father_included: (values.father_included ?? "Yes") === "Yes",
      mother_included: (values.mother_included ?? "Yes") === "Yes",
      members: members.map((m) => ({ ...m, father_name: opt(m.father_name) })),
    },
    membership: {
      is_primary_cooperative_member: yes(values, "is_primary_cooperative_member"),
      primary_cooperative_name: yes(values, "is_primary_cooperative_member") ? opt(text(values, "primary_cooperative_name")) : undefined,
      is_cooperative_union_member: yes(values, "is_cooperative_union_member"),
      cooperative_union_name: yes(values, "is_cooperative_union_member") ? opt(text(values, "cooperative_union_name")) : undefined,
      is_farmer_cluster_member: clusterMember,
      farmer_cluster_role: clusterMember ? opt(text(values, "farmer_cluster_role")) : undefined,
      primary_commodity: clusterMember ? opt(text(values, "primary_commodity")) : undefined,
    },
    identity_document_id: opt(text(values, "identity_document_id")),
    identity_document_type: opt(fieldValue(values, "identity_document_type")),
    lands: hasLand(values)
      ? [
          {
            ownership: text(values, "land_ownership_type"),
            area_hectare: num(values, "area_in_hectare"),
            soil_fertility: opt(text(values, "soil_fertility")),
            current_land_use: opt(text(values, "current_land_use")),
            means_of_acquisition: opt(text(values, "means_of_acquisition")),
            year_of_acquisition: num(values, "year_of_acquisition"),
            remark: opt(text(values, "remark")),
          },
        ]
      : [],
    crops: hasCrop(values)
      ? [{ name: text(values, "commodity"), planted_date: opt(text(values, "planted_date")), season: opt(text(values, "season")), end_use: opt(text(values, "end_use")) }]
      : [],
    livestock: hasLivestock(values)
      ? [
          {
            animal: text(values, "livestock_type"),
            count: Math.max(1, num(values, "head_count") ?? 1),
            system: opt(text(values, "livestock_system")),
            breed: opt(text(values, "breed")),
            gender: opt(text(values, "livestock_gender")),
            body_condition: opt(text(values, "body_condition")),
            production_type: opt(text(values, "production_type")),
          },
        ]
      : [],
    client_op_id: opt(text(values, "client_op_id")),
  };
}
