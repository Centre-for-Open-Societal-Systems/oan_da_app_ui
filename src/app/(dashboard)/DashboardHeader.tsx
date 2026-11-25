"use client";

import { useMemo, type ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import type { SearchHit } from "@/components/layout/SearchModal";
import { listAgents } from "@/features/agents";
import { listKbGeo } from "@/features/communication";
import { areaName, loadAreaNames } from "@/features/geo";
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

/**
 * Kebeles by name from the geo Master Data (get_master_data ignores `search`, so the lists are read and filtered here):
 * those of the user's own Woredas (DA, Supervisor), else of the Woredas in their Zone (Executive). Admin has no area of
 * their own, and every Kebele of the country is too many to read, so the section stays empty. `href` is where a picked
 * Kebele opens.
 */
function kebeleSearch(woredas: string[], zone: string | null, href: string) {
  return async (searchText: string): Promise<SearchHit[]> => {
    const q = searchText.trim().toLowerCase();
    const inScope = woredas.length > 0 ? woredas : zone ? (await listKbGeo("woreda", zone)).map((w) => w.code) : [];
    if (!q || inScope.length === 0) return [];
    const lists = await Promise.allSettled(inScope.map((w) => listKbGeo("kebele", w)));
    const kebeles = lists.flatMap((l) => (l.status === "fulfilled" ? l.value : [])).filter((k) => k.name.toLowerCase().includes(q)).slice(0, RESULTS);
    await loadAreaNames(kebeles.map((k) => k.parent));
    return kebeles.map((k) => ({ id: k.code, name: k.name, details: `${areaName(k.parent)} Woreda`, href }));
  };
}

// Components never import features, and the server layout cannot pass a function, so the header gets its searches here.
export function DashboardHeader({ notifications }: { notifications: ReactNode }) {
  const role = useAuthStore((s) => s.role);
  const scopeWoredas = useAuthStore((s) => s.profile?.scope?.woredas);
  const agentWoreda = useAuthStore((s) => s.profile?.agent?.woreda);
  const ownZone = useAuthStore((s) => s.profile?.location?.zone?.id ?? null);
  const woredaKey = [...(scopeWoredas ?? []), ...(typeof agentWoreda === "string" && agentWoreda ? [agentWoreda] : [])].join(",");
  // There is no Kebele page: a Supervisor lands on Agent Assignment (Kebele coverage), everyone else on their farmers.
  const kebeleHref = role === "Supervisor" ? "/assignments" : "/farmers";
  const searchKebeles = useMemo(() => kebeleSearch([...new Set(woredaKey.split(",").filter(Boolean))], ownZone, kebeleHref), [woredaKey, ownZone, kebeleHref]);
  // A DA has no access to the agents registry (My Teams instead), so their search skips that section.
  const agentSearch = role === "DA" ? undefined : searchAgents;
  return <Header notifications={notifications} searchFarmers={searchFarmers} searchAgents={agentSearch} searchKebeles={searchKebeles} />;
}
