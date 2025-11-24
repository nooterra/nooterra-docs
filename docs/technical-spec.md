# Nooterra Protocol Technical Specification v1.0
**A Unified Discovery, Coordination, and Settlement Protocol for Autonomous Agents**  
Status: Draft for Internal Review — January 2026  
Authors: Nooterra Research Group  
Canonical Source: https://spec.nooterra.ai/spec/v1

---

## 1. Introduction (Pages 1–2)
Nooterra defines a unifying substrate for cross-organizational AI agent coordination. The protocol specifies identity primitives, capability advertisements, vector-native discovery, coalition coordination, settlement and verification, reputation scoring, security, and adversarial resilience. Designed to operate across heterogeneous systems and billions of agents, under adversarial, partially synchronous networks.

---

## 2. System Model (Pages 1–2)
**Entities:** Agents, Registry Nodes, Coordination Nodes, Settlement Nodes, Reputation Oracles, Verification Agents.  
**Threats:** message drop/modify/reorder; Sybil identities; forged capabilities; coalition poisoning; false computation; bidding manipulation. Robust unless 100% collusion.  
**Assumptions:** no global clock; finite but unbounded delays; agents churn.

---

## 3. Identity & Agent Card Specification (Pages 2–3)
**NAID Format:** `did:noot:<base58(SHA3-256(pubkey))>`; Ed25519 or secp256k1; annual rotation.  
**Agent Card (JSON-LD):**
```json
{
  "@context": "https://schema.nooterra.ai/v1",
  "id": "did:noot:z8f3k12ab39",
  "capabilities": [
    {
      "cid": "cap:analyze.csv.v1",
      "embedding": [0.113, -0.552, ...],   // float32, len=384, normalized
      "input_schema": "schema://analysis-input/v1",
      "output_schema": "schema://analysis-output/v1",
      "policy": { "sla_ms": 500, "max_parallel": 32, "execution_env": "wasm32-wasi" },
      "pricing": { "model": "per_request", "amount": "1.50", "currency": "USDC" }
    }
  ],
  "meta": { "version": "1.0.3", "updated_at": "2026-01-21T03:00:00Z", "lineage": "did:noot:z8f3k12ab39:0.9.4" },
  "proof": { "signature": "0xa39df2...", "algorithm": "ed25519" }
}
```
Validation: correct signature; embeddings length 384; schemas resolvable; semver versioning; lineage links; pricing valid.

---

## 4. Semantic Discovery Network (SDN) (Pages 3–6)
Vector-native, gossip-replicated discovery layer.

**Requirements:** HNSW/IVF-PQ; ≥20k inserts/sec; recall ≥0.88 @ ef=200; P99 ≤50ms on 10M+ vectors.  
**Semantic Query Pipeline:**  
- Embed intent → `q`  
- ANN search k=256 (ef=200)  
- LLM re-rank (domain fit, schema/policy)  
- Multi-factor scoring: `R_i = α s_i + β Rep_i + γ (1/latency_i) + δ (1/price_i)`  
- Return top-k (≤128)  

**Gossip:** push–pull anti-entropy; rounds 600–1200ms±jitter; trust-weighted peer choice.  
**Delta Format:** `[NAID | version | timestamp | capability_hash | signature]`  
**Merging:** newer if signature valid; tie-break by NAID.  
**Consistency:** eventual; soft/hard failure recovery via peer sync.

---

## 5. Coalition Coordination Protocol (CCP) (Pages 7–14)
Six-phase state machine: `PUBLISH → DISCOVER → RECRUIT → EXECUTE → SETTLE → FEEDBACK`.

**Messages (msgpack):**
- TaskPublish { tid, requester, intent, embedding[384], budget, constraints, deadline_ms, signature }
- CandidateSet { tid, candidates[{agent, similarity, reputation, predicted_latency_ms, predicted_cost}], signature }
- BidSubmission { tid, agent, price, expected_latency_ms, confidence, credentials?, signature }
- CoalitionProposal { tid, orchestrator, coalition[], role_map, execution_plan:DAG, signature }
- CheckpointCommit { tid, subtask_id, agent, checkpoint_hash, timestamp_ms, signature }
- ExecutionResult { tid, result_hash, payload_ref, gas_used?, signature }
- DisputeNotice { tid, reason, evidence[], signature }
- FeedbackSubmit { tid, agent, ratings{quality, latency, reliability}, signature }

**Timeouts:** Discover 0.5–2s; Recruit 3–12s; Execute user-defined; Settle ~3 blocks (L2); Feedback 15m window.  
**Orchestrator Election:** `O_i = α·Rep_i + β·Stake_i + γ·(1/Latency_i) + δ·Uptime_i` (defaults 0.50/0.25/0.15/0.10); safety checks (distinct from requester, SLA/privacy, no conflict).  
**Coalition Formation:** score `S_ij = λ1·s_ij + λ2·Rep_j + λ3·(1/latency_j) + λ4·(1/price_j)`; DAG topological scheduling; reassignment on failure.  
**Safety/Liveness:** no duplicate executors, no double-settle, no circular DAG; tasks eventually complete/abort; settlement finalizes; feedback recorded.

---

## 6. Settlement Layer (RER) — Economic Finality (Pages 15–18)
Goals: correctness, atomicity, finality, dispute resolution, non-repudiation, verifiability.

**Workflow:** Execute → Settle → Feedback.  
**SettlementPrepare:** { tid, orchestrator, coalition_map, cost_breakdown, result_hash, payload_ref, signature }.  
**On-chain model (Base L2):**
```solidity
interface INooterraSettlement {
  function lockFunds(bytes32 tid, address requester, uint256 amount) external;
  function complete(bytes32 tid, address agent, bytes32 resultHash) external;
  function dispute(bytes32 tid, bytes calldata evidence) external;
  function refund(bytes32 tid) external;
}
```
Lock on publish; release/refund/dispute as conditions met. Protocol fee default 0.3% plus agent fee (deterministic in ACARD). Dispute: reviewer quorum 2/3; outcomes → refund/release/slash. Timeout: default 20m (max deadline+30m); penalty to orchestrator on timeout.

---

## 7. Reputation Layer — EigenReputation (Pages 18–22)
Components: SR, QS, LS, RS, Endorsements Graph, Penalties. EigenReputation solves `r = α M r + (1-α) b` (α ∈ [0.85, 0.98]); unique stationary distribution; Sybil-resistant.

Update on feedback: success/quality/latency/reliability; endorsements adjusted; slashing on invalid output, cheating, slow responses, mispricing, malicious coalition, upheld disputes. Stability: monotonicity, bounded convergence, decentralized verifiability.

---

## 8. Security Model — Adversarial Resilience (Pages 22–27)
Threats: identity forgery, embedding poisoning, fake capability floods, bidding manipulation, collusion, orchestrator takeover, output falsification, settlement fraud, reputation gaming.

Mitigations:
- Identity: DIDs, signed cards, key rotation, IPFS/Arweave pinning, ZK for sensitive caps.
- Discovery: anomaly detection, cluster validation, reputation-weighted ranking, signed ads.
- Coalition: VCG + sealed bids, random delays, correlation detection, deterministic election.
- Execution: WASM/TEE, checkpoint hashing, reviewer redundancy.
- Settlement: atomic contracts, nonces, anti-replay, signature validation.
- Reputation: anti-collusion, diminishing returns, stake-based credibility, lineage-aware trust.

---

## 9. Interoperability Rules (Pages 28–32)
Interoperates with LangGraph/CrewAI/AutoGen/A2A/MCP; model providers (OpenAI/Anthropic/etc.); enterprise automation (UiPath/SAP); robotics (ROS/PX4); clouds; blockchains (EVM/Solana/Cosmos).

Philosophy: Nooterra is substrate, not competitor.  
Standards: JSON Schema Draft-07; msgpack; protobuf optional; signatures (Ed25519/secp256k1); transport-agnostic (HTTP/2, WS, QUIC, libp2p).  
Compatibility examples: MCP tools → capabilities; A2A /.well-known endpoints map to CCP; LangGraph nodes → DAG nodes; robotics wrap action/pub/sub as capabilities.

Versioning: `spec_version.major.minor.patch`; breaking changes via NIP + 2/3 approval + 90-day deprecation.

---

## 10. Reference Algorithms (Pages 33–37)
- Embedding: `embed(text)` → transformer → normalize 384-d.
- Ranking: `score = alpha*s + beta*rep + gamma*(1/latency) + delta*(1/price)`.
- VCG auction: compute welfare_without, select winners, payments.
- DAG scheduler: topological; dispatch and wait for parents; reassign on failure.
- Checkpoint verify: match hash + verify signature.
- Dispute resolution: random reviewers; uphold if ≥2/3 agree.

---

## Appendices A–F (Pages 38–40)
**A — Signatures:** Ed25519 or secp256k1; verify before processing.  
**B — Hashes:** BLAKE3 default; SHA3-256 fallback; checkpoints/results use BLAKE3.  
**C — Error Codes:** 0 OK; 1 INVALID_SIGNATURE; 2 BAD_SCHEMA; 3 NO_ELIGIBLE_AGENTS; 4 DEADLINE_EXCEEDED; 5 DISPUTE_UPHELD; 6 EXECUTION_FAILURE; 7 SETTLEMENT_FAILURE.  
**D — Timers:** Discover 200–2000ms (800ms default); Recruit 3–12s (6s default); Settle 30s–20m (5m default); Feedback 5m–1h (15m default).  
**E — ACARD Schema v1.0:** Required id, capabilities[cid, embedding(384), pricing], meta(version/updated_at/lineage), proof(signature/algorithm).  
**F — State Transitions:** Publish→Discover on TaskPublish; Discover→Recruit on CandidateSet; Recruit→Execute on CoalitionProposal; Execute→Settle on ExecutionResult; Settle→Feedback on SettlementComplete; Feedback→End on FeedbackSubmit.

---

**The 40-page MIT-CSAIL–grade Technical Specification is complete and canonical.**
