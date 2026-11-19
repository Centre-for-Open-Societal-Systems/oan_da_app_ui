import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { BroadcastWorkspace } from "./components/BroadcastWorkspace";

export const metadata: Metadata = {
  title: "Broadcast | OpenAgriNet",
  description: "Craft and dispatch SMS / Telegram messages to DAs, farmers and cooperative members.",
};

export default function BroadcastPage() {
  return (
    <div className="flex w-full flex-col gap-4">
      <PageHeader title="Broadcast" description="One engine receives, assimilates, crafts and broadcasts messages across SMS and Telegram. Broadcasts are limited to Woredas: all farmers or all DAs in a Woreda (a Development Agent reaches their own Kebele)." />
      {/* useSearchParams (signal prefill) needs a Suspense boundary for static rendering */}
      <Suspense fallback={null}>
        <BroadcastWorkspace />
      </Suspense>
    </div>
  );
}
