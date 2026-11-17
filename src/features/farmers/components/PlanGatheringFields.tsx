"use client";

import { Banner } from "@/components/ui/Banner";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { todayIso } from "@/lib/utils";
import { MAX_GATHERING_FARMERS } from "../gatheringsApi";
import { FarmerAvatar } from "./FarmerAvatar";
import { registryCode } from "./planVisit";
import { GATHERING_FORM_ID, pinError, type usePlanGathering } from "./usePlanGathering";

type Gathering = ReturnType<typeof usePlanGathering>;

// The gathering form (POST /gatherings): invited farmers, title, purpose, date/time, venue, landmark, optional map pin
// and SMS. Region / zone / woreda / kebele are not asked: the server stamps them from the DA's kebele assignment.
export function PlanGatheringFields({ g }: { g: Gathering }) {
  const { details, change, farmers } = g;
  const today = todayIso();
  const pastDate = details.date !== "" && details.date < today;
  const pin = pinError(details.lat, details.lng);
  const missingPhone = new Set(g.withoutPhone.map((f) => f.id));

  return (
    <form
      id={GATHERING_FORM_ID}
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void g.submit();
      }}
    >
      {g.error && <Banner tone="error" title="Gathering not saved">{g.error}</Banner>}

      <div className="flex flex-col gap-2">
        <p className="text-[14px] font-medium text-ink">
          Invited farmers <span className="text-muted">({farmers.length}/{MAX_GATHERING_FARMERS})</span>
        </p>
        {farmers.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface px-4 py-3 text-[13.5px] text-muted">No farmer selected. Close this and select 1 to {MAX_GATHERING_FARMERS} farmers on the list.</p>
        ) : (
          <ul className="green-scrollbar flex max-h-[180px] flex-col gap-1.5 overflow-y-auto">
            {farmers.map((f) => (
              <li key={f.id} className="flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2">
                <FarmerAvatar name={f.name} avatar={f.avatar} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-ink">{f.name}</p>
                  <p className={missingPhone.has(f.id) ? "text-[12px] text-danger" : "text-[12px] text-muted"}>
                    {registryCode(f)} · {missingPhone.has(f.id) ? "No phone number" : f.phone}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => g.remove(f)}
                  aria-label={`Remove ${f.name}`}
                  className="shrink-0 rounded-md p-1 text-subtle transition-colors hover:bg-zinc-100 hover:text-ink"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <FormField label="Title" htmlFor="gathering-title" required>
        <Input id="gathering-title" className="h-10" value={details.title} onChange={(e) => change({ title: e.target.value })} placeholder="e.g. Fertilizer timing training" required />
      </FormField>

      <FormField label="Purpose / notes" htmlFor="gathering-purpose">
        <Textarea id="gathering-purpose" rows={2} value={details.purpose} onChange={(e) => change({ purpose: e.target.value })} placeholder="e.g. Seasonal advisory" />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Date" htmlFor="gathering-date" required hint={pastDate ? "You cannot select a past date" : "Today or later."} hintTone={pastDate ? "error" : "muted"}>
          <Input id="gathering-date" type="date" className="h-10" value={details.date} min={today} onChange={(e) => change({ date: e.target.value })} required />
        </FormField>
        <FormField label="Time" htmlFor="gathering-time" required>
          <Input id="gathering-time" type="time" className="h-10" value={details.time} onChange={(e) => change({ time: e.target.value })} required />
        </FormField>
      </div>

      <FormField label="Venue" htmlFor="gathering-venue" required hint="Address and kebele are added from your assignment.">
        <Textarea id="gathering-venue" rows={2} value={details.venue} onChange={(e) => change({ venue: e.target.value })} placeholder="e.g. Kebele meeting hall" required />
      </FormField>

      <FormField label="Landmark" htmlFor="gathering-landmark" hint="Added to the SMS when set.">
        <Input id="gathering-landmark" className="h-10" value={details.landmark} onChange={(e) => change({ landmark: e.target.value })} placeholder="e.g. Beside the church" />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Latitude" htmlFor="gathering-lat" hint={pin || "Optional map pin, not sent in the SMS."} hintTone={pin ? "error" : "muted"}>
          <Input id="gathering-lat" type="number" step="any" inputMode="decimal" className="h-10" value={details.lat} onChange={(e) => change({ lat: e.target.value })} placeholder="9.032" />
        </FormField>
        <FormField label="Longitude" htmlFor="gathering-lng">
          <Input id="gathering-lng" type="number" step="any" inputMode="decimal" className="h-10" value={details.lng} onChange={(e) => change({ lng: e.target.value })} placeholder="38.7469" />
        </FormField>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-ink">
        <Checkbox checked={details.notifySms} onChange={(e) => change({ notifySms: e.target.checked })} />
        Notify the farmers by SMS
      </label>
    </form>
  );
}

/** Shown in place of the form once the gathering is saved. */
export function PlanGatheringSuccess({ result }: { result: NonNullable<Gathering["result"]> }) {
  const { gathering, when, count, notifySms } = result;
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <span className="flex h-14 w-14 animate-check-pop items-center justify-center rounded-full bg-brand-tint text-brand-green">
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <h3 className="mt-4 text-[17px] font-semibold text-ink">Gathering planned</h3>
      <p className="mt-2 max-w-[420px] text-[14px] leading-relaxed text-ink-soft">
        {gathering.title ? `"${gathering.title}" ` : "The gathering "}on {when} with {count} farmer{count === 1 ? "" : "s"}
        {gathering.name ? ` is saved as ${gathering.name}` : " is saved"}.
        {notifySms ? " The SMS invitations are queued." : ""}
      </p>
    </div>
  );
}
