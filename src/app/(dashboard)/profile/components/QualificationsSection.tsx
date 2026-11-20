"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { CertificateDocuments } from "@/features/farmers";
import { EDUCATION_TIERS, SAMPLE_CERTIFICATES, SPECIALIZATIONS, type Certificate } from "@/features/farmers";
import { UploadCertificateModal } from "./UploadCertificateModal";

interface Props {
  /** From the DA Registry profile (GET /profile/me); the sample defaults when absent. */
  educationTier?: string;
  specialisation?: string;
}

// Education tier and specialisation show the registry's values; a change to them goes through "Edit profile"
// (a Qualifications change request). Certificates stay samples until their API exists.
export function QualificationsSection({ educationTier, specialisation }: Props = {}) {
  const tierOptions = educationTier && !EDUCATION_TIERS.includes(educationTier) ? [educationTier, ...EDUCATION_TIERS] : EDUCATION_TIERS;
  const specialisationOptions = specialisation && !SPECIALIZATIONS.includes(specialisation) ? [specialisation, ...SPECIALIZATIONS] : SPECIALIZATIONS;
  const [certificates, setCertificates] = useState<Certificate[]>(SAMPLE_CERTIFICATES);
  const [isUploading, setIsUploading] = useState(false);

  const addCertificates = (added: Certificate[]) => setCertificates((prev) => [...prev, ...added]);

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      <div className="flex flex-col gap-3 border-b border-line bg-surface/40 px-5 py-3.5 sm:px-6 sm:py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-ink">Qualifications &amp; learning</h2>
            <span className="rounded-full border border-line bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-soft shadow-2xs">
              {certificates.length}
            </span>
          </div>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">Education tier, specialisation and certified credentials</p>
        </div>
        <Button type="button" variant="brand" size="md" onClick={() => setIsUploading(true)} className="w-fit shrink-0 gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          Upload certificate
        </Button>
      </div>

      <form className="flex flex-col gap-6 p-5 sm:p-6" onSubmit={(e) => e.preventDefault()}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField label="Education tier" htmlFor="educationTier" required>
            <Select id="educationTier" name="educationTier" key={educationTier ?? "sample"} defaultValue={educationTier ?? "Diploma"} className="h-11">
              {tierOptions.map((tier) => (
                <option key={tier} value={tier}>{tier}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Specialization" htmlFor="specialization" required>
            <Select id="specialization" name="specialization" key={specialisation ?? "sample"} defaultValue={specialisation ?? SPECIALIZATIONS[0]} className="h-11">
              {specialisationOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </FormField>
        </div>

        <CertificateDocuments certificates={certificates} onAdd={addCertificates} className="border-t border-line pt-6" />
      </form>

      <UploadCertificateModal isOpen={isUploading} onClose={() => setIsUploading(false)} onSubmit={(cert) => addCertificates([cert])} />
    </Card>
  );
}
