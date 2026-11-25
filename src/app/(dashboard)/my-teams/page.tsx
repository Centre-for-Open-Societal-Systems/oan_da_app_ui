import type { Metadata } from "next";
import { MyTeam } from "./components/MyTeam";

export const metadata: Metadata = {
  title: "My Teams | OpenAgriNet",
  description: "The Development Agents in your Woreda, from the DA Registry.",
};

export default function MyTeamsPage() {
  return <MyTeam />;
}
