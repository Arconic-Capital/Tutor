import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { events, workItems, courses } from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { eventsForDate, freeGaps, upcomingWork, localIso } from "@/lib/schedule";

export const maxDuration = 300;

const anthropic = new Anthropic();

interface Session {
  task: string;
  minutes: number;
}

const iso = localIso;
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** Build prep plans for all assessments/exams due in ≤30 days and place study blocks into real gaps. */
export async function POST() {
  const work = (await upcomingWork(30)).filter(
    (w) => (w.kind === "assessment" || w.kind === "exam") && w.dueDate && (w.daysAway ?? 0) > 0,
  );
  if (work.length === 0) return Response.json({ ok: true, blocks: 0, message: "no upcoming assessments" });

  // wipe previous auto-generated blocks so re-planning is idempotent
  await db.delete(events).where(and(eq(events.kind, "study_block"), isNotNull(events.workItemId)));

  const allCourses = await db.select({ id: courses.id, name: courses.name }).from(courses);
  const nameFor = (id: string | null) => allCourses.find((c) => c.id === id)?.name ?? "General";

  // 1) ask the model for a session list per assessment (one call for all — cheaper, coherent)
  const listing = work
    .map(
      (w, i) =>
        `${i}: ${nameFor(w.courseId)} — ${w.title}${w.weighting ? ` (${w.weighting}%)` : ""} — due ${iso(w.dueDate!)} (${w.daysAway} days away)`,
    )
    .join("\n");

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
            plans: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "integer" },
                  sessions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: { task: { type: "string" }, minutes: { type: "integer" } },
                      required: ["task", "minutes"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["index", "sessions"],
                additionalProperties: false,
              },
            },
          },
          required: ["plans"],
          additionalProperties: false,
        },
      },
    },
    system: `You design backwards exam-prep plans for a Year 12 NSW HSC student. For each assessment, output 3-8 ordered sessions (earliest first) sized 25-60 minutes. Structure: content review → targeted drills → past-paper/practice under time → final cheat-sheet/review the day before. Tasks are concrete and reference the app's tools where apt ("Quiz drill on X", "Sit a practice paper section", "Build a one-page cheat sheet", "Run your draft through the Marker"). Scale session count to weighting and days available.`,
    messages: [{ role: "user", content: `Assessments:\n${listing}` }],
  });
  const final = await stream.finalMessage();
  const block = final.content.find((b) => b.type === "text");
  if (!block) return new Response("planning failed", { status: 502 });
  const { plans } = JSON.parse(block.text) as { plans: { index: number; sessions: Session[] }[] };

  // 2) deterministic placement: walk days from tomorrow, fill free gaps + an evening slot (max 2 blocks/day)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = Math.min(30, Math.max(...work.map((w) => w.daysAway ?? 1)));

  type Slot = { date: Date; start: string; minutes: number };
  const slots: Slot[] = [];
  for (let d = 1; d <= horizon; d++) {
    const day = addDays(today, d);
    const dayEvents = await eventsForDate(day);
    const gaps = freeGaps(dayEvents).slice(0, 1); // one in-school gap per day
    for (const g of gaps) slots.push({ date: day, start: g.start, minutes: Math.min(g.minutes, 60) });
    // evening slot if nothing runs 18:00-21:00
    const eveningBusy = dayEvents.some((e) => e.startTime && e.startTime >= "17:00" && e.startTime <= "21:00");
    if (!eveningBusy) slots.push({ date: day, start: "19:00", minutes: 90 });
  }
  slots.sort((a, b) => a.date.getTime() - b.date.getTime() || a.start.localeCompare(b.start));

  // interleave: for each assessment, sessions must land before its due date, later sessions closer to the exam
  const inserts: (typeof events.$inferInsert)[] = [];
  const usedPerDay = new Map<string, number>();
  for (const p of plans) {
    const w = work[p.index];
    if (!w) continue;
    const due = new Date(w.dueDate!);
    const usable = slots.filter((s) => s.date < due);
    if (usable.length === 0) continue;
    const n = Math.min(p.sessions.length, usable.length);
    for (let k = 0; k < n; k++) {
      // spread sessions evenly across the usable window
      const target = usable[Math.floor((k / n) * usable.length)];
      // respect max 2 blocks per day
      let slot = target;
      const key = () => iso(slot.date) + slot.start;
      let idx = usable.indexOf(target);
      while ((usedPerDay.get(iso(slot.date)) ?? 0) >= 2 || inserts.some((i) => iso(new Date(i.date!)) + i.startTime === key())) {
        idx++;
        if (idx >= usable.length) break;
        slot = usable[idx];
      }
      if (idx >= usable.length) continue;
      usedPerDay.set(iso(slot.date), (usedPerDay.get(iso(slot.date)) ?? 0) + 1);
      const sess = p.sessions[k];
      const endMin =
        parseInt(slot.start.slice(0, 2)) * 60 + parseInt(slot.start.slice(3, 5)) + Math.min(sess.minutes, slot.minutes);
      inserts.push({
        courseId: w.courseId,
        workItemId: w.id,
        title: `${nameFor(w.courseId).split(" ")[0]}: ${sess.task.slice(0, 110)}`,
        kind: "study_block",
        date: new Date(`${iso(slot.date)}T${slot.start}:00+10:00`),
        startTime: slot.start,
        endTime: `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`,
        notes: `Prep for: ${w.title}`,
      });
    }
  }

  if (inserts.length) await db.insert(events).values(inserts);
  return Response.json({ ok: true, blocks: inserts.length, assessments: work.length });
}

export async function DELETE() {
  await db.delete(events).where(and(eq(events.kind, "study_block"), isNotNull(events.workItemId)));
  return Response.json({ ok: true });
}
