"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Spinner } from "@/components/ui/Spinner";
import { setKbArticleStatus, setKbVideoStatus, type KbStatus } from "@/features/communication";
import type { KnowledgeKind } from "./CreateKnowledgeModal";

/**
 * Archive (status → Archived; the API has no delete) or restore an archived item (status → Published).
 * `restore` picks which of the two the dialog does.
 */
export function ArchiveKnowledgeModal({ kind, name, title, restore = false, onClose, onDone }: {
  kind: KnowledgeKind;
  name: string;
  title: string;
  restore?: boolean;
  onClose: () => void;
  onDone: (status: KbStatus) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const noun = kind === "video" ? "video" : "article";
  const next: KbStatus = restore ? "Published" : "Archived";

  const confirm = async () => {
    setSaving(true);
    setError(null);
    try {
      await (kind === "video" ? setKbVideoStatus : setKbArticleStatus)(name, next);
      onDone(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update. Please try again.");
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={() => !saving && onClose()}
      title={restore ? `Restore ${noun}?` : `Archive ${noun}?`}
      subtitle={title}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant={restore ? "brand" : "danger"} onClick={confirm} disabled={saving} className="gap-2">
            {saving && <Spinner className="h-4 w-4" />}
            {restore ? "Restore" : "Archive"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error && <ErrorAlert message={error} />}
        <p className="text-[14px] leading-relaxed text-ink-soft">
          {restore
            ? `The ${noun} is published again and Development Agents can see it.`
            : `Development Agents will no longer see this ${noun}. It is not deleted: Supervisors and Admins can still find it under the Archived status and restore it.`}
        </p>
      </div>
    </Modal>
  );
}
