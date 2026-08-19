"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** What the prompt becomes. Routes to the right tool; subject is inferred from the prompt. */
const ACTIONS = [
  { key: "ask", label: "Ask the tutor" },
  { key: "flashcards", label: "Flashcards" },
  { key: "cheat_sheet", label: "Cheat sheet" },
  { key: "study_notes", label: "Study notes" },
  { key: "formula_sheet", label: "Formula sheet" },
  { key: "practice_questions", label: "Practice questions" },
  { key: "quiz", label: "Quiz me" },
  { key: "marker", label: "Mark my answer" },
  { key: "predictor", label: "Predict my paper" },
];

export default function AskBar({ subjects }: { subjects: { id: string; name: string }[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [action, setAction] = useState("ask");
  const [busy, setBusy] = useState(false);

  async function go() {
    if (subjects.length === 0 || busy) return;
    setBusy(true);
    const prompt = q.trim();
    let courseId = subjects[0].id;
    try {
      const res = await fetch("/api/route-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.courseId) courseId = data.courseId;
    } catch {
      /* fall back to first subject */
    }

    const enc = encodeURIComponent(prompt);
    switch (action) {
      case "ask":
        router.push(`/subject/${courseId}/tutor${prompt ? `?q=${enc}` : ""}`);
        break;
      case "quiz":
        router.push(
          `/subject/${courseId}/tutor?q=${encodeURIComponent(prompt ? `Quiz me on ${prompt} with a real HSC-style question.` : "Quiz me with a real HSC-style question.")}`,
        );
        break;
      case "marker":
        router.push(`/subject/${courseId}/marker`);
        break;
      case "predictor":
        router.push(`/subject/${courseId}/predictor`);
        break;
      default:
        // creation types → study kit, auto-generating
        router.push(`/subject/${courseId}/artifacts?type=${action}${prompt ? `&topic=${enc}` : ""}&auto=1`);
    }
  }

  return (
    <div className="mt-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
        className="rounded-2xl border border-[#e3e0da] p-4 shadow-[0_1px_3px_rgba(26,24,21,0.05)]"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask anything — or name a topic and pick what to make…"
          className="w-full bg-transparent text-[15px] outline-none placeholder:text-[#b6b1aa]"
        />
        <div className="mt-4 flex items-center justify-between">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#faf9f7] text-sm text-[#8a857e]">＋</span>
          <div className="flex gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f0f6fc] text-sm text-[#2777c2]">🎙</span>
            <button
              type="submit"
              disabled={busy || subjects.length === 0}
              className="grid h-8 w-8 place-items-center rounded-full bg-[#1a1815] text-sm text-white disabled:opacity-30"
            >
              {busy ? "…" : "↑"}
            </button>
          </div>
        </div>
      </form>

      {/* what to create — your prompt becomes one of these */}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {ACTIONS.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => setAction(a.key)}
            className={`rounded-full px-4 py-2 text-[13px] font-medium ${
              action === a.key
                ? "bg-[#2777c2] text-white"
                : "bg-[#f0f6fc] text-[#2777c2] hover:bg-[#e1eefb]"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
      {busy && <p className="mt-3 text-center text-xs text-[#8a857e]">Working out which subject this is…</p>}
    </div>
  );
}
