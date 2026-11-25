import type { FilterFieldConfig, FilterSelection } from "@/components/ui/AdvancedFiltersDrawer";
import type { FilterOption } from "@/components/ui/FilterDropdown";
import type { Farmer, FarmerActivity, FarmerStatus } from "./types";

export type { FilterOption };

export const farmerActivity = (status: FarmerStatus): FarmerActivity => (status === "Verified" ? "Active" : "Inactive");

// Option lists (with registry-wide counts) for the column filter dropdowns and the Advanced Filters panel.
export const KEBELE_OPTIONS: FilterOption[] = [
  { value: "Bako Tibe 01", label: "Bako Tibe 01", count: 482 },
  { value: "Bako Tibe 02", label: "Bako Tibe 02", count: 319 },
  { value: "Dendi 03", label: "Dendi 03", count: 206 },
  { value: "Gedo 01", label: "Gedo 01", count: 116 },
  { value: "Adea 04", label: "Adea 04", count: 100 },
  { value: "Lume 02", label: "Lume 02", count: 61 },
];

export const CROP_OPTIONS: FilterOption[] = [
  { value: "Teff", label: "Teff", count: 482 },
  { value: "Maize", label: "Maize", count: 319 },
  { value: "Wheat", label: "Wheat", count: 206 },
  { value: "Barley", label: "Barley", count: 116 },
  { value: "Haricot bean", label: "Haricot bean", count: 100 },
  { value: "Chili pepper", label: "Chili pepper", count: 61 },
];

export const LIVESTOCK_OPTIONS: FilterOption[] = [
  { value: "Cattle", label: "Cattle", count: 512 },
  { value: "Sheep", label: "Sheep", count: 284 },
  { value: "Goats", label: "Goats", count: 231 },
  { value: "Poultry", label: "Poultry", count: 197 },
];

export const STATUS_OPTIONS: FilterOption[] = [
  { value: "Verified", label: "Verified", count: 109 },
  { value: "Pending", label: "Pending approval", count: 109 },
  { value: "Enrolling", label: "Enrolling", count: 109 },
  { value: "Inactive", label: "Inactive", count: 109 },
  { value: "Flagged", label: "Flagged", count: 2 },
];

export const EDUCATION_OPTIONS: FilterOption[] = [
  { value: "None", label: "No formal education", count: 512 },
  { value: "Primary", label: "Primary", count: 438 },
  { value: "Secondary", label: "Secondary", count: 254 },
  { value: "Tertiary", label: "Tertiary", count: 80 },
];

// Fields shown in the Advanced Filters drawer on the My Farmers page.
export const FARMER_FILTER_FIELDS: FilterFieldConfig[] = [
  { key: "kebele", label: "Kebele", allLabel: "All kebeles", placeholder: "All", options: KEBELE_OPTIONS },
  { key: "crop", label: "Crop", allLabel: "All crops", placeholder: "All", options: CROP_OPTIONS },
  { key: "livestock", label: "Livestock", allLabel: "All livestock", placeholder: "All", options: LIVESTOCK_OPTIONS },
  { key: "status", label: "Status", allLabel: "All Status", placeholder: "All Status", options: STATUS_OPTIONS },
  { key: "education", label: "Education", allLabel: "All education levels", placeholder: "All", options: EDUCATION_OPTIONS },
];

/** Column filters: an empty set means "all". */
export interface FarmerFilters extends FilterSelection {
  kebele: Set<string>;
  crop: Set<string>;
  livestock: Set<string>;
  status: Set<string>;
}

export const EMPTY_FILTERS: FarmerFilters = { kebele: new Set(), crop: new Set(), livestock: new Set(), status: new Set() };

export function countActiveFilters(filters: FarmerFilters): number {
  return (Object.keys(filters) as (keyof FarmerFilters)[]).filter((key) => filters[key].size > 0).length;
}

// Kebele options carry a sub-code ("Bako Tibe 01") while farmer records only store the kebele name.
const matchesKebele = (farmer: Farmer, selected: Set<string>) =>
  selected.size === 0 || [...selected].some((value) => value.startsWith(farmer.kebele));

export function applyFilters(farmers: Farmer[], filters: FarmerFilters): Farmer[] {
  return farmers.filter(
    (farmer) =>
      matchesKebele(farmer, filters.kebele) &&
      (filters.crop.size === 0 || filters.crop.has(farmer.crop)) &&
      (filters.livestock.size === 0 || filters.livestock.has(farmer.livestock)) &&
      (filters.status.size === 0 || filters.status.has(farmerActivity(farmer.status))),
  );
}
