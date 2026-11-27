"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Banner } from "@/components/ui/Banner";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { SmsPreview } from "@/features/communication";
import { RECIPIENT_GROUPS, SIGNALS, type RecipientGroup, type SignalSource } from "@/features/communication";
import { useGeoCascade, type GeoField, type GeoLevel } from "@/features/assignments";
import { useAreaNames } from "@/features/geo";
import { broadcastToArea, broadcastToKebele, broadcastToWoreda } from "@/features/notifications";
import { useAuthStore } from "@/store/useAuthStore";
import { FileDropInput } from "@/components/ui/FileDropInput";
import { ReceivedBroadcasts } from "./ReceivedBroadcasts";

const SOURCES: SignalSource[] = ["Knowledge", "Emergency", "Weather", "Informational"];

// Region, Zone and Woreda are optional: the broadcast goes to the narrowest one picked, or to every DA when none is.
function GeoSelect({ field, label, level, hint, allLabel, onSelect, onRetry }: { field: GeoField; label: string; level: GeoLevel; hint?: string; allLabel: string; onSelect: (code: string) => void; onRetry: () => void }) {
  const id = `bc-${field}`;
  const failed = level.status === "error";
  const placeholder = level.status === "loading" ? "Loading…" : failed ? "Could not load" : allLabel;
  return (
    <FormField label={label} htmlFor={id} hint={level.error ?? hint} hintTone={failed ? "error" : "muted"}>
      <Select id={id} value={level.selected?.code ?? ""} disabled={level.status !== "ready"} onChange={(e) => onSelect(e.target.value)}>
        <option value="">{placeholder}</option>
        {level.options.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
      </Select>
      {failed && <button type="button" onClick={onRetry} className="self-start text-[12.5px] font-medium text-brand-green hover:underline">Retry</button>}
    </FormField>
  );
}

// FR-10 / §4.4: Communications Officer crafts a message, picks audience + channels, dispatches.
// In-app (POST /notifications/broadcast → the DAs' bell) is the only live channel; SMS/Telegram are
// shown but disabled until a gateway is wired.
export function BroadcastWorkspace() {
  const role = useAuthStore((s) => s.role);
  const canDispatch = role === "CommsOfficer" || role === "Admin" || role === "DA" || role === "Supervisor";
  // A DA broadcasts to their own Kebele only: the Kebeles they are posted to, from /me.
  const ownKebeleOnly = role === "DA";
  const ownKebeles = useAuthStore((s) => (s.role === "DA" ? s.profile?.kebeles : undefined));
  const [kebeleCode, setKebeleCode] = useState<string | null>(null);
  const kebeleOptions = ownKebeles ?? [];
  const kebele = ownKebeleOnly ? kebeleOptions.find((k) => k.code === kebeleCode) ?? kebeleOptions[0] ?? null : null;
  // A Supervisor broadcasts to their own Woreda only: the Woreda on their /me scope.
  const ownWoredaOnly = role === "Supervisor";
  const ownWoreda = useAuthStore((s) => (s.role === "Supervisor" ? s.profile?.scope?.woredas?.[0] ?? null : null));
  // The code is shown when the name cannot be read from the geo Master Data.
  const ownWoredaName = useAreaNames([ownWoreda])[ownWoreda ?? ""] ?? null;
  const params = useSearchParams();
  const signal = SIGNALS.find((s) => s.id === params.get("signal"));

  const [title, setTitle] = useState(signal ? signal.title : "");
  const [source, setSource] = useState<SignalSource>(signal?.source ?? "Informational");
  const [message, setMessage] = useState(signal ? signal.detail : "");
  // Audience is a whole Woreda, or for a DA one of their Kebeles.
  const { geo, select, retry } = useGeoCascade();
  // In-app, the only live channel, reaches Development Agents only, so that is the default for everyone until SMS / Telegram reach farmers.
  const [group, setGroup] = useState<RecipientGroup>("Development Agents");
  // In-app = the real notification-bell broadcast. Checked by default; SMS/Telegram are disabled stubs.
  const [inApp, setInApp] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [evidence, setEvidence] = useState<File[]>([]);

  const toDAs = group === "Development Agents";
  // A Supervisor's Woreda is fixed: their own code is what goes out. The Admin and the Communications Officer may pick a
  // Region, Zone or Woreda, none of them required: the narrowest picked is the audience, and nothing picked is every DA.
  const pickedArea = !ownKebeleOnly && !ownWoredaOnly;
  const woreda = ownWoredaOnly ? (ownWoreda ? { code: ownWoreda, name: ownWoredaName ?? ownWoreda } : null) : geo.woreda.selected;
  const area = ownKebeleOnly
    ? kebele ? `${kebele.name} Kebele` : null
    : ownWoredaOnly
      ? woreda ? `${woreda.name} Woreda` : null
      : woreda ? `${woreda.name} Woreda`
      : geo.zone.selected ? `${geo.zone.selected.name} Zone`
      : geo.region.selected ? `${geo.region.selected.name} Region`
      : "every Region";
  const areaLabel = area ?? (ownKebeleOnly ? "your Kebele" : "the selected Woreda");

  const dispatch = async () => {
    setError(null);
    setNotice(null);
    // In-app bell reaches Development Agents only.
    if (!toDAs) {
      setError("In-app delivery reaches Development Agents only. Choose “All Development Agents”, or wait for SMS / Telegram.");
      return;
    }
    if (!area) return;
    const target = ownKebeleOnly ? kebele : woreda;
    if (!pickedArea && !target) return;
    setSending(true);
    try {
      const input = { title: title.trim(), body: message.trim(), href: "/notifications", source };
      const res = pickedArea
        ? await broadcastToArea({ ...input, region: geo.region.selected?.code, zone: geo.zone.selected?.code, woreda: geo.woreda.selected?.code })
        : ownKebeleOnly
          ? await broadcastToKebele({ ...input, kebeleCode: target!.code })
          : await broadcastToWoreda({ ...input, woredaCode: target!.code });
      setNotice(
        res.duplicate
          ? `Already sent to ${area} — no duplicate created.`
          : `Broadcast delivered to ${res.recipients} Development Agent${res.recipients === 1 ? "" : "s"} in ${area} — it is now in their notification bell.`,
      );
      setTitle(""); setMessage(""); setEvidence([]);
    } catch (err) {
      // ApiError.message already carries the backend's reason (e.g. "Woreda X is not in your scope", or no DA is posted there).
      setError(err instanceof Error ? err.message : "Could not send the broadcast. Try again.");
    } finally {
      setSending(false);
    }
  };

  const canSend = canDispatch && Boolean(area) && !sending && inApp && title.trim().length >= 3 && message.trim().length >= 5;

  return (
    <>
      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}
      {error && <Banner tone="error" onDismiss={() => setError(null)}>{error}</Banner>}
      {signal && <Banner tone="info" title={`Crafting a response to signal ${signal.id}`}>{signal.title} — received {signal.receivedAt}.</Banner>}

      <Card className="p-4 sm:p-6 shadow-card">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-line-soft pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-brand-green">
                <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <h2 className="text-[17px] font-bold tracking-tight text-ink">Compose</h2>
            </div>
            <p className="mt-1 text-[13px] text-ink-soft">
              Craft announcements for farmers and development agents with instant live handset preview.
            </p>
          </div>
          {!canDispatch && (
            <span className="self-start sm:self-auto rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-1 text-[11.5px] font-medium text-amber-800">
              Preview mode only (Unauthorized role)
            </span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_290px] xl:grid-cols-[1fr_310px]">
          <div className="flex flex-col gap-4">
            <FormField label="Signal source" htmlFor="bc-source" required hint="Weather appears only as a source feeding this engine.">
              <Select id="bc-source" value={source} onChange={(e) => setSource(e.target.value as SignalSource)}>
                {SOURCES.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {ownKebeleOnly ? (
                <FormField label="Kebele" htmlFor="bc-kebele" required hint={kebeleOptions.length ? "You broadcast to your own Kebele." : "No Kebele is assigned to you yet."}>
                  {kebeleOptions.length > 1 ? (
                    <Select id="bc-kebele" value={kebele?.code ?? ""} onChange={(e) => setKebeleCode(e.target.value)}>
                      {kebeleOptions.map((k) => <option key={k.code} value={k.code}>{k.name}</option>)}
                    </Select>
                  ) : (
                    <Input id="bc-kebele" value={kebele?.name ?? ""} readOnly disabled />
                  )}
                </FormField>
              ) : ownWoredaOnly ? (
                <FormField label="Woreda" htmlFor="bc-woreda" required hint={ownWoreda ? "You broadcast to your own Woreda." : "No Woreda on your account yet."}>
                  <Input id="bc-woreda" value={woreda?.name ?? ""} readOnly disabled />
                </FormField>
              ) : (
                <>
                  <GeoSelect field="region" label="Region" level={geo.region} allLabel="All regions" hint="Leave empty to reach every Region." onSelect={(code) => select("region", code)} onRetry={() => retry("region")} />
                  <GeoSelect field="zone" label="Zone" level={geo.zone} allLabel="All zones" onSelect={(code) => select("zone", code)} onRetry={() => retry("zone")} />
                  <GeoSelect field="woreda" label="Woreda" level={geo.woreda} allLabel="All woredas" onSelect={(code) => select("woreda", code)} onRetry={() => retry("woreda")} />
                </>
              )}
              <FormField label="Recipients" htmlFor="bc-group" required hint={`${toDAs ? "Development Agents" : "Farmers"} in ${areaLabel}${toDAs ? "" : ". In-app delivery reaches Development Agents only."}`}>
                <Select id="bc-group" value={group} onChange={(e) => setGroup(e.target.value as RecipientGroup)}>
                  {RECIPIENT_GROUPS.map((g) => <option key={g} value={g}>{g === "Farmers" ? "All farmers" : "All Development Agents"}</option>)}
                </Select>
              </FormField>
            </div>

            <FormField label="Title" htmlFor="bc-title" required hint="Shown as the notification heading (3 to 140 characters)." hintTone={title.trim().length > 0 && title.trim().length < 3 ? "error" : "muted"}>
              <Input id="bc-title" value={title} maxLength={140} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fertiliser distribution starts Monday" />
            </FormField>

            <FormField label="Message" htmlFor="bc-message" required hint={`At least 5 characters · ${message.length} characters · ${Math.max(1, Math.ceil(message.length / 160))} SMS segment${message.length > 160 ? "s" : ""} · Amharic + English supported`} hintTone={message.trim().length > 0 && message.trim().length < 5 ? "error" : "muted"}>
              <Textarea id="bc-message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write the message farmers or DAs will receive…" />
            </FormField>

            {/* Mobile / Tablet inline preview right after message */}
            <div className="lg:hidden rounded-2xl border border-line bg-surface/50 p-4 shadow-xs">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-green" />
                  </span>
                  <span className="text-[12.5px] font-semibold text-ink">Live SMS Preview</span>
                </div>
                <span className="text-[11px] font-medium text-muted">Farmer handset view</span>
              </div>
              <SmsPreview text={message} sender={source === "Knowledge" ? "OpenAgriNet" : area ?? (ownKebeleOnly ? "Kebele" : "Woreda")} />
            </div>

            {/* Channels */}
            <fieldset>
              <legend className="text-[14px] font-medium text-ink">
                Channels<span className="ml-1 text-danger">*</span>
              </legend>
              <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <label className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all",
                  inApp ? "border-brand-green/60 bg-emerald-50/40 shadow-xs" : "border-line bg-white hover:border-gray-300"
                )}>
                  <div className="pt-0.5">
                    <Checkbox checked={inApp} onChange={() => setInApp((v) => !v)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[13px] font-semibold text-ink">In-app</span>
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-800">
                        Live
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-tight text-ink-soft">DA Notification Bell</p>
                  </div>
                </label>

                {(["SMS", "Telegram"] as const).map((c) => (
                  <div key={c} className="flex cursor-not-allowed items-start gap-3 rounded-xl border border-line/70 bg-slate-50/60 p-3 opacity-65" title={`${c} gateway not wired yet`}>
                    <div className="pt-0.5">
                      <Checkbox checked={false} disabled onChange={() => {}} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[13px] font-medium text-slate-500">{c}</span>
                        <span className="inline-flex items-center rounded-full bg-slate-200/80 px-1.5 py-0.2 text-[9.5px] font-medium text-slate-500">
                          Soon
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-tight text-muted">
                        {c === "SMS" ? "Direct phone text" : "Bot announcement"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-[12px] text-muted">
                In-app delivers directly to the Development Agents&apos; notification bell (live). SMS & Telegram are coming soon.
              </p>
            </fieldset>

            <FileDropInput label="Evidence" actionLabel="Upload evidence" hint="Field photos or documents · PDF, JPG or PNG up to 5 MB each" files={evidence} onChange={setEvidence} />

            {/* Actions Bar */}
            <div className="mt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-line-soft">
              <div className="min-h-[18px]">
                {canDispatch && !canSend && !sending && (
                  <p className="text-[12.5px] text-muted text-center sm:text-left">
                    Complete every field marked <span className="text-danger font-medium">*</span> to enable Send.
                  </p>
                )}
              </div>
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => { setTitle(""); setMessage(""); setEvidence([]); }}
                  className="h-10 flex-1 sm:flex-initial inline-flex items-center justify-center rounded-lg border border-line bg-white px-4 text-[14px] font-medium text-ink-soft hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={!canSend}
                  onClick={dispatch}
                  className="h-10 flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-lg bg-brand-green px-5 text-[14px] font-semibold text-white shadow-sm hover:bg-brand-green-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {sending ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Sending…</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                      </svg>
                      <span>Send</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Live SMS Preview (Sticky on right) */}
          <div className="hidden lg:flex lg:flex-col lg:items-center">
            <div className="sticky top-6 w-full rounded-2xl border border-line bg-surface/40 p-4 shadow-sm backdrop-blur-xs">
              <div className="mb-3.5 flex items-center justify-between border-b border-line-soft pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-green" />
                  </span>
                  <span className="text-[12.5px] font-semibold text-ink">Live SMS Preview</span>
                </div>
                <span className="rounded-md bg-white border border-line-soft px-2 py-0.5 text-[10px] font-semibold text-slate-500 shadow-2xs">
                  Handset
                </span>
              </div>
              <SmsPreview text={message} sender={source === "Knowledge" ? "OpenAgriNet" : area ?? (ownKebeleOnly ? "Kebele" : "Woreda")} />
            </div>
          </div>
        </div>
      </Card>

      <ReceivedBroadcasts />
    </>
  );
}
