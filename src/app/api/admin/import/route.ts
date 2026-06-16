import { NextResponse } from "next/server";
import { rm } from "node:fs/promises";
import { importLot, saveUploadedFile } from "@/lib/import-lot";
import { requireAdmin } from "@/lib/admin-auth";

// Allow large multipart uploads; otherwise Next.js caps at 1 MB.
export const runtime = "nodejs";
// Vercel Hobby caps at 300s; bump to 600 if/when we upgrade to Pro.
// For very large lots (full 3.3 GB zip) we still recommend the CLI seed path.
export const maxDuration = 300;

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;

  let form: FormData;
  try {
    form = await req.formData();
  } catch (e) {
    return NextResponse.json({ error: `Bad multipart body: ${e}` }, { status: 400 });
  }

  const xlsx = form.get("xlsx");
  const zip = form.get("zip");
  const replaceStock = form.get("replaceStock") === "true";
  const markupOverCost = Number(form.get("markupOverCost") ?? 2);

  if (!(xlsx instanceof File) || xlsx.size === 0) {
    return NextResponse.json({ error: "Spreadsheet file is required" }, { status: 400 });
  }
  if (zip && !(zip instanceof File)) {
    return NextResponse.json({ error: "Bad zip upload" }, { status: 400 });
  }

  let xlsxPath: string | null = null;
  let zipPath: string | null = null;
  try {
    xlsxPath = await saveUploadedFile(xlsx, "xlsx");
    if (zip instanceof File && zip.size > 0) {
      zipPath = await saveUploadedFile(zip, "zip");
    }

    const summary = await importLot(xlsxPath, zipPath, {
      replaceStock,
      markupOverCost: Number.isFinite(markupOverCost) && markupOverCost > 0 ? markupOverCost : 2,
    });

    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    console.error("[/api/admin/import] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  } finally {
    if (xlsxPath) rm(xlsxPath, { force: true }).catch(() => {});
    if (zipPath) rm(zipPath, { force: true }).catch(() => {});
  }
}
