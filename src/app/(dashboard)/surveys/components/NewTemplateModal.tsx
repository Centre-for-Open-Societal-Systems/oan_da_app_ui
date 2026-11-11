"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
import { Textarea } from "@/components/ui/Textarea";
import { TEMPLATE_LANGUAGES, TEMPLATE_TYPES, useTemplateCatalogStore } from "@/features/surveys";

const BLANK = "";

// P7.7: name, type, starting point and languages; questions are designed on the builder screen that follows.
export function NewTemplateModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const templates = useTemplateCatalogStore((s) => s.templates);
  const create = useTemplateCatalogStore((s) => s.create);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [startFrom, setStartFrom] = useState(BLANK);
  const [languages, setLanguages] = useState<string[]>(TEMPLATE_LANGUAGES);
  const [description, setDescription] = useState("");
  const [tried, setTried] = useState(false);

  const nameError = name.trim().length < 3 ? "Enter a template name (at least 3 characters)." : "";
  const typeError = type === "" ? "Select a survey type." : "";
  const langError = languages.length === 0 ? "Pick at least one language." : "";
  const valid = !nameError && !typeError && !langError;

  const submit = () => {
    setTried(true);
    if (!valid) return;
    // English first when picked: it holds the source text the other languages are translated from.
    const ordered = [...languages].sort((a, b) => (a === "English" ? -1 : b === "English" ? 1 : TEMPLATE_LANGUAGES.indexOf(a) - TEMPLATE_LANGUAGES.indexOf(b)));
    const id = create({ name, type, startFrom, languages: ordered, description });
    onClose();
    router.push(`/surveys/templates/${id}`);
  };

  return (
    <Modal isOpen onClose={onClose} title="New survey template" subtitle="Start from scratch or duplicate an existing template later. You'll design questions on the next screen." size="lg" bodyClassName="p-6"
      footer={
        <>
          <Button variant="outline" className="px-5 font-semibold" onClick={onClose}>Cancel</Button>
          <Button variant="brand" className="px-5" onClick={submit}>Create &amp; continue</Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <FormField label="Template name" htmlFor="nt-name" required hint={tried ? nameError : undefined} hintTone="error">
          <Input id="nt-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Farmer Satisfaction v4" autoFocus />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Survey type" htmlFor="nt-type" required hint={tried ? typeError : undefined} hintTone="error">
            <Dropdown id="nt-type" value={type} onChange={setType} options={TEMPLATE_TYPES} placeholder="Select a type…" />
          </FormField>
          <FormField label="Start from" htmlFor="nt-from">
            <Dropdown id="nt-from" value={startFrom} onChange={setStartFrom}
              options={[{ value: BLANK, label: "Blank template", description: "Consent, Farmer ID and Kebele only" }, ...templates.map((t) => ({ value: t.id, label: t.name, description: `${t.params.length} parameters · ${t.status}` }))]} />
          </FormField>
        </div>
        <FormField label="Languages to support" htmlFor="nt-langs" required hint={tried ? langError : undefined} hintTone="error">
          <MultiSelectDropdown id="nt-langs" options={TEMPLATE_LANGUAGES} selected={languages} onChange={setLanguages} placeholder="Select languages…" />
        </FormField>
        <FormField label="Description (optional)" htmlFor="nt-desc">
          <Textarea id="nt-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this template used to measure?" className="rounded-lg border-line" />
        </FormField>
      </div>
    </Modal>
  );
}
