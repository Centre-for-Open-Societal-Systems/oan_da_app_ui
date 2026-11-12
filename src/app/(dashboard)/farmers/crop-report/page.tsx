import type { Metadata } from "next";
import { CropReportForm } from "./components/CropReportForm";

export const metadata: Metadata = {
  title: "Crop Sown Survey | OpenAgriNet",
  description: "Record a farmer's crop sown, planning, cultivation, sowing and harvest details.",
};

export default function CropReportPage() {
  return (
    <div className="flex w-full flex-col gap-4">
      <CropReportForm />
    </div>
  );
}
