"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { DEPARTMENT_TYPES, type Department, type DepartmentType } from "@/features/superadmin";

export type DepartmentFormValues = Omit<Department, "id">;

interface DepartmentFormModalProps {
  mode: "add" | "edit";
  initial?: Department;
  /** Next free code, shown (read-only) on a new department. */
  suggestedCode: string;
  onClose: () => void;
  onSave: (values: DepartmentFormValues) => void;
}

type Errors = Partial<Record<"name" | "type", string>>;

const TITLES = { add: "Add department", edit: "Edit department" };
const SUBTITLES = {
  add: "Add a department and define its name, type and coverage.",
  edit: "Update the department's name and type.",
};

const FIELD = "[&>label]:text-[14px] [&>label]:font-semibold";

// One form for Add and Edit, so both always show the same fields. The code is generated, never typed.
export function DepartmentFormModal({ mode, initial, suggestedCode, onClose, onSave }: DepartmentFormModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<string>(initial?.type ?? "");
  const [errors, setErrors] = useState<Errors>({});

  const submit = () => {
    const next: Errors = {};
    if (name.trim().length < 3) next.name = "Enter the department name";
    if (!type) next.type = "Select the department type";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const chosen = type as DepartmentType;
    onSave({
      name: name.trim(),
      type: chosen,
      code: initial?.code ?? suggestedCode,
      // The form carries no region: an existing department keeps its own, a new federal one is "Federal".
      region: initial?.region ?? (chosen === "Federal Ministry" ? "Federal" : "Not set"),
      active: initial?.active ?? true,
    });
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={TITLES[mode]}
      subtitle={SUBTITLES[mode]}
      size="lg"
      bodyClassName="px-4 py-5 sm:px-6"
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="px-6">Cancel</Button>
          <Button variant="brand" onClick={submit} className="px-6">Submit</Button>
        </>
      }
    >
      <h3 className="mb-4 text-[16px] font-semibold text-ink">Department details</h3>
      <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
        <FormField label="Department Name" htmlFor="dp-name" required hint={errors.name ?? "At least 3 characters."} hintTone={errors.name || (name.trim().length > 0 && name.trim().length < 3) ? "error" : "muted"} className={FIELD}>
          <Input id="dp-name" value={name} onChange={(e) => { setName(e.target.value); setErrors((x) => ({ ...x, name: undefined })); }} placeholder="Enter department name" />
        </FormField>
        <FormField label="Department Type" htmlFor="dp-type" required hint={errors.type} hintTone="error" className={FIELD}>
          <Dropdown id="dp-type" value={type} placeholder="Select department" options={[...DEPARTMENT_TYPES]} onChange={(v) => { setType(v); setErrors((x) => ({ ...x, type: undefined })); }} />
        </FormField>
        <FormField label="Department Code" htmlFor="dp-code" className={FIELD}>
          <Input id="dp-code" value={initial?.code ?? suggestedCode} disabled readOnly />
        </FormField>
      </div>
    </Modal>
  );
}
