import { authRequest } from "@/features/auth";
import type { PillTone } from "@/components/ui/Pill";
import type { Article } from "./data";

// Knowledge Base API (DA Services): /da-services/knowledge-base/articles and /videos.
// Readers (DA) get only Published items whose audience covers them; writers (Supervisor, Admin) get every status.

export type KbStatus = "Draft" | "Published" | "Archived";
export const KB_STATUSES: KbStatus[] = ["Draft", "Published", "Archived"];
export const KB_STATUS_TONE: Record<KbStatus, PillTone> = { Draft: "amber", Published: "green", Archived: "slate" };

/** Language codes the API uses on `languages[].language`. */
export const KB_LANGUAGES = { en: "EN", am: "አማ" } as const;

/** Fallback categories, used until (or if) GET /knowledge-base/categories answers. See listKbCategories. */
export const KB_CATEGORIES = ["Crop Production", "Pest & Disease", "Livestock", "Soil & Water", "Markets & Credit"] as const;

/** Who may create articles and videos. */
export const canWriteKnowledge = (role: string | null | undefined) => role === "Supervisor" || role === "Executive" || role === "Admin";

export interface KbAudienceScope {
  region?: string | null;
  zone?: string | null;
  woreda?: string | null;
  /** Sent by the form; the dev backend does not store it yet (2026-11-12). */
  kebele?: string | null;
}

/** One row of GET /knowledge-base/articles. */
export interface KbArticleSummary {
  name: string;
  title: string;
  summary: string | null;
  category: string;
  source: string | null;
  published_on: string | null;
  status: KbStatus;
  /** Language codes with a version, e.g. ["EN", "አማ"]. */
  languages: string[];
  send_count: number;
}

export interface KbArticleLanguage {
  language: string;
  title: string;
  summary?: string | null;
  /** HTML. */
  body?: string | null;
}

/** GET /knowledge-base/articles/{name}. */
export interface KbArticle extends Omit<KbArticleSummary, "languages"> {
  languages: KbArticleLanguage[];
  audience_scopes: KbAudienceScope[];
  modified?: string;
}

export interface KbVideo {
  name: string;
  title: string;
  description: string | null;
  youtube_url: string;
  youtube_id?: string | null;
  thumbnail?: string | null;
  category: string;
  source: string | null;
  published_on: string | null;
  status: KbStatus;
  audience_scopes?: KbAudienceScope[];
}

export interface KbPage<T> {
  items: T[];
  total: number;
}

interface ListResponse<T> {
  data: T[];
  meta: { count: number; total: number; limit: number; start: number };
}

export interface KbListQuery {
  category?: string;
  search?: string;
  status?: KbStatus;
  language?: string;
  limit?: number;
  start?: number;
}

function listQuery({ category, search, status, language, limit = 100, start = 0 }: KbListQuery): string {
  const q = new URLSearchParams({ limit: String(limit), start: String(start) });
  if (category) q.set("category", category);
  if (search?.trim()) q.set("search", search.trim());
  if (status) q.set("status", status);
  if (language) q.set("language", language);
  return q.toString();
}

const BASE = "/da-services/knowledge-base";

export async function listKbArticles(query: KbListQuery = {}): Promise<KbPage<KbArticleSummary>> {
  const res = await authRequest<ListResponse<KbArticleSummary>>(`${BASE}/articles?${listQuery({ language: KB_LANGUAGES.en, ...query })}`);
  return { items: res.data ?? [], total: res.meta?.total ?? res.data?.length ?? 0 };
}

export async function getKbArticle(name: string): Promise<KbArticle> {
  const res = await authRequest<{ data: KbArticle }>(`${BASE}/articles/${encodeURIComponent(name)}`);
  return res.data;
}

export interface KbArticleInput {
  title: string;
  summary?: string;
  category: string;
  source?: string;
  published_on?: string;
  status: KbStatus;
  languages: KbArticleLanguage[];
  audience_scopes: KbAudienceScope[];
}

export async function createKbArticle(input: KbArticleInput): Promise<KbArticle> {
  const res = await authRequest<{ data: KbArticle }>(`${BASE}/articles`, { method: "POST", body: input });
  return res.data;
}

/** PATCH: send only the keys to change; `languages` / `audience_scopes` replace the whole table. */
export async function updateKbArticle(name: string, patch: Partial<KbArticleInput>): Promise<KbArticle | undefined> {
  const res = await authRequest<{ data?: KbArticle }>(`${BASE}/articles/${encodeURIComponent(name)}`, { method: "PATCH", body: patch });
  return res?.data;
}

/** Archive instead of delete (status → Archived); restoring sets it back to Draft. */
export const setKbArticleStatus = (name: string, status: KbStatus) => updateKbArticle(name, { status });

export async function getKbVideo(name: string): Promise<KbVideo> {
  const res = await authRequest<{ data: KbVideo }>(`${BASE}/videos/${encodeURIComponent(name)}`);
  return res.data;
}

export async function listKbVideos(query: KbListQuery = {}): Promise<KbPage<KbVideo>> {
  const res = await authRequest<ListResponse<KbVideo>>(`${BASE}/videos?${listQuery(query)}`);
  return { items: res.data ?? [], total: res.meta?.total ?? res.data?.length ?? 0 };
}

export interface KbVideoInput {
  title: string;
  description?: string;
  youtube_url: string;
  category: string;
  source?: string;
  published_on?: string;
  status: KbStatus;
  audience_scopes: KbAudienceScope[];
}

export async function createKbVideo(input: KbVideoInput): Promise<KbVideo> {
  const res = await authRequest<{ data: KbVideo }>(`${BASE}/videos`, { method: "POST", body: input });
  return res.data;
}

export async function updateKbVideo(name: string, patch: Partial<KbVideoInput>): Promise<KbVideo | undefined> {
  const res = await authRequest<{ data?: KbVideo }>(`${BASE}/videos/${encodeURIComponent(name)}`, { method: "PATCH", body: patch });
  return res?.data;
}

export const setKbVideoStatus = (name: string, status: KbStatus) => updateKbVideo(name, { status });

/** Category label of one row of GET /knowledge-base/categories: a plain string, or an object naming it. */
function categoryLabel(row: unknown): string | null {
  if (typeof row === "string") return row.trim() || null;
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  for (const key of ["category_name", "category", "label", "title", "name", "value"]) {
    const v = r[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

let categoriesCache: Promise<string[]> | null = null;
/**
 * Category names from GET /da-services/knowledge-base/categories, read once per page. Rows may be strings or objects
 * (category_name / name / label …); inactive rows (`is_active` / `enabled` false) are skipped. Falls back to
 * KB_CATEGORIES when the call fails or returns nothing.
 */
export function listKbCategories(): Promise<string[]> {
  if (!categoriesCache) {
    categoriesCache = authRequest<{ data?: unknown }>(`${BASE}/categories`)
      .then((res) => {
        const raw = res?.data;
        const rows = Array.isArray(raw) ? raw : raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items) ? (raw as { items: unknown[] }).items : [];
        const active = rows.filter((r) => !(r && typeof r === "object" && ((r as Record<string, unknown>).is_active === 0 || (r as Record<string, unknown>).is_active === false || (r as Record<string, unknown>).enabled === 0 || (r as Record<string, unknown>).enabled === false)));
        // Rows carry sort_order (1, 2, …); keep the backend's order.
        const order = (r: unknown) => (r && typeof r === "object" && typeof (r as { sort_order?: unknown }).sort_order === "number" ? (r as { sort_order: number }).sort_order : Number.MAX_SAFE_INTEGER);
        const sorted = [...active].sort((a, b) => order(a) - order(b));
        const names = Array.from(new Set(sorted.map(categoryLabel).filter((n): n is string => !!n)));
        return names.length ? names : [...KB_CATEGORIES];
      })
      .catch(() => {
        categoriesCache = null;
        return [...KB_CATEGORIES];
      });
  }
  return categoriesCache;
}

export interface KbRegion {
  code: string;
  name: string;
}

export type KbGeoLevel = "region" | "zone" | "woreda" | "kebele";
export interface KbGeo extends KbRegion {
  /** Code of the area one level up (zone for a woreda, …). */
  parent: string;
}

const geoCache = new Map<string, Promise<KbGeo[]>>();
/**
 * Areas of one level under `parent` (regions under "ET", zones under a region, woredas under a zone, kebeles under a
 * woreda), from GET /da-services/get_master_data?data_type=geo&field_name=<level>&parent=<code>. Rows {code, name,
 * parent}; the code (e.g. "ET010108") is what audience_scopes takes. Read once per page; a failed read is tried again.
 */
export function listKbGeo(level: KbGeoLevel, parent: string): Promise<KbGeo[]> {
  const key = `${level}:${parent}`;
  let found = geoCache.get(key);
  if (!found) {
    const q = new URLSearchParams({ data_type: "geo", field_name: level, parent, current_page: "1", page_size: "500", search: "" });
    found = authRequest<{ data: { code: string; name: string; parent: string }[] }>(`/da-services/get_master_data?${q}`)
      .then((res) => (res.data ?? []).map((r) => ({ code: r.code, name: r.name || r.code, parent: r.parent ?? parent })).sort((a, b) => a.name.localeCompare(b.name)))
      .catch((err) => {
        geoCache.delete(key);
        throw err;
      });
    geoCache.set(key, found);
  }
  return found;
}

export const listKbRegions = (): Promise<KbRegion[]> => listKbGeo("region", "ET");

/** The 11-character video id of a YouTube watch / youtu.be / shorts / embed URL, or null. */
export function youtubeId(url: string): string | null {
  const m = url.trim().match(/^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export const youtubeThumbnail = (video: Pick<KbVideo, "thumbnail" | "youtube_id" | "youtube_url">) =>
  video.thumbnail || (() => {
    const id = video.youtube_id || youtubeId(video.youtube_url);
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
  })();

/** Plain paragraphs typed in the form → the HTML body the API stores. */
export function textToHtml(text: string): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escape(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** "2026-11-10" → "10 Nov 2026"; anything else is shown as it came. */
export function kbDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** The shape SendToFarmersModal takes; the article's summary is the SMS snippet. */
export function kbArticleToSendable(article: KbArticle, version?: KbArticleLanguage): Article {
  const summary = version?.summary || article.summary || "";
  return {
    id: article.name,
    title: version?.title || article.title,
    category: article.category as Article["category"],
    summary,
    body: [],
    snippet: summary,
    languages: article.languages.some((l) => l.language === KB_LANGUAGES.am) ? ["en", "am"] : ["en"],
    updatedAt: kbDate(article.published_on),
    author: article.source || "",
    sends: article.send_count ?? 0,
  };
}
