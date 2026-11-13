"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { BackLink } from "@/components/ui/BackLink";
import { PageLoader } from "@/components/ui/PageLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuthStore } from "@/store/useAuthStore";
import { ApiError } from "@/lib/api";
import { KB_LANGUAGES, KB_STATUS_TONE, canWriteKnowledge, getKbArticle, kbArticleToSendable, kbDate, sanitizeHtml, type KbArticle } from "@/features/communication";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { SendToFarmersButton } from "./SendToFarmersButton";
import { CreateKnowledgeModal } from "../../components/CreateKnowledgeModal";
import { ArchiveKnowledgeModal } from "../../components/ArchiveKnowledgeModal";

// Basic rich-text styles for the API's HTML body.
const PROSE = "text-[14.5px] leading-relaxed text-ink [&_p]:mb-4 [&_p:last-child]:mb-0 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_h1]:mb-2 [&_h1]:text-[18px] [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-[17px] [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:font-semibold [&_a]:text-brand-green [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-line [&_blockquote]:pl-3 [&_blockquote]:text-ink-soft";

// Appendix C.5 Article detail (GET /knowledge-base/articles/{id}): English / Amharic versions, Send to farmers → Broadcast (FR-11).
export function ArticleView({ id }: { id: string }) {
  const role = useAuthStore((s) => s.role);
  const [state, setState] = useState<{ id: string; article?: KbArticle; error?: string; notFound?: boolean } | null>(null);
  const [lang, setLang] = useState<string>(KB_LANGUAGES.en);
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const canWrite = canWriteKnowledge(role);

  useEffect(() => {
    let live = true;
    getKbArticle(id).then(
      (article) => live && setState({ id, article }),
      (err) => live && setState({ id, notFound: err instanceof ApiError && err.status === 404, error: err instanceof Error ? err.message : "Could not load the article." }),
    );
    return () => {
      live = false;
    };
  }, [id, reload]);

  const article = state?.id === id ? state.article : undefined;
  const version = article?.languages.find((l) => l.language === lang) ?? article?.languages.find((l) => l.language === KB_LANGUAGES.en) ?? article?.languages[0];
  const rawBody = version?.body ?? "";
  const body = useMemo(() => (rawBody ? sanitizeHtml(rawBody) : ""), [rawBody]);

  if (!state || state.id !== id) return <PageLoader label="Loading article…" />;
  if (!article) {
    return (
      <div className="flex w-full flex-col gap-4">
        <BackLink href="/knowledge" label="Back to Knowledge Base" />
        <Card className="shadow-card">
          <EmptyState tone={state.notFound ? "muted" : "error"} title={state.notFound ? "Article not found" : "Could not load the article"} hint={state.notFound ? "It may have been archived or is not published for your area." : state.error} />
        </Card>
      </div>
    );
  }

  const sendable = kbArticleToSendable(article, version);
  const snippet = sendable.snippet;
  const hasAmharic = article.languages.some((l) => l.language === KB_LANGUAGES.am);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink href="/knowledge" label="Back to Knowledge Base" />
        {canWrite && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="md" className="gap-2" onClick={() => setEditOpen(true)}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
              Edit
            </Button>
            <Button type="button" variant={article.status === "Archived" ? "brandOutline" : "dangerOutline"} size="md" className="gap-2" onClick={() => setArchiveOpen(true)}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" /></svg>
              {article.status === "Archived" ? "Restore" : "Archive"}
            </Button>
          </div>
        )}
      </div>
      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="green">{article.category}</Pill>
              {canWriteKnowledge(role) && article.status !== "Published" && <Pill tone={KB_STATUS_TONE[article.status]}>{article.status}</Pill>}
              <span className="text-[12.5px] text-muted">{article.source ? `${article.source} · ` : ""}published {kbDate(article.published_on)}</span>
            </div>
            {hasAmharic && (
              <div role="tablist" aria-label="Language" className="flex rounded-lg bg-surface p-0.5 text-[12.5px]">
                {[KB_LANGUAGES.en, KB_LANGUAGES.am].map((l) => (
                  <button key={l} type="button" role="tab" aria-selected={version?.language === l} onClick={() => setLang(l)}
                    className={cn("rounded-md px-3 py-1 font-medium", version?.language === l ? "bg-white text-brand-green shadow-sm" : "text-ink-soft hover:text-ink")}>
                    {l === KB_LANGUAGES.en ? "English" : "አማርኛ"}
                  </button>
                ))}
              </div>
            )}
          </div>
          <h1 className="mt-3 text-[24px] font-semibold leading-tight tracking-tight text-ink">{version?.title || article.title}</h1>
          {(version?.summary || article.summary) && <p className="mt-2 text-[15px] text-ink-soft">{version?.summary || article.summary}</p>}
          {body ? <div className={cn("mt-5", PROSE)} dangerouslySetInnerHTML={{ __html: body }} /> : <p className="mt-5 text-[14px] text-muted">No body text in this language.</p>}
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="shadow-card">
            <h2 className="text-[15px] font-semibold text-ink">SMS-ready snippet</h2>
            <p className="mt-2 rounded-lg border border-line bg-surface p-3 text-[13px] leading-relaxed text-ink">{snippet || "—"}</p>
            <p className="mt-1.5 text-[12px] text-muted">{snippet.length} characters · {Math.max(1, Math.ceil(snippet.length / 160))} segment{snippet.length > 160 ? "s" : ""}</p>
            {snippet && article.status === "Published" && <SendToFarmersButton article={sendable} />}
            <p className="mt-2 text-center text-[12px] text-muted">Dispatched via the Broadcast engine and logged.</p>
          </Card>
          <Card className="shadow-card">
            <h2 className="text-[15px] font-semibold text-ink">Dissemination</h2>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-[13px]">
              <dt className="text-muted">Total sends</dt><dd className="text-right font-medium text-ink">{article.send_count ?? 0}</dd>
              <dt className="text-muted">Languages</dt><dd className="text-right font-medium text-ink">{hasAmharic ? "English · Amharic" : "English"}</dd>
              <dt className="text-muted">Audience</dt><dd className="text-right font-medium text-ink">{article.audience_scopes?.length ? article.audience_scopes.map((s) => s.woreda || s.zone || s.region).filter(Boolean).join(", ") : "All regions"}</dd>
            </dl>
          </Card>
        </div>
      </div>

      {canWrite && editOpen && (
        <CreateKnowledgeModal
          key={article.modified ?? article.name}
          isOpen
          editing={{ kind: "article", article }}
          onClose={() => setEditOpen(false)}
          onSaved={(_kind, title) => {
            setEditOpen(false);
            setNotice(`Article “${title}” updated.`);
            setReload((n) => n + 1);
          }}
        />
      )}
      {canWrite && archiveOpen && (
        <ArchiveKnowledgeModal
          kind="article"
          name={article.name}
          title={article.title}
          restore={article.status === "Archived"}
          onClose={() => setArchiveOpen(false)}
          onDone={(s) => {
            setArchiveOpen(false);
            setNotice(s === "Archived" ? "Article archived. Development Agents no longer see it." : "Article restored and published again.");
            setReload((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}
