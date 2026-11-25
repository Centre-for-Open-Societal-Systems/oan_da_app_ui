"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

// Records a voice note in the browser for the raise form. DA Services has no grievance attachment upload yet and does
// not forward attachments to the Grievance Service, so the note can be played back here but is not submitted.
export function VoiceRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  // Closing the form mid-recording must release the microphone.
  useEffect(
    () => () => {
      const recorder = recorderRef.current;
      if (!recorder) return;
      recorder.onstop = null;
      if (recorder.state !== "inactive") recorder.stop();
      recorder.stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  useEffect(
    () => () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    },
    [audioUrl],
  );

  const start = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice recording is not available in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setAudioUrl(URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType })));
        setRecording(false);
      };
      recorderRef.current = recorder;
      recorder.start();
      setSeconds(0);
      setRecording(true);
    } catch {
      setError("Allow microphone access to record a voice note.");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[14px] font-medium text-ink">Voice note</p>
      {audioUrl ? (
        <div className="flex items-center gap-3">
          <audio controls src={audioUrl} className="h-10 min-w-0 flex-1" />
          <Button type="button" variant="outline" onClick={() => setAudioUrl(null)}>Delete</Button>
        </div>
      ) : recording ? (
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-danger" aria-hidden="true" />
          <span className="text-[13.5px] font-medium text-ink" role="timer">Recording {clock(seconds)}</span>
          <Button type="button" variant="outline" onClick={() => recorderRef.current?.stop()}>Stop</Button>
        </div>
      ) : (
        <div>
          <Button type="button" variant="brandOutline" className="gap-2" onClick={start}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3z" />
              <path d="M19 11a7 7 0 01-14 0M12 18v3" />
            </svg>
            Record
          </Button>
        </div>
      )}
      <p className={error ? "text-[12.5px] text-danger" : "text-[12.5px] text-gray-500"}>
        {error ?? "Stays on this device for now; it is not sent with the grievance yet."}
      </p>
    </div>
  );
}
