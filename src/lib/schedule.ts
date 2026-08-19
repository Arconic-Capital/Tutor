import { db } from "@/db";
import { events, workItems, courses } from "@/db/schema";
import { asc } from "drizzle-orm";

/** NSW 2026 Term 3 starts Mon 20 Jul = Week A. Cycle alternates weekly. */
const CYCLE_ANCHOR = new Date("2026-07-20T00:00:00+10:00"); // Week A Monday

export function weekCycleFor(date: Date): "A" | "B" {
  const ms = date.getTime() - CYCLE_ANCHOR.getTime();
  const weeks = Math.floor(ms / (7 * 86_400_000));
  return ((weeks % 2) + 2) % 2 === 0 ? "A" : "B";
}

/** Local-timezone YYYY-MM-DD (toISOString shifts AEST back a day — never use it for calendar days). */
export function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dayOfWeekIso(date: Date): number {
  return date.getDay() === 0 ? 7 : date.getDay(); // 1=Mon..7=Sun
}

export interface DayEvent {
  id: string;
  title: string;
  kind: string;
  courseId: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  bring: string | null;
  notes: string | null;
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** All events occurring on a given date (recurring cycle-aware + one-offs). */
export async function eventsForDate(date: Date): Promise<DayEvent[]> {
  const all = await db.select().from(events);
  const dow = dayOfWeekIso(date);
  const cycle = weekCycleFor(date);
  return all
    .filter((e) => {
      if (e.date) return sameDay(new Date(e.date), date);
      if (e.dayOfWeek !== dow) return false;
      return !e.weekCycle || e.weekCycle === cycle;
    })
    .map((e) => ({
      id: e.id,
      title: e.title,
      kind: e.kind,
      courseId: e.courseId,
      startTime: e.startTime ?? (e.date ? new Date(e.date).toTimeString().slice(0, 5) : null),
      endTime: e.endTime,
      location: e.location,
      bring: e.bring,
      notes: e.notes,
    }))
    .sort((a, b) => (a.startTime ?? "99").localeCompare(b.startTime ?? "99"));
}

export interface UpcomingWork {
  id: string;
  title: string;
  kind: string;
  courseId: string | null;
  courseName: string | null;
  dueDate: Date | null;
  weighting: number | null;
  daysAway: number | null;
  status: string;
}

export async function upcomingWork(withinDays = 45): Promise<UpcomingWork[]> {
  const [items, allCourses] = await Promise.all([
    db.select().from(workItems).orderBy(asc(workItems.dueDate)),
    db.select({ id: courses.id, name: courses.name }).from(courses),
  ]);
  const nameFor = (id: string | null) => allCourses.find((c) => c.id === id)?.name ?? null;
  const now = Date.now();
  return items
    .filter((w) => w.status === "open")
    .map((w) => ({
      id: w.id,
      title: w.title,
      kind: w.kind,
      courseId: w.courseId,
      courseName: nameFor(w.courseId),
      dueDate: w.dueDate ? new Date(w.dueDate) : null,
      weighting: w.weighting,
      daysAway: w.dueDate ? Math.ceil((new Date(w.dueDate).getTime() - now) / 86_400_000) : null,
      status: w.status,
    }))
    .filter((w) => w.daysAway === null || (w.daysAway >= -1 && w.daysAway <= withinDays));
}

/** Free gaps in the school day worth planning into (>= 40 min between 8:30-17:30). */
export function freeGaps(dayEvents: DayEvent[]): { start: string; end: string; minutes: number }[] {
  const timed = dayEvents
    .filter((e) => e.startTime && e.endTime)
    .map((e) => ({ s: e.startTime!, e: e.endTime! }))
    .sort((a, b) => a.s.localeCompare(b.s));
  const toMin = (t: string) => parseInt(t.slice(0, 2)) * 60 + parseInt(t.slice(3, 5));
  const toStr = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const gaps: { start: string; end: string; minutes: number }[] = [];
  let cursor = toMin("08:30");
  for (const ev of timed) {
    const s = toMin(ev.s);
    if (s - cursor >= 40) gaps.push({ start: toStr(cursor), end: toStr(s), minutes: s - cursor });
    cursor = Math.max(cursor, toMin(ev.e));
  }
  if (toMin("17:30") - cursor >= 40) gaps.push({ start: toStr(cursor), end: "17:30", minutes: toMin("17:30") - cursor });
  return gaps;
}

/** What to pack tonight for tomorrow: explicit bring-items + sensible inferences. */
export async function packList(forDate: Date): Promise<string[]> {
  const evts = await eventsForDate(forDate);
  const items = new Set<string>();
  for (const e of evts) {
    if (e.bring) e.bring.split(/,|;/).forEach((b) => b.trim() && items.add(b.trim()));
    else if (e.kind === "sport") items.add("sports gear");
    else if (e.kind === "tutoring") items.add("tutoring homework");
  }
  return [...items];
}

/** 2-4 key bullets under a scheduled item — the detail layer of the master schedule. */
export function keyPoints(e: DayEvent, work: UpcomingWork[]): string[] {
  const pts: string[] = [];
  const courseWork = work.filter((w) => w.courseId && w.courseId === e.courseId);

  if (e.kind === "class") {
    const dueSoon = courseWork.filter((w) => (w.daysAway ?? 99) <= 2 && (w.kind === "homework" || w.kind === "exercise" || w.kind === "task"));
    for (const d of dueSoon.slice(0, 1)) pts.push(`Due ${d.daysAway! <= 0 ? "today" : "tomorrow"}: ${d.title}`);
    const assess = courseWork.find((w) => w.kind === "assessment" || w.kind === "exam");
    if (assess) pts.push(`${assess.title}${assess.weighting ? ` (${assess.weighting}%)` : ""} — ${assess.daysAway}d away`);
  }
  if (e.kind === "study_block" && e.notes?.startsWith("Prep for:")) {
    const target = e.notes.replace("Prep for: ", "");
    const w = work.find((x) => x.title === target);
    pts.push(`Why: ${target}${w?.daysAway != null ? ` due in ${w.daysAway}d` : ""}`);
  }
  if (e.kind === "sport") {
    const next = work.find((w) => w.kind === "task" && /game|carnival|match/i.test(w.title));
    if (next) pts.push(next.title);
  }
  if (e.bring) pts.push(`🎒 ${e.bring}`);
  else if (e.kind === "sport") pts.push("🎒 sports gear");
  else if (e.kind === "tutoring") pts.push("🎒 tutoring homework");
  return pts.slice(0, 4);
}
