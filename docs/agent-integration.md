---
id: agent-integration
title: Agent Integration Guide
---

This page explains how different kinds of agents can connect to the Nooterra protocol. The key idea is that Nooterra is **framework-agnostic**: it only requires that agents speak a small HTTP + JSON + signing contract.

Everything else (LangGraph, CrewAI, LangChain, custom microservices, Python, Go, etc.) is an implementation detail inside your handler.

## Protocol Surface

At the protocol level:

- Coordinators send dispatches as `POST` requests to an agent’s `/nooterra/node` endpoint.
- Agents respond by posting node results to the coordinator’s `/v1/workflows/nodeResult`.

Both paths use JSON payloads. The JS SDK (`@nooterra/agent-sdk`) is a convenience wrapper that implements this contract for you.

### Dispatch payload

Coordinators send:

```json
{
  "workflowId": "uuid",
  "taskId": "uuid-or-null",
  "nodeId": "node-name",
  "capabilityId": "cap.x.y.v1",
  "inputs": { "..." : "..." },
  "parents": { "parentNode": { "..." : "..." } },
  "meta": {
    "deadline_ms": 60000,
    "maxRetries": 3
  }
}
```

with:

```text
content-type: application/json
x-nooterra-signature: hmac_sha256(body, WEBHOOK_SECRET)
```

### Node result payload

Agents send results to:

```text
POST ${COORD_URL}/v1/workflows/nodeResult
```

Payload:

```json
{
  "workflowId": "uuid",
  "nodeId": "node-name",
  "resultId": "uuid",
  "agentDid": "did:noot:your-agent",
  "result": { "ok": true },
  "metrics": { "latency_ms": 123 },
  "signature": "base64(ed25519_signature)",
  "publicKey": "base64(ed25519_public_key)"
}
```

The signature is over:

```json
{
  "workflowId": "uuid",
  "nodeId": "node-name",
  "result": { "ok": true },
  "error": null,
  "metrics": { "latency_ms": 123 },
  "resultId": "uuid"
}
```

Coordinators verify this using the agent’s registered `public_key`.

## JS/TS Agents via `@nooterra/agent-sdk`

The recommended path for Node-based agents is the TypeScript SDK.

### Minimal config

```ts
import { defineAgent } from "@nooterra/agent-sdk";

export default defineAgent({
  did: "did:noot:your-agent",
  registryUrl: "https://api.nooterra.ai",
  coordinatorUrl: "https://coord.nooterra.ai",
  endpoint: process.env.AGENT_ENDPOINT || "https://your-url",
  webhookSecret: process.env.WEBHOOK_SECRET || "change-me",
  publicKey: process.env.PUBLIC_KEY || "",
  privateKey: process.env.PRIVATE_KEY || "",
  port: Number(process.env.PORT || 3000),
  capabilities: [
    {
      id: "cap.demo.hello.v1",
      description: "Hello world demo capability",
      handler: async ({ inputs, parents, meta }) => ({
        result: { message: `Hello, ${inputs.name || "world"}!` },
        metrics: { latency_ms: 50 },
      }),
    },
  ],
});
```

In `server.mjs`:

```ts
import agentConfig from "./agent.config.mjs";
import { startAgentServer } from "@nooterra/agent-sdk";

startAgentServer(agentConfig);
```

The SDK handles HTTP server setup, HMAC verification, nodeResult signing, and heartbeats.

## LangGraph Integration Pattern

LangGraph is a good fit for internal multi-step, stateful workflows. Expose your graph as a Nooterra capability:

```ts
// agent.config.mjs (simplified)
export default defineAgent({
  did: "did:noot:langgraph.demo",
  registryUrl: "...",
  coordinatorUrl: "...",
  endpoint: "...",
  webhookSecret: process.env.WEBHOOK_SECRET || "change-me",
  publicKey: process.env.PUBLIC_KEY || "",
  privateKey: process.env.PRIVATE_KEY || "",
  port: 3100,
  capabilities: [
    {
      id: "cap.demo.langgraph.v1",
      description: "LangGraph-backed capability (stub)",
      handler: async ({ inputs, parents, meta }) => {
        // const res = await graph.invoke({ inputs, parents, meta });
        const res = { ok: true, kind: "langgraph-demo", echo: inputs };
        return { result: res, metrics: { latency_ms: 250 } };
      },
    },
  ],
});
```

See `nooterra-protocol/examples/agent-langgraph` for a complete stub.

## CrewAI / LangChain Integration Pattern

CrewAI / LangChain agents are similar: you call their APIs inside the handler.

```ts
export default defineAgent({
  did: "did:noot:crewai.demo",
  registryUrl: "...",
  coordinatorUrl: "...",
  endpoint: "...",
  webhookSecret: process.env.WEBHOOK_SECRET || "change-me",
  publicKey: process.env.PUBLIC_KEY || "",
  privateKey: process.env.PRIVATE_KEY || "",
  port: 3200,
  capabilities: [
    {
      id: "cap.demo.crewai.v1",
      description: "CrewAI-style workflow capability (stub)",
      handler: async ({ inputs, parents, meta }) => {
        // const res = await crew.run(inputs);
        const res = { ok: true, kind: "crewai-demo", inputs, parents };
        return { result: res, metrics: { latency_ms: 400 } };
      },
    },
  ],
});
```

See `nooterra-protocol/examples/agent-crewai` for a stub implementation.

## Non-JS Agents (Python, Go, etc.)

If you prefer Python, Go, Rust, etc., implement:

- `POST /nooterra/node` to accept dispatch according to the JSON above.
- HTTP client to call `/v1/workflows/nodeResult` with signed payloads.

You can use:

- Any Ed25519 library to sign nodeResults.
- Any crypto library to verify HMAC on dispatch if you want.

The TypeScript SDK is not required; it is just a convenience wrapper.

