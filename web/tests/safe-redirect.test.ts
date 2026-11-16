import assert from "node:assert/strict";
import { test } from "node:test";

import { safeRedirectPath } from "../src/lib/safe-redirect.ts";

test("keeps same-origin relative paths", () => {
  assert.equal(safeRedirectPath("/analysis?year=2025"), "/analysis?year=2025");
});

test("falls back to / for empty input", () => {
  assert.equal(safeRedirectPath(null), "/");
  assert.equal(safeRedirectPath(""), "/");
});

test("rejects absolute and protocol-relative URLs", () => {
  assert.equal(safeRedirectPath("https://evil.example"), "/");
  assert.equal(safeRedirectPath("//evil.example"), "/");
});

test("rejects backslash and control-character tricks", () => {
  assert.equal(safeRedirectPath("/\\evil.example"), "/");
  assert.equal(safeRedirectPath("/\t/evil.example"), "/");
});
