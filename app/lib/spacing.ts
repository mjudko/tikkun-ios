export function variableGapAllocations(
  total: number,
  maximumGapExtra: number,
  maximumGapCompression: number,
  pairLengths: number[],
) {
  if (!pairLengths.length) return [];
  const averagePairLength = pairLengths.reduce((sum, length) => sum + length, 0) / pairLengths.length;
  const scores = pairLengths.map((length, index) => Math.min(1.25, Math.max(0.75,
    1 + ((length / averagePairLength) - 1) * 0.3 + (index % 2 === 0 ? 0.055 : -0.055),
  )));
  const scoreMean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const centeredScores = scores.map((score) => score - scoreMean);
  const maximumScore = Math.max(...centeredScores.map(Math.abs), 0.0001);
  const contrast = Math.max(maximumGapCompression * 1.1, maximumGapExtra * 0.48);
  const raw = centeredScores.map((score) => (score / maximumScore) * contrast);
  const lowerBound = -maximumGapCompression;
  const upperBound = maximumGapExtra;
  const target = Math.min(upperBound * pairLengths.length, Math.max(lowerBound * pairLengths.length, total));

  // Shift the whole rhythm until its bounded values add up to the exact line
  // target. Binary search keeps the result stable even when several gaps hit
  // their narrow or wide limit.
  let lowShift = lowerBound - Math.max(...raw);
  let highShift = upperBound - Math.min(...raw);
  for (let iteration = 0; iteration < 48; iteration += 1) {
    const shift = (lowShift + highShift) / 2;
    const assigned = raw.reduce((sum, value) => sum + Math.min(upperBound, Math.max(lowerBound, value + shift)), 0);
    if (assigned < target) lowShift = shift;
    else highShift = shift;
  }
  const shift = (lowShift + highShift) / 2;
  return raw.map((value) => Math.min(upperBound, Math.max(lowerBound, value + shift)));
}
