export type Sefer = { name: string; english: string; start: number; end: number };
export type Parsha = { slug: string; hebrew: string; english: string; book: number; page: number; line: number; verses: number };
export type DoubleParsha = { slug: string; first: string; second: string; secondStartAliyah?: number };

export const sefarim: Sefer[] = [
  { name: "בראשית", english: "Genesis", start: 1, end: 60 },
  { name: "שמות", english: "Exodus", start: 61, end: 110 },
  { name: "ויקרא", english: "Leviticus", start: 111, end: 147 },
  { name: "במדבר", english: "Numbers", start: 148, end: 199 },
  { name: "דברים", english: "Deuteronomy", start: 200, end: 245 },
];

export const parshiot: Parsha[] = [
  { slug: "bereshit", hebrew: "בראשית", english: "Bereshit", book: 1, page: 1, line: 1, verses: 146 },
  { slug: "noach", hebrew: "נח", english: "Noach", book: 1, page: 6, line: 32, verses: 153 },
  { slug: "lech-lecha", hebrew: "לך־לך", english: "Lech-Lecha", book: 1, page: 12, line: 10, verses: 126 },
  { slug: "vayera", hebrew: "וירא", english: "Vayera", book: 1, page: 17, line: 8, verses: 147 },
  { slug: "chayei-sarah", hebrew: "חיי שרה", english: "Chayei Sarah", book: 1, page: 23, line: 11, verses: 105 },
  { slug: "toldot", hebrew: "תולדות", english: "Toldot", book: 1, page: 27, line: 14, verses: 106 },
  { slug: "vayetzei", hebrew: "ויצא", english: "Vayetzei", book: 1, page: 31, line: 18, verses: 148 },
  { slug: "vayishlach", hebrew: "וישלח", english: "Vayishlach", book: 1, page: 37, line: 2, verses: 154 },
  { slug: "vayeshev", hebrew: "וישב", english: "Vayeshev", book: 1, page: 42, line: 29, verses: 112 },
  { slug: "miketz", hebrew: "מקץ", english: "Miketz", book: 1, page: 47, line: 9, verses: 146 },
  { slug: "vayigash", hebrew: "ויגש", english: "Vayigash", book: 1, page: 53, line: 11, verses: 106 },
  { slug: "vayechi", hebrew: "ויחי", english: "Vayechi", book: 1, page: 57, line: 21, verses: 85 },
  { slug: "shemot", hebrew: "שמות", english: "Shemot", book: 2, page: 61, line: 7, verses: 124 },
  { slug: "vaera", hebrew: "וארא", english: "Vaera", book: 2, page: 66, line: 11, verses: 121 },
  { slug: "bo", hebrew: "בא", english: "Bo", book: 2, page: 71, line: 23, verses: 106 },
  { slug: "beshalach", hebrew: "בשלח", english: "Beshalach", book: 2, page: 76, line: 18, verses: 116 },
  { slug: "yitro", hebrew: "יתרו", english: "Yitro", book: 2, page: 81, line: 24, verses: 72 },
  { slug: "mishpatim", hebrew: "משפטים", english: "Mishpatim", book: 2, page: 84, line: 36, verses: 118 },
  { slug: "terumah", hebrew: "תרומה", english: "Terumah", book: 2, page: 89, line: 11, verses: 96 },
  { slug: "tetzaveh", hebrew: "תצוה", english: "Tetzaveh", book: 2, page: 92, line: 39, verses: 101 },
  { slug: "ki-tisa", hebrew: "כי תשא", english: "Ki Tisa", book: 2, page: 97, line: 9, verses: 139 },
  { slug: "vayakhel", hebrew: "ויקהל", english: "Vayakhel", book: 2, page: 103, line: 2, verses: 122 },
  { slug: "pekudei", hebrew: "פקודי", english: "Pekudei", book: 2, page: 108, line: 3, verses: 92 },
  { slug: "vayikra", hebrew: "ויקרא", english: "Vayikra", book: 3, page: 111, line: 41, verses: 111 },
  { slug: "tzav", hebrew: "צו", english: "Tzav", book: 3, page: 117, line: 3, verses: 97 },
  { slug: "shemini", hebrew: "שמיני", english: "Shemini", book: 3, page: 121, line: 4, verses: 91 },
  { slug: "tazria", hebrew: "תזריע", english: "Tazria", book: 3, page: 124, line: 36, verses: 67 },
  { slug: "metzora", hebrew: "מצורע", english: "Metzora", book: 3, page: 127, line: 38, verses: 90 },
  { slug: "acharei-mot", hebrew: "אחרי מות", english: "Acharei Mot", book: 3, page: 131, line: 29, verses: 80 },
  { slug: "kedoshim", hebrew: "קדושים", english: "Kedoshim", book: 3, page: 135, line: 15, verses: 64 },
  { slug: "emor", hebrew: "אמור", english: "Emor", book: 3, page: 137, line: 40, verses: 124 },
  { slug: "behar", hebrew: "בהר", english: "Behar", book: 3, page: 143, line: 3, verses: 57 },
  { slug: "bechukotai", hebrew: "בחקתי", english: "Bechukotai", book: 3, page: 145, line: 18, verses: 78 },
  { slug: "bamidbar", hebrew: "במדבר", english: "Bamidbar", book: 4, page: 148, line: 28, verses: 159 },
  { slug: "nasso", hebrew: "נשא", english: "Nasso", book: 4, page: 154, line: 38, verses: 176 },
  { slug: "behaalotecha", hebrew: "בהעלתך", english: "Behaalotecha", book: 4, page: 162, line: 13, verses: 136 },
  { slug: "shelach", hebrew: "שלח", english: "Shelach", book: 4, page: 168, line: 1, verses: 119 },
  { slug: "korach", hebrew: "קרח", english: "Korach", book: 4, page: 172, line: 31, verses: 95 },
  { slug: "chukat", hebrew: "חקת", english: "Chukat", book: 4, page: 177, line: 5, verses: 87 },
  { slug: "balak", hebrew: "בלק", english: "Balak", book: 4, page: 180, line: 38, verses: 104 },
  { slug: "pinchas", hebrew: "פינחס", english: "Pinchas", book: 4, page: 185, line: 6, verses: 168 },
  { slug: "matot", hebrew: "מטות", english: "Matot", book: 4, page: 191, line: 34, verses: 112 },
  { slug: "masei", hebrew: "מסעי", english: "Masei", book: 4, page: 196, line: 14, verses: 132 },
  { slug: "devarim", hebrew: "דברים", english: "Devarim", book: 5, page: 200, line: 40, verses: 105 },
  { slug: "vaetchanan", hebrew: "ואתחנן", english: "Vaetchanan", book: 5, page: 205, line: 25, verses: 118 },
  { slug: "eikev", hebrew: "עקב", english: "Eikev", book: 5, page: 211, line: 23, verses: 111 },
  { slug: "reeh", hebrew: "ראה", english: "Re'eh", book: 5, page: 217, line: 2, verses: 126 },
  { slug: "shoftim", hebrew: "שפטים", english: "Shoftim", book: 5, page: 223, line: 8, verses: 97 },
  { slug: "ki-teitzei", hebrew: "כי תצא", english: "Ki Teitzei", book: 5, page: 227, line: 32, verses: 110 },
  { slug: "ki-tavo", hebrew: "כי תבוא", english: "Ki Tavo", book: 5, page: 232, line: 35, verses: 122 },
  { slug: "nitzavim", hebrew: "נצבים", english: "Nitzavim", book: 5, page: 238, line: 16, verses: 40 },
  { slug: "vayelech", hebrew: "וילך", english: "Vayelech", book: 5, page: 240, line: 19, verses: 30 },
  { slug: "haazinu", hebrew: "האזינו", english: "Haazinu", book: 5, page: 242, line: 8, verses: 52 },
  { slug: "vezot-haberakhah", hebrew: "וזאת הברכה", english: "Vezot Haberakhah", book: 5, page: 244, line: 15, verses: 41 },
];

export const doubleParshiot: DoubleParsha[] = [
  { slug: "vayakhel-pekudei", first: "vayakhel", second: "pekudei" },
  { slug: "tazria-metzora", first: "tazria", second: "metzora" },
  { slug: "acharei-mot-kedoshim", first: "acharei-mot", second: "kedoshim" },
  { slug: "behar-bechukotai", first: "behar", second: "bechukotai" },
  { slug: "chukat-balak", first: "chukat", second: "balak" },
  { slug: "matot-masei", first: "matot", second: "masei" },
  { slug: "nitzavim-vayelech", first: "nitzavim", second: "vayelech", secondStartAliyah: 4 },
];

export function doubleParshaForSlug(slug: string) {
  return doubleParshiot.find((pair) => pair.first === slug || pair.second === slug);
}

export function parshaForSlug(slug: string) {
  return parshiot.find((item) => item.slug === slug);
}

export function activeParshaForPage(page: number) {
  return [...parshiot].reverse().find((item) => page >= item.page) ?? parshiot[0];
}

/** The current cycle anchor keeps the app useful on first load without a server calendar dependency. */
export function currentWeekParshaPage(now = new Date()) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const anchors = [
    ["2026-07-18", "devarim"], ["2026-07-25", "vaetchanan"], ["2026-08-01", "eikev"],
    ["2026-08-08", "reeh"], ["2026-08-15", "shoftim"], ["2026-08-22", "ki-teitzei"],
    ["2026-08-29", "ki-tavo"], ["2026-09-05", "nitzavim"], ["2026-09-19", "haazinu"],
    ["2026-10-03", "vezot-haberakhah"], ["2026-10-10", "bereshit"],
  ] as const;
  // The weekly reading is the one whose Shabbat is today or next; this keeps
  // Sunday–Friday on the upcoming week's parsha rather than the one just read.
  const matching = anchors.find(([iso]) => date <= new Date(`${iso}T00:00:00`));
  return parshiot.find((item) => item.slug === (matching?.[1] ?? "ki-teitzei"))?.page ?? 227;
}

export function approximateParshaColumns(slug: string, double = false) {
  const pair = double ? doubleParshaForSlug(slug) : undefined;
  const startSlug = pair?.first ?? slug;
  const endSlug = pair?.second ?? slug;
  const index = parshiot.findIndex((item) => item.slug === startSlug);
  const endIndex = parshiot.findIndex((item) => item.slug === endSlug);
  const current = parshiot[index] ?? parshiot[0];
  const next = parshiot[(endIndex >= 0 ? endIndex : index) + 1];
  const start = (current.page - 1) * 42 + current.line;
  const end = next ? (next.page - 1) * 42 + next.line : 245 * 42 + 1;
  return Math.max(0.1, (end - start) / 42).toFixed(1);
}
