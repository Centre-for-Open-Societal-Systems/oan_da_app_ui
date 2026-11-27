"use client";

import { useMemo, useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CertificateDocuments, type Certificate } from "@/features/farmers";
import { describeProfileError, fetchProfileDocument, type ProfileQualification } from "@/features/profile";
import { UploadCertificateModal } from "./UploadCertificateModal";

interface Props {
  /** The education records with their certificates (GET /profile/my_profile). */
  qualifications?: ProfileQualification[];
}

/** The certificates of the education records as list rows; the id is the registry document_id. */
function certificatesOf(qualifications: ProfileQualification[]): Certificate[] {
  return qualifications.flatMap((q) =>
    (q.certificates ?? []).map((c) => ({
      id: c.document_id,
      title: c.name || "Certificate",
      status: "verified" as const,
      issuer: [q.education_level_label || q.education_level, q.passout_year ? `passed ${q.passout_year}` : null, q.is_main ? "main record" : null].filter(Boolean).join(" · ") || "DA Registry",
    })),
  );
}

// The education records and their certificates as the registry holds them; education level and specialisation are
// changed from "Edit profile" (a Qualifications change request). A certificate's file link is asked for on every
// View (GET /profile/documents/{document_id}) because it lives only about an hour.
export function QualificationsSection({ qualifications = [] }: Props) {
  const registryCertificates = useMemo(() => certificatesOf(qualifications), [qualifications]);
  // Files picked here stay on this page only: there is no upload API for the user's own record yet.
  const [uploaded, setUploaded] = useState<Certificate[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const certificates = [...registryCertificates, ...uploaded];

  const addCertificates = (added: Certificate[]) => setUploaded((prev) => [...prev, ...added]);

  const viewCertificate = async (cert: Certificate) => {
    setViewError(null);
    // Open the tab inside the click so the browser does not block it, then point it at the signed link.
    const tab = window.open("", "_blank");
    try {
      const { url } = await fetchProfileDocument(cert.id);
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      tab?.close();
      setViewError(describeProfileError(err));
    }
  };

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

      <div className="flex flex-col gap-6 p-5 sm:p-6">
        {/* The education records as the DA Registry holds them (its "DA education records" section). */}
        <div className="flex flex-col gap-3">
          <h3 className="text-[15px] font-semibold text-ink">Education records</h3>
          {qualifications.length === 0 ? (
            <p className="rounded-xl border border-line bg-white px-4 py-3.5 text-[13px] text-muted shadow-2xs">No education records on your record yet.</p>
          ) : (
            <ul className="overflow-hidden rounded-xl border border-line bg-white shadow-2xs divide-y divide-line">
              {qualifications.map((q) => (
                <li key={q.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
                  <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                    {q.education_level_label || q.education_level || "—"}
                    {q.is_main && <span className="rounded-[12px] border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Main</span>}
                  </span>
                  <span className="text-[13px] text-ink-soft">
                    {q.passout_year ? `Passed ${q.passout_year}` : "Passout year not set"} · {(q.certificates ?? []).length} certificate{(q.certificates ?? []).length === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {viewError && (
          <Banner tone="error" onDismiss={() => setViewError(null)}>
            {viewError}
          </Banner>
        )}
        <CertificateDocuments certificates={certificates} onAdd={addCertificates} onView={viewCertificate} className="border-t border-line pt-6" />
      </div>

      <UploadCertificateModal isOpen={isUploading} onClose={() => setIsUploading(false)} onSubmit={(cert) => addCertificates([cert])} />
    </Card>
  );
}
