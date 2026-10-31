import { useEffect, useState } from "react";
import { authRequest } from "@/features/auth";

// Farmer Registry data the registration wizard needs, read through DA Services:
// dropdown options and places come from the registry itself, so nothing here is hard-coded.

/** One choice of a registry dropdown: `value` is the code POST /farmers takes, `label` what people read. */
export interface FieldOption {
  value: string;
  label: string;
}

/** Register mnemonic (Farmer, Land, Crop …) → registry field name → its options. */
export type FieldOptions = Record<string, Record<string, FieldOption[]>>;

/** A Master Data place: region, zone, woreda or kebele. The kebele id (ET04080101) is what registration takes. */
export interface Place {
  id: string;
  name: string;
}

export type PlaceLevel = "region" | "zone" | "woreda" | "kebele";

let fieldOptionsRequest: Promise<FieldOptions> | null = null;

/** GET /registries/farmer/field-options, once per page load (the backend caches it for an hour too). */
export function fetchFieldOptions(): Promise<FieldOptions> {
  if (!fieldOptionsRequest) {
    fieldOptionsRequest = authRequest<{ data: { options: FieldOptions } }>("/da-services/registries/farmer/field-options")
      .then((res) => res.data.options)
      .catch((err: unknown) => {
        fieldOptionsRequest = null; // let the next caller try again
        throw err;
      });
  }
  return fieldOptionsRequest;
}

/** The registry's dropdown options, with loading and error state for a form. */
export function useFieldOptions(): { options: FieldOptions; loading: boolean; error: string | null } {
  const [state, setState] = useState<{ options: FieldOptions; loading: boolean; error: string | null }>({ options: {}, loading: true, error: null });
  useEffect(() => {
    let current = true;
    fetchFieldOptions()
      .then((options) => current && setState({ options, loading: false, error: null }))
      .catch((err: unknown) => current && setState({ options: {}, loading: false, error: err instanceof Error ? err.message : "Could not load the registry options." }));
    return () => {
      current = false;
    };
  }, []);
  return state;
}

/** Label of a stored code, falling back to the code itself. */
export const optionLabel = (options: FieldOption[] | undefined, value: string) => options?.find((o) => o.value === value)?.label ?? value;

const placeRequests = new Map<string, Promise<Place[]>>();

/** GET /registries/farmer/places: one level of the Master Data hierarchy under `parent`. */
export function fetchPlaces(level: PlaceLevel, parent?: string): Promise<Place[]> {
  const key = `${level}:${parent ?? ""}`;
  let request = placeRequests.get(key);
  if (!request) {
    const query = new URLSearchParams({ level, ...(parent ? { parent } : {}) });
    request = authRequest<{ data: { places: Place[] } }>(`/da-services/registries/farmer/places?${query}`)
      .then((res) => res.data.places)
      .catch((err: unknown) => {
        placeRequests.delete(key);
        throw err;
      });
    placeRequests.set(key, request);
  }
  return request;
}

/** POST /farmers/registrations/documents: the file goes to the registry document store; keep the returned id. */
export async function uploadRegistrationDocument(file: File): Promise<{ document_id: string; file_name: string; size: number }> {
  const body = new FormData();
  body.append("file", file);
  const res = await authRequest<{ data: { document_id: string; file_name: string; size: number } }>("/da-services/farmers/registrations/documents", { method: "POST", body });
  return res.data;
}

/** Body of POST /farmers. Codes come from the field options; see the backend's FarmerRegistrationForm. */
export interface FarmerRegistration {
  first_name: string;
  father_name?: string;
  grandfather_name?: string;
  first_name_local?: string;
  middle_name_local?: string;
  last_name_local?: string;
  language_spoken?: string;
  gender?: string;
  date_of_birth?: string;
  phone?: string;
  kebele?: string;
  location?: string;
  national_id?: string;
  fayda_rid?: string;
  marital_status?: string;
  education_level?: string;
  income_sources?: string[];
  income_source_other?: string;
  is_psnp_user?: boolean;
  disabled?: boolean;
  disability_type?: string;
  disability_severity?: string;
  household?: {
    size: number;
    number_of_children?: number;
    other_land_owner?: boolean;
    father_included?: boolean;
    mother_included?: boolean;
    members: { first_name: string; father_name?: string; grandfather_name: string; gender: string; date_of_birth: string; relationship: string }[];
  };
  membership?: {
    is_primary_cooperative_member: boolean;
    primary_cooperative_name?: string;
    is_cooperative_union_member: boolean;
    cooperative_union_name?: string;
    is_farmer_cluster_member: boolean;
    farmer_cluster_role?: string;
    primary_commodity?: string;
  };
  identity_document_id?: string;
  identity_document_type?: string;
  lands?: { ownership: string; area_hectare?: number; soil_fertility?: string; current_land_use?: string; means_of_acquisition?: string; year_of_acquisition?: number; remark?: string }[];
  crops?: { name: string; planted_date?: string; season?: string; end_use?: string }[];
  livestock?: { animal: string; count: number; system?: string; breed?: string; gender?: string; body_condition?: string; production_type?: string }[];
  /** Idempotency key: the same key twice returns the first registration instead of a second one. */
  client_op_id?: string;
}

/** What POST /farmers answers once the registry has the submission. */
export interface RegistrationResult {
  submission_id: string | null;
  event_id: string;
  /** PENDING_APPROVAL once finalized; DUPLICATE when the same client_op_id was sent before. */
  status: string;
  duplicate: boolean;
}

export async function registerFarmer(body: FarmerRegistration): Promise<RegistrationResult> {
  const res = await authRequest<{ data: RegistrationResult }>("/da-services/farmers", { method: "POST", body });
  return res.data;
}

/** GET /farmers/registrations/{submission_id}: a registration as the registry holds it, before and after approval. */
export interface RegistrationDetail {
  submission_id: string;
  application_reference: string | null;
  record_name: string | null;
  /** DRAFT, PENDING_APPROVAL, APPROVED or REJECTED. */
  status: string;
  finalized_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
}

export async function fetchRegistration(submissionId: string): Promise<RegistrationDetail> {
  const res = await authRequest<{ data: RegistrationDetail }>(`/da-services/farmers/registrations/${encodeURIComponent(submissionId)}`);
  return res.data;
}
