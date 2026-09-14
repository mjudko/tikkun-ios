import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const pagesRoot = path.join(root, "public/data/torah");
const output = path.join(root, "public/data/layout-validation.json");
const flatten = (value) => typeof value === "string" ? [value] : Array.isArray(value) ? value.flatMap(flatten) : [];
const lineText = (row) => flatten(row?.text).join("");
const isBlank = (row) => lineText(row).trim() === "";
const consonants = (text) => text.normalize("NFD").replace(/[\u0591-\u05c7]/g, "").replace(/[^א-ת]/g, "");
const setumaBreaks = (row, page) => {
  if (page === 78 && row.sourceLine >= 6 && row.sourceLine <= 35) return 0;
  return (Array.isArray(row.text) ? row.text : []).reduce((count, column) => {
    const visibleFragments = Array.isArray(column) ? column.filter((fragment) => typeof fragment === "string" && fragment.trim()) : [];
    return count + Math.max(0, visibleFragments.length - 1);
  }, 0);
};

function normalize(data, page) {
  const rows = structuredClone(data).map((row, index) => ({ ...row, sourceLine: index + 1 }));
  if ([61, 111, 148, 200].includes(page)) {
    const index = rows.findIndex((row, rowIndex) => isBlank(row) && rows.slice(rowIndex, rowIndex + 5).every(isBlank));
    if (index >= 0) rows.splice(index + 4, 1);
  }
  if (page === 78) {
    rows.splice(5, 0, { text: [[""]], sourceLine: null, displayOnly: true });
    rows.splice(36, 0, { text: [[""]], sourceLine: null, displayOnly: true });
  }
  while (rows.length < 42) rows.push({ text: [[""]], sourceLine: null, displayOnly: true });
  return rows;
}

const findings = [];
let pagesChecked = 0;
let textRowsChecked = 0;
let blankRows = 0;
let petuchot = 0;
let setumot = 0;
let haazinuLines = 0;
let shiratHayamLines = 0;
let qeriKetiv = 0;
let puncta = 0;
let invertedNuns = 0;

for (let page = 1; page <= 245; page += 1) {
  const data = JSON.parse(await readFile(path.join(pagesRoot, `${page}.json`), "utf8"));
  const display = normalize(data, page);
  pagesChecked += 1;
  assert.equal(display.length, 42, `amud ${page} must have 42 display rows`);
  const restored = display.filter((row) => !row.displayOnly).map(lineText).filter(Boolean);
  const source = data.map(lineText).filter(Boolean);
  assert.deepEqual(restored, source, `amud ${page} source order`);
  assert.ok(display.every((row) => {
    const columns = Array.isArray(row.text) ? row.text : [];
    return columns.length >= 1 && columns.every((column) => Array.isArray(column));
  }), `amud ${page} row structure`);

  display.forEach((row) => {
    const text = lineText(row);
    if (text.trim()) textRowsChecked += 1;
    else blankRows += 1;
    if (row.isPetucha || text.includes("#(פ)")) petuchot += 1;
    setumot += setumaBreaks(row, page);
    if ((page === 242 && row.sourceLine >= 8) || (page === 243 && row.sourceLine <= 35)) haazinuLines += 1;
    if (page === 78 && row.sourceLine >= 6 && row.sourceLine <= 35) shiratHayamLines += 1;
    qeriKetiv += (text.match(/#\[/g) ?? []).length;
    puncta += (text.match(/[\u05c4\u05c5]/g) ?? []).length;
    invertedNuns += (text.match(/\u05c6/g) ?? []).length;
  });
}

assert.equal(qeriKetiv, 33);
assert.equal(puncta, 32);
assert.equal(invertedNuns, 2);
assert.equal(petuchot, 290);
assert.equal(setumot, 379);
assert.equal(haazinuLines, 70);
assert.equal(shiratHayamLines, 30);

const transitionEndings = {
  61: "מהיעשהלוותרדבתפרעהלרחץעלהיאר",
  111: "כייקריבמכםקרבןליהוהמןהבהמהמןהבקר",
  148: "נשיאימטותאבותםראשיאלפיישראלהם",
  200: "יוםמחרבדרךהרשעירעדקדשברנע",
};
for (const [pageText, expected] of Object.entries(transitionEndings)) {
  const page = Number(pageText);
  const data = JSON.parse(await readFile(path.join(pagesRoot, `${page}.json`), "utf8"));
  assert.equal(consonants(lineText(data.at(-1))), expected, `amud ${page} final text`);
}

const report = {
  status: "passed",
  checkedAt: "2026-08-13",
  pagesChecked,
  physicalRowsChecked: pagesChecked * 42,
  textRowsChecked,
  blankRows,
  petuchot,
  setumot,
  shiratHayamLines,
  haazinuLines,
  qeriKetiv,
  puncta,
  invertedNuns,
  findings,
};
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
