// Probe: can we extract embedded images from the xlsx and map them to articles?
import ExcelJS from "exceljs";

const XLSX = process.argv[2];
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(XLSX);

console.log("media count:", wb.model.media?.length ?? 0);
const sample = (wb.model.media ?? []).slice(0, 3).map((m) => ({ type: m.type, ext: m.extension, name: m.name, bytes: m.buffer?.length }));
console.log("media sample:", JSON.stringify(sample, null, 1));

const asset = wb.getWorksheet("Asset Report") ?? wb.worksheets[0];
const imgs = asset.getImages();
console.log("Asset Report images:", imgs.length);
console.log("first 3 anchors (tl):", JSON.stringify(imgs.slice(0, 3).map((i) => ({ imageId: i.imageId, tl: i.range?.tl })), null, 1));

// What columns are the "Picture N" headers on row 2?
const header = asset.getRow(2);
const picCols = [];
header.eachCell((cell, col) => {
  const name = String(cell.value ?? "").trim();
  if (/^picture/i.test(name)) picCols.push({ col, name });
});
console.log("Picture header columns:", JSON.stringify(picCols));

// Map a couple of images to their row's ArticleNo (find ArticleNo column).
let artCol = null;
header.eachCell((cell, col) => {
  if (String(cell.value ?? "").trim() === "ArticleNo") artCol = col;
});
console.log("ArticleNo column:", artCol);
for (const im of imgs.slice(0, 5)) {
  const tlRow = Math.round(im.range.tl.nativeRow ?? im.range.tl.row) + 1; // 0-based → 1-based
  const tlCol = Math.round(im.range.tl.nativeCol ?? im.range.tl.col) + 1;
  const art = artCol ? asset.getRow(tlRow).getCell(artCol).value : "?";
  console.log(`  imageId=${im.imageId} row=${tlRow} col=${tlCol} article=${art}`);
}
