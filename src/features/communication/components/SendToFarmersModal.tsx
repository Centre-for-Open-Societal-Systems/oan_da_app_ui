"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { FormField } from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { SmsPreview } from "./SmsPreview";
import { BROADCAST_WOREDAS, audienceOf, audienceSize, type Article, type Channel } from "../data";

// FR-11 "Send to farmers": snippet composer → channels (SMS/Telegram) → dispatch via the Broadcast engine, logged.
// Like every broadcast, the audience is all farmers of one Woreda.
export function SendToFarmersModal({ article, isOpen, onClose }: { article: Article; isOpen: boolean; onClose: () => void }) {
  const [text, setText] = useState(article.snippet);
  const [woreda, setWoreda] = useState(BROADCAST_WOREDAS[0]);
  const audience = audienceOf("Farmers", woreda);
  const size = audienceSize("Farmers", woreda).toLocaleString();
  const [channels, setChannels] = useState<Set<Channel>>(new Set(["SMS"]));
  const [language, setLanguage] = useState<"en" | "am">("en");
  const [sent, setSent] = useState(false);

  const toggle = (c: Channel) =>
    setChannels((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  const close = () => {
    setSent(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title="Send to Farmers" subtitle={article.title} size="xl"
      footer={sent ? <Button variant="brand" onClick={close}>Done</Button> : (
        <>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button variant="brand" disabled={channels.size === 0 || text.trim().length === 0} onClick={() => setSent(true)}>Send to {size} recipients</Button>
        </>
      )}
    >
      {sent ? (
        <Banner tone="success" title="Dispatched through the Broadcast engine">
          Snippet sent to {size} recipients ({audience}) via {[...channels].join(" + ")}. The dispatch is logged to broadcast history with per-channel delivery outcomes; farmers without connectivity receive it by SMS.
        </Banner>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_260px]">
          <div className="flex flex-col gap-4">
            <FormField label="Message" htmlFor="snippet" required hint={`${text.length} characters · ${Math.max(1, Math.ceil(text.length / 160))} SMS segment${text.length > 160 ? "s" : ""}`}>
              <Textarea id="snippet" rows={5} value={text} onChange={(e) => setText(e.target.value)} />
            </FormField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Woreda" htmlFor="audience" required hint={`All ${size} farmers in ${woreda} Woreda`}>
                <Select id="audience" value={woreda} onChange={(e) => setWoreda(e.target.value)}>{BROADCAST_WOREDAS.map((w) => <option key={w} value={w}>{w}</option>)}</Select>
              </FormField>
              <FormField label="Language" htmlFor="lang">
                <Select id="lang" value={language} onChange={(e) => setLanguage(e.target.value as "en" | "am")}><option value="en">English</option><option value="am">Amharic (አማርኛ)</option></Select>
              </FormField>
            </div>
            <fieldset>
              <legend className="text-[14px] font-medium text-ink">Channels<span className="ml-1 text-danger">*</span></legend>
              <div className="mt-2 flex gap-5">
                {(["SMS", "Telegram"] as Channel[]).map((c) => (
                  <label key={c} className="flex cursor-pointer items-center gap-2 text-[13.5px] text-slate-700">
                    <Checkbox checked={channels.has(c)} onChange={() => toggle(c)} /> {c}
                  </label>
                ))}
              </div>
            </fieldset>
            {(channels.size === 0 || text.trim().length === 0) && <p className="text-[12.5px] text-muted">Complete every field marked * to enable Send to {size} recipients.</p>}
          </div>
          <SmsPreview text={text} sender="OpenAgriNet" />
        </div>
      )}
    </Modal>
  );
}
