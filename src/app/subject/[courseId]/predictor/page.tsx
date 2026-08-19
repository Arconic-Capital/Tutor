"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface Prediction {
  summary: string;
  topics: { name: string; weight: number; note: string }[];
  predictions: { title: string; likelihood: number; rationale: string }[];
}

export default function PredictorPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const [data, setData] = useState<Prediction | null>(null);
  const [meta, setMeta] = useState<{ title: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/predictor?courseId=${courseId}`);
    const row = await res.json();
    if (row) {
      setData(JSON.parse(row.content));
      setMeta({ title: row.title });
    }
    setLoaded(true);
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  async function run() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/predictor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const row = await res.json();
      setData(JSON.parse(row.content));
      setMeta({ title: row.title });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const maxWeight = Math.max(1, ...(data?.topics.map((t) => t.weight) ?? [1]));

  return (
    <div className="mx-auto max-w-3xl py-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-[#8a857e]">
          Every ingested HSC paper for this course, analysed for topic frequency, rotation patterns and gaps.
        </p>
        <button
          onClick={run}
          disabled={busy}
          className="shrink-0 rounded-full bg-[#1a1815] px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {busy ? "Analysing…" : data ? "Re-run analysis" : "Run analysis"}
        </button>
      </div>
      {busy && (
        <p className="mt-3 text-xs text-[#8a857e]">
          Reading every past paper cover to cover — this takes 1-3 minutes…
        </p>
      )}
      {error && <p className="mt-3 text-xs text-[#a44a3c]">{error}</p>}

      {loaded && !data && !busy && (
        <p className="py-16 text-center text-sm text-[#8a857e]">
          No analysis yet — run it once and it's saved for the whole cohort.
        </p>
      )}

      {data && (
        <div className="mt-6">
          <p className="text-[15px] leading-relaxed">{data.summary}</p>
          {meta && <p className="mt-1 text-xs text-[#b6b1aa]">{meta.title}</p>}

          <h2 className="mb-3 mt-9 text-[15px] font-semibold">What this exam actually asks</h2>
          <div className="flex flex-col gap-2.5">
            {data.topics.map((t) => (
              <div key={t.name} className="grid grid-cols-[170px_1fr_36px] items-center gap-3 text-[13px]">
                <span className="truncate text-[#6e6862]" title={t.note}>{t.name}</span>
                <div className="h-2 overflow-hidden rounded-full bg-[#faf9f7]">
                  <div
                    className="h-full rounded-full bg-[#2777c2]"
                    style={{ width: `${(t.weight / maxWeight) * 100}%` }}
                  />
                </div>
                <span className="text-right text-xs tabular-nums text-[#b6b1aa]">{t.weight}</span>
              </div>
            ))}
          </div>

          <h2 className="mb-1 mt-10 text-[15px] font-semibold">Likely in the next paper</h2>
          <ul>
            {data.predictions
              .slice()
              .sort((a, b) => b.likelihood - a.likelihood)
              .map((p, i) => (
                <li key={i} className="border-t border-[#eeece8] py-3.5 first:border-t-0">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-sm font-semibold">{p.title}</span>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums text-[#2777c2]">
                      {Math.round(p.likelihood)}%
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-[#8a857e]">{p.rationale}</p>
                </li>
              ))}
          </ul>

          <div className="mt-8 rounded-xl bg-[#f0f6fc] p-4 text-[13.5px] text-[#1e5e8e]">
            Turn this into practice:{" "}
            <Link href={`/subject/${courseId}/artifacts`} className="font-semibold underline">
              generate a practice paper
            </Link>{" "}
            in the Study kit using the top predictions as the topic.
          </div>
        </div>
      )}
    </div>
  );
}
