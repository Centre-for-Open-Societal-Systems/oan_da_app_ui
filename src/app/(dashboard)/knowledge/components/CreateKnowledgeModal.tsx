"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Spinner } from "@/components/ui/Spinner";
import {
  KB_LANGUAGES,
  createKbArticle,
  createKbVideo,
  htmlToText,
  listKbCategories,
  textToHtml,
  updateKbArticle,
  updateKbVideo,
  youtubeId,
  type KbArticle,
  type KbArticleLanguage,
  type KbStatus,
  type KbVideo,
} from "@/features/communication";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { AudienceFields, audienceScopes, initialAudience, type AudienceDraft } from "./AudienceFields";

export type KnowledgeKind = "article" | "video";

/** The item being edited; without it the form creates a new one. */
export type KnowledgeEditing = { kind: "article"; article: KbArticle } | { kind: "video"; video: KbVideo };

interface LangDraft {
  title: string;
  summary: string;
  body: string;
}
const emptyLang: LangDraft = { title: "", summary: "", body: "" };
const today = () => new Date().toISOString().slice(0, 10);

function langDraft(v: KbArticleLanguage | undefined): LangDraft {
  return v ? { title: v.title ?? "", summary: v.summary ?? "", body: htmlToText(v.body ?? "") } : emptyLang;
}

/** Body to send: the original HTML when the text was not touched (keeps its formatting), else the new paragraphs. */
function bodyHtml(text: string, original: KbArticleLanguage | undefined): string | undefined {
  if (!text.trim()) return undefined;
  if (original?.body && htmlToText(original.body) === text) return original.body;
  return textToHtml(text);
}

/**
 * Add or edit an article (English + optional Amharic) or a YouTube video. Supervisor / Admin only.
 * Mount it fresh for each item (e.g. with a `key`): its fields start from `editing`.
 */
export function CreateKnowledgeModal({ isOpen, initialKind = "article", editing, onClose, onSaved }: {
  isOpen: boolean;
  initialKind?: KnowledgeKind;
  editing?: KnowledgeEditing;
  onClose: () => void;
  onSaved: (kind: KnowledgeKind, title: string, status: KbStatus, mode: "created" | "updated") => void;
}) {
  const article = editing?.kind === "article" ? editing.article : undefined;
  const video = editing?.kind === "video" ? editing.video : undefined;
  const item = article ?? video;
  const origEn = article?.languages.find((l) => l.language === KB_LANGUAGES.en) ?? (article ? { language: KB_LANGUAGES.en, title: article.title, summary: article.summary } : undefined);
  /** Other language versions of an edited article: sent back unchanged, since `languages` replaces the whole table. */
  const otherLanguages = article?.languages.filter((l) => l.language !== KB_LANGUAGES.en) ?? [];

  // Source is the signed-in user (not editable); an edited item keeps the source it was saved with.
  const userName = useAuthStore((s) => s.user?.name ?? "");
  const source = item?.source || userName;

  const [kind, setKind] = useState<KnowledgeKind>(editing?.kind ?? initialKind);
  const [category, setCategory] = useState<string>(item?.category ?? "");
  /** From GET /knowledge-base/categories (fallback list if it fails); null while loading. */
  const [categories, setCategories] = useState<string[] | null>(null);
  const [publishedOn, setPublishedOn] = useState(item?.published_on?.slice(0, 10) ?? today());
  // New content is published straight away; an edit keeps the item's status (Archive / Restore change it).
  const status: KbStatus = item?.status ?? "Published";
  // Audience by role: Supervisor's own Woreda, Executive's own Region, Admin anything (see AudienceFields).
  const role = useAuthStore((s) => s.role);
  const userScope = useAuthStore((s) => s.profile?.scope);
  const [audience, setAudience] = useState<AudienceDraft>(() => initialAudience(role, userScope, item?.audience_scopes));
  // Article
  const [en, setEn] = useState<LangDraft>(() => langDraft(origEn));
  // Video
  const [videoTitle, setVideoTitle] = useState(video?.title ?? "");
  const [videoUrl, setVideoUrl] = useState(video?.youtube_url ?? "");
  const [description, setDescription] = useState(video?.description ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let live = true;
    listKbCategories().then((c) => live && setCategories(c));
    return () => {
      live = false;
    };
  }, [isOpen]);

  const ytId = youtubeId(videoUrl);

  // Required: title, short description and summary for an article; title + YouTube URL for a video.
  const errors: Record<string, string> = {};
  if (kind === "article") {
    if (en.title.trim().length < 3) errors.enTitle = "Enter a title of at least 3 characters.";
    if (en.summary.trim().length < 10) errors.enSummary = "Enter a short description of at least 10 characters.";
    if (!en.body.trim()) errors.enBody = "Enter the summary.";
  } else {
    if (videoTitle.trim().length < 3) errors.videoTitle = "Enter a title of at least 3 characters.";
    if (!ytId) errors.videoUrl = "Paste a YouTube link, e.g. https://youtu.be/…";
  }
  if (!category) errors.category = "Pick a category.";
  const valid = Object.keys(errors).length === 0;
  const show = (key: string) => (touched ? errors[key] : undefined);

  const close = () => {
    if (!saving) onClose();
  };

  const submit = async () => {
    setTouched(true);
    if (!valid) return;
    setSaving(true);
    setError(null);
    const audience_scopes = audienceScopes(audience);
    const common = { category, source: source.trim() || undefined, published_on: publishedOn || undefined, status, audience_scopes };
    try {
      if (kind === "article") {
        // The API needs at least one language version; the form writes the English one.
        const languages: KbArticleLanguage[] = [{ language: KB_LANGUAGES.en, title: en.title.trim(), summary: en.summary.trim(), body: bodyHtml(en.body, origEn) }, ...otherLanguages];
        const input = { title: en.title.trim(), summary: en.summary.trim(), languages, ...common };
        if (article) await updateKbArticle(article.name, input);
        else await createKbArticle(input);
        onSaved("article", input.title, status, article ? "updated" : "created");
      } else {
        const input = { title: videoTitle.trim(), description: description.trim() || undefined, youtube_url: videoUrl.trim(), ...common };
        if (video) await updateKbVideo(video.name, input);
        else await createKbVideo(input);
        onSaved("video", input.title, status, video ? "updated" : "created");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const shortLen = en.summary.trim().length;
  const saveLabel = editing ? "Save changes" : "Publish";

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={editing ? (kind === "video" ? "Edit Video" : "Edit Article") : "Add to Knowledge Base"}
      subtitle={editing ? item?.title : "Published content is visible to Development Agents in the selected areas"}
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={saving}>Cancel</Button>
          <Button variant="brand" onClick={submit} disabled={saving || (touched && !valid)} className="gap-2">
            {saving && <Spinner className="h-4 w-4" />}
            {saveLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {error && <ErrorAlert message={error} />}

        {/* What is being added (fixed when editing) */}
        {!editing && (
          <div role="radiogroup" aria-label="Content type" className="grid grid-cols-2 gap-3">
            <KindOption active={kind === "article"} onClick={() => setKind("article")} title="Article" hint="Text advisory with an SMS-ready summary"
              icon={<path d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />} />
            <KindOption active={kind === "video"} onClick={() => setKind("video")} title="YouTube video" hint="Link to a video on YouTube"
              icon={<><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M10 9l5 3-5 3V9z" /></>} />
          </div>
        )}

        {kind === "article" ? (
          <Section title="Content">
            <FormField label="Title" htmlFor="kb-title" required hint={show("enTitle")} hintTone="error">
              <Input id="kb-title" value={en.title} placeholder="e.g. Teff row-planting: spacing and seed rate" onChange={(e) => setEn({ ...en, title: e.target.value })} />
            </FormField>
            <FormField label="Short Description" htmlFor="kb-short" required
              hint={show("enSummary") || `${shortLen} / 160 characters · ${shortLen > 160 ? `${Math.ceil(shortLen / 160)} SMS segments` : "fits one SMS"}`}
              hintTone={show("enSummary") ? "error" : "muted"}>
              <Textarea id="kb-short" rows={2} value={en.summary} onChange={(e) => setEn({ ...en, summary: e.target.value })} placeholder="One or two sentences a farmer can act on." />
            </FormField>
            <FormField label="Summary" htmlFor="kb-body" required
              hint={show("enBody") || (editing ? "Leave an empty line between paragraphs. Editing the text replaces its original formatting." : "Leave an empty line between paragraphs.")}
              hintTone={show("enBody") ? "error" : "muted"}>
              <Textarea id="kb-body" rows={7} value={en.body} onChange={(e) => setEn({ ...en, body: e.target.value })} placeholder="Full guidance for the Development Agent…" />
            </FormField>
          </Section>
        ) : (
          <Section title="Video">
            <FormField label="YouTube link" htmlFor="kb-url" required hint={show("videoUrl") ?? "youtube.com/watch, youtu.be or shorts links."} hintTone={show("videoUrl") ? "error" : "muted"}>
              <Input id="kb-url" type="url" inputMode="url" value={videoUrl} placeholder="https://youtu.be/…" onChange={(e) => setVideoUrl(e.target.value)} />
            </FormField>
            {ytId && (
              <div className="flex items-center gap-3 rounded-lg border border-line bg-surface p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- small preview of the pasted link */}
                <img src={`https://i.ytimg.com/vi/${ytId}/mqdefault.jpg`} alt="" className="h-[63px] w-28 shrink-0 rounded-md object-cover" />
                <p className="text-[12.5px] text-ink-soft">Thumbnail is taken from YouTube.<span className="block text-muted">Video id: {ytId}</span></p>
              </div>
            )}
            <FormField label="Title" htmlFor="kb-vtitle" required hint={show("videoTitle")} hintTone="error">
              <Input id="kb-vtitle" value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="e.g. Profitable poultry farming" />
            </FormField>
            <FormField label="Short Description" htmlFor="kb-desc" hint="What the farmer will learn from the video.">
              <Textarea id="kb-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </FormField>
          </Section>
        )}

        <Section title="Details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Category" htmlFor="kb-cat" required hint={show("category")} hintTone="error">
              <Select id="kb-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
                {/* An item saved under a category outside the list keeps it as an option. */}
                <option value="" disabled>{categories === null ? "Loading categories…" : "Select category"}</option>
                {/* An item saved under a category no longer in the list keeps it as an option. */}
                {[...(categories ?? []), ...(category && !(categories ?? []).includes(category) ? [category] : [])].map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </FormField>
            <FormField label="Source" htmlFor="kb-source" hint={editing ? "Saved with the item." : "Your name, from your sign-in."}>
              <Input id="kb-source" value={source} readOnly aria-readonly="true" tabIndex={-1} className="cursor-not-allowed bg-surface text-ink-soft" />
            </FormField>
            <FormField label="Published on" htmlFor="kb-date">
              <Input id="kb-date" type="date" value={publishedOn} onChange={(e) => setPublishedOn(e.target.value)} />
            </FormField>
          </div>
        </Section>

        <Section title="Audience" hint="Development Agents in the selected areas see this content.">
          <AudienceFields role={role} value={audience} onChange={setAudience} />
        </Section>
      </div>
    </Modal>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line p-4">
      <div>
        <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
        {hint && <p className="mt-0.5 text-[12.5px] text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function KindOption({ active, onClick, title, hint, icon }: { active: boolean; onClick: () => void; title: string; hint: string; icon: ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={active} onClick={onClick}
      className={cn("flex items-start gap-3 rounded-xl border p-3 text-left transition-colors", active ? "border-brand-green bg-brand-wash" : "border-line bg-white hover:border-brand-green/40")}>
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", active ? "bg-brand-green text-white" : "bg-surface text-ink-soft")}>
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
      </span>
      <span className="min-w-0">
        <span className={cn("block text-[14px] font-semibold", active ? "text-brand-green" : "text-ink")}>{title}</span>
        <span className="block text-[12.5px] text-muted">{hint}</span>
      </span>
    </button>
  );
}
