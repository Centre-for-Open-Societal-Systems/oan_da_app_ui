"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiIntakeForm } from "./cropSownApi";
import { apiSectionIds, loadIntakeForm, optionLabel, STAGE_PLANS } from "./cropSownSubmit";

/**
 * The live field list of the registry form behind a tab (GET /crop-sown/intake-form): the choices of its catalog
 * fields and which fields are required. Until the call answers, or if it fails, both stay undefined and the form
 * keeps its built-in options.
 */
export function useIntakeFields(tab: string) {
  const form = STAGE_PLANS[tab]?.form;
  const [loaded, setLoaded] = useState<{ form: string; intake: ApiIntakeForm } | null>(null);

  useEffect(() => {
    if (!form) return;
    let live = true;
    loadIntakeForm(form).then((intake) => live && intake && setLoaded({ form, intake }));
    return () => {
      live = false;
    };
  }, [form]);

  const fieldOf = useCallback(
    (uiSectionId: string, key: string) => {
      if (!loaded || loaded.form !== form) return undefined;
      const ids = apiSectionIds(tab, uiSectionId);
      return loaded.intake.sections.filter((s) => ids.includes(s.section_id)).flatMap((s) => s.fields).find((f) => f.field_name === key);
    },
    [loaded, form, tab],
  );

  return {
    /** Display labels of the registry's choices for a form field, or undefined when it has none. */
    optionsOf: (uiSectionId: string, key: string): string[] | undefined => {
      const options = fieldOf(uiSectionId, key)?.options;
      // A blank or repeated choice would clash with the placeholder (and with itself) as a select option.
      const labels = [...new Set((options ?? []).map((o) => optionLabel(o).trim()).filter(Boolean))];
      return labels.length ? labels : undefined;
    },
    /** Whether the registry marks the field required, or undefined when the registry does not list it. */
    requiredOf: (uiSectionId: string, key: string): boolean | undefined => fieldOf(uiSectionId, key)?.required,
  };
}
