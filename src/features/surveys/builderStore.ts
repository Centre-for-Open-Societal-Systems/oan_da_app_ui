import { create } from "zustand";
import { SEED_TEMPLATES, STANDARD_PARAMS, bumpVersionName, type SurveyTemplate, type TemplateParam } from "./builder";

export interface NewTemplateInput {
  name: string;
  type: string;
  /** Template id to copy parameters from, or "" for a blank template. */
  startFrom: string;
  languages: string[];
  description: string;
}

interface TemplateCatalogState {
  templates: SurveyTemplate[];
  /** Unsaved edits per template, shown under "View changes" after a save. */
  changes: Record<string, string[]>;
  lastSavedChanges: Record<string, string[]>;
  create: (input: NewTemplateInput) => string;
  duplicate: (id: string) => string;
  /** Editing an Active / Archived template starts a new draft version; drafts are edited in place. */
  editableVersionOf: (id: string) => string;
  update: (id: string, patch: Partial<SurveyTemplate>, change?: string) => void;
  addParam: (id: string, param: TemplateParam, index: number) => void;
  moveParam: (id: string, from: number, to: number) => void;
  saveDraft: (id: string) => void;
}

let serial = 0;
const newId = (name: string) => `tpl-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}${serial++}`;

// In memory only: the catalog resets on reload until the survey template API lands.
export const useTemplateCatalogStore = create<TemplateCatalogState>()((set, get) => {
  const insert = (t: SurveyTemplate) => set((s) => ({ templates: [t, ...s.templates] }));
  const track = (s: TemplateCatalogState, id: string, change?: string) => (change ? { ...s.changes, [id]: [...(s.changes[id] ?? []), change] } : s.changes);

  return {
    templates: SEED_TEMPLATES,
    changes: {},
    lastSavedChanges: {},

    create: (input) => {
      const source = get().templates.find((t) => t.id === input.startFrom);
      const t: SurveyTemplate = {
        id: newId(input.name),
        name: input.name.trim(),
        description: input.description.trim() || `${input.type} survey`,
        type: input.type,
        status: "Draft",
        version: 1,
        // The first language holds the source text, so it counts as translated.
        languages: input.languages.map((name, i) => ({ name, translated: i === 0 })),
        params: (source?.params ?? STANDARD_PARAMS).map((q) => ({ ...q })),
        approval: "none",
        savedAt: Date.now(),
        beingCreated: true,
      };
      insert(t);
      return t.id;
    },

    duplicate: (id) => {
      const src = get().templates.find((t) => t.id === id)!;
      const t: SurveyTemplate = { ...src, id: newId(src.name), name: `${src.name} (copy)`, status: "Draft", approval: "none", savedAt: Date.now(), beingCreated: false, params: src.params.map((q) => ({ ...q })) };
      insert(t);
      return t.id;
    },

    editableVersionOf: (id) => {
      const src = get().templates.find((t) => t.id === id)!;
      if (src.status === "Draft") return src.id;
      const version = src.version + 1;
      const t: SurveyTemplate = { ...src, id: newId(src.name), name: bumpVersionName(src.name, version), version, status: "Draft", approval: "none", savedAt: Date.now(), beingCreated: true, params: src.params.map((q) => ({ ...q })) };
      insert(t);
      return t.id;
    },

    update: (id, patch, change) =>
      set((s) => ({ templates: s.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)), changes: track(s, id, change) })),

    addParam: (id, param, index) =>
      set((s) => ({
        templates: s.templates.map((t) => (t.id === id ? { ...t, params: [...t.params.slice(0, index), param, ...t.params.slice(index)] } : t)),
        changes: track(s, id, `Added parameter “${param.title}” at #${index + 1}`),
      })),

    moveParam: (id, from, to) =>
      set((s) => ({
        templates: s.templates.map((t) => {
          if (t.id !== id || from === to) return t;
          const params = [...t.params];
          const [moved] = params.splice(from, 1);
          params.splice(to, 0, moved);
          return { ...t, params };
        }),
        changes: track(s, id, `Moved parameter from #${from + 1} to #${to + 1}`),
      })),

    saveDraft: (id) =>
      set((s) => ({
        templates: s.templates.map((t) => (t.id === id ? { ...t, savedAt: Date.now() } : t)),
        lastSavedChanges: { ...s.lastSavedChanges, [id]: s.changes[id] ?? [] },
        changes: { ...s.changes, [id]: [] },
      })),
  };
});
