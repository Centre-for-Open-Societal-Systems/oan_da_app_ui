import type { Metadata } from "next";
import { NotificationsWorkspace } from "./components/NotificationsWorkspace";

export const metadata: Metadata = {
  title: "Notifications | OpenAgriNet",
  description: "View Today, Yesterday and earlier portal notifications.",
};

export default function NotificationsPage() {
  return (
    <div className="flex w-full flex-col gap-4">
      <NotificationsWorkspace />
    </div>
  );
}

