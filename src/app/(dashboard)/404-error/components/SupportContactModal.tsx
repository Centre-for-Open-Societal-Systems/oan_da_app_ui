"use client";

import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";

interface SupportContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestedPath: string;
}

export function SupportContactModal({
  isOpen,
  onClose,
  requestedPath,
}: SupportContactModalProps) {
  const [submitted, setSubmitted] = useState(false);

  const handleClose = () => {
    setSubmitted(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Contact support"
      subtitle="Report a broken link or missing page to your regional support desk."
    >
      {submitted ? (
        <div className="flex flex-col gap-4">
          <Banner tone="success" title="Support ticket logged">
            Our support team received your report for <span className="font-mono font-semibold">{requestedPath}</span>.
          </Banner>
          <div className="flex justify-end">
            <Button variant="brand" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <FormField label="Requested path" htmlFor="support-path">
            <Input id="support-path" name="path" defaultValue={requestedPath} readOnly className="bg-surface font-mono text-[13px]" />
          </FormField>
          <FormField label="What were you trying to open?" htmlFor="support-details" required>
            <Textarea
              id="support-details"
              name="details"
              required
              rows={3}
              placeholder="Describe the link or action that led to this 404 error..."
            />
          </FormField>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="brand">
              Send report
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

