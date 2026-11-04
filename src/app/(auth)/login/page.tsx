import { Metadata } from "next";
import { loginErrorMessage } from "@/lib/iam";
import { LoginCard } from "./components/LoginCard";

export const metadata: Metadata = {
  title: "Login | OpenAgriNet",
  description: "Sign in to the Ethiopia Agent Portal.",
};

// A plain visit goes straight to the staff sign-in. The password form shows after a failed sign-in
// (/login?error=…, set by this app's /api/auth/iam routes) or on request (/login?local=1).
export default async function LoginPage(props: PageProps<"/login">) {
  const params = await props.searchParams;
  const code = typeof params.error === "string" ? params.error : null;
  return <LoginCard initialError={loginErrorMessage(code)} showFormFirst={code !== null || params.local === "1"} />;
}
