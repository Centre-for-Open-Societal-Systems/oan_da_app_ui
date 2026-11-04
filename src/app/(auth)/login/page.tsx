import { Metadata } from "next";
import { AutoKeycloakLogin } from "./components/AutoKeycloakLogin";
import { LoginCard } from "./components/LoginCard";

export const metadata: Metadata = {
  title: "Login | OpenAgriNet",
  description: "Sign in to the Ethiopia Agent Portal.",
};

// NEXT_PUBLIC_LOGIN_MODE picks the sign-in (see LOGIN.md):
//  - "form" (default): username/password form, POST /api/v1/da-services/sso/login.
//  - "sso": no form, /login sends the browser straight to Keycloak and it returns at /auth/callback.
const LOGIN_MODE = process.env.NEXT_PUBLIC_LOGIN_MODE === "sso" ? "sso" : "form";

export default function LoginPage() {
  return LOGIN_MODE === "sso" ? <AutoKeycloakLogin /> : <LoginCard />;
}
