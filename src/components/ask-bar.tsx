"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Home ask bar: pick a subject (defaults to first), type, and you land in that subject's tutor. */
export default function AskBar({ subjects }: { subjects: { id: string; name: string }[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [courseId, setCourseId] = useState(subjects[0]?.id ?? "");

  function go() {
    if (!courseId) return;
    const query = q.trim();
    router.push(`/subject/${courseId}/tutor${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
      className="mt-8 rounded-2xl border border-[#e3e0da] p-4 shadow-[0_1px_3px_rgba(26,24,21,0.05)]"
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ask anything…"
        className="w-full bg-transparent text-[15px] outline-none placeholder:text-[#b6b1aa]"
      />
      <div className="mt-4 flex items-center justify-between gap-3">
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="rounded-full border border-[#eeece8] bg-[#faf9f7] px-3 py-1.5 text-[13px] text-[#8a857e] outline-none"
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!courseId}
          className="grid h-9 w-9 place-items-center rounded-full bg-[#1a1815] text-sm text-white disabled:opacity-30"
        >
          ↑
        </button>
      </div>
    </form>
  );
}
