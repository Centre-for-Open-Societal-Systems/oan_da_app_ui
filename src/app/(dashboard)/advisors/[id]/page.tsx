import type { Metadata } from "next";
import { AdvisorDetails } from "./components/AdvisorDetails";

export const metadata: Metadata = { title: "Advisor Details | OpenAgriNet" };

// The record is read in the browser (GET /advisors/{id}) with the signed-in user's session.
export default async function AdvisorDetailsPage(props: PageProps<"/advisors/[id]">) {
  const { id } = await props.params;
  return <AdvisorDetails id={decodeURIComponent(id)} />;
}
