# Nooterra Protocol Technical Specification v1.0 (Condensed)

## 1. Introduction
- Unified substrate for cross-org AI agent coordination: identity, discovery, coalition orchestration, settlement, reputation.
- Network model: asynchronous, partially synchronous; Byzantine participants; finite but unbounded delays.
- Entities: agents, registry nodes, coordination nodes, settlement nodes, reputation oracles, verification agents.

## 2. Identity & Agent Card (ACARD)
- NAID: `did:noot:<base58(SHA3-256(pubkey))>`, key types ed25519 | secp256k1; annual rotation.
- ACARD JSON-LD: id, capabilities (cid, 384-dim embedding, schemas, policy, pricing), meta (version/lineage/updated_at), proof (signature + algorithm).
- Validation: correct signature, dim=384 normalized embeddings, semver, resolvable schemas.

## 3. Semantic Discovery Network (SDN)
- Vector index: HNSW/IVF-PQ; ≥20k inserts/s; recall ≥0.88 @ ef=200; P99 ≤50ms at 10M+ vectors.
- Query pipeline: Embed intent → ANN candidates → LLM re-rank → multi-factor scoring  
`R = α·sim + β·rep + γ·(1/latency) + δ·(1/price)`.
- Gossip: push–pull anti-entropy; trust-weighted peer selection; msgpack deltas `[NAID|version|timestamp|capability_hash|sig]`; merge by version+sig.
- Consistency: eventual; rebuild on hard failure from peers.

## 4. Coalition Coordination Protocol (CCP)
- Phases: Publish → Discover → Recruit → Execute → Settle → Feedback (deterministic transitions).
- Messages (msgpack): TaskPublish, CandidateSet, BidSubmission, CoalitionProposal, CheckpointCommit, ExecutionResult, DisputeNotice, FeedbackSubmit.
- Timers (defaults): Discover 800ms, Recruit 6s, Settle 5m, Feedback 15m (bounded ranges).
- Orchestrator election: `O = 0.50·Rep + 0.25·Stake + 0.15·(1/Latency) + 0.10·Uptime`; safety: distinct from requester, meets SLA/privacy, no conflicts.
- Coalition formation: topological DAG assignment; scoring `S = λ1·sim + λ2·rep + λ3·(1/latency) + λ4·(1/price)` (defaults 0.45/0.30/0.15/0.10).
- Execution: DAG scheduler with reassignment on failure; checkpoints hashed `H(state || tid || node)`.
- Safety: no duplicate executors/double settlement/circular DAG/orchestrator dictatorship; liveness: tasks complete or abort; settlement finalizes; feedback recorded.

## 5. Settlement Layer (RER)
- Goals: correctness, atomicity, finality, dispute resolution, non-repudiation, verifiability.
- Flow: SettlementPrepare (tid, coalition_map, cost breakdown, result hash/payload) → validation → contract lock/release.
- On-chain (Base L2 ref): `lockFunds`, `complete`, `dispute`, `refund`.
- Fees: protocol fee (default 0.3%) + agent fee (per ACARD).
- Disputes: reviewers selected randomly; 2/3 quorum; outcomes → refund/release/slash.
- Timeouts: default 20m; max deadline+30m; timeout → refund + neutral/penalty.

## 6. Reputation Layer (EigenReputation)
- Components: Success, Quality, Latency, Reliability, Endorsements, Penalties.
- Trust graph: row-normalized adjacency M;  
`r = α·M·r + (1-α)·b`, α∈[0.85,0.98]; converges logarithmically; Sybil-resistant via inertia/stake/history.
- Updates: on feedback; weights for success/quality/latency; adversarial weighting if flagged.
- Slashing: `S = κ·(1 - r)`; impacts ranking, bidding power, visibility.

## 7. Security Model
- Threats: identity forgery/Sybil; embedding poisoning/flooding; bidding manipulation/collusion/orchestrator takeover; output forgery/checkpoint tampering; settlement fraud/double spend; reputation gaming.
- Mitigations: signed ACARD + key rotation; anomaly detection on vectors; VCG sealed bids + random windows; trust-weighted gossip; WASM/TEE, checkpoint hashing, reviewer redundancy; contract atomicity + nonces; stake-based credibility and loop detection.

## 8. Interoperability
- Substrate under A2A/MCP/LangGraph/CrewAI/etc.; transports: HTTP/2, WS, QUIC, libp2p.
- Schemas: JSON Schema Draft-07; msgpack for binary; protobuf optional.
- Required modules for external agents: ACARD generation, embeddings(384), signature verify, discovery endpoint, task exec callback, settlement callback, error reporting.
- Blockchain: EVM settlement default; Solana/Cosmos optional; versioning via `spec_version.major.minor.patch` with NIP process.

## 9. Reference Algorithms (Pseudocode)
- Embedding: MiniLM → normalize(384).  
- Ranking: cosine + weighted reputation/latency/price.  
- VCG auction: welfare-without-agent, sealed bids, payments computed per winner.  
- DAG scheduler: topo-order assignment, execute, reassign on failure.  
- Checkpoint verify: hash + signature check.  
- Dispute resolution: random reviewers, majority ≥2/3.

## 10. Appendices (Key Excerpts)
- **Message signatures**: Ed25519 | secp256k1 over hash(msg); verify before processing.  
- **Hashes**: BLAKE3 default; SHA3-256 fallback.  
- **Error codes**: `{0 OK, 1 INVALID_SIGNATURE, 2 BAD_SCHEMA, 3 NO_ELIGIBLE_AGENTS, 4 DEADLINE_EXCEEDED, 5 DISPUTE_UPHELD, 6 EXECUTION_FAILURE, 7 SETTLEMENT_FAILURE}`.  
- **Timers**: Discover 200–2000ms (800 default), Recruit 3–12s (6 default), Settle 30s–20m (5m default), Feedback 5m–1h (15m default).  
- **ACARD schema v1**: required id, capabilities[], meta, proof; embedding length exactly 384; pricing model/amount/currency.  
- **State transitions**: Publish→Discover→Recruit→Execute→Settle→Feedback→End.

---
Use this as the implementation-facing spec; for deeper math and proofs, see the full internal draft. This captures all mandatory requirements, fields, timers, and algorithms needed to build interoperable nodes and agents.
