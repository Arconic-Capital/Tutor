import { db } from "@/db";
import { chats } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const courseId = url.searchParams.get("courseId");
  if (!courseId) return Response.json(null);
  const [chat] = await db
    .select()
    .from(chats)
    .where(eq(chats.courseId, courseId))
    .orderBy(desc(chats.updatedAt))
    .limit(1);
  return Response.json(chat ?? null);
}

export async function POST(req: Request) {
  const { id, courseId, messages, docIds } = (await req.json()) as {
    id?: string;
    courseId: string;
    messages: unknown[];
    docIds?: string[];
  };
  if (!courseId || !Array.isArray(messages)) return new Response("bad request", { status: 400 });

  const payload = {
    courseId,
    messages: JSON.stringify(messages).slice(0, 400_000),
    docIds: docIds?.join(",") ?? null,
    updatedAt: new Date(),
  };

  if (id) {
    await db.update(chats).set(payload).where(eq(chats.id, id));
    return Response.json({ id });
  }
  const [row] = await db.insert(chats).values(payload).returning({ id: chats.id });
  return Response.json({ id: row.id });
}
