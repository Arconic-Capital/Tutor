import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, resources } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth/current-user";
import Shell, { getMyCourses } from "@/components/shell";

export default async function Home() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/signin");

  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (!me?.yearLevel) redirect("/onboarding");

  const my = await getMyCourses(userId);
  const counts = await db
    .select({ courseId: resources.courseId, n: count() })
    .from(resources)
    .groupBy(resources.courseId);
  const countFor = (id: string) => counts.find((c) => c.courseId === id)?.n ?? 0;

  return (
    <div className="min-h-screen bg-white">
      <Shell activeCourseId="all" />
      <main className="mx-auto max-w-xl px-6 py-14">
        <h1 className="text-center text-[26px] font-semibold tracking-tight">
          What are we working on?
        </h1>
        <p className="mt-1 text-center text-sm text-[#8a857e]">Year {me.yearLevel} · Sydney High</p>

        {/* ask bar — wired to the tutor in the next phase */}
        <div className="mt-8 rounded-2xl border border-[#e3e0da] p-4 shadow-[0_1px_3px_rgba(26,24,21,0.05)]">
          <p className="text-[15px] text-[#b6b1aa]">Ask anything… (the tutor arrives next)</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#faf9f7] text-sm text-[#8a857e]">＋</span>
            <span className="flex gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f0f6fc] text-sm text-[#2777c2]">🎙</span>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#1a1815] text-sm text-white">↑</span>
            </span>
          </div>
        </div>

        {/* subject rows */}
        <div className="mt-12">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#b6b1aa]">Your subjects</p>
          {my.length === 0 && (
            <p className="py-6 text-sm text-[#8a857e]">
              No subjects yet — <Link href="/onboarding" className="text-[#2777c2] underline">pick your subjects</Link>.
            </p>
          )}
          <ul>
            {my.map((c) => (
              <li key={c.id} className="border-t border-[#eeece8] first:border-t-0">
                <Link href={`/subject/${c.id}/repository`} className="group flex items-center justify-between gap-3 py-3.5">
                  <span className="text-sm font-semibold group-hover:text-[#2777c2]">{c.name}</span>
                  <span className="text-xs text-[#b6b1aa]">
                    {countFor(c.id) > 0 ? `${countFor(c.id)} resources` : "not seeded yet"} ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
