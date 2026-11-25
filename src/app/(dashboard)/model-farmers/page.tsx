import type { Metadata } from "next";
import { BeneficiariesWorkspace } from "./components/BeneficiariesWorkspace";

export const metadata: Metadata = {
  title: "Model Farmers | OpenAgriNet",
  description: "Rule-based Model Farmer packages linked to schemes.",
};

export default function BeneficiariesPage() {
  return (
    <div className="flex w-full flex-col gap-4">
      <BeneficiariesWorkspace />
    </div>
  );
}
