import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { events, workItems, courses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { upcomingWork, eventsForDate, localIso } from "@/lib/schedule";

export const maxDuration = 120;

const anthropic = new Anthropic();

const TOOLS: Anthropic.Tool[] = [
  {
    name: "complete_item",
    description: "Mark a work item (homework, task, assessment) as done / cross it off.",
    input_schema: {
      type: "object",
      properties: { work_item_id: { type: "string" } },
      required: ["work_item_id"],
      additionalProperties: false,
    },
  },
  {
    name: "create_work_item",
    description: "Add homework, an exercise, a task, an assessment or an exam.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        kind: { type: "string", enum: ["homework", "exercise", "task", "assessment", "exam"] },
        due_date: { type: "string", description: "YYYY-MM-DD, null if unknown" },
        course_id: { type: "string", description: "course id or empty string" },
        weighting: { type: "integer", description: "% weighting, 0 if n/a" },
      },
      required: ["title", "kind", "due_date", "course_id", "weighting"],
      additionalProperties: false,
    },
  },
  {
    name: "update_work_item",
    description: "Change a work item's due date, title or weighting (e.g. assessment got pushed back).",
    input_schema: {
      type: "object",
      properties: {
        work_item_id: { type: "string" },
        due_date: { type: "string", description: "YYYY-MM-DD, empty to keep" },
        title: { type: "string", description: "empty to keep" },
        weighting: { type: "integer", description: "-1 to keep" },
      },
      required: ["work_item_id", "due_date", "title", "weighting"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_work_item",
    description: "Remove a work item entirely (wrongly added, cancelled).",
    input_schema: {
      type: "object",
      properties: { work_item_id: { type: "string" } },
      required: ["work_item_id"],
      additionalProperties: false,
    },
  },
  {
    name: "create_event",
    description: "Add a calendar event — recurring (set day_of_week) or one-off (set date).",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        kind: { type: "string", enum: ["class", "sport", "tutoring", "extracurricular", "special", "other"] },
        day_of_week: { type: "integer", description: "1=Mon..7=Sun for recurring, 0 for one-off" },
        week_cycle: { type: "string", description: "A, B, or empty for both/one-off" },
        date: { type: "string", description: "YYYY-MM-DD for one-off, empty for recurring" },
        start_time: { type: "string", description: "HH:MM 24h" },
        end_time: { type: "string", description: "HH:MM 24h or empty" },
        location: { type: "string", description: "empty if unknown" },
        bring: { type: "string", description: "what to pack, empty if nothing" },
      },
      required: ["title", "kind", "day_of_week", "week_cycle", "date", "start_time", "end_time", "location", "bring"],
      additionalProperties: false,
    },
  },
  {
    name: "update_event",
    description: "Change an event's time, day, title, location or bring-items (e.g. training moved to 4pm).",
    input_schema: {
      type: "object",
      properties: {
        event_id: { type: "string" },
        start_time: { type: "string", description: "HH:MM or empty to keep" },
        end_time: { type: "string", description: "HH:MM or empty to keep" },
        day_of_week: { type: "integer", description: "1-7, or 0 to keep" },
        title: { type: "string", description: "empty to keep" },
        location: { type: "string", description: "empty to keep" },
        bring: { type: "string", description: "empty to keep" },
      },
      required: ["event_id", "start_time", "end_time", "day_of_week", "title", "location", "bring"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_event",
    description: "Remove an event (a study block, a cancelled activity, a wrong extraction).",
    input_schema: {
      type: "object",
      properties: { event_id: { type: "string" } },
      required: ["event_id"],
      additionalProperties: false,
    },
  },
  {
    name: "replan_prep",
    description: "Rebuild all exam-prep study blocks (after due dates or the weekly schedule changed).",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
];

interface Change {
  icon: string;
  text: string;
}

async function execute(name: string, input: Record<string, unknown>, changes: Change[]): Promise<string> {
  const s = (k: string) => (input[k] as string) ?? "";
  const n = (k: string) => (input[k] as number) ?? 0;
  switch (name) {
    case "complete_item": {
      const [w] = await db.update(workItems).set({ status: "done" }).where(eq(workItems.id, s("work_item_id"))).returning();
      if (!w) return "not found";
      changes.push({ icon: "✓", text: `Crossed off: ${w.title}` });
      return `done: ${w.title}`;
    }
    case "create_work_item": {
      const [w] = await db
        .insert(workItems)
        .values({
          title: s("title").slice(0, 140),
          kind: s("kind"),
          dueDate: s("due_date") ? new Date(s("due_date")) : null,
          courseId: s("course_id") || null,
          weighting: n("weighting") > 0 ? n("weighting") : null,
        })
        .returning();
      changes.push({ icon: "＋", text: `Added: ${w.title}${w.dueDate ? ` · due ${localIso(new Date(w.dueDate))}` : ""}` });
      return `created ${w.id}`;
    }
    case "update_work_item": {
      const patch: Record<string, unknown> = {};
      if (s("due_date")) patch.dueDate = new Date(s("due_date"));
      if (s("title")) patch.title = s("title").slice(0, 140);
      if (n("weighting") >= 0) patch.weighting = n("weighting") || null;
      const [w] = await db.update(workItems).set(patch).where(eq(workItems.id, s("work_item_id"))).returning();
      if (!w) return "not found";
      changes.push({ icon: "✎", text: `Updated: ${w.title}${s("due_date") ? ` → due ${s("due_date")}` : ""}` });
      return "updated";
    }
    case "delete_work_item": {
      const [w] = await db.delete(workItems).where(eq(workItems.id, s("work_item_id"))).returning();
      if (w) changes.push({ icon: "✕", text: `Removed: ${w.title}` });
      return "deleted";
    }
    case "create_event": {
      const [e] = await db
        .insert(events)
        .values({
          title: s("title").slice(0, 140),
          kind: s("kind"),
          dayOfWeek: n("day_of_week") || null,
          weekCycle: s("week_cycle") || null,
          date: s("date") ? new Date(`${s("date")}T${s("start_time") || "09:00"}:00+10:00`) : null,
          startTime: s("start_time") || null,
          endTime: s("end_time") || null,
          location: s("location") || null,
          bring: s("bring") || null,
        })
        .returning();
      changes.push({ icon: "＋", text: `Added event: ${e.title}` });
      return `created ${e.id}`;
    }
    case "update_event": {
      const patch: Record<string, unknown> = {};
      if (s("start_time")) patch.startTime = s("start_time");
      if (s("end_time")) patch.endTime = s("end_time");
      if (n("day_of_week") > 0) patch.dayOfWeek = n("day_of_week");
      if (s("title")) patch.title = s("title").slice(0, 140);
      if (s("location")) patch.location = s("location");
      if (s("bring")) patch.bring = s("bring");
      const [e] = await db.update(events).set(patch).where(eq(events.id, s("event_id"))).returning();
      if (!e) return "not found";
      changes.push({ icon: "⇄", text: `Updated: ${e.title}${s("start_time") ? ` → ${s("start_time")}` : ""}` });
      return "updated";
    }
    case "delete_event": {
      const [e] = await db.delete(events).where(eq(events.id, s("event_id"))).returning();
      if (e) changes.push({ icon: "✕", text: `Removed: ${e.title}` });
      return "deleted";
    }
    case "replan_prep":
      changes.push({ icon: "↻", text: "Re-planning your prep blocks…" });
      return "REPLAN"; // client triggers /api/prep after this turn
    default:
      return "unknown tool";
  }
}

export async function POST(req: Request) {
  const { message } = (await req.json()) as { message: string };
  if (!message?.trim()) return new Response("message required", { status: 400 });

  // context snapshot so the model can resolve "the 7.3 worksheet" to real ids
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const [work, todayEvents, tomorrowEvents, allCourses, allEvents] = await Promise.all([
    upcomingWork(60),
    eventsForDate(today),
    eventsForDate(tomorrow),
    db.select({ id: courses.id, name: courses.name }).from(courses),
    db.select({ id: events.id, title: events.title, kind: events.kind, dayOfWeek: events.dayOfWeek, weekCycle: events.weekCycle, startTime: events.startTime }).from(events),
  ]);
  const recurring = allEvents.filter((e) => e.dayOfWeek).slice(0, 80);

  const context = `Today is ${localIso(today)} (${today.toLocaleDateString("en-AU", { weekday: "long" })}).

OPEN WORK ITEMS (id | kind | title | due | course):
${work.map((w) => `${w.id} | ${w.kind} | ${w.title} | ${w.dueDate ? localIso(w.dueDate) : "?"} | ${w.courseName ?? "-"}`).join("\n") || "(none)"}

RECURRING EVENTS (id | title | day 1=Mon | cycle | start):
${recurring.map((e) => `${e.id} | ${e.title} | ${e.dayOfWeek} | ${e.weekCycle ?? "both"} | ${e.startTime}`).join("\n") || "(none)"}

TODAY'S EVENTS: ${todayEvents.map((e) => `${e.id}: ${e.title} ${e.startTime}`).join("; ") || "(none)"}
TOMORROW'S: ${tomorrowEvents.map((e) => `${e.id}: ${e.title} ${e.startTime}`).join("; ") || "(none)"}

COURSES: ${allCourses.map((c) => `${c.id}=${c.name}`).join(", ")}`;

  const changes: Change[] = [];
  let replan = false;

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: message.slice(0, 2000) }];
  let finalText = "";

  for (let turn = 0; turn < 6; turn++) {
    const res = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: 1500,
      output_config: { effort: "low" },
      tools: TOOLS,
      system: [
        {
          type: "text",
          text: `You are the schedule assistant inside Sorted, a Year 12 student's life manager. The student gives you instructions in casual language ("cross off the worksheet", "training moved to 4", "depth study pushed to sep 4"). Resolve what they mean against the context, then use tools to make the change. If a due date moved on an assessment or the weekly schedule changed, also call replan_prep. If genuinely ambiguous, ask one short question instead of acting. When done, reply in ONE short sentence confirming what changed — the UI shows change cards, don't repeat details.`,
        },
        { type: "text", text: context, cache_control: { type: "ephemeral" } },
      ],
      messages,
    });

    const toolUses = res.content.filter((b) => b.type === "tool_use");
    const textBlock = res.content.find((b) => b.type === "text");
    if (textBlock) finalText = textBlock.text;

    if (res.stop_reason !== "tool_use" || toolUses.length === 0) break;

    messages.push({ role: "assistant", content: res.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      const out = await execute(tu.name, tu.input as Record<string, unknown>, changes);
      if (out === "REPLAN") replan = true;
      results.push({ type: "tool_result", tool_use_id: tu.id, content: out });
    }
    messages.push({ role: "user", content: results });
  }

  return Response.json({ reply: finalText || "Done.", changes, replan });
}
