"use client";
import { useRouter } from "next/navigation";

export type OrderRow = {
  id: string;
  when: string;
  email: string;
  total: string;
  status: string;
  fulfilled: boolean;
};

// Whole order row is clickable → opens the order detail.
export function OrderRows({ rows }: { rows: OrderRow[] }) {
  const router = useRouter();
  return (
    <>
      {rows.map((o) => (
        <tr
          key={o.id}
          onClick={() => router.push(`/admin/orders/${o.id}`)}
          className="cursor-pointer hover:bg-[var(--background)]"
        >
          <td className="px-4 py-2 text-[var(--muted)]">{o.when}</td>
          <td className="px-4 py-2 font-mono text-xs text-[var(--accent)] underline-offset-2 group-hover:underline">
            {o.id.slice(0, 8)}
          </td>
          <td className="px-4 py-2 font-mono text-xs">{o.email}</td>
          <td className="px-4 py-2">{o.total}</td>
          <td className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
            {o.status}
          </td>
          <td className="px-4 py-2">
            {o.fulfilled ? (
              <span className="rounded-sm bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-400">
                ✓ Fulfilled
              </span>
            ) : (
              <span className="rounded-sm bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-400">
                Pending
              </span>
            )}
          </td>
        </tr>
      ))}
    </>
  );
}
