export type CertificateStatus = "verified" | "pending";

export interface Certificate {
  id: string;
  title: string;
  status: CertificateStatus;
  issuer: string;
  /** e.g. "PDF · 1.2 MB" */
  fileMeta?: string;
  url?: string;
}

export const CERTIFICATE_BADGE: Record<CertificateStatus, { label: string; className: string }> = {
  verified: { label: "Verified", className: "border border-emerald-300 bg-emerald-50 text-emerald-700" },
  pending: { label: "Pending verification", className: "border border-amber-300 bg-amber-50 text-amber-800" },
};

// Shared by the registration wizard (Step 4) and the agent's own profile until the qualifications API lands.
export const SAMPLE_CERTIFICATES: Certificate[] = [
  { id: "1", title: "Diploma in Plant Science", status: "verified", issuer: "Jimma University · issued 12 Jul 2018", fileMeta: "PDF · 1.2 MB" },
  { id: "3", title: "Integrated Pest Management", status: "pending", issuer: "Ethiopian Agricultural Transformation Institute · issued 18 Feb 2026 · expires 18 Feb 2028", fileMeta: "PDF · 842 KB" },
];

export const EDUCATION_TIERS = ["Certificate", "Diploma", "Bachelor's degree", "Master's degree"];

export const SPECIALIZATIONS = [
  "Cereals — teff / wheat",
  "Cereals — maize / sorghum",
  "Horticulture — vegetables",
  "Horticulture — fruits",
  "Livestock — dairy",
  "Livestock — poultry",
  "Coffee & cash crops",
];

export const CERTIFICATE_TYPES = ["Professional certification", "Academic qualification", "Training completion", "Licence / permit"];

export function formatFileSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export function fileMeta(file: File) {
  return `${file.name.split(".").pop()?.toUpperCase()} · ${formatFileSize(file.size)}`;
}

// A dropped/browsed file becomes a pending certificate until a supervisor verifies it.
export function certificateFromFile(file: File): Certificate {
  return {
    id: `${Date.now()}-${file.name}`,
    title: file.name.replace(/\.[^.]+$/, ""),
    status: "pending",
    issuer: "Uploaded for supervisor verification",
    fileMeta: fileMeta(file),
    url: URL.createObjectURL(file),
  };
}
