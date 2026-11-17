import type { AdvisoryQa } from "../api";

// The questions a farmer asked on an Advisory visit, each with the advice given (or a note that it is still to come).
export function AdvisoryQaList({ items }: { items: AdvisoryQa[] }) {
  return (
    <ol>
      {items.map((qa, i) => (
        <li key={i} className="flex gap-3 border-b border-line-soft px-4 py-3.5 last:border-0">
          <span className="mt-0.5 flex h-6 shrink-0 items-center rounded-full bg-brand-mint px-2 text-[12px] font-semibold text-brand-green">Q{i + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-ink">{qa.question}</p>
            <p className={qa.answer ? "mt-1 text-[13.5px] leading-relaxed text-slate-600" : "mt-1 text-[13.5px] italic text-muted"}>
              {qa.answer || "Answer to be added during the visit"}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
