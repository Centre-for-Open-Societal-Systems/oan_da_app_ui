import type { Metadata } from "next";
import { AgentProfileLoader } from "./components/AgentProfileLoader";

// The record is read on the client (GET /da-services/agents/{da_id}) with the signed-in user's own token, so the
// page itself only knows the DA-ID.
export async function generateMetadata(props: PageProps<"/agents/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  return { title: `${id} | OpenAgriNet` };
}

export default async function AgentProfilePage(props: PageProps<"/agents/[id]">) {
  const { id } = await props.params;
  return <AgentProfileLoader daId={id} />;
}
