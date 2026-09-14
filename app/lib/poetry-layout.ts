export type ShiratHayamPattern = "opening" | "brick-three" | "brick-two" | "ending-even" | "ending-tail";

// Shirat Hayam is a fixed thirty-line scribal composition. Enumerating the
// rows keeps its closing lines and alternating brickwork independent from
// phrase length or punctuation changes on the practice face.
export const shiratHayamRows: Record<number, ShiratHayamPattern> = {
  6: "opening",
  7: "brick-three",
  8: "brick-two",
  9: "brick-three",
  10: "brick-two",
  11: "brick-three",
  12: "brick-two",
  13: "brick-three",
  14: "brick-two",
  15: "brick-three",
  16: "brick-two",
  17: "brick-three",
  18: "brick-two",
  19: "brick-three",
  20: "brick-two",
  21: "brick-three",
  22: "brick-two",
  23: "brick-three",
  24: "brick-two",
  25: "brick-three",
  26: "brick-two",
  27: "brick-three",
  28: "brick-two",
  29: "brick-three",
  30: "brick-two",
  31: "brick-three",
  32: "brick-two",
  33: "brick-three",
  34: "ending-even",
  35: "ending-tail",
};
