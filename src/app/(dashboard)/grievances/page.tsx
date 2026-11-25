import { Metadata } from "next";
import { GrievancesTable } from "./components/GrievancesTable";

export const metadata: Metadata = {
  title: "Grievances | OpenAgriNet",
  description: "Raise and track grievances for yourself or on behalf of a farmer.",
};

export default function GrievancesPage() {
  return (
    <div className="flex w-full flex-col gap-3.5 sm:gap-4 md:gap-5">
      <GrievancesTable />
    </div>
  );
}
