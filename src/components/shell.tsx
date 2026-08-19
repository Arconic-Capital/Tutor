import Link from "next/link";
import { db } from "@/db";
import { userCourses, courses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth/current-user";

export function CramMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect x="4" y="16" width="24" height="9" rx="3" fill="#40342b" />
      <rect x="6.5" y="10" width="19" height="9" rx="3" fill="#2777c2" />
      <rect x="9" y="4" width="14" height="9" rx="3" fill="#7db3e0" />
    </svg>
  );
}

/** Short display names for the subject bar. */
export function shortName(name: string): string {
  return name
    .replace(" (Stage 5)", "")
    .replace(" (Stage 6)", "")
    .replace("Mathematics Extension", "Maths Ext")
    .replace("Mathematics Advanced", "Maths Adv")
    .replace("English Advanced", "English Adv")
    .replace("English Extension", "English Ext")
    .replace("Software Engineering", "Software Eng")
    .replace("Health and Movement Science", "HMS")
    .replace("Studies of Religion", "SOR");
}

export async function getMyCourses(userId: string) {
  return db
    .select({ id: courses.id, name: courses.name })
    .from(userCourses)
    .innerJoin(courses, eq(userCourses.courseId, courses.id))
    .where(eq(userCourses.userId, userId))
    .orderBy(courses.name);
}

/** Top bar: brand + subject tabs + profile. activeCourseId: "all" for Home. */
export default async function Shell({ activeCourseId }: { activeCourseId: string }) {
  const userId = await getCurrentUserId();
  const my = userId ? await getMyCourses(userId) : [];

  return (
    <nav className="flex items-center justify-between gap-4 border-b border-[#eeece8] px-6 py-3">
      <Link href="/" className="flex shrink-0 items-center gap-2 text-[16px] font-bold tracking-tight">
        <CramMark />
        cram
      </Link>
      <div className="flex flex-1 flex-wrap items-center justify-center gap-1">
        <Link
          href="/"
          className={`rounded-full px-3.5 py-1.5 text-sm ${activeCourseId === "all" ? "bg-[#f0f6fc] font-semibold text-[#1a1815]" : "text-[#8a857e] hover:text-[#1a1815]"}`}
        >
          All
        </Link>
        {my.map((c) => (
          <Link
            key={c.id}
            href={`/subject/${c.id}/repository`}
            className={`rounded-full px-3.5 py-1.5 text-sm ${activeCourseId === c.id ? "bg-[#f0f6fc] font-semibold text-[#2777c2]" : "text-[#8a857e] hover:text-[#1a1815]"}`}
          >
            {shortName(c.name)}
          </Link>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-4 text-sm text-[#8a857e]">
        <Link href="/onboarding" className="hover:text-[#1a1815]">Subjects</Link>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#40342b] text-[11px] font-semibold text-white">A</span>
      </div>
    </nav>
  );
}
