import { db } from "@/db";
import { courses, resources, documents } from "@/db/schema";
import { count } from "drizzle-orm";
import OnboardingFlow from "./flow";

export default async function OnboardingPage() {
  const allCourses = await db.select().from(courses).orderBy(courses.name);
  const [{ n: resourceCount }] = await db.select({ n: count() }).from(resources);
  const [{ n: paperCount }] = await db.select({ n: count() }).from(documents);

  return (
    <OnboardingFlow
      courses={allCourses.map((c) => ({
        id: c.id,
        name: c.name,
        stage: c.stage,
        yearLevels: c.yearLevels,
        category: c.category,
      }))}
      stats={{ resources: resourceCount, papers: paperCount }}
    />
  );
}
