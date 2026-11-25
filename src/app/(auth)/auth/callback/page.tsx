import type { Metadata } from "next";
import { KeycloakCallback } from "./KeycloakCallback";

export const metadata: Metadata = {
  title: "Signing in | OpenAgriNet",
  description: "Finishing your Keycloak sign-in.",
};

export default function KeycloakCallbackPage() {
  return <KeycloakCallback />;
}
