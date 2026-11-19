"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Textarea } from "@/components/ui/Textarea";

interface SendAttendanceReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (message: string) => void;
}

export function SendAttendanceReminderModal({
  isOpen,
  onClose,
  onSend,
}: SendAttendanceReminderModalProps) {
  const [channels, setChannels] = useState<Set<string>>(new Set(["SMS", "In-app"]));
  const [message, setMessage] = useState(
    "Reminder: Please record your check-in for today's field activities via OpenAgriNet."
  );

  if (!isOpen) return null;

  const toggleChannel = (c: string) => {
    const next = new Set(channels);
    if (next.has(c)) {
      if (next.size > 1) next.delete(c);
    } else {
      next.add(c);
    }
    setChannels(next);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      hideHeader
      className="max-w-[500px] rounded-2xl p-0 shadow-2xl border border-slate-100"
      bodyClassName="p-0"
    >
      <div className="flex flex-col bg-white rounded-2xl">
        {/* Compact Unified Header with Close Button */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 pt-4 pb-3.5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </div>
            <div>
              <h2 id="modal-title" className="text-[17px] font-bold text-slate-900 leading-tight">
                Send attendance reminder
              </h2>
              <p className="mt-0.5 text-[12.5px] text-slate-500 leading-snug">
                Remind agents who haven&apos;t checked in yet today.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg
              className="h-4 w-4 stroke-[2.5]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-5 py-4">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
              Recipients
            </label>
            <div className="rounded-lg border border-line bg-surface px-3 py-2.5 text-[13px] text-ink">
              <span className="font-semibold text-brand-green">2 agents yet to check in:</span>{" "}
              Bekele Gutema, Abdi Mohammed
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">
              Notification channels
            </label>
            <div className="flex items-center gap-4 text-[13px]">
              {["SMS", "In-app", "Email"].map((c) => (
                <label key={c} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={channels.has(c)} onChange={() => toggleChannel(c)} />
                  <span>{c}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
              Message
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full text-[13px]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3.5 bg-white rounded-b-2xl">
          <Button variant="outline" size="md" onClick={onClose} className="px-5">
            Cancel
          </Button>
          <Button
            variant="brand"
            size="md"
            onClick={() => {
              onSend(message);
              onClose();
            }}
            className="px-5"
          >
            Send reminder
          </Button>
        </div>
      </div>
    </Modal>
  );
}
