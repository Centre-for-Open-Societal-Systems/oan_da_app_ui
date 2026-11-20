import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Banner } from "@/components/ui/Banner";
import { DatePicker } from "@/components/ui/DatePicker";

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
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setName("");
      setRelationship("");
      setDateOfBirth("");
      setError(null);
    }
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter the full name.");
      return;
    }
    if (!relationship) {
      setError("Please select the relationship.");
      return;
    }
    if (!dateOfBirth) {
      setError("Please choose the date of birth.");
      return;
    }
    setError(null);
    onSubmit({ name: name.trim(), relationship, dateOfBirth });
    handleClose();
  };

  const handleClose = () => {
    setName("");
    setRelationship("");
    setDateOfBirth("");
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Dependent"
      bodyClassName="px-4 py-4 sm:px-6"
      footer={
        <>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} variant="brand">
            Submit
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <p className="text-[13px] leading-relaxed text-ink-soft">
          New dependents are added here and routed to your Woreda Extension Officer for approval.
        </p>

        {error && <Banner tone="error">{error}</Banner>}

        <FormField label="Full name" htmlFor="dep-name" required>
          <Input
            id="dep-name"
            name="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            className="h-10"
            placeholder="e.g. Hana Alemu"
            required
            autoFocus
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Relationship" htmlFor="dep-relationship" required>
            <Select
              id="dep-relationship"
              name="relationship"
              className="h-10"
              value={relationship}
              onChange={(e) => {
                setRelationship(e.target.value);
                if (error) setError(null);
              }}
              required
            >
              <option value="" disabled>Select relationship</option>
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Date of birth" htmlFor="dep-dob" required>
            <DatePicker
              id="dep-dob"
              name="dateOfBirth"
              value={dateOfBirth}
              onChange={(d) => {
                setDateOfBirth(d);
                if (error) setError(null);
              }}
              placeholder="Select date of birth"
              maxDate={new Date().toISOString().split("T")[0]}
              minDate="1920-01-01"
              className="h-10 w-full"
              required
            />
          </FormField>
        </div>

        <Banner tone="warning">Routes to your Woreda supervisor for approval; your balance updates once approved.</Banner>
      </form>
    </Modal>
  );
}
