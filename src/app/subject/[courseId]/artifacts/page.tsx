"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";

const TYPES = [
  { key: "flashcards", label: "Flashcards", icon: "🃏" },
  { key: "cheat_sheet", label: "Cheat sheet", icon: "📄" },
  { key: "study_notes", label: "Study notes", icon: "📝" },
  { key: "formula_sheet", label: "Formula sheet", icon: "📐" },
  { key: "practice_questions", label: "Practice questions", icon: "🧪" },
];

interface ArtifactRow {
  id: string;
  type: string;
  title: string;
  createdAt: string;
}

export default function ArtifactsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const [list, setList] = useState<ArtifactRow[]>([]);
  const [type, setType] = useState("flashcards");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/artifacts?courseId=${courseId}`);
    if (res.ok) setList(await res.json());
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, type, topic: topic.trim() || undefined }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { id } = await res.json();
      window.location.href = `/subject/${courseId}/artifacts/${id}`;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const typeMeta = (k: string) => TYPES.find((t) => t.key === k);

  return (
    <div className="py-6">
      {/* generator */}
      <div className="mx-auto max-w-xl rounded-2xl border border-[#e3e0da] p-5 shadow-[0_1px_3px_rgba(26,24,21,0.05)]">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#b6b1aa]">
          Make something new
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium ${type === t.key ? "bg-[#f0f6fc] font-semibold text-[#2777c2]" : "bg-[#faf9f7] text-[#8a857e] hover:text-[#1a1815]"}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic (optional) — e.g. Equilibrium, Projectile motion…"
            className="flex-1 rounded-lg border border-[#e3e0da] px-3 py-2 text-sm outline-none placeholder:text-[#b6b1aa] focus:border-[#2777c2]"
          />
          <button
            onClick={generate}
            disabled={busy}
            className="rounded-full bg-[#1a1815] px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy ? "Generating…" : "Generate"}
          </button>
        </div>
        {busy && (
          <p className="mt-3 text-xs text-[#8a857e]">
            Reading past papers and marking guidelines — usually 20-60 seconds…
          </p>
        )}
        {error && <p className="mt-3 text-xs text-[#a44a3c]">{error}</p>}
      </div>

      {/* library */}
      <div className="mx-auto mt-10 max-w-3xl">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#b6b1aa]">
          Library
        </p>
        {list.length === 0 && (
          <p className="py-8 text-center text-sm text-[#8a857e]">
            Nothing yet — generate your first study material above.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
          {list.map((a) => (
            <Link
              key={a.id}
              href={`/subject/${courseId}/artifacts/${a.id}`}
              className="rounded-xl border border-[#eeece8] p-4 hover:border-[#2777c2]"
            >
              <p className="text-[11.5px] font-semibold text-[#2777c2]">
                {typeMeta(a.type)?.icon} {typeMeta(a.type)?.label}
              </p>
              <p className="mt-1 text-sm font-semibold leading-snug">{a.title}</p>
              <p className="mt-1.5 text-xs text-[#b6b1aa]">
                {new Date(a.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
