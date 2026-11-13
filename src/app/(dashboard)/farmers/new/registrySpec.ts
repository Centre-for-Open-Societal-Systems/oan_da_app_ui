// Register Farmer wizard, built on the DA Services Farmer API (farmer-frontend-integration.md, "Register a farmer"; the
// collection's "Register farmer" body). Every step collects part of that one POST /farmers body; choices come from
// GET /registries/farmer/field-options and the location from GET /registries/farmer/places.

export type StepKey = "farmer" | "location" | "household" | "holdings" | "document" | "review";

export interface WizardStep {
  key: StepKey;
  label: string;
  title: string;
  description: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  { key: "farmer", label: "Farmer", title: "Farmer details", description: "Names, gender, birth date, phone, Fayda ID and socio-economic details." },
  { key: "location", label: "Location", title: "Location", description: "Region, zone, woreda and kebele from the registry, and the GPS position." },
  { key: "household", label: "Household", title: "Household", description: "Household size and the members living with the farmer." },
  { key: "holdings", label: "Land & crops", title: "Land, crops and livestock", description: "The farmer's land parcels, crops and animals." },
  { key: "document", label: "ID document", title: "Identity document", description: "Upload the farmer's ID document (PDF, JPEG or PNG, up to 5 MB)." },
  { key: "review", label: "Review", title: "Review and submit", description: "Check the registration before it goes to your supervisor." },
];

/**
 * Which field-options list feeds each choice. The documented response is {register: {field: [{value, label}]}}; the
 * field names are the POST /farmers body's own (the first name of each list), with the registry's other spellings after it.
 * A list no register has is reported on the form, not replaced by a made-up one.
 */
export const OPTION_LISTS = {
  gender: ["gender"],
  marital_status: ["marital_status"],
  education_level: ["education_level"],
  income_sources: ["income_sources", "income_source"],
  // The registry names these lists relationship_to_the_head and commodity.
  relationship: ["relationship", "relationship_to_the_head"],
  ownership: ["ownership", "land_ownership_type"],
  crop: ["crop", "crops", "crop_name", "commodity"],
  season: ["season", "crop_season"],
  animal: ["animal", "livestock_type"],
  livestock_system: ["system", "livestock_system"],
} as const;

export type OptionList = keyof typeof OPTION_LISTS;

/**
 * Used when the registry's list cannot be read, so these required details can still be chosen. The backend matches a
 * value to the registry's code by code or display name (intake.code_for), so these words reach the right code.
 */
export const FALLBACK_CHOICES: Partial<Record<OptionList, { value: string; label: string }[]>> = {
  gender: [{ value: "male", label: "Male" }, { value: "female", label: "Female" }],
  marital_status: [{ value: "Single", label: "Single" }, { value: "Married", label: "Married" }, { value: "Widowed", label: "Widowed" }, { value: "Divorced", label: "Divorced" }],
  education_level: [{ value: "Illiterate", label: "Illiterate" }, { value: "Can read and write", label: "Can read and write" }, { value: "Primary", label: "Primary" }, { value: "Higher education", label: "Higher education" }],
  // The backend's own synonyms for SOURCE_OF_INCOME (intake.SYNONYMS).
  income_sources: [{ value: "crop", label: "Crop production" }, { value: "livestock", label: "Livestock production" }, { value: "govngo", label: "Government / NGO support" }, { value: "other", label: "Others" }],
};
