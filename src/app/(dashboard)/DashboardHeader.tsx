"use client";

import { useMemo, type ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import type { SearchHit } from "@/components/layout/SearchModal";
import { listAgents } from "@/features/agents";
import { listAreas, listKebeles, loadScopeAreas, type AdminArea } from "@/features/assignments";
import { apiFarmerToFarmer, listFarmers } from "@/features/farmers";
import { useAuthStore } from "@/store/useAuthStore";

const RESULTS = 5;

/** Global search's farmers from GET /farmers, in the caller's scope. */
async function searchFarmers(searchText: string): Promise<SearchHit[]> {
  const { items } = await listFarmers({ searchText, pageSize: RESULTS });
  return items.map(apiFarmerToFarmer).map((f) => ({ id: f.id, name: f.name, details: `${f.kebele}, ${f.woreda}`, href: `/farmers/${f.id}` }));
}

/** Global search's DAs from GET /agents, scoped by the backend (Supervisor: Woreda, Executive: Region, Admin: all). */
async function searchAgents(searchText: string): Promise<SearchHit[]> {
  const { agents } = await listAgents({ search: searchText, limit: RESULTS });
  return agents.map((a) => ({
    id: a.da_id,
    name: a.full_name || a.da_id,
    details: [a.da_id, a.kebele_name ?? a.kebele, a.woreda_name ?? a.woreda].filter(Boolean).join(" · "),
    href: `/agents/${encodeURIComponent(a.da_id)}`,
  }));
}

/** Woreda code → English name, from the area master; empty when it cannot be read. */
const woredaNames = () =>
  loadScopeAreas()
    .then(({ woredas }) => Object.fromEntries(woredas.map((w) => [w.code, w.name_en])) as Record<string, string>)
    .catch(() => ({}) as Record<string, string>);

/**
 * Kebeles by name from the area master: those of the user's own Woredas when they have any (DA, Supervisor),
 * otherwise every Kebele (Admin, Executive). `href` is where a picked Kebele opens.
 */
function kebeleSearch(woredas: string[], href: string) {
  return async (searchText: string): Promise<SearchHit[]> => {
    const q = searchText.toLowerCase();
    const [kebeles, names] = await Promise.all([
      woredas.length > 0
        ? Promise.all(woredas.map((w) => listKebeles(w))).then((lists) => lists.flat().filter((k) => k.name_en.toLowerCase().includes(q)))
        : listAreas({ level: "Kebele", q: searchText }),
      woredaNames(),
    ]);
    return kebeles.slice(0, RESULTS).map((k: AdminArea) => {
      const woreda = k.parent_area ? (names[k.parent_area] ?? k.parent_area) : null;
      return { id: k.code, name: k.name_en, details: woreda ? `${woreda} Woreda` : k.code, href };
    });
  };
}

// Components never import features, and the server layout cannot pass a function, so the header gets its searches here.
export function DashboardHeader({ notifications }: { notifications: ReactNode }) {
  const role = useAuthStore((s) => s.role);
  const scopeWoredas = useAuthStore((s) => s.profile?.scope.woredas);
  const agentWoreda = useAuthStore((s) => s.profile?.agent?.woreda);
  const woredaKey = [...(scopeWoredas ?? []), ...(typeof agentWoreda === "string" && agentWoreda ? [agentWoreda] : [])].join(",");
  // There is no Kebele page: a Supervisor lands on Agent Assignment (Kebele coverage), everyone else on their farmers.
  const kebeleHref = role === "Supervisor" ? "/assignments" : "/farmers";
  const searchKebeles = useMemo(() => kebeleSearch([...new Set(woredaKey.split(",").filter(Boolean))], kebeleHref), [woredaKey, kebeleHref]);
  // A DA has no access to the agents registry (My Teams instead), so their search skips that section.
  const agentSearch = role === "DA" ? undefined : searchAgents;
  return <Header notifications={notifications} searchFarmers={searchFarmers} searchAgents={agentSearch} searchKebeles={searchKebeles} />;
}
