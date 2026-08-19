import "dotenv/config";
import { db } from "../src/db";
import { courses, topics } from "../src/db/schema";
import { COURSES } from "../src/lib/curriculum/courses";
import { eq } from "drizzle-orm";

async function main() {
  for (const c of COURSES) {
    await db
      .insert(courses)
      .values({
        id: c.id, name: c.name, stage: c.stage,
        yearLevels: c.yearLevels, category: c.category,
        syllabusNote: c.syllabusNote ?? null,
      })
      .onConflictDoUpdate({
        target: courses.id,
        set: { name: c.name, stage: c.stage, yearLevels: c.yearLevels, category: c.category, syllabusNote: c.syllabusNote ?? null },
      });
    // topics: replace-all per course keeps config as source of truth
    await db.delete(topics).where(eq(topics.courseId, c.id));
    if (c.topics.length) {
      await db.insert(topics).values(
        c.topics.map((name, i) => ({ courseId: c.id, name, sortOrder: i })),
      );
    }
  }
  console.log(`Seeded ${COURSES.length} courses`);
}

main().then(() => process.exit(0));
