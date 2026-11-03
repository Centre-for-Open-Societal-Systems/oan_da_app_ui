"use client";

import { useState } from "react";
import { BackLink } from "@/components/ui/BackLink";
import { Banner } from "@/components/ui/Banner";
import { AgentHeader } from "./AgentHeader";
import { AgentStats } from "./AgentStats";
import { useAuthStore } from "@/store/useAuthStore";
import { DaDemographicsSection } from "./DaDemographicsSection";
import { DemographicsSection } from "./DemographicsSection";
import { DependentsSection } from "./DependentsSection";
import { QualificationsSection } from "./QualificationsSection";
import { LeaveSection } from "./LeaveSection";

// The profile is read-only until the agent clicks "Edit profile", which swaps the page for the demographics form;
// edits are sent to the Woreda supervisor for approval.
export function ProfileView() {
  const role = useAuthStore((s) => s.role);
  // A DA has their own set of demographic fields.
  const Demographics = role === "DA" ? DaDemographicsSection : DemographicsSection;
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<string[] | null>(null);

  const startEditing = () => {
    setEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (editing) {
    return (
      <>
        <BackLink onClick={() => setEditing(false)} />
        <Demographics
          editing
          onCancel={() => setEditing(false)}
          onSubmit={(changed) => {
            setPending(changed);
            setEditing(false);
          }}
        />
      </>
    );
  }

  return (
    <>
      <BackLink href="/dashboard" />

      <AgentHeader pending={!!pending} />

      {pending && (
        <Banner tone="success" title="Change submitted for approval" onDismiss={() => setPending(null)}>
          Your update to {pending.join(", ").toLowerCase()} was sent to your Woreda supervisor. Your profile shows the current values until it is approved.
        </Banner>
      )}

      <AgentStats />
      <Demographics editing={false} onEdit={startEditing} onCancel={() => setEditing(false)} onSubmit={() => {}} />
      <DependentsSection />
      <QualificationsSection />
      <LeaveSection />
    </>
  );
}
