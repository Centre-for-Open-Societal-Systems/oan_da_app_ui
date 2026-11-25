import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/Textarea";
import { AttributionCard } from "@/features/farmers";

interface AddAdvisoryNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddAdvisoryNoteModal({ isOpen, onClose }: AddAdvisoryNoteModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Advisory Note"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="add-note-form" variant="brand">
            Add note
          </Button>
        </>
      }
    >
      <form
        id="add-note-form"
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        <AttributionCard subtitle="Today · will be attributed to you" />

        <FormField
          label="Note"
          htmlFor="advisory-note"
          required
          hint="This note will be visible to the farmer and any DA assigned to this record."
        >
          <Textarea
            id="advisory-note"
            rows={3}
            placeholder="e.g. Recommended crop rotation to Chickpea for Plot 07 next season."
            required
          />
        </FormField>
      </form>
    </Modal>
  );
}
