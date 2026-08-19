import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, resources } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth/current-user";
import Shell, { getMyCourses } from "@/components/shell";
import AskBar from "@/components/ask-bar";

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
        <p className="mt-1 text-center text-sm text-[#8a857e]">
          Year {me.yearLevel} · Sydney High
          {(() => {
            const trials = new Date("2026-09-14"); // SBHS Term 3 trial window
            const days = Math.ceil((trials.getTime() - Date.now()) / 86_400_000);
            return days > 0 ? ` · trials in ${days} days` : "";
          })()}
        </p>

        <AskBar subjects={my} />

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
                <Link href={`/subject/${c.id}`} className="group flex items-center justify-between gap-3 py-3.5">
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
