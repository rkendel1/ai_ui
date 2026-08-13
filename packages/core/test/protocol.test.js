import test from "node:test";
import assert from "node:assert/strict";

import { AI_EVENT_TYPES, CANONICAL_EVENT_SEQUENCE } from "../src/protocol/index.js";

test("canonical protocol includes expected event types", () => {
  assert.deepEqual(Object.values(AI_EVENT_TYPES), [
    "session.started",
    "message.started",
    "text.delta",
    "reasoning.delta",
    "tool.call.started",
    "tool.call.delta",
    "tool.call.completed",
    "tool.approval.required",
    "tool.approved",
    "tool.rejected",
    "artifact.created",
    "artifact.updated",
    "artifact.completed",
    "artifact.failed",
    "citation.added",
    "message.completed",
    "error.occurred",
    "session.completed"
  ]);

  assert.equal(new Set(CANONICAL_EVENT_SEQUENCE).size, CANONICAL_EVENT_SEQUENCE.length);
});

