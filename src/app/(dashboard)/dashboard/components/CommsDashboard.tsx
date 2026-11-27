"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Pill } from "@/components/ui/Pill";
import type { AppNotification } from "@/components/layout/NotificationsPanel";
import { KB_STATUS_TONE, kbDate, listKbArticles, listKbVideos, type KbArticleSummary, type KbVideo } from "@/features/communication";
import { listBroadcasts } from "@/features/notifications";
import { useAuthStore } from "@/store/useAuthStore";

const icon = (d: string) => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const SOURCE_TONE = { Knowledge: "blue", Emergency: "red", Weather: "amber", Informational: "slate" } as const;
const sourceTone = (s: string | null | undefined) => SOURCE_TONE[(s ?? "Informational") as keyof typeof SOURCE_TONE] ?? "slate";

/** One list's outcome: its rows, or the reason it could not be read (the other lists still show). */
type Part<T> = { rows: T[]; error: string | null };
interface Data {
  articles: Part<KbArticleSummary>;
  videos: Part<KbVideo>;
  broadcasts: Part<AppNotification>;
}

const part = <T,>(r: PromiseSettledResult<T[]>): Part<T> =>
  r.status === "fulfilled" ? { rows: r.value, error: null } : { rows: [], error: r.reason instanceof Error ? r.reason.message : "Could not load." };

const when = (at: string) => {
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? at : d.toLocaleString("en-US", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
};

function Section({ title, href, linkLabel, children }: { title: string; href: string; linkLabel: string; children: React.ReactNode }) {
  return (
    <Card className="p-0 shadow-card">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        <Link href={href} className="text-[13px] font-semibold text-brand-green hover:underline">
          {linkLabel} →
        </Link>
      </div>
      {children}
    </Card>
  );
}

const Note = ({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "error" }) => (
  <p className={tone === "error" ? "px-5 py-6 text-center text-[13.5px] text-danger" : "px-5 py-6 text-center text-[13.5px] text-muted"}>{children}</p>
);

// Communications Officer home, built only from what they work on: the Knowledge Base (GET /knowledge-base/articles and
// /videos) and Broadcast (the broadcasts in their own notifications; there is no API listing the broadcasts they sent).
export function CommsDashboard() {
  const hasSession = useAuthStore((s) => !!s.tokens);
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    if (!hasSession) return;
    let live = true;
    Promise.allSettled([listKbArticles().then((p) => p.items), listKbVideos().then((p) => p.items), listBroadcasts().then((b) => b.items)]).then(
      ([articles, videos, broadcasts]) => live && setData({ articles: part(articles), videos: part(videos), broadcasts: part(broadcasts) }),
    );
    return () => {
      live = false;
    };
  }, [hasSession]);

  const loading = data === null;
  const articles = data?.articles.rows ?? [];
  const videos = data?.videos.rows ?? [];
  const broadcasts = data?.broadcasts.rows ?? [];
  const published = articles.filter((a) => a.status === "Published").length;
  const drafts = articles.filter((a) => a.status === "Draft").length;
  const sends = articles.reduce((n, a) => n + (a.send_count ?? 0), 0);
  const publishedVideos = videos.filter((v) => v.status === "Published").length;
  const latestBroadcast = broadcasts[0];
  const mostSent = [...articles].sort((a, b) => (b.send_count ?? 0) - (a.send_count ?? 0) || a.title.localeCompare(b.title)).slice(0, 5);
  const latestVideos = videos.slice(0, 5);
  const show = (v: number) => (loading ? "…" : v.toLocaleString());

  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="flex w-full flex-col justify-between gap-4 px-4 py-5 shadow-card md:flex-row md:items-center">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-ink sm:text-[22px]">Knowledge &amp; Broadcast</h1>
          <p className="mt-1.5 text-[14px] text-ink-soft">Articles, videos and broadcasts for Development Agents.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/knowledge" className="inline-flex h-10 items-center justify-center rounded-lg border border-line bg-white px-4 text-[14px] font-semibold text-ink hover:bg-surface">
            Knowledge Base
          </Link>
          <Link href="/broadcast" className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-green px-4 text-[14px] font-semibold text-white hover:bg-brand-green-dark">
            Compose broadcast
          </Link>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Published articles" value={show(published)} accent="border-l-brand-green" tile="bg-brand-tint text-brand-green" hint={loading ? undefined : `${drafts} draft${drafts === 1 ? "" : "s"} · ${articles.length} in total`} icon={icon("M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z")} />
        <StatCard label="Videos" value={show(videos.length)} accent="border-l-blue-600" tile="bg-blue-50 text-blue-600" hint={loading ? undefined : `${publishedVideos} published`} icon={icon("M23 7l-7 5 7 5V7zM1 5h15v14H1z")} />
        <StatCard label="Article sends" value={show(sends)} accent="border-l-orange-600" tile="bg-warning-wash text-orange-700" hint="Articles sent to farmers" icon={icon("M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z")} />
        <StatCard label="Broadcasts received" value={show(broadcasts.length)} accent="border-l-violet-600" tile="bg-violet-50 text-violet-700" hint={latestBroadcast ? `Latest ${when(latestBroadcast.at)}` : loading ? undefined : "None yet"} icon={icon("M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0")} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Most sent articles" href="/knowledge" linkLabel="Open Knowledge Base">
          {loading ? (
            <Note>Loading…</Note>
          ) : data.articles.error ? (
            <Note tone="error">{data.articles.error}</Note>
          ) : mostSent.length === 0 ? (
            <Note>No articles yet.</Note>
          ) : (
            <ul className="divide-y divide-line-soft">
              {mostSent.map((a) => (
                <li key={a.name}>
                  <Link href={`/knowledge/${encodeURIComponent(a.name)}`} className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-surface">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-ink">{a.title}</p>
                      <p className="mt-0.5 text-[12.5px] text-muted">
                        {a.category}
                        {a.published_on ? ` · ${kbDate(a.published_on)}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {a.status !== "Published" && <Pill tone={KB_STATUS_TONE[a.status]}>{a.status}</Pill>}
                      <span className="w-16 text-right text-[13px] text-ink-soft">
                        <strong className="font-semibold text-ink">{a.send_count ?? 0}</strong> sends
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Recent broadcasts" href="/broadcast" linkLabel="Open Broadcast">
          {loading ? (
            <Note>Loading…</Note>
          ) : data.broadcasts.error ? (
            <Note tone="error">{data.broadcasts.error}</Note>
          ) : broadcasts.length === 0 ? (
            <Note>No broadcasts in your notifications yet. Broadcasts you send go to the Development Agents of the area you pick.</Note>
          ) : (
            <ul className="divide-y divide-line-soft">
              {broadcasts.slice(0, 5).map((b) => (
                <li key={b.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-ink">{b.title}</p>
                      {b.body && <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{b.body}</p>}
                      <p className="mt-1.5 text-[12px] text-subtle">{when(b.at)}</p>
                    </div>
                    <Pill tone={sourceTone(b.source)} className="shrink-0">
                      {b.source ?? "Informational"}
                    </Pill>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="Latest videos" href="/knowledge" linkLabel="Open Knowledge Base">
        {loading ? (
          <Note>Loading…</Note>
        ) : data.videos.error ? (
          <Note tone="error">{data.videos.error}</Note>
        ) : latestVideos.length === 0 ? (
          <Note>No videos yet.</Note>
        ) : (
          <ul className="divide-y divide-line-soft">
            {latestVideos.map((v) => (
              <li key={v.name} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-ink">{v.title}</p>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    {v.category}
                    {v.published_on ? ` · ${kbDate(v.published_on)}` : ""}
                  </p>
                </div>
                <Pill tone={KB_STATUS_TONE[v.status]} className="shrink-0">
                  {v.status}
                </Pill>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
