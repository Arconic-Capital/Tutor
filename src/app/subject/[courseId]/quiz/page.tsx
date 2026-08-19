"use client";

import { use, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { renderMarkdown } from "@/lib/markdown";
import "katex/dist/katex.min.css";

type Phase = "idle" | "loading" | "answering" | "marking" | "marked";

export default function QuizPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const searchParams = useSearchParams();
  const topicId = searchParams.get("topicId") ?? undefined;
  const topicName = searchParams.get("topic") ?? "";

  const [phase, setPhase] = useState<Phase>("idle");
  const [question, setQuestion] = useState("");
  const [marks, setMarks] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<{ awarded: number; out_of: number; feedback: string } | null>(null);
  const [session, setSession] = useState<{ scored: number; total: number; count: number }>({ scored: 0, total: 0, count: 0 });
  const [error, setError] = useState("");
  const asked = useRef<string[]>([]);
  const started = useRef(false);

  async function nextQuestion() {
    setPhase("loading");
    setError("");
    setResult(null);
    setAnswer("");
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "question", courseId, topicId, previous: asked.current }),
      });
      if (!res.ok) throw new Error(await res.text());
      const q = await res.json();
      setQuestion(q.question);
      setMarks(q.marks);
      asked.current.push(q.question.slice(0, 200));
      setPhase("answering");
    } catch (e) {
      setError((e as Error).message);
      setPhase("idle");
    }
  }

  async function submit() {
    setPhase("marking");
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark", courseId, topicId, question, marks, answer }),
      });
      if (!res.ok) throw new Error(await res.text());
      const r = await res.json();
      setResult(r);
      setSession((s) => ({ scored: s.scored + r.awarded, total: s.total + r.out_of, count: s.count + 1 }));
      setPhase("marked");
    } catch (e) {
      setError((e as Error).message);
      setPhase("answering");
    }
  }

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      nextQuestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-2xl py-6">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-[#8a857e]">
          Drill{topicName ? `: ${topicName}` : ""} — real HSC-style questions, marked as you go.
        </p>
        {session.count > 0 && (
          <p className="text-xs tabular-nums text-[#b6b1aa]">
            Session: {session.scored}/{session.total} across {session.count} Qs
          </p>
        )}
      </div>

      {error && <p className="mt-4 text-xs text-[#a44a3c]">{error}</p>}

      {phase === "loading" && (
        <p className="py-20 text-center text-sm text-[#8a857e]">Writing a question from real past papers…</p>
      )}

      {(phase === "answering" || phase === "marking" || phase === "marked") && (
        <div className="mt-6">
          <div className="rounded-2xl border border-[#e3e0da] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#b6b1aa]">
              Question · {marks} marks
            </p>
            <div className="prose-cram mt-2" dangerouslySetInnerHTML={{ __html: renderMarkdown(question) }} />
          </div>

          {phase !== "marked" ? (
            <>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Your answer — write it like it's the exam…"
                rows={7}
                disabled={phase === "marking"}
                className="mt-4 w-full rounded-xl border border-[#e3e0da] px-4 py-3 text-sm outline-none placeholder:text-[#b6b1aa] focus:border-[#2777c2]"
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={nextQuestion}
                  disabled={phase === "marking"}
                  className="rounded-full border border-[#e3e0da] px-4 py-2 text-[13px] disabled:opacity-40"
                >
                  Skip
                </button>
                <button
                  onClick={submit}
                  disabled={phase === "marking" || !answer.trim()}
                  className="rounded-full bg-[#1a1815] px-6 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {phase === "marking" ? "Marking…" : "Submit"}
                </button>
              </div>
            </>
          ) : (
            result && (
              <div className="mt-5 border-t border-[#eeece8] pt-5">
                <p className="text-3xl font-semibold tracking-tight">
                  {result.awarded}
                  <span className="text-lg text-[#8a857e]">/{result.out_of}</span>
                </p>
                <div className="prose-cram mt-3" dangerouslySetInnerHTML={{ __html: renderMarkdown(result.feedback) }} />
                <div className="mt-5 flex justify-end">
                  <button
                    onClick={nextQuestion}
                    className="rounded-full bg-[#1a1815] px-6 py-2 text-sm font-semibold text-white"
                  >
                    Next question ›
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
