import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { userCourses, courses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth/current-user";

const anthropic = new Anthropic();

/** Pick which of the user's subjects a prompt belongs to. */
export async function POST(req: Request) {
  const { prompt } = (await req.json()) as { prompt: string };
  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ courseId: null });

  const my = await db
    .select({ id: courses.id, name: courses.name })
    .from(userCourses)
    .innerJoin(courses, eq(userCourses.courseId, courses.id))
    .where(eq(userCourses.userId, userId));

  if (my.length === 0) return Response.json({ courseId: null });
  if (my.length === 1 || !prompt?.trim()) return Response.json({ courseId: my[0].id });

  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 60,
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: { course_id: { type: "string" } },
            required: ["course_id"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "user",
          content: `Which subject is this HSC student's request about?\nRequest: "${prompt.slice(0, 300)}"\nSubjects (id | name):\n${my.map((c) => `${c.id} | ${c.name}`).join("\n")}\nReturn the single best course_id.`,
        },
      ],
    });
    const block = res.content.find((b) => b.type === "text");
    const parsed = block ? (JSON.parse(block.text) as { course_id: string }) : null;
    const courseId = my.some((c) => c.id === parsed?.course_id) ? parsed!.course_id : my[0].id;
    return Response.json({ courseId });
  } catch {
    return Response.json({ courseId: my[0].id });
  }
}
