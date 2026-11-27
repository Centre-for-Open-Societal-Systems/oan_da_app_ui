import type { Metadata } from "next";
import { ReportsList } from "./components/ReportsList";

export const metadata: Metadata = {
  title: "Reports | OpenAgriNet",
  description: "Exportable registry, coverage, sync and activity reports.",
};

export default function ReportsPage() {
  return (
    <div className="flex w-full flex-col gap-4">
      <ReportsList />
    </div>
  );
}
