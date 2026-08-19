import { db } from "@/db";
import { topics } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(req: Request) {
  const courseId = new URL(req.url).searchParams.get("courseId");
  if (!courseId) return Response.json([]);
  const list = await db
    .select({ id: topics.id, name: topics.name })
    .from(topics)
    .where(eq(topics.courseId, courseId))
    .orderBy(asc(topics.sortOrder));
  return Response.json(list);
}
