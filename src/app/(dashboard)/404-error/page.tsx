import type { Metadata } from "next";
import { Error404Card } from "./components/Error404Card";

export const metadata: Metadata = {
  title: "Page not found | OpenAgriNet",
  description: "The requested portal page could not be found.",
};

export default function Error404Page() {
  return (
    <div className="flex w-full flex-col">
      <Error404Card />
    </div>
  );
}

