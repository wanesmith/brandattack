"use client";
import { useState } from "react";

export function RecoverButton({
  cartId,
  hasEmail,
  alreadySent,
}: {
  cartId: string;
  hasEmail: boolean;
  alreadySent: boolean;
}) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">(
    alreadySent ? "done" : "idle"
  );
  const [msg, setMsg] = useState<string | null>(null);

  if (!hasEmail) {
    return <span className="text-[11px] text-[var(--muted)]">No email</span>;
  }

  async function send() {
    setState("sending");
    setMsg(null);
    try {
      const res = await fetch("/api/admin/recover-cart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cartId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setState("done");
      setMsg(
        data?.delivered ? "Email sent" : `Logged (${data?.provider ?? "no provider"})`
      );
    } catch (e) {
      setState("error");
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={send}
        disabled={state === "sending"}
        className="rounded-sm border border-[var(--accent)] px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black disabled:opacity-50"
      >
        {state === "sending"
          ? "Sending…"
          : state === "done"
            ? "Resend"
            : "Send recovery"}
      </button>
      {msg && (
        <span
          className={`text-[11px] ${state === "error" ? "text-red-400" : "text-emerald-400"}`}
        >
          {msg}
        </span>
      )}
    </div>
  );
}
