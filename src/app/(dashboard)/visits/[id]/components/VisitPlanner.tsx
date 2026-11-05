"use client";

import { useEffect, useState } from "react";
import { BackLink } from "@/components/ui/BackLink";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { PlanVisitButton } from "@/features/farmers";
import { canActOnVisit, canLogOutcome, fetchVisit, LogOutcomeModal, StartVisitModal, toVisitRecord, type ApiVisitDetail, type VisitRecord } from "@/features/visits";
import { useAuthStore } from "@/store/useAuthStore";
import { PriorityList } from "./PriorityList";
import { TodaysVisits } from "./TodaysVisits";
import { WeekCalendar } from "./WeekCalendar";

type ActiveModal = { type: "start" | "outcome"; visit: VisitRecord } | null;

// The planner of one DA: the signed-in DA's own visits, or for an officer those of the DA on the opened visit. The opened
// id only picks that DA and the header action: dashboard links carry a sample id, which the API answers with a 404.
export function VisitPlanner({ visitId }: { visitId: string }) {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isDA = useAuthStore((s) => s.role === "DA");
  const ownDaId = useAuthStore((s) => s.profile?.daId ?? null);
  // undefined while loading, null when the API has no such visit for this user.
  const [detail, setDetail] = useState<ApiVisitDetail | null>();
  const [reload, setReload] = useState(0);
  const [modal, setModal] = useState<ActiveModal>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    fetchVisit(visitId)
      .then((d) => current && setDetail(d))
      .catch(() => current && setDetail(null));
    return () => {
      current = false;
    };
  }, [visitId, reload]);

  const canAct = (v: VisitRecord) => canActOnVisit(v, isDA, ownDaId);
  const opened = detail ? toVisitRecord(detail) : null;
  const daId = (isDA ? ownDaId : detail?.da_id) ?? undefined;

  const done = (message: string) => {
    setModal(null);
    setNotice(message);
    setReload((r) => r + 1);
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <BackLink href="/visits" />

      <Card className="flex flex-col gap-4 px-4 py-5 shadow-card md:flex-row md:items-center md:justify-between">
        <h1 className="text-[20px] font-semibold tracking-tight text-ink sm:text-[22px]">Visit Planner</h1>
        <div className="flex items-center gap-3">
          {opened && canLogOutcome(opened) && canAct(opened) && (
            <Button type="button" variant="outline" onClick={() => setModal({ type: "outcome", visit: opened })}>
              Log visit outcome &rarr;
            </Button>
          )}
          <PlanVisitButton />
        </div>
      </Card>

      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}

      {!hasHydrated || detail === undefined ? (
        <div className="flex justify-center py-10 text-brand-green"><Spinner className="h-6 w-6" /></div>
      ) : (
        <>
          <WeekCalendar daId={daId} reload={reload} />
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <PriorityList />
            <TodaysVisits daId={daId} reload={reload} canAct={canAct} onStart={(visit) => setModal({ type: "start", visit })} onLogOutcome={(visit) => setModal({ type: "outcome", visit })} />
          </div>
        </>
      )}

      {modal?.type === "start" && (
        <StartVisitModal
          visit={modal.visit}
          onClose={() => setModal(null)}
          onStarted={(started) => done(`Checked in for ${started.farmer_id} (${started.name}). The visit is now in progress; log the outcome when you are done.`)}
        />
      )}
      {modal?.type === "outcome" && (
        <LogOutcomeModal
          visit={modal.visit}
          onClose={() => setModal(null)}
          onSubmitted={(closed) => done(`Outcome submitted for ${closed.farmer_id} (${closed.name}). The visit is complete.`)}
        />
      )}
    </div>
  );
}
