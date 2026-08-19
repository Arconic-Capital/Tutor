"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { users, userCourses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function completeOnboarding(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/signin");

  const yearLevel = Number(formData.get("yearLevel"));
  const courseIds = formData.getAll("courseIds").map(String);
  if (![9, 10, 11, 12].includes(yearLevel)) throw new Error("Invalid year level");

  await db.update(users).set({ yearLevel }).where(eq(users.id, userId));
  await db.delete(userCourses).where(eq(userCourses.userId, userId));
  if (courseIds.length) {
    await db.insert(userCourses).values(
      courseIds.map((courseId) => ({ userId, courseId })),
    );
  }
  redirect("/");
}
