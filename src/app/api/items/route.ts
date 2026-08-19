import { db } from "@/db";
import { events, workItems } from "@/db/schema";
import { eq } from "drizzle-orm";

/** Direct button ops — same effects as assistant tools, no model in the loop. */
export async function PATCH(req: Request) {
  const { table, id, status, title, dueDate } = (await req.json()) as {
    table: "work" | "event";
    id: string;
    status?: string;
    title?: string;
    dueDate?: string;
  };
  if (!id) return new Response("id required", { status: 400 });
  if (table === "work") {
    const patch: Record<string, unknown> = {};
    if (status) patch.status = status;
    if (title) patch.title = title.slice(0, 140);
    if (dueDate) patch.dueDate = new Date(dueDate);
    await db.update(workItems).set(patch).where(eq(workItems.id, id));
  } else {
    const patch: Record<string, unknown> = {};
    if (title) patch.title = title.slice(0, 140);
    await db.update(events).set(patch).where(eq(events.id, id));
  }
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { table, id } = (await req.json()) as { table: "work" | "event"; id: string };
  if (!id) return new Response("id required", { status: 400 });
  if (table === "work") await db.delete(workItems).where(eq(workItems.id, id));
  else await db.delete(events).where(eq(events.id, id));
  return Response.json({ ok: true });
}
