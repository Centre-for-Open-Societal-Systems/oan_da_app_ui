"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PageLoader } from "@/components/ui/PageLoader";

// Shown in place of the dashboard once the Keycloak session can no longer be renewed. It cannot be dismissed:
// the only way on is the login page.
export function SessionExpiredDialog() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // /login sends the browser on to Keycloak, so the user signs in again from the login page.
  const relogin = () => {
    setBusy(true);
    router.replace("/login");
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
            {busy ? "Opening sign-in…" : "Sign in again"}
          </Button>
        }
      >
        <div className="flex flex-col gap-3 p-2 text-center">
          <h2 id="modal-title" className="text-[18px] font-semibold text-ink">Session expired</h2>
          <p className="text-[14px] text-muted">Your session has expired. Please sign in again to continue.</p>
        </div>
      </Modal>
    </>
  );
}
