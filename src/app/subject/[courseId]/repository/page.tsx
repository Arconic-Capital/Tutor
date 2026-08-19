import { db } from "@/db";
import { resources } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

import UploadPanel from "@/components/upload-panel";

const TYPE_LABELS: Record<string, string> = {
  notes: "Cohort notes",
  summary: "Summaries",
  trial_paper: "Trial papers",
  practice_questions: "Practice questions",
  assignment: "Assignments",
  past_paper: "Past papers",
  marking_guidelines: "Marking guidelines",
  sample_paper: "Sample papers",
  syllabus: "Syllabus",
  reference: "Reference sheets & standards",
  other: "Other resources",
};
const TYPE_ORDER = [
  "notes", "summary", "trial_paper", "practice_questions", "assignment",
  "past_paper", "marking_guidelines", "sample_paper", "syllabus", "reference", "other",
];

export default async function RepositoryPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const all = await db
    .select()
    .from(resources)
    .where(eq(resources.courseId, courseId))
    .orderBy(desc(resources.year));

  const groups = TYPE_ORDER.map((t) => ({
    type: t,
    label: TYPE_LABELS[t] ?? t,
    items: all.filter((r) => r.resourceType === t),
  })).filter((g) => g.items.length > 0);

  if (all.length === 0) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <UploadPanel courseId={courseId} />
        <p className="py-10 text-center text-sm text-[#8a857e]">
          Nothing here yet — be the first to add something.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[200px_1fr] gap-8 py-6 max-md:grid-cols-1">
      {/* left rail: type index */}
      <aside className="max-md:hidden">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#b6b1aa]">In this subject</p>
        <ul className="flex flex-col gap-1 text-sm">
          {groups.map((g) => (
            <li key={g.type}>
              <a href={`#${g.type}`} className="flex justify-between rounded-lg px-2.5 py-1.5 text-[#8a857e] hover:bg-[#faf9f7] hover:text-[#1a1815]">
                {g.label}
                <span className="tabular-nums text-[#b6b1aa]">{g.items.length}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-6 rounded-lg bg-[#f0f6fc] p-3 text-xs leading-relaxed text-[#2777c2]">
          Official NESA material is linked, never re-hosted. Anything you upload files itself and becomes readable by the tutor.
        </p>
      </aside>

      {/* resource list */}
      <div className="flex flex-col gap-8">
        <div className="flex justify-end">
          <UploadPanel courseId={courseId} />
        </div>
        {groups.map((g) => (
          <section key={g.type} id={g.type}>
            <h2 className="mb-1 text-[15px] font-semibold">{g.label}</h2>
            <ul>
              {g.items.map((r) => (
                <li key={r.id} className="border-t border-[#eeece8] first:border-t-0">
                  <a
                    href={r.url ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-3 py-3"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#faf9f7] text-sm">
                      {r.resourceType === "past_paper" ? "📄" : r.resourceType === "syllabus" ? "📚" : r.resourceType === "reference" ? "📐" : "🔗"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium group-hover:text-[#2777c2]">{r.title}</span>
                      {r.notes && <span className="block truncate text-xs text-[#b6b1aa]">{r.notes}</span>}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-[#b6b1aa]">
                      {r.year ?? ""} {r.source} ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
