import assert from "node:assert/strict";
import test from "node:test";
import { variableGapAllocations } from "../app/lib/spacing";

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

test("balances narrow and wide gaps without changing the target line width", () => {
  const allocations = variableGapAllocations(0, 6, 2, [4, 11, 5, 9, 3, 8]);
  assert.ok(allocations.some((value) => value < 0));
  assert.ok(allocations.some((value) => value > 0));
  assert.ok(Math.abs(sum(allocations)) < 0.001);
});

test("uses compression to preserve font size on a mildly overfull line", () => {
  const allocations = variableGapAllocations(-7.5, 6, 2, [5, 8, 4, 10, 6]);
  assert.ok(allocations.every((value) => value >= -2 && value <= 6));
  assert.ok(Math.abs(sum(allocations) + 7.5) < 0.001);
});

test("clamps impossible spacing requests to safe per-gap limits", () => {
  const wide = variableGapAllocations(100, 6, 2, [4, 7, 5]);
  const narrow = variableGapAllocations(-100, 6, 2, [4, 7, 5]);
  assert.ok(wide.every((value) => Math.abs(value - 6) < 0.001));
  assert.ok(narrow.every((value) => Math.abs(value + 2) < 0.001));
});
