import { authRequest } from "@/features/auth";
import { ApiError } from "@/lib/api";
import type { Advisor, AdvisorStatus, ExpertiseArea } from "./advisors";

// Advisor directory API (DA Services): POST /advisors (Admin), GET /advisors, GET /advisors/{id}.

const BASE = "/da-services/advisors";

/** An advisor as the API returns it. */
interface ApiAdvisor {
  id: string;
  name: string;
  expertise: ExpertiseArea;
  unit: string;
  region: string;
  woreda: string;
  phone: string;
  email: string;
  status: AdvisorStatus;
  availability: string;
  /** "YYYY-MM-DD HH:MM:SS". */
  updated_at: string | null;
}

/** What the Add Advisor form sends. */
export interface AdvisorInput {
  name: string;
  expertise: ExpertiseArea;
  unit: string;
  region: string;
  woreda: string;
  phone: string;
  email: string;
  status: AdvisorStatus;
  availability: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-11-16 16:07:07" → "16 Nov 2026, 16:07" (the directory's display shape). */
function stamp(value: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value ?? "");
  return m ? `${m[3]} ${MONTHS[Number(m[2]) - 1]} ${m[1]}, ${m[4]}:${m[5]}` : "—";
}

const toAdvisor = (a: ApiAdvisor): Advisor => ({
  id: a.id,
  name: a.name,
  expertise: a.expertise,
  unit: a.unit,
  region: a.region,
  woreda: a.woreda,
  phone: a.phone,
  email: a.email,
  status: a.status,
  availability: a.availability,
  updatedAt: stamp(a.updated_at),
});

/** GET /advisors: the whole directory (search and filters run in the page). */
export async function listAdvisors(): Promise<Advisor[]> {
  const res = await authRequest<{ data: ApiAdvisor[] }>(`${BASE}?limit=500`);
  return (res.data ?? []).map(toAdvisor);
}

/** GET /advisors/{id}. */
export async function fetchAdvisor(id: string): Promise<Advisor> {
  return toAdvisor((await authRequest<{ data: ApiAdvisor }>(`${BASE}/${encodeURIComponent(id)}`)).data);
}

/** POST /advisors (Admin). */
export async function createAdvisor(body: AdvisorInput): Promise<Advisor> {
  return toAdvisor((await authRequest<{ data: ApiAdvisor }>(BASE, { method: "POST", body })).data);
}

/** The text to show for a failed advisor call. */
export function describeAdvisorError(err: unknown): string {
  if (!(err instanceof ApiError)) return err instanceof Error ? err.message : "Something went wrong. Try again.";
  switch (err.status) {
    case 401: return "Your session has ended. Please sign in again.";
    case 403: return "Only an Administrator can add advisors.";
    case 404: return "Advisor not found.";
    default: return err.message;
  }
}
