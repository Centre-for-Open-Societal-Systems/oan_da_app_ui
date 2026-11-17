import { useState } from "react";
import type { ApiAgent } from "@/features/agents";
import { useAuthStore } from "@/store/useAuthStore";
import { todayIso } from "@/lib/utils";
import type { Farmer } from "../types";
import { MAX_GATHERING_FARMERS, planGathering, type PlannedGathering } from "../gatheringsApi";
import { formatWhen, registryCode } from "./planVisit";

export const GATHERING_FORM_ID = "plan-gathering-form";

/** What the DA types on the gathering form. */
export interface GatheringDetails {
  title: string;
  purpose: string;
  date: string;
  time: string;
  venue: string;
  landmark: string;
  /** Map pin, optional: both or neither. */
  lat: string;
  lng: string;
  notifySms: boolean;
}

export interface PlanGatheringResult {
  gathering: PlannedGathering;
  when: string;
  count: number;
  notifySms: boolean;
}

// randomUUID needs a secure context (https or localhost); a plain-http deployment falls back to time + random.
const newOpId = () => (typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

/** "" for a valid optional pin, else what is wrong with it. */
export function pinError(lat: string, lng: string): string {
  if (!lat.trim() && !lng.trim()) return "";
  const la = Number(lat);
  const ln = Number(lng);
  if (!lat.trim() || !lng.trim() || Number.isNaN(la) || Number.isNaN(ln)) return "Enter both latitude and longitude, or leave both empty.";
  if (la < -90 || la > 90 || ln < -180 || ln > 180) return "Latitude is -90 to 90 and longitude -180 to 180.";
  return "";
}

/**
 * State of the "Plan a gathering" tab: the invited farmers (1-20, from the farmers list selection), the form and the
 * outcome of POST /gatherings. An officer plans it for the DA picked on the form (shared with the visit tab).
 */
export function usePlanGathering(initial: Farmer[], { isOfficer, assignee }: { isOfficer: boolean; assignee: ApiAgent | null }) {
  const [farmers, setFarmers] = useState<Farmer[]>(initial);
  const [details, setDetails] = useState<GatheringDetails>(() => ({ title: "", purpose: "", date: todayIso(), time: "09:00", venue: "", landmark: "", lat: "", lng: "", notifySms: true }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlanGatheringResult | null>(null);
  // One id per open form: a retry after a timeout returns the gathering already created instead of a duplicate.
  const [clientOpId] = useState(newOpId);
  const user = useAuthStore((s) => s.user?.id);

  const change = (patch: Partial<GatheringDetails>) => setDetails((prev) => ({ ...prev, ...patch }));
  const remove = (farmer: Farmer) => setFarmers((prev) => prev.filter((f) => f.id !== farmer.id));
  const withoutPhone = farmers.filter((f) => !f.phone?.trim());

  const submit = async () => {
    if (submitting) return;
    if (farmers.length === 0) return setError("Select at least one farmer on the list first.");
    if (farmers.length > MAX_GATHERING_FARMERS) return setError(`A gathering invites up to ${MAX_GATHERING_FARMERS} farmers. Remove ${farmers.length - MAX_GATHERING_FARMERS}.`);
    if (withoutPhone.length > 0) return setError(`Every farmer needs a phone number for the invitation. Remove ${withoutPhone.map((f) => f.name).join(", ")}.`);
    if (details.date < todayIso()) return setError("Pick today or a later date.");
    const pin = pinError(details.lat, details.lng);
    if (pin) return setError(pin);

    // The gathering's `user` is the owning DA's Frappe User: the officer's pick, or the DA themself.
    let owner: string;
    if (isOfficer) {
      if (!assignee) return setError("Select the development agent this gathering is for.");
      if (!assignee.email) return setError(`${assignee.full_name || assignee.da_id} has no email in the DA registry, so the gathering cannot be assigned to them.`);
      owner = assignee.email;
    } else if (user) {
      owner = user;
    } else {
      return setError("Your account could not be read. Sign in again and retry.");
    }

    const hasPin = details.lat.trim() !== "" && details.lng.trim() !== "";
    setError(null);
    setSubmitting(true);
    try {
      const gathering = await planGathering({
        user: owner,
        title: details.title.trim(),
        ...(details.purpose.trim() && { purpose: details.purpose.trim() }),
        scheduled_at: `${details.date} ${details.time}:00`,
        location: {
          name: details.venue.trim(),
          ...(details.landmark.trim() && { landmark: details.landmark.trim() }),
          ...(hasPin && { lat: Number(details.lat), lng: Number(details.lng) }),
        },
        farmers: farmers.map((f) => ({ farmer_id: registryCode(f), farmer_name: f.name, phone: f.phone.trim() })),
        notify_farmers_sms: details.notifySms,
        client_op_id: clientOpId,
      });
      setResult({ gathering, when: formatWhen(details.date, details.time), count: farmers.length, notifySms: details.notifySms });
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Could not plan the gathering.");
    } finally {
      setSubmitting(false);
    }
  };

  return { farmers, remove, withoutPhone, details, change, submit, submitting, error, result };
}
