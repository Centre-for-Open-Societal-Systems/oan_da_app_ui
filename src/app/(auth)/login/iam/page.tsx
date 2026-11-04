import { Metadata } from "next";
import { Suspense } from "react";
import { IamCompleteCard } from "./components/IamCompleteCard";

export const metadata: Metadata = {
  title: "Signing in | OpenAgriNet",
  description: "Completing your staff sign-in.",
};

// useSearchParams in the card needs a Suspense boundary above it.
export default function IamCompletePage() {
  return (
    <Suspense fallback={null}>
      <IamCompleteCard />
    </Suspense>
  );
}
