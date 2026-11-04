"use client";

import { useEffect, useState } from "react";
import { BackLink } from "@/components/ui/BackLink";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoader } from "@/components/ui/PageLoader";
import { AGENT_PROFILE } from "@/features/farmers";
import { cancelChangeRequest, changedFields, describeProfileError, fetchMyProfile, submitChangeRequest, type ChangeRequest, type DaProfile, type MyProfile, type ProfileChanges } from "@/features/profile";
import { useAuthStore } from "@/store/useAuthStore";
import { AgentHeader, type AgentHeaderInfo } from "./AgentHeader";
import { AgentStats } from "./AgentStats";
import { ChangeRequestsSection } from "./ChangeRequestsSection";
import { DaDemographicsSection } from "./DaDemographicsSection";
import { DemographicsSection } from "./DemographicsSection";
import { DependentsSection } from "./DependentsSection";
import { QualificationsSection } from "./QualificationsSection";
import { LeaveSection } from "./LeaveSection";

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

/** The header line from the registry profile (GET /profile/me). */
function headerFromProfile(p: DaProfile): AgentHeaderInfo {
  const place = [p.kebele_name ?? p.kebele, p.woreda_name ?? p.woreda, p.region_name ?? p.region].filter(Boolean);
  return {
    name: p.full_name || p.da_id,
    role: p.position || "Development Agent",
    agentId: p.da_id,
    location: place.length ? `${place[0]} kebele, ${place.slice(1).join(", ")}`.replace(/, $/, "") : "—",
    email: p.email || "—",
    phone: p.mobile || "—",
    joinedOn: formatDate(p.joined_at),
    status: p.active_status || "Active",
  };
}

const REQUEST_TONE: Record<string, "warning" | "info" | "success"> = { Pending: "warning", Approved: "info", Applied: "info", "Changes requested": "warning" };

// The profile is read-only until the agent clicks "Edit profile", which swaps the page for the demographics form;
// edits go to the Woreda supervisor as a change request (POST /profile/change-requests). For a Development Agent
// the page reads the DA Registry profile (GET /profile/me); other roles keep the sample profile.
export function ProfileView() {
  const role = useAuthStore((s) => s.role);
  const authUser = useAuthStore((s) => s.user);
  const authProfile = useAuthStore((s) => s.profile);
  const isDa = role === "DA";
  const [editing, setEditing] = useState(false);
  // Non-DA roles: the labels of the fields a sample edit changed.
  const [pending, setPending] = useState<string[] | null>(null);
  const [loaded, setLoaded] = useState<{ data: MyProfile | null; error: string | null } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (!isDa) return;
    let cancelled = false;
    fetchMyProfile()
      .then((data) => !cancelled && setLoaded({ data, error: null }))
      .catch((err: unknown) => !cancelled && setLoaded({ data: null, error: describeProfileError(err) }));
    return () => {
      cancelled = true;
    };
  }, [isDa, attempt]);

  const reload = () => setAttempt((n) => n + 1);
  const startEditing = () => {
    setEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // One request per section, idempotent on client_op_id: a retry after a network error does not create a second one.
  const submitDaChanges = async (changes: ProfileChanges, labels: string[]) => {
    const created = await submitChangeRequest(changes, "Updated from My profile", crypto.randomUUID());
    setEditing(false);
    setNotice({ tone: "success", text: `Your update to ${labels.join(", ").toLowerCase()} was sent to your Woreda supervisor (request ${created.name}). Your profile shows the current values until it is approved.` });
    reload();
  };

  const cancelRequest = async (request: ChangeRequest) => {
    setCancelling(request.name);
    try {
      await cancelChangeRequest(request.name);
      setNotice({ tone: "success", text: `Request ${request.name} cancelled.` });
      reload();
    } catch (err) {
      setNotice({ tone: "error", text: describeProfileError(err) });
    } finally {
      setCancelling(null);
    }
  };

  const my = loaded?.data ?? null;
  // A DA whose registry profile could not be read still sees their own identity from /me, never the sample.
  const headerInfo: AgentHeaderInfo = my
    ? headerFromProfile(my.profile)
    : isDa
      ? { name: authUser?.name ?? "—", role: "Development Agent", agentId: authProfile?.daId ?? "—", location: authProfile?.scopeLabel ?? "—", email: authUser?.email ?? "—", phone: "—", joinedOn: "—", status: "Active" }
      : AGENT_PROFILE;
  const openRequests = my?.pending_requests ?? [];

  if (isDa && loaded === null) return <PageLoader label="Loading your profile from the DA Registry…" />;

  if (editing) {
    return (
      <>
        <BackLink onClick={() => setEditing(false)} />
        {isDa && my ? (
          <DaDemographicsSection editing profile={my.profile} editableFields={my.editable_fields} onCancel={() => setEditing(false)} onSubmit={submitDaChanges} />
        ) : (
          <DemographicsSection
            editing
            onCancel={() => setEditing(false)}
            onSubmit={(changed) => {
              setPending(changed);
              setEditing(false);
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <BackLink href="/dashboard" />

      <AgentHeader info={headerInfo} pending={!!pending || openRequests.some((r) => r.status === "Pending")} />

      {isDa && loaded?.error && (
        <EmptyState tone="error" title="Your profile could not be loaded" hint={loaded.error} actionLabel="Try again" onAction={reload} className="rounded-xl border border-line bg-white shadow-card" />
      )}

      {notice && (
        <Banner tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.text}
        </Banner>
      )}

      {pending && (
        <Banner tone="success" title="Change submitted for approval" onDismiss={() => setPending(null)}>
          Your update to {pending.join(", ").toLowerCase()} was sent to your Woreda supervisor. Your profile shows the current values until it is approved.
        </Banner>
      )}

      {openRequests.map((r) => (
        <Banner key={r.name} tone={REQUEST_TONE[String(r.status)] ?? "info"} title={`${r.section ?? "Profile"} change · ${r.status}${r.registry_approval ? ` · registry ${String(r.registry_approval).toLowerCase()}` : ""}`}>
          <span className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {changedFields(r).join(", ") || "Requested change"} · request {r.name}
              {r.status === "Pending" ? ", waiting for your Woreda supervisor." : r.status === "Applied" ? ", sent to the DA Registry." : "."}
            </span>
            {r.status === "Pending" && (
              <Button type="button" variant="outline" size="sm" className="w-fit" disabled={cancelling === r.name} onClick={() => cancelRequest(r)}>
                {cancelling === r.name ? "Cancelling…" : "Cancel request"}
              </Button>
            )}
          </span>
        </Banner>
      ))}

      <AgentStats joinedAt={isDa ? (my?.profile.joined_at ?? null) : undefined} kebele={isDa ? (my ? (my.profile.kebele_name ?? my.profile.kebele ?? null) : null) : undefined} />
      {isDa ? (
        <>
          {my && <DaDemographicsSection editing={false} profile={my.profile} editableFields={my.editable_fields} onEdit={startEditing} onCancel={() => setEditing(false)} onSubmit={submitDaChanges} />}
          <ChangeRequestsSection refreshKey={attempt} cancelling={cancelling} onCancel={cancelRequest} />
        </>
      ) : (
        <DemographicsSection editing={false} onEdit={startEditing} onCancel={() => setEditing(false)} onSubmit={() => {}} />
      )}
      <DependentsSection />
      <QualificationsSection educationTier={my?.profile.education_tier ?? undefined} specialisation={my?.profile.specialisation ?? undefined} />
      <LeaveSection />
    </>
  );
}
