import { getAllFacetsForAdmin } from "@/lib/facets";
import { FiltersEditor } from "./FiltersEditor";

export const dynamic = "force-dynamic";

export default async function FiltersAdmin() {
  const facets = await getAllFacetsForAdmin();

  return (
    <div>
      <h1 className="text-3xl font-bold">Storefront filters</h1>
      <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
        Control which filter facets show on the shop sidebar, what they&apos;re called, and which
        values are exposed. Reorder with the position numbers — lower goes first.
        Labels here override the raw values from the import data.
      </p>

      <FiltersEditor initial={facets} />
    </div>
  );
}
