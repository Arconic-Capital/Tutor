import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { threads, threadReplies, courses, documents, resources } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export const maxDuration = 120;

const anthropic = new Anthropic();

export async function GET(req: Request) {
  const url = new URL(req.url);
  const courseId = url.searchParams.get("courseId");
  const threadId = url.searchParams.get("threadId");

  if (threadId) {
    const replies = await db
      .select()
      .from(threadReplies)
      .where(eq(threadReplies.threadId, threadId))
      .orderBy(threadReplies.createdAt);
    return Response.json(replies);
  }

  if (!courseId) return Response.json([]);
  const list = await db
    .select({
      id: threads.id,
      title: threads.title,
      body: threads.body,
      votes: threads.votes,
      createdAt: threads.createdAt,
      replyCount: sql<number>`(select count(*)::int from thread_replies tr where tr.thread_id = threads.id)`,
    })
    .from(threads)
    .where(eq(threads.courseId, courseId))
    .orderBy(desc(threads.votes), desc(threads.createdAt));
  return Response.json(list);
}

async function tutorReply(courseId: string, threadTitle: string, question: string): Promise<string> {
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
  const docs = (
    await db
      .select({ title: documents.title, text: documents.text, year: resources.year })
      .from(documents)
      .innerJoin(resources, eq(documents.resourceId, resources.id))
      .where(eq(resources.courseId, courseId))
  )
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    .slice(0, 3);
  const ctx = docs.map((d) => `\n===== ${d.title} =====\n${d.text.slice(0, 30_000)}`).join("");
  const stream = anthropic.messages.stream({
    model: "claude-opus-5",
    max_tokens: 1500,
    output_config: { effort: "low" },
    system: [
      {
        type: "text",
        text: `You are @tutor in a ${course?.name ?? courseId} forum for Sydney Boys High HSC students. Answer the thread's question concisely and helpfully, citing past papers/guidelines where relevant. Markdown, $...$ for maths, keep it short — this is a forum reply, not an essay.`,
      },
      { type: "text", text: ctx || "(no documents)", cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: `Thread: ${threadTitle}\n\n${question.slice(0, 2000)}` }],
  });
  const final = await stream.finalMessage();
  return final.content.find((b) => b.type === "text")?.text ?? "";
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    action: "create" | "reply" | "vote";
    courseId?: string;
    threadId?: string;
    title?: string;
    text?: string;
  };

  if (body.action === "create" && body.courseId && body.title?.trim()) {
    const [t] = await db
      .insert(threads)
      .values({ courseId: body.courseId, title: body.title.slice(0, 200), body: body.text?.slice(0, 4000) ?? null })
      .returning();
    // summon @tutor when asked
    if (`${body.title} ${body.text ?? ""}`.includes("@tutor")) {
      const answer = await tutorReply(body.courseId, body.title, body.text ?? body.title);
      if (answer) await db.insert(threadReplies).values({ threadId: t.id, body: answer, isTutor: 1 });
    }
    return Response.json({ id: t.id });
  }

  if (body.action === "reply" && body.threadId && body.text?.trim()) {
    const [thread] = await db.select().from(threads).where(eq(threads.id, body.threadId));
    if (!thread) return new Response("thread not found", { status: 404 });
    await db.insert(threadReplies).values({ threadId: body.threadId, body: body.text.slice(0, 4000) });
    if (body.text.includes("@tutor")) {
      const answer = await tutorReply(thread.courseId, thread.title, body.text);
      if (answer) await db.insert(threadReplies).values({ threadId: body.threadId, body: answer, isTutor: 1 });
    }
    return Response.json({ ok: true });
  }

  if (body.action === "vote" && body.threadId) {
    await db
      .update(threads)
      .set({ votes: sql`${threads.votes} + 1` })
      .where(eq(threads.id, body.threadId));
    return Response.json({ ok: true });
  }

  return new Response("bad request", { status: 400 });
}
