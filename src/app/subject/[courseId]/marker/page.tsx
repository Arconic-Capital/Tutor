"use client";

import { use, useRef, useState } from "react";
import { renderMarkdown } from "@/lib/markdown";
import "katex/dist/katex.min.css";

interface MarkResult {
  awarded: number;
  out_of: number;
  band_comment: string;
  criteria: { met: boolean; text: string }[];
  feedback: string;
  band6_answer: string;
}

export default function MarkerPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<{ data: string; type: string; name: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onPhoto(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhoto({ data: dataUrl.split(",")[1], type: file.type, name: file.name });
    };
    reader.readAsDataURL(file);
  }
  const [result, setResult] = useState<MarkResult | null>(null);
  const [showModel, setShowModel] = useState(false);
  const [error, setError] = useState("");

  async function mark() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/marker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          question,
          answer,
          imageBase64: photo?.data,
          imageType: photo?.type,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setResult(await res.json());
      setShowModel(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl py-6">
      <p className="text-sm text-[#8a857e]">
        Paste a question and your answer — marked against real NESA marking guidelines and examiner feedback.
      </p>

      <div className="mt-5 flex flex-col gap-3">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={`The question — e.g. "Explain why the equilibrium constant is unaffected by a change in concentration. (7 marks)"`}
          rows={3}
          className="rounded-xl border border-[#e3e0da] px-4 py-3 text-sm outline-none placeholder:text-[#b6b1aa] focus:border-[#2777c2]"
        />
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Your answer, exactly as you'd write it in the exam…"
          rows={8}
          className="rounded-xl border border-[#e3e0da] px-4 py-3 text-sm outline-none placeholder:text-[#b6b1aa] focus:border-[#2777c2]"
        />
        <div className="flex items-center gap-3 self-end">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-full border border-[#e3e0da] px-4 py-2 text-[13px] hover:bg-[#faf9f7]"
          >
            {photo ? `📷 ${photo.name.slice(0, 18)} ✓` : "📷 Photo of your working"}
          </button>
        <button
          onClick={mark}
          disabled={busy || !question.trim() || (!answer.trim() && !photo)}
          className="self-end rounded-full bg-[#1a1815] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {busy ? "Marking…" : "Mark my answer"}
        </button>
        </div>
        {busy && <p className="text-xs text-[#8a857e]">Checking against marking guidelines — 30-60 seconds…</p>}
        {error && <p className="text-xs text-[#a44a3c]">{error}</p>}
      </div>

      {result && (
        <div className="mt-8 border-t border-[#eeece8] pt-6">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-semibold tracking-tight">
              {result.awarded}<span className="text-xl text-[#8a857e]">/{result.out_of}</span>
            </span>
            <span className="text-sm text-[#8a857e]">{result.band_comment}</span>
          </div>

          <ul className="mt-5">
            {result.criteria.map((c, i) => (
              <li key={i} className="flex gap-3 border-t border-[#eeece8] py-2.5 text-sm first:border-t-0">
                <span className={c.met ? "text-[#3b7a57]" : "text-[#a44a3c]"}>{c.met ? "✓" : "✕"}</span>
                <span className={c.met ? "" : "text-[#6e6862]"}>{c.text}</span>
              </li>
            ))}
          </ul>

          <div className="prose-cram mt-4" dangerouslySetInnerHTML={{ __html: renderMarkdown(result.feedback) }} />

          <button
            onClick={() => setShowModel(!showModel)}
            className="mt-6 rounded-full bg-[#f0f6fc] px-4 py-2 text-[13px] font-semibold text-[#2777c2]"
          >
            {showModel ? "Hide" : "Show"} a full-mark answer
          </button>
          {showModel && (
            <div
              className="prose-cram mt-4 rounded-xl border border-[#bfe0f5] bg-[#f0f6fc]/40 p-5"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(result.band6_answer) }}
            />
          )}
        </div>
      )}
    </div>
  );
}
