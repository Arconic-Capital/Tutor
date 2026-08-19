import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { courses, documents, resources, artifacts } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export const maxDuration = 300;

const anthropic = new Anthropic();
const MAX_TOTAL_CHARS = 550_000;

export async function GET(req: Request) {
  const courseId = new URL(req.url).searchParams.get("courseId");
  if (!courseId) return Response.json(null);
  const [latest] = await db
    .select()
    .from(artifacts)
    .where(and(eq(artifacts.courseId, courseId), eq(artifacts.type, "prediction")))
    .orderBy(desc(artifacts.createdAt))
    .limit(1);
  return Response.json(latest ?? null);
}

export async function POST(req: Request) {
  const { courseId } = (await req.json()) as { courseId: string };
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
  if (!course) return new Response("unknown course", { status: 404 });

  // every ingested exam paper + examiner feedback page, newest first
  const all = (
    await db
      .select({ title: documents.title, kind: documents.kind, text: documents.text, year: resources.year })
      .from(documents)
      .innerJoin(resources, eq(documents.resourceId, resources.id))
      .where(eq(resources.courseId, courseId))
  )
    .filter((d) => d.kind === "exam_pdf" || d.kind === "page_text")
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

  if (all.length === 0) return new Response("no exam papers ingested for this course", { status: 404 });

  let total = 0;
  const docs = all.filter((d) => {
    if (total + d.text.length > MAX_TOTAL_CHARS) return false;
    total += d.text.length;
    return true;
  });
  const years = [...new Set(docs.map((d) => d.year).filter(Boolean))].sort();

  const docContext = docs
    .map((d) => `\n\n===== ${d.title} (${d.year ?? "?"}) =====\n${d.text}`)
    .join("");

  const stream = anthropic.messages.stream({
    model: "claude-opus-5",
    max_tokens: 24000, // adaptive thinking shares this budget with the JSON output
    output_config: {
      effort: "medium",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            topics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  weight: { type: "number" },
                  note: { type: "string" },
                },
                required: ["name", "weight", "note"],
                additionalProperties: false,
              },
            },
            predictions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  likelihood: { type: "number" },
                  rationale: { type: "string" },
                },
                required: ["title", "likelihood", "rationale"],
                additionalProperties: false,
              },
            },
          },
          required: ["summary", "topics", "predictions"],
          additionalProperties: false,
        },
      },
    },
    system: [
      {
        type: "text",
        text: `You are an exam analyst for NSW HSC ${course.name}. You are given the full text of the actual HSC exam papers (${years.join(", ")}) plus examiner feedback. Produce a rigorous prediction analysis for the NEXT exam:

- topics: 6-10 syllabus topics/modules with weight = approximate total marks they attracted across the provided papers (count the actual questions), and a one-line note (trend, question style).
- predictions: 6-8 specific question predictions for the next paper. likelihood = 0-100. Base each on real patterns: high-frequency topics, question types that rotate, topics conspicuously absent for 2+ years, examiner-feedback pain points. rationale must cite actual years/questions (e.g. "asked 2019-2022 as a 7-marker, absent since").
- summary: 2-3 sentences on the overall shape of the exam and where a student should concentrate.
Be concrete and honest — these are pattern-based probabilities, not guarantees.`,
      },
      { type: "text", text: docContext, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: "Run the full analysis." }],
  });

  const final = await stream.finalMessage();
  const block = final.content.find((b) => b.type === "text");
  if (!block) return new Response("analysis failed", { status: 502 });

  const [saved] = await db
    .insert(artifacts)
    .values({
      courseId,
      type: "prediction",
      title: `${course.name} — exam prediction (${new Date().toLocaleDateString("en-AU")})`,
      content: block.text,
      sourceTitles: docs.map((d) => `${d.year ?? ""} ${d.kind === "exam_pdf" ? "paper" : "feedback"}`).join(" | "),
    })
    .returning();

  return Response.json(saved);
}
