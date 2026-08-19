"use client";

import { use, useCallback, useEffect, useState } from "react";
import { renderMarkdown } from "@/lib/markdown";
import "katex/dist/katex.min.css";

interface ThreadRow {
  id: string;
  title: string;
  body: string | null;
  votes: number;
  createdAt: string;
  replyCount: number;
}
interface Reply {
  id: string;
  body: string;
  isTutor: number;
  createdAt: string;
}

function ago(d: string) {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
}

export default function ForumPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const [list, setList] = useState<ThreadRow[]>([]);
  const [title, setTitle] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/forum?courseId=${courseId}`);
    if (res.ok) setList(await res.json());
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  async function openThread(id: string) {
    setOpenId(id === openId ? null : id);
    setReplies([]);
    if (id !== openId) {
      const res = await fetch(`/api/forum?threadId=${id}`);
      if (res.ok) setReplies(await res.json());
    }
  }

  async function post() {
    if (!title.trim() || busy) return;
    setBusy(true);
    const hadTutor = title.includes("@tutor");
    await fetch("/api/forum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", courseId, title }),
    });
    setTitle("");
    setBusy(false);
    load();
    if (hadTutor) setTimeout(load, 1500);
  }

  async function reply(threadId: string) {
    if (!replyText.trim() || busy) return;
    setBusy(true);
    await fetch("/api/forum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reply", threadId, text: replyText }),
    });
    setReplyText("");
    setBusy(false);
    const res = await fetch(`/api/forum?threadId=${threadId}`);
    if (res.ok) setReplies(await res.json());
    load();
  }

  async function vote(threadId: string) {
    await fetch("/api/forum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "vote", threadId }),
    });
    load();
  }

  return (
    <div className="mx-auto max-w-2xl py-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          post();
        }}
        className="flex gap-2"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ask the cohort… (mention @tutor and it answers too)"
          className="flex-1 rounded-full border border-[#e3e0da] px-5 py-2.5 text-sm outline-none placeholder:text-[#b6b1aa] focus:border-[#2777c2]"
        />
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="rounded-full bg-[#1a1815] px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {busy ? "…" : "Post"}
        </button>
      </form>

      {list.length === 0 && (
        <p className="py-14 text-center text-sm text-[#8a857e]">No threads yet — ask the first question.</p>
      )}

      <ul className="mt-5">
        {list.map((t) => (
          <li key={t.id} className="border-t border-[#eeece8] py-3.5 first:border-t-0">
            <div className="flex items-start gap-4">
              <button
                onClick={() => vote(t.id)}
                className="flex min-w-[34px] flex-col items-center text-xs text-[#8a857e] hover:text-[#2777c2]"
                title="Upvote"
              >
                <span className="text-[15px] font-semibold text-[#1a1815]">{t.votes}</span>▲
              </button>
              <div className="min-w-0 flex-1">
                <button onClick={() => openThread(t.id)} className="text-left text-sm font-semibold hover:text-[#2777c2]">
                  {t.title}
                </button>
                <p className="mt-0.5 text-xs text-[#b6b1aa]">
                  {t.replyCount} repl{t.replyCount === 1 ? "y" : "ies"} · {ago(t.createdAt)}
                </p>

                {openId === t.id && (
                  <div className="mt-3 border-l-2 border-[#eeece8] pl-4">
                    {replies.map((r) => (
                      <div key={r.id} className="py-2">
                        <p className="text-[11px] font-semibold text-[#b6b1aa]">
                          {r.isTutor ? <span className="text-[#2777c2]">@tutor</span> : "student"} · {ago(r.createdAt)}
                        </p>
                        <div
                          className="prose-cram mt-1 text-[13.5px]"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(r.body) }}
                        />
                      </div>
                    ))}
                    <div className="mt-2 flex gap-2">
                      <input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Reply… (@tutor to summon it)"
                        className="flex-1 rounded-full border border-[#e3e0da] px-4 py-1.5 text-[13px] outline-none placeholder:text-[#b6b1aa] focus:border-[#2777c2]"
                      />
                      <button
                        onClick={() => reply(t.id)}
                        disabled={busy || !replyText.trim()}
                        className="rounded-full bg-[#f0f6fc] px-4 py-1.5 text-[13px] font-semibold text-[#2777c2] disabled:opacity-40"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
