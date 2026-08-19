"use server";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { db } from "@/db";
import { users, userCourses } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function completeOnboarding(input: {
  yearLevel: number;
  courseIds: string[];
  trialsDate?: string; // yyyy-mm-dd
}) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("not signed in");
  const { yearLevel, courseIds, trialsDate } = input;
  if (![9, 10, 11, 12].includes(yearLevel)) throw new Error("Invalid year level");

  await db
    .update(users)
    .set({ yearLevel, trialsDate: trialsDate ? new Date(trialsDate) : null })
    .where(eq(users.id, userId));
  await db.delete(userCourses).where(eq(userCourses.userId, userId));
  if (courseIds.length) {
    await db.insert(userCourses).values(courseIds.map((courseId) => ({ userId, courseId })));
  }
  return { ok: true };
}
