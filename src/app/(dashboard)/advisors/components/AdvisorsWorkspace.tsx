"use client";

import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { BackLink } from "@/components/ui/BackLink";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAdvisorsStore } from "@/features/communication";
import { useAuthStore } from "@/store/useAuthStore";
import { AdvisorDirectory } from "./AdvisorDirectory";
import { AddAdvisorModal } from "./AddAdvisorModal";

// DAs reach the directory from My Teams and only read it; the Admin maintains it.
export function AdvisorsWorkspace() {
  const role = useAuthStore((s) => s.role);
  const advisors = useAdvisorsStore((s) => s.rows);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const isAdmin = role === "Admin";

  return (
    <div className="flex w-full flex-col gap-4">
      {role === "DA" && <BackLink href="/my-teams" />}
      <PageHeader
        title="Advisors"
        description="Directory of Ministry of Agriculture subject-matter experts DAs can reference for specialist advisory support. A reference list — not an HR record of MoA staff."
        actions={
          isAdmin && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-brand-green px-3.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-green-dark"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add advisor
            </button>
          )
        }
      />
      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}
      <AdvisorDirectory advisors={advisors} />

      {adding && (
        <AddAdvisorModal
          onClose={() => setAdding(false)}
          onAdded={(a) => {
            setAdding(false);
            setNotice(`${a.name} (${a.id}) added to the advisor directory as ${a.expertise} · ${a.woreda}, ${a.region}.`);
          }}
        />
      )}
    </div>
  );
}
