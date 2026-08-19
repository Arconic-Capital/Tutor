"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Change {
  icon: string;
  text: string;
}
interface Turn {
  role: "user" | "assistant";
  text: string;
  changes?: Change[];
}

/** Slide-in schedule assistant — "cross off the worksheet", "training moved to 4pm", "add eco essay friday". */
export default function AssistantPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send() {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);
    setTurns((t) => [...t, { role: "user", text: message }]);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error(await res.text());
      const r = await res.json();
      setTurns((t) => [...t, { role: "assistant", text: r.reply, changes: r.changes }]);
      if (r.replan) {
        fetch("/api/prep", { method: "POST" }).then(() => router.refresh());
      }
      router.refresh();
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
    } catch (e) {
      setTurns((t) => [...t, { role: "assistant", text: `Something broke: ${(e as Error).message.slice(0, 80)}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* edge tab */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-xl bg-[#1a1815] px-2.5 py-4 text-[11px] font-semibold text-white [writing-mode:vertical-rl]"
        >
          Assistant
        </button>
      )}

      {open && (
        <div className="fixed right-0 top-0 z-50 flex h-screen w-[360px] flex-col border-l border-[#eeece8] bg-white shadow-[-12px_0_40px_rgba(26,24,21,0.08)] max-sm:w-full">
          <div className="flex items-center justify-between border-b border-[#eeece8] px-4 py-3">
            <p className="text-sm font-semibold">Assistant</p>
            <button onClick={() => setOpen(false)} className="text-sm text-[#8a857e] hover:text-[#1a1815]">✕</button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
            {turns.length === 0 && (
              <div className="text-[13px] leading-relaxed text-[#8a857e]">
                <p>Tell me what changed — I&apos;ll update your schedule.</p>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {[
                    "cross off the 7.3 worksheet",
                    "training moved to 4pm thursdays",
                    "the depth study got pushed to sep 4",
                    "add eco homework q1-8 due friday",
                  ].map((s) => (
                    <li key={s}>
                      <button
                        onClick={() => setInput(s)}
                        className="rounded-full bg-[#faf9f7] px-3 py-1.5 text-left text-[12.5px] text-[#6e6862] hover:bg-[#f0f6fc] hover:text-[#2777c2]"
                      >
                        “{s}”
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-col gap-3">
              {turns.map((t, i) =>
                t.role === "user" ? (
                  <p key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[#faf9f7] px-3.5 py-2 text-[13.5px]">
                    {t.text}
                  </p>
                ) : (
                  <div key={i} className="max-w-[95%]">
                    {t.changes?.map((c, j) => (
                      <div key={j} className="mb-1.5 flex items-start gap-2 rounded-xl border border-[#bfe0f5] bg-[#f0f6fc]/60 px-3 py-2 text-[12.5px]">
                        <span className="text-[#2777c2]">{c.icon}</span>
                        <span>{c.text}</span>
                      </div>
                    ))}
                    <p className="text-[13.5px] leading-relaxed">{t.text}</p>
                  </div>
                ),
              )}
              {busy && <p className="text-[13px] text-[#b6b1aa]">Making the change…</p>}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2 border-t border-[#eeece8] p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="cross out… move… add…"
              disabled={busy}
              className="flex-1 rounded-full border border-[#e3e0da] px-4 py-2 text-[13.5px] outline-none placeholder:text-[#b6b1aa] focus:border-[#2777c2]"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#1a1815] text-sm text-white disabled:opacity-30"
            >
              ↑
            </button>
          </form>
        </div>
      )}
    </>
  );
}
