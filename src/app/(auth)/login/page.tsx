import { Metadata } from "next";
import { LoginCard } from "./components/LoginCard";

export const metadata: Metadata = {
  title: "Login | OpenAgriNet",
  description: "Sign in to the Ethiopia Agent Portal.",
};

export default function LoginPage() {
  return <LoginCard />;
}
