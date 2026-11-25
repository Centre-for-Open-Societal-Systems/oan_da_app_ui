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
import { TablePagination, usePagination } from "@/components/ui/TablePagination";
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

export interface CategoryConfig {
  icon: string;
  label: string;
  className: string;
}

export const CATEGORY_TAG_MAP: Record<string, CategoryConfig> = {
  "crop production": {
    icon: "🌾",
    label: "Crop production",
    className: "border-[#a3e6b5] bg-[#ebf8ef] text-[#15803d]",
  },
  "pest & disease": {
    icon: "🐛",
    label: "Pest & disease",
    className: "border-[#fbcba8] bg-[#fff2e8] text-[#c2410c]",
  },
  "livestock": {
    icon: "🐄",
    label: "Livestock",
    className: "border-[#fcd34d] bg-[#fff9db] text-[#854d0e]",
  },
  "soil & water": {
    icon: "💧",
    label: "Soil & water",
    className: "border-[#9ee0ff] bg-[#e6f6ff] text-[#0284c7]",
  },
  "markets & credit": {
    icon: "📊",
    label: "Markets & credit",
    className: "border-[#d8b4fe] bg-[#f3e8ff] text-[#6d28d9]",
  },
};

export function CategoryTag({ category, className }: { category: string; className?: string }) {
  const norm = category.toLowerCase().trim();
  const config = CATEGORY_TAG_MAP[norm] ?? {
    icon: "🏷️",
    label: category,
    className: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12px] font-semibold tracking-tight shadow-2xs",
        config.className,
        className,
      )}
    >
      <span className="text-[13px] leading-none select-none" aria-hidden="true">
        {config.icon}
      </span>
      <span>{config.label}</span>
    </span>
  );
}

// Appendix C.5 Knowledge Base: articles and YouTube videos from the DA Services API. Supervisor and Admin add content
// (and see drafts / archived items); a DA sees only Published items for their area.
export function KnowledgeHub() {
  const role = useAuthStore((s) => s.role);
  const canCreate = canWriteKnowledge(role);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<KbStatus | "">("");
  const [isYoutube, setIsYoutube] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
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

  // Client-side pagination with rows-per-page dropdown (10, 25, 50) and number buttons for Cards & Table
  const { pageRows: paginatedArticles, paginationProps: articlePagination } = usePagination(visibleArticles, 10);
  const { pageRows: paginatedVideos, paginationProps: videoPagination } = usePagination(visibleVideos, 10);

  // Reset page to 1 when switching search, category, status, or youtube mode
  useEffect(() => {
    articlePagination.onPageChange(1);
    videoPagination.onPageChange(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, status, query, isYoutube]);

  const paginationProps = isYoutube ? videoPagination : articlePagination;
  const currentTotal = isYoutube ? visibleVideos.length : visibleArticles.length;

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
      <Card className="overflow-hidden p-0 shadow-card">
        {/* Category tabs: clean horizontal scroll on mobile with no visible scrollbar track */}
        <div className="border-b border-line">
          <div
            role="tablist"
            aria-label="Category"
            className="flex items-center overflow-x-auto no-scrollbar scroll-smooth border-b border-line bg-white"
          >
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
                    "shrink-0 whitespace-nowrap px-4 sm:px-5 py-3 sm:py-3.5 text-[13px] sm:text-[14px] transition-colors border-b-2",
                    active
                      ? "-mb-px border-brand-green bg-brand-wash font-semibold text-brand-green"
                      : "border-transparent font-medium text-ink-soft hover:bg-surface hover:text-ink",
                  )}
                >
                  {c || "All"}
                </button>
              );
            })}
          </div>

          {/* Responsive search & action toolbar */}
          <div className="flex flex-col gap-2.5 p-3.5 sm:p-4 sm:flex-row sm:items-center sm:justify-between border-b border-line">
            <div className="w-full sm:w-[260px] md:w-[300px] lg:w-[340px] shrink-0">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder={isYoutube ? "Search videos…" : "Search articles…"}
                className="w-full [&_input]:w-full"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5 w-full sm:w-auto shrink-0">
              {/* View Mode Toggle: Grid (Cards) or Table */}
              <div className="inline-flex h-9 items-center rounded-lg border border-line bg-surface/70 p-0.5 shrink-0">
                <button
                  type="button"
                  aria-label="Grid view (Cards)"
                  title="Grid view (Cards)"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "flex h-7.5 w-8 items-center justify-center rounded-md transition-colors",
                    viewMode === "grid"
                      ? "bg-white font-semibold text-brand-green shadow-xs"
                      : "text-muted hover:text-ink",
                  )}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Table view"
                  title="Table view"
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "flex h-7.5 w-8 items-center justify-center rounded-md transition-colors",
                    viewMode === "table"
                      ? "bg-white font-semibold text-brand-green shadow-xs"
                      : "text-muted hover:text-ink",
                  )}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3.75" y1="6.75" x2="20.25" y2="6.75" />
                    <line x1="3.75" y1="12" x2="20.25" y2="12" />
                    <line x1="3.75" y1="17.25" x2="20.25" y2="17.25" />
                  </svg>
                </button>
              </div>

              {canCreate && (
                <Select
                  aria-label="Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as KbStatus | "")}
                  className="h-9 w-auto min-w-[110px] sm:min-w-[120px] text-[12.5px] sm:text-[13px]"
                >
                  <option value="">All statuses</option>
                  {KB_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              )}

              {/* YouTube toggle button */}
              <Button
                type="button"
                variant={isYoutube ? "brand" : "brandOutline"}
                size="sm"
                className={cn(
                  "h-9 gap-2 px-3 sm:px-3.5 text-[12.5px] sm:text-[13px] font-semibold shrink-0 transition-colors",
                  isYoutube
                    ? "border-transparent bg-[#FF0000] text-white hover:bg-[#CC0000]"
                    : "border-[#FF0000] text-[#FF0000] hover:bg-red-50",
                )}
                aria-pressed={isYoutube}
                onClick={() => setIsYoutube((v) => !v)}
              >
                {isYoutube ? (
                  <svg className="h-4 w-5 shrink-0" viewBox="0 0 28 20" fill="none" aria-hidden="true">
                    <rect width="28" height="20" rx="5" fill="#FFFFFF" />
                    <polygon points="11,5 19,10 11,15" fill="#FF0000" />
                  </svg>
                ) : (
                  <svg className="h-4 w-5 shrink-0" viewBox="0 0 28 20" fill="none" aria-hidden="true">
                    <rect width="28" height="20" rx="5" fill="#FF0000" />
                    <polygon points="11,5 19,10 11,15" fill="#FFFFFF" />
                  </svg>
                )}
                <span>YouTube</span>
              </Button>

              {/* Create Template */}
              {canCreate && (
                <Button
                  type="button"
                  variant="brand"
                  size="sm"
                  className="h-9 gap-1.5 px-3 sm:px-3.5 text-[12.5px] sm:text-[13px] shrink-0"
                  onClick={() => setCreateOpen(true)}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Create Template
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content area */}
        {loading ? (
          <PageLoader label={isYoutube ? "Loading videos…" : "Loading articles…"} />
        ) : error ? (
          <EmptyState
            tone="error"
            title="Could not load the Knowledge Base"
            hint={error}
            actionLabel="Try again"
            onAction={() => setReload((n) => n + 1)}
          />
        ) : isYoutube ? (
          visibleVideos.length === 0 ? (
            <EmptyState
              title="No videos yet"
              hint={query ? "Try another search term." : canCreate ? "Use Create Template to link a YouTube video." : "Videos published for your area will appear here."}
            />
          ) : viewMode === "grid" ? (
            /* Video Cards Grid */
            <div className="grid grid-cols-1 gap-4 sm:gap-5 p-4 sm:p-5 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedVideos.map((v) => (
                <VideoCard
                  key={v.name}
                  video={v}
                  showStatus={canCreate}
                  onEdit={canCreate ? () => editVideo(v) : undefined}
                  onArchive={canCreate ? () => setArchiving(v) : undefined}
                />
              ))}
            </div>
          ) : (
            /* Video Table View */
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left min-w-[860px]">
                <thead>
                  <tr className="border-b border-line bg-surface text-[13px] font-semibold text-slate-500">
                    <th className="w-16 px-4 py-3 text-center">S.No.</th>
                    <th className="px-4 py-3">Video</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Published on</th>
                    {canCreate && <th className="px-4 py-3">Status</th>}
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-[13.5px] text-slate-700">
                  {paginatedVideos.map((v, index) => {
                    const sNo = (videoPagination.page - 1) * videoPagination.pageSize + index + 1;
                    const thumb = youtubeThumbnail(v);
                    return (
                      <tr key={v.name} className="border-b border-line-soft transition-colors last:border-b-0 hover:bg-surface/60">
                        <td className="px-4 py-3 text-center font-medium text-slate-500">{sNo}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-[240px] max-w-[380px]">
                            <a
                              href={v.youtube_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group/thumb relative h-10 w-16 shrink-0 overflow-hidden rounded-md bg-surface border border-line"
                            >
                              {thumb && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={thumb} alt="" className="h-full w-full object-cover transition-transform group-hover/thumb:scale-105" />
                              )}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover/thumb:bg-black/45">
                                <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M8 5.14v13.72a1 1 0 001.5.86l11.04-6.86a1 1 0 000-1.72L9.5 4.28A1 1 0 008 5.14z" />
                                </svg>
                              </div>
                            </a>
                            <div className="min-w-0 flex-1">
                              <a
                                href={v.youtube_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="line-clamp-1 font-semibold text-ink hover:text-red-600 transition-colors"
                                title={v.title}
                              >
                                {v.title}
                              </a>
                              {v.description && (
                                <p className="line-clamp-1 text-[12px] text-ink-soft mt-0.5" title={v.description}>
                                  {v.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <CategoryTag category={v.category} />
                        </td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">
                          {v.source || "YouTube"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[13px] text-slate-600">
                          {kbDate(v.published_on)}
                        </td>
                        {canCreate && (
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Pill tone={KB_STATUS_TONE[v.status]} dot className="text-[12px] px-2.5 py-0.5">{v.status}</Pill>
                          </td>
                        )}
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <a
                              href={v.youtube_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[12px] font-semibold text-red-600 transition-colors hover:bg-red-100"
                            >
                              Watch
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                              </svg>
                            </a>
                            {canCreate && (
                              <>
                                <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[12px]" onClick={() => editVideo(v)}>
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  variant={v.status === "Archived" ? "brandOutline" : "dangerOutline"}
                                  size="sm"
                                  className="h-7 px-2 text-[12px]"
                                  onClick={() => setArchiving(v)}
                                >
                                  {v.status === "Archived" ? "Restore" : "Archive"}
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : visibleArticles.length === 0 ? (
          <EmptyState
            title="No articles yet"
            hint={query || category ? "Try another category or search term." : canCreate ? "Use Create Template to write the first article." : "Articles published for your area will appear here."}
          />
        ) : viewMode === "grid" ? (
          /* Article Cards Grid with Visual Balance and Uniform Heights */
          <div className="grid grid-cols-1 gap-4 sm:gap-5 p-4 sm:p-5 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedArticles.map((a) => (
              <Link
                key={a.name}
                href={`/knowledge/${encodeURIComponent(a.name)}`}
                className="group flex flex-col rounded-2xl border border-line bg-white p-4 sm:p-5 shadow-xs transition-all duration-200 hover:border-brand-green/40 hover:shadow-md hover:-translate-y-0.5"
              >
                {/* Top Badges */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <CategoryTag category={a.category} />
                    {canCreate && a.status !== "Published" && (
                      <Pill tone={KB_STATUS_TONE[a.status]} className="text-[12px] px-2.5 py-0.5">{a.status}</Pill>
                    )}
                  </div>
                  <span className="inline-flex items-center rounded-md border border-line-soft bg-surface/70 px-2 py-0.5 text-[11.5px] font-medium text-slate-500">
                    {a.languages?.includes(KB_LANGUAGES.am) ? "EN · አማ" : "EN"}
                  </span>
                </div>

                {/* Title: exactly 2 lines height (44px) so all cards start summary at the same level */}
                <h3
                  className="mt-3 h-[44px] text-[16px] sm:text-[16.5px] font-bold leading-snug tracking-tight text-ink group-hover:text-brand-green transition-colors line-clamp-2"
                  title={a.title}
                >
                  {a.title}
                </h3>

                {/* Summary: exactly 2 lines height (42px) so divider & footer sit at identical level on every card */}
                <p
                  className="mt-1.5 h-[42px] text-[13px] sm:text-[13.5px] leading-[21px] text-ink-soft line-clamp-2"
                  title={a.summary || ""}
                >
                  {a.summary || "No summary provided for this article."}
                </p>

                {/* Footer: Calendar/Date on left, Sends count on right */}
                <div className="mt-4 flex items-center justify-between border-t border-line-soft pt-3.5 text-[12.5px] text-muted">
                  <div className="flex items-center gap-1.5 min-w-0 truncate text-slate-500">
                    <svg className="h-3.5 w-3.5 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span className="truncate">
                      {a.source ? `${a.source} • ` : ""}
                      <span className="whitespace-nowrap">{kbDate(a.published_on)}</span>
                    </span>
                  </div>
                  <span className="shrink-0 whitespace-nowrap rounded-full border border-brand-border/60 bg-brand-mint px-2.5 py-0.5 text-[12px] font-semibold text-brand-green">
                    {a.send_count ?? 0} sends
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          /* Article Table View */
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[860px]">
              <thead>
                <tr className="border-b border-line bg-surface text-[13px] font-semibold text-slate-500">
                  <th className="w-16 px-4 py-3 text-center">S.No.</th>
                  <th className="px-4 py-3">Article</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Languages</th>
                  <th className="px-4 py-3">Published on</th>
                  <th className="px-4 py-3">Sends</th>
                  {canCreate && <th className="px-4 py-3">Status</th>}
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-[13.5px] text-slate-700">
                {paginatedArticles.map((a, index) => {
                  const sNo = (articlePagination.page - 1) * articlePagination.pageSize + index + 1;
                  return (
                    <tr key={a.name} className="border-b border-line-soft transition-colors last:border-b-0 hover:bg-surface/60">
                      <td className="px-4 py-3.5 text-center font-medium text-slate-500">{sNo}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col min-w-[240px] max-w-[380px]">
                          <Link
                            href={`/knowledge/${encodeURIComponent(a.name)}`}
                            className="font-semibold text-[14px] text-ink hover:text-brand-green line-clamp-1 transition-colors"
                            title={a.title}
                          >
                            {a.title}
                          </Link>
                          {a.summary && (
                            <p className="mt-0.5 text-[12px] text-ink-soft line-clamp-1" title={a.summary}>
                              {a.summary}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <CategoryTag category={a.category} />
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-[13px] text-ink-soft">
                        {a.languages?.includes(KB_LANGUAGES.am) ? "EN · አማ" : "EN"}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-[13px] text-slate-600">
                        {kbDate(a.published_on)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-semibold text-brand-green text-[13px]">{a.send_count ?? 0}</span>
                      </td>
                      {canCreate && (
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <Pill tone={KB_STATUS_TONE[a.status]} dot className="text-[12px] px-2.5 py-0.5">{a.status}</Pill>
                        </td>
                      )}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <Link
                          href={`/knowledge/${encodeURIComponent(a.name)}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-[12.5px] font-semibold text-brand-green transition-colors hover:border-brand-green/40 hover:bg-brand-wash"
                        >
                          View
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Client-side TablePagination for Card View & Table View */}
        {currentTotal > 0 && !loading && !error && (
          <TablePagination
            {...paginationProps}
            itemLabel={isYoutube ? "videos" : "articles"}
          />
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
    <article className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-line bg-white shadow-xs transition-all duration-300 hover:border-brand-border hover:shadow-md">
      {/* Cover: 16:9 aspect ratio */}
      <a href={v.youtube_url} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true" className="relative block aspect-video w-full overflow-hidden bg-slate-100">
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105" />
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <span className="absolute left-3 top-3 flex gap-1.5">
          <CategoryTag category={v.category} className="shadow-xs backdrop-blur" />
          {showStatus && v.status !== "Published" && <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11.5px] font-semibold text-amber-700 shadow-xs backdrop-blur">{v.status}</span>}
        </span>
        <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-red-600 shadow-md backdrop-blur transition-all duration-300 group-hover:scale-110 group-hover:bg-red-600 group-hover:text-white">
          <svg className="ml-0.5 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5.14v13.72a1 1 0 001.5.86l11.04-6.86a1 1 0 000-1.72L9.5 4.28A1 1 0 008 5.14z" />
          </svg>
        </span>
        <span className="absolute bottom-2 right-2.5 text-[10.5px] font-medium text-white/90 drop-shadow">{v.source ? `${v.source} • ` : ""}{kbDate(v.published_on)}</span>
      </a>

      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
        <div>
          <h3 className="line-clamp-2 h-[44px] text-[15.5px] sm:text-[16px] font-bold leading-snug tracking-tight text-ink group-hover:text-brand-green transition-colors" title={v.title}>{v.title}</h3>
          <p className="mt-1.5 line-clamp-2 h-[40px] text-[13px] leading-[20px] text-ink-soft" title={v.description || ""}>{v.description}</p>
        </div>
        <div className="mt-3.5">
          <a
            href={v.youtube_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group/cta relative inline-flex h-9 w-full items-center justify-between rounded-xl border border-brand-border bg-brand-mint pl-3 pr-2 text-[13px] font-semibold text-brand-green transition-colors duration-200 hover:border-brand-green hover:bg-brand-green hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
          >
            <span className="inline-flex items-center gap-2">
              <svg className="h-4 w-5 shrink-0" viewBox="0 0 28 20" fill="none" aria-hidden="true">
                <rect width="28" height="20" rx="5" fill="#FF0000" />
                <polygon points="11,5 19,10 11,15" fill="#FFFFFF" />
              </svg>
              Watch on YouTube
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-brand-green transition-transform duration-200 group-hover/cta:translate-x-0.5">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 17L17 7M8 7h9v9" />
              </svg>
            </span>
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          {(onEdit || onArchive) && (
            <div className="mt-3 flex gap-2 border-t border-line-soft pt-3">
              {onEdit && (
                <Button type="button" variant="outline" size="sm" className="flex-1 h-8 text-[12px] gap-1.5" onClick={onEdit}>
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
                  Edit
                </Button>
              )}
              {onArchive && (
                <Button type="button" variant={v.status === "Archived" ? "brandOutline" : "dangerOutline"} size="sm" className="flex-1 h-8 text-[12px] gap-1.5" onClick={onArchive}>
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" /></svg>
                  {v.status === "Archived" ? "Restore" : "Archive"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
