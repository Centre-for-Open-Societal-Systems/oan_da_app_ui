import { Metadata } from "next";
import { RegisterFarmerWizard } from "./components/RegisterFarmerWizard";

export const metadata: Metadata = {
  title: "Farmer Registration | OpenAgriNet",
  description: "Register a new farmer household profile.",
};

export default function NewFarmerPage() {
  return <RegisterFarmerWizard />;
}
