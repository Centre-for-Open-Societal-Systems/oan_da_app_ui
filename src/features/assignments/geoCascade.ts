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
  /** A saved code to choose once this level's options arrive, e.g. the scope of a row being edited. */
  pending: string | null;
}

export type GeoCascade = Record<GeoField, GeoLevel>;

export type GeoAction =
  | { type: "select"; field: GeoField; code: string }
  | { type: "loaded"; field: GeoField; parent: string; rows: GeoArea[] }
  | { type: "failed"; field: GeoField; parent: string; message: string }
  | { type: "retry"; field: GeoField };

const idleLevel: GeoLevel = { parent: null, options: [], selected: null, status: "idle", error: null, attempt: 0, pending: null };
const loadingLevel = (parent: string): GeoLevel => ({ ...idleLevel, parent, status: "loading" });

export const initialGeoCascade: GeoCascade = { region: loadingLevel(GEO_ROOT), zone: idleLevel, woreda: idleLevel };

export type GeoPreset = Partial<Record<GeoField, string | null | undefined>>;

/** Starts with saved codes waiting to be chosen, level by level, as each list loads. */
export function presetGeoCascade(preset: GeoPreset): GeoCascade {
  const pending = (field: GeoField) => preset[field] || null;
  return {
    region: { ...initialGeoCascade.region, pending: pending("region") },
    zone: { ...idleLevel, pending: pending("zone") },
    woreda: { ...idleLevel, pending: pending("woreda") },
  };
}

const below = (field: GeoField) => GEO_CHAIN.slice(GEO_CHAIN.indexOf(field) + 1);

/** Chooses `selected` on `field` and opens the level under it. `keepPending` carries saved codes down the chain. */
function choose(state: GeoCascade, field: GeoField, selected: GeoArea | null, keepPending: boolean): GeoCascade {
  const next: GeoCascade = { ...state, [field]: { ...state[field], selected, pending: null } };
  const [child, ...rest] = below(field);
  const carry = (f: GeoField) => (keepPending ? state[f].pending : null);
  if (child) next[child] = { ...(selected ? loadingLevel(selected.code) : idleLevel), pending: carry(child) };
  for (const f of rest) next[f] = { ...idleLevel, pending: carry(f) };
  return next;
}

/**
 * The option a saved code points at. With no saved code on this level (an assignment stores no Zone), the one
 * option whose code starts the saved code of a lower level is taken: Master Data codes nest, e.g. ET03 › ET0304 › ET030403.
 */
function pendingChoice(state: GeoCascade, field: GeoField, rows: GeoArea[]): GeoArea | null {
  const { pending } = state[field];
  if (pending) return rows.find((r) => r.code === pending) ?? null;
  const lower = below(field).map((f) => state[f].pending).find(Boolean);
  if (!lower) return null;
  const nested = rows.filter((r) => lower.startsWith(r.code));
  return nested.length === 1 ? nested[0] : null;
}

export function geoCascadeReducer(state: GeoCascade, action: GeoAction): GeoCascade {
  const level = state[action.field];
  switch (action.type) {
    // A choice made by hand replaces any saved codes on this level and below it.
    case "select":
      return choose(state, action.field, level.options.find((option) => option.code === action.code) ?? null, false);
    // A response counts only while its level still waits for that parent: a late one for an older choice is dropped.
    case "loaded": {
      if (level.status !== "loading" || level.parent !== action.parent) return state;
      const loaded: GeoCascade = { ...state, [action.field]: { ...level, options: action.rows, status: "ready", error: null } };
      const saved = pendingChoice(state, action.field, action.rows);
      // A saved code that is not in the list is dropped, with the codes under it: the Admin chooses again.
      return saved ? choose(loaded, action.field, saved, true) : choose(loaded, action.field, null, false);
    }
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

/** Region → Zone → Woreda from Master Data: each level loads from the choice above it. `preset` pre-selects saved codes. */
export function useGeoCascade(preset?: GeoPreset) {
  const [geo, dispatch] = useReducer(geoCascadeReducer, preset, (p) => (p ? presetGeoCascade(p) : initialGeoCascade));
  useGeoLevel("region", geo.region, dispatch);
  useGeoLevel("zone", geo.zone, dispatch);
  useGeoLevel("woreda", geo.woreda, dispatch);
  return {
    geo,
    select: (field: GeoField, code: string) => dispatch({ type: "select", field, code }),
    retry: (field: GeoField) => dispatch({ type: "retry", field }),
  };
}
