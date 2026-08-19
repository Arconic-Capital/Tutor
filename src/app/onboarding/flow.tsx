"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "./actions";

interface CourseRow {
  id: string;
  name: string;
  stage: number;
  yearLevels: number[];
  category: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  english: "English",
  mathematics: "Mathematics",
  science: "Sciences",
  hsie: "HSIE",
  technology: "Technology",
  "creative-arts": "Creative Arts",
  pdhpe: "PDHPE",
  languages: "Languages",
  other: "Other",
};
const CATEGORY_ORDER = ["english", "mathematics", "science", "hsie", "technology", "creative-arts", "pdhpe", "languages", "other"];

// Stage 5 core, pre-selected for Years 9-10
const CORE_S5 = ["english-s5", "maths-s5", "science-s5", "history-s5", "geography-s5", "pdhpe-s5"];

export default function OnboardingFlow({
  courses,
  stats,
}: {
  courses: CourseRow[];
  stats: { resources: number; papers: number };
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [year, setYear] = useState<number | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [trials, setTrials] = useState("2026-09-14");
  const [busy, setBusy] = useState(false);

  const eligible = useMemo(
    () =>
      year
        ? year >= 11
          ? courses.filter((c) => c.stage === 6) // all HSC courses incl. Year-12-only extensions
          : courses.filter((c) => c.yearLevels.includes(year))
        : [],
    [courses, year],
  );
  const grouped = useMemo(() => {
    const g = new Map<string, CourseRow[]>();
    for (const cat of CATEGORY_ORDER) {
      const rows = eligible.filter((c) => c.category === cat);
      if (rows.length) g.set(cat, rows);
    }
    return g;
  }, [eligible]);

  function chooseYear(y: number) {
    setYear(y);
    setPicked(new Set(y <= 10 ? CORE_S5 : []));
    setStep(2);
  }

  function toggle(id: string) {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  }

  async function finish() {
    setBusy(true);
    try {
      await completeOnboarding({
        yearLevel: year!,
        courseIds: [...picked],
        trialsDate: trials || undefined,
      });
      setStep(4);
    } finally {
      setBusy(false);
    }
  }

  const stepLabel = (n: number, label: string) => (
    <span className={step === n ? "font-semibold text-[#2777c2]" : step > n ? "text-[#1a1815]" : ""}>
      {n} · {label}
      {step > n && " ✓"}
    </span>
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <div className="mb-10 flex items-center gap-3 text-xs text-[#b6b1aa]">
        {stepLabel(1, "Year")}
        <span>→</span>
        {stepLabel(2, "Subjects")}
        <span>→</span>
        {stepLabel(3, "Trials")}
      </div>

      {step === 1 && (
        <section>
          <h1 className="text-2xl font-semibold tracking-tight">What year are you in?</h1>
          <div className="mt-6 grid grid-cols-4 gap-3 max-sm:grid-cols-2">
            {[
              { y: 9, sub: "Stage 5" },
              { y: 10, sub: "Stage 5" },
              { y: 11, sub: "Prelim" },
              { y: 12, sub: "HSC" },
            ].map(({ y, sub }) => (
              <button
                key={y}
                onClick={() => chooseYear(y)}
                className={`rounded-xl border p-6 text-center hover:border-[#2777c2] ${year === y ? "border-[#2777c2] bg-[#f0f6fc]" : "border-[#e3e0da]"}`}
              >
                <span className="block text-2xl font-semibold">{y}</span>
                <span className="mt-1 block text-xs text-[#b6b1aa]">{sub}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && year && (
        <section>
          <h1 className="text-2xl font-semibold tracking-tight">Pick your subjects</h1>
          <p className="mt-1 text-sm text-[#8a857e]">
            Showing only Year {year} courses Sydney High runs.
            {year <= 10 && " Core subjects are pre-selected."}
          </p>
          {[...grouped.entries()].map(([cat, rows]) => (
            <div key={cat} className="mt-6">
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#b6b1aa]">
                {CATEGORY_LABELS[cat]}
              </p>
              <div className="flex flex-wrap gap-2">
                {rows.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    className={`rounded-full border px-4 py-1.5 text-[13.5px] ${
                      picked.has(c.id)
                        ? "border-[#2777c2] bg-[#f0f6fc] font-semibold text-[#2777c2]"
                        : "border-[#e3e0da] text-[#6e6862] hover:border-[#b6b1aa]"
                    }`}
                  >
                    {c.name.replace(" (Stage 5)", "").replace(" (Stage 6)", "")}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-10 flex items-center justify-between">
            <span className="text-xs text-[#b6b1aa]">{picked.size} selected</span>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="rounded-full border border-[#e3e0da] px-5 py-2 text-sm">
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={picked.size === 0}
                className="rounded-full bg-[#1a1815] px-6 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <h1 className="text-2xl font-semibold tracking-tight">
            {year === 12 ? "When are your trials?" : "When's your next exam block?"}
          </h1>
          <p className="mt-1 text-sm text-[#8a857e]">
            Powers your countdown{year === 12 ? " — pre-filled with the usual Term 3 window" : ""}. Skippable.
          </p>
          <input
            type="date"
            value={trials}
            onChange={(e) => setTrials(e.target.value)}
            className="mt-6 rounded-xl border border-[#e3e0da] px-4 py-2.5 text-sm outline-none focus:border-[#2777c2]"
          />
          <div className="mt-10 flex items-center justify-between">
            <button onClick={() => setTrials("")} className="text-xs text-[#b6b1aa] underline">
              Skip this
            </button>
            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="rounded-full border border-[#e3e0da] px-5 py-2 text-sm">
                Back
              </button>
              <button
                onClick={finish}
                disabled={busy}
                className="rounded-full bg-[#1a1815] px-6 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {busy ? "Saving…" : "Finish"}
              </button>
            </div>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">You&apos;re set.</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm text-[#8a857e]">
            {picked.size} subjects loaded — with {stats.papers} official HSC papers and marking guidelines,
            and {stats.resources} resources ready to search, ask, and turn into study materials.
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-8 rounded-full bg-[#1a1815] px-7 py-2.5 text-sm font-semibold text-white"
          >
            Ask your tutor something →
          </button>
        </section>
      )}
    </main>
  );
}
