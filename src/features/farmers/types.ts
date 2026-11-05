export type FarmerStatus = "Verified" | "Pending" | "Flagged";

/** What the portal shows for a registry status: an approved farmer is Active, every other one Inactive. */
export type FarmerActivity = "Active" | "Inactive";

export interface Farmer {
  id: string;
  /** Farmer-ID shown to people ("FR-675618129549"); also works in every farmer URL. Absent on sample farmers. */
  regId?: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  kebele: string;
  woreda: string;
  region: string;
  crop: string;
  landHa: number;
  /** The registry sent no land total: shown as a dash, not "0 ha". */
  landUnknown?: boolean;
  /** Main animal kept, recorded the same way as the primary crop. */
  livestock: string;
  /** Head count of the primary livestock. */
  livestockHeads: number;
  registeredAt: string;
  registeredTime: string;
  status: FarmerStatus;
  /** Why the record is Pending / Flagged (shown on hover); undefined when Verified. */
  statusReason?: string;
  totalPlots: number;
  /** The registry sent no plot count. */
  plotsUnknown?: boolean;
  visits: number;
  lastVisit: string;
}

export interface Plot {
  code: string;
  crop: string;
  areaHa: number;
  soil: string;
  zone: string;
  /** Plot centroid (sample GPS until the Land Registry API is available). */
  lat: number;
  lng: number;
  tenure: string;
}

export type CropOutcome = "Successful" | "Average" | "Below average";

export interface CropRecord {
  season: string;
  crop: string;
  yield: string;
  status: CropOutcome;
}

export type VaccinationStatus = "Up to date" | "Due" | "Overdue";

/** A herd or flock — the livestock counterpart of a Plot. */
export interface Herd {
  code: string;
  animal: string;
  breed: string;
  heads: number;
  purpose: string;
  housing: string;
  vaccination: VaccinationStatus;
  lastVaccinated: string;
}

/** Season-by-season livestock output — the counterpart of a CropRecord. */
export interface LivestockRecord {
  season: string;
  animal: string;
  production: string;
  status: CropOutcome;
}

export interface Visit {
  title: string;
  summary: string;
  date: string;
  time: string;
}

export interface FarmerDocument {
  name: string;
  uploadedAt: string;
  size: string;
}

export interface AdvisoryNote {
  date: string;
  author: string;
  text: string;
}
