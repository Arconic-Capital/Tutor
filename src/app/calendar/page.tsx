import Link from "next/link";
import Shell from "@/components/shell";
import { eventsForDate, upcomingWork, weekCycleFor, localIso, keyPoints, type DayEvent } from "@/lib/schedule";
import AssistantPanel from "@/components/assistant-panel";

const KIND_COLOR: Record<string, string> = {
  class: "bg-white border-[#e3e0da]",
  sport: "bg-[#e7f3ec] border-[#bcdcc9]",
  tutoring: "bg-[#fbf0dc] border-[#ebd3a8]",
  extracurricular: "bg-[#f0f6fc] border-[#bfe0f5]",
  study_block: "bg-[#f0f6fc] border-[#2777c2]",
  other: "bg-white border-[#e3e0da]",
};

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay() === 0 ? 7 : x.getDay();
  x.setDate(x.getDate() - (day - 1));
  x.setHours(0, 0, 0, 0);
  return x;
}
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const iso = localIso;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; from?: string }>;
}) {
  const { view = "week", from } = await searchParams;
  const base = from ? new Date(from) : new Date();

  const work = await upcomingWork(120);

  if (view === "month") {
    // month density view
    const first = new Date(base.getFullYear(), base.getMonth(), 1);
    const gridStart = startOfWeek(first);
    const cells: Date[] = Array.from({ length: 35 }, (_, i) => addDays(gridStart, i));
    const monthLabel = base.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
    const prev = new Date(base.getFullYear(), base.getMonth() - 1, 1);
    const next = new Date(base.getFullYear(), base.getMonth() + 1, 1);

    return (
      <div className="min-h-screen bg-white">
        <Shell activeCourseId="all" />
        <main className="mx-auto max-w-4xl px-6 py-8">
          <Header view="month" label={monthLabel} prevHref={`/calendar?view=month&from=${iso(prev)}`} nextHref={`/calendar?view=month&from=${iso(next)}`} />
          <div className="mt-4 grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-[#eeece8] bg-[#eeece8]">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="bg-[#faf9f7] px-2 py-1.5 text-center text-[11px] font-semibold text-[#8a857e]">{d}</div>
            ))}
            {cells.map((d, i) => {
              const due = work.filter((w) => w.dueDate && iso(w.dueDate) === iso(d));
              const inMonth = d.getMonth() === base.getMonth();
              const isToday = iso(d) === iso(new Date());
              const heat = due.reduce((s, w) => s + (w.weighting ?? 10), 0);
              return (
                <div key={i} className={`min-h-[84px] bg-white p-1.5 ${inMonth ? "" : "opacity-40"} ${heat >= 60 ? "bg-[#f9e7e4]/60" : heat >= 25 ? "bg-[#fbf0dc]/60" : ""}`}>
                  <span className={`text-[11px] tabular-nums ${isToday ? "rounded-full bg-[#1a1815] px-1.5 py-0.5 font-semibold text-white" : "text-[#8a857e]"}`}>
                    {d.getDate()}
                  </span>
                  {due.map((w) => (
                    <p key={w.id} className="mt-1 truncate rounded bg-[#f9e7e4] px-1 py-0.5 text-[10px] font-medium text-[#9c3b2e]" title={`${w.courseName}: ${w.title}`}>
                      {w.courseName?.split(" ")[0]} {w.weighting ? `${w.weighting}%` : w.kind}
                    </p>
                  ))}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-[#b6b1aa]">Shaded days = assessment weight stacking up. Spot the pile-ups a month out, not the night before.</p>
        </main>
      </div>
    );
  }

  // week view
  const weekStart = startOfWeek(base);
  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)); // Mon-Sat
  const perDay: DayEvent[][] = await Promise.all(days.map((d) => eventsForDate(d)));
  const cycle = weekCycleFor(weekStart);
  const label = `${weekStart.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} – ${addDays(weekStart, 5).toLocaleDateString("en-AU", { day: "numeric", month: "short" })} · Week ${cycle}`;

  return (
    <div className="min-h-screen bg-white">
      <Shell activeCourseId="all" />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Header view="week" label={label} prevHref={`/calendar?from=${iso(addDays(weekStart, -7))}`} nextHref={`/calendar?from=${iso(addDays(weekStart, 7))}`} />
        <div className="mt-4 grid grid-cols-6 gap-2">
          {days.map((d, i) => {
            const due = work.filter((w) => w.dueDate && iso(w.dueDate) === iso(d));
            const isToday = iso(d) === iso(new Date());
            return (
              <div key={i} className="min-w-0">
                <p className={`mb-1.5 text-center text-[12px] font-semibold ${isToday ? "text-[#2777c2]" : "text-[#8a857e]"}`}>
                  {d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric" })}
                </p>
                {due.map((w) => (
                  <p key={w.id} className="mb-1 truncate rounded-lg bg-[#f9e7e4] px-2 py-1 text-[10.5px] font-semibold text-[#9c3b2e]" title={`${w.courseName}: ${w.title}`}>
                    ⚑ {w.title.slice(0, 22)}
                  </p>
                ))}
                <div className="flex flex-col gap-1">
                  {perDay[i].map((e) => {
                    const pts = keyPoints(e, work).slice(0, 2);
                    return (
                      <div key={e.id} className={`rounded-lg border px-2 py-1 ${KIND_COLOR[e.kind] ?? KIND_COLOR.other}`} title={`${e.title} ${e.startTime ?? ""}`}>
                        <p className="truncate text-[11px] font-medium">{e.title}</p>
                        <p className="text-[10px] tabular-nums text-[#8a857e]">{e.startTime}{e.endTime && `–${e.endTime}`}</p>
                        {pts.map((pt, j) => (
                          <p key={j} className="mt-0.5 truncate text-[9.5px] leading-tight text-[#8a857e]" title={pt}>· {pt}</p>
                        ))}
                      </div>
                    );
                  })}
                  {perDay[i].length === 0 && <p className="py-4 text-center text-[11px] text-[#d9d5ce]">—</p>}
                </div>
              </div>
            );
          })}
        </div>
      </main>
      <AssistantPanel />
    </div>
  );
}

function Header({ view, label, prevHref, nextHref }: { view: string; label: string; prevHref: string; nextHref: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight">{label}</h1>
        <Link href={prevHref} className="rounded-full border border-[#e3e0da] px-2.5 py-0.5 text-sm text-[#8a857e]">‹</Link>
        <Link href={nextHref} className="rounded-full border border-[#e3e0da] px-2.5 py-0.5 text-sm text-[#8a857e]">›</Link>
      </div>
      <div className="flex gap-1 text-[13px]">
        <Link href="/calendar" className={`rounded-full px-3.5 py-1.5 ${view === "week" ? "bg-[#f0f6fc] font-semibold text-[#2777c2]" : "text-[#8a857e]"}`}>Week</Link>
        <Link href="/calendar?view=month" className={`rounded-full px-3.5 py-1.5 ${view === "month" ? "bg-[#f0f6fc] font-semibold text-[#2777c2]" : "text-[#8a857e]"}`}>Month</Link>
        <Link href="/setup" className="rounded-full px-3.5 py-1.5 text-[#8a857e] hover:text-[#1a1815]">+ Add</Link>
      </div>
    </div>
  );
}
