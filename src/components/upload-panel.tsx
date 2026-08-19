"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

interface Item {
  name: string;
  status: "uploading" | "filing" | "done" | "error";
  result?: { courseName: string; title: string; resourceType: string; tutorReadable: boolean };
  error?: string;
}

export default function UploadPanel({ courseId }: { courseId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function update(name: string, patch: Partial<Item>) {
    setItems((prev) => prev.map((it) => (it.name === name ? { ...it, ...patch } : it)));
  }

  async function handleFiles(files: FileList | File[]) {
    const list = [...files].slice(0, 10);
    setItems((prev) => [...prev, ...list.map((f) => ({ name: f.name, status: "uploading" as const }))]);
    await Promise.all(
      list.map(async (file) => {
        try {
          const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/upload" });
          update(file.name, { status: "filing" });
          const res = await fetch("/api/resources", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: blob.url, filename: file.name, consent: true, courseId }),
          });
          if (!res.ok) throw new Error(await res.text());
          update(file.name, { status: "done", result: await res.json() });
        } catch (e) {
          update(file.name, { status: "error", error: (e as Error).message });
        }
      }),
    );
    router.refresh(); // filed resources appear in the list immediately
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-[#1a1815] px-4 py-1.5 text-[13px] font-semibold text-white"
      >
        ↑ Upload
      </button>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-[#e3e0da] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold">Share resources</p>
          <p className="mt-0.5 text-[13px] text-[#8a857e]">
            Notes, summaries, practice questions — they file themselves and become searchable by the tutor.
          </p>
        </div>
        <button onClick={() => setOpen(false)} className="text-[13px] text-[#8a857e] hover:text-[#1a1815]">
          Close
        </button>
      </div>

      <label className="mt-4 flex items-start gap-2.5 text-[12.5px] text-[#6e6862]">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
        <span>I created these or have the right to share them; they may be removed if a copyright owner objects.</span>
      </label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (consent) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (consent && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => consent && fileRef.current?.click()}
        className={`mt-3 cursor-pointer rounded-xl border-2 border-dashed p-8 text-center text-sm transition-colors ${
          !consent
            ? "border-[#eeece8] text-[#c9c4bc]"
            : dragging
              ? "border-[#2777c2] bg-[#f0f6fc] text-[#2777c2]"
              : "border-[#d9d5ce] text-[#8a857e] hover:border-[#2777c2]"
        }`}
      >
        {consent ? (
          <>
            <span className="font-medium">Drop files here</span> or click to browse
            <span className="mt-1 block text-xs text-[#b6b1aa]">PDF, images, text — up to 10 at once, 50 MB each</span>
          </>
        ) : (
          "Tick the declaration above to enable uploads"
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        multiple
        accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.docx"
        className="hidden"
        onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
      />

      {items.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5">
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-3 text-[13px]">
              {it.status === "done" ? (
                <span className="text-[#3b7a57]">✓</span>
              ) : it.status === "error" ? (
                <span className="text-[#a44a3c]">✕</span>
              ) : (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#bfe0f5] border-t-[#2777c2]" />
              )}
              <span className="min-w-0 flex-1 truncate">
                {it.status === "done" && it.result ? (
                  <>
                    <span className="font-medium">{it.result.title}</span>
                    <span className="text-[#8a857e]">
                      {" "}→ {it.result.courseName} · {it.result.resourceType.replace("_", " ")}
                      {it.result.tutorReadable && " · tutor can read it"}
                    </span>
                  </>
                ) : it.status === "error" ? (
                  <span className="text-[#a44a3c]">{it.name}: {it.error?.slice(0, 80)}</span>
                ) : (
                  <span className="text-[#8a857e]">
                    {it.name} — {it.status === "uploading" ? "uploading…" : "filing it…"}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
