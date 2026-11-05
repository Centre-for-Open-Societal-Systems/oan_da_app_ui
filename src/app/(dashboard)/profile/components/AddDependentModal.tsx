import type { FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Banner } from "@/components/ui/Banner";

export const RELATIONSHIPS = ["Spouse", "Son", "Daughter", "Parent", "Sibling", "Other"];

export interface NewDependent {
  name: string;
  relationship: string;
  dateOfBirth: string; // ISO yyyy-mm-dd
}

interface AddDependentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dependent: NewDependent) => void;
}

const FORM_ID = "add-dependent-form";

export function AddDependentModal({ isOpen, onClose, onSubmit }: AddDependentModalProps) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const relationship = String(data.get("relationship") ?? "");
    const dateOfBirth = String(data.get("dateOfBirth") ?? "");
    if (!name || !relationship || !dateOfBirth) return;
    onSubmit({ name, relationship, dateOfBirth });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Dependent"
      bodyClassName="px-4 py-4"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} variant="brand">
            Submit
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <p className="text-[13.5px] leading-snug text-ink-soft">
          New dependents are added here and routed to your Woreda Extension Officer for approval.
        </p>

        <FormField label="Full name" htmlFor="dep-name" required>
          <Input id="dep-name" name="name" className="h-10" placeholder="e.g. Hana Alemu" required autoFocus />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Relationship" htmlFor="dep-relationship" required>
            <Select id="dep-relationship" name="relationship" className="h-10" defaultValue="" required>
              <option value="" disabled>Select relationship</option>
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Date of birth" htmlFor="dep-dob" required>
            <Input id="dep-dob" name="dateOfBirth" type="date" className="h-10" placeholder="DD MMM YYYY" required />
          </FormField>
        </div>

        <Banner tone="warning">Routes to your Woreda supervisor for approval; your balance updates once approved.</Banner>
      </form>
    </Modal>
  );
}
