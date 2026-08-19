import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { courses, documents, resources } from "@/db/schema";
import { eq } from "drizzle-orm";

export const maxDuration = 180;

const anthropic = new Anthropic();
const MAX_DOC_CHARS = 45_000;

export async function POST(req: Request) {
  const { courseId, question, answer, imageBase64, imageType } = (await req.json()) as {
    courseId: string;
    question: string;
    answer: string;
    imageBase64?: string; // photo of handwritten working
    imageType?: string;
  };
  if (!courseId || !question?.trim() || (!answer?.trim() && !imageBase64)) {
    return new Response("courseId, question and an answer (typed or photographed) required", { status: 400 });
  }

  const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
  if (!course) return new Response("unknown course", { status: 404 });

  // marking guidelines + examiner feedback are the marker's source of truth
  const docs = (
    await db
      .select({ title: documents.title, kind: documents.kind, text: documents.text, year: resources.year })
      .from(documents)
      .innerJoin(resources, eq(documents.resourceId, resources.id))
      .where(eq(resources.courseId, courseId))
  )
    .filter((d) => d.kind === "guidelines_pdf" || d.kind === "page_text")
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    .slice(0, 6);

  const docContext = docs.length
    ? docs.map((d) => `\n\n===== ${d.title} =====\n${d.text.slice(0, MAX_DOC_CHARS)}`).join("")
    : "(No official marking guidelines ingested — mark against general NSW HSC standards.)";

  const stream = anthropic.messages.stream({
    model: "claude-opus-5",
    max_tokens: 6000,
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            awarded: { type: "number" },
            out_of: { type: "number" },
            band_comment: { type: "string" },
            criteria: {
              type: "array",
              items: {
                type: "object",
                properties: { met: { type: "boolean" }, text: { type: "string" } },
                required: ["met", "text"],
                additionalProperties: false,
              },
            },
            feedback: { type: "string" },
            band6_answer: { type: "string" },
          },
          required: ["awarded", "out_of", "band_comment", "criteria", "feedback", "band6_answer"],
          additionalProperties: false,
        },
      },
    },
    system: [
      {
        type: "text",
        text: `You are an experienced NSW HSC marker for ${course.name}. Mark the student's answer exactly the way NESA markers do: against marking-guideline criteria, at real HSC standard — fair but strict. Use the actual marking guidelines and examiner feedback provided as your calibration.

- Infer the mark allocation from the question (e.g. "(7 marks)"); if not stated, judge a sensible allocation from similar past questions.
- criteria: the marking-guideline-style criteria for full marks, each marked met/not met for THIS answer.
- band_comment: e.g. "mid Band 5 quality response".
- feedback: markdown — what earned marks, what lost marks, exactly what to add or fix. Reference examiner feedback patterns where relevant. Use $...$ for any maths.
- band6_answer: a model full-mark answer in markdown, written the way the marking guidelines reward.`,
      },
      { type: "text", text: docContext, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: [
          ...(imageBase64
            ? ([{
                type: "image" as const,
                source: {
                  type: "base64" as const,
                  media_type: (imageType ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/webp",
                  data: imageBase64,
                },
              }] as const)
            : []),
          {
            type: "text" as const,
            text: `QUESTION:\n${question.slice(0, 4000)}\n\nSTUDENT ANSWER${imageBase64 ? " (photographed working attached — read it carefully, including handwriting)" : ""}:\n${(answer ?? "").slice(0, 8000) || "(see photo)"}`,
          },
        ],
      },
    ],
  });

  const final = await stream.finalMessage();
  const block = final.content.find((b) => b.type === "text");
  if (!block) return new Response("marking failed", { status: 502 });
  return new Response(block.text, { headers: { "Content-Type": "application/json" } });
}
