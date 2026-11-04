import { CURRENT_AGENT, FARMERS, PLOTS } from "./data";
import { registryCode } from "./components/planVisit";
import type { Farmer } from "./types";
import type { SpecRule } from "./cropSownSpec";
import { applySpec } from "./cropSownSpecApply";

// Crop Sown Registry: the tab → section → field list from the registry spec, shared by the Submit Crop Report
// form and the farmer profile's "Crop Sown Details" tab. `key` is the registry's field name. Values are sample
// data until the Crop Sown API is available; swapping them for the API response is a lookup by section + key.

export type CropSownFieldType = "text" | "number" | "date" | "select" | "multiselect" | "radio" | "geo";

export interface CropSownFieldDef {
  key: string;
  label: string;
  type: CropSownFieldType;
  options?: readonly string[];
  /** The registry's value behind each option label, when it lists the choices itself. */
  optionValues?: Record<string, string | boolean>;
  /** Master Data codes by label for a catalog field, used when the intake-form route has not supplied the choices. */
  fallbackValues?: Record<string, string>;
  /** The registry's flags and rules for the field (see cropSownSpec). */
  required?: boolean;
  readOnly?: boolean;
  numeric?: "integer" | "decimal";
  rules?: SpecRule[];
}

export interface CropSownSectionDef {
  id: string;
  title: string;
  fields: CropSownFieldDef[];
}

export interface CropSownTabDef {
  key: string;
  label: string;
  sections: CropSownSectionDef[];
}

/** Form values keyed by `valueKey(section, field)`: field names repeat across sections (land_id, season, …). */
export type CropSownValues = Record<string, string>;

export const valueKey = (sectionId: string, fieldKey: string) => `${sectionId}.${fieldKey}`;

// ── Option lists ────────────────────────────────────────────────────────────────────────────────────────

const YES_NO = ["Yes", "No"];
const SEASONS = ["Meher", "Belg", "Bega"];
const REGIONS = ["Oromia", "Amhara", "SNNP", "Sidama", "Tigray", "Afar", "Somali"];
const ZONES = ["West Shewa", "East Shewa", "North Shewa", "Arsi", "Jimma"];
const WOREDAS = [...new Set(FARMERS.map((f) => f.woreda.replace(/ woreda$/i, "")))];
const KEBELES = [...new Set(FARMERS.map((f) => f.kebele))];
const CROP_CATEGORIES = ["Cereal", "Pulse", "Oilseed", "Vegetable", "Root & tuber", "Fruit"];
const CROPPING_SYSTEMS = ["Sole cropping", "Intercropping", "Mixed cropping", "Relay cropping"];
const SEED_CLASSES = ["Certified", "Basic", "Pre-basic", "Local / farm-saved"];
const SEED_SOURCES = ["Cooperative union", "Seed enterprise", "Research centre", "Local market", "Own saved"];
const FERTILIZERS = ["NPS", "Urea", "NPS + Urea", "DAP", "Compost", "Manure"];
const WATER_SOURCES = ["Rain-fed", "River", "Well", "Pond", "Spring", "Dam"];
const WATER_METHODS = ["Furrow", "Drip", "Sprinkler", "Flood", "Basin"];
const FREQUENCIES = ["Daily", "Twice a week", "Weekly", "Fortnightly", "Monthly"];
const AGRO_ZONES = ["Kolla (lowland)", "Weyna Dega (mid-highland)", "Dega (highland)", "Wurch (alpine)"];
const FPC_TYPES = ["Seed multiplication", "Commercial production", "Irrigation", "Mechanised"];
const CLUSTER_MEMBERS = ["Gudina Tolesa", "Ayantu Bekele", "Bekele Fayisa", "Lensa Abdisa", "Tolera Daba", "Chaltu Mamo"];
const CLUSTER_STATUS = ["Cluster", "Non-cluster"];
const PLOT_CATEGORIES = ["Farm land", "Garden", "Grazing land", "Woodlot"];
const OWNERSHIP = ["Certified holding (Level 1)", "Certified holding (Level 2)", "Rented (sharecropping)", "Communal", "Inherited (uncertified)"];
const SOIL_FERTILITY = ["High", "Medium", "Low"];
const CULTIVATION_TYPES = ["Conventional tillage", "Minimum tillage", "Zero tillage", "Mechanised"];
const LAND_PREP = ["Oxen ploughing", "Tractor ploughing", "Harrowing", "Hand digging", "Ridging"];
const INFESTATION_TYPES = ["Pest", "Weed", "Disease", "Nutrient deficiency", "Climate shock"];
const PEST_TYPES = ["Insect", "Rodent", "Bird", "Nematode"];
const CONTROL_METHODS = ["Chemical spraying", "Biological", "Cultural", "Mechanical", "Hand weeding", "Top dressing", "Supplementary irrigation", "None"];
const PESTICIDE_TYPES = ["Insecticide", "Rodenticide", "Bio-pesticide", "Botanical"];
const WEED_TYPES = ["Broadleaf", "Grass", "Sedge", "Parasitic"];
const WEEDICIDE_TYPES = ["Selective herbicide", "Non-selective herbicide", "Pre-emergence", "Post-emergence"];
const DISEASE_TYPES = ["Fungal", "Bacterial", "Viral"];
const FUNGICIDE_TYPES = ["Fungicide", "Bactericide"];
const NUTRIENT_TYPES = ["Nitrogen deficiency", "Phosphorus deficiency", "Potassium deficiency", "Micronutrient deficiency", "Soil acidity"];
const AMENDMENT_TYPES = ["Inorganic", "Organic", "Lime", "Bio-fertilizer"];
const SHOCK_TYPES = ["Dry spell", "Drought", "Flood", "Hail", "Frost", "Heavy rain"];
const RECOVERY_INPUTS = ["Water", "Seed (replanting)", "Fertilizer", "Mulch"];
const GROWTH_STAGES = ["Germination", "Seedling", "Tillering", "Vegetative", "Flowering", "Grain filling", "Maturity"];
const SEVERITY = ["Low", "Moderate", "High", "Severe"];
const MATURITY = ["Fully mature", "Partially mature", "Immature"];

// ── Crop reference data (stands in for the crop catalogue) ──────────────────────────────────────────────

interface CropInfo {
  variety: string;
  category: string;
  localName: string;
  scientificName: string;
  /** Typical yield, quintal per hectare. */
  yieldQPerHa: number;
  /** Seed rate, kg per hectare. */
  seedKgPerHa: number;
  growthDays: number;
}

const CROPS: Record<string, CropInfo> = {
  Teff: { variety: "Quncho (DZ-Cr-387)", category: "Cereal", localName: "Xaafii", scientificName: "Eragrostis tef", yieldQPerHa: 15, seedKgPerHa: 10, growthDays: 95 },
  Maize: { variety: "BH-661", category: "Cereal", localName: "Boqqolloo", scientificName: "Zea mays", yieldQPerHa: 42, seedKgPerHa: 25, growthDays: 150 },
  Wheat: { variety: "Kakaba", category: "Cereal", localName: "Qamadii", scientificName: "Triticum aestivum", yieldQPerHa: 28, seedKgPerHa: 150, growthDays: 120 },
  Barley: { variety: "HB-1307", category: "Cereal", localName: "Garbuu", scientificName: "Hordeum vulgare", yieldQPerHa: 22, seedKgPerHa: 100, growthDays: 110 },
  "Haricot bean": { variety: "Nasir", category: "Pulse", localName: "Boloqqee", scientificName: "Phaseolus vulgaris", yieldQPerHa: 18, seedKgPerHa: 90, growthDays: 90 },
  "Chili pepper": { variety: "Mareko Fana", category: "Vegetable", localName: "Barbaree", scientificName: "Capsicum annuum", yieldQPerHa: 20, seedKgPerHa: 1, growthDays: 140 },
};
const CROP_NAMES = Object.keys(CROPS);
const VARIETIES = Object.values(CROPS).map((c) => c.variety);

// ── Field list ──────────────────────────────────────────────────────────────────────────────────────────

type Def = [key: string, label: string, type: CropSownFieldType, options?: readonly string[]];

const section = (id: string, title: string, defs: Def[]): CropSownSectionDef => ({
  id,
  title,
  fields: defs.map(([key, label, type, options]) => ({ key, label, type, options })),
});

const STAFF: Def[] = [
  ["da_name", "DA Name", "text"],
  ["da_mobile_number", "DA Mobile Number", "text"],
  ["supervisor_name", "Supervisor Name", "text"],
  ["supervisor_mobile_number", "Supervisor Mobile Number", "text"],
];
const SEASON_WINDOW: Def[] = [
  ["season", "Season", "select", SEASONS],
  ["start_gc", "Start GC", "date"],
  ["end_gc", "End GC", "date"],
  ["start_month", "Start Month", "number"],
  ["start_day", "Start Day", "number"],
  ["end_month", "End Month", "number"],
  ["end_day", "End Day", "number"],
];
const WATER: Def[] = [
  ["water_source", "Water Source", "select", WATER_SOURCES],
  ["water_source_method", "Method", "select", WATER_METHODS],
  ["water_source_frequency", "Frequency", "select", FREQUENCIES],
];
const LOCATION: Def[] = [
  ["region", "Region", "select", REGIONS],
  ["zone", "Zone", "select", ZONES],
  ["woreda", "Woreda", "select", WOREDAS],
  ["kebele", "Kebele", "select", KEBELES],
];
// Planning and Cultivation each carry a cluster section with the same shape; only the plan/collected labels differ.
const clusterDefs = (actual: boolean): Def[] => [
  ["land_id", "Land ID", "text"],
  ["cluster_id", "Cluster ID", "text"],
  ["cluster_name", "FPC Name", "text"],
  ...SEASON_WINDOW,
  ["establishing_date", "Establishing Date (GC)", "date"],
  ["establishing_date_ec", "Establishing Date (EC)", "date"],
  ...LOCATION,
  ["sub_kebele", "Sub Kebele", "text"],
  ["agro_ecological_zone", "Agro-ecological Zone", "select", AGRO_ZONES],
  ["latitude", "Plot Latitude", "text"],
  ["longitude", "Plot Longitude", "text"],
  ["reference", "Reference", "text"],
  ["primary_commodity", "Primary Commodity", "select", CROP_NAMES],
  ["secondary_commodity", "Secondary Commodity", "select", CROP_NAMES],
  ["fpc_type", "FPC Type", "select", FPC_TYPES],
  ["leader", "Leader", "select", CLUSTER_MEMBERS],
  ["co_leader", "Co-Leader", "select", CLUSTER_MEMBERS],
  ["coordinator", "Coordinator", "select", CLUSTER_MEMBERS],
  ["secretary", "Secretary", "select", CLUSTER_MEMBERS],
  ["cluster_area_timad", "Total Cultivated Area (Timad)", "number"],
  ["cluster_area_hectare", "Total Cultivated Area (ha)", "number"],
  ["cluster_plan", actual ? "Actual Plan (ha)" : "Plan (ha)", "number"],
  ["collected_land", actual ? "Actual Collected Land (Quintal)" : "Collected Land (Quintial)", "number"],
  ["collected_quintal", actual ? "Actual Collected Quintal" : "Collected Quintal", "number"],
  ["collected_by_combiner", actual ? "Actual Collected by Combiner (ha)" : "Collected by Combiner (ha)", "number"],
  ...WATER,
  ["number_of_smallholders", "Number of Smallholders", "number"],
  ...STAFF,
];

// The registry has four intake forms (Planning, Cultivation, Sowing, Harvesting), each one page that opens with the farmer
// identity and the crop year / season it is filed under. Planning also carries the location.
const IDENTITY = () =>
  section("identity", "Farmer Identity", [
    ["farmer_id", "Farmer ID", "text"],
    ["farmer_name", "Farmer Name", "text"],
    ["fayda_fan_id", "Fayda ID (FAN)", "text"],
    ["crop_year", "Crop Year", "text"],
    ["production_season", "Production Season", "select", SEASONS],
  ]);
const ADDRESS = () => section("address", "Address / Location", [["geo_code_hierarchy_json", "Location Hierarchy", "geo"], ["latitude", "Geo Latitude", "text"], ["longitude", "Geo Longitude", "text"]]);

const PORTAL_FORM: CropSownTabDef[] = [
  {
    key: "planning",
    label: "Planning",
    sections: [
      IDENTITY(),
      ADDRESS(),
      section("planning", "Crop Planning Details", [
        ["is_plot_not_registered", "Is Plot Not Registered?", "select", YES_NO],
        ["land_id", "Land ID", "text"],
        ["plot_category", "Plot Category", "select", PLOT_CATEGORIES],
        ["ownership_type", "Ownership Type", "select", OWNERSHIP],
        ["land_area", "Total Land Area (ha)", "number"],
        ["soil_fertility_type", "Soil Fertility", "select", SOIL_FERTILITY],
        ...LOCATION,
        ["gps_coordinate", "GPS Coordinate", "text"],
        ...SEASON_WINDOW,
        ["commodity", "Crop", "select", CROP_NAMES],
        ["crop_variety", "Crop Variety", "select", VARIETIES],
        ["crop_category", "Crop Category", "select", CROP_CATEGORIES],
        ["local_name", "Local Name", "text"],
        ["scientific_name", "Scientific Name", "text"],
        ["cropping_system", "Cropping System", "select", CROPPING_SYSTEMS],
        ["planned_date", "Planned Date (GC)", "date"],
        ["planned_date_ec", "Planned Date (EC)", "date"],
        ["growth_duration_days", "Average Growth Duration (days)", "number"],
        ["planned_area", "Planned Crop Area (ha)", "number"],
        ["expected_yield", "Expected Yield (quintals)", "number"],
        ["seed_class", "Seed Type", "select", SEED_CLASSES],
        ["seed_source", "Seed Source", "select", SEED_SOURCES],
        ["seed_variety", "Seed Variety", "select", VARIETIES],
        ["planned_seed_qty", "Planned Seed Quantity (kg)", "number"],
        ["planned_fertilizer_type", "Planned Fertilizer Type", "select", FERTILIZERS],
        ["planned_fertilizer_qty", "Planned Fertilizer Quantity (kg)", "number"],
        ["planned_labor", "Planned Labour", "number"],
        ...WATER,
        ...STAFF,
      ]),
      section("planning-cluster", "Cluster Information Details", clusterDefs(false)),
    ],
  },
  {
    key: "cultivation",
    label: "Cultivation / Land Preparation",
    sections: [
      IDENTITY(),
      section("cultivation", "Cultivation / Land Preparation Details", [
        ["is_plot_not_registered", "Is Plot Not Registered?", "select", YES_NO],
        ["land_id", "Land ID", "text"],
        ["land_area", "Total Land Area (ha)", "number"],
        ...SEASON_WINDOW,
        ["commodity", "Crop", "select", CROP_NAMES],
        ["crop_category", "Crop Category", "select", CROP_CATEGORIES],
        ["crop_variety", "Crop Variety", "select", VARIETIES],
        ["local_name", "Local Name", "text"],
        ["scientific_name", "Scientific Name", "text"],
        ["cropping_system", "Cropping System", "select", CROPPING_SYSTEMS],
        ["actual_cultivation_date", "Actual Cultivation Date (GC)", "date"],
        ["actual_cultivation_date_ec", "Actual Cultivation Date (EC)", "date"],
        ["actual_growth_duration_days", "Actual Growth Duration (days)", "number"],
        ["actual_crop_area", "Actual Crop Area (ha)", "number"],
        ["actual_yield", "Actual Yield (quintal)", "number"],
        ["cultivation_type", "Cultivation Type", "select", CULTIVATION_TYPES],
        ["land_prep_method", "Land Preparation Method", "multiselect", LAND_PREP],
        ["actual_seed_class", "Seed Type", "select", SEED_CLASSES],
        ["actual_seed_source", "Seed Source", "select", SEED_SOURCES],
        ["seed_variety", "Seed Variety", "select", VARIETIES],
        ["actual_seed_qty", "Actual Seed Quantity (kg)", "number"],
        ["actual_fertilizer_type", "Actual Fertilizer Type", "select", FERTILIZERS],
        ["actual_fertilizer_qty", "Actual Fertilizer Quantity (kg)", "number"],
        ...WATER,
        ...STAFF,
      ]),
      section("cultivation-cluster", "Cultivation Cluster Information Details", clusterDefs(true)),
    ],
  },
  {
    key: "sowing",
    label: "Sowing",
    sections: [
      IDENTITY(),
      section("sowing", "Sowing Details", [
        ["land_id", "Land ID", "text"],
        ["cluster_status", "Cluster / Non Cluster Status", "multiselect", CLUSTER_STATUS],
        ["cluster_id", "Cluster ID", "text"],
        ["cluster_name", "FPC Name", "text"],
        ["cluster_season", "Season (Cluster)", "select", SEASONS],
        ["agro_ecological_zone", "Agro-ecological Zone", "select", AGRO_ZONES],
        ["cluster_area_hectare", "Total Cultivated Area (ha)", "number"],
        ["cluster_area_sown", "Area Sown (ha) (Cluster)", "number"],
        ["cluster_has_pest_disease", "Pest / Disease Occurrence (Cluster)", "radio", YES_NO],
        ["season", "Season", "select", SEASONS],
        ["area_sown", "Area Sown (ha)", "number"],
        ["commodity", "Actual Crop Name", "select", CROP_NAMES],
        ["sowing_date", "Sowing Date (GC)", "date"],
        ["sowing_date_ec", "Sowing Date (EC)", "date"],
        ["fertilizer_type", "Actual Fertilizer Type", "select", FERTILIZERS],
        ["fertilizer_qty", "Actual Fertilizer Quantity (kg)", "number"],
        ["has_pest_disease", "Pest / Disease Occurrence", "radio", YES_NO],
        ...STAFF,
      ]),
      section("infestation", "Infestation Incident Details", [
        ["infestation_id", "Incident Record ID", "text"],
        ["land_id", "Land ID", "text"],
        ["cluster_status", "Cluster / Non Cluster Status", "select", CLUSTER_STATUS],
        ["cluster_name", "FPC Name", "text"],
        ["commodity", "Crop type affected", "select", CROP_NAMES],
        ["infestation_type", "Type of Infestation", "select", INFESTATION_TYPES],
        ["pest_type", "Pest Type", "select", PEST_TYPES],
        ["pest_name", "Pest Name", "text"],
        ["pesticide_method", "Method of Control (Pest)", "select", CONTROL_METHODS],
        ["pesticide_type", "Pesticide Type", "select", PESTICIDE_TYPES],
        ["pesticide_name", "Pesticide Name", "text"],
        ["pesticide_frequency", "Frequency of Application (Pest)", "text"],
        ["weed_type", "Weed Type", "select", WEED_TYPES],
        ["weed_name", "Weed Name", "text"],
        ["weed_control_method", "Method of Control (Weed)", "select", CONTROL_METHODS],
        ["weedicide_type", "Weedicides Type", "select", WEEDICIDE_TYPES],
        ["weedicide_name", "Weedicides Name", "text"],
        ["weedicide_frequency", "Frequency of Application (Weed)", "text"],
        ["disease_type", "Disease Type", "select", DISEASE_TYPES],
        ["disease_name", "Disease Name", "text"],
        ["disease_control_method", "Method of Control (Disease)", "select", CONTROL_METHODS],
        ["fungicide_type", "Fungicide/Bactericide Type", "select", FUNGICIDE_TYPES],
        ["fungicide_name", "Fungicide/Bactericide Name", "text"],
        ["disease_frequency_of_application", "Frequency of Application (Disease)", "text"],
        ["nutrient_type", "Nutrient Type", "select", NUTRIENT_TYPES],
        ["nutrient_name", "Nutrient Name", "text"],
        ["nutrient_control_method", "Method of Control (Nutrient)", "select", CONTROL_METHODS],
        ["nutrient_fertilizer_type", "Fertilizer/Amendment Type", "select", AMENDMENT_TYPES],
        ["nutrient_fertilizer_name", "Fertilizer/Amendment Name", "text"],
        ["nutrient_frequency_of_application", "Frequency of Application (Nutrient)", "text"],
        ["shock_type", "Shock Type", "select", SHOCK_TYPES],
        ["shock_event_name", "Shock Event Name/Description", "text"],
        ["climate_control_method", "Method of Control (Climate)", "select", CONTROL_METHODS],
        ["recovery_input_type", "Recovery Input Type", "select", RECOVERY_INPUTS],
        ["recovery_input_name", "Recovery Input Name", "text"],
        ["climate_frequency_of_application", "Frequency of Application (Climate)", "text"],
        ["growth_stage", "Growth Stage", "select", GROWTH_STAGES],
        ["observation_date", "Date of Observation (GC)", "date"],
        ["observation_date_ec", "Date of Observation (EC)", "date"],
        ["severity_level", "Severity Level", "select", SEVERITY],
        ["estimated_damage_pct", "Estimated Crop Damage (%) or (ha)", "text"],
      ]),
    ],
  },
  {
    key: "harvesting",
    label: "Harvesting",
    sections: [
      IDENTITY(),
      section("harvest", "Harvest Details", [
        ["land_id", "Land ID", "text"],
        ["cluster_status", "Cluster / Non Cluster Status", "multiselect", CLUSTER_STATUS],
        ["cluster_name", "FPC Name", "text"],
        ["cluster_crop_maturity_status", "Crop Maturity Status (Cluster)", "select", MATURITY],
        ["cluster_harvest_date", "Harvest Date (Cluster)", "date"],
        ["cluster_area_harvested", "Area Harvested (ha) (Cluster)", "number"],
        ["cluster_qty_harvested", "Quantity Harvested (quintal) (Cluster)", "number"],
        ["cluster_post_harvest_loss_pct", "Post-harvest Loss (%) (Cluster)", "number"],
        ["cluster_qty_stored", "Quantity Stored (quintal) (Cluster)", "number"],
        ["cluster_qty_sold", "Quantity Sold (quintal) (Cluster)", "number"],
        ["commodity", "Actual Crop Name", "select", CROP_NAMES],
        ["crop_maturity_status", "Crop Maturity Status", "select", MATURITY],
        ["harvest_date", "Harvest Date", "date"],
        ["area_harvested", "Area Harvested (ha)", "number"],
        ["qty_harvested", "Quantity Harvested (quintal)", "number"],
        ["post_harvest_loss_pct", "Post-harvest Loss (%)", "number"],
        ["qty_stored", "Quantity Stored (quintal)", "number"],
        ["qty_sold", "Quantity Sold (quintal)", "number"],
        ["yield_kg_ha", "Yield (kg/ha)", "number"],
        ["yield_performance_pct", "Yield Performance (%)", "number"],
        ["fertilizer_efficiency", "Fertilizer Efficiency", "number"],
        ["land_utilization_rate", "Land Utilization Rate", "number"],
        ["seed_productivity", "Seed Productivity", "number"],
        ...STAFF,
      ]),
    ],
  },
];

/** The Crop Sown form: the portal's tabs and sections with the registry's own field definitions (see cropSownSpecApply). */
export const CROP_SOWN_FORM: CropSownTabDef[] = applySpec(PORTAL_FORM);

export const CROP_SOWN_INTRO_TAB = "crop-sown";
const INTRO_SECTIONS = ["identity", "address"];

/**
 * The tabs the Submit Crop Report form shows, as in the design: every registry form opens with the identity, so the form
 * asks for it once, with the address, on an opening "Crop Sown" tab; each stage tab holds only its own sections. Values
 * are keyed by section, so a stage still saves them (see STAGE_PLANS).
 */
export const CROP_SOWN_TABS: CropSownTabDef[] = [
  { key: CROP_SOWN_INTRO_TAB, label: "Crop Sown", sections: CROP_SOWN_FORM[0].sections.filter((s) => INTRO_SECTIONS.includes(s.id)) },
  ...CROP_SOWN_FORM.map((tab) => ({ ...tab, sections: tab.sections.filter((s) => !INTRO_SECTIONS.includes(s.id)) })),
];

// ── Sample record ───────────────────────────────────────────────────────────────────────────────────────

const ZONE_BY_WOREDA: Record<string, string> = { "Adea woreda": "East Shewa", "Lume woreda": "East Shewa" };
const SUPERVISOR = { name: "Almaz Tesfaye", phone: "+251 91 662 0418" };
const DA_PHONE = "+251 91 430 7782";

const round = (n: number, digits = 1) => Number(n.toFixed(digits));

/**
 * Fields the Farmer, Land and Cluster registries already hold for a farmer. The Submit Crop Report form fills
 * these as soon as the farmer is found and shows them read-only; the DA enters only the rest.
 */
const REGISTRY_KEYS = new Set([
  "farmer_id", "farmer_name", "geo_code_hierarchy_json", "latitude", "longitude",
  "is_plot_registered", "land_id", "plot_category", "ownership_type", "land_area", "soil_fertility_type",
  "region", "zone", "woreda", "kebele", "gps_coordinate",
  "commodity", "crop_category", "crop_variety", "local_name", "scientific_name",
  "cluster_id", "cluster_name", "cluster_status", "establishing_date", "establishing_date_ec", "sub_kebele",
  "agro_ecological_zone", "primary_commodity", "secondary_commodity", "fpc_type",
  "leader", "co_leader", "coordinator", "secretary", "cluster_area_timad", "cluster_area_hectare", "number_of_smallholders",
  "da_name", "da_mobile_number", "supervisor_name", "supervisor_mobile_number",
]);

/** The farmer's full sample Crop Sown record (2025 Meher). Dates are ISO yyyy-mm-dd; EC dates in the Ethiopian calendar. */
export function getCropSownRecord(farmer: Farmer): CropSownValues {
  const crop = CROPS[farmer.crop] ?? CROPS.Teff;
  const index = FARMERS.findIndex((f) => f.id === farmer.id);
  const zone = ZONE_BY_WOREDA[farmer.woreda] ?? "West Shewa";
  const woreda = farmer.woreda.replace(/ woreda$/i, "");
  const plot = PLOTS[0];
  const code = woreda.slice(0, 2).toUpperCase();
  const landId = `LND-${code}-${String(index + 1).padStart(3, "0")}-04`;

  // Plan, then what actually happened on the plot: the same figures feed the harvest indicators.
  const plannedArea = round(farmer.landHa * 0.8);
  const actualArea = round(farmer.landHa * 0.75);
  const expectedYield = round(plannedArea * crop.yieldQPerHa);
  const actualSeed = round(actualArea * crop.seedKgPerHa);
  const actualFertilizer = Math.round(actualArea * 100);
  const harvested = round(actualArea * crop.yieldQPerHa * 0.95);
  const lossPct = 6;
  const sold = round(harvested * 0.4);

  const common = {
    land_id: landId,
    is_plot_registered: "Yes",
    land_area: farmer.landHa,
    region: farmer.region,
    zone,
    woreda,
    kebele: farmer.kebele,
    latitude: plot.lat,
    longitude: plot.lng,
    commodity: farmer.crop,
    crop_category: crop.category,
    crop_variety: crop.variety,
    seed_variety: crop.variety,
    local_name: crop.localName,
    scientific_name: crop.scientificName,
    cropping_system: "Sole cropping",
    season: "Meher",
    start_gc: "2025-06-11",
    end_gc: "2025-09-10",
    start_month: 6,
    start_day: 11,
    end_month: 9,
    end_day: 10,
    water_source: "Rain-fed",
    water_source_method: "Furrow",
    water_source_frequency: "Weekly",
    cluster_id: `CL-${code}-014`,
    cluster_name: `${farmer.kebele} ${farmer.crop} Farmer Production Cluster`,
    cluster_status: "Cluster",
    agro_ecological_zone: "Weyna Dega (mid-highland)",
    cluster_area_hectare: 48,
    da_name: CURRENT_AGENT.name,
    da_mobile_number: DA_PHONE,
    supervisor_name: SUPERVISOR.name,
    supervisor_mobile_number: SUPERVISOR.phone,
  };
  const cluster = (actual: boolean) => ({
    establishing_date: "2024-03-10",
    establishing_date_ec: "2016-07-01",
    sub_kebele: "Got 03",
    reference: "Woreda Agriculture Office",
    primary_commodity: farmer.crop,
    secondary_commodity: "Barley",
    fpc_type: "Seed multiplication",
    leader: "Gudina Tolesa",
    co_leader: "Ayantu Bekele",
    coordinator: "Bekele Fayisa",
    secretary: "Lensa Abdisa",
    cluster_area_timad: 192,
    cluster_plan: actual ? 46 : 50,
    collected_land: actual ? 44 : 48,
    collected_quintal: actual ? 655 : 720,
    collected_by_combiner: actual ? 18 : 20,
    number_of_smallholders: 64,
  });

  const bySection: Record<string, Record<string, string | number>> = {
    identity: {
      farmer_id: registryCode(farmer),
      farmer_name: farmer.name,
      fayda_fan_id: `4821 7735 ${String(1000 + index * 137).slice(-4)}`,
      crop_year: "2025",
      production_season: "Meher",
    },
    address: {
      geo_code_hierarchy_json: `${farmer.region} > ${zone} > ${woreda} > ${farmer.kebele}`,
      latitude: plot.lat,
      longitude: plot.lng,
    },
    planning: {
      plot_category: "Farm land",
      ownership_type: "Certified holding (Level 2)",
      soil_fertility_type: "Medium",
      gps_coordinate: `${plot.lat}, ${plot.lng}`,
      planned_date: "2025-06-18",
      planned_date_ec: "2017-10-11",
      growth_duration_days: crop.growthDays,
      planned_area: plannedArea,
      expected_yield: expectedYield,
      seed_class: "Certified",
      seed_source: "Cooperative union",
      planned_seed_qty: round(plannedArea * crop.seedKgPerHa),
      planned_fertilizer_type: "NPS + Urea",
      planned_fertilizer_qty: Math.round(plannedArea * 100),
      planned_labor: 6,
    },
    "planning-cluster": cluster(false),
    cultivation: {
      actual_cultivation_date: "2025-06-25",
      actual_cultivation_date_ec: "2017-10-18",
      actual_growth_duration_days: crop.growthDays + 4,
      actual_crop_area: actualArea,
      actual_yield: harvested,
      cultivation_type: "Conventional tillage",
      land_prep_method: "Oxen ploughing, Harrowing",
      actual_seed_class: "Certified",
      actual_seed_source: "Cooperative union",
      actual_seed_qty: actualSeed,
      actual_fertilizer_type: "NPS + Urea",
      actual_fertilizer_qty: actualFertilizer,
    },
    "cultivation-cluster": cluster(true),
    sowing: {
      cluster_season: "Meher",
      cluster_area_sown: 45,
      cluster_has_pest_disease: "Yes",
      area_sown: actualArea,
      sowing_date: "2025-07-02",
      sowing_date_ec: "2017-10-25",
      fertilizer_type: "NPS + Urea",
      fertilizer_qty: actualFertilizer,
      has_pest_disease: "Yes",
    },
    infestation: {
      infestation_id: `INF-2025-${String(index + 1).padStart(4, "0")}`,
      infestation_type: "Pest",
      pest_type: "Insect",
      pest_name: "Fall armyworm",
      pesticide_method: "Chemical spraying",
      pesticide_type: "Insecticide",
      pesticide_name: "Malathion 50% EC",
      pesticide_frequency: "Twice, 10 days apart",
      weed_type: "Broadleaf",
      weed_name: "Parthenium",
      weed_control_method: "Hand weeding",
      weedicide_type: "Selective herbicide",
      weedicide_name: "2,4-D Amine",
      weedicide_frequency: "Once",
      disease_type: "Fungal",
      disease_name: "Rust",
      disease_control_method: "Chemical spraying",
      fungicide_type: "Fungicide",
      fungicide_name: "Mancozeb 80% WP",
      disease_frequency_of_application: "Once",
      nutrient_type: "Nitrogen deficiency",
      nutrient_name: "Nitrogen",
      nutrient_control_method: "Top dressing",
      nutrient_fertilizer_type: "Inorganic",
      nutrient_fertilizer_name: "Urea",
      nutrient_frequency_of_application: "Once",
      shock_type: "Dry spell",
      shock_event_name: "Two-week dry spell in late July",
      climate_control_method: "Supplementary irrigation",
      recovery_input_type: "Water",
      recovery_input_name: "Pond water",
      climate_frequency_of_application: "Twice a week",
      growth_stage: "Tillering",
      observation_date: "2025-08-05",
      observation_date_ec: "2017-11-29",
      severity_level: "Moderate",
      estimated_damage_pct: "12%",
    },
    harvest: {
      cluster_crop_maturity_status: "Fully mature",
      cluster_harvest_date: "2025-11-18",
      cluster_area_harvested: 44,
      cluster_qty_harvested: 655,
      cluster_post_harvest_loss_pct: 7,
      cluster_qty_stored: 340,
      cluster_qty_sold: 270,
      crop_maturity_status: "Fully mature",
      harvest_date: "2025-11-20",
      area_harvested: actualArea,
      qty_harvested: harvested,
      post_harvest_loss_pct: lossPct,
      qty_stored: round(harvested - sold - (harvested * lossPct) / 100),
      qty_sold: sold,
      yield_kg_ha: Math.round((harvested * 100) / actualArea),
      yield_performance_pct: Math.round((harvested / expectedYield) * 100),
      fertilizer_efficiency: round((harvested * 100) / actualFertilizer),
      land_utilization_rate: round(actualArea / farmer.landHa, 2),
      seed_productivity: round((harvested * 100) / actualSeed),
    },
  };

  const values: CropSownValues = {};
  for (const tab of CROP_SOWN_FORM) {
    for (const s of tab.sections) {
      const own = bySection[s.id] ?? {};
      for (const f of s.fields) {
        const v = own[f.key] ?? (common as Record<string, string | number>)[f.key];
        if (v !== undefined) values[valueKey(s.id, f.key)] = String(v);
      }
    }
  }
  return values;
}

/** What the registries already know about the farmer — the Submit Crop Report form's starting values. */
export function getCropSownPrefill(farmer: Farmer): CropSownValues {
  const record = getCropSownRecord(farmer);
  return Object.fromEntries(Object.entries(record).filter(([k]) => REGISTRY_KEYS.has(k.slice(k.indexOf(".") + 1))));
}

/** Farmers whose Farmer ID matches (case-insensitive). IDs are not guaranteed unique yet, so this can return several. */
export function findFarmersById(farmerId: string): Farmer[] {
  const wanted = farmerId.trim().toUpperCase();
  if (!wanted) return [];
  const normalized = wanted.startsWith("FR-") ? wanted : `FR-${wanted}`;
  return FARMERS.filter(
    (f) => registryCode(f) === wanted || registryCode(f) === normalized || f.name.toUpperCase().includes(wanted),
  );
}

export { registryCode };

// ── Display ─────────────────────────────────────────────────────────────────────────────────────────────

const GC_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const EC_MONTHS = ["Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit", "Megabit", "Miyazya", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume"];

/** A stored value as shown on screen: dates as "18 Jun 2025" (GC) or "11 Sene 2017" (EC). */
export function formatCropSownValue(field: CropSownFieldDef, raw: string | undefined): string {
  if (!raw) return "—";
  const date = field.type === "date" && /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!date) return raw;
  const months = field.key.endsWith("_ec") ? EC_MONTHS : GC_MONTHS;
  return `${date[3]} ${months[Number(date[2]) - 1] ?? date[2]} ${date[1]}`;
}

export interface CropSownField {
  key: string;
  label: string;
  value: string;
}

export interface CropSownSection {
  title: string;
  fields: CropSownField[];
}

export interface CropSownTab {
  key: string;
  label: string;
  sections: CropSownSection[];
}

/** Crop Sown values laid out tab → section → field, ready to display. */
export function cropSownTabs(record: CropSownValues): CropSownTab[] {
  return CROP_SOWN_FORM.map((tab) => ({
    key: tab.key,
    label: tab.label,
    sections: tab.sections.map((s) => ({
      title: s.title,
      fields: s.fields.map((f) => ({ key: f.key, label: f.label, value: formatCropSownValue(f, record[valueKey(s.id, f.key)]) })),
    })),
  }));
}
