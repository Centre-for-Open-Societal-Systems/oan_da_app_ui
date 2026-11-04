"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Banner } from "@/components/ui/Banner";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { SmsPreview } from "@/features/communication";
import { BROADCAST_WOREDAS, RECIPIENT_GROUPS, SIGNALS, audienceSize, type RecipientGroup, type SignalSource } from "@/features/communication";
import { broadcastToWoreda } from "@/features/notifications";
import { useAuthStore } from "@/store/useAuthStore";
import { FileDropInput } from "@/components/ui/FileDropInput";
import { ReceivedBroadcasts } from "./ReceivedBroadcasts";

const SOURCES: SignalSource[] = ["Knowledge", "Emergency", "Weather", "Informational"];

// FR-10 / §4.4: Communications Officer crafts a message, picks audience + channels, dispatches.
// In-app (POST /notifications/broadcast → the DAs' bell) is the only live channel; SMS/Telegram are
// shown but disabled until a gateway is wired.
export function BroadcastWorkspace() {
  const role = useAuthStore((s) => s.role);
  const canDispatch = role === "CommsOfficer" || role === "Admin" || role === "DA";
  const params = useSearchParams();
  const signal = SIGNALS.find((s) => s.id === params.get("signal"));

  const [title, setTitle] = useState(signal ? signal.title : "");
  const [source, setSource] = useState<SignalSource>(signal?.source ?? "Informational");
  const [message, setMessage] = useState(signal ? `${signal.detail} — Bako Tibe Woreda` : "");
  // Audience is always a whole Woreda. A DA (and any weather/emergency signal) defaults to farmers; officers default to the DA network.
  const [woreda, setWoreda] = useState(BROADCAST_WOREDAS[0]);
  const [group, setGroup] = useState<RecipientGroup>(signal?.source === "Weather" || signal?.source === "Emergency" || role === "DA" ? "Farmers" : "Development Agents");
  // In-app = the real notification-bell broadcast. Checked by default; SMS/Telegram are disabled stubs.
  const [inApp, setInApp] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [evidence, setEvidence] = useState<File[]>([]);

  const toDAs = group === "Development Agents";
  const size = audienceSize(group, woreda);

  const dispatch = async () => {
    setError(null);
    setNotice(null);
    // In-app bell reaches Development Agents only.
    if (!toDAs) {
      setError("In-app delivery reaches Development Agents only. Choose “All Development Agents”, or wait for SMS / Telegram.");
      return;
    }
    setSending(true);
    try {
      const res = await broadcastToWoreda({ title: title.trim(), body: message.trim(), href: "/notifications", woreda });
      setNotice(
        res.duplicate
          ? `Already sent to ${woreda} Woreda — no duplicate created.`
          : `Broadcast delivered to ${res.recipients} Development Agent${res.recipients === 1 ? "" : "s"} in ${woreda} Woreda — it is now in their notification bell.`,
      );
      setTitle(""); setMessage(""); setEvidence([]);
    } catch (err) {
      // ApiError.message already carries the backend's reason (e.g. "Woreda X is not in your scope").
      setError(err instanceof Error ? err.message : "Could not send the broadcast. Try again.");
    } finally {
      setSending(false);
    }
  };

  const canSend = canDispatch && !sending && inApp && title.trim().length >= 3 && message.trim().length >= 5;

  return (
    <>
      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}
      {error && <Banner tone="error" onDismiss={() => setError(null)}>{error}</Banner>}
      {signal && <Banner tone="info" title={`Crafting a response to signal ${signal.id}`}>{signal.title} — received {signal.receivedAt}.</Banner>}

      <Card className="shadow-card">
        <h2 className="text-[15px] font-semibold text-ink">Compose</h2>
        {!canDispatch && <p className="mt-1 text-[12.5px] text-muted">Only a Development Agent, Communications Officer or Administrator can dispatch. You can preview.</p>}
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          <div className="flex flex-col gap-4">
            <FormField label="Signal source" htmlFor="bc-source" required hint="Weather appears only as a source feeding this engine.">
              <Select id="bc-source" value={source} onChange={(e) => setSource(e.target.value as SignalSource)}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</Select>
            </FormField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Woreda" htmlFor="bc-woreda" required hint="Broadcasts reach a whole Woreda.">
                <Select id="bc-woreda" value={woreda} onChange={(e) => setWoreda(e.target.value)}>{BROADCAST_WOREDAS.map((w) => <option key={w} value={w}>{w}</option>)}</Select>
              </FormField>
              <FormField label="Recipients" htmlFor="bc-group" required hint={`${size.toLocaleString()} ${toDAs ? "Development Agents" : "farmers"} in ${woreda} Woreda`}>
                <Select id="bc-group" value={group} onChange={(e) => setGroup(e.target.value as RecipientGroup)}>{RECIPIENT_GROUPS.map((g) => <option key={g} value={g}>{g === "Farmers" ? "All farmers" : "All Development Agents"}</option>)}</Select>
              </FormField>
            </div>
            <FormField label="Title" htmlFor="bc-title" required hint="Shown as the notification heading (up to 140 characters).">
              <Input id="bc-title" value={title} maxLength={140} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fertiliser distribution starts Monday" />
            </FormField>
            <FormField label="Message" htmlFor="bc-message" required hint={`${message.length} characters · ${Math.max(1, Math.ceil(message.length / 160))} SMS segment${message.length > 160 ? "s" : ""} · Amharic + English supported`}>
              <Textarea id="bc-message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write the message farmers or DAs will receive…" />
            </FormField>
            <fieldset>
              <legend className="text-[14px] font-medium text-ink">Channels</legend>
              <div className="mt-2 flex flex-wrap gap-5">
                <label className="flex cursor-pointer items-center gap-2 text-[13.5px] text-slate-700">
                  <Checkbox checked={inApp} onChange={() => setInApp((v) => !v)} /> In-app
                </label>
                {(["SMS", "Telegram"] as const).map((c) => (
                  <label key={c} className="flex cursor-not-allowed items-center gap-2 text-[13.5px] text-slate-400" title="Not wired yet">
                    <Checkbox checked={false} disabled onChange={() => {}} /> {c}
                  </label>
                ))}
              </div>
              <p className="mt-1.5 text-[12px] text-muted">In-app delivers to the Development Agents&apos; notification bell (live). SMS / Telegram are not wired yet.</p>
            </fieldset>
            <FileDropInput label="Evidence" actionLabel="Upload evidence" hint="Field photos or documents · PDF, JPG or PNG up to 5 MB each" files={evidence} onChange={setEvidence} />
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => { setTitle(""); setMessage(""); setEvidence([]); }} className="inline-flex shrink-0 whitespace-nowrap h-10 items-center rounded-md border border-zinc-200 bg-white px-4 text-[14px] font-medium text-ink-soft hover:bg-zinc-50">Clear</button>
              <button type="button" disabled={!canSend} onClick={dispatch} className="inline-flex shrink-0 whitespace-nowrap h-10 items-center gap-2 rounded-md bg-brand-green px-4 text-[14px] font-semibold text-white hover:bg-brand-green-dark disabled:opacity-50">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                {sending ? "Sending…" : `Send to ${size.toLocaleString()}`}
              </button>
            </div>
          </div>
          <SmsPreview text={message} sender={source === "Knowledge" ? "OpenAgriNet" : `${woreda} Woreda`} />
        </div>
      </Card>

      <ReceivedBroadcasts />
    </>
  );
}
