"use client";

import type { ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { cn } from "@/lib/utils";
import { REGISTRY_ENTITIES, type SuperAdminUser } from "@/features/superadmin";

interface SuperAdminUserViewModalProps {
  user: SuperAdminUser;
  onClose: () => void;
  /** Closes this view and opens the Edit form for the same user. */
  onEdit: () => void;
}

// 24/06/1999, as the form's Date of Birth is stored ISO.
const formatDate = (iso: string) => iso.split("-").reverse().join("/");

function Detail({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <dt className="text-[13px] text-ink-soft">{label}</dt>
      <dd className="break-words text-[15px] font-medium text-ink">{children}</dd>
    </div>
  );
}

function Section({ title, first, aside, children }: { title: string; first?: boolean; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className={first ? undefined : "mt-6"}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[16px] font-semibold text-ink">{title}</h3>
        {aside}
      </div>
      <dl className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">{children}</dl>
    </section>
  );
}

// Read-only details for one user, in the same four sections as the form; Edit user jumps to the Edit form.
export function SuperAdminUserViewModal({ user, onClose, onEdit }: SuperAdminUserViewModalProps) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      title="View User"
      subtitle="View personal details, organizational role and department information."
      size="xl"
      className="max-w-[1100px]"
      bodyClassName="px-4 py-5 sm:px-6"
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="px-6">Close</Button>
          <Button variant="brand" onClick={onEdit} className="px-6">Edit user</Button>
        </>
      }
    >
      <Section
        title="Personal details"
        first
        aside={
          <span className="flex items-center gap-2 text-[13px] text-ink-soft">
            Status
            <Pill tone={user.active ? "green" : "red"}>{user.active ? "Active" : "Inactive"}</Pill>
          </span>
        }
      >
        <Detail label="User Name">{user.name}</Detail>
        <Detail label="User Code">{user.code}</Detail>
        <Detail label="Date of birth">{formatDate(user.dob)}</Detail>
        <Detail label="Gender">{user.gender}</Detail>
        <Detail label="Email Id">{user.email}</Detail>
        <Detail label="Mobile Number">{user.mobile}</Detail>
      </Section>

      <Section title="Role and department">
        <Detail label="Department">{user.department}</Detail>
        <Detail label="Department Type">{user.departmentType}</Detail>
        <Detail label="Organizational Role">{user.role}</Detail>
      </Section>

      <Section title="Coverage details">
        <Detail label="Region">{user.region}</Detail>
        <Detail label="Zone">{user.zone}</Detail>
        <Detail label="Woreda">{user.woreda}</Detail>
        <Detail label="Kebele">{user.kebele}</Detail>
      </Section>

      <Section title="Services and registries">
        <Detail label="Service" className="lg:col-span-2">{user.service.join(", ")}</Detail>
        <Detail label="Registry and Catalogue" className="lg:col-span-2">{user.registry.join(", ")}</Detail>
        <Detail label="Entities" className="sm:col-span-2 lg:col-span-4">
          <ul className="flex flex-col gap-1">
            {user.registry.map((r) => (
              <li key={r}>
                <span className="text-ink-soft">{r}: </span>
                {(REGISTRY_ENTITIES[r] ?? []).filter((e) => user.entities.includes(e)).join(", ") || "-"}
              </li>
            ))}
          </ul>
        </Detail>
      </Section>
    </Modal>
  );
}
