import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { courses, resources } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import Shell from "@/components/shell";

export default async function SubjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
  if (!course) notFound();

  const [{ n: resourceCount }] = await db
    .select({ n: count() })
    .from(resources)
    .where(eq(resources.courseId, courseId));

  const tabs = [
    { key: "tutor", label: "Tutor", soon: false },
    { key: "syllabus", label: "Syllabus", soon: false },
    { key: "repository", label: `Repository · ${resourceCount}`, soon: false },
    { key: "artifacts", label: "Study kit", soon: false },
    { key: "predictor", label: "Predictor", soon: false },
    { key: "marker", label: "Marker", soon: false },
    { key: "forum", label: "Forum", soon: false },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Shell activeCourseId={courseId} />
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex items-baseline justify-between pt-6">
          <h1 className="text-xl font-semibold tracking-tight">{course.name}</h1>
          <span className="text-xs text-[#b6b1aa]">
            {course.stage === 6 ? "HSC · Years 11–12" : `Stage 5 · Years ${course.yearLevels.join("–")}`}
            {course.syllabusNote ? ` · ${course.syllabusNote}` : ""}
          </span>
        </div>
        <div className="mt-4 flex gap-6 border-b border-[#eeece8] text-sm">
          {tabs.map((t) =>
            t.soon ? (
              <span key={t.key} className="pb-3 text-[#b6b1aa]">
                {t.label} <span className="ml-0.5 rounded-full bg-[#faf9f7] px-1.5 py-0.5 text-[10px]">soon</span>
              </span>
            ) : (
              <Link
                key={t.key}
                href={`/subject/${courseId}/${t.key}`}
                className="pb-3 text-[#8a857e] hover:text-[#1a1815] data-[on=true]:font-semibold"
              >
                {t.label}
              </Link>
            ),
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
