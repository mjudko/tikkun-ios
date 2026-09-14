import { shiratHayamRows, type ShiratHayamPattern } from "./poetry-layout";

export const NUN_HAFUCHA = "׆";
export const PHYSICAL_LINES = 42;

export type AccentRank = "emperor" | "king" | "duke" | "count" | "servant" | "auxiliary" | "punctuation";
export type PrimaryRank = Exclude<AccentRank, "auxiliary" | "punctuation">;
export type PageKind = "ordinary" | "book-gap" | "shirat-hayam" | "haazinu";
export type Face = "scroll" | "practice";

export type AccentMeta = {
  key: string;
  name: string;
  hebrew: string;
  rank: AccentRank;
  code: number;
  note?: string;
};

export type DisplayLine = {
  columns: string[][];
  petucha: boolean;
  sourceLine: number | null;
  kind: PageKind;
  aliyot?: number[];
  doubleAliyot?: number[];
  songPattern?: ShiratHayamPattern;
};

export type ParsedToken = {
  display: string;
  rawPractice: string;
  ketiv?: string;
  qeri?: string;
};

export type PracticeOptions = {
  nekudot: boolean;
  trop: boolean;
  ranks: Record<PrimaryRank, boolean>;
  scribalMarks: boolean;
};

export type AliyahReadingMode = "standard" | "double";
export type AliyahStart = { page: number; line: number; aliyah: number };

export function aliyotForReading(line: DisplayLine, page: number, mode: AliyahReadingMode, inheritedStarts: AliyahStart[] = []) {
  if (mode === "standard") return line.aliyot ?? [];
  return [...new Set([
    ...inheritedStarts.filter((start) => start.page === page && start.line === line.sourceLine).map((start) => start.aliyah),
    ...(line.doubleAliyot ?? []),
  ])];
}

export type PhraseBreakRank = Exclude<PrimaryRank, "servant">;
export type PhraseHighlight = {
  rank: PhraseBreakRank;
  phrase: number;
  start: boolean;
  end: boolean;
};

export const rankDetails: Record<AccentRank, { label: string; hebrew: string; icon: string; description: string }> = {
  emperor: { label: "Emperors", hebrew: "קֵיסָרִים", icon: "♛", description: "Etnachta and verse-final silluq" },
  king: { label: "Kings", hebrew: "מְלָכִים", icon: "♔", description: "Major disjunctives" },
  duke: { label: "Dukes", hebrew: "מִשְׁנִים", icon: "◆", description: "Secondary disjunctives" },
  count: { label: "Counts", hebrew: "שָׁלִישִׁים", icon: "◇", description: "Lesser disjunctives" },
  servant: { label: "Servants", hebrew: "מְשָׁרְתִים", icon: "●", description: "Conjunctive accents" },
  auxiliary: { label: "Auxiliary marks", hebrew: "סִימָנֵי עֵזֶר", icon: "·", description: "Meteg and exceptional signs" },
  punctuation: { label: "Punctuation", hebrew: "פִּסּוּק", icon: "׃", description: "Paseq and sof pasuq" },
};

const accent = (code: number, key: string, name: string, hebrew: string, rank: AccentRank, note?: string): AccentMeta => ({ code, key, name, hebrew, rank, note });

export const accentByCode: Record<number, AccentMeta> = {
  0x0591: accent(0x0591, "etnachta", "Etnachta", "אֶתְנַחְתָּא", "emperor"),
  0x0592: accent(0x0592, "segol", "Segol", "סְגוֹל", "king"),
  0x0593: accent(0x0593, "shalshelet", "Shalshelet", "שַלְשֶלֶת", "king"),
  0x0594: accent(0x0594, "zakef-katan", "Zakef katan", "זָקֵף קָטֹן", "king"),
  0x0595: accent(0x0595, "zakef-gadol", "Zakef gadol", "זָקֵף גָּדוֹל", "king"),
  0x0596: accent(0x0596, "tipcha", "Tipcha", "טִפְּחָא", "king"),
  0x0597: accent(0x0597, "revia", "Revia", "רְבִיעִי", "duke"),
  0x0598: accent(0x0598, "zarka", "Zarka", "זַרְקָא", "duke"),
  0x0599: accent(0x0599, "pashta", "Pashta", "פַּשְׁטָא", "duke"),
  0x059a: accent(0x059a, "yetiv", "Yetiv", "יְתִיב", "duke"),
  0x059b: accent(0x059b, "tevir", "Tevir", "תְּבִיר", "duke"),
  0x059c: accent(0x059c, "geresh", "Geresh", "גֵּרֵשׁ", "count"),
  0x059d: accent(0x059d, "geresh-mukdam", "Geresh mukdam", "גֵּרֵשׁ מֻקְדָּם", "count"),
  0x059e: accent(0x059e, "gershayim", "Gershayim", "גֵּרְשַׁיִם", "count"),
  0x059f: accent(0x059f, "karnei-para", "Karnei para", "קַרְנֵי פָרָה", "count"),
  0x05a0: accent(0x05a0, "telisha-gedola", "Telisha gedola", "תְּלִישָׁא גְדוֹלָה", "count"),
  0x05a1: accent(0x05a1, "pazer", "Pazer", "פָּזֵר", "count"),
  0x05a2: accent(0x05a2, "atnach-hafukh", "Atnach hafukh", "אַטְנַח הָפוּךְ", "auxiliary", "Poetic-system Unicode sign"),
  0x05a3: accent(0x05a3, "munach", "Munach", "מֻנַּח", "servant"),
  0x05a4: accent(0x05a4, "mahapach", "Mahapach", "מַהְפַּךְ", "servant"),
  0x05a5: accent(0x05a5, "mercha", "Mercha", "מֵרְכָא", "servant"),
  0x05a6: accent(0x05a6, "mercha-kefula", "Mercha kefula", "מֵרְכָא כְּפוּלָה", "servant"),
  0x05a7: accent(0x05a7, "darga", "Darga", "דַּרְגָּא", "servant"),
  0x05a8: accent(0x05a8, "kadma", "Kadma", "קַדְמָא", "servant"),
  0x05a9: accent(0x05a9, "telisha-ketana", "Telisha ketana", "תְּלִישָׁא קְטַנָּה", "servant"),
  0x05aa: accent(0x05aa, "yerach-ben-yomo", "Yerach ben yomo", "יֵרַח בֶּן יוֹמוֹ", "auxiliary", "Poetic-system Unicode sign"),
  0x05ab: accent(0x05ab, "ole", "Ole", "עוֹלֶה", "auxiliary", "Poetic-system Unicode sign"),
  0x05ac: accent(0x05ac, "iluy", "Iluy", "עִלּוּי", "auxiliary", "Poetic-system Unicode sign"),
  0x05ad: accent(0x05ad, "dechi", "Dechi", "דְּחִי", "auxiliary", "Poetic-system Unicode sign"),
  0x05ae: accent(0x05ae, "tsinorit", "Tsinorit / Zinor", "צִנּוֹרִית", "duke", "Exceptional compound sign in the prose corpus"),
  0x05c0: accent(0x05c0, "paseq", "Paseq", "פָּסֵק", "punctuation"),
  0x05c3: accent(0x05c3, "sof-pasuq", "Sof pasuq", "סוֹף פָּסוּק", "punctuation"),
};

export const silluqMeta = accent(0x05bd, "silluq", "Silluq", "סִלּוּק", "emperor", "Verse-final use of U+05BD");
export const metegMeta = accent(0x05bd, "meteg", "Meteg", "מֶתֶג", "auxiliary", "Non-final use of U+05BD");

export const primaryRanks: PrimaryRank[] = ["emperor", "king", "duke", "count", "servant"];

const phraseBreakRanks: PhraseBreakRank[] = ["emperor", "king", "duke", "count"];

/**
 * A cantillation phrase consists of its conjunctive words and the disjunctive
 * that closes them. This produces the smallest visible phrase units; the rank
 * of the closing accent communicates their place in the larger verse tree.
 */
export function phraseHighlightsForTokens(tokens: Array<{ id: string; marks: AccentMeta[] }>) {
  const highlights = new Map<string, PhraseHighlight>();
  let pending: Array<{ id: string; marks: AccentMeta[] }> = [];
  let phrase = 0;
  tokens.forEach((token) => {
    pending.push(token);
    const terminalRank = phraseBreakRanks.find((rank) => token.marks.some((mark) => mark.rank === rank))
      ?? (token.marks.some((mark) => mark.key === "paseq") ? "count" : undefined);
    if (!terminalRank) return;
    pending.forEach((pendingToken, index) => highlights.set(pendingToken.id, {
      rank: terminalRank,
      phrase,
      start: index === 0,
      end: index === pending.length - 1,
    }));
    phrase += 1;
    pending = [];
  });
  return highlights;
}

function flattenStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flattenStrings);
  return [];
}

function isBlankLine(line: DisplayLine) {
  return line.columns.flat(2).every((fragment) => fragment.trim() === "");
}

/** The Torah's terminal phrase is intentionally short, never justified. */
export function terminalTorahLineIndex(lines: DisplayLine[], page: number) {
  return page === 245 ? lines.findLastIndex((line) => !isBlankLine(line)) : -1;
}

function normalizeSourceLine(value: unknown, sourceLine: number): DisplayLine {
  const row = value && typeof value === "object" ? value as { text?: unknown; isPetucha?: boolean; aliyot?: unknown } : {};
  const rawColumns = Array.isArray(row.text) ? row.text.map((column) => flattenStrings(column)) : [flattenStrings(row.text)];
  const marker = rawColumns.flat().some((fragment) => fragment.includes("#(פ)"));
  const cleanedColumns = rawColumns.map((column) => column
    .map((fragment) => fragment.replace(/#\(פ\)/g, "").trim())
    .filter(Boolean));
  const columns = cleanedColumns.flat().length > 0 ? cleanedColumns : [[""]];
  const aliyot = Array.isArray(row.aliyot)
    ? row.aliyot.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const standard = (item as { standard?: unknown }).standard;
      return typeof standard === "number" && standard >= 1 && standard <= 7 ? [standard] : [];
    })
    : [];
  const doubleAliyot = Array.isArray(row.aliyot)
    ? row.aliyot.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const double = (item as { double?: unknown }).double;
      return typeof double === "number" && double >= 1 && double <= 7 ? [double] : [];
    })
    : [];
  return {
    columns,
    petucha: Boolean(row.isPetucha) || marker,
    sourceLine,
    kind: "ordinary",
    ...(aliyot.length ? { aliyot } : {}),
    ...(doubleAliyot.length ? { doubleAliyot } : {}),
  };
}

export function setumaBreakCount(line: DisplayLine) {
  if (line.kind !== "ordinary") return 0;
  return line.columns.reduce((count, column) => count + Math.max(0, column.filter((fragment) => fragment.trim()).length - 1), 0);
}

const blankLine = (kind: PageKind = "ordinary"): DisplayLine => ({ columns: [[""]], petucha: false, sourceLine: null, kind });

export function normalizePageData(data: unknown, page: number): DisplayLine[] {
  if (!Array.isArray(data)) return [];
  const lines = data.map((row, index) => normalizeSourceLine(row, index + 1));

  if ([61, 111, 148, 200].includes(page) && lines.length === 43) {
    const blankIndex = lines.findIndex((line, index) => isBlankLine(line) && lines.slice(index, index + 5).every(isBlankLine));
    if (blankIndex >= 0) lines.splice(blankIndex + 4, 1);
    lines.forEach((line) => {
      if (isBlankLine(line)) line.kind = "book-gap";
    });
  }

  if (page === 78 && lines.length === 40) {
    const songStart = lines.findIndex((line) => line.sourceLine === 6);
    if (songStart >= 0) lines.splice(songStart, 0, blankLine("shirat-hayam"));
    const songEnd = lines.findIndex((line) => line.sourceLine === 35);
    if (songEnd >= 0) lines.splice(songEnd + 1, 0, blankLine("shirat-hayam"));
    lines.forEach((line) => {
      if (line.sourceLine && line.sourceLine >= 6 && line.sourceLine <= 35) {
        line.kind = "shirat-hayam";
        line.songPattern = shiratHayamRows[line.sourceLine];
      }
    });
  }

  if (page === 242 || page === 243) {
    lines.forEach((line) => {
      const isSong = page === 242
        ? Boolean(line.sourceLine && line.sourceLine >= 8)
        : Boolean(line.sourceLine && line.sourceLine <= 35);
      if (isSong || isBlankLine(line)) line.kind = "haazinu";
    });
  }

  while (lines.length < PHYSICAL_LINES) lines.push(blankLine());
  return lines;
}

function encodeQeriKetiv(text: string) {
  const pairs: Array<{ ketiv: string; qeri: string; trailingGap: boolean }> = [];
  const encoded = text
    .replace(/#\(פ\)/g, "")
    .replace(/\(׆\)#/g, "׆ ")
    .replace(/#\(׆\)/g, " ׆")
    .replace(/([^\s־#]+)#\[([^\]]+)\]/g, (_match, ketiv: string, qeri: string) => {
      const trailingGap = /\s$/.test(qeri);
      const index = pairs.push({ ketiv, qeri: qeri.trim().replace(/־\s+/g, "־"), trailingGap }) - 1;
      return `\uE000${index}\uE001${trailingGap ? "\uE002" : ""}`;
    });
  return { encoded, pairs };
}

function resolvePlaceholders(chunk: string, pairs: Array<{ ketiv: string; qeri: string; trailingGap: boolean }>, face: Face) {
  let qeri: string | undefined;
  let ketiv: string | undefined;
  const display = chunk.replace(/\uE000(\d+)\uE001/g, (_match, indexText: string) => {
    const pair = pairs[Number(indexText)];
    if (!pair) return "";
    qeri = pair.qeri;
    ketiv = pair.ketiv;
    return face === "practice" ? pair.qeri : pair.ketiv;
  }).replace(/\uE002/g, face === "scroll" ? " " : "");
  return { display, qeri, ketiv };
}

export function stripForScroll(text: string, scribalMarks: boolean) {
  const allowedMarks = scribalMarks ? "\\u05c4\\u05c5\\u05c6" : "";
  return text
    .replace(/־/g, " ")
    .normalize("NFD")
    .replace(new RegExp(`[^א-ת\\s${allowedMarks}]`, "g"), "")
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFC");
}

export function parseFragment(text: string, face: Face, scribalMarks = true): ParsedToken[] {
  const { encoded, pairs } = encodeQeriKetiv(text);
  return encoded.split(/\s+/).filter(Boolean).map((chunk) => {
    const practice = resolvePlaceholders(chunk, pairs, "practice");
    const selected = resolvePlaceholders(chunk, pairs, face);
    return {
      display: face === "scroll" ? stripForScroll(selected.display, scribalMarks) : selected.display,
      rawPractice: practice.display,
      ketiv: selected.ketiv,
      qeri: selected.qeri,
    };
  }).filter((token) => token.display.length > 0);
}

function isVowelCode(code: number) {
  return (code >= 0x05b0 && code <= 0x05bc) || code === 0x05bf || (code >= 0x05c1 && code <= 0x05c2) || code === 0x05c7;
}

export function filterPracticeWord(text: string, options: PracticeOptions) {
  const hasSofPasuq = text.includes("׃");
  const characters = Array.from(text.normalize("NFD"));
  const finalSilluqIndex = hasSofPasuq ? characters.lastIndexOf("ֽ") : -1;
  return characters.filter((character, index) => {
    const code = character.codePointAt(0) ?? 0;
    if (code >= 0x0591 && code <= 0x05ae) {
      const mark = accentByCode[code];
      if (!options.trop || !mark) return false;
      return primaryRanks.includes(mark.rank as PrimaryRank) ? options.ranks[mark.rank as PrimaryRank] : true;
    }
    if (code === 0x05bd) {
      if (!options.trop) return false;
      return index === finalSilluqIndex ? options.ranks.emperor : true;
    }
    if (isVowelCode(code)) return options.nekudot;
    if (code === 0x05c4 || code === 0x05c5 || code === 0x05c6) return options.scribalMarks;
    return true;
  }).join("").normalize("NFC");
}

export function marksForWord(word: string): AccentMeta[] {
  const characters = Array.from(word);
  const finalSilluqIndex = word.includes("׃") ? characters.lastIndexOf("ֽ") : -1;
  return characters.flatMap((character, index) => {
    const code = character.codePointAt(0) ?? 0;
    if (code === 0x05bd) return [index === finalSilluqIndex ? silluqMeta : metegMeta];
    const mark = accentByCode[code];
    return mark ? [mark] : [];
  });
}

export function consonants(text: string) {
  return text.normalize("NFD").replace(/[\u0591-\u05c7]/g, "").replace(/[^א-ת]/g, "").normalize("NFC");
}

export type SpecialGlyph = { page: number; word: string; baseIndex: number; className: "large-letter" | "small-letter" | "broken-letter"; label: string; sourceLine?: number };

export const specialGlyphs: SpecialGlyph[] = [
  { page: 1, word: "בראשית", baseIndex: 0, className: "large-letter", label: "Enlarged bet of Bereshit", sourceLine: 1 },
  { page: 111, word: "ויקרא", baseIndex: 4, className: "small-letter", label: "Diminished aleph of Vayikra", sourceLine: 41 },
  { page: 124, word: "גחון", baseIndex: 2, className: "large-letter", label: "Enlarged vav of gachon", sourceLine: 23 },
  { page: 185, word: "שלום", baseIndex: 2, className: "broken-letter", label: "Split vav of shalom", sourceLine: 10 },
  { page: 210, word: "שמע", baseIndex: 2, className: "large-letter", label: "Enlarged ayin of Shema", sourceLine: 6 },
  { page: 210, word: "אחד", baseIndex: 2, className: "large-letter", label: "Enlarged dalet of echad", sourceLine: 6 },
];
