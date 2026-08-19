import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { courses, topics, documents, resources, artifacts } from "@/db/schema";
import { eq, asc, inArray, desc } from "drizzle-orm";

export const maxDuration = 180;

const anthropic = new Anthropic();

const MAX_DOC_CHARS = 50_000;
const MAX_DOCS = 5;

const TYPE_SPECS: Record<string, { label: string; instruction: string }> = {
  flashcards: {
    label: "Flashcards",
    instruction:
      "Create 16-24 flashcards. Fronts are precise questions or terms; backs are exam-quality answers (concise but complete — include equations, units, definitions as the marking guidelines would expect). Mix recall, application, and common-trap cards.",
  },
  cheat_sheet: {
    label: "Cheat sheet",
    instruction:
      "Create a one-page exam cheat sheet in markdown: the highest-yield facts, formulas, processes, and mark-earning phrases. Dense but scannable — short sections with bold key terms, tables where useful. What a top student would want on one page the night before.",
  },
  study_notes: {
    label: "Study notes",
    instruction:
      "Create structured study notes in markdown covering the topic thoroughly: clear headings per syllabus dot point, explanations at Band 6 depth, worked examples where relevant, common mistakes flagged from examiner feedback, and what past papers have asked.",
  },
  formula_sheet: {
    label: "Formula sheet",
    instruction:
      "Create a formula/key-facts sheet in markdown: every formula, law, definition, and constant relevant to the topic, each with variable meanings, units, when to use it, and common traps. Go beyond the NESA reference sheet — include what students must memorise.",
  },
  practice_questions: {
    label: "Practice questions",
    instruction:
      "Create 8-10 exam-style practice questions in markdown, modelled on real past HSC questions (similar style, verbs, and mark allocations). Include mark values. After all questions, add an '## Answers' section with marking-guideline-style sample answers.",
  },
};

export async function GET(req: Request) {
  const courseId = new URL(req.url).searchParams.get("courseId");
  if (!courseId) return Response.json([]);
  const list = await db
    .select({
      id: artifacts.id,
      type: artifacts.type,
      title: artifacts.title,
      content: artifacts.content,
      sourceTitles: artifacts.sourceTitles,
      createdAt: artifacts.createdAt,
    })
    .from(artifacts)
    .where(eq(artifacts.courseId, courseId))
    .orderBy(desc(artifacts.createdAt));

  // predictions live on the Predictor tab, not in the study-kit library
  const rows = list
    .filter((a) => a.type !== "prediction")
    .map((a) => {
      let meta = "";
      let preview: { front: string; back: string } | null = null;
      if (a.type === "flashcards") {
        try {
          const cards = (JSON.parse(a.content) as { cards: { front: string; back: string }[] }).cards;
          meta = `${cards.length} cards`;
          preview = cards[0] ?? null;
        } catch {
          meta = "deck";
        }
      } else {
        meta = `${Math.max(1, Math.round(a.content.split(/\s+/).length / 200))} min read`;
      }
      const sourceCount = a.sourceTitles ? a.sourceTitles.split(" | ").length : 0;
      if (sourceCount) meta += ` · ${sourceCount} sources`;
      return { id: a.id, type: a.type, title: a.title, createdAt: a.createdAt, meta, preview };
    });
  return Response.json(rows);
}

export async function POST(req: Request) {
  const { courseId, type, topic } = (await req.json()) as {
    courseId: string;
    type: string;
    topic?: string;
  };
  const spec = TYPE_SPECS[type];
  if (!courseId || !spec) return new Response("courseId and valid type required", { status: 400 });

  const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
  if (!course) return new Response("unknown course", { status: 404 });

  const topicList = await db
    .select({ name: topics.name })
    .from(topics)
    .where(eq(topics.courseId, courseId))
    .orderBy(asc(topics.sortOrder));

  const catalogue = await db
    .select({ id: documents.id, title: documents.title, kind: documents.kind, year: resources.year })
    .from(documents)
    .innerJoin(resources, eq(documents.resourceId, resources.id))
    .where(eq(resources.courseId, courseId));

  // pick source documents: cheap selection when there's a topic, else newest
  let docIds: string[] = [];
  if (catalogue.length > 0) {
    if (topic && catalogue.length > MAX_DOCS) {
      try {
        const sel = await anthropic.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 300,
          output_config: {
            format: {
              type: "json_schema",
              schema: {
                type: "object",
                properties: { doc_ids: { type: "array", items: { type: "string" } } },
                required: ["doc_ids"],
                additionalProperties: false,
              },
            },
          },
          messages: [
            {
              role: "user",
              content: `Making ${spec.label} on "${topic}" for HSC ${course.name}. Pick the ${MAX_DOCS} most relevant documents:\n${catalogue.map((d) => `${d.id} | ${d.year ?? "?"} | ${d.kind} | ${d.title.slice(0, 90)}`).join("\n")}\nReturn their ids.`,
            },
          ],
        });
        const block = sel.content.find((b) => b.type === "text");
        docIds = block
          ? (JSON.parse(block.text) as { doc_ids: string[] }).doc_ids
              .filter((id) => catalogue.some((d) => d.id === id))
              .slice(0, MAX_DOCS)
          : [];
      } catch {
        /* fall through */
      }
    }
    if (docIds.length === 0) {
      docIds = [...catalogue]
        .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
        .slice(0, MAX_DOCS)
        .map((d) => d.id);
    }
  }

  const docs = docIds.length
    ? await db.select().from(documents).where(inArray(documents.id, docIds))
    : [];
  const sourceTitles = docs.map((d) => d.title.replace(/\s*\(PDF[^)]*\)\s*/gi, "").slice(0, 80));

  const docContext = docs.length
    ? docs.map((d) => `\n\n===== SOURCE: ${d.title} =====\n${d.text.slice(0, MAX_DOC_CHARS)}`).join("")
    : "(No official documents ingested — use general NSW HSC knowledge.)";

  const isFlashcards = type === "flashcards";
  const scope = topic?.trim() ? `Topic: ${topic.trim()}` : "Scope: the whole course, weighted to what the HSC asks most";

  const stream = anthropic.messages.stream({
    model: "claude-opus-5",
    max_tokens: 8000,
    output_config: {
      effort: "medium", // artifacts are extraction-shaped; medium keeps quality and halves the wait
      format: {
        type: "json_schema",
        schema: isFlashcards
          ? {
              type: "object",
              properties: {
                title: { type: "string" },
                cards: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { front: { type: "string" }, back: { type: "string" } },
                    required: ["front", "back"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["title", "cards"],
              additionalProperties: false,
            }
          : {
              type: "object",
              properties: { title: { type: "string" }, markdown: { type: "string" } },
              required: ["title", "markdown"],
              additionalProperties: false,
            },
      },
    },
    system: [
      {
        type: "text",
        text: `You create study materials for Sydney Boys High Year 12 students studying ${course.name} (NSW HSC).${topicList.length ? ` Course modules: ${topicList.map((t) => t.name).join("; ")}.` : ""} Ground everything in the official exam materials provided. ${spec.instruction}`,
      },
      { type: "text", text: docContext, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: `${scope}. Title it well.` }],
  });

  const final = await stream.finalMessage();
  const textBlock = final.content.find((b) => b.type === "text");
  if (!textBlock) return new Response("generation failed", { status: 502 });

  const parsed = JSON.parse(textBlock.text) as { title: string; cards?: unknown; markdown?: string };
  const content = isFlashcards ? JSON.stringify({ cards: parsed.cards }) : (parsed.markdown ?? "");

  const [saved] = await db
    .insert(artifacts)
    .values({
      courseId,
      type,
      title: parsed.title.slice(0, 140),
      prompt: topic ?? null,
      content,
      sourceTitles: sourceTitles.join(" | "),
    })
    .returning({ id: artifacts.id });

  return Response.json({ id: saved.id });
}
