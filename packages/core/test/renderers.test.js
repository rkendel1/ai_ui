import test from "node:test";
import assert from "node:assert/strict";

import { createRendererRegistry } from "../src/renderers/createRendererRegistry.js";

test("createRendererRegistry creates a new registry instance", () => {
  const registry = createRendererRegistry();
  assert(registry, "Registry should be created");
  assert(typeof registry.registerArtifact, "Should have registerArtifact method");
  assert(typeof registry.registerTool, "Should have registerTool method");
});

test("Renderer Registry can register and retrieve artifact renderers", () => {
  const registry = createRendererRegistry();
  const renderer = {
    type: "custom",
    render: (artifact) => `<div>${artifact.type}</div>`
  };

  registry.registerArtifact("custom", renderer);
  assert(registry.hasArtifact("custom"), "Should have registered artifact");
  assert.deepEqual(registry.getArtifactRenderer("custom"), renderer);
});

test("Renderer Registry can register and retrieve tool renderers", () => {
  const registry = createRendererRegistry();
  const renderer = {
    name: "my_tool",
    renderInput: (toolCall) => `Input: ${toolCall.name}`
  };

  registry.registerTool("my_tool", renderer);
  assert(registry.hasTool("my_tool"), "Should have registered tool");
  assert.deepEqual(registry.getToolRenderer("my_tool"), renderer);
});

test("Renderer Registry throws on invalid artifact registration", () => {
  const registry = createRendererRegistry();

  assert.throws(
    () => registry.registerArtifact("", { render: () => {} }),
    /non-empty string/,
    "Empty type should throw"
  );

  assert.throws(
    () => registry.registerArtifact("custom", {}),
    /render function/,
    "Missing render function should throw"
  );
});

test("Renderer Registry throws on invalid tool registration", () => {
  const registry = createRendererRegistry();

  assert.throws(
    () => registry.registerTool("", { renderInput: () => {} }),
    /non-empty string/,
    "Empty name should throw"
  );

  assert.throws(
    () => registry.registerTool("my_tool", {}),
    /renderInput function/,
    "Missing renderInput function should throw"
  );
});

test("Renderer Registry lists registered artifacts", () => {
  const registry = createRendererRegistry();
  const renderer = { render: () => {} };

  registry.registerArtifact("type1", renderer);
  registry.registerArtifact("type2", renderer);
  registry.registerArtifact("type3", renderer);

  const list = registry.listArtifacts();
  assert.deepEqual(list.sort(), ["type1", "type2", "type3"]);
});

test("Renderer Registry lists registered tools", () => {
  const registry = createRendererRegistry();
  const renderer = { renderInput: () => {} };

  registry.registerTool("tool1", renderer);
  registry.registerTool("tool2", renderer);
  registry.registerTool("tool3", renderer);

  const list = registry.listTools();
  assert.deepEqual(list.sort(), ["tool1", "tool2", "tool3"]);
});

test("Renderer Registry can unregister artifacts", () => {
  const registry = createRendererRegistry();
  const renderer = { render: () => {} };

  registry.registerArtifact("custom", renderer);
  assert(registry.hasArtifact("custom"));

  registry.unregisterArtifact("custom");
  assert(!registry.hasArtifact("custom"));
  assert(!registry.getArtifactRenderer("custom"));
});

test("Renderer Registry can unregister tools", () => {
  const registry = createRendererRegistry();
  const renderer = { renderInput: () => {} };

  registry.registerTool("my_tool", renderer);
  assert(registry.hasTool("my_tool"));

  registry.unregisterTool("my_tool");
  assert(!registry.hasTool("my_tool"));
  assert(!registry.getToolRenderer("my_tool"));
});

test("Renderer Registry supports artifact subscription", (t, done) => {
  const registry = createRendererRegistry();
  const events = [];

  const unsubscribe = registry.subscribeArtifacts((event) => {
    events.push(event);
  });

  registry.registerArtifact("custom1", { render: () => {} });
  registry.unregisterArtifact("custom1");

  unsubscribe();

  assert.equal(events.length, 2);
  assert.equal(events[0].type, "artifact.registered");
  assert.equal(events[0].artifactType, "custom1");
  assert.equal(events[1].type, "artifact.unregistered");
  assert.equal(events[1].artifactType, "custom1");

  done();
});

test("Renderer Registry supports tool subscription", (t, done) => {
  const registry = createRendererRegistry();
  const events = [];

  const unsubscribe = registry.subscribeTools((event) => {
    events.push(event);
  });

  registry.registerTool("my_tool", { renderInput: () => {} });
  registry.unregisterTool("my_tool");

  unsubscribe();

  assert.equal(events.length, 2);
  assert.equal(events[0].type, "tool.registered");
  assert.equal(events[0].name, "my_tool");
  assert.equal(events[1].type, "tool.unregistered");
  assert.equal(events[1].name, "my_tool");

  done();
});

test("Multiple registries are independent", () => {
  const registry1 = createRendererRegistry();
  const registry2 = createRendererRegistry();

  const renderer = { render: () => {} };

  registry1.registerArtifact("custom", renderer);

  assert(registry1.hasArtifact("custom"), "Registry1 should have custom");
  assert(!registry2.hasArtifact("custom"), "Registry2 should not have custom");

  registry2.registerArtifact("custom", renderer);
  assert.equal(registry1.listArtifacts().length, 1);
  assert.equal(registry2.listArtifacts().length, 1);

  registry1.unregisterArtifact("custom");
  assert(!registry1.hasArtifact("custom"));
  assert(registry2.hasArtifact("custom"), "Registry2 should still have custom");
});
