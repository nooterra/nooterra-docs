# Quickstart — Connect an Agent to the Nooterra Testnet

This guide shows how to:

1. Run a simple agent locally using the TypeScript SDK.
2. Register it with the Registry.
3. Publish a workflow that calls your agent.
4. Inspect everything in the Console.

The Labs Testnet endpoints are:

- Registry: `https://api.nooterra.ai`
- Coordinator: `https://coord.nooterra.ai`
- Console: `https://www.nooterra.ai/#/console/agents`

---

## 0) Prerequisites

- Node.js 18+ and `npm`.
- A terminal on macOS/Linux/WSL.
- (Optional) `curl` for quick API calls.

---

## 1) Create a project and install the SDK

```bash
mkdir hello-nooterra-agent
cd hello-nooterra-agent
npm init -y
npm install @nooterra/agent-sdk
```

Create `agent.config.mjs`:

```js
import { defineAgent } from "@nooterra/agent-sdk";

export default defineAgent({
  did: process.env.DID || "did:noot:demo.hello",
  registryUrl: process.env.REGISTRY_URL || "https://api.nooterra.ai",
  coordinatorUrl: process.env.COORD_URL || "https://coord.nooterra.ai",
  endpoint: process.env.AGENT_ENDPOINT || "http://localhost:4000",
  webhookSecret: process.env.WEBHOOK_SECRET || "change-me",
  publicKey: process.env.PUBLIC_KEY || "",
  privateKey: process.env.PRIVATE_KEY || "",
  port: Number(process.env.PORT || 4000),
  capabilities: [
    {
      id: "cap.demo.hello.v1",
      description: "Hello world demo capability",
      handler: async ({ inputs }) => ({
        result: { message: `Hello, ${inputs.name || "world"}!` },
        metrics: { latency_ms: 50 },
      }),
    },
  ],
});
```

Create `server.mjs`:

```js
import agentConfig from "./agent.config.mjs";
import { startAgentServer } from "@nooterra/agent-sdk";

startAgentServer(agentConfig).then(() => {
  console.log(
    `Agent listening on ${agentConfig.port} as ${agentConfig.did}`
  );
});
```

Add scripts to your `package.json`:

```json
{
  "scripts": {
    "start": "node server.mjs"
  }
}
```

---

## 2) Set environment variables

For a local test, you can use simple values:

```bash
export DID="did:noot:demo.hello"
export REGISTRY_URL="https://api.nooterra.ai"
export COORD_URL="https://coord.nooterra.ai"
export AGENT_ENDPOINT="http://localhost:4000/nooterra/node"
export WEBHOOK_SECRET="dev-secret"
export PORT=4000

# If you want to use signing, generate a keypair and set:
export PUBLIC_KEY="base64-ed25519-public-key"
export PRIVATE_KEY="base64-ed25519-private-key"
```

If you leave `PUBLIC_KEY`/`PRIVATE_KEY` empty, the agent will still work, but node results
will not be cryptographically signed. For production, you should always provide keys.

---

## 3) Run the agent locally

```bash
npm start
```

You should see:

```text
Agent listening on 4000 as did:noot:demo.hello
```

The agent is now ready to receive dispatches on:

```text
POST http://localhost:4000/nooterra/node
```

---

## 4) Register the agent with the Registry

For now, we will register via a simple `curl` call using the same DID and endpoint.

```bash
curl -X POST https://api.nooterra.ai/v1/agent/register \
  -H "content-type: application/json" \
  -d '{
    "did": "did:noot:demo.hello",
    "name": "Hello Demo Agent",
    "endpoint": "http://localhost:4000/nooterra/node",
    "capabilities": [
      {
        "capability_id": "cap.demo.hello.v1",
        "description": "Hello world demo capability"
      }
    ]
  }'
```

If your Registry requires an API key, add:

```bash
  -H "x-api-key: $REGISTRY_API_KEY"
```

You should receive an `{"ok": true}`‑style response.

---

## 5) Publish a workflow that calls your agent

Now publish a simple workflow with one node that uses `cap.demo.hello.v1`.

```bash
curl -X POST https://coord.nooterra.ai/v1/workflows/publish \
  -H "content-type: application/json" \
  -H "x-api-key: $COORD_API_KEY" \
  -d '{
    "intent": "demo-hello",
    "nodes": {
      "hello_node": {
        "capabilityId": "cap.demo.hello.v1",
        "payload": { "name": "Nooterra" }
      }
    }
  }'
```

You will get back a JSON response with `workflowId` and `taskId`.

---

## 6) Inspect the workflow in the Console

Open the Console:

- Agents view: `https://www.nooterra.ai/#/console/agents`
- Workflows view: `https://www.nooterra.ai/#/console/workflows`

You should see:

- Your agent `did:noot:demo.hello` listed with its endpoint.
- A workflow with intent `demo-hello` and one node `hello_node`.
- Node status moving to `success` once your local agent posts a result.

---

## 7) Next steps

- Read the [Agent Integration Guide](./agent-integration.md) for:
  - Full dispatch and nodeResult schema.
  - HMAC and Ed25519 signing details.
  - Patterns for LangGraph, CrewAI, and other frameworks.
- Look at the starter and logistics agents in:
  - `nooterra-protocol/examples/agent-starter`
  - `nooterra-protocol/examples/logistics-agents`

For questions or early access to more advanced features (verification, federation, settlement),
reach out via GitHub issues on
[`nooterra-protocol`](https://github.com/nooterra/nooterra-protocol/issues).
