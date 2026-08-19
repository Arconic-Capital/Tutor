"use client";

import { useCallback, useEffect, useState } from "react";

interface Plan {
  headline: string;
  weeks: { label: string; items: { course: string; task: string; minutes: number }[] }[];
}

export default function PlanView() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/plan");
    const row = await res.json();
    if (row) {
      setPlan(JSON.parse(row.content));
      setCreatedAt(row.createdAt);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function regenerate() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/plan", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const row = await res.json();
      setPlan(JSON.parse(row.content));
      setCreatedAt(row.createdAt);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-[#8a857e]">
          Built from your subjects, trial date, and quiz mastery — it re-weights as your scores change.
        </p>
        <button
          onClick={regenerate}
          disabled={busy}
          className="shrink-0 rounded-full bg-[#1a1815] px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {busy ? "Planning…" : plan ? "Re-plan" : "Build my plan"}
        </button>
      </div>
      {busy && <p className="mt-2 text-xs text-[#8a857e]">Weighing your weak spots — about a minute…</p>}
      {error && <p className="mt-2 text-xs text-[#a44a3c]">{error}</p>}

      {loaded && !plan && !busy && (
        <p className="py-16 text-center text-sm text-[#8a857e]">
          No plan yet. Do a few quiz questions first so it knows your weak spots — or build one now.
        </p>
      )}

      {plan && (
        <div className="mt-6">
          <p className="text-[15px] font-medium">{plan.headline}</p>
          {createdAt && (
            <p className="mt-1 text-xs text-[#b6b1aa]">
              Planned {new Date(createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
            </p>
          )}
          {plan.weeks.map((w, i) => (
            <div key={i} className="mt-6 border-t border-[#eeece8] pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#b6b1aa]">{w.label}</p>
              <ul className="mt-2">
                {w.items.map((it, j) => (
                  <li key={j} className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
                    <span>
                      <span className="font-semibold">{it.course}</span>{" "}
                      <span className="text-[#6e6862]">— {it.task}</span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-[#b6b1aa]">{it.minutes} min</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
