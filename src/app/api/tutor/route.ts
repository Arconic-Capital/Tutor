import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { courses, topics, documents, resources } from "@/db/schema";
import { eq, asc, inArray } from "drizzle-orm";

export const maxDuration = 120;

const anthropic = new Anthropic();

const MAX_CONTEXT_CHARS = 200_000; // ~60k tokens of document text
const MAX_DOC_CHARS = 60_000;
const MAX_DOCS = 6;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Stage 1: cheap pass picks which documents matter for this conversation. */
async function selectDocuments(
  courseName: string,
  question: string,
  catalogue: { id: string; title: string; kind: string; year: number | null; textLength: number }[],
): Promise<string[]> {
  if (catalogue.length <= MAX_DOCS) return catalogue.map((d) => d.id);
  const listing = catalogue
    .map((d) => `${d.id} | ${d.year ?? "?"} | ${d.kind} | ${d.title.slice(0, 90)}`)
    .join("\n");
  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              doc_ids: { type: "array", items: { type: "string" } },
            },
            required: ["doc_ids"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "user",
          content: `A student studying HSC ${courseName} asked: "${question.slice(0, 500)}"\n\nPick the ${MAX_DOCS} most relevant documents from this catalogue (id | year | kind | title):\n${listing}\n\nPrefer recent exam papers plus their marking guidelines. Return their ids.`,
        },
      ],
    });
    const block = res.content.find((b) => b.type === "text");
    const parsed = block ? (JSON.parse(block.text) as { doc_ids: string[] }) : { doc_ids: [] };
    const valid = parsed.doc_ids.filter((id) => catalogue.some((d) => d.id === id)).slice(0, MAX_DOCS);
    if (valid.length > 0) return valid;
  } catch {
    // fall through to recency fallback
  }
  return [...catalogue]
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    .slice(0, MAX_DOCS)
    .map((d) => d.id);
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    courseId: string;
    messages: ChatMessage[];
    docIds?: string[]; // sticky per conversation so the prompt cache holds
  };
  const { courseId, messages } = body;
  if (!courseId || !messages?.length) {
    return new Response("courseId and messages required", { status: 400 });
  }

  const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
  if (!course) return new Response("unknown course", { status: 404 });

  const topicList = await db
    .select({ name: topics.name })
    .from(topics)
    .where(eq(topics.courseId, courseId))
    .orderBy(asc(topics.sortOrder));

  // catalogue of ingested documents for this course
  const catalogue = await db
    .select({
      id: documents.id,
      title: documents.title,
      kind: documents.kind,
      textLength: documents.textLength,
      year: resources.year,
    })
    .from(documents)
    .innerJoin(resources, eq(documents.resourceId, resources.id))
    .where(eq(resources.courseId, courseId));

  // pick documents once per conversation (client echoes docIds back on later turns)
  let docIds = body.docIds?.filter((id) => catalogue.some((d) => d.id === id)) ?? [];
  if (docIds.length === 0 && catalogue.length > 0) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    docIds = await selectDocuments(course.name, lastUser?.content ?? "", catalogue);
  }

  let contextChars = 0;
  const docs = docIds.length
    ? (await db.select().from(documents).where(inArray(documents.id, docIds))).filter((d) => {
        if (contextChars + Math.min(d.textLength, MAX_DOC_CHARS) > MAX_CONTEXT_CHARS) return false;
        contextChars += Math.min(d.textLength, MAX_DOC_CHARS);
        return true;
      })
    : [];

  const sources = docs.map((d) => d.title.replace(/\s*\(PDF[^)]*\)\s*/gi, "").slice(0, 80));

  const stableIntro = `You are Cram, the study tutor for Sydney Boys High School students. You are helping a Year 12 student with ${course.name} (NSW HSC).

Rules:
- Ground every answer in the NSW syllabus and the official exam materials provided below. Cite sources inline in square brackets, e.g. [2023 HSC Q21] or [2024 marking guidelines].
- When relevant, say which syllabus module/topic the point belongs to.${topicList.length ? ` The modules for this course: ${topicList.map((t) => t.name).join("; ")}.` : ""}
- Be exam-focused: what earns marks, what the marking guidelines reward, common mistakes from examiner feedback.
- Explain clearly at a strong Year 12 level. Keep responses focused and concise; go deep only when asked.
- If asked to quiz the student, ask one question at a time in real HSC style, then mark their answer against the guidelines' standards.
- If something isn't covered by the provided materials, say so and answer from general knowledge, flagged as such.`;

  const docContext = docs.length
    ? docs
        .map((d) => `\n\n===== SOURCE: ${d.title} (${d.kind.replace("_", " ")}) =====\n${d.text.slice(0, MAX_DOC_CHARS)}`)
        .join("")
    : "\n\n(No official documents ingested for this course yet — answer from general NSW HSC knowledge and say so.)";

  const stream = anthropic.messages.stream({
    model: "claude-opus-5",
    max_tokens: 4096,
    system: [
      { type: "text", text: stableIntro },
      { type: "text", text: docContext, cache_control: { type: "ephemeral" } },
    ],
    messages: messages.slice(-20),
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (e) {
        controller.enqueue(encoder.encode(`\n\n[error: ${(e as Error).message}]`));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "x-cram-doc-ids": docIds.join(","),
      "x-cram-sources": encodeURIComponent(sources.join("|")),
    },
  });
}
