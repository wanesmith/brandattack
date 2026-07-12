import ExcelJS from "exceljs";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

// Generates a sample .xlsx matching exactly what the lot importer expects
// (see src/lib/import-lot.ts): an "Asset Report" sheet (headers on row 2), a
// "VerticaL Article Size Qty" sheet (headers on row 1), and an optional
// "Pictures List" sheet (filename, ArticleNo — no header).
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Brand Stoxx";

  // --- Instructions (ignored by the importer; here to guide the user) -------
  const info = wb.addWorksheet("Instructions");
  info.columns = [{ width: 26 }, { width: 82 }];
  const infoRows: [string, string][] = [
    ["Lot upload template", ""],
    ["", ""],
    ["The importer reads these 3 sheets by name — keep the sheet names exactly:", ""],
    ["• Asset Report", "One row per product. HEADERS ARE ON ROW 2; product data starts on row 3."],
    ["• VerticaL Article Size Qty", "One row per size. Headers on row 1: ArticleNo, Attribute (size), Qty."],
    ["• Pictures List", "Optional. Columns: filename, ArticleNo (NO header row)."],
    ["", ""],
    ["Asset Report columns (all required, exact names):", ""],
    ["ArticleNo", "Unique product code, e.g. IF3402. Must match the other sheets."],
    ["Item Description", "Product name / description."],
    ["Season", "e.g. SS26, FW25."],
    ["Division", "One of: FOOTWEAR, APPAREL, HARDWARE."],
    ["Gender", "One of: MEN, WOMEN, UNISEX, KIDS (FEMALE / MALE also accepted)."],
    ["Sports Code", "e.g. RUN, FTB, LFS."],
    ["Product Group", "e.g. RUNNING, TRAINING."],
    ["Product Type", "e.g. SHOES LOW, JERSEY."],
    ["Total Quantity", "Total units for this ArticleNo (should equal the sum of its sizes)."],
    ["Price", "Wholesale/cost in USD. Retail = Price × markup, capped at 0.7 × RRP."],
    ["RRP Price (USD)", "Recommended retail price in USD."],
    ["Status", "Optional. Active (default) or Hidden. Omit the column to leave existing status untouched."],
    ["", ""],
    ["Images", "Name files <ArticleNo>-1.jpg, <ArticleNo>-2.jpg … and upload them in the .zip,"],
    ["", "or list them explicitly in the Pictures List sheet. Formats: jpg, jpeg, png, webp."],
  ];
  infoRows.forEach((r) => info.addRow(r));
  info.getRow(1).font = { bold: true, size: 14 };
  info.getRow(3).font = { bold: true };
  info.getRow(8).font = { bold: true };

  // --- Asset Report ---------------------------------------------------------
  const asset = wb.addWorksheet("Asset Report");
  const HEADERS = [
    "ArticleNo",
    "Item Description",
    "Season",
    "Division",
    "Gender",
    "Sports Code",
    "Product Group",
    "Product Type",
    "Total Quantity",
    "Price",
    "RRP Price (USD)",
    "Status",
  ];
  asset.addRow(["Asset Report"]); // row 1 — title/banner (importer skips it)
  asset.addRow(HEADERS); // row 2 — headers
  asset.addRow([
    "IF3402",
    "Ultraboost Light Running Shoes",
    "SS26",
    "FOOTWEAR",
    "MEN",
    "RUN",
    "RUNNING",
    "SHOES LOW",
    12,
    42.5,
    189.99,
    "Active",
  ]);
  asset.addRow([
    "HK2891",
    "Tiro 24 Training Jersey",
    "SS26",
    "APPAREL",
    "WOMEN",
    "FTB",
    "TRAINING",
    "JERSEY",
    10,
    12.0,
    45.0,
    "Hidden",
  ]);
  asset.getRow(1).font = { bold: true, size: 12 };
  asset.getRow(2).font = { bold: true };
  asset.columns.forEach((c, i) => {
    c.width = i === 1 ? 32 : 15;
  });

  // --- VerticaL Article Size Qty -------------------------------------------
  const vert = wb.addWorksheet("VerticaL Article Size Qty");
  vert.addRow(["ArticleNo", "Attribute", "Qty"]); // row 1 — headers
  const variants: [string, string, number][] = [
    ["IF3402", "8", 2],
    ["IF3402", "9", 4],
    ["IF3402", "10", 4],
    ["IF3402", "11", 2],
    ["HK2891", "S", 2],
    ["HK2891", "M", 3],
    ["HK2891", "L", 3],
    ["HK2891", "XL", 2],
  ];
  variants.forEach((v) => vert.addRow(v));
  vert.getRow(1).font = { bold: true };
  vert.columns.forEach((c) => {
    c.width = 16;
  });

  // --- Pictures List (no header row) ---------------------------------------
  const pics = wb.addWorksheet("Pictures List");
  const pictures: [string, string][] = [
    ["IF3402-1.jpg", "IF3402"],
    ["IF3402-2.jpg", "IF3402"],
    ["HK2891-1.jpg", "HK2891"],
  ];
  pictures.forEach((p) => pics.addRow(p));
  pics.columns.forEach((c) => {
    c.width = 22;
  });

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="brand-stoxx-lot-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
