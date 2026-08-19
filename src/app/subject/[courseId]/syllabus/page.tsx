"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface Topic {
  id: string;
  name: string;
}
interface Mastery {
  [topicId: string]: { pct: number; attempts: number };
}

function Ring({ pct }: { pct: number | null }) {
  return (
    <span
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
      style={{
        background:
          pct === null
            ? "#eeece8"
            : `conic-gradient(#2777c2 ${pct * 3.6}deg, #eeece8 0deg)`,
      }}
    >
      <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[10px] font-semibold text-[#6e6862]">
        {pct === null ? "–" : pct}
      </span>
    </span>
  );
}

export default function SyllabusPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const [topicList, setTopicList] = useState<Topic[]>([]);
  const [mastery, setMastery] = useState<Mastery>({});
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const [tRes, mRes] = await Promise.all([
      fetch(`/api/topics?courseId=${courseId}`),
      fetch(`/api/quiz?courseId=${courseId}`),
    ]);
    if (tRes.ok) setTopicList(await tRes.json());
    if (mRes.ok) setMastery(await mRes.json());
    setLoaded(true);
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const attempted = topicList.filter((t) => mastery[t.id]);
  const overall =
    attempted.length > 0
      ? Math.round(attempted.reduce((s, t) => s + mastery[t.id].pct, 0) / attempted.length)
      : null;

  if (loaded && topicList.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-[#8a857e]">
        <p>Modules for this course haven&apos;t been loaded yet — priority HSC subjects come first.</p>
        <Link href={`/subject/${courseId}/quiz`} className="mt-4 inline-block rounded-full bg-[#1a1815] px-5 py-2 text-sm font-semibold text-white">
          Quiz me anyway
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-6">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-[#8a857e]">
          NESA modules, built in. Rings fill as you quiz — from your real marked scores.
        </p>
        {overall !== null && (
          <span className="rounded-full bg-[#f0f6fc] px-3 py-1 text-[12px] font-semibold text-[#2777c2]">
            Mastery {overall}%
          </span>
        )}
      </div>

      <ul className="mt-4">
        {topicList.map((t) => {
          const m = mastery[t.id];
          return (
            <li key={t.id} className="flex items-center gap-4 border-t border-[#eeece8] py-3.5 first:border-t-0">
              <Ring pct={m ? m.pct : null} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-[#b6b1aa]">
                  {m ? `${m.attempts} question${m.attempts === 1 ? "" : "s"} attempted` : "Not yet attempted"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/subject/${courseId}/tutor?q=${encodeURIComponent(`Teach me the key ideas of ${t.name} the way the HSC examines them.`)}`}
                  className="rounded-full bg-[#faf9f7] px-3.5 py-1.5 text-[12.5px] text-[#8a857e] hover:text-[#1a1815]"
                >
                  Learn
                </Link>
                <Link
                  href={`/subject/${courseId}/quiz?topicId=${t.id}&topic=${encodeURIComponent(t.name)}`}
                  className="rounded-full bg-[#f0f6fc] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#2777c2] hover:bg-[#e1eefb]"
                >
                  Quiz ›
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
