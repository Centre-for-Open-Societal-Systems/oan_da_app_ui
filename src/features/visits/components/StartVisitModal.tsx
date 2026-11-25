"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { cn } from "@/lib/utils";
import { newClientOpId, startVisit, type ApiVisit } from "../api";
import type { VisitRecord } from "../types";

type Gps = { lat: number; lng: number; accuracy_m: number };
type GpsState = { status: "locating" } | { status: "ok"; fix: Gps } | { status: "unavailable" };

interface StartVisitModalProps {
  visit: VisitRecord;
  onClose: () => void;
  /** The visit as the backend has it after the check-in (physical_status "In progress"). */
  onStarted: (visit: ApiVisit) => void;
}

// Check in at the farm (POST /visits/{id}/start): the device position and the farmer's presence are recorded
// and the visit moves to In progress. Arrival time is the server's clock at check-in.
export function StartVisitModal({ visit, onClose, onStarted }: StartVisitModalProps) {
  const [arrivedAt] = useState(() => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  // Without geolocation support there is nothing to wait for.
  const [gps, setGps] = useState<GpsState>(() => (typeof navigator !== "undefined" && "geolocation" in navigator ? { status: "locating" } : { status: "unavailable" }));
  const [farmerPresent, setFarmerPresent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One id per open dialog, so a retry after a dropped response is not refused as a second start.
  const [clientOpId] = useState(newClientOpId);

  const requestFix = () =>
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ status: "ok", fix: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy_m: Math.round(pos.coords.accuracy) } }),
      () => setGps({ status: "unavailable" }),
      { enableHighAccuracy: true, timeout: 8000 },
    );

  const locate = () => {
    if (!("geolocation" in navigator)) return;
    setGps({ status: "locating" });
    requestFix();
  };

  // Ask for the position as soon as the dialog opens; the result arrives in a callback.
  useEffect(() => {
    if ("geolocation" in navigator) requestFix();
  }, []);

  const start = async () => {
    setSaving(true);
    setError(null);
    try {
      const started = await startVisit(visit.id, {
        ...(gps.status === "ok" && { gps: gps.fix }),
        farmer_present: true,
        client_op_id: clientOpId,
      });
      onStarted(started);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the visit. Please try again.");
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Start Visit"
      subtitle={`${visit.farmerName} · planned ${visit.date}, ${visit.time}`}
      bodyClassName="px-4 py-4 sm:px-6"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving} className="sm:mr-auto">
            Cancel
          </Button>
          <Button variant="brand" onClick={start} disabled={!farmerPresent || gps.status === "locating" || saving} className="gap-2">
            {saving ? "Checking in…" : "Check in"}
          </Button>
        </>
      }
    >
      {error && <Banner tone="error" title="Visit not started" className="mb-4">{error}</Banner>}

      <p className="text-[13.5px] leading-relaxed text-ink-soft">
        Starting a visit checks you in at the farm. The arrival time and location are saved with the visit.
      </p>

      <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
        <li className="flex items-center justify-between gap-4 px-4 py-3 text-[14px]">
          <span className="text-ink-soft">Arrival time</span>
          <span className="font-semibold text-ink">{arrivedAt}</span>
        </li>
        <li className="flex items-center justify-between gap-4 px-4 py-3 text-[14px]">
          <span className="text-ink-soft">GPS location</span>
          <span className={cn("text-right font-semibold", gps.status === "ok" ? "text-brand-green" : gps.status === "unavailable" ? "text-amber-700" : "text-muted")}>
            {gps.status === "ok" && `${gps.fix.lat.toFixed(4)}°, ${gps.fix.lng.toFixed(4)}° · ±${gps.fix.accuracy_m} m`}
            {gps.status === "locating" && <span className="animate-pulse">Locating…</span>}
            {gps.status === "unavailable" && (
              <>
                Not available — saved without a position{" "}
                <button type="button" onClick={locate} className="ml-1 font-semibold text-brand-green underline">Retry</button>
              </>
            )}
          </span>
        </li>
        <li className="flex items-center justify-between gap-4 px-4 py-3 text-[14px]">
          <span className="text-ink-soft">Visit</span>
          <span className="text-right font-semibold text-ink">{visit.id} · {visit.purpose}</span>
        </li>
      </ul>

      <label className="mt-4 flex cursor-pointer items-start gap-3 text-[13.5px] text-ink">
        <span className="pt-0.5"><Checkbox checked={farmerPresent} onChange={(e) => setFarmerPresent(e.target.checked)} /></span>
        <span>I am at the farm and {visit.farmerName} is present for this visit.<span className="ml-1 text-danger">*</span></span>
      </label>
      {!farmerPresent && <p className="mt-2 text-[12.5px] text-muted">Complete every field marked * to enable Check in.</p>}
    </Modal>
  );
}
