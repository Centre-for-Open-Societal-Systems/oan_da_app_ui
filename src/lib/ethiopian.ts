// Ethiopian calendar: 12 months of 30 days plus Pagume (5 days, 6 in a leap year, i.e. year % 4 === 3).
// Dates are converted through the Julian Day Number; ISO strings are yyyy-mm-dd and always Gregorian.

export const ETHIOPIAN_MONTHS = ["Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit", "Megabit", "Miazia", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume"];

export interface EthiopianDate {
  year: number;
  /** 1–13. */
  month: number;
  day: number;
}

const JDN_OFFSET = 1723856;
const UNIX_EPOCH_JDN = 2440588;
const DAY_MS = 86_400_000;

const parseIso = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { y, m, d };
};
const jdnOfIso = (iso: string) => {
  const { y, m, d } = parseIso(iso);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS) + UNIX_EPOCH_JDN;
};
const isoOfJdn = (jdn: number) => new Date((jdn - UNIX_EPOCH_JDN) * DAY_MS).toISOString().slice(0, 10);

export const ethiopianMonthLength = (year: number, month: number) => (month < 13 ? 30 : year % 4 === 3 ? 6 : 5);

export function toEthiopian(iso: string): EthiopianDate {
  const jdn = jdnOfIso(iso);
  const r = (jdn - JDN_OFFSET) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  return {
    year: 4 * Math.floor((jdn - JDN_OFFSET) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460),
    month: Math.floor(n / 30) + 1,
    day: (n % 30) + 1,
  };
}

export function fromEthiopian({ year, month, day }: EthiopianDate): string {
  return isoOfJdn(JDN_OFFSET + 365 + 365 * (year - 1) + Math.floor(year / 4) + 30 * month + day - 31);
}

/** "5 Tahsas" */
export function ethiopianDay(iso: string) {
  const e = toEthiopian(iso);
  return `${e.day} ${ETHIOPIAN_MONTHS[e.month - 1]}`;
}

/** "5 – 8 Tahsas", or "28 Tikimt – 2 Hidar" when the dates fall in different months. */
export function ethiopianRange(start: string, end: string) {
  const a = toEthiopian(start);
  const b = toEthiopian(end);
  const name = (e: EthiopianDate) => ETHIOPIAN_MONTHS[e.month - 1];
  if (a.year === b.year && a.month === b.month) return a.day === b.day ? ethiopianDay(start) : `${a.day} – ${b.day} ${name(a)}`;
  return `${a.day} ${name(a)} – ${b.day} ${name(b)}`;
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "12 Tahsas 2019" */
export function ethiopianFull(iso: string) {
  return `${ethiopianDay(iso)} ${toEthiopian(iso).year}`;
}

/** "Mon 5 – Thu 8 Tahsas 2019": the range with weekdays and the year. */
export function ethiopianRangeLong(start: string, end: string) {
  const wd = (iso: string) => WEEKDAY_SHORT[weekdayOf(iso)];
  const a = toEthiopian(start);
  const b = toEthiopian(end);
  const name = (e: EthiopianDate) => ETHIOPIAN_MONTHS[e.month - 1];
  if (start === end) return `${wd(start)} ${a.day} ${name(a)} ${a.year}`;
  if (a.year === b.year && a.month === b.month) return `${wd(start)} ${a.day} – ${wd(end)} ${b.day} ${name(a)} ${a.year}`;
  return `${wd(start)} ${a.day} ${name(a)} – ${wd(end)} ${b.day} ${name(b)} ${b.year}`;
}

/** Adds (or subtracts) days to an ISO date. */
export const addDays = (iso: string, days: number) => isoOfJdn(jdnOfIso(iso) + days);

/** 0 = Sunday … 6 = Saturday. */
export const weekdayOf = (iso: string) => (jdnOfIso(iso) + 1) % 7;
