"use client";

import { useMemo, useState } from "react";
import { renderMarkdown } from "@/lib/markdown";
import "katex/dist/katex.min.css";

interface Card {
  front: string;
  back: string;
}

function download(filename: string, text: string, mime = "text/plain") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const csvEscape = (s: string) => `"${s.replace(/"/g, '""')}"`;

export default function ArtifactViewer({
  type,
  title,
  content,
  sourceTitles,
}: {
  type: string;
  title: string;
  content: string;
  sourceTitles: string;
}) {
  const isFlash = type === "flashcards";
  const cards: Card[] = useMemo(
    () => (isFlash ? (JSON.parse(content) as { cards: Card[] }).cards : []),
    [isFlash, content],
  );
  const html = useMemo(
    () => (isFlash ? "" : renderMarkdown(content)),
    [isFlash, content],
  );

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);

  function exportMarkdown() {
    const md = isFlash
      ? `# ${title}\n\n${cards.map((c, i) => `**${i + 1}. ${c.front}**\n\n${c.back}\n`).join("\n")}`
      : `# ${title}\n\n${content}`;
    download(`${slug}.md`, md, "text/markdown");
  }

  function exportCsv() {
    // Anki-compatible: front,back per row
    download(`${slug}.csv`, cards.map((c) => `${csvEscape(c.front)},${csvEscape(c.back)}`).join("\n"), "text/csv");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3 print:block">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {sourceTitles && (
            <p className="mt-1 text-xs text-[#b6b1aa]">Drawing on: {sourceTitles.split(" | ").slice(0, 4).join(" · ")}</p>
          )}
        </div>
        <div className="flex gap-2 print:hidden">
          <button onClick={() => window.print()} className="rounded-full border border-[#e3e0da] px-4 py-1.5 text-[13px] font-medium hover:bg-[#faf9f7]">
            Print / PDF
          </button>
          <button onClick={exportMarkdown} className="rounded-full border border-[#e3e0da] px-4 py-1.5 text-[13px] font-medium hover:bg-[#faf9f7]">
            Markdown
          </button>
          {isFlash && (
            <button onClick={exportCsv} className="rounded-full border border-[#e3e0da] px-4 py-1.5 text-[13px] font-medium hover:bg-[#faf9f7]">
              CSV (Anki)
            </button>
          )}
        </div>
      </div>

      {isFlash ? <FlashcardDeck cards={cards} /> : (
        <article
          className="prose-cram mt-6"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}

    </div>
  );
}

function FlashcardDeck({ cards }: { cards: Card[] }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[i];

  return (
    <div className="mt-8">
      {/* interactive deck */}
      <div className="print:hidden">
        <button
          onClick={() => setFlipped(!flipped)}
          className={`mx-auto block min-h-[220px] w-full max-w-lg rounded-2xl border p-8 text-center transition-colors ${flipped ? "border-[#bfe0f5] bg-[#f0f6fc]" : "border-[#e3e0da] bg-white shadow-[0_10px_30px_rgba(26,24,21,0.06)]"}`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#b6b1aa]">
            {flipped ? "Answer" : "Question"} · tap to flip
          </p>
          <p className={`mt-4 whitespace-pre-wrap ${flipped ? "text-left text-[14.5px] leading-relaxed" : "text-[16px] font-semibold leading-snug"}`}>
            {flipped ? card.back : card.front}
          </p>
        </button>
        <div className="mx-auto mt-4 flex max-w-lg items-center justify-between">
          <button
            onClick={() => { setI(Math.max(0, i - 1)); setFlipped(false); }}
            disabled={i === 0}
            className="rounded-full border border-[#e3e0da] px-4 py-1.5 text-[13px] disabled:opacity-30"
          >
            ‹ Prev
          </button>
          <span className="text-xs tabular-nums text-[#8a857e]">{i + 1} / {cards.length}</span>
          <button
            onClick={() => { setI(Math.min(cards.length - 1, i + 1)); setFlipped(false); }}
            disabled={i === cards.length - 1}
            className="rounded-full bg-[#1a1815] px-4 py-1.5 text-[13px] text-white disabled:opacity-30"
          >
            Next ›
          </button>
        </div>
      </div>

      {/* print layout: all cards as a table */}
      <table className="mt-8 hidden w-full border-collapse text-[12px] print:table">
        <thead>
          <tr>
            <th className="border border-[#ddd] p-2 text-left">Question</th>
            <th className="border border-[#ddd] p-2 text-left">Answer</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((c, idx) => (
            <tr key={idx}>
              <td className="border border-[#ddd] p-2 align-top font-semibold">{c.front}</td>
              <td className="border border-[#ddd] p-2 align-top whitespace-pre-wrap">{c.back}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
