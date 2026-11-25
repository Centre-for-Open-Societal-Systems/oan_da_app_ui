// Live SMS preview — a realistic mobile handset frame so officers see what a farmer receives (FR-10).
export function SmsPreview({ text, sender }: { text: string; sender: string }) {
  const segments = Math.max(1, Math.ceil(text.length / 160));
  const senderDisplay = sender?.trim() || "Kebele Office";

  return (
    <div className="flex w-full flex-col items-center">
      {/* Device Outer Chassis */}
      <div className="w-full max-w-[270px] rounded-[30px] border-[6px] border-slate-900 bg-slate-950 p-2.5 shadow-xl transition-all">
        {/* Top Speaker / Notch */}
        <div className="relative flex items-center justify-center pb-1.5 pt-0.5">
          <div className="h-1.5 w-12 rounded-full bg-slate-800" />
          <div className="absolute right-4 top-1 h-2 w-2 rounded-full bg-slate-800/80" />
        </div>

        {/* Screen Area */}
        <div className="flex min-h-[270px] flex-col rounded-[20px] bg-slate-100 overflow-hidden shadow-inner">
          {/* Status Bar */}
          <div className="flex items-center justify-between px-3.5 pt-2 text-[10px] font-semibold text-slate-600">
            <span>09:41</span>
            <div className="flex items-center gap-1.5">
              <svg className="h-2.5 w-2.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 18.4c-.2.2-.2.51 0 .71.1.1.23.15.35.15s.26-.05.35-.15l1.06-1.06C7.93 19.26 9.88 20 12 20s4.07-.74 5.89-1.95l1.06 1.06c.1.1.23.15.35.15s.26-.05.35-.15c.2-.2.2-.51 0-.71l-.62-.79C20.26 16.07 21 14.12 21 12c0-4.97-4.03-9-9-9z" />
              </svg>
              <svg className="h-2.5 w-2.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98C20.93 5.9 16.69 4 12 4z" />
              </svg>
              <div className="flex h-2 w-3.5 items-center rounded-xs border border-slate-600 p-0.5">
                <div className="h-full w-full rounded-2xs bg-slate-600" />
              </div>
            </div>
          </div>

          {/* Contact Header */}
          <div className="border-b border-slate-200/90 bg-white/90 px-3 py-2 text-center">
            <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-brand-green shadow-xs">
              {senderDisplay.charAt(0).toUpperCase()}
            </div>
            <p className="mt-0.5 truncate px-1 text-[11.5px] font-bold text-slate-800">{senderDisplay}</p>
            <p className="text-[9.5px] font-medium text-slate-400">Official Broadcast · SMS</p>
          </div>

          {/* Messages Body */}
          <div className="flex flex-1 flex-col justify-end p-3">
            <div className="mb-2 text-center">
              <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[9px] font-medium text-slate-500">
                Today 09:41
              </span>
            </div>

            {/* Bubble */}
            <div className="relative max-w-[92%] self-start rounded-2xl rounded-tl-xs border border-slate-200/80 bg-white p-2.5 shadow-xs">
              <div className="whitespace-pre-wrap break-words text-[12px] font-normal leading-relaxed text-slate-800">
                {text.trim() ? (
                  text
                ) : (
                  <span className="italic text-slate-400">
                    Message preview will appear here as you type…
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex items-center justify-end gap-1.5 text-[9px] text-slate-400">
                <span>now</span>
                <span>•</span>
                <span>{segments} seg</span>
              </div>
            </div>
          </div>

          {/* Bottom Home Indicator */}
          <div className="flex justify-center bg-slate-100 py-1">
            <div className="h-1 w-16 rounded-full bg-slate-400/80" />
          </div>
        </div>
      </div>

      {/* Frame Sub-label */}
      <div className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-slate-500">
        <span className="font-medium">{text.length} characters</span>
        <span>•</span>
        <span className="font-medium">{segments} SMS segment{segments > 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}
