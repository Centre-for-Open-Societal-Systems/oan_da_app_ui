"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Modal } from "@/components/ui/Modal";
import { PageLoader } from "@/components/ui/PageLoader";
import { beginKeycloakLogin } from "../keycloak";

// Shown in place of the dashboard once the Keycloak session can no longer be renewed. It cannot be dismissed:
// the only way on is to sign in again.
export function SessionExpiredDialog() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const relogin = async () => {
    setBusy(true);
    setError(null);
    try {
      await beginKeycloakLogin();
    } catch {
      setError("Could not start the sign-in. Please try again.");
      setBusy(false);
    }
  };

  return (
    <>
      <PageLoader fullScreen label="" />
      <Modal
        isOpen
        onClose={() => {}}
        title="Session expired"
        hideHeader
        footer={
          <Button type="button" size="lg" disabled={busy} onClick={relogin} className="rounded-md font-semibold">
            Sign in again
          </Button>
        }
      >
        <div className="flex flex-col gap-3 p-2 text-center">
          <h2 id="modal-title" className="text-[18px] font-semibold text-ink">Session expired</h2>
          <p className="text-[14px] text-muted">Your session has expired. Click the button below to sign in again.</p>
          {error && <ErrorAlert message={error} />}
        </div>
      </Modal>
    </>
  );
}
