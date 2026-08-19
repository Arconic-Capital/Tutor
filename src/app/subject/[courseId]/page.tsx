import { redirect } from "next/navigation";

export default async function SubjectRoot({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  redirect(`/subject/${courseId}/repository`);
}
