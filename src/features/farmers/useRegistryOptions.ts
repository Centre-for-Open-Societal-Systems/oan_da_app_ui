"use client";

import { useEffect, useState } from "react";
import { fetchFieldOptions, fetchPlaces, type FieldOptions, type Place, type PlaceLevel } from "./registryApi";

// Client hooks for the Register Farmer wizard. They live in a "use client" module because a server component cannot run
// effects.

let fieldOptionsOnce: Promise<FieldOptions> | null = null;

/** The registry's code lists (GET /registries/farmer/field-options), read once per page. */
export function useFieldOptions() {
  const [state, setState] = useState<{ options: FieldOptions | null; error: unknown }>({ options: null, error: null });
  useEffect(() => {
    let live = true;
    fieldOptionsOnce ??= fetchFieldOptions().catch((err) => {
      fieldOptionsOnce = null;
      throw err;
    });
    fieldOptionsOnce.then((options) => live && setState({ options, error: null })).catch((error: unknown) => live && setState({ options: null, error }));
    return () => {
      live = false;
    };
  }, []);
  return { ...state, loading: state.options === null && state.error === null };
}

const placesCache = new Map<string, Promise<Place[]>>();

/** The places of one level under `parent` (GET /registries/farmer/places). Nothing is asked below a level not yet chosen. */
export function usePlaces(level: PlaceLevel, parent: string | undefined) {
  const needsParent = level !== "region";
  const key = `${level}:${parent ?? ""}`;
  const [state, setState] = useState<{ key: string; places: Place[] | null; error: unknown }>({ key: "", places: null, error: null });

  useEffect(() => {
    if (needsParent && !parent) return;
    let live = true;
    let found = placesCache.get(key);
    if (!found) {
      found = fetchPlaces(level, parent).catch((err) => {
        placesCache.delete(key);
        throw err;
      });
      placesCache.set(key, found);
    }
    found.then((places) => live && setState({ key, places, error: null })).catch((error: unknown) => live && setState({ key, places: null, error }));
    return () => {
      live = false;
    };
  }, [key, level, parent, needsParent]);

  const current = state.key === key;
  return {
    places: current ? state.places : null,
    error: current ? state.error : null,
    loading: (!needsParent || !!parent) && !current,
  };
}
