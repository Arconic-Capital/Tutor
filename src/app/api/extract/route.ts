import Anthropic from "@anthropic-ai/sdk";
import { PDFParse } from "pdf-parse";
import { db } from "@/db";
import { courses, sources, events, workItems } from "@/db/schema";

export const maxDuration = 180;

const anthropic = new Anthropic();

interface ExtractedEvent {
  title: string;
  kind: string;
  day_of_week: number | null;
  week_cycle: "A" | "B" | null;
  start_time: string | null;
  end_time: string | null;
  date: string | null;
  location: string | null;
  course_id: string | null;
}
interface ExtractedWork {
  title: string;
  kind: string;
  due_date: string | null;
  weighting: number | null;
  course_id: string | null;
  notes: string | null;
}

/** Extract schedule/work from an uploaded file (photo or PDF). Returns proposals; /api/extract PUT commits them. */
export async function POST(req: Request) {
  const { url, filename } = (await req.json()) as { url: string; filename: string };
  if (!url || !filename) return new Response("url and filename required", { status: 400 });

  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  const isPdf = filename.toLowerCase().endsWith(".pdf");
  const isImage = /\.(png|jpe?g|webp)$/i.test(filename);

  let pdfText = "";
  if (isPdf) {
    try {
      const parser = new PDFParse({ data: new Uint8Array(buf) });
      const parsed = await parser.getText();
      await parser.destroy();
      pdfText = parsed.text.trim();
    } catch {
      /* fall through */
    }
  }

  const allCourses = await db.select({ id: courses.id, name: courses.name }).from(courses);
  const courseList = allCourses.map((c) => `${c.id} | ${c.name}`).join("\n");

  const instruction = `You extract a student's schedule and workload from school documents (NSW, Sydney Boys High, ${new Date().getFullYear()}).
Classify the document, then extract EVERYTHING you can into the two lists:

events — recurring or one-off calendar items (classes, sport, tutoring, activities):
- Recurring (e.g. timetable rows): set day_of_week (1=Mon..7=Sun), start_time/end_time ("09:05" 24h), week_cycle "A"/"B" if the timetable is a two-week cycle (null if same every week), date null.
- One-off: set date (YYYY-MM-DD), and times if given.
- kind: class | sport | tutoring | extracurricular | other.
- course_id: match school subjects to this list (null if not a subject):
${courseList}

work_items — dated work (assessment tasks, exams, homework):
- kind: assessment | exam | homework | task. due_date YYYY-MM-DD (if only a week number like "Term 3 Week 5" is given, estimate the date: NSW 2026 terms — T1 starts Jan 27, T2 Apr 27, T3 Jul 20, T4 Oct 12; use the Monday of that week and note the estimate in notes).
- weighting: % if stated.

Be exhaustive — extract every row. If the document is unreadable or irrelevant, return empty lists.`;

  const schema = {
    type: "object" as const,
    properties: {
      doc_kind: { type: "string", enum: ["timetable", "assessment_schedule", "notice", "other"] },
      events: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            kind: { type: "string", enum: ["class", "sport", "tutoring", "extracurricular", "other"] },
            day_of_week: { type: ["integer", "null"] },
            week_cycle: { type: ["string", "null"] }, // "A" | "B" | null — enforced by prompt
            start_time: { type: ["string", "null"] },
            end_time: { type: ["string", "null"] },
            date: { type: ["string", "null"] },
            location: { type: ["string", "null"] },
            course_id: { type: ["string", "null"] },
          },
          required: ["title", "kind", "day_of_week", "week_cycle", "start_time", "end_time", "date", "location", "course_id"],
          additionalProperties: false,
        },
      },
      work_items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            kind: { type: "string", enum: ["assessment", "exam", "homework", "task"] },
            due_date: { type: ["string", "null"] },
            weighting: { type: ["integer", "null"] },
            course_id: { type: ["string", "null"] },
            notes: { type: ["string", "null"] },
          },
          required: ["title", "kind", "due_date", "weighting", "course_id", "notes"],
          additionalProperties: false,
        },
      },
    },
    required: ["doc_kind", "events", "work_items"],
    additionalProperties: false,
  };

  const content: Anthropic.ContentBlockParam[] = [];
  if (isImage) {
    const mediaType = filename.toLowerCase().endsWith(".png")
      ? "image/png"
      : filename.toLowerCase().endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";
    content.push({
      type: "image",
      source: { type: "base64", media_type: mediaType as "image/png" | "image/jpeg" | "image/webp", data: buf.toString("base64") },
    });
    content.push({ type: "text", text: `Document: ${filename}. Extract per the instructions.` });
  } else if (isPdf && pdfText.length > 100) {
    content.push({ type: "text", text: `Document: ${filename}\n\n${pdfText.slice(0, 100_000)}` });
  } else if (isPdf) {
    // scanned PDF → send as document block
    content.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: buf.toString("base64") },
    });
    content.push({ type: "text", text: `Document: ${filename}. Extract per the instructions.` });
  } else {
    content.push({ type: "text", text: `Document: ${filename}\n\n${buf.toString("utf8").slice(0, 60_000)}` });
  }

  const stream = anthropic.messages.stream({
    model: "claude-opus-5",
    max_tokens: 16000,
    output_config: { effort: "medium", format: { type: "json_schema", schema } },
    system: instruction,
    messages: [{ role: "user", content }],
  });
  const final = await stream.finalMessage();
  const block = final.content.find((b) => b.type === "text");
  if (!block) return new Response("extraction failed", { status: 502 });

  const parsed = JSON.parse(block.text);
  return Response.json({ filename, url, ...parsed });
}

/** Commit confirmed extractions. */
export async function PUT(req: Request) {
  const body = (await req.json()) as {
    filename: string;
    url?: string;
    doc_kind: string;
    events: ExtractedEvent[];
    work_items: ExtractedWork[];
  };
  const validCourse = new Set((await db.select({ id: courses.id }).from(courses)).map((c) => c.id));
  const cid = (id: string | null) => (id && validCourse.has(id) ? id : null);

  const [src] = await db
    .insert(sources)
    .values({ kind: body.doc_kind, label: body.filename, url: body.url ?? null })
    .returning({ id: sources.id });

  if (body.events.length) {
    await db.insert(events).values(
      body.events.map((e) => ({
        sourceId: src.id,
        courseId: cid(e.course_id),
        title: e.title.slice(0, 140),
        kind: e.kind,
        dayOfWeek: e.day_of_week,
        weekCycle: e.week_cycle,
        startTime: e.start_time,
        endTime: e.end_time,
        date: e.date ? new Date(e.date) : null,
        location: e.location,
      })),
    );
  }
  if (body.work_items.length) {
    await db.insert(workItems).values(
      body.work_items.map((w) => ({
        sourceId: src.id,
        courseId: cid(w.course_id),
        title: w.title.slice(0, 140),
        kind: w.kind,
        dueDate: w.due_date ? new Date(w.due_date) : null,
        weighting: w.weighting,
        notes: w.notes,
      })),
    );
  }
  return Response.json({ ok: true, events: body.events.length, workItems: body.work_items.length });
}
