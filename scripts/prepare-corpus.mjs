import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceRoot = process.argv[2] ?? "/tmp/tikkun-audit-source/tikkun.io-develop";
const projectRoot = path.resolve(import.meta.dirname, "..");
const sourcePages = path.join(sourceRoot, "src/data/pages/torah");
const targetPages = path.join(projectRoot, "public/data/torah");

function flatten(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flatten);
  return [];
}

await mkdir(targetPages, { recursive: true });
await mkdir(path.join(projectRoot, "public/fonts"), { recursive: true });

const checksums = {};
let sourceRows = 0;
let qeriKetiv = 0;
let puncta = 0;
let invertedNuns = 0;
let petuchot = 0;
let setumot = 0;
let haazinuLines = 0;

for (let page = 1; page <= 245; page += 1) {
  const sourcePath = path.join(sourcePages, `${page}.json`);
  const targetPath = path.join(targetPages, `${page}.json`);
  const buffer = await readFile(sourcePath);
  await writeFile(targetPath, buffer);
  checksums[`${page}.json`] = createHash("sha256").update(buffer).digest("hex");
  const data = JSON.parse(buffer.toString("utf8"));
  sourceRows += data.length;
  data.forEach((row, rowIndex) => {
    const fragments = flatten(row?.text);
    const joined = fragments.join(" ");
    if (row?.isPetucha || joined.includes("#(פ)")) petuchot += 1;
    if (!(page === 78 && rowIndex + 1 >= 6 && rowIndex + 1 <= 35)) {
      setumot += (Array.isArray(row?.text) ? row.text : []).reduce((count, column) => {
        const visibleFragments = Array.isArray(column) ? column.filter((fragment) => typeof fragment === "string" && fragment.trim()) : [];
        return count + Math.max(0, visibleFragments.length - 1);
      }, 0);
    }
    if (Array.isArray(row?.text) && row.text.length > 1) haazinuLines += 1;
    qeriKetiv += (joined.match(/#\[/g) ?? []).length;
    puncta += (joined.match(/[\u05c4\u05c5]/g) ?? []).length;
    invertedNuns += (joined.match(/\u05c6/g) ?? []).length;
  });
}

await copyFile(path.join(sourceRoot, "assets/fonts/ShlomosemiStam.ttf"), path.join(projectRoot, "public/fonts/ShlomosemiStam.ttf"));
await copyFile(path.join(sourceRoot, "LICENSE"), path.join(projectRoot, "public/data/tikkun-io-LICENSE.txt"));
const fontBuffer = await readFile(path.join(projectRoot, "public/fonts/ShlomosemiStam.ttf"));
checksums["ShlomosemiStam.ttf"] = createHash("sha256").update(fontBuffer).digest("hex");

const manifest = {
  edition: "Tikkun.io 245-column Torah snapshot",
  sourceRepository: "https://github.com/akivajgordon/tikkun.io",
  pinnedOn: "2026-08-13",
  physicalRowsAfterNormalization: 245 * 42,
  sourceRows,
  qeriKetiv,
  puncta,
  invertedNuns,
  petuchot,
  setumot,
  haazinuLines,
  normalization: {
    bookTransitions: "One blank display row is removed from each five-row book break on amudim 61, 111, 148, and 200; no text row is removed.",
    shiratHayam: "A blank display row is inserted immediately above source row 6 and immediately below source row 35 on amud 78.",
  },
  checksums,
};

await writeFile(path.join(projectRoot, "public/data/corpus-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(JSON.stringify({ sourceRows, qeriKetiv, puncta, invertedNuns, petuchot, setumot, haazinuLines }, null, 2));
