"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";

export type ProductRow = {
  id: string;
  img: string | null;
  title: string;
  articleNo: string;
  division: string;
  price: string;
  stock: string;
  sold: string;
  revenue: string;
  active: boolean;
};

// Whole product row is clickable → opens the product edit page.
export function ProductRows({ rows }: { rows: ProductRow[] }) {
  const router = useRouter();
  return (
    <>
      {rows.map((r) => (
        <tr
          key={r.id}
          onClick={() => router.push(`/admin/products/${r.id}`)}
          className="cursor-pointer hover:bg-[var(--background)]"
        >
          <td className="px-4 py-2">
            <div className="relative h-10 w-10 overflow-hidden rounded-sm bg-[var(--background)]">
              {r.img && <Image src={r.img} alt="" fill sizes="40px" className="object-cover" />}
            </div>
          </td>
          <td className="px-4 py-2 font-medium">{r.title}</td>
          <td className="px-4 py-2 font-mono text-xs">{r.articleNo}</td>
          <td className="px-4 py-2 text-[var(--muted)]">{r.division}</td>
          <td className="px-4 py-2">{r.price}</td>
          <td className="px-4 py-2">{r.stock}</td>
          <td className="px-4 py-2">{r.sold}</td>
          <td className="px-4 py-2">{r.revenue}</td>
          <td className="px-4 py-2">
            <span
              className={
                r.active
                  ? "rounded-sm bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-300"
                  : "rounded-sm bg-zinc-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400"
              }
            >
              {r.active ? "Active" : "Hidden"}
            </span>
          </td>
        </tr>
      ))}
    </>
  );
}
