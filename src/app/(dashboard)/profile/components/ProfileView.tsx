"use client";

import { useEffect, useState } from "react";
import { BackLink } from "@/components/ui/BackLink";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoader } from "@/components/ui/PageLoader";
import { AGENT_PROFILE } from "@/features/farmers";
import { cancelChangeRequest, changedFields, describeProfileError, fetchMyProfile, submitChangeRequest, type ChangeRequest, type DaProfile, type MyProfile, type ProfileChanges } from "@/features/profile";
import { useAreaNames } from "@/features/geo";
import { ROLE_LABELS } from "@/lib/rbac";
import { useAuthStore } from "@/store/useAuthStore";
import { AgentHeader, type AgentHeaderInfo } from "./AgentHeader";
import { ChangeRequestsSection } from "./ChangeRequestsSection";
import { DaDemographicsSection } from "./DaDemographicsSection";
import { DependentsSection } from "./DependentsSection";
import { QualificationsSection } from "./QualificationsSection";

/** The header line from the registry profile (GET /profile/my_profile). */
function headerFromProfile(p: DaProfile, fallbackRole: string): AgentHeaderInfo {
  const kebele = p.kebele_name || p.kebele;
  const place = [kebele ? `${kebele} kebele` : null, p.woreda_name || p.woreda, p.region_name || p.region].filter(Boolean);
  return {
    name: p.full_name || p.da_id,
    role: p.position || fallbackRole,
    agentId: p.da_id,
    location: place.length ? place.join(", ") : "—",
    email: p.email || "—",
    phone: p.mobile || "—",
    status: p.active_status || "Active",
  };
}

/** The profile with each missing area name filled from Master Data, and `kebele` cleared when it is no kebele. */
function withAreaNames(p: DaProfile, kebeleCode: string | null, names: Record<string, string>): DaProfile {
  const nameOf = (code?: string | null) => (code ? names[code] : undefined) ?? null;
  return {
    ...p,
    region_name: p.region_name || nameOf(p.region),
    zone_name: p.zone_name || nameOf(p.zone),
    woreda_name: p.woreda_name || nameOf(p.woreda),
    kebele: kebeleCode,
    kebele_name: kebeleCode ? p.kebele_name || nameOf(kebeleCode) : null,
  };
}

const REQUEST_TONE: Record<string, "warning" | "info" | "success"> = { Pending: "warning", Approved: "info", Applied: "info", "Changes requested": "warning" };

// The profile is read-only until the user clicks "Edit profile", which opens the demographics form; edits go to
// the Woreda supervisor as a change request (POST /profile/change-requests). Every role reads its own DA Registry
// profile (GET /profile/my_profile); the backend finds the record from the signed-in user.
export function ProfileView() {
  const role = useAuthStore((s) => s.role);
  const authUser = useAuthStore((s) => s.user);
  const authProfile = useAuthStore((s) => s.profile);
  const roleLabel = role === "DA" ? "Development Agent" : (authProfile?.roleLabel ?? ROLE_LABELS[role]);
  const [editing, setEditing] = useState(false);
  const [loaded, setLoaded] = useState<{ data: MyProfile | null; error: string | null } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMyProfile()
      .then((data) => !cancelled && setLoaded({ data, error: null }))
      .catch((err: unknown) => !cancelled && setLoaded({ data: null, error: describeProfileError(err) }));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = () => setAttempt((n) => n + 1);
  const startEditing = () => setEditing(true);

  // One request per section, idempotent on client_op_id: a retry after a network error does not create a second one.
  const submitChanges = async (changes: ProfileChanges, labels: string[]) => {
    // Own record: no da_id (the backend takes it from the token; da_id is only for a Supervisor asking for a DA).
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

  const raw = loaded?.data ?? null;
  // The registry sometimes sends an area code without its name (e.g. kebele_name null): the name is read from geo
  // Master Data. A user posted at Woreda level (a Supervisor) has the woreda code in `kebele` too: that is no kebele,
  // so it is dropped and the Kebele line is not shown.
  const p = raw?.profile;
  const kebeleCode = p?.kebele && p.kebele !== p.woreda ? p.kebele : null;
  const areaNames = useAreaNames([
    p && !p.region_name ? p.region : null,
    p && !p.zone_name ? p.zone : null,
    p && !p.woreda_name ? p.woreda : null,
    p && !p.kebele_name ? kebeleCode : null,
  ]);
  const my = raw ? { ...raw, profile: withAreaNames(raw.profile, kebeleCode, areaNames) } : null;
  // A user whose registry profile could not be read still sees their own identity from /me, never the sample.
  const headerInfo: AgentHeaderInfo = my
    ? headerFromProfile(my.profile, roleLabel)
    : authUser
      ? {
          name: authUser.name ?? "—",
          role: roleLabel,
          agentId: authProfile?.daId ?? authUser.id ?? "—",
          location: authProfile?.scopeLabel ?? "—",
          email: authUser.email ?? "—",
          phone: "—",
          status: "Active",
        }
      : AGENT_PROFILE;
  const openRequests = my?.pending_requests ?? [];

  if (loaded === null) return <PageLoader label="Loading your profile from the DA Registry…" />;

  return (
    <div className="flex w-full flex-col gap-5 sm:gap-6">
      <BackLink href="/dashboard" />

      <AgentHeader info={headerInfo} pending={openRequests.some((r) => r.status === "Pending")} />

      {loaded.error && (
        <EmptyState tone="error" title="Your profile could not be loaded" hint={loaded.error} actionLabel="Try again" onAction={reload} className="rounded-xl border border-line bg-white shadow-card" />
      )}

      {notice && (
        <Banner tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.text}
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

      {my && (
        <>
          <DaDemographicsSection editing={editing} profile={my.profile} onEdit={role === "Executive" ? undefined : startEditing} onCancel={() => setEditing(false)} onSubmit={submitChanges} />
          <ChangeRequestsSection refreshKey={attempt} daId={my.profile.da_id || undefined} cancelling={cancelling} onCancel={cancelRequest} />
          <DependentsSection members={my.profile.family_members ?? []} />
          <QualificationsSection qualifications={my.profile.qualifications ?? []} />
        </>
      )}
      {/* Leave & absence is a Part 2 feature (sample data, no API yet): hidden until it is built. */}
    </div>
  );
}
