// Supervisor survey results (mock data until the survey analytics API exists).

// Filter menus of the analytics card; counts are the number of surveys / responses behind each option.
export const RESULT_SURVEY_TYPES = [
  { value: "Farmer satisfaction", label: "Farmer satisfaction", count: 4 },
  { value: "DA satisfaction", label: "DA satisfaction", count: 2 },
  { value: "Service quality", label: "Service quality", count: 3 },
  { value: "Training feedback", label: "Training feedback", count: 2 },
];
export const RESULT_REGIONS = [
  { value: "Somali", label: "Somali", count: 482 },
  { value: "Oromia", label: "Oromia", count: 319 },
  { value: "Amhara", label: "Amhara", count: 319 },
  { value: "SNNPR", label: "SNNPR", count: 206 },
];
export const RESULT_DATE_RANGES = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "quarter", label: "This quarter" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom range" },
];

export const SURVEY_ANALYTICS = {
  responseRate: { pct: 68, delta: "+4.2%", completed: 1020, invited: 1500, margin: "±2.5%" },
  averageScore: { score: 4.2, outOf: 5, delta: "+4.2%", topBoxPct: 84, completed: 1020 },
};

export const REGIONAL_SCORES: { region: string; score: number; bar: string }[] = [
  { region: "Oromia", score: 4.2, bar: "bg-brand-green" },
  { region: "Amhara", score: 4.0, bar: "bg-blue-500" },
  { region: "SNNPR", score: 3.9, bar: "bg-amber-500" },
  { region: "Somali", score: 3.7, bar: "bg-violet-500" },
];

export interface SurveyResponse {
  id: string;
  farmerName: string;
  farmerId: string;
  region: string;
  zone: string;
  kebele: string;
  assignedDa: string;
  responseRate: number;
  date: string;
}

const SEED: Omit<SurveyResponse, "id" | "region">[] = [
  { farmerName: "Lelise Gudeta", farmerId: "FRM-OR-004215", zone: "West Shewa", kebele: "Bako 01", assignedDa: "Almaz Wolde", responseRate: 100, date: "12 Jun 2024" },
  { farmerName: "Abebe Kebede", farmerId: "FRM-OR-004231", zone: "West Shewa", kebele: "Bako 02", assignedDa: "Dawit Kebede", responseRate: 92, date: "09 Jun 2024" },
  { farmerName: "Chaltu Dinkesa", farmerId: "FRM-OR-004302", zone: "East Shewa", kebele: "Lume 01", assignedDa: "Tigist Negash", responseRate: 85, date: "04 Jun 2024" },
  { farmerName: "Kebede Wakjira", farmerId: "FRM-OR-004358", zone: "West Shewa", kebele: "Gedo 03", assignedDa: "Yohannes Tesfaye", responseRate: 78, date: "28 May 2024" },
  { farmerName: "Tigist Bekele", farmerId: "FRM-OR-004412", zone: "Arsi", kebele: "Adea 04", assignedDa: "Abebe Girma", responseRate: 64, date: "21 May 2024" },
  { farmerName: "Dawit Mekonnen", farmerId: "FRM-OR-004467", zone: "East Shewa", kebele: "Dendi 02", assignedDa: "Hana Tesfaye", responseRate: 100, date: "15 May 2024" },
  { farmerName: "Meseret Alemayehu", farmerId: "FRM-OR-004519", zone: "West Shewa", kebele: "Bako 04", assignedDa: "Meseret Bekele", responseRate: 48, date: "07 May 2024" },
  { farmerName: "Bekele Tadesse", farmerId: "FRM-OR-004573", zone: "Arsi", kebele: "Adama 01", assignedDa: "Kaleb Demissie", responseRate: 95, date: "29 Apr 2024" },
  { farmerName: "Hana Tesfaye", farmerId: "FRM-OR-004624", zone: "West Shewa", kebele: "Gedo 02", assignedDa: "Rahel Mulugeta", responseRate: 72, date: "18 Apr 2024" },
  { farmerName: "Yonas Kassa", farmerId: "FRM-OR-004680", zone: "East Shewa", kebele: "Lume 03", assignedDa: "Selamawit Haile", responseRate: 33, date: "03 Apr 2024" },
];

// 42 rows: the 10 seeded ones, then variations of them so paging has something to show.
export const SURVEY_RESPONSES: SurveyResponse[] = Array.from({ length: 42 }, (_, i) => {
  const base = SEED[i % SEED.length];
  const round = Math.floor(i / SEED.length);
  const num = 4215 + i * 11;
  return {
    ...base,
    id: `sr-${i + 1}`,
    region: "Oromia",
    farmerId: round === 0 ? base.farmerId : `FRM-OR-00${num}`,
    responseRate: round === 0 ? base.responseRate : Math.max(20, Math.min(100, base.responseRate - round * 7)),
  };
});
