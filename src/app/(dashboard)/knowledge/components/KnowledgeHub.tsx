"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { SearchInput } from "@/components/ui/SearchInput";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuthStore } from "@/store/useAuthStore";
import { ARTICLE_CATEGORIES, ARTICLES, KNOWLEDGE_VIDEOS, type Article } from "@/features/communication";
import { matchesQuery } from "@/lib/search";
import { cn } from "@/lib/utils";

// Appendix C.5 Knowledge Base: content hub (knowledge + advisory merged) — categories, search, Create snippet, item → article.
export function KnowledgeHub() {
  const role = useAuthStore((s) => s.role);
  const canCreate = role === "CommsOfficer" || role === "Admin" || role === "Supervisor";
  const [articles, setArticles] = useState<Article[]>(ARTICLES);
  const [category, setCategory] = useState("");
  const [isYoutube, setIsYoutube] = useState(false);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<{ title: string; category: Article["category"]; snippet: string }>({ title: "", category: ARTICLE_CATEGORIES[0], snippet: "" });
  const [notice, setNotice] = useState<string | null>(null);

  // The YouTube button swaps article cards for video topics; picking a category tab returns to articles.
  const visible = useMemo(() => {
    return articles.filter((a) => (!category || a.category === category) && matchesQuery(query, a));
  }, [articles, category, query]);
  const visibleVideos = KNOWLEDGE_VIDEOS.filter((v) => matchesQuery(query, v.title, v.category, v.summary));

  const titleLength = draft.title.trim().length;
  const snippetLength = draft.snippet.trim().length;
  const canCreateSnippet = titleLength >= 3 && snippetLength >= 10;

  const create = () => {
    const id = `kb-${106 + articles.length - ARTICLES.length}`;
    setArticles((prev) => [{ id, title: draft.title, category: draft.category, summary: draft.snippet, body: [draft.snippet], snippet: draft.snippet, languages: ["en"], updatedAt: "Just now", author: "You", sends: 0 }, ...prev]);
    setCreateOpen(false);
    setDraft({ title: "", category: ARTICLE_CATEGORIES[0], snippet: "" });
    setNotice(`Snippet “${draft.title}” created. Open it to send to farmers via SMS / Telegram.`);
  };

  return (
    <>
      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}
      <Card className="p-0 shadow-card">
        {/* Category tabs, with search and Create snippet at the right end of the bar */}
        <div className="flex flex-col gap-3 border-b border-line xl:flex-row xl:items-center xl:justify-between">
          <div role="tablist" aria-label="Category" className="flex flex-wrap rounded-tl-xl">
            {["", ...ARTICLE_CATEGORIES].map((c) => {
              const active = !isYoutube && category === c;
              return (
                <button
                  key={c || "all"}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => { setCategory(c); setIsYoutube(false); }}
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
                Create Snippet
              </Button>
            )}
          </div>
        </div>

        {isYoutube ? (
          visibleVideos.length === 0 ? (
            <EmptyState title="No videos match" hint="Try another search term." />
          ) : (
            <div className="grid grid-cols-1 gap-6 p-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleVideos.map((v) => (
                <article
                  key={v.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-[box-shadow,border-color] duration-300 hover:border-brand-border hover:shadow-[0_12px_32px_-14px_rgba(16,24,40,0.25)]"
                >
                  {/* Cover: the whole photo is also a link to the video */}
                  <a href={v.url} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true" className="relative block h-[150px] w-full overflow-hidden bg-surface">
                    <Image
                      src={v.image}
                      alt=""
                      fill
                      sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[12px] font-semibold text-brand-green shadow-sm backdrop-blur">
                      {v.category}
                    </span>
                    <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-red-600 shadow-lg backdrop-blur transition-all duration-300 group-hover:scale-110 group-hover:bg-red-600 group-hover:text-white">
                      <svg className="ml-0.5 h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M8 5.14v13.72a1 1 0 001.5.86l11.04-6.86a1 1 0 000-1.72L9.5 4.28A1 1 0 008 5.14z" />
                      </svg>
                    </span>
                    <span className="absolute bottom-2 right-2.5 text-[10.5px] text-white/80">Ministry of Agriculture · {v.publishedAt}</span>
                  </a>

                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="line-clamp-1 text-[16px] font-semibold leading-snug tracking-tight text-ink" title={v.title}>{v.title}</h3>
                    <p className="mt-1.5 line-clamp-2 min-h-[42px] text-[13.5px] leading-[21px] text-ink-soft">{v.summary}</p>
                    <a
                      href={v.url}
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
                  </div>
                </article>
              ))}
            </div>
          )
        ) : visible.length === 0 ? (
          <EmptyState title="No articles match" hint="Try another category or search term." />
        ) : (
          <div className="grid grid-cols-1 gap-6 p-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((a) => (
              <Link
                key={a.id}
                href={`/knowledge/${a.id}`}
                className="flex flex-col rounded-xl border border-line bg-white p-4 transition-all hover:border-brand-green/30 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <Pill tone="green" className="font-semibold">{a.category}</Pill>
                  <span className="text-[12px] text-muted">{a.languages.includes("am") ? "EN · አማ" : "EN"}</span>
                </div>
                <h3 className="mt-4 text-[18px] font-semibold leading-snug text-ink">{a.title}</h3>
                <p className="mt-2 flex-1 text-[14px] leading-relaxed text-ink-soft">{a.summary}</p>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3 text-[12.5px] text-muted">
                  <span className="min-w-0">{a.author} • <span className="whitespace-nowrap">{a.updatedAt}</span></span>
                  <span className="shrink-0 whitespace-nowrap font-semibold text-brand-green">{a.sends} sends</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Snippet" subtitle="A short, SMS-ready knowledge snippet farmers can act on" size="lg"
        footer={<><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button variant="brand" disabled={!canCreateSnippet} onClick={create}>Create</Button></>}
      >
        <div className="flex flex-col gap-4">
          <FormField label="Title" htmlFor="kb-title" required hint="At least 3 characters." hintTone={titleLength > 0 && titleLength < 3 ? "error" : "muted"}><Input id="kb-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></FormField>
          <FormField label="Category" htmlFor="kb-cat" required><Select id="kb-cat" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Article["category"] })}>{ARTICLE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></FormField>
          <FormField label="Snippet" htmlFor="kb-snippet" required hint={`At least 10 characters · ${draft.snippet.length} characters · keep to 160 for one SMS segment`} hintTone={snippetLength > 0 && snippetLength < 10 ? "error" : "muted"}><Textarea id="kb-snippet" rows={4} value={draft.snippet} onChange={(e) => setDraft({ ...draft, snippet: e.target.value })} /></FormField>
          {!canCreateSnippet && <p className="text-[12.5px] text-muted">Complete every field marked * to enable Create.</p>}
        </div>
      </Modal>
    </>
  );
}
