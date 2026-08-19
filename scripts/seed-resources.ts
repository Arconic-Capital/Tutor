import "dotenv/config";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { db } from "../src/db";
import { resources } from "../src/db/schema";
import { COURSES } from "../src/lib/curriculum/courses";
import { eq } from "drizzle-orm";

interface SeedResource {
  course_id: string;
  title: string;
  url: string;
  year: number | null;
  resource_type: string;
  source: string;
  notes: string | null;
}

async function main() {
  const dir = join(__dirname, "../src/lib/curriculum/seed-resources");
  const courseIds = new Set(COURSES.map((c) => c.id));
  const all: SeedResource[] = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));

  const valid = all.filter((r) => {
    if (!courseIds.has(r.course_id)) {
      console.warn(`skipping unknown course_id: ${r.course_id} (${r.title})`);
      return false;
    }
    return true;
  });

  // replace-all for seeded links keeps the JSON files as source of truth
  await db.delete(resources).where(eq(resources.kind, "link"));
  for (let i = 0; i < valid.length; i += 50) {
    await db.insert(resources).values(
      valid.slice(i, i + 50).map((r) => ({
        courseId: r.course_id,
        title: r.title,
        kind: "link",
        url: r.url,
        year: r.year,
        resourceType: r.resource_type,
        source: r.source,
        notes: r.notes || null,
      })),
    );
  }
  console.log(`Seeded ${valid.length} link resources (${all.length - valid.length} skipped)`);
}

main().then(() => process.exit(0));
