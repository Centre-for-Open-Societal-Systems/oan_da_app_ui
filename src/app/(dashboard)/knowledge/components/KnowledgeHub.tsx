"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { PageLoader } from "@/components/ui/PageLoader";
import { useAuthStore } from "@/store/useAuthStore";
import {
  KB_CATEGORIES,
  KB_LANGUAGES,
  KB_STATUSES,
  KB_STATUS_TONE,
  canWriteKnowledge,
  kbDate,
  listKbArticles,
  listKbCategories,
  listKbVideos,
  getKbVideo,
  youtubeThumbnail,
  type KbArticleSummary,
  type KbStatus,
  type KbVideo,
} from "@/features/communication";
import { matchesQuery } from "@/lib/search";
import { cn } from "@/lib/utils";
import { CreateKnowledgeModal, type KnowledgeKind } from "./CreateKnowledgeModal";
import { ArchiveKnowledgeModal } from "./ArchiveKnowledgeModal";

type Loaded<T> = { key: string; items: T[] } | { key: string; error: string };

// Appendix C.5 Knowledge Base: articles and YouTube videos from the DA Services API. Supervisor and Admin add content
// (and see drafts / archived items); a DA sees only Published items for their area.
export function KnowledgeHub() {
  const role = useAuthStore((s) => s.role);
  const canCreate = canWriteKnowledge(role);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<KbStatus | "">("");
  const [isYoutube, setIsYoutube] = useState(false);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  /** Video open in the edit form (full record from GET /videos/{id}). */
  const [editingVideo, setEditingVideo] = useState<KbVideo | null>(null);
  const [archiving, setArchiving] = useState<KbVideo | null>(null);
  /** Category tabs: GET /knowledge-base/categories, the fallback list until it answers. */
  const [categories, setCategories] = useState<string[]>([...KB_CATEGORIES]);
  useEffect(() => {
    let live = true;
    listKbCategories().then((c) => live && setCategories(c));
    return () => {
      live = false;
    };
  }, []);

  const editVideo = (v: KbVideo) => {
    setActionError(null);
    getKbVideo(v.name).then(setEditingVideo, (err) => setActionError(err instanceof Error ? err.message : "Could not open the video."));
  };
  const [reload, setReload] = useState(0);
  const [articles, setArticles] = useState<Loaded<KbArticleSummary> | null>(null);
  const [videos, setVideos] = useState<Loaded<KbVideo> | null>(null);

  // Category and status are filtered by the API; the search box filters what was loaded.
  const key = `${isYoutube ? "v" : "a"}|${category}|${canCreate ? status : ""}|${reload}`;
  useEffect(() => {
    let live = true;
    const q = { category: category || undefined, status: canCreate && status ? status : undefined };
    const fail = (err: unknown) => ({ key, error: err instanceof Error ? err.message : "Could not load the Knowledge Base." });
    if (isYoutube) listKbVideos(q).then((p) => live && setVideos({ key, items: p.items }), (e) => live && setVideos(fail(e)));
    else listKbArticles(q).then((p) => live && setArticles({ key, items: p.items }), (e) => live && setArticles(fail(e)));
    return () => {
      live = false;
    };
  }, [key, isYoutube, category, status, canCreate]);

  const current = isYoutube ? videos : articles;
  const loading = !current || current.key !== key;
  const error = !loading && "error" in current ? current.error : null;

  const visibleArticles = useMemo(() => (articles && "items" in articles ? articles.items.filter((a) => matchesQuery(query, a)) : []), [articles, query]);
  const visibleVideos = useMemo(() => (videos && "items" in videos ? videos.items.filter((v) => matchesQuery(query, v.title, v.category, v.description, v.source)) : []), [videos, query]);

  const onSaved = (kind: KnowledgeKind, title: string, savedStatus: KbStatus, mode: "created" | "updated") => {
    setCreateOpen(false);
    setEditingVideo(null);
    const what = mode === "updated" ? "updated" : savedStatus === "Published" ? "published" : "saved as draft";
    setNotice(`${kind === "video" ? "Video" : "Article"} “${title}” ${what}.`);
    setIsYoutube(kind === "video");
    setReload((n) => n + 1);
  };

  return (
    <>
      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}
      {actionError && <Banner tone="error" onDismiss={() => setActionError(null)}>{actionError}</Banner>}
      <Card className="p-0 shadow-card">
        {/* Category tabs, with search, YouTube switch and Add at the right end of the bar */}
        <div className="flex flex-col gap-3 border-b border-line xl:flex-row xl:items-center xl:justify-between">
          <div role="tablist" aria-label="Category" className="flex flex-wrap rounded-tl-xl">
            {["", ...categories].map((c) => {
              const active = category === c;
              return (
                <button
                  key={c || "all"}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "shrink-0 whitespace-nowrap px-5 py-3.5 text-[14px] transition-colors",
                    active ? "-mb-px border-b-2 border-brand-green bg-brand-wash font-semibold text-brand-green" : "text-ink-soft hover:bg-surface hover:text-ink",
                  )}
                >
                  {c || "All"}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-3 px-4 pb-3 sm:flex-row sm:items-center xl:pb-0 xl:pl-0">
            <SearchInput value={query} onChange={setQuery} placeholder={isYoutube ? "Search by Videos…" : "Search by Articles…"} className="sm:[&_input]:w-[190px]" />
            {canCreate && (
              <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as KbStatus | "")} className="sm:w-[140px]">
                <option value="">All statuses</option>
                {KB_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            )}
            <Button
              type="button"
              variant={isYoutube ? "brand" : "brandOutline"}
              size="md"
              // YouTube brand red instead of the portal green
              className={isYoutube ? "gap-2 bg-[#FF0000] hover:bg-[#CC0000]" : "gap-2 border-[#FF0000] text-[#FF0000] hover:bg-red-50"}
              aria-pressed={isYoutube}
              onClick={() => setIsYoutube((v) => !v)}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M23 7.2a3 3 0 00-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 001 7.2 31 31 0 00.5 12a31 31 0 00.5 4.8 3 3 0 002.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 002.1-2.1 31 31 0 00.5-4.8 31 31 0 00-.5-4.8zM9.8 15.1V8.9L15.2 12l-5.4 3.1z" />
              </svg>
              YouTube
            </Button>
            {canCreate && (
              <Button type="button" variant="brand" size="md" className="gap-2" onClick={() => setCreateOpen(true)}>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add Content
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <PageLoader label={isYoutube ? "Loading videos…" : "Loading articles…"} />
        ) : error ? (
          <EmptyState tone="error" title="Could not load the Knowledge Base" hint={error} actionLabel="Try again" onAction={() => setReload((n) => n + 1)} />
        ) : isYoutube ? (
          visibleVideos.length === 0 ? (
            <EmptyState title="No videos yet" hint={query ? "Try another search term." : canCreate ? "Use Add Content to link a YouTube video." : "Videos published for your area will appear here."} />
          ) : (
            <div className="grid grid-cols-1 gap-6 p-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleVideos.map((v) => <VideoCard key={v.name} video={v} showStatus={canCreate} onEdit={canCreate ? () => editVideo(v) : undefined} onArchive={canCreate ? () => setArchiving(v) : undefined} />)}
            </div>
          )
        ) : visibleArticles.length === 0 ? (
          <EmptyState title="No articles yet" hint={query || category ? "Try another category or search term." : canCreate ? "Use Add Content to write the first article." : "Articles published for your area will appear here."} />
        ) : (
          <div className="grid grid-cols-1 gap-6 p-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleArticles.map((a) => (
              <Link
                key={a.name}
                href={`/knowledge/${encodeURIComponent(a.name)}`}
                className="flex flex-col rounded-xl border border-line bg-white p-4 transition-all hover:border-brand-green/30 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Pill tone="green" className="font-semibold">{a.category}</Pill>
                    {canCreate && a.status !== "Published" && <Pill tone={KB_STATUS_TONE[a.status]}>{a.status}</Pill>}
                  </div>
                  <span className="text-[12px] text-muted">{a.languages?.includes(KB_LANGUAGES.am) ? "EN · አማ" : "EN"}</span>
                </div>
                <h3 className="mt-4 text-[18px] font-semibold leading-snug text-ink">{a.title}</h3>
                <p className="mt-2 flex-1 text-[14px] leading-relaxed text-ink-soft">{a.summary}</p>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3 text-[12.5px] text-muted">
                  <span className="min-w-0">{a.source ? `${a.source} • ` : ""}<span className="whitespace-nowrap">{kbDate(a.published_on)}</span></span>
                  <span className="shrink-0 whitespace-nowrap font-semibold text-brand-green">{a.send_count ?? 0} sends</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {canCreate && createOpen && <CreateKnowledgeModal isOpen initialKind={isYoutube ? "video" : "article"} onClose={() => setCreateOpen(false)} onSaved={onSaved} />}
      {canCreate && editingVideo && <CreateKnowledgeModal key={editingVideo.name} isOpen editing={{ kind: "video", video: editingVideo }} onClose={() => setEditingVideo(null)} onSaved={onSaved} />}
      {canCreate && archiving && (
        <ArchiveKnowledgeModal
          kind="video"
          name={archiving.name}
          title={archiving.title}
          restore={archiving.status === "Archived"}
          onClose={() => setArchiving(null)}
          onDone={(s) => {
            setNotice(`Video “${archiving.title}” ${s === "Archived" ? "archived" : "restored"}.`);
            setArchiving(null);
            setReload((n) => n + 1);
          }}
        />
      )}
    </>
  );
}

function VideoCard({ video: v, showStatus, onEdit, onArchive }: { video: KbVideo; showStatus: boolean; onEdit?: () => void; onArchive?: () => void }) {
  const thumb = youtubeThumbnail(v);
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-[box-shadow,border-color] duration-300 hover:border-brand-border hover:shadow-[0_12px_32px_-14px_rgba(16,24,40,0.25)]">
      {/* Cover: the whole photo is also a link to the video */}
      <a href={v.youtube_url} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true" className="relative block h-[150px] w-full overflow-hidden bg-surface">
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element -- the thumbnail host comes from the API
          <img src={thumb} alt="" className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105" />
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
        <span className="absolute left-3 top-3 flex gap-1.5">
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[12px] font-semibold text-brand-green shadow-sm backdrop-blur">{v.category}</span>
          {showStatus && v.status !== "Published" && <span className="rounded-full bg-white/90 px-2.5 py-1 text-[12px] font-semibold text-amber-700 shadow-sm backdrop-blur">{v.status}</span>}
        </span>
        <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-red-600 shadow-lg backdrop-blur transition-all duration-300 group-hover:scale-110 group-hover:bg-red-600 group-hover:text-white">
          <svg className="ml-0.5 h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5.14v13.72a1 1 0 001.5.86l11.04-6.86a1 1 0 000-1.72L9.5 4.28A1 1 0 008 5.14z" />
          </svg>
        </span>
        <span className="absolute bottom-2 right-2.5 text-[10.5px] text-white/80">{v.source ? `${v.source} · ` : ""}{kbDate(v.published_on)}</span>
      </a>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 text-[16px] font-semibold leading-snug tracking-tight text-ink" title={v.title}>{v.title}</h3>
        <p className="mt-1.5 line-clamp-2 min-h-[42px] text-[13.5px] leading-[21px] text-ink-soft">{v.description}</p>
        <a
          href={v.youtube_url}
          target="_blank"
          rel="noopener noreferrer"
          className="group/cta relative mt-3.5 inline-flex h-10 items-center justify-between rounded-xl border border-brand-border bg-brand-mint pl-3 pr-2 text-[14px] font-semibold text-brand-green transition-colors duration-200 hover:border-brand-green hover:bg-brand-green hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
        >
          <span className="inline-flex items-center gap-2">
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M23 7.2a3 3 0 00-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 001 7.2 31 31 0 00.5 12a31 31 0 00.5 4.8 3 3 0 002.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 002.1-2.1 31 31 0 00.5-4.8 31 31 0 00-.5-4.8zM9.8 15.1V8.9L15.2 12l-5.4 3.1z" />
            </svg>
            Watch on YouTube
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-brand-green transition-transform duration-200 group-hover/cta:translate-x-0.5">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 17L17 7M8 7h9v9" />
            </svg>
          </span>
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        {(onEdit || onArchive) && (
          <div className="mt-3 flex gap-2 border-t border-line pt-3">
            {onEdit && (
              <Button type="button" variant="outline" size="sm" className="flex-1 gap-1.5" onClick={onEdit}>
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
                Edit
              </Button>
            )}
            {onArchive && (
              <Button type="button" variant={v.status === "Archived" ? "brandOutline" : "dangerOutline"} size="sm" className="flex-1 gap-1.5" onClick={onArchive}>
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" /></svg>
                {v.status === "Archived" ? "Restore" : "Archive"}
              </Button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
