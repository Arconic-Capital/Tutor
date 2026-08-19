import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth/current-user";
import Shell, { getMyCourses } from "@/components/shell";
import AskBar from "@/components/ask-bar";
import { eventsForDate, upcomingWork, freeGaps, weekCycleFor } from "@/lib/schedule";

const KIND_STYLES: Record<string, string> = {
  class: "border-[#eeece8] bg-white",
  sport: "border-[#e7f3ec] bg-[#e7f3ec]/50",
  tutoring: "border-[#fbf0dc] bg-[#fbf0dc]/50",
  extracurricular: "border-[#f0f6fc] bg-[#f0f6fc]/60",
  study_block: "border-[#bfe0f5] bg-[#f0f6fc]",
  other: "border-[#eeece8] bg-white",
};

export default async function Today() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/signin");
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (!me?.yearLevel) redirect("/onboarding");

  const now = new Date();
  const [my, dayEvents, work] = await Promise.all([
    getMyCourses(userId),
    eventsForDate(now),
    upcomingWork(45),
  ]);
  const gaps = freeGaps(dayEvents);
  const cycle = weekCycleFor(now);
  const hasSchedule = dayEvents.length > 0 || work.length > 0;

  // tonight: the 3 most pressing items (soonest due, weighted higher first on ties)
  const tonight = [...work]
    .sort((a, b) => (a.daysAway ?? 99) - (b.daysAway ?? 99) || (b.weighting ?? 0) - (a.weighting ?? 0))
    .slice(0, 3);

  const dateLabel = now.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="min-h-screen bg-white">
      <Shell activeCourseId="all" />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="flex items-baseline justify-between">
          <h1 className="text-[22px] font-semibold tracking-tight">{dateLabel}</h1>
          <span className="text-xs text-[#b6b1aa]">Week {cycle} · <Link href="/calendar" className="underline hover:text-[#1a1815]">calendar</Link></span>
        </div>

        {/* countdown chips */}
        {work.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {work.slice(0, 4).map((w) => (
              <span
                key={w.id}
                className={`rounded-full px-3 py-1 text-[12px] font-medium ${(w.daysAway ?? 99) <= 7 ? "bg-[#f9e7e4] text-[#9c3b2e]" : "bg-[#faf9f7] text-[#6e6862]"}`}
              >
                {w.courseName?.split(" ")[0] ?? ""} {w.title.length > 26 ? w.title.slice(0, 26) + "…" : w.title}
                {w.daysAway !== null && ` · ${w.daysAway <= 0 ? "today" : `${w.daysAway}d`}`}
              </span>
            ))}
          </div>
        )}

        {!hasSchedule && (
          <div className="mt-8 rounded-2xl border border-dashed border-[#d9d5ce] p-8 text-center">
            <p className="text-sm font-medium">Your calendar is empty.</p>
            <p className="mt-1 text-[13px] text-[#8a857e]">
              Upload your timetable, assessment schedules, tutoring and sport times — it builds itself.
            </p>
            <Link href="/setup" className="mt-4 inline-block rounded-full bg-[#1a1815] px-6 py-2 text-sm font-semibold text-white">
              Feed it your life →
            </Link>
          </div>
        )}

        {/* today timeline */}
        {dayEvents.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#b6b1aa]">Today</p>
            <div className="flex flex-col gap-1.5">
              {dayEvents.map((e) => (
                <div key={e.id} className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${KIND_STYLES[e.kind] ?? KIND_STYLES.other}`}>
                  <span className="w-24 shrink-0 text-[12px] tabular-nums text-[#8a857e]">
                    {e.startTime}{e.endTime && `–${e.endTime}`}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {e.courseId ? (
                      <Link href={`/subject/${e.courseId}`} className="hover:text-[#2777c2]">{e.title}</Link>
                    ) : (
                      e.title
                    )}
                  </span>
                  {e.location && <span className="shrink-0 text-xs text-[#b6b1aa]">{e.location}</span>}
                </div>
              ))}
            </div>
            {gaps.length > 0 && (
              <p className="mt-2.5 text-[12.5px] text-[#8a857e]">
                Free today: {gaps.map((g) => `${g.start}–${g.end} (${g.minutes}m)`).join(" · ")}
                {tonight[0] && (
                  <> — enough to make a dent in <span className="font-medium text-[#1a1815]">{tonight[0].title}</span>.</>
                )}
              </p>
            )}
          </div>
        )}

        {/* tonight */}
        {tonight.length > 0 && (
          <div className="mt-8">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#b6b1aa]">Most pressing</p>
            <ul>
              {tonight.map((w) => (
                <li key={w.id} className="flex items-baseline justify-between gap-4 border-t border-[#eeece8] py-3 first:border-t-0">
                  <span className="text-sm">
                    <span className="font-semibold">{w.courseName ?? "General"}</span>{" "}
                    <span className="text-[#6e6862]">— {w.title}{w.weighting ? ` (${w.weighting}%)` : ""}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className={`text-xs tabular-nums ${(w.daysAway ?? 99) <= 7 ? "font-semibold text-[#9c3b2e]" : "text-[#b6b1aa]"}`}>
                      {w.daysAway === null ? "" : w.daysAway <= 0 ? "due now" : `${w.daysAway} days`}
                    </span>
                    {w.courseId && (
                      <Link
                        href={`/subject/${w.courseId}/quiz`}
                        className="rounded-full bg-[#f0f6fc] px-3 py-1 text-[11.5px] font-semibold text-[#2777c2]"
                      >
                        Prep ›
                      </Link>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ask / create */}
        <div className="mt-10 border-t border-[#eeece8] pt-6">
          <AskBar subjects={my} />
        </div>
      </main>
    </div>
  );
}
