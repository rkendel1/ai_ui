import test from "node:test";
import assert from "node:assert";
import { createAITransport } from "../src/transports/createAITransport.js";

test("createAITransport", async (t) => {
  await t.test("requires endpoint URL", () => {
    assert.throws(
      () => createAITransport(),
      /endpoint/i
    );

    assert.throws(
      () => createAITransport(""),
      /endpoint/i
    );
  });

  await t.test("validates format option", () => {
    assert.throws(
      () => createAITransport("http://localhost/api/ai", { format: "invalid" }),
      /invalid format/i
    );
  });

  await t.test("returns transport object with send method", () => {
    const transport = createAITransport("http://localhost/api/ai");
    assert.strictEqual(typeof transport, "object");
    assert.strictEqual(typeof transport.send, "function");
  });

  await t.test("send method returns async generator", async () => {
    const transport = createAITransport("http://localhost/api/ai");
    const generator = transport.send({});
    
    assert.strictEqual(typeof generator[Symbol.asyncIterator], "function");
  });

  await t.test("handles network errors gracefully", async () => {
    const transport = createAITransport("http://invalid-domain-12345.example.com/api");
    
    const events = [];
    for await (const event of transport.send({})) {
      events.push(event);
    }

    // Should emit error event
    assert(events.length > 0);
    const errorEvent = events.find(e => e.type === "error.occurred" || e.code === "TRANSPORT_ERROR");
    assert(errorEvent);
  });

  await t.test("includes request data in POST body", async () => {
    let capturedRequest = null;

    // Mock fetch to capture request
    const originalFetch = global.fetch;
    global.fetch = async (url, options) => {
      capturedRequest = {
        url,
        method: options.method,
        headers: options.headers,
        body: JSON.parse(options.body)
      };
      
      return new Response(
        "data: " + JSON.stringify({ type: "session.started" }) + "\n\n",
        { headers: { "Content-Type": "text/event-stream" } }
      );
    };

    try {
      const transport = createAITransport("http://localhost/api/ai", { format: "sse" });
      
      const events = [];
      for await (const event of transport.send({
        message: "Hello",
        context: { userId: "123" }
      })) {
        events.push(event);
      }

      assert.strictEqual(capturedRequest.method, "POST");
      assert.deepStrictEqual(capturedRequest.body, {
        message: "Hello",
        context: { userId: "123" }
      });
    } finally {
      global.fetch = originalFetch;
    }
  });

  await t.test("parses newline-delimited JSON events", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => {
      const events = [
        { type: "session.started" },
        { type: "message.started", messageId: "m1" },
        { type: "text.delta", messageId: "m1", text: "Hello" },
        { type: "message.completed", messageId: "m1" },
        { type: "session.completed" }
      ];
      
      const ndjson = events.map(e => JSON.stringify(e)).join("\n");
      
      return new Response(ndjson);
    };

    try {
      const transport = createAITransport("http://localhost/api/ai");
      
      const events = [];
      for await (const event of transport.send({})) {
        events.push(event);
      }

      assert.strictEqual(events.length, 5);
      assert.strictEqual(events[0].type, "session.started");
      assert.strictEqual(events[1].type, "message.started");
      assert.strictEqual(events[2].type, "text.delta");
      assert.strictEqual(events[2].text, "Hello");
    } finally {
      global.fetch = originalFetch;
    }
  });

  await t.test("parses Server-Sent Events format", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => {
      const events = [
        'event: session.started\ndata: {"type":"session.started"}\n',
        'data: {"type":"message.started","messageId":"m1"}\n',
        'data: {"type":"text.delta","messageId":"m1","text":"Hi"}\n',
        'event: message.completed\ndata: {"type":"message.completed","messageId":"m1"}\n'
      ].join("\n");
      
      return new Response(events, {
        headers: { "Content-Type": "text/event-stream" }
      });
    };

    try {
      const transport = createAITransport("http://localhost/api/ai", { format: "sse" });
      
      const events = [];
      for await (const event of transport.send({})) {
        events.push(event);
      }

      assert(events.length >= 3);
      assert.strictEqual(events[0].type, "session.started");
      assert.strictEqual(events[1].type, "message.started");
      assert.strictEqual(events[2].type, "text.delta");
      assert.strictEqual(events[2].text, "Hi");
    } finally {
      global.fetch = originalFetch;
    }
  });

  await t.test("applies transformRequest function", async () => {
    let transformedRequest = null;

    const originalFetch = global.fetch;
    global.fetch = async (url, options) => {
      transformedRequest = JSON.parse(options.body);
      
      return new Response(
        JSON.stringify({ type: "session.started" })
      );
    };

    try {
      const transport = createAITransport("http://localhost/api/ai", {
        transformRequest: (req) => ({
          ...req,
          message: req.message?.toUpperCase()
        })
      });
      
      for await (const event of transport.send({ message: "hello" })) {
        // Consume events
      }

      assert.strictEqual(transformedRequest.message, "HELLO");
    } finally {
      global.fetch = originalFetch;
    }
  });

  await t.test("applies transformEvent function", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => {
      return new Response(
        JSON.stringify({ type: "text.delta", text: "hello" })
      );
    };

    try {
      const transport = createAITransport("http://localhost/api/ai", {
        transformEvent: (event) => ({
          ...event,
          text: event.text?.toUpperCase()
        })
      });
      
      const events = [];
      for await (const event of transport.send({})) {
        events.push(event);
      }

      assert.strictEqual(events[0].text, "HELLO");
    } finally {
      global.fetch = originalFetch;
    }
  });

  await t.test("includes custom headers", async () => {
    let capturedHeaders = null;

    const originalFetch = global.fetch;
    global.fetch = async (url, options) => {
      capturedHeaders = options.headers;
      
      return new Response(
        JSON.stringify({ type: "session.started" })
      );
    };

    try {
      const transport = createAITransport("http://localhost/api/ai", {
        headers: {
          "Authorization": "******",
          "X-Custom-Header": "value"
        }
      });
      
      for await (const event of transport.send({})) {
        // Consume events
      }

      assert.strictEqual(capturedHeaders["Authorization"], "******");
      assert.strictEqual(capturedHeaders["X-Custom-Header"], "value");
      assert.strictEqual(capturedHeaders["Content-Type"], "application/json");
    } finally {
      global.fetch = originalFetch;
    }
  });

  await t.test("handles empty/whitespace lines in NDJSON", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => {
      const ndjson = `{"type":"session.started"}

{"type":"message.started","messageId":"m1"}

{"type":"text.delta","text":"hello"}
`;
      
      return new Response(ndjson);
    };

    try {
      const transport = createAITransport("http://localhost/api/ai");
      
      const events = [];
      for await (const event of transport.send({})) {
        events.push(event);
      }

      assert.strictEqual(events.length, 3);
      assert.strictEqual(events[0].type, "session.started");
      assert.strictEqual(events[1].type, "message.started");
      assert.strictEqual(events[2].type, "text.delta");
    } finally {
      global.fetch = originalFetch;
    }
  });

  await t.test("handles HTTP error responses", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => {
      return new Response("Unauthorized", { status: 401, statusText: "Unauthorized" });
    };

    try {
      const transport = createAITransport("http://localhost/api/ai");
      
      const events = [];
      for await (const event of transport.send({})) {
        events.push(event);
      }

      const errorEvent = events.find(e => e.type === "error.occurred");
      assert(errorEvent);
      assert(errorEvent.message.includes("401"));
    } finally {
      global.fetch = originalFetch;
    }
  });

  await t.test("integrates with createAISession", async () => {
    const { createAISession } = await import("../src/runtime/createAISession.js");

    const originalFetch = global.fetch;
    global.fetch = async () => {
      const events = [
        { type: "session.started" },
        { type: "message.started", messageId: "m1" },
        { type: "text.delta", messageId: "m1", text: "Response" },
        { type: "message.completed", messageId: "m1" },
        { type: "session.completed" }
      ];
      
      return new Response(
        events.map(e => JSON.stringify(e)).join("\n")
      );
    };

    try {
      const transport = createAITransport("http://localhost/api/ai");
      const session = createAISession({ transport });

      let finalState = null;
      session.subscribe((state) => {
        finalState = state;
      });

      await session.send("Test message");

      assert.strictEqual(finalState.status, "complete");
      assert.strictEqual(finalState.messages.length, 2); // user + assistant
      assert.strictEqual(finalState.messages[0].role, "user");
      assert.strictEqual(finalState.messages[1].role, "assistant");
      assert.strictEqual(finalState.messages[1].content, "Response");
    } finally {
      global.fetch = originalFetch;
    }
  });
});
