import Link from "next/link";
import { schema } from "@/db";
import { NewProductForm } from "./NewProductForm";

export default function NewProductPage() {
  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/products"
        className="text-xs text-[var(--muted)] hover:text-[var(--accent)]"
      >
        ← Back to products
      </Link>
      <h1 className="mt-2 text-3xl font-bold">New product</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Add a single product by hand. For bulk uploads use Import lot instead.
      </p>
      <NewProductForm
        divisions={[...schema.divisionEnum.enumValues]}
        genders={[...schema.genderEnum.enumValues]}
      />
    </div>
  );
}
