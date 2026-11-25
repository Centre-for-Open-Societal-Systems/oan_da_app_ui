import { Card } from "@/components/ui/Card";
import { ETHIOPIAN_MONTHS, toEthiopian } from "@/lib/ethiopian";
import { HelpDot } from "../../leave-admin/shared";
import { LEAVE_YEAR } from "./leave";

type KeyDateTone = "federal" | "region" | "local" | "blocked";
const KEY_DATE_TONE: Record<KeyDateTone, { text: string; dot: string; label: string }> = {
  federal: { text: "text-emerald-700", dot: "bg-emerald-600", label: "Federal" },
  region: { text: "text-blue-600", dot: "bg-blue-500", label: "Region" },
  local: { text: "text-violet-600", dot: "bg-violet-600", label: "Local" },
  blocked: { text: "text-amber-600", dot: "bg-amber-600", label: "Blocked" },
};

// Mock calendar until the leave calendar API exists. The tile shows the Ethiopian date; the note the Gregorian one.
const KEY_DATES: { iso: string; title: string; note: string; tone: KeyDateTone }[] = [
  { iso: "2026-12-09", title: "Harvest campaign block ends", note: "9 Dec 2026 · annual and personal leave", tone: "blocked" },
  { iso: "2027-01-07", title: "Genna", note: "7 Jan 2027", tone: "federal" },
  { iso: "2027-01-09", title: "Appraisal window", note: "9 Jan 2027 · to 22 Jan", tone: "local" },
  { iso: "2027-01-19", title: "Timket", note: "19 Jan 2027", tone: "federal" },
  { iso: "2027-03-02", title: "Adwa Victory Day", note: "2 Mar 2027", tone: "federal" },
  { iso: "2027-03-10", title: "Eid al-Fitr", note: "10 Mar 2027 · provisional", tone: "region" },
];

export function KeyDates() {
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
        <h3 className="flex items-center gap-2 text-[17px] font-bold text-ink">
          Key dates
          <HelpDot title="Key dates" text="Upcoming holidays, blocked periods and windows that affect leave. Colours show who set each date." />
        </h3>
        <span className="text-[12.5px] text-ink-soft">Leave year {LEAVE_YEAR}</span>
      </div>
      <ul className="flex flex-col gap-4 px-5 py-4">
        {KEY_DATES.map((d) => {
          const e = toEthiopian(d.iso);
          return (
            <li key={d.title} className="flex items-center gap-3.5">
              <div className="flex h-12 w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-surface">
                <span className={`text-[18px] font-bold leading-none ${KEY_DATE_TONE[d.tone].text}`}>{e.day}</span>
                <span className="mt-0.5 text-[12px] text-ink-soft">{ETHIOPIAN_MONTHS[e.month - 1]}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[14.5px] font-semibold text-ink">{d.title}</p>
                <p className="text-[12.5px] text-ink-soft">{d.note}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-5 pb-4 text-[12.5px] text-ink-soft">
        {Object.values(KEY_DATE_TONE).map((t) => (
          <span key={t.label} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${t.dot}`} />
            {t.label}
          </span>
        ))}
      </div>
    </Card>
  );
}
