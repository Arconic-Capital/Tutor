"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** ✓ / ✕ buttons on schedule rows — same effects as the assistant, no model needed. */
export function DoneButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      title="Cross it off"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/items", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "work", id, status: "done" }),
        });
        router.refresh();
      }}
      className="grid h-6 w-6 place-items-center rounded-full border border-[#e3e0da] text-[11px] text-[#8a857e] hover:border-[#2e6e4c] hover:text-[#2e6e4c] disabled:opacity-40"
    >
      ✓
    </button>
  );
}

export function RemoveEventButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      title="Remove"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/items", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "event", id }),
        });
        router.refresh();
      }}
      className="grid h-6 w-6 place-items-center rounded-full text-[11px] text-[#d9d5ce] hover:text-[#9c3b2e] disabled:opacity-40"
    >
      ✕
    </button>
  );
}
