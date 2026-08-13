import test from "node:test";
import assert from "node:assert/strict";

test("@ai-ui/web is safe to import in non-browser runtimes", async () => {
  const mod = await import("../src/index.js");
  assert.equal(typeof mod.defineAIChatElement, "function");
});
