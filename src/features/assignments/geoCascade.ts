"use client";

import { useEffect, useReducer, type Dispatch } from "react";
import { listGeo, type GeoArea, type GeoField } from "./api";

/** The country every Region hangs under in Master Data. */
export const GEO_ROOT = "ET";

const GEO_CHAIN: GeoField[] = ["region", "zone", "woreda"];

export interface GeoLevel {
  /** The code this level's options belong to; null until the level above has a choice. */
  parent: string | null;
  options: GeoArea[];
  selected: GeoArea | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  /** Goes up on every retry, so the same parent loads again. */
  attempt: number;
}

export type GeoCascade = Record<GeoField, GeoLevel>;

export type GeoAction =
  | { type: "select"; field: GeoField; code: string }
  | { type: "loaded"; field: GeoField; parent: string; rows: GeoArea[] }
  | { type: "failed"; field: GeoField; parent: string; message: string }
  | { type: "retry"; field: GeoField };

const idleLevel: GeoLevel = { parent: null, options: [], selected: null, status: "idle", error: null, attempt: 0 };
const loadingLevel = (parent: string): GeoLevel => ({ ...idleLevel, parent, status: "loading" });

export const initialGeoCascade: GeoCascade = { region: loadingLevel(GEO_ROOT), zone: idleLevel, woreda: idleLevel };

export function geoCascadeReducer(state: GeoCascade, action: GeoAction): GeoCascade {
  const level = state[action.field];
  switch (action.type) {
    case "select": {
      const selected = level.options.find((option) => option.code === action.code) ?? null;
      const next: GeoCascade = { ...state, [action.field]: { ...level, selected } };
      const [child, ...below] = GEO_CHAIN.slice(GEO_CHAIN.indexOf(action.field) + 1);
      if (child) next[child] = selected ? loadingLevel(selected.code) : idleLevel;
      for (const field of below) next[field] = idleLevel;
      return next;
    }
    // A response counts only while its level still waits for that parent: a late one for an older choice is dropped.
    case "loaded":
      if (level.status !== "loading" || level.parent !== action.parent) return state;
      return { ...state, [action.field]: { ...level, options: action.rows, status: "ready", error: null } };
    case "failed":
      if (level.status !== "loading" || level.parent !== action.parent) return state;
      return { ...state, [action.field]: { ...level, status: "error", error: action.message } };
    case "retry":
      if (level.status !== "error") return state;
      return { ...state, [action.field]: { ...level, status: "loading", error: null, attempt: level.attempt + 1 } };
  }
}

function useGeoLevel(field: GeoField, { parent, attempt }: GeoLevel, dispatch: Dispatch<GeoAction>) {
  useEffect(() => {
    if (parent === null) return;
    listGeo({ fieldName: field, parent })
      .then((rows) => dispatch({ type: "loaded", field, parent, rows }))
      .catch((err: unknown) => dispatch({ type: "failed", field, parent, message: err instanceof Error ? err.message : `Could not load the ${field} list.` }));
  }, [field, parent, attempt, dispatch]);
}

/** Region → Zone → Woreda from Master Data: each level loads from the choice above it. */
export function useGeoCascade() {
  const [geo, dispatch] = useReducer(geoCascadeReducer, initialGeoCascade);
  useGeoLevel("region", geo.region, dispatch);
  useGeoLevel("zone", geo.zone, dispatch);
  useGeoLevel("woreda", geo.woreda, dispatch);
  return {
    geo,
    select: (field: GeoField, code: string) => dispatch({ type: "select", field, code }),
    retry: (field: GeoField) => dispatch({ type: "retry", field }),
  };
}
