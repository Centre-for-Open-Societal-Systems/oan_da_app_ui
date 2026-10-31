"use client";

import { useEffect, useState } from "react";
import { fetchFieldOptions, type FieldOptions } from "./registryApi";

// Kept apart from registryApi so server components can import the farmers feature without pulling in React hooks.

/** The registry's dropdown options, with loading and error state for a form. */
export function useFieldOptions(): { options: FieldOptions; loading: boolean; error: string | null } {
  const [state, setState] = useState<{ options: FieldOptions; loading: boolean; error: string | null }>({ options: {}, loading: true, error: null });
  useEffect(() => {
    let current = true;
    fetchFieldOptions()
      .then((options) => current && setState({ options, loading: false, error: null }))
      .catch((err: unknown) => current && setState({ options: {}, loading: false, error: err instanceof Error ? err.message : "Could not load the registry options." }));
    return () => {
      current = false;
    };
  }, []);
  return state;
}
