import test from "node:test";
import assert from "node:assert/strict";

import { ToolRegistry, ArtifactRegistry } from "../src/registry/index.js";

test("ToolRegistry registers and retrieves tools", () => {
  const registry = new ToolRegistry();
  const renderer = {
    render: (toolCall) => `<div>${toolCall.name}</div>`
  };

  registry.register("calculator", renderer);
  assert.equal(registry.has("calculator"), true);
  assert.deepEqual(registry.get("calculator"), renderer);
});

test("ToolRegistry throws on invalid registration", () => {
  const registry = new ToolRegistry();
  
  assert.throws(() => registry.register("", { render: () => {} }), /non-empty string/);
  assert.throws(() => registry.register("test", {}), /render function/);
  assert.throws(() => registry.register("test", { render: "not a function" }), /render function/);
});

test("ToolRegistry lists all registered tools", () => {
  const registry = new ToolRegistry();
  const renderer = { render: () => {} };
  
  registry.register("tool1", renderer);
  registry.register("tool2", renderer);
  registry.register("tool3", renderer);
  
  const list = registry.list();
  assert.deepEqual(list.sort(), ["tool1", "tool2", "tool3"]);
});

test("ToolRegistry unregisters tools", () => {
  const registry = new ToolRegistry();
  const renderer = { render: () => {} };
  
  registry.register("calculator", renderer);
  assert.equal(registry.has("calculator"), true);
  
  registry.unregister("calculator");
  assert.equal(registry.has("calculator"), false);
  assert.equal(registry.get("calculator"), null);
});

test("ToolRegistry supports subscriptions", (t, done) => {
  const registry = new ToolRegistry();
  const events = [];
  
  const unsubscribe = registry.subscribe((event) => {
    events.push(event);
  });
  
  registry.register("tool1", { render: () => {} });
  registry.unregister("tool1");
  
  unsubscribe();
  
  assert.equal(events.length, 2);
  assert.equal(events[0].type, "tool.registered");
  assert.equal(events[1].type, "tool.unregistered");
  done();
});

test("ArtifactRegistry registers and retrieves artifact renderers", () => {
  const registry = new ArtifactRegistry();
  const renderer = {
    render: (artifact) => `<div>${artifact.type}</div>`
  };

  registry.register("code", renderer);
  assert.equal(registry.has("code"), true);
  assert.deepEqual(registry.get("code"), renderer);
});

test("ArtifactRegistry throws on invalid registration", () => {
  const registry = new ArtifactRegistry();
  
  assert.throws(() => registry.register("", { render: () => {} }), /non-empty string/);
  assert.throws(() => registry.register("code", {}), /render function/);
  assert.throws(() => registry.register("code", { render: "not a function" }), /render function/);
});

test("ArtifactRegistry lists all registered types", () => {
  const registry = new ArtifactRegistry();
  const renderer = { render: () => {} };
  
  registry.register("code", renderer);
  registry.register("table", renderer);
  registry.register("chart", renderer);
  
  const list = registry.list();
  assert.deepEqual(list.sort(), ["chart", "code", "table"]);
});

test("ArtifactRegistry unregisters artifact types", () => {
  const registry = new ArtifactRegistry();
  const renderer = { render: () => {} };
  
  registry.register("code", renderer);
  assert.equal(registry.has("code"), true);
  
  registry.unregister("code");
  assert.equal(registry.has("code"), false);
  assert.equal(registry.get("code"), null);
});

test("ArtifactRegistry supports subscriptions", (t, done) => {
  const registry = new ArtifactRegistry();
  const events = [];
  
  const unsubscribe = registry.subscribe((event) => {
    events.push(event);
  });
  
  registry.register("code", { render: () => {} });
  registry.unregister("code");
  
  unsubscribe();
  
  assert.equal(events.length, 2);
  assert.equal(events[0].type, "artifact.registered");
  assert.equal(events[1].type, "artifact.unregistered");
  done();
});
