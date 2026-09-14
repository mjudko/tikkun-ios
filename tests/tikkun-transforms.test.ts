import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { approximateParshaColumns, doubleParshaForSlug, doubleParshiot, parshaForSlug, parshiot } from "../app/lib/catalog";
import { shiratHayamRows } from "../app/lib/poetry-layout";
import {
  aliyotForReading,
  filterPracticeWord,
  marksForWord,
  normalizePageData,
  parseFragment,
  phraseHighlightsForTokens,
  primaryRanks,
  setumaBreakCount,
  stripForScroll,
  terminalTorahLineIndex,
  type PrimaryRank,
} from "../app/lib/tikkun";

const ranks = Object.fromEntries(primaryRanks.map((rank) => [rank, true])) as Record<PrimaryRank, boolean>;

test("qeri and ketiv stay paired on their respective faces", () => {
  const source = "לֵאָ֖ה בגד#[בָּ֣א גָ֑ד] וַתִּקְרָ֥א";
  const scroll = parseFragment(source, "scroll", true);
  const practice = parseFragment(source, "practice", true);
  assert.equal(scroll.map((token) => token.display).join(" "), "לאה בגד ותקרא");
  assert.equal(practice.map((token) => token.display).join(" "), "לֵאָ֖ה בָּ֣א גָ֑ד וַתִּקְרָ֥א");
  assert.deepEqual(practice[1], {
    display: "בָּ֣א גָ֑ד",
    rawPractice: "בָּ֣א גָ֑ד",
    ketiv: "בגד",
    qeri: "בָּ֣א גָ֑ד",
  });
});

test("scribal marks are independent from vowels and cantillation", () => {
  const word = "וְעַל־אַהֲרֹ֜ןׄ";
  assert.equal(filterPracticeWord(word, { nekudot: false, trop: false, ranks, scribalMarks: true }), "ועל־אהרןׄ");
  assert.equal(filterPracticeWord(word, { nekudot: false, trop: false, ranks, scribalMarks: false }), "ועל־אהרן");
  assert.equal(stripForScroll(word, true), "ועל אהרןׄ");
  assert.equal(stripForScroll(word, false), "ועל אהרן");
  assert.equal(filterPracticeWord("׆", { nekudot: false, trop: false, ranks, scribalMarks: true }), "׆");
});

test("silluq is the final U+05BD before sof pasuq while earlier uses remain meteg", () => {
  const marks = marksForWord("הָאָֽרֶץ׃");
  assert.deepEqual(marks.filter((mark) => mark.code === 0x05bd).map((mark) => mark.name), ["Silluq"]);
  const repeated = marksForWord("וּֽמֵֽי־אֵֽל׃").filter((mark) => mark.code === 0x05bd).map((mark) => mark.name);
  assert.deepEqual(repeated, ["Meteg", "Meteg", "Silluq"]);
});

test("rank switches remove only their target hierarchy", () => {
  const all = filterPracticeWord("אֱלֹהִ֑ים וַיֹּ֖אמֶר וַיְהִ֣י", { nekudot: true, trop: true, ranks, scribalMarks: true });
  const noEmperors = filterPracticeWord("אֱלֹהִ֑ים וַיֹּ֖אמֶר וַיְהִ֣י", { nekudot: true, trop: true, ranks: { ...ranks, emperor: false }, scribalMarks: true });
  const noKings = filterPracticeWord("אֱלֹהִ֑ים וַיֹּ֖אמֶר וַיְהִ֣י", { nekudot: true, trop: true, ranks: { ...ranks, king: false }, scribalMarks: true });
  assert.match(all, /֑/);
  assert.doesNotMatch(noEmperors, /֑/);
  assert.match(noEmperors, /[֖֣]/);
  assert.match(noKings, /֑/);
  assert.doesNotMatch(noKings, /֖/);
  assert.match(noKings, /֣/);
});

test("groups conjunctive words with the disjunctive that closes their phrase", () => {
  const tokens = [
    { id: "a", marks: marksForWord("וַיְהִ֣י") },
    { id: "b", marks: marksForWord("אֱלֹהִ֔ים") },
    { id: "c", marks: marksForWord("אֵ֥ת") },
    { id: "d", marks: marksForWord("הָאָֽרֶץ׃") },
  ];
  const highlights = phraseHighlightsForTokens(tokens);
  assert.deepEqual(highlights.get("a"), { rank: "king", phrase: 0, start: true, end: false });
  assert.deepEqual(highlights.get("b"), { rank: "king", phrase: 0, start: false, end: true });
  assert.deepEqual(highlights.get("c"), { rank: "emperor", phrase: 1, start: true, end: false });
  assert.deepEqual(highlights.get("d"), { rank: "emperor", phrase: 1, start: false, end: true });
});

test("treats paseq as a visible lesser phrase break", () => {
  const highlights = phraseHighlightsForTokens([{ id: "paseq", marks: marksForWord("מֻנַּ֣ח׀") }]);
  assert.deepEqual(highlights.get("paseq"), { rank: "count", phrase: 0, start: true, end: true });
});

test("structural normalization keeps exactly 42 rows and every nonblank source row", () => {
  const transition = [
    { text: [["סוף ספר"]] },
    ...Array.from({ length: 5 }, () => ({ text: [[""]] })),
    ...Array.from({ length: 37 }, (_, index) => ({ text: [[`שורה ${index + 1}`]] })),
  ];
  const normalized = normalizePageData(transition, 61);
  assert.equal(normalized.length, 42);
  assert.equal(normalized.filter((line) => line.kind === "book-gap").length, 4);
  assert.equal(normalized.at(-1)?.columns.flat(2).join(""), "שורה 37");
});

test("counts only genuine setuma gaps, not song bricks or terminal padding", () => {
  const ordinary = { columns: [["סוף", "ראש", "המשך"]], petucha: false, sourceLine: 1, kind: "ordinary" as const };
  const song = { ...ordinary, kind: "shirat-hayam" as const };
  assert.equal(setumaBreakCount(ordinary), 2);
  assert.equal(setumaBreakCount(song), 0);

  const terminal = normalizePageData([{ text: [["לְעֵינֵי כׇּל־יִשְׂרָאֵל׃", ""]] }], 245)[0];
  assert.deepEqual(terminal.columns, [["לְעֵינֵי כׇּל־יִשְׂרָאֵל׃"]]);
  assert.equal(setumaBreakCount(terminal), 0);
});

test("preserves alternate aliyah starts for double-parsha readings", () => {
  const line = normalizePageData([{
    text: [["וַיְדַבֵּר"]],
    aliyot: [{ standard: 3, double: 2 }],
  }], 104)[0];
  assert.deepEqual(line.aliyot, [3]);
  assert.deepEqual(line.doubleAliyot, [2]);
  assert.deepEqual(aliyotForReading(line, 104, "standard"), [3]);
  assert.deepEqual(aliyotForReading(line, 104, "double"), [2]);
  assert.deepEqual(aliyotForReading({ ...line, doubleAliyot: undefined }, 240, "double", [{ page: 240, line: 1, aliyah: 4 }]), [4]);
});

test("defines all seven Torah double-parsha combinations", () => {
  assert.equal(doubleParshiot.length, 7);
  assert.equal(doubleParshaForSlug("vayakhel")?.slug, "vayakhel-pekudei");
  assert.equal(doubleParshaForSlug("pekudei")?.slug, "vayakhel-pekudei");
  assert.equal(doubleParshaForSlug("haazinu"), undefined);
  assert.equal(approximateParshaColumns("matot", true), "9.1");
});

test("every double-parsha range resolves to exactly seven aliyah starts", async () => {
  const pagesRoot = path.resolve(import.meta.dirname, "../public/data/torah");
  for (const pair of doubleParshiot) {
    const first = parshaForSlug(pair.first)!;
    const secondIndex = parshiot.findIndex((item) => item.slug === pair.second);
    const endPage = parshiot[secondIndex + 1]?.page ?? 246;
    const found = new Set<number>([1, ...(pair.secondStartAliyah ? [pair.secondStartAliyah] : [])]);
    for (let page = first.page; page < endPage; page += 1) {
      const data = JSON.parse(await readFile(path.join(pagesRoot, `${page}.json`), "utf8"));
      normalizePageData(data, page).forEach((line) => line.doubleAliyot?.forEach((aliyah) => found.add(aliyah)));
    }
    assert.deepEqual([...found].sort(), [1, 2, 3, 4, 5, 6, 7], pair.slug);
  }
});

test("leaves the final Torah phrase short and continuous", () => {
  const lines = normalizePageData([
    { text: [["וְלֹא־קָם נָבִיא"]] },
    { text: [["לְעֵינֵי כׇּל־יִשְׂרָאֵל׃", ""]] },
  ], 245);
  assert.equal(terminalTorahLineIndex(lines, 245), 1);
  assert.equal(terminalTorahLineIndex(lines, 244), -1);
  assert.deepEqual(lines[1].columns, [["לְעֵינֵי כׇּל־יִשְׂרָאֵל׃"]]);
});

test("uses an explicit thirty-row Shirat Hayam template", () => {
  assert.equal(Object.keys(shiratHayamRows).length, 30);
  assert.equal(shiratHayamRows[6], "opening");
  assert.equal(shiratHayamRows[7], "brick-three");
  assert.equal(shiratHayamRows[8], "brick-two");
  assert.equal(shiratHayamRows[33], "brick-three");
  assert.equal(shiratHayamRows[34], "ending-even");
  assert.equal(shiratHayamRows[35], "ending-tail");
});

test("normalizes the canonical 290 petuchot and 379 setumot", async () => {
  const pagesRoot = path.resolve(import.meta.dirname, "../public/data/torah");
  let petuchot = 0;
  let setumot = 0;
  for (let page = 1; page <= 245; page += 1) {
    const data = JSON.parse(await readFile(path.join(pagesRoot, `${page}.json`), "utf8"));
    const lines = normalizePageData(data, page);
    petuchot += lines.filter((line) => line.petucha).length;
    setumot += lines.reduce((count, line) => count + setumaBreakCount(line), 0);
  }
  assert.equal(petuchot, 290);
  assert.equal(setumot, 379);
});

test("all 245 amudim preserve expected scroll ketiv and practice qeri character for character", async () => {
  const pagesRoot = path.resolve(import.meta.dirname, "../public/data/torah");
  const flatten = (value: unknown): string[] => typeof value === "string" ? [value] : Array.isArray(value) ? value.flatMap(flatten) : [];
  const cleanMarkers = (text: string) => text.replace(/#\(פ\)/g, "").replace(/\(׆\)#/g, "׆ ").replace(/#\(׆\)/g, " ׆");
  let fragments = 0;
  for (let page = 1; page <= 245; page += 1) {
    const data = JSON.parse(await readFile(path.join(pagesRoot, `${page}.json`), "utf8"));
    for (const fragment of data.flatMap((row: { text?: unknown }) => flatten(row.text))) {
      if (!/[א-ת]/.test(fragment)) continue;
      fragments += 1;
      const expectedPractice = cleanMarkers(fragment)
        .replace(/([^\s־#]+)#\[([^\]]+)\]/g, "$2")
        .replace(/־\s+/g, "־")
        .replace(/\s+/g, " ")
        .trim();
      const expectedScroll = stripForScroll(cleanMarkers(fragment).replace(/([^\s־#]+)#\[([^\]]+)\]/g, (_match: string, ketiv: string, qeri: string) => `${ketiv}${/\s$/.test(qeri) ? " " : ""}`), true);
      const actualPractice = parseFragment(fragment, "practice", true).map((token) => token.display).join(" ");
      const actualScroll = parseFragment(fragment, "scroll", true).map((token) => token.display).join(" ");
      assert.equal(actualPractice, expectedPractice, `practice amud ${page}: ${fragment}`);
      assert.equal(actualScroll, expectedScroll, `scroll amud ${page}: ${fragment}`);
    }
  }
  assert.ok(fragments > 10_000);
});
