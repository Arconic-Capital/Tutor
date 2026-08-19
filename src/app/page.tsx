import { getCurrentUserId } from "@/lib/auth/current-user";
import { db } from "@/db";
import { users, userCourses, courses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Dashboard() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/signin");

  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (!me?.yearLevel) redirect("/onboarding");

  const myCourses = await db
    .select({ id: courses.id, name: courses.name })
    .from(userCourses)
    .innerJoin(courses, eq(userCourses.courseId, courses.id))
    .where(eq(userCourses.userId, userId))
    .orderBy(courses.name);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-2xl font-bold">Year {me.yearLevel}</h1>
      <p className="mb-6 text-sm text-gray-600">Your subjects</p>
      <ul className="grid grid-cols-2 gap-3">
        {myCourses.map((c) => (
          <li key={c.id} className="rounded border p-4">
            <span className="font-medium">{c.name}</span>
            {/* Phase 2: links to course library; Phase 3: AI tools */}
          </li>
        ))}
      </ul>
      {myCourses.length === 0 && (
        <p>
          No subjects yet —{" "}
          <Link className="underline" href="/onboarding">
            set up your profile
          </Link>
          .
        </p>
      )}
    </main>
  );
}
