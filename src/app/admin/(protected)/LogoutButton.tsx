"use client";

export function LogoutButton() {
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }
  return (
    <button
      type="button"
      onClick={logout}
      className="block w-full rounded border border-[var(--border)] px-3 py-1.5 text-left text-xs text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
    >
      Sign out
    </button>
  );
}
