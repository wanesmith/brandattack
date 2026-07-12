"use client";
import { useRouter } from "next/navigation";

export type UserRow = {
  id: string;
  email: string;
  name: string;
  verified: boolean;
  orders: number;
  hasAddress: boolean;
  joined: string;
};

// Whole customer row is clickable → opens the customer detail page.
export function UserRows({ rows }: { rows: UserRow[] }) {
  const router = useRouter();
  return (
    <>
      {rows.map((u) => (
        <tr
          key={u.id}
          onClick={() => router.push(`/admin/users/${u.id}`)}
          className="cursor-pointer hover:bg-[var(--background)]"
        >
          <td className="px-4 py-2 font-mono text-xs text-[var(--accent)]">{u.email}</td>
          <td className="px-4 py-2">{u.name || "—"}</td>
          <td className="px-4 py-2">
            {u.verified ? (
              <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">
                Verified
              </span>
            ) : (
              <span className="font-mono text-[10px] uppercase tracking-wider text-amber-400">No</span>
            )}
          </td>
          <td className="px-4 py-2">{u.orders}</td>
          <td className="px-4 py-2 text-[var(--muted)]">{u.hasAddress ? "✓" : "—"}</td>
          <td className="px-4 py-2 text-[var(--muted)]">{u.joined}</td>
        </tr>
      ))}
    </>
  );
}
