import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { courses, topics, documents, resources, quizAttempts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const maxDuration = 180;

const anthropic = new Anthropic();
const MAX_DOC_CHARS = 40_000;

async function courseDocs(courseId: string, kinds: string[], limit: number) {
  return (
    await db
      .select({ title: documents.title, kind: documents.kind, text: documents.text, year: resources.year })
      .from(documents)
      .innerJoin(resources, eq(documents.resourceId, resources.id))
      .where(eq(resources.courseId, courseId))
  )
    .filter((d) => kinds.includes(d.kind))
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    .slice(0, limit);
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    action: "question" | "mark";
    courseId: string;
    topicId?: string;
    // for mark:
    question?: string;
    marks?: number;
    answer?: string;
    previous?: string[]; // question texts already asked this session
  };
  const [course] = await db.select().from(courses).where(eq(courses.id, body.courseId));
  if (!course) return new Response("unknown course", { status: 404 });

  let topicName: string | null = null;
  if (body.topicId) {
    const [t] = await db.select().from(topics).where(eq(topics.id, body.topicId));
    topicName = t?.name ?? null;
  }

  if (body.action === "question") {
    const docs = await courseDocs(body.courseId, ["exam_pdf"], 5);
    const docContext = docs.length
      ? docs.map((d) => `\n\n===== ${d.title} =====\n${d.text.slice(0, MAX_DOC_CHARS)}`).join("")
      : "(No papers ingested — write a realistic NSW HSC-style question.)";
    const stream = anthropic.messages.stream({
      model: "claude-opus-5",
      max_tokens: 6000,
      output_config: { effort: "low" },
      system: [
        {
          type: "text",
          text: `You write single exam questions for NSW HSC ${course.name}, modelled exactly on the real past papers provided (same verbs, style, mark allocations). ${topicName ? `The question must be on: ${topicName}.` : "Pick a high-yield topic."} Write ONE question, 3-7 marks, self-contained (include any data needed; no diagrams). Use $...$ for maths.${body.previous?.length ? ` Do not repeat these already-asked questions: ${body.previous.slice(-5).join(" | ").slice(0, 1500)}` : ""}

Output format — exactly this, nothing else:
MARKS: <number>
<the question text>`,
        },
        { type: "text", text: docContext, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: "Next question." }],
    });
    const final = await stream.finalMessage();
    const block = final.content.find((b) => b.type === "text");
    if (!block) return new Response("failed", { status: 502 });
    const m = block.text.match(/MARKS:\s*(\d+)\s*([\s\S]+)/);
    if (!m) return new Response("bad question format", { status: 502 });
    return Response.json({ marks: parseInt(m[1], 10), question: m[2].trim() });
  }

  // action === "mark"
  const docs = await courseDocs(body.courseId, ["guidelines_pdf", "page_text"], 4);
  const docContext = docs.length
    ? docs.map((d) => `\n\n===== ${d.title} =====\n${d.text.slice(0, MAX_DOC_CHARS)}`).join("")
    : "(Mark against general NSW HSC standards.)";
  const stream = anthropic.messages.stream({
    model: "claude-opus-5",
    max_tokens: 4000,
    output_config: { effort: "medium" },
    system: [
      {
        type: "text",
        text: `You are an HSC marker for ${course.name}. Mark strictly to marking-guideline standard. Output format — exactly this:
SCORE: <awarded>/<out_of>
<short markdown feedback: what earned marks, what was missing, one tip. Use $...$ for maths.>`,
      },
      { type: "text", text: docContext, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: `QUESTION (${body.marks} marks):\n${body.question}\n\nSTUDENT ANSWER:\n${(body.answer ?? "").slice(0, 6000) || "(blank)"}`,
      },
    ],
  });
  const final = await stream.finalMessage();
  const block = final.content.find((b) => b.type === "text");
  if (!block) return new Response("failed", { status: 502 });
  const sm = block.text.match(/SCORE:\s*(\d+)\s*\/\s*(\d+)\s*([\s\S]*)/);
  if (!sm) return new Response("bad marking format", { status: 502 });
  const marked = { awarded: parseInt(sm[1], 10), out_of: parseInt(sm[2], 10), feedback: sm[3].trim() };

  await db.insert(quizAttempts).values({
    courseId: body.courseId,
    topicId: body.topicId ?? null,
    question: (body.question ?? "").slice(0, 2000),
    answer: (body.answer ?? "").slice(0, 4000),
    awarded: marked.awarded,
    outOf: marked.out_of || body.marks || 1,
  });

  return Response.json(marked);
}

/** Mastery per topic for a course: recent-average of quiz scores. */
export async function GET(req: Request) {
  const courseId = new URL(req.url).searchParams.get("courseId");
  if (!courseId) return Response.json({});
  const attempts = await db
    .select()
    .from(quizAttempts)
    .where(eq(quizAttempts.courseId, courseId))
    .orderBy(desc(quizAttempts.createdAt))
    .limit(200);
  const byTopic: Record<string, number[]> = {};
  for (const a of attempts) {
    const key = a.topicId ?? "general";
    (byTopic[key] ??= []).push(a.awarded / Math.max(1, a.outOf));
  }
  const mastery: Record<string, { pct: number; attempts: number }> = {};
  for (const [k, scores] of Object.entries(byTopic)) {
    const recent = scores.slice(0, 5);
    mastery[k] = {
      pct: Math.round((recent.reduce((s, x) => s + x, 0) / recent.length) * 100),
      attempts: scores.length,
    };
  }
  return Response.json(mastery);
}
