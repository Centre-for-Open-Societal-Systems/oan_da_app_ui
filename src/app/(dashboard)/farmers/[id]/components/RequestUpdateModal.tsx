"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { AttributionCard } from "@/features/farmers";
import type { Farmer } from "@/features/farmers";
import { FileDropInput } from "@/components/ui/FileDropInput";

interface RequestUpdateModalProps {
  farmer: Farmer;
  isOpen: boolean;
  onClose: () => void;
}

export function RequestUpdateModal({ farmer, isOpen, onClose }: RequestUpdateModalProps) {
  // Fields of the read-only registry record that an agent can request a change to.
  const fields = [
    { key: "phone", label: "Mobile phone", value: farmer.phone },
    { key: "email", label: "Email address", value: farmer.email },
    { key: "kebele", label: "Kebele", value: farmer.kebele },
    { key: "woreda", label: "Woreda", value: farmer.woreda },
    { key: "crop", label: "Primary crop", value: farmer.crop },
    { key: "livestock", label: "Primary livestock", value: `${farmer.livestock} (${farmer.livestockHeads} heads)` },
  ];
  const [fieldKey, setFieldKey] = useState(fields[0].key);
  const current = fields.find((f) => f.key === fieldKey) ?? fields[0];
  const [files, setFiles] = useState<File[]>([]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request an Update"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="request-update-form" variant="brand">
            Submit request
          </Button>
        </>
      }
    >
      <form
        id="request-update-form"
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        <AttributionCard subtitle="Today · will be attributed to you" />

        <FormField label="Field to update" htmlFor="update-field">
          <Select id="update-field" className="h-10" value={fieldKey} onChange={(e) => setFieldKey(e.target.value)}>
            {fields.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </Select>
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Current value" htmlFor="update-current">
            <Input id="update-current" value={current.value} readOnly className="h-10 border-transparent bg-slate-100 text-slate-600" />
          </FormField>
          <FormField label="New value" htmlFor="update-new" required>
            <Input id="update-new" placeholder="Enter the updated value" className="h-10" required />
          </FormField>
        </div>

        <FormField label="Reason for update" htmlFor="update-reason" required>
          <Textarea id="update-reason" rows={2} placeholder="e.g. The farmer shared a new phone number during the last visit." required />
        </FormField>

        <FileDropInput label="Supporting documents" actionLabel="Upload documents" name="supporting" files={files} onChange={setFiles} />

        <Banner tone="info">
          This record comes from the Farmer Registry and is read-only here. Your request, with any supporting documents, will
          be sent to the Registry team for review.
        </Banner>
      </form>
    </Modal>
  );
}
