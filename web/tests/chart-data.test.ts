import assert from "node:assert/strict";
import { test } from "node:test";

import { groupTopCategories } from "../src/lib/chart-data.ts";

const cat = (key: string, total: number) => ({ key, label: key, total });

test("returns the input untouched when within the limit", () => {
  const data = [cat("a", 1), cat("b", 2)];
  assert.deepEqual(groupTopCategories(data, 5), data);
});

test("folds the smallest categories into その他", () => {
  const data = [cat("a", 10), cat("b", 9), cat("c", 1), cat("d", 2)];
  const result = groupTopCategories(data, 2);
  assert.deepEqual(
    result.map((c) => [c.key, c.total]),
    [["a", 10], ["b", 9], ["other", 3]]
  );
});
