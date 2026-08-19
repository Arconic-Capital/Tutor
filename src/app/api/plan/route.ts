import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { users, userCourses, courses, topics, quizAttempts, plans } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth/current-user";

export const maxDuration = 180;

const anthropic = new Anthropic();

export async function GET() {
  const [latest] = await db.select().from(plans).orderBy(desc(plans.createdAt)).limit(1);
  return Response.json(latest ?? null);
}

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) return new Response("not signed in", { status: 401 });
  const [me] = await db.select().from(users).where(eq(users.id, userId));

  const my = await db
    .select({ id: courses.id, name: courses.name })
    .from(userCourses)
    .innerJoin(courses, eq(userCourses.courseId, courses.id))
    .where(eq(userCourses.userId, userId));
  if (my.length === 0) return new Response("no subjects", { status: 400 });

  const courseIds = my.map((c) => c.id);
  const allTopics = await db.select().from(topics).where(inArray(topics.courseId, courseIds));
  const attempts = await db
    .select()
    .from(quizAttempts)
    .where(inArray(quizAttempts.courseId, courseIds))
    .orderBy(desc(quizAttempts.createdAt))
    .limit(300);

  // mastery snapshot per course/topic
  const lines: string[] = [];
  for (const c of my) {
    const cTopics = allTopics.filter((t) => t.courseId === c.id);
    const cAttempts = attempts.filter((a) => a.courseId === c.id);
    const parts: string[] = [];
    for (const t of cTopics) {
      const scores = cAttempts.filter((a) => a.topicId === t.id).slice(0, 5);
      if (scores.length) {
        const pct = Math.round((scores.reduce((s, a) => s + a.awarded / Math.max(1, a.outOf), 0) / scores.length) * 100);
        parts.push(`${t.name}: ${pct}% (${scores.length} Qs)`);
      } else {
        parts.push(`${t.name}: untested`);
      }
    }
    lines.push(`${c.name}: ${parts.length ? parts.join("; ") : "no module data"} · total questions answered: ${cAttempts.length}`);
  }

  const daysToTrials = me?.trialsDate
    ? Math.max(1, Math.ceil((new Date(me.trialsDate).getTime() - Date.now()) / 86_400_000))
    : null;

  const stream = anthropic.messages.stream({
    model: "claude-opus-5",
    max_tokens: 8000,
    output_config: {
      effort: "medium",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            headline: { type: "string" },
            weeks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        course: { type: "string" },
                        task: { type: "string" },
                        minutes: { type: "integer" },
                      },
                      required: ["course", "task", "minutes"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["label", "items"],
                additionalProperties: false,
              },
            },
          },
          required: ["headline", "weeks"],
          additionalProperties: false,
        },
      },
    },
    system: [
      {
        type: "text",
        text: `You build weekly study plans for a Year ${me?.yearLevel ?? 12} student at Sydney Boys High.${daysToTrials ? ` Trials are in ${daysToTrials} days — plan every week from now until then (max 6 weeks shown).` : " Plan the next 4 weeks."}

Rules: weight time towards weak/untested modules; every item is one concrete session (a drill, a past-paper section, a marker rep, flashcard review) with realistic minutes (15-60); 3-6 items per week; use the app's own tools in tasks ("Quiz drill on X", "Generate + sit a predicted paper", "Run your essay through the Marker"); final week before trials = practice papers + cheat-sheet refresh, light. headline: one motivating sentence stating the single biggest priority.`,
      },
    ],
    messages: [
      {
        role: "user",
        content: `My subjects and current mastery:\n${lines.join("\n")}`,
      },
    ],
  });

  const final = await stream.finalMessage();
  const block = final.content.find((b) => b.type === "text");
  if (!block) return new Response("plan generation failed", { status: 502 });

  const [saved] = await db.insert(plans).values({ content: block.text }).returning();
  return Response.json(saved);
}
