"use client";

import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { apiFarmerToFarmer, listFarmers } from "@/features/farmers";

const FARMER_RESULTS = 5;

/** Global search's farmers from GET /farmers, in the caller's scope. */
async function searchFarmers(searchText: string) {
  const { items } = await listFarmers({ searchText, pageSize: FARMER_RESULTS });
  return items.map(apiFarmerToFarmer).map((f) => ({ id: f.id, name: f.name, details: `${f.kebele}, ${f.woreda}` }));
}

// Components never import features, and the server layout cannot pass a function, so the header gets its farmer search here.
export function DashboardHeader({ notifications }: { notifications: ReactNode }) {
  return <Header notifications={notifications} searchFarmers={searchFarmers} />;
}
