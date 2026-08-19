import Anthropic from "@anthropic-ai/sdk";
import { PDFParse } from "pdf-parse";
import { db } from "@/db";
import { courses, resources, documents } from "@/db/schema";

export const maxDuration = 120;

const anthropic = new Anthropic();

/** Register an uploaded file: extract text, auto-file it, make it tutor-readable. */
export async function POST(req: Request) {
  const { url, filename, consent, courseId: hintCourseId } = (await req.json()) as {
    url: string;
    filename: string;
    consent: boolean;
    courseId?: string;
  };
  if (!url || !filename) return new Response("url and filename required", { status: 400 });
  if (!consent) return new Response("consent declaration required", { status: 400 });

  // extract text
  let text = "";
  try {
    const res = await fetch(url);
    const buf = Buffer.from(await res.arrayBuffer());
    if (filename.toLowerCase().endsWith(".pdf")) {
      const parser = new PDFParse({ data: new Uint8Array(buf) });
      const parsed = await parser.getText();
      await parser.destroy();
      text = parsed.text.replace(/ /g, " ").trim();
    } else if (/\.(txt|md)$/i.test(filename)) {
      text = buf.toString("utf8");
    }
  } catch {
    /* keep going — file stays useful as a stored blob */
  }

  // auto-file with a cheap pass
  const allCourses = await db.select({ id: courses.id, name: courses.name }).from(courses);
  let filed = {
    course_id: hintCourseId ?? "",
    resource_type: "other",
    title: filename.replace(/\.[a-z0-9]+$/i, ""),
    year: null as number | null,
  };
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
              course_id: { type: "string" },
              resource_type: {
                type: "string",
                enum: ["notes", "summary", "trial_paper", "practice_questions", "assignment", "other"],
              },
              title: { type: "string" },
              year: { type: ["integer", "null"] },
            },
            required: ["course_id", "resource_type", "title", "year"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "user",
          content: `File a student upload for an HSC study platform.\nFilename: ${filename}\n${hintCourseId ? `Uploaded from the ${hintCourseId} page (strong hint).\n` : ""}Courses (id | name):\n${allCourses.map((c) => `${c.id} | ${c.name}`).join("\n")}\n\nFirst part of the file:\n${text.slice(0, 4000) || "(no extractable text)"}\n\nReturn course_id, resource_type, a clean human title, and the exam/trial year if evident.`,
        },
      ],
    });
    const block = res.content.find((b) => b.type === "text");
    if (block) {
      const parsed = JSON.parse(block.text) as typeof filed;
      if (allCourses.some((c) => c.id === parsed.course_id)) filed = parsed;
    }
  } catch {
    /* fall back to hint/defaults */
  }
  if (!filed.course_id) return new Response("could not determine course", { status: 422 });

  const [resource] = await db
    .insert(resources)
    .values({
      courseId: filed.course_id,
      title: filed.title.slice(0, 140),
      kind: "file",
      url,
      year: filed.year,
      resourceType: filed.resource_type,
      source: "student upload",
      notes: filename,
    })
    .returning();

  if (text.length > 300) {
    await db.insert(documents).values({
      resourceId: resource.id,
      title: filed.title.slice(0, 140),
      kind: "upload",
      sourceUrl: url,
      text: text.slice(0, 500_000),
      textLength: Math.min(text.length, 500_000),
    });
  }

  const courseName = allCourses.find((c) => c.id === filed.course_id)?.name ?? filed.course_id;
  return Response.json({
    id: resource.id,
    courseId: filed.course_id,
    courseName,
    title: filed.title,
    resourceType: filed.resource_type,
    tutorReadable: text.length > 300,
  });
}
