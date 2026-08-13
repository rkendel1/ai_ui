import http from "http";
import url from "url";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createAIRuntime } from "@ai-ui/runtime";
import { createMockProvider } from "@ai-ui/runtime/providers";
import { createOpenAICompatibleProvider } from "@ai-ui/runtime/providers";
import { AI_EVENT_TYPES } from "@ai-ui/core/protocol";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "../../public");

// Environment configuration
const PORT = process.env.PORT || 3000;
const AI_BASE_URL = process.env.AI_BASE_URL || "";
const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_MODEL = process.env.AI_MODEL || "";

// Create provider based on environment
function createProvider() {
  if (!AI_BASE_URL || !AI_MODEL) {
    console.log("Using mock provider (zero-key mode)");
    return createMockProvider({ scenario: "full" });
  }

  console.log("Using OpenAI-compatible provider:", AI_BASE_URL);
  return createOpenAICompatibleProvider({
    baseURL: AI_BASE_URL,
    apiKey: AI_API_KEY || "not-needed",
    model: AI_MODEL
  });
}

// Define reference tools
const tools = {
  get_weather: {
    name: "get_weather",
    description: "Get current weather for a location",
    inputSchema: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city and state, e.g. San Francisco, CA"
        }
      },
      required: ["location"]
    },
    approval: "never",
    async execute(input) {
      const weather = {
        location: input.location || "Unknown",
        temperature: Math.floor(Math.random() * 40 + 50),
        condition: ["Sunny", "Cloudy", "Rainy"][Math.floor(Math.random() * 3)],
        humidity: Math.floor(Math.random() * 100)
      };

      return {
        result: weather,
        artifacts: [
          {
            id: "weather-" + Date.now(),
            type: "json",
            title: "Weather Data",
            content: weather
          }
        ]
      };
    }
  },

  get_customer: {
    name: "get_customer",
    description: "Get customer details by ID",
    inputSchema: {
      type: "object",
      properties: {
        customerId: {
          type: "string",
          description: "The customer ID"
        }
      },
      required: ["customerId"]
    },
    approval: "never",
    async execute(input) {
      const customerId = input.customerId || "C001";
      const customer = {
        id: customerId,
        name: "Sample Customer",
        email: "customer@example.com",
        status: "active",
        joinedDate: "2024-01-15"
      };

      return {
        result: customer,
        artifacts: [
          {
            id: "customer-" + customerId,
            type: "customer",
            title: "Customer Details",
            content: customer
          }
        ]
      };
    }
  }
};

// Create runtime
const provider = createProvider();
const runtime = createAIRuntime({
  provider,
  tools,
  approval: "never"
});

// Handle streaming response
async function streamEvents(res, eventStream) {
  res.writeHead(200, {
    "Content-Type": "application/x-ndjson",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  });

  try {
    for await (const event of eventStream) {
      res.write(JSON.stringify(event) + "\n");
    }
    res.end();
  } catch (error) {
    console.error("Stream error:", error);
    res.write(
      JSON.stringify({
        type: AI_EVENT_TYPES.ERROR_OCCURRED,
        message: error.message,
        code: "SERVER_ERROR"
      }) + "\n"
    );
    res.end();
  }
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // API endpoint for AI requests
  if (pathname === "/api/ai" && req.method === "POST") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const request = JSON.parse(body || "{}");
        const messages = request.message
          ? [
              { role: "user", content: request.message },
              ...(request.messages || [])
            ]
          : request.messages || [];

        const toolNames = request.tools || [];

        const eventStream = runtime.execute({
          messages,
          tools: toolNames
        });

        await streamEvents(res, eventStream);
      } catch (error) {
        console.error("Request error:", error);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: error.message }));
      }
    });

    return;
  }

  // Health check
  if (pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", mode: !AI_BASE_URL ? "mock" : "real" }));
    return;
  }

  // Serve index.html
  if (pathname === "/") {
    const indexPath = path.join(publicDir, "index.html");
    try {
      const content = fs.readFileSync(indexPath, "utf-8");
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(content);
      return;
    } catch (error) {
      console.error("Failed to read index.html:", error);
    }
  }

  // 404
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log("AI UI Reference Server");
  console.log("Listening on http://localhost:" + PORT);
  console.log("API endpoint: http://localhost:" + PORT + "/api/ai");
  if (!AI_BASE_URL) {
    console.log("Running in zero-key mode with mock provider");
  } else {
    console.log("Connected to:", AI_BASE_URL);
    console.log("Model:", AI_MODEL);
  }
});
