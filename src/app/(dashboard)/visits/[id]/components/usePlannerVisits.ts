import { useEffect, useState } from "react";
import { listVisits, type ApiVisit, type VisitQuery } from "@/features/visits";

// One GET /visits for the planner, read again when the query or `reload` changes. The old rows stay until the new ones land.
export function usePlannerVisits(query: VisitQuery, reload: number) {
  const key = JSON.stringify(query);
  const [state, setState] = useState<{ items: ApiVisit[]; error: string | null } | null>(null);

  useEffect(() => {
    let current = true;
    listVisits(JSON.parse(key) as VisitQuery)
      .then(({ items }) => current && setState({ items, error: null }))
      .catch((err: unknown) => current && setState({ items: [], error: err instanceof Error ? err.message : "Could not load visits." }));
    return () => {
      current = false;
    };
  }, [key, reload]);

  return { items: state?.items ?? [], error: state?.error ?? null, loading: state === null };
}
