"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

interface Filed {
  courseId: string;
  courseName: string;
  title: string;
  resourceType: string;
  tutorReadable: boolean;
}

export default function UploadPanel({ courseId }: { courseId?: string }) {
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "uploading" | "filing" | "done" | "error">("idle");
  const [filed, setFiled] = useState<Filed | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setState("uploading");
    setError("");
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });
      setState("filing");
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: blob.url, filename: file.name, consent: true, courseId }),
      });
      if (!res.ok) throw new Error(await res.text());
      setFiled(await res.json());
      setState("done");
    } catch (e) {
      setError((e as Error).message);
      setState("error");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-[#e3e0da] px-4 py-1.5 text-[13px] font-medium hover:bg-[#faf9f7]"
      >
        ↑ Upload
      </button>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-[#e3e0da] p-5 shadow-[0_1px_3px_rgba(26,24,21,0.05)]">
      {state === "done" && filed ? (
        <div className="text-sm">
          <p className="font-semibold text-[#3b7a57]">✓ Filed automatically</p>
          <p className="mt-1">
            <span className="font-medium">{filed.title}</span> → {filed.courseName} ·{" "}
            {filed.resourceType.replace("_", " ")}
            {filed.tutorReadable && <span className="text-[#8a857e]"> · the tutor can now read it</span>}
          </p>
          <button
            onClick={() => { setState("idle"); setFiled(null); setConsent(false); }}
            className="mt-3 text-[13px] text-[#2777c2] underline"
          >
            Upload another
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm font-semibold">Share a resource</p>
          <p className="mt-1 text-[13px] text-[#8a857e]">
            Notes, summaries, practice questions — PDF, images or text. It files itself into the right subject and becomes searchable by the tutor.
          </p>
          <label className="mt-4 flex items-start gap-2.5 rounded-xl border border-dashed border-[#e3e0da] p-3 text-[12.5px] text-[#6e6862]">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I created this resource or have the right to share it, and I understand it may be removed if a copyright owner objects.
            </span>
          </label>
          <div className="mt-4 flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.docx"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={!consent || state === "uploading" || state === "filing"}
              className="rounded-full bg-[#1a1815] px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {state === "uploading" ? "Uploading…" : state === "filing" ? "Filing it…" : "Choose file"}
            </button>
            <button onClick={() => setOpen(false)} className="text-[13px] text-[#8a857e] hover:text-[#1a1815]">
              Cancel
            </button>
          </div>
          {state === "error" && <p className="mt-3 text-xs text-[#a44a3c]">{error}</p>}
        </>
      )}
    </div>
  );
}
