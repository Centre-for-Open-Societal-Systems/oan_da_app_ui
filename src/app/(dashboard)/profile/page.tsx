import { Metadata } from "next";
import { ProfileView } from "./components/ProfileView";

export const metadata: Metadata = {
  title: "My profile | OpenAgriNet",
  description: "View and update your own profile and qualifications.",
};

export default function ProfilePage() {
  return (
    <div className="flex w-full flex-col gap-4">
      <ProfileView />
    </div>
  );
}
