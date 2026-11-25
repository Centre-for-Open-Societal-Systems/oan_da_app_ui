import type { Metadata } from "next";
import { LivestockReportForm } from "./components/LivestockReportForm";

export const metadata: Metadata = {
  title: "Livestock Survey | OpenAgriNet",
  description: "Record a farmer's animals, health events, vaccinations, breeding and vital events.",
};

export default function LivestockReportPage() {
  return (
    <div className="flex w-full flex-col gap-4">
      <LivestockReportForm />
    </div>
  );
}
