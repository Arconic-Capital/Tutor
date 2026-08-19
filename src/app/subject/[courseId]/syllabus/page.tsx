import { db } from "@/db";
import { topics } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export default async function SyllabusPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const list = await db
    .select()
    .from(topics)
    .where(eq(topics.courseId, courseId))
    .orderBy(asc(topics.sortOrder));

  if (list.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-[#8a857e]">
        Topics for this course haven&apos;t been loaded yet — priority HSC subjects come first.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-6">
      <p className="mb-4 text-xs text-[#b6b1aa]">
        Modules from the NESA syllabus. Mastery tracking arrives with the tutor.
      </p>
      <ul>
        {list.map((t, i) => (
          <li key={t.id} className="flex items-center gap-4 border-t border-[#eeece8] py-3.5 first:border-t-0">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f0f6fc] text-xs font-semibold text-[#2777c2]">
              {i + 1}
            </span>
            <span className="flex-1 text-sm font-medium">{t.name}</span>
            <span className="rounded-full bg-[#faf9f7] px-2.5 py-1 text-[11px] text-[#b6b1aa]">Quiz · soon</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
