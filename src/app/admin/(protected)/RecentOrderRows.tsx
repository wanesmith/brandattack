"use client";
import { useRouter } from "next/navigation";

export type RecentRow = {
  id: string;
  when: string;
  email: string;
  total: string;
  status: string;
};

function pillTone(status: string): string {
  return status === "paid"
    ? "bg-emerald-500/15 text-emerald-300"
    : status === "shipped"
      ? "bg-blue-500/15 text-blue-300"
      : status === "refunded" || status === "cancelled"
        ? "bg-red-500/15 text-red-300"
        : "bg-yellow-500/15 text-yellow-300";
}

// Clickable recent-order rows on the dashboard → open the order detail.
export function RecentOrderRows({ rows }: { rows: RecentRow[] }) {
  const router = useRouter();
  return (
    <>
      {rows.map((o) => (
        <tr
          key={o.id}
          onClick={() => router.push(`/admin/orders/${o.id}`)}
          className="cursor-pointer hover:bg-[var(--background)]"
        >
          <td className="px-4 py-3 text-[var(--muted)]">{o.when}</td>
          <td className="px-4 py-3 font-mono text-xs">{o.email}</td>
          <td className="px-4 py-3">{o.total}</td>
          <td className="px-4 py-3">
            <span
              className={`inline-block rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${pillTone(o.status)}`}
            >
              {o.status}
            </span>
          </td>
        </tr>
      ))}
    </>
  );
}
