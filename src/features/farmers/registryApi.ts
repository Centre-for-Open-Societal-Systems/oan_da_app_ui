import { authRequest } from "@/features/auth";
import { ApiError } from "@/lib/api";

// Register a farmer through DA Services (farmer-frontend-integration.md, "Register a farmer"; Postman collection
// OAN-DA-Farmers, "2. Registration form data" and "3. Register a farmer"). DA Services reads and writes the Farmer Registry.

const REGISTRY = "/da-services/registries/farmer";

/** One choice of a registry code list: send `value`, show `label`. */
export interface FieldOption {
  value: string;
  label: string;
}

/** {register: {field: [{value, label}]}}, e.g. options.Farmer.gender. */
export type FieldOptions = Record<string, Record<string, FieldOption[]>>;

/** GET /registries/farmer/field-options: {registry, options}; only the options are kept. */
export async function fetchFieldOptions(): Promise<FieldOptions> {
  return (await authRequest<{ data: { options?: FieldOptions } }>(`${REGISTRY}/field-options`)).data?.options ?? {};
}

/** The choices for a field, from whichever register lists it; undefined when no register does. */
export function optionsFor(options: FieldOptions | null | undefined, field: string): FieldOption[] | undefined {
  for (const register of Object.values(options ?? {})) {
    const list = register?.[field];
    if (Array.isArray(list)) return list;
  }
  return undefined;
}

export type PlaceLevel = "region" | "zone" | "woreda" | "kebele";

/** One place of a level; its `id` is the parent of the next level, and a kebele's `id` (e.g. ET04080101) goes in the body. */
export interface Place {
  id: string;
  name: string;
}

/** GET /registries/farmer/places?level=&parent=: the places of a level under the chosen parent (none for regions). */
export async function fetchPlaces(level: PlaceLevel, parent?: string): Promise<Place[]> {
  const query = new URLSearchParams({ level });
  if (parent) query.set("parent", parent);
  return (await authRequest<{ data: { places: Place[] } }>(`${REGISTRY}/places?${query}`)).data.places ?? [];
}

/** GET /registries/farmer/intake-form: the registry's form layout. Its shape is not documented yet, so it is passed through. */
export async function fetchRegistrationLayout(): Promise<unknown> {
  return (await authRequest<{ data: unknown }>(`${REGISTRY}/intake-form`)).data;
}

/** What the ID document upload accepts. */
export const DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;

/** Why a file cannot be uploaded as the ID document, or null when it can. */
export function documentProblem(file: { type: string; size: number }): string | null {
  if (!(DOCUMENT_TYPES as readonly string[]).includes(file.type)) return "The ID document must be a PDF, JPEG or PNG file.";
  if (file.size > DOCUMENT_MAX_BYTES) return "The ID document must be 5 MB or smaller.";
  return null;
}

/** POST /farmers/registrations/documents (multipart "file"): the document_id the registration then names. */
export async function uploadIdentityDocument(file: File): Promise<string> {
  const problem = documentProblem(file);
  if (problem) throw new ApiError(problem, 400);
  const form = new FormData();
  form.append("file", file);
  const res = await authRequest<{ data: { document_id?: string } }>("/da-services/farmers/registrations/documents", { method: "POST", body: form });
  if (!res.data?.document_id) throw new ApiError("The registry did not return a document id for the upload.", 502);
  return res.data.document_id;
}

/** The body of POST /farmers, as in the collection's "Register farmer" request. Codes come from field-options and places. */
export interface RegistrationBody {
  client_op_id: string;
  first_name: string;
  father_name: string;
  grandfather_name: string;
  gender: string;
  date_of_birth: string;
  phone: string;
  /** The kebele's place id, e.g. ET04080101. */
  kebele: string;
  national_id: string;
  /** "latitude longitude altitude accuracy", e.g. "9.03 38.74 2350 5". */
  location?: string;
  marital_status?: string;
  education_level?: string;
  income_sources?: string[];
  household?: {
    size: number;
    members: { first_name: string; grandfather_name?: string; gender?: string; date_of_birth?: string; relationship?: string }[];
  };
  identity_document_id: string;
  lands?: { ownership: string; area_hectare: number }[];
  crops?: { name: string; planted_date?: string; season?: string }[];
  livestock?: { animal: string; count: number; system?: string }[];
}

/** POST /farmers: PENDING_APPROVAL for a new registration; DUPLICATE when the client_op_id was used before. */
export interface RegistrationResult {
  submission_id: string;
  status: string;
  application_reference?: string;
}

export async function registerFarmer(body: RegistrationBody): Promise<RegistrationResult> {
  return (await authRequest<{ data: RegistrationResult }>("/da-services/farmers", { method: "POST", body })).data;
}

/** GET /farmers/registrations/{submission_id}: DRAFT / PENDING_APPROVAL / APPROVED / REJECTED and the application reference. */
export interface RegistrationStatus {
  submission_id?: string;
  status: string;
  application_reference?: string | null;
}

export async function fetchRegistrationStatus(submissionId: string): Promise<RegistrationStatus> {
  return (await authRequest<{ data: RegistrationStatus }>(`/da-services/farmers/registrations/${encodeURIComponent(submissionId)}`)).data;
}

/** A new idempotency key for one registration: reused if the same registration is sent again, so it is not created twice. */
export const newClientOpId = () => `reg-${Date.now()}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
