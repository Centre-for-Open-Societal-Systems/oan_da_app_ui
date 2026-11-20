"use client";

import { useCallback, useEffect, useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { BackLink } from "@/components/ui/BackLink";
import { describeAdvisorError, listAdvisors, type Advisor } from "@/features/communication";
import { useAuthStore } from "@/store/useAuthStore";
import { AdvisorDirectory } from "./AdvisorDirectory";
import { AddAdvisorModal } from "./AddAdvisorModal";

// DAs reach the directory from My Teams and only read it; the Admin maintains it.
export function AdvisorsWorkspace() {
  const role = useAuthStore((s) => s.role);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const fetchAdvisors = useCallback(() => {
    listAdvisors()
      .then((rows) => {
        setAdvisors(rows);
        setState("ready");
      })
      .catch((err: unknown) => {
        setError(describeAdvisorError(err));
        setState("error");
      });
  }, []);
  useEffect(() => {
    fetchAdvisors();
  }, [fetchAdvisors]);
  const reload = () => {
    setState("loading");
    fetchAdvisors();
  };
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const isAdmin = role === "Admin";

  return (
    <div className="flex w-full flex-col gap-4">
      {role === "DA" && <BackLink href="/my-teams" />}
      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}
      {state === "error" && error && <Banner tone="error">{error}</Banner>}
      <AdvisorDirectory
        advisors={advisors}
        state={state}
        onRetry={reload}
        onAddAdvisor={isAdmin ? () => setAdding(true) : undefined}
      />

      {adding && (
        <AddAdvisorModal
          onClose={() => setAdding(false)}
          onAdded={(a) => {
            setAdding(false);
            fetchAdvisors();
            setNotice(`${a.name} (${a.id}) added to the advisor directory as ${a.expertise} · ${a.woreda}, ${a.region}.`);
          }}
        />
      )}
    </div>
  );
}
