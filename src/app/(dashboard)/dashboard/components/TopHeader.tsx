"use client";

import { Card } from "@/components/ui/Card";
import { useAuthStore } from "@/store/useAuthStore";
import { DateRangeDropdown } from "./DateRangeDropdown";

interface TopHeaderProps {
  ranges?: readonly string[];
  range?: string;
  onRangeChange?: (range: string) => void;
}

export function TopHeader({ ranges, range, onRangeChange }: TopHeaderProps = {}) {
  const name = useAuthStore((s) => s.user?.name) ?? "";
  const scope = useAuthStore((s) => s.profile?.scopeLabel);
  const firstName = name.split(" ")[0];

  return (
    <Card className="relative z-50 flex w-full flex-col justify-between gap-3 p-4 shadow-card sm:flex-row sm:items-center sm:gap-4 sm:p-5">
      <div>
        <h1 className="text-[18px] sm:text-[20px] md:text-[22px] font-semibold tracking-tight text-ink">Welcome back, {firstName}</h1>
        <p className="mt-1 text-[12.5px] sm:text-[13.5px] text-slate-600">
          {scope}
        </p>
      </div>

      <DateRangeDropdown ranges={ranges} defaultValue={range} onChange={onRangeChange} />
    </Card>
  );
}
