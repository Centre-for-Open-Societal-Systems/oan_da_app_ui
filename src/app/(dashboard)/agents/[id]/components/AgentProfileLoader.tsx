"use client";

import { useEffect, useState } from "react";
import { BackLink } from "@/components/ui/BackLink";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoader } from "@/components/ui/PageLoader";
import { apiAgentToAgent, describeAgentError, fetchAgentRecord, type Agent } from "@/features/agents";
import { AgentProfile } from "./AgentProfile";

type State = { agent: Agent } | { error: string } | null;

// GET /da-services/agents/{da_id}: one DA read live from the DA Registry, 403 outside the caller's scope.
export function AgentProfileLoader({ daId }: { daId: string }) {
  const [state, setState] = useState<State>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchAgentRecord(daId)
      .then((record) => !cancelled && setState({ agent: apiAgentToAgent(record) }))
      .catch((err: unknown) => !cancelled && setState({ error: describeAgentError(err) }));
    return () => {
      cancelled = true;
    };
  }, [daId, attempt]);

  if (state === null) return <PageLoader label="Loading agent from the DA Registry…" />;

  if ("error" in state) {
    return (
      <div className="flex w-full flex-col gap-4">
        <BackLink href="/agents" label="Back to Agents" />
        <Card className="shadow-card">
          <EmptyState tone="error" title={`${daId} could not be loaded`} hint={state.error} actionLabel="Try again" onAction={() => setAttempt((n) => n + 1)} />
        </Card>
      </div>
    );
  }

  return <AgentProfile agent={state.agent} />;
}
