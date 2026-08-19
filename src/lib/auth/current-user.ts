import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const DEV_EMAIL = "dev@tutor.local";

// Returns the signed-in user's id, or a persistent dev user when AUTH_DISABLED=true.
export async function getCurrentUserId(): Promise<string | null> {
  if (process.env.AUTH_DISABLED === "true") {
    const [existing] = await db.select().from(users).where(eq(users.email, DEV_EMAIL));
    if (existing) return existing.id;
    const [created] = await db
      .insert(users)
      .values({ email: DEV_EMAIL, name: "Dev User", role: "admin" })
      .returning();
    return created.id;
  }
  const session = await auth();
  return session?.user?.id ?? null;
}
