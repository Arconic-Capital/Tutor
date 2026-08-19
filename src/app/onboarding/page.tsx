import { db } from "@/db";
import { courses } from "@/db/schema";
import { completeOnboarding } from "./actions";

export default async function OnboardingPage() {
  const allCourses = await db.select().from(courses).orderBy(courses.name);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Set up your profile</h1>
      <form action={completeOnboarding} className="flex flex-col gap-6">
        <label className="flex flex-col gap-1">
          <span className="font-medium">Year level</span>
          <select name="yearLevel" required className="rounded border px-3 py-2">
            <option value="">Select…</option>
            {[9, 10, 11, 12].map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="font-medium">Your subjects</legend>
          <div className="grid grid-cols-2 gap-1">
            {allCourses.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="courseIds" value={c.id} />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="rounded bg-black px-3 py-2 text-white">
          Save
        </button>
      </form>
    </main>
  );
}
