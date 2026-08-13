import test from "node:test";
import assert from "node:assert/strict";

import { createAISession, pluginManager } from "../src/index.js";

/**
 * Acceptance test: Full PR5 workflow
 * Message → Tool → Approval → Artifact
 * 
 * This demonstrates the universal tool & artifact system
 * rendering the entire AI interaction naturally.
 */

function createMockTransport(events) {
  return {
    async *send() {
      for (const event of events) {
        yield event;
      }
    }
  };
}

test("PR5 acceptance: full workflow message → tool → approval → artifact", async () => {
  const transport = createMockTransport([
    { type: "session.started" },
    
    // AI starts responding
    { type: "message.started", messageId: "m1" },
    { type: "text.delta", messageId: "m1", text: "I'll search for customers and create a report. " },
    
    // Tool invocation
    { type: "tool.call.started", id: "t1", name: "search_customers", input: { query: "recent" } },
    
    // Approval required
    { type: "tool.approval.required", id: "t1", reason: "This will search your customer database" },
    
    // Assuming approval happens (in real app, user clicks approve)
    { type: "tool.approved", id: "t1" },
    
    // Tool executes
    { type: "text.delta", messageId: "m1", text: "Found 3 customers. " },
    { type: "tool.call.completed", id: "t1", output: { customers: 3 } },
    
    // Create artifact: table
    {
      type: "artifact.created",
      artifact: {
        id: "a1",
        type: "table",
        title: "Customer Report",
        content: [
          { id: "1", name: "Acme Corp", revenue: "$4.2M", growth: "12%" },
          { id: "2", name: "Globex", revenue: "$2.8M", growth: "8%" },
          { id: "3", name: "Initech", revenue: "$1.9M", growth: "15%" }
        ],
        metadata: { headers: ["id", "name", "revenue", "growth"] }
      }
    },
    
    // Create artifact: analysis JSON
    {
      type: "artifact.created",
      artifact: {
        id: "a2",
        type: "json",
        title: "Analysis Summary",
        content: {
          totalCustomers: 3,
          averageGrowth: "11.67%",
          topPerformer: "Initech",
          recommendation: "Focus on Initech for expansion"
        }
      }
    },
    
    { type: "text.delta", messageId: "m1", text: "Done!" },
    { type: "message.completed", messageId: "m1" },
    { type: "session.completed" }
  ]);

  const session = createAISession({ transport });
  
  const states = [];
  session.subscribe((state) => {
    states.push({
      status: state.status,
      messageCount: state.messages.length,
      toolCalls: state.activeToolCalls.length,
      toolsWithApproval: state.activeToolCalls.filter(t => t.status === "approval_required").length,
      toolsCompleted: state.activeToolCalls.filter(t => t.status === "completed").length,
      artifacts: state.artifacts.length,
      artifactTypes: state.artifacts.map(a => a.type)
    });
  });

  await session.send("Analyze our customers and create a report");

  assert(states.length > 0, "Should have state updates");
  
  const finalState = session.getState();
  
  // Verify the flow
  assert.equal(finalState.status, "complete", "Session should be complete");
  assert.equal(finalState.messages.length, 2, "Should have user + assistant messages");
  assert.equal(finalState.messages[0].role, "user", "First message should be from user");
  assert.equal(finalState.messages[1].role, "assistant", "Second message should be from assistant");
  
  // Tool lifecycle
  assert.equal(finalState.activeToolCalls.length, 1, "Should have 1 tool call in state");
  const toolCall = finalState.activeToolCalls[0];
  assert.equal(toolCall.id, "t1", "Tool call should have correct id");
  assert.equal(toolCall.name, "search_customers", "Tool call should have correct name");
  assert.equal(toolCall.status, "completed", "Tool call should be completed");
  assert.equal(toolCall.output.customers, 3, "Tool call should have output");
  
  // Artifacts
  assert.equal(finalState.artifacts.length, 2, "Should have 2 artifacts");
  
  const tableArtifact = finalState.artifacts[0];
  assert.equal(tableArtifact.type, "table", "First artifact should be table");
  assert.equal(tableArtifact.title, "Customer Report", "Table should have title");
  assert.equal(tableArtifact.content.length, 3, "Table should have 3 rows");
  
  const jsonArtifact = finalState.artifacts[1];
  assert.equal(jsonArtifact.type, "json", "Second artifact should be json");
  assert.equal(jsonArtifact.title, "Analysis Summary", "JSON should have title");
  assert.equal(jsonArtifact.content.totalCustomers, 3, "JSON should have analysis data");
  
  // Verify message content
  const assistantMessage = finalState.messages[1];
  assert(assistantMessage.content.includes("I'll search"), "Should have start message");
  assert(assistantMessage.content.includes("Found 3"), "Should have tool result");
  assert(assistantMessage.content.includes("Done!"), "Should have completion message");
  
  console.log("✅ PR5 Acceptance Test Passed!");
  console.log("   Message → Tool → Approval → Artifact workflow completed successfully");
});

test("PR5: Plugin system registers custom artifact renderer", async () => {
  // Define a custom artifact type
  const customPlugin = {
    name: "test-plugin",
    artifacts: [
      {
        type: "custom_report",
        renderer: {
          canHandle: (artifact) => artifact.type === "custom_report",
          render: (artifact) => {
            const div = document.createElement("div");
            div.textContent = `Custom Report: ${artifact.title}`;
            return div;
          }
        }
      }
    ]
  };

  // Register plugin
  pluginManager.register(customPlugin);
  
  // Verify plugin is registered
  const plugins = pluginManager.list();
  assert(plugins.some(p => p.name === "test-plugin"), "Plugin should be registered");
  
  // Cleanup
  pluginManager.unregister("test-plugin");
  assert(!pluginManager.list().some(p => p.name === "test-plugin"), "Plugin should be unregistered");
  
  console.log("✅ PR5 Plugin System Test Passed!");
  console.log("   Custom artifact renderers can be registered via plugins");
});

test("PR5: Tool approval state machine works correctly", async () => {
  const transport = createMockTransport([
    { type: "session.started" },
    { type: "message.started", messageId: "m1" },
    { type: "tool.call.started", id: "t1", name: "delete_user", input: { id: "123" } },
    { type: "tool.approval.required", id: "t1", reason: "Destructive action" },
    // User rejects
    { type: "tool.rejected", id: "t1", reason: "User cancelled" },
    { type: "text.delta", messageId: "m1", text: "Action was rejected." },
    { type: "message.completed", messageId: "m1" },
    { type: "session.completed" }
  ]);

  const session = createAISession({ transport });
  await session.send("Delete user 123");

  const state = session.getState();
  
  // Verify rejection flow
  assert.equal(state.activeToolCalls.length, 1, "Tool call should still be in state");
  assert.equal(state.activeToolCalls[0].status, "rejected", "Tool should be rejected");
  assert.equal(state.activeToolCalls[0].error, "User cancelled", "Should have rejection reason");
  
  console.log("✅ PR5 Approval State Machine Test Passed!");
  console.log("   Tool rejection flow works correctly");
});
