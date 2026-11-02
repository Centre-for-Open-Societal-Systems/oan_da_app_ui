import { Metadata } from "next";
import { AutoKeycloakLogin } from "./components/AutoKeycloakLogin";

export const metadata: Metadata = {
  title: "Login | OpenAgriNet",
  description: "Sign in to the Ethiopia Agent Portal.",
};

export default function LoginPage() {
  return <AutoKeycloakLogin />;
}
