import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { artifacts } from "@/db/schema";
import { eq } from "drizzle-orm";
import ArtifactViewer from "./viewer";

export default async function ArtifactPage({
  params,
}: {
  params: Promise<{ courseId: string; artifactId: string }>;
}) {
  const { courseId, artifactId } = await params;
  const [artifact] = await db.select().from(artifacts).where(eq(artifacts.id, artifactId));
  if (!artifact || artifact.courseId !== courseId) notFound();

  return (
    <div className="py-6">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/subject/${courseId}/artifacts`} className="text-sm text-[#8a857e] hover:text-[#1a1815]">
          ‹ All materials
        </Link>
      </div>
      <ArtifactViewer
        type={artifact.type}
        title={artifact.title}
        content={artifact.content}
        sourceTitles={artifact.sourceTitles ?? ""}
      />
    </div>
  );
}
