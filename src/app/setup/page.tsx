"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import Link from "next/link";

interface ExtractedEvent {
  title: string;
  kind: string;
  day_of_week: number | null;
  week_cycle: string | null;
  start_time: string | null;
  end_time: string | null;
  date: string | null;
  location: string | null;
  course_id: string | null;
}
interface ExtractedWork {
  title: string;
  kind: string;
  due_date: string | null;
  weighting: number | null;
  course_id: string | null;
  notes: string | null;
}
interface Proposal {
  filename: string;
  url: string;
  doc_kind: string;
  events: ExtractedEvent[];
  work_items: ExtractedWork[];
}

const DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "Feed it your life" — upload timetable / assessment schedules / notices, review, confirm. */
export default function SetupPage() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "working" | "review" | "saving">("idle");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [dropE, setDropE] = useState<Set<number>>(new Set());
  const [dropW, setDropW] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<{ events: number; workItems: number }[]>([]);

  async function handleFile(file: File) {
    setState("working");
    setError("");
    try {
      const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/upload" });
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: blob.url, filename: file.name }),
      });
      if (!res.ok) throw new Error(await res.text());
      const p: Proposal = await res.json();
      if (p.events.length === 0 && p.work_items.length === 0) {
        setError("Couldn't find any schedule or work in that file — try a clearer photo or the original PDF.");
        setState("idle");
        return;
      }
      setProposal(p);
      setDropE(new Set());
      setDropW(new Set());
      setState("review");
    } catch (e) {
      setError((e as Error).message);
      setState("idle");
    }
  }

  async function confirm() {
    if (!proposal) return;
    setState("saving");
    try {
      const body = {
        ...proposal,
        events: proposal.events.filter((_, i) => !dropE.has(i)),
        work_items: proposal.work_items.filter((_, i) => !dropW.has(i)),
      };
      const res = await fetch("/api/extract", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      setSaved((s) => [...s, result]);
      setProposal(null);
      setState("idle");
    } catch (e) {
      setError((e as Error).message);
      setState("review");
    }
  }

  const toggle = (set: Set<number>, i: number, fn: (s: Set<number>) => void) => {
    const next = new Set(set);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    fn(next);
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Feed it your life</h1>
      <p className="mt-1.5 text-sm text-[#8a857e]">
        Timetable (photo or PDF), assessment schedules, tutoring times, sport — upload one at a time.
        It reads them and builds your calendar.
      </p>

      {state !== "review" && (
        <>
          <label
            className={`mt-6 block cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center text-sm ${state === "working" ? "border-[#bfe0f5] text-[#2777c2]" : "border-[#d9d5ce] text-[#8a857e] hover:border-[#2777c2]"}`}
          >
            {state === "working" ? (
              <>Reading it — 30-60 seconds…</>
            ) : (
              <>
                <span className="font-medium">Drop a file or click to browse</span>
                <span className="mt-1 block text-xs text-[#b6b1aa]">Timetable screenshot, assessment schedule PDF, a photo of a notice…</span>
              </>
            )}
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
              className="hidden"
              disabled={state === "working"}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
          {error && <p className="mt-3 text-xs text-[#a44a3c]">{error}</p>}
          {saved.length > 0 && (
            <div className="mt-6 rounded-xl bg-[#e7f3ec] p-4 text-sm text-[#2e6e4c]">
              ✓ Saved {saved.reduce((s, x) => s + x.events, 0)} events and {saved.reduce((s, x) => s + x.workItems, 0)} work items from {saved.length} file{saved.length > 1 ? "s" : ""}.{" "}
              <Link href="/" className="font-semibold underline">See your calendar →</Link>
            </div>
          )}
        </>
      )}

      {state === "review" && proposal && (
        <div className="mt-6">
          <p className="text-sm">
            <span className="font-semibold">{proposal.filename}</span>{" "}
            <span className="text-[#8a857e]">
              → looks like a {proposal.doc_kind.replace("_", " ")}. Untick anything wrong, then confirm.
            </span>
          </p>

          {proposal.events.length > 0 && (
            <>
              <p className="mb-1 mt-5 text-[11px] font-semibold uppercase tracking-wide text-[#b6b1aa]">
                Events · {proposal.events.length}
              </p>
              <ul className="max-h-72 overflow-y-auto rounded-xl border border-[#eeece8]">
                {proposal.events.map((e, i) => (
                  <li key={i} className="flex items-center gap-3 border-t border-[#eeece8] px-3 py-2 text-[13px] first:border-t-0">
                    <input type="checkbox" checked={!dropE.has(i)} onChange={() => toggle(dropE, i, setDropE)} />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{e.title}</span>
                      <span className="text-[#8a857e]">
                        {" "}· {e.date ?? `${DAYS[e.day_of_week ?? 0]}${e.week_cycle ? ` (Wk ${e.week_cycle})` : ""}`}
                        {e.start_time && ` ${e.start_time}–${e.end_time ?? ""}`}
                        {e.location && ` · ${e.location}`}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-[#faf9f7] px-2 py-0.5 text-[10.5px] text-[#8a857e]">{e.kind}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {proposal.work_items.length > 0 && (
            <>
              <p className="mb-1 mt-5 text-[11px] font-semibold uppercase tracking-wide text-[#b6b1aa]">
                Assessments & work · {proposal.work_items.length}
              </p>
              <ul className="max-h-72 overflow-y-auto rounded-xl border border-[#eeece8]">
                {proposal.work_items.map((w, i) => (
                  <li key={i} className="flex items-center gap-3 border-t border-[#eeece8] px-3 py-2 text-[13px] first:border-t-0">
                    <input type="checkbox" checked={!dropW.has(i)} onChange={() => toggle(dropW, i, setDropW)} />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{w.title}</span>
                      <span className="text-[#8a857e]">
                        {" "}· due {w.due_date ?? "?"}
                        {w.weighting ? ` · ${w.weighting}%` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-[#fbf0dc] px-2 py-0.5 text-[10.5px] text-[#8a5a12]">{w.kind}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => { setProposal(null); setState("idle"); }}
              className="rounded-full border border-[#e3e0da] px-5 py-2 text-sm"
            >
              Discard
            </button>
            <button
              onClick={confirm}
              disabled={state !== "review"}
              className="rounded-full bg-[#1a1815] px-6 py-2 text-sm font-semibold text-white"
            >
              Add to my calendar
            </button>
          </div>
          {error && <p className="mt-3 text-xs text-[#a44a3c]">{error}</p>}
        </div>
      )}
    </main>
  );
}
