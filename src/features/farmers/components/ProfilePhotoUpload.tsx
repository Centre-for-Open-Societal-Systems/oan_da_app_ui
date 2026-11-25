"use client";

import { useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png"];

interface ProfilePhotoUploadProps {
  /** Existing photo URL to show before the user picks a new one. */
  initialPreview?: string | null;
  /** Hide the Upload/Remove buttons; the drop zone itself becomes clickable instead. */
  showActions?: boolean;
  /** Form field name for the chosen file, when a parent form needs to read it. */
  name?: string;
  /** Show the Remove button next to Upload (off where a photo is mandatory, e.g. the agent profile). */
  allowRemove?: boolean;
  /** Shown in the circle while no photo is picked, e.g. the initials avatar; defaults to a person icon. */
  fallback?: ReactNode;
  className?: string;
}

export function ProfilePhotoUpload({ initialPreview = null, showActions = true, name, allowRemove = true, fallback, className }: ProfilePhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialPreview);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only blob URLs we created need revoking — never the caller's initial URL
  const revokePreview = () => {
    if (preview && preview !== initialPreview) URL.revokeObjectURL(preview);
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Only JPG or PNG files are supported.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("File must be 5MB or smaller.");
      return;
    }
    setError(null);
    revokePreview();
    setPreview(URL.createObjectURL(file));
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
    // Clearing lets the same file be picked again, but a named input must keep the file for its form
    if (!name) e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    // Mirror the dropped file into the input so a parent form (FormData) sees it too
    if (inputRef.current && e.dataTransfer.files?.length) inputRef.current.files = e.dataTransfer.files;
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleRemove = () => {
    revokePreview();
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-[14px] font-medium text-ink">Profile Photo</span>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        // The hidden input lives inside this box, so ignore the click it bubbles up when the picker opens
        onClick={showActions ? undefined : (e) => { if (e.target !== inputRef.current) inputRef.current?.click(); }}
        // Without buttons the whole box is the picker, so it must be reachable by keyboard too
        role={showActions ? undefined : "button"}
        tabIndex={showActions ? undefined : 0}
        aria-label={showActions ? undefined : "Upload profile photo"}
        onKeyDown={
          showActions
            ? undefined
            : (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }
        }
        className={cn(
          "flex flex-col items-center rounded-xl border-2 border-dashed bg-surface-alt px-4 py-6 text-center transition-colors",
          isDragging ? "border-brand-green bg-brand-tint" : "border-line",
          !showActions && "cursor-pointer hover:border-brand-green/50 focus:outline-none focus-visible:border-brand-green"
        )}
      >
        <div className="h-20 w-20 overflow-hidden rounded-full bg-zinc-200">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local blob URL preview; next/image cannot optimize object URLs
            <img src={preview} alt="Profile preview" className="h-full w-full object-cover" />
          ) : fallback ?? (
            <div className="flex h-full w-full items-center justify-center text-zinc-400">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
        </div>

        <p className="mt-5 text-[14px] font-semibold text-ink">Drag &amp; drop your photo here</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-gray-500">
          Supports JPG, PNG up to 5MB.
          <br />
          Minimum 200×200px.
        </p>
        {error && <p className="mt-2 text-[12.5px] text-danger">{error}</p>}

        {showActions && (
          <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-lg bg-brand-green px-3 text-[12.5px] font-semibold text-white shadow-xs transition-colors hover:bg-brand-green-dark cursor-pointer active:scale-95"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              Upload Photo
            </button>
            {allowRemove && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={!preview}
                className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-[12.5px] font-medium text-ink-soft transition-colors hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:hover:border-line disabled:hover:text-ink-soft cursor-pointer"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove
              </button>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          name={name}
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
    </div>
  );
}
