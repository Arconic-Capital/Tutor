import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { artifacts, courses } from "@/db/schema";
import { eq } from "drizzle-orm";
import ArtifactViewer from "@/app/subject/[courseId]/artifacts/[artifactId]/viewer";
import { CramMark } from "@/components/shell";

/** Public read-only artifact page — the share/growth loop. */
export default async function SharePage({ params }: { params: Promise<{ artifactId: string }> }) {
  const { artifactId } = await params;
  const [artifact] = await db.select().from(artifacts).where(eq(artifacts.id, artifactId));
  if (!artifact || artifact.type === "prediction") notFound();
  const [course] = await db.select().from(courses).where(eq(courses.id, artifact.courseId));

  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between border-b border-[#eeece8] px-6 py-3">
        <span className="flex items-center gap-2 text-[16px] font-bold tracking-tight">
          <CramMark />
          sorted
        </span>
        <Link
          href="/landing"
          className="rounded-full bg-[#1a1815] px-4 py-1.5 text-[13px] font-semibold text-white"
        >
          Made with Sorted — get it
        </Link>
      </nav>
      <main className="mx-auto max-w-3xl px-6 py-8">
        <p className="mb-4 text-xs text-[#b6b1aa]">
          {course?.name ?? artifact.courseId} · shared from Sydney High&apos;s study repository
        </p>
        <ArtifactViewer
          type={artifact.type}
          title={artifact.title}
          content={artifact.content}
          sourceTitles={artifact.sourceTitles ?? ""}
        />
      </main>
    </div>
  );
}
