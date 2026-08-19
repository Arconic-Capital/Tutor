"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Runs the planner brain: builds backwards prep plans and drops study blocks into free slots. */
export default function PrepButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function run() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/prep", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const r = await res.json();
      setMsg(r.blocks ? `✓ ${r.blocks} study blocks scheduled` : r.message ?? "done");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message.slice(0, 80));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex items-center gap-2">
      {msg && <span className="text-[11px] text-[#8a857e]">{msg}</span>}
      <button
        onClick={run}
        disabled={busy}
        className="rounded-full bg-[#1a1815] px-4 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
      >
        {busy ? "Planning…" : "Plan my prep"}
      </button>
    </span>
  );
}
