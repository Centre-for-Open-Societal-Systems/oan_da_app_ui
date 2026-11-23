"use client";

import { useState, useRef, useEffect } from "react";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { ROLE_LABELS } from "@/lib/rbac";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export function UserProfile() {
  const router = useRouter();
  const { user, role, profile, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmingLogout, setIsConfirmingLogout] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const name = user?.name ?? "Tadesse Alemu";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Logout is only performed after the user confirms in the dialog
  const handleLogout = () => {
    setIsConfirmingLogout(false);
    logout();
    router.push("/login");
  };

  return (
    <div className="relative w-fit sm:min-w-[210px]" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User menu"
        aria-haspopup="true"
        aria-expanded={isOpen}
        className={`flex w-full items-center justify-between gap-1.5 sm:gap-2 md:gap-2.5 py-1 pl-1 pr-2 sm:py-1.5 sm:pl-1.5 sm:pr-3 md:pr-3.5 border transition-all duration-300 bg-white group active:scale-[0.98] shrink-0 ${
          isOpen
            ? "rounded-t-[20px] rounded-b-none border-zinc-200 border-b-transparent shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.05)] relative z-[61] max-sm:rounded-full max-sm:border-b-zinc-200"
            : "rounded-full border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-md"
        }`}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 min-w-0">
          <div className="relative h-8 w-8 sm:h-9 sm:w-9 shrink-0 overflow-hidden rounded-full shadow-inner">
            <PersonAvatar />
          </div>
          <div className="hidden min-w-0 text-left sm:block">
            <p
              title={name}
              className="max-w-[75px] md:max-w-[100px] lg:max-w-[120px] xl:max-w-[150px] truncate text-[13px] md:text-[14px] font-bold leading-tight text-gray-900"
            >
              {name}
            </p>
            <p
              title={profile?.roleLabel ?? ROLE_LABELS[role]}
              className="hidden md:block max-w-[100px] lg:max-w-[120px] xl:max-w-[150px] truncate mt-0.5 text-[11px] md:text-[12px] font-medium leading-tight text-gray-600"
            >
              {profile?.roleLabel ?? ROLE_LABELS[role]}
            </p>
          </div>
        </div>
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-slate-700 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            isOpen ? "rotate-180" : "group-hover:translate-y-[2px]"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-0 w-full bg-white rounded-b-[20px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-t-0 border-zinc-200 pt-0 pb-1.5 z-[60] animate-in fade-in duration-200 max-sm:left-auto max-sm:right-0 max-sm:w-56 max-sm:min-w-[210px] max-sm:mt-2 max-sm:rounded-2xl max-sm:border-t">
          <div className="h-[1px] bg-zinc-200 w-full mb-1.5 max-sm:hidden" />
          
          {/* User info for mobile & small tablets */}
          <div className="px-4 py-2 border-b border-line-soft md:hidden">
            <p className="text-[14px] font-bold text-gray-900 truncate">{name}</p>
            <p className="text-[12px] font-medium text-gray-500 truncate">{profile?.roleLabel ?? ROLE_LABELS[role]}</p>
          </div>

          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-surface transition-colors text-left group"
          >
            <svg className="w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] text-ink transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="font-medium text-[14px] text-ink-soft group-hover:text-ink transition-colors">My profile</span>
          </Link>

          <div className="h-[1px] bg-line-soft my-1.5 mx-0" />

          <button
            onClick={() => { setIsOpen(false); setIsConfirmingLogout(true); }}
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 transition-colors text-left group"
          >
            <svg className="w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] text-red-500 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="font-medium text-[14px] text-red-500">Logout</span>
          </button>
        </div>
      )}

      <Modal
        isOpen={isConfirmingLogout}
        onClose={() => setIsConfirmingLogout(false)}
        title="Log Out?"
        icon={
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-danger-tint text-danger">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </span>
        }
        footer={
          <>
            <Button type="button" variant="outline" className="h-10 rounded-lg px-5 font-semibold" onClick={() => setIsConfirmingLogout(false)}>
              Cancel
            </Button>
            <Button type="button" className="h-10 rounded-lg bg-danger px-5 font-semibold text-white hover:bg-red-700" onClick={handleLogout} autoFocus>
              Yes, log out
            </Button>
          </>
        }
      >
        <p className="text-[14px] leading-relaxed text-ink-soft">
          Are you sure you want to log out of the Ethiopia Agent Portal? Any unsynced offline changes stay on this device
          and will sync the next time you sign in. Unsubmitted form drafts are cleared.
        </p>
      </Modal>
    </div>
  );
}
