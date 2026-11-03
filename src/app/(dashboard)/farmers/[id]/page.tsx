import type { Metadata } from "next";
import { BackLink } from "@/components/ui/BackLink";
import { FarmerProfileView } from "./components/FarmerProfileView";

// The profile loads on the client (it needs the signed-in user's token), so the title is generic.
export const metadata: Metadata = { title: "Farmer profile | OpenAgriNet" };

export default async function FarmerProfilePage(props: PageProps<"/farmers/[id]">) {
  const { id } = await props.params;

  return (
    <div className="flex w-full flex-col gap-4">
      <BackLink href="/farmers" />
      <FarmerProfileView id={id} />
    </div>
  );
}
