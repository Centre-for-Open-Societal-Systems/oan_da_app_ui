import type { Metadata } from "next";
import { MyTeam } from "./components/MyTeam";

export const metadata: Metadata = {
  title: "My Teams | OpenAgriNet",
  description: "The Development Agents posted to your Kebele, from the DA Registry.",
};

export default function MyTeamsPage() {
  return <MyTeam />;
}
