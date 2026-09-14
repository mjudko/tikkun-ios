import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const pagesRoot = path.join(root, "public/data/torah");
const manifest = JSON.parse(await readFile(path.join(root, "public/data/corpus-manifest.json"), "utf8"));

const flatten = (value) => typeof value === "string" ? [value] : Array.isArray(value) ? value.flatMap(flatten) : [];
const textOf = (row) => flatten(row?.text).join("");
const isBlank = (row) => textOf(row).trim() === "";

function normalizedRows(data, page) {
  const rows = structuredClone(data);
  if ([61, 111, 148, 200].includes(page) && rows.length === 43) {
    const start = rows.findIndex((row, index) => isBlank(row) && rows.slice(index, index + 5).every(isBlank));
    assert.notEqual(start, -1, `amud ${page} has the expected five-row book break`);
    rows.splice(start + 4, 1);
  }
  if (page === 78 && rows.length === 40) {
    rows.splice(5, 0, { text: [[""]], __displayOnly: true });
    rows.splice(36, 0, { text: [[""]], __displayOnly: true });
  }
  return rows;
}

test("ships exactly 245 pinned amudim with matching checksums", async () => {
  const files = (await readdir(pagesRoot)).filter((name) => /^\d+\.json$/.test(name)).sort((a, b) => Number.parseInt(a) - Number.parseInt(b));
  assert.equal(files.length, 245);
  assert.deepEqual(files, Array.from({ length: 245 }, (_, index) => `${index + 1}.json`));
  for (const file of files) {
    const data = await readFile(path.join(pagesRoot, file));
    assert.equal(createHash("sha256").update(data).digest("hex"), manifest.checksums[file], file);
  }
});

test("normalizes every amud to 42 physical rows without losing a text row", async () => {
  let sourceRows = 0;
  let displayRows = 0;
  for (let page = 1; page <= 245; page += 1) {
    const data = JSON.parse(await readFile(path.join(pagesRoot, `${page}.json`), "utf8"));
    sourceRows += data.length;
    const normalized = normalizedRows(data, page);
    displayRows += normalized.length;
    assert.equal(normalized.length, 42, `amud ${page}`);
    const sourceText = data.map(textOf).filter(Boolean);
    const displayText = normalized.filter((row) => !row.__displayOnly).map(textOf).filter(Boolean);
    assert.deepEqual(displayText, sourceText, `amud ${page} preserves every nonblank source row in order`);
  }
  assert.equal(sourceRows, 10_292);
  assert.equal(displayRows, 10_290);
});

test("preserves the complete Masoretic exception inventory", async () => {
  let qeriKetiv = 0;
  let puncta = 0;
  let invertedNuns = 0;
  let explicitPetuchot = 0;
  let markerPetuchot = 0;
  let setumot = 0;
  let haazinuLines = 0;
  for (let page = 1; page <= 245; page += 1) {
    const data = JSON.parse(await readFile(path.join(pagesRoot, `${page}.json`), "utf8"));
    for (const [rowIndex, row] of data.entries()) {
      const text = textOf(row);
      qeriKetiv += (text.match(/#\[/g) ?? []).length;
      puncta += (text.match(/[\u05c4\u05c5]/g) ?? []).length;
      invertedNuns += (text.match(/\u05c6/g) ?? []).length;
      if (row.isPetucha) explicitPetuchot += 1;
      if (text.includes("#(פ)")) markerPetuchot += 1;
      if (!(page === 78 && rowIndex + 1 >= 6 && rowIndex + 1 <= 35)) {
        setumot += (Array.isArray(row.text) ? row.text : []).reduce((count, column) => {
          const visibleFragments = Array.isArray(column) ? column.filter((fragment) => typeof fragment === "string" && fragment.trim()) : [];
          return count + Math.max(0, visibleFragments.length - 1);
        }, 0);
      }
      if (Array.isArray(row.text) && row.text.length > 1) haazinuLines += 1;
    }
  }
  assert.equal(qeriKetiv, 33);
  assert.equal(puncta, 32);
  assert.equal(invertedNuns, 2);
  assert.equal(explicitPetuchot, 288);
  assert.equal(markerPetuchot, 290);
  assert.equal(setumot, 379);
  assert.equal(haazinuLines, 70);
});

test("retains all four formerly truncated transition lines", async () => {
  const expectations = new Map([
    [61, "מה־יעשה לו ותרד בת־פרעה לרחץ על־היאר"],
    [111, "כי־יקריב מכם קרבן ליהוה מן־הבהמה מן־הבקר"],
    [148, "נשיאי מטות אבותם ראשי אלפי ישראל הם"],
    [200, "יום מחרב דרך הר־שעיר עד קדש ברנע"],
  ]);
  for (const [page, expected] of expectations) {
    const data = JSON.parse(await readFile(path.join(pagesRoot, `${page}.json`), "utf8"));
    const normalize = (text) => text.normalize("NFD").replace(/[\u0591-\u05c7]/g, "").replace(/[^א-ת]/g, "");
    assert.equal(normalize(textOf(data.at(-1))), normalize(expected), `amud ${page}`);
  }
});

test("places Shirat Hayam display blanks immediately around the song", async () => {
  const data = JSON.parse(await readFile(path.join(pagesRoot, "78.json"), "utf8"));
  const rows = normalizedRows(data, 78);
  assert.ok(isBlank(rows[5]), "blank above source row 6");
  assert.match(textOf(rows[6]), /אָ֣ז יָשִֽׁיר/);
  assert.match(textOf(rows[35]), /הַיָּ֑ם/);
  assert.ok(isBlank(rows[36]), "blank below source row 35");
  assert.match(textOf(rows[37]), /וַתִּקַּח/);
});

test("contains no mutable remote corpus or font URL in application source", async () => {
  const source = [
    await readFile(path.join(root, "app/page.tsx"), "utf8"),
    await readFile(path.join(root, "app/globals.css"), "utf8"),
  ].join("\n");
  assert.doesNotMatch(source, /raw\.githubusercontent\.com/);
  assert.doesNotMatch(source, /refs\/heads\/develop/);
  assert.doesNotMatch(source, /scaleX\s*\(/);
});

test("keeps a setuma at its minimum while making the continuation flush-left", async () => {
  const css = await readFile(path.join(root, "app/globals.css"), "utf8");
  assert.match(css, /\.section-gap\s*\{[^}]*flex:\s*1 1 5\.95em[^}]*min-width:\s*5\.95em[^}]*\}/s);
});

test("does not ship the removed frequency lens", async () => {
  const page = await readFile(path.join(root, "app/page.tsx"), "utf8");
  assert.doesNotMatch(page, /frequency-index|FREQUENCY LENS|WORD \+ TROP|RARE SEQUENCE/);
  await assert.rejects(readFile(path.join(root, "public/data/frequency-index.json")), { code: "ENOENT" });
});

test("keeps cantillation phrase endings on the RTL reading edge", async () => {
  const css = await readFile(path.join(root, "app/globals.css"), "utf8");
  assert.match(css, /\.phrase-end\s*\{[^}]*box-shadow:\s*inset 1\.5px 0 0 var\(--phrase-edge\)/s);
  assert.match(css, /\.phrase-legend i\s*\{[^}]*box-shadow:\s*inset 2px 0 0 var\(--phrase-edge\)/s);
});

test("keeps justification bounded and section-aware", async () => {
  const page = await readFile(path.join(root, "app/page.tsx"), "utf8");
  const css = await readFile(path.join(root, "app/globals.css"), "utf8");
  assert.match(page, /JUSTIFY_MAX_FONT_FACTOR = 1\.14/);
  assert.match(page, /JUSTIFY_MAX_WORD_SPACE_EM = 0\.62/);
  assert.match(page, /JUSTIFY_MAX_WORD_COMPRESSION_EM = 0\.18/);
  assert.match(page, /SECTION_MAX_WORD_SPACE_EM = 0\.42/);
  assert.match(page, /SECTION_MAX_WORD_COMPRESSION_EM = 0\.12/);
  assert.match(page, /COMPOSER_PREFERRED_MAX_FONT_FACTOR = 1\.035/);
  assert.match(page, /COMPOSER_PREFERRED_MIN_FONT_FACTOR = 0\.97/);
  assert.match(page, /COMPOSER_HARD_MAX_FONT_FACTOR = 1\.1/);
  assert.match(page, /COMPOSER_HARD_MIN_FONT_FACTOR = 0\.93/);
  assert.match(page, /: !isTerminalTorahLine && !line\.petucha && !hasSetuma && line\.kind === "ordinary"/);
  assert.match(page, /balancedPoetry && page === 242 && line\.sourceLine === 2/);
  assert.match(page, /OUTLIER_HARD_MAX_FONT_FACTOR = 1\.125/);
  assert.match(page, /sectionType=\{line\.petucha \? "petucha" : "setuma"\}/);
  assert.match(page, /const minimumBreakWidth = baseSize \* SETUMA_MIN_GAP_EM \* breakCount/);
  assert.match(page, /for \(let correction = 0; correction < 3 && Math\.abs\(targetWidth - rendered\) > 0\.35; correction \+= 1\)/);
  assert.match(page, /const \[calibratedMeasure, setCalibratedMeasure\] = useState\(true\)/);
  assert.match(page, /label="Use calibrated Composer v2 column"/);
  assert.match(css, /\.paper\.composer-v2 \.torah-lines \{ width: min\(100%, 25\.5em\); justify-self: center; \}/);
  assert.match(page, /page === 78 \? "shirat-hayam-page" : ""/);
  assert.match(page, /page === 78 && line\.kind === "ordinary" \? "shirat-context-line" : ""/);
  assert.match(page, /const isShiratHayamOpening = line\.kind === "shirat-hayam" && line\.songPattern === "opening"/);
  assert.match(page, /isShiratHayamOpening && parsed\.length > 1\s*\? "ordinary"/);
  assert.match(css, /\.paper\.shirat-hayam-page \{ padding-inline: 3\.2%; \}/);
  assert.match(css, /\.shirat-hayam-page \.shirat-context-line \{ font-size: \.94em; \}/);
  assert.match(css, /\.paper\.shirat-hayam-page \.torah-lines \{ width: min\(100%, 30em\); justify-self: center; \}/);
  assert.match(css, /\.haazinu-line \.line-fragment \{ width: 100%; overflow: visible; \}/);
  const spacing = await readFile(path.join(root, "app/lib/spacing.ts"), "utf8");
  assert.match(spacing, /const lowerBound = -maximumGapCompression/);
});

test("keeps the width-master prototype local and opt-in", async () => {
  const page = await readFile(path.join(root, "app/page.tsx"), "utf8");
  const css = await readFile(path.join(root, "app/globals.css"), "utf8");
  const [narrow, wide, scribe1, scribe2, scribe3] = await Promise.all([
    readFile(path.join(root, "public/fonts/TikkunStamProto-Narrow.ttf")),
    readFile(path.join(root, "public/fonts/TikkunStamProto-Wide.ttf")),
    readFile(path.join(root, "public/fonts/TikkunStamProto-Scribe1.ttf")),
    readFile(path.join(root, "public/fonts/TikkunStamProto-Scribe2.ttf")),
    readFile(path.join(root, "public/fonts/TikkunStamProto-Scribe3.ttf")),
  ]);
  assert.match(page, /const \[experimentalWidths, setExperimentalWidths\] = useState\(true\)/);
  assert.match(page, /const \[experimentalWidthTier, setExperimentalWidthTier\] = useState<ExperimentalWidthTier>\(2\)/);
  assert.match(page, /const \[showAliyot, setShowAliyot\] = useState\(true\)/);
  assert.match(page, /const \[boldMarks, setBoldMarks\] = useState\(true\)/);
  assert.match(page, /label="Use klaf paper color"/);
  assert.match(page, /type ViewMode = "facing" \| "combined" \| "scroll" \| "practice"/);
  assert.match(page, /useState<ViewMode>\("combined"\)/);
  assert.match(page, /<option value="combined">Combined page<\/option>/);
  assert.match(page, /className="combined-sheet"/);
  assert.match(css, /\.combined-sheet \{ width: 100%; display: grid; grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\)/);
  assert.match(page, /<details className="preferences-panel">/);
  assert.match(page, /<summary><span><b>Preferences<\/b>/);
  assert.match(css, /\.preferences-panel > summary/);
  assert.match(css, /\.klaf-paper \{ --paper: #e9e2d2/);
  assert.match(page, /const \[variableWordSpacing, setVariableWordSpacing\] = useState\(true\)/);
  assert.match(page, /label="Use scribal composition"/);
  assert.match(page, /type LineSpacing = "standard" \| "relaxed" \| "wide" \| "extra-wide"/);
  assert.match(page, /const \[lineSpacing, setLineSpacing\] = useState<LineSpacing>\("wide"\)/);
  assert.match(page, /aria-label="Line spacing"/);
  assert.match(page, /option value="extra-wide">Extra wide/);
  assert.match(css, /\.paper\.line-spacing-wide \{ aspect-ratio: 7 \/ 16\.4; \}/);
  assert.match(css, /\.paper\.line-spacing-extra-wide \{ aspect-ratio: 7 \/ 17\.6; \}/);
  assert.match(page, /label="Bold trop and nekudot"/);
  assert.match(css, /\.bold-marks \.bold-mark-token/);
  assert.match(page, /aria-label="Maximum experimental letter extension"/);
  assert.match(page, /label="Use variable spacing between words"/);
  assert.match(page, /const \[balancedPoetry, setBalancedPoetry\] = useState\(true\)/);
  assert.match(page, /label="Use precision line balancing"/);
  assert.match(css, /\.balanced-poetry \.haazinu-line \.line-column:last-child \.line-fragment \{ text-align: left; \}/);
  assert.match(page, /fit === "poetry-slot"/);
  assert.match(css, /\.balanced-poetry \.shirat-hayam-line\.song-brick-three \.line-column \{ grid-template-columns: minmax\(0, \.27fr\) minmax\(0, 1fr\) minmax\(0, \.27fr\)/);
  assert.match(css, /\.balanced-poetry \.shirat-hayam-line\.song-ending-even \.line-column \{ grid-template-columns: minmax\(0, 1\.5fr\) minmax\(0, 1fr\)/);
  assert.match(css, /\.balanced-poetry \.shirat-hayam-line\.song-ending-tail \.line-column \{ grid-template-columns: minmax\(0, \.18fr\) minmax\(0, 1fr\)/);
  assert.match(page, /params\.set\("parsha", activeParsha\.slug\)/);
  assert.match(page, /params\.set\("amud", String\(page\)\)/);
  assert.match(page, /params\.set\("double", "1"\)/);
  assert.match(page, /<b>Double parsha<\/b>/);
  assert.match(page, /aliyotForReading\(line, page, aliyahMode, doubleParshaStarts\)/);
  assert.match(page, /onClick=\{\(\) => exportPdf\("parsha"\)\}/);
  assert.match(page, /token\.style\.marginInlineStart = `\$\{allocations\[index\]\.toFixed\(2\)\}px`/);
  assert.match(css, /url\("\/fonts\/TikkunStamProto-Narrow\.ttf"\)/);
  assert.match(css, /url\("\/fonts\/TikkunStamProto-Wide\.ttf"\)/);
  assert.match(css, /url\("\/fonts\/TikkunStamProto-Scribe1\.ttf"\)/);
  assert.match(css, /url\("\/fonts\/TikkunStamProto-Scribe2\.ttf"\)/);
  assert.match(css, /url\("\/fonts\/TikkunStamProto-Scribe3\.ttf"\)/);
  for (const font of [narrow, wide, scribe1, scribe2, scribe3]) assert.ok(font.length > 50_000);
});
