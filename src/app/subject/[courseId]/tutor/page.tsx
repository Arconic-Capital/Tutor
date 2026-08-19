"use client";

import { use, useRef, useState } from "react";

interface Msg {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

const CHIPS = [
  "Quiz me on a past HSC question",
  "What topics come up most in the HSC?",
  "Explain the hardest concept in this course",
  "What do the marking guidelines reward?",
];

export default function TutorPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const docIdsRef = useRef<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setInput("");
    setBusy(true);
    const history = [...messages, { role: "user" as const, content: question }];
    setMessages([...history, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          docIds: docIdsRef.current,
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());

      const ids = res.headers.get("x-cram-doc-ids");
      if (ids) docIdsRef.current = ids.split(",").filter(Boolean);
      const sources = decodeURIComponent(res.headers.get("x-cram-sources") ?? "")
        .split("|")
        .filter(Boolean);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const snapshot = acc;
        setMessages([...history, { role: "assistant", content: snapshot, sources }]);
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      }
    } catch (e) {
      setMessages([
        ...history,
        { role: "assistant", content: `Something went wrong: ${(e as Error).message}` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[420px] flex-col py-4">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-5">
            <p className="text-[15px] text-[#8a857e]">
              Ask anything — answers cite real HSC papers and marking guidelines.
            </p>
            <div className="flex max-w-md flex-wrap justify-center gap-2">
              {CHIPS.map((c) => (
                <button
                  key={c}
                  onClick={() => send(c)}
                  className="rounded-full bg-[#f0f6fc] px-4 py-2 text-[13px] font-medium text-[#2777c2] hover:bg-[#e1eefb]"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-4">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-[#faf9f7] px-4 py-2.5 text-[14.5px]">
                {m.content}
              </div>
            ) : (
              <div key={i} className="max-w-[92%] text-[14.5px] leading-relaxed">
                <div className="whitespace-pre-wrap">
                  {m.content || (busy && i === messages.length - 1 ? "…" : "")}
                </div>
                {m.sources && m.sources.length > 0 && m.content && (
                  <p className="mt-2 text-xs text-[#b6b1aa]">
                    Drawing on: {m.sources.slice(0, 4).join(" · ")}
                  </p>
                )}
              </div>
            ),
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mx-auto flex w-full max-w-2xl items-center gap-2 rounded-full border border-[#e3e0da] py-1.5 pl-5 pr-1.5 shadow-[0_1px_3px_rgba(26,24,21,0.05)]"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={busy ? "Thinking…" : "Ask this subject anything…"}
          disabled={busy}
          className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#b6b1aa]"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="grid h-9 w-9 place-items-center rounded-full bg-[#1a1815] text-white disabled:opacity-30"
        >
          ↑
        </button>
      </form>
    </div>
  );
}
