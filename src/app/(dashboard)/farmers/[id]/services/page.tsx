import type { Metadata } from "next";
import { BackLink } from "@/components/ui/BackLink";
import { getFarmer } from "@/features/farmers";
import { ServicesLoader } from "./components/ServicesLoader";

export async function generateMetadata(props: PageProps<"/farmers/[id]/services">): Promise<Metadata> {
  const { id } = await props.params;
  const farmer = getFarmer(id);
  return { title: farmer ? `Services — ${farmer.name} | OpenAgriNet` : "Services | OpenAgriNet" };
}

export default async function FarmerServicesPage(props: PageProps<"/farmers/[id]/services">) {
  const { id } = await props.params;

  return (
    <div className="flex w-full flex-col gap-4">
      <BackLink href={`/farmers/${id}`} />
      <ServicesLoader id={id} />
    </div>
  );
}
