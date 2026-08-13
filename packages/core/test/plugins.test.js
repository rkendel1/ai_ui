import test from "node:test";
import assert from "node:assert/strict";

import { createAIUIPlugin, createArtifactRenderer, createToolRenderer, createArtifactAction } from "../src/plugins/createAIUIPlugin.js";
import { pluginManager } from "../src/plugins/index.js";

test("createAIUIPlugin creates a valid plugin with all options", () => {
  const plugin = createAIUIPlugin({
    name: "my-plugin",
    artifacts: [
      {
        type: "custom",
        renderer: {
          render: (artifact) => `<div>${artifact.type}</div>`
        }
      }
    ],
    tools: [
      {
        name: "my_tool",
        renderer: {
          renderInput: (toolCall) => `Input: ${toolCall.name}`
        }
      }
    ],
    actions: [
      {
        id: "my-action",
        handler: () => {}
      }
    ]
  });

  assert.equal(plugin.name, "my-plugin");
  assert.equal(plugin.artifacts.length, 1);
  assert.equal(plugin.tools.length, 1);
  assert.equal(plugin.actions.length, 1);
});

test("createAIUIPlugin requires a name", () => {
  assert.throws(
    () => createAIUIPlugin({}),
    /Plugin name must be a non-empty string/
  );

  assert.throws(
    () => createAIUIPlugin({ name: "" }),
    /Plugin name must be a non-empty string/
  );
});

test("createAIUIPlugin validates artifact renderers", () => {
  assert.throws(
    () =>
      createAIUIPlugin({
        name: "test",
        artifacts: [{ type: "custom", renderer: {} }]
      }),
    /must have a 'render' function/
  );

  assert.throws(
    () =>
      createAIUIPlugin({
        name: "test",
        artifacts: [{ renderer: { render: () => {} } }]
      }),
    /must have a 'type' property/
  );
});

test("createAIUIPlugin validates tool renderers", () => {
  assert.throws(
    () =>
      createAIUIPlugin({
        name: "test",
        tools: [{ name: "tool", renderer: {} }]
      }),
    /must have a 'renderInput' function/
  );

  assert.throws(
    () =>
      createAIUIPlugin({
        name: "test",
        tools: [{ renderer: { renderInput: () => {} } }]
      }),
    /must have a 'name' property/
  );
});

test("createAIUIPlugin validates actions", () => {
  assert.throws(
    () =>
      createAIUIPlugin({
        name: "test",
        actions: [{ id: "action", handler: "not a function" }]
      }),
    /must have a 'handler' function/
  );

  assert.throws(
    () =>
      createAIUIPlugin({
        name: "test",
        actions: [{ handler: () => {} }]
      }),
    /must have an 'id' property/
  );
});

test("createAIUIPlugin provides default empty arrays", () => {
  const plugin = createAIUIPlugin({ name: "test" });
  assert.equal(plugin.artifacts.length, 0);
  assert.equal(plugin.tools.length, 0);
  assert.equal(plugin.actions.length, 0);
});

test("createArtifactRenderer creates a valid artifact renderer config", () => {
  const config = createArtifactRenderer("custom", {
    render: (artifact) => `<div>${artifact.type}</div>`
  });

  assert.equal(config.type, "custom");
  assert.equal(config.renderer.type, "custom");
  assert(typeof config.renderer.render === "function");
});

test("createArtifactRenderer requires type and render function", () => {
  assert.throws(
    () => createArtifactRenderer("", { render: () => {} }),
    /Artifact type must be a non-empty string/
  );

  assert.throws(
    () => createArtifactRenderer("custom", {}),
    /must have a render function/
  );
});

test("createToolRenderer creates a valid tool renderer config", () => {
  const config = createToolRenderer("my_tool", {
    renderInput: (toolCall) => `Input: ${toolCall.name}`
  });

  assert.equal(config.name, "my_tool");
  assert.equal(config.renderer.name, "my_tool");
  assert(typeof config.renderer.renderInput === "function");
});

test("createToolRenderer requires name and renderInput function", () => {
  assert.throws(
    () => createToolRenderer("", { renderInput: () => {} }),
    /Tool name must be a non-empty string/
  );

  assert.throws(
    () => createToolRenderer("tool", {}),
    /must have a renderInput function/
  );
});

test("createArtifactAction creates a valid action config", () => {
  const handler = () => {};
  const config = createArtifactAction("my-action", handler);

  assert.equal(config.id, "my-action");
  assert.equal(config.handler, handler);
});

test("createArtifactAction requires id and handler function", () => {
  assert.throws(
    () => createArtifactAction("", () => {}),
    /Action id must be a non-empty string/
  );

  assert.throws(
    () => createArtifactAction("action", "not a function"),
    /Action handler must be a function/
  );
});

test("Plugins created with factory can be registered", () => {
  const plugin = createAIUIPlugin({
    name: "factory-plugin",
    artifacts: [
      {
        type: "test",
        renderer: {
          render: () => null
        }
      }
    ]
  });

  pluginManager.register(plugin);
  const registered = pluginManager.get("factory-plugin");
  assert(registered, "Plugin should be registered");
  assert.equal(registered.name, "factory-plugin");

  // Cleanup
  pluginManager.unregister("factory-plugin");
});
