import type { PillTone } from "@/components/ui/Pill";

// FR-10 Broadcast/Alert engine, FR-11 knowledge dissemination, FR-10b notifications.

export type Channel = "SMS" | "Telegram";
// Broadcasts are limited to Woredas: a message goes to every farmer or every DA in one Woreda, never a kebele or segment.
export type RecipientGroup = "Farmers" | "Development Agents";
export const RECIPIENT_GROUPS: RecipientGroup[] = ["Farmers", "Development Agents"];
export type Audience = `${RecipientGroup} — ${string} Woreda`;

/** Reachable recipients per Woreda (registered farmers with a phone, active DAs). */
export const WOREDA_AUDIENCES: Record<string, Record<RecipientGroup, number>> = {
  "Bako Tibe": { Farmers: 1240, "Development Agents": 38 },
  Ambo: { Farmers: 980, "Development Agents": 31 },
  Dendi: { Farmers: 860, "Development Agents": 27 },
  Cheliya: { Farmers: 710, "Development Agents": 22 },
};

export const audienceOf = (group: RecipientGroup, woreda: string): Audience => `${group} — ${woreda} Woreda`;
export const audienceSize = (group: RecipientGroup, woreda: string) => WOREDA_AUDIENCES[woreda]?.[group] ?? 0;
export type SignalSource = "Knowledge" | "Emergency" | "Weather" | "Informational" | "Grievance";

export interface Article {
  id: string;
  title: string;
  category: "Crop production" | "Livestock" | "Soil & water" | "Pest & disease" | "Markets & credit" | "Advisory";
  summary: string;
  body: string[];
  snippet: string;
  languages: ("en" | "am")[];
  updatedAt: string;
  author: string;
  sends: number;
}

export const ARTICLES: Article[] = [
  { id: "kb-101", title: "Teff row-planting: spacing and seed rate", category: "Crop production", summary: "Row planting at 20 cm spacing cuts seed rate to 5–8 kg/ha and raises yield 20–30%.", body: ["Broadcasting teff wastes seed and makes weeding hard. Row planting at 20 cm between rows with a seed rate of 5–8 kg/ha gives stronger tillering and easier weeding.", "Prepare a fine, level seedbed. Mix seed with sand (1:2) to spread evenly. Cover lightly — teff must not be buried deeper than 1 cm.", "First weeding at 3 weeks; second at 6 weeks. Apply top-dress urea (50 kg/ha) after the first weeding if the crop shows yellowing."], snippet: "Teff: plant in rows 20 cm apart, seed 5–8 kg/ha, cover no deeper than 1 cm. First weeding at 3 weeks. — OpenAgriNet", languages: ["en", "am"], updatedAt: "11 Sep 2026", author: "MoA Crop Directorate", sends: 62 },
  { id: "kb-102", title: "Fall armyworm scouting on maize", category: "Pest & disease", summary: "Scout weekly from emergence; act when 20% of plants show fresh feeding damage.", body: ["Walk a W-pattern through the field and check 20 plants per stop for fresh frass and window-pane feeding in the whorl.", "Threshold: 20% of plants with fresh damage at V3–V6. Hand-pick larvae early; apply registered biopesticide in the late afternoon.", "Report outbreaks through the DA app so the Woreda can alert neighbouring kebeles."], snippet: "Maize: scout weekly for fall armyworm (frass, window-pane leaves). Act at 20% damaged plants. Report outbreaks to your DA. — OpenAgriNet", languages: ["en", "am"], updatedAt: "08 Sep 2026", author: "ATI Plant Health", sends: 41 },
  { id: "kb-103", title: "Vaccination calendar — cattle and shoats", category: "Livestock", summary: "Anthrax, blackleg and PPR schedule for the Belg/Meher seasons.", body: ["Anthrax and blackleg: annual, before the rains. PPR (sheep and goats): every year, all animals over 3 months.", "Record ear-tag IDs in the ODK livestock form so coverage and next-due dates are tracked.", "Overdue animals appear on the DA's farmer list as ‘Livestock due’."], snippet: "Livestock: anthrax + blackleg vaccination before the rains; PPR yearly for all shoats over 3 months. Ask your DA for the schedule. — OpenAgriNet", languages: ["en"], updatedAt: "02 Sep 2026", author: "MoA Livestock Directorate", sends: 18 },
  { id: "kb-104", title: "Soil-bund maintenance after heavy rain", category: "Soil & water", summary: "Inspect bunds within 48 h of a storm; repair breaches before the next rain.", body: ["Walk the bund line and mark breaches. Rebuild with compacted soil and plant vetiver or elephant grass on the downslope side.", "Keep the spillway clear so overflow does not cut a new channel."], snippet: "After heavy rain: check soil bunds within 2 days, repair breaches, keep spillways clear. — OpenAgriNet", languages: ["en", "am"], updatedAt: "28 Aug 2026", author: "Bako Tibe Woreda NRM", sends: 27 },
  { id: "kb-105", title: "Input-loan repayment window opens 1 Oct", category: "Markets & credit", summary: "Seasonal input loans from partner banks fall due from 1 Oct; early repayment discount 2%.", body: ["Repay at any CBO branch or agent; bring the loan reference. Early repayment before 15 Oct earns a 2% discount.", "Farmers who cannot repay on time should tell their DA before the due date so a rescheduling request can be lodged."], snippet: "Input loans due from 1 Oct. Repay at any CBO branch/agent with your reference. 2% off before 15 Oct. Talk to your DA if you need rescheduling. — OpenAgriNet", languages: ["en", "am"], updatedAt: "14 Sep 2026", author: "Access to Credit programme", sends: 9 },
];

export const ARTICLE_CATEGORIES = Array.from(new Set(ARTICLES.map((a) => a.category)));

export interface KnowledgeVideo {
  id: string;
  /** Title as published by the Ministry of Agriculture (Amharic). */
  title: string;
  category: Article["category"];
  /** English summary of the video. */
  summary: string;
  /** Opens on YouTube in a new tab. */
  url: string;
  /** YouTube thumbnail of the video. */
  image: string;
  publishedAt: string;
}

// Videos listed on the Ministry of Agriculture's video page (https://www.moa.gov.et/videos/), from its YouTube channel.
const moaVideo = (videoId: string, title: string, category: Article["category"], summary: string, publishedAt: string): KnowledgeVideo => ({
  id: `yt-${videoId}`,
  title,
  category,
  summary,
  url: `https://www.youtube.com/watch?v=${videoId}`,
  image: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  publishedAt,
});

// YouTube tab of the Knowledge Base.
export const KNOWLEDGE_VIDEOS: KnowledgeVideo[] = [
  moaVideo("nIp7ZqrEHyk", "ከስደት መልስ አዋጭ የዶሮ እርባታ", "Livestock", "Profitable poultry farming started by a returnee after migration.", "07 Oct 2026"),
  moaVideo("LJkLRoSJ_tU", "ተንቀሳቃሽ የእንስሳት ክሊኒክ", "Livestock", "Mobile veterinary clinics bringing animal health services to farmers.", "07 Oct 2026"),
  moaVideo("o0hJ3gwyJAk", "አስደናቂው የሩዝ ምርት", "Crop production", "A remarkable rice harvest and the practices behind it.", "07 Oct 2026"),
  moaVideo("U1Uvqg85MUs", "ተፈጥሮ ካደለው ደን መሃል የተገኘ ማር", "Livestock", "Beekeeping and honey production in the heart of a natural forest.", "07 Oct 2026"),
  moaVideo("EBUsrARcQl4", "የተሻሻሉ የመኖ ሳሮች- ለእንስሳት ምርትና ምርታማነት እድገት", "Livestock", "Improved forage grasses to raise livestock production and productivity.", "07 Oct 2026"),
  moaVideo("1H8QTnCe2RA", "የሥጋ ዶሮ እርባታ ከወላጅ ዶሮ እስከ ገበያ", "Livestock", "Broiler farming from parent stock all the way to market.", "07 Oct 2026"),
  moaVideo("kvwk_qvnh9M", "ለምግብ ሉዓላዊነት መረጋገጥ በስንዴ ምርት ራስን መቻል", "Crop production", "Wheat self-sufficiency as the path to food sovereignty.", "05 Oct 2026"),
  moaVideo("9DVjlnlLna0", "የግብርና ኢንቨስትመንት አዲስ የለውጥ ጉዞ", "Markets & credit", "Agricultural investment and the new journey of transformation.", "05 Oct 2026"),
  moaVideo("AaFVT8Oh2Ck", "በራስ ፀንቶ መሻገር…", "Advisory", "Standing on our own: self-reliance in Ethiopian agriculture.", "05 Oct 2026"),
];
export const getArticle = (id: string) => ARTICLES.find((a) => a.id === id);

export interface Signal {
  id: string;
  source: SignalSource;
  title: string;
  detail: string;
  receivedAt: string;
  severity: "Info" | "Warning" | "Critical";
  status: "New" | "Dismissed" | "Dispatched";
}

export const SIGNAL_TONE: Record<SignalSource, PillTone> = { Knowledge: "green", Emergency: "red", Weather: "blue", Informational: "slate", Grievance: "purple" };

export const SIGNALS: Signal[] = [
  { id: "sig-9012", source: "Weather", title: "Heavy rain warning — West Shewa, 17–19 Sep", detail: "NMA forecast: 60–90 mm over 48 h. Flash-flood risk in low-lying kebeles along the Gibe.", receivedAt: "16 Sep 2026, 06:10", severity: "Warning", status: "New" },
  { id: "sig-9011", source: "Emergency", title: "Fall armyworm outbreak confirmed — Koye Feche", detail: "Woreda plant-health team confirmed infestation above threshold in 3 maize fields. Neighbouring kebeles should scout immediately.", receivedAt: "15 Sep 2026, 16:40", severity: "Critical", status: "New" },
  { id: "sig-9010", source: "Knowledge", title: "New snippet: Input-loan repayment window", detail: "Access to Credit programme published a repayment notice for dissemination to borrowers.", receivedAt: "14 Sep 2026, 11:00", severity: "Info", status: "New" },
  { id: "sig-9008", source: "Grievance", title: "Grievance status: GRV-2026-11873 resolved", detail: "Grievance Service reports resolution of a fertiliser-delivery case in Bako 01; submitter SMS sent.", receivedAt: "13 Sep 2026, 09:25", severity: "Info", status: "Dismissed" },
  { id: "sig-9007", source: "Informational", title: "Woreda extension meeting moved to 22 Sep", detail: "Monthly DA coordination meeting rescheduled; venue unchanged.", receivedAt: "12 Sep 2026, 15:00", severity: "Info", status: "Dispatched" },
];

export interface Dispatch {
  id: string;
  message: string;
  source: SignalSource;
  channels: Channel[];
  audience: Audience;
  recipients: number;
  dispatchedBy: string;
  dispatchedAt: string;
  delivery: { delivered: number; failed: number; pending: number };
  /** Evidence files (photos / PDFs) attached when the message was sent. */
  evidence?: string[];
}

export const DISPATCHES: Dispatch[] = [
  { id: "bc-2210", message: "Woreda DA coordination meeting moved to Mon 22 Sep, 09:00, same venue. — Bako Tibe Extension Office", source: "Informational", channels: ["SMS", "Telegram"], audience: "Development Agents — Bako Tibe Woreda", recipients: 38, dispatchedBy: "Almaz Tesfaye", dispatchedAt: "12 Sep 2026, 15:20", delivery: { delivered: 37, failed: 1, pending: 0 } },
  { id: "bc-2207", message: "Teff: plant in rows 20 cm apart, seed 5–8 kg/ha, cover no deeper than 1 cm. First weeding at 3 weeks. — OpenAgriNet", source: "Knowledge", channels: ["SMS"], audience: "Farmers — Bako Tibe Woreda", recipients: 1240, dispatchedBy: "Tadesse Alemu (DA)", dispatchedAt: "12 Sep 2026, 11:02", delivery: { delivered: 1198, failed: 26, pending: 16 } },
  { id: "bc-2201", message: "Livestock: anthrax + blackleg vaccination before the rains; PPR yearly for all shoats over 3 months. — OpenAgriNet", source: "Knowledge", channels: ["SMS", "Telegram"], audience: "Farmers — Bako Tibe Woreda", recipients: 1240, dispatchedBy: "Kebede Alemu (DA)", dispatchedAt: "05 Sep 2026, 08:45", delivery: { delivered: 1211, failed: 29, pending: 0 } },
  { id: "bc-2196", message: "Flood warning: heavy rain expected 3–4 Sep. Move stored grain and animals away from riverbanks. — Bako Tibe Woreda", source: "Weather", channels: ["SMS"], audience: "Farmers — Bako Tibe Woreda", recipients: 1240, dispatchedBy: "Almaz Tesfaye", dispatchedAt: "02 Sep 2026, 17:30", delivery: { delivered: 1219, failed: 21, pending: 0 } },
];

export interface Notification {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  kind: "Onboarding" | "Assignment" | "Sync" | "Grievance" | "Broadcast" | "Issue";
}

export const NOTIFICATIONS: Notification[] = [
  { id: "n-1", kind: "Sync", title: "MoA publication failed — DA-OR-000355", body: "HTTP 502 from MoA gateway. Retry available in Registry Sync.", at: "14 Sep 2026, 07:55", read: false },
  { id: "n-2", kind: "Grievance", title: "Grievance GRV-2026-11873 resolved", body: "Submitter notified by SMS.", at: "13 Sep 2026, 09:25", read: false },
  { id: "n-3", kind: "Onboarding", title: "Changes requested — Yohannes Tesfaye", body: "Confirm DOB with Fayda card and re-submit.", at: "11 Sep 2026, 16:05", read: false },
  { id: "n-4", kind: "Assignment", title: "Kebele assignment flagged — Selamawit Haile", body: "Out-of-bounds: home GPS 2.4 km outside Amarti Gibe.", at: "16 Aug 2026, 09:41", read: true },
  { id: "n-5", kind: "Broadcast", title: "Broadcast bc-2207 delivered", body: "231 delivered · 9 failed · 8 pending.", at: "12 Sep 2026, 11:20", read: true },
  { id: "n-6", kind: "Issue", title: "ISS-2038 assigned to Finance desk", body: "SLA 3 days.", at: "12 Sep 2026, 10:02", read: true },
];
