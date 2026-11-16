import { Metadata } from "next";
import { FarmersTable } from "./components/FarmersTable";

export const metadata: Metadata = {
  title: "My Farmers | OpenAgriNet",
  description: "Farmers linked to you across your kebeles.",
};

export default function FarmersPage() {
  return <FarmersTable />;
}
