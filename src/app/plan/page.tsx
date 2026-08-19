import Shell from "@/components/shell";
import PlanView from "./view";

export default function PlanPage() {
  return (
    <div className="min-h-screen bg-white">
      <Shell activeCourseId="all" />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-xl font-semibold tracking-tight">Road to trials</h1>
        <PlanView />
      </main>
    </div>
  );
}
