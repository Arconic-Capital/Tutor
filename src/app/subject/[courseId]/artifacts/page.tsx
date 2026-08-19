"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const TYPES = [
  { key: "flashcards", label: "Flashcards" },
  { key: "cheat_sheet", label: "Cheat sheets" },
  { key: "study_notes", label: "Study notes" },
  { key: "formula_sheet", label: "Formula sheets" },
  { key: "practice_questions", label: "Practice questions" },
];
const SINGULAR: Record<string, string> = {
  flashcards: "Flashcards",
  cheat_sheet: "Cheat sheet",
  study_notes: "Study notes",
  formula_sheet: "Formula sheet",
  practice_questions: "Practice questions",
};

interface ArtifactRow {
  id: string;
  type: string;
  title: string;
  createdAt: string;
  meta: string;
  preview: { front: string; back: string } | null;
}

export default function ArtifactsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const searchParams = useSearchParams();
  const [list, setList] = useState<ArtifactRow[]>([]);
  const [filter, setFilter] = useState("all");
  const [genType, setGenType] = useState(searchParams.get("type") ?? "flashcards");
  const [topic, setTopic] = useState(searchParams.get("topic") ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [flipped, setFlipped] = useState(false);
  const autoRan = useRef(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/artifacts?courseId=${courseId}`);
    if (res.ok) setList(await res.json());
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  // arriving from the home ask bar with ?auto=1 kicks off generation immediately
  useEffect(() => {
    if (searchParams.get("auto") === "1" && !autoRan.current) {
      autoRan.current = true;
      window.history.replaceState(null, "", window.location.pathname);
      generate(searchParams.get("type") ?? "flashcards", searchParams.get("topic") ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate(typeOverride?: string, topicOverride?: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          type: typeOverride ?? genType,
          topic: (topicOverride ?? topic).trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { id } = await res.json();
      window.location.href = `/subject/${courseId}/artifacts/${id}`;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const visible = filter === "all" ? list : list.filter((a) => a.type === filter);
  const flipDeck = visible.find((a) => a.type === "flashcards" && a.preview);

  return (
    <div className="py-6">
      {/* filter row (wireframe 07) */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-3.5 py-1.5 text-[13px] ${filter === "all" ? "bg-[#f0f6fc] font-semibold text-[#2777c2]" : "text-[#8a857e] hover:text-[#1a1815]"}`}
        >
          All
        </button>
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] ${filter === t.key ? "bg-[#f0f6fc] font-semibold text-[#2777c2]" : "text-[#8a857e] hover:text-[#1a1815]"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* library grid */}
      <div className="mt-5 grid grid-cols-4 gap-3.5 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
        {/* live flip tile, like the wireframe */}
        {flipDeck && filter !== "cheat_sheet" && (
          <Link
            href={`/subject/${courseId}/artifacts/${flipDeck.id}`}
            onMouseEnter={() => setFlipped(true)}
            onMouseLeave={() => setFlipped(false)}
            className={`flex min-h-[128px] flex-col justify-center rounded-xl border p-4 text-center transition-colors ${flipped ? "border-[#bfe0f5] bg-[#f0f6fc]" : "border-[#1a1815] bg-white"}`}
          >
            <p className={`text-[13px] leading-snug ${flipped ? "" : "font-semibold"}`}>
              {flipped ? flipDeck.preview!.back.slice(0, 120) : flipDeck.preview!.front}
            </p>
            <p className="mt-2 text-[10.5px] uppercase tracking-wide text-[#b6b1aa]">hover to flip</p>
          </Link>
        )}
        {visible
          .filter((a) => a.id !== flipDeck?.id || filter === "cheat_sheet")
          .map((a) => (
            <Link
              key={a.id}
              href={`/subject/${courseId}/artifacts/${a.id}`}
              className="flex min-h-[128px] flex-col rounded-xl border border-[#eeece8] p-4 hover:border-[#2777c2]"
            >
              <p className="text-[11.5px] font-semibold text-[#2777c2]">{SINGULAR[a.type] ?? a.type}</p>
              <p className="mt-1.5 text-sm font-semibold leading-snug">{a.title}</p>
              <p className="mt-auto pt-2 text-xs text-[#b6b1aa]">
                {a.meta} ·{" "}
                {new Date(a.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
              </p>
            </Link>
          ))}
      </div>
      {visible.length === 0 && (
        <p className="py-12 text-center text-sm text-[#8a857e]">Nothing here yet — make the first one below.</p>
      )}

      {/* quiet generator strip */}
      <div className="mt-10 border-t border-[#eeece8] pt-6">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#b6b1aa]">
          Make something new
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setGenType(t.key)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] ${genType === t.key ? "bg-[#f0f6fc] font-semibold text-[#2777c2]" : "bg-[#faf9f7] text-[#8a857e] hover:text-[#1a1815]"}`}
            >
              {SINGULAR[t.key]}
            </button>
          ))}
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic (optional)"
            className="min-w-[200px] flex-1 rounded-full border border-[#e3e0da] px-4 py-1.5 text-[13px] outline-none placeholder:text-[#b6b1aa] focus:border-[#2777c2]"
          />
          <button
            onClick={() => generate()}
            disabled={busy}
            className="rounded-full bg-[#1a1815] px-5 py-1.5 text-[13px] font-semibold text-white disabled:opacity-40"
          >
            {busy ? "Generating…" : "Generate"}
          </button>
        </div>
        {busy && (
          <p className="mt-2.5 text-xs text-[#8a857e]">
            Reading past papers and marking guidelines — usually 20-60 seconds…
          </p>
        )}
        {error && <p className="mt-2.5 text-xs text-[#a44a3c]">{error}</p>}
      </div>
    </div>
  );
}
