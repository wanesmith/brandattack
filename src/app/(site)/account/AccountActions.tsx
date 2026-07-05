"use client";
import { useState } from "react";

export function ResendVerification() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function resend() {
    setState("sending");
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      setState(res.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="mt-3 flex items-center gap-3">
      <button
        type="button"
        onClick={resend}
        disabled={state === "sending" || state === "sent"}
        className="rounded-sm border border-accent px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-accent hover:bg-accent hover:text-paper disabled:opacity-50"
      >
        {state === "sending" ? "Sending…" : state === "sent" ? "Sent ✓" : "Resend verification"}
      </button>
      {state === "sent" && (
        <span className="text-xs text-ink/60">Check your inbox for the link.</span>
      )}
      {state === "error" && <span className="text-xs text-red-600">Couldn&apos;t send. Try again.</span>}
    </div>
  );
}

export function LogoutButton() {
  const [loading, setLoading] = useState(false);
  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch {
      setLoading(false);
    }
  }
  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className="font-mono text-xs uppercase tracking-wider text-ink/60 underline-offset-2 hover:text-accent hover:underline disabled:opacity-50"
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
