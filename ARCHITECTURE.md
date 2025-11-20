# Architecture & Design Decisions

## Overview

WhatsApp Marketing Automation Flow Builder - a scalable flow execution system with visual editor, conditional logic, time delays, and parallel execution.

**Stack:** NestJS + MongoDB + Redis/Bull + Next.js 14 + React Flow

---

## Key Architectural Decisions

### 1. Framework: NestJS vs Express

**Decision:** NestJS

**Rationale:**
- Built-in validation with `class-validator` (reduces boilerplate)
- Native Bull/BullMQ integration for queues
- Dependency injection simplifies testing
- Modular structure scales better for large teams
- Production-proven (used by TextYes)

---

### 2. Data Model: Single Collection vs Separate Collections

**Decision:** Single `flows` collection with embedded `nodes[]` and `edges[]`

**Schema:**
```typescript
{
  _id: ObjectId,
  name: string,
  triggerType: enum,
  isActive: boolean,
  nodes: [{ id, type, category, position, config }],
  edges: [{ id, source, target, label, sourceHandle }]
}
```

**Rationale:**
- **Access Pattern Match:** Flows always loaded/saved as complete units
- **React Flow Compatibility:** Zero transformation - `{nodes, edges}` format
- **Atomic Operations:** Single-document updates avoid transactions
- **Performance:** One read vs joins/aggregations
- **Document Size:** ~100KB avg per flow, **MongoDB 16MB limit = ~160K nodes+edges per flow** 

**Scale Considerations:**
- At 10K flows: ~1.5GB data
- Indexes enable O(log n) queries: `{triggerType: 1, isActive: 1}`, `{createdAt: -1}`
- Sharding key: `_id` or `triggerType` for trigger-based partitioning
- Independent documents = perfect for horizontal scaling

---

### 3. Trigger & END as Real Nodes

**Decision:** TRIGGER and END are physical nodes (not virtual)

**Rationale:**
- **Validation Simplicity:** Graph algorithms (BFS, DFS) work uniformly
- **Execution Consistency:** Same traversal logic for all node types
- **User Clarity:** Visual representation shows start/end points
- **System Nodes Category:** Marked with `category: SYSTEM`, immutable in UI

**Trade-off:** Slight storage overhead vs significant code simplification

---

### 6. Parallel Execution: JavaScript Async vs BullMQ

**Decision:** JavaScript `Promise.all()` for MVP

**Trade-offs:**

| Approach | Pros | Cons |
|----------|------|------|
| **Async (chosen)** | Simple, fast, low latency | Limited by Node.js concurrency, server-bound |
| **BullMQ** | Truly scalable, decoupled, no HTTP limits, server stays responsive | Added complexity, queue overhead for short tasks |

**Scale Path:**
- **MVP:** Async handles 100s of concurrent branches
- **Production:** Migrate to BullMQ when:
  - Flows have 10+ parallel branches
  - Server receives high webhook traffic
  - Need distributed execution across workers

---

### 7. Time Delays: BullMQ with Redis

**Decision:** BullMQ for time delays (not in-memory timers)

**Rationale:**
- **Persistence:** Redis survives server restarts
- **Scalability:** Multiple workers process queue
- **No Event Loop Blocking:** Delays can be hours/days
- **Reliability:** Built-in retry and failure handling

---

### 8. Execution Schema: Single Document

**Decision:** Single `executions` collection (separate from `flows`)

**Schema:**
```typescript
{
  _id: ObjectId,
  flowId: ObjectId,
  status: 'running' | 'delayed' | 'completed' | 'failed',
  branches: [{ branchId, status, currentNodeId, path }],
  executedNodes: [{ nodeId, status, startTime, endTime, result, error, 
                    idempotencyKey, retryCount, arrivalCount }],
  resumeAt: Date,
  resumeData: { nextNodeIds, context, branchId }
}
```

**Rationale:**
- **Separate from Flows:** Different access patterns (flows: read-heavy, executions: write-heavy)
- **Atomic Updates:** MongoDB `$push` for concurrent branch writes

**Indexes:**
```javascript
{ flowId: 1, status: 1, createdAt: -1 }  // Execution history
{ status: 1, resumeAt: 1 }                // Resume delayed jobs
```

---

### 9. Branch Tracking with Unique IDs

**Decision:** Each branch gets hierarchical ID (e.g., `root`, `root_0`, `root_0_1`)

**Concurrency Control:**
- **Atomic Operators Only:** `$push`, `$set`, `$inc` on array elements
- **No Read-Modify-Write:** Prevents race conditions
- Each branch writes to its own array element via `branches.$.branchId`

---

### 10. END Node Synchronization

**Decision:** END node tracks arrival count to determine completion

**Race-Safe Implementation:**
```typescript
// 1. Ensure END node exists (only once)
await executionModel.updateOne(
  { _id: executionId, 'executedNodes.nodeId': { $ne: 'end' } },


**Rationale:**
- **Prevents Duplicates:** `$ne` operator ensures single END node
- **Atomic Count:** Each branch increments safely
- **Completion Logic:** Flow done when ALL branches reach END (or fail)

---

### 11. Idempotency for External APIs

**Decision:** Generate `idempotencyKey` for every external action

**Format:** `${executionId}_${nodeId}`

**Rationale:**
- **Retry Safety:** Same node execution returns cached result
- **Prevents Duplicates:** Won't send 2x WhatsApp messages on retry
- **Production Pattern:** Real APIs support idempotency headers

---

### 12. Error Handling & Retry

**Decision:** Manual retry only (no automatic retries)

**Rationale:**
- **Simplicity:** Avoids complex retry policies, exponential backoff logic
- **User Control:** Failed executions visible in UI, user decides when to retry
- **Cost Control:** Prevents runaway API costs from auto-retries

**Retry Implementation:**
- Find failed nodes → Reset to `running` → Re-execute
- Increment `retryCount` for observability
- Selective retry: UI allows choosing specific failed nodes

**Scale Path:** Add BullMQ-based automatic retries with configurable policies

---

### 14. Write Frequency & Data Retention

**Decision:** Write on every node execution, keep forever (for MVP)

**Write Strategy:**
```typescript
// Every node execution = 2 writes
1. Mark node as running ($push to executedNodes)
2. Mark node as complete/failed ($set on executedNodes.$)
```

**Rationale:**
- **Audit Trail:** Full execution history for debugging
- **Real-Time Monitoring:** Frontend polls and shows live progress
- **Trade-off:** Write amplification vs observability (observability wins for MVP)

**Production Optimization:**
- Batch writes where possible
- Implement TTL indexes: `{ createdAt: 1 }, { expireAfterSeconds: 7776000 }` (90 days)
- Archive to S3/Data Lake for long-term analytics
- avoid polling to check realtime in case of delay nodes

---

### 15. Resume After Delay

**Decision:** Save `resumeData` info in delayed branches


**Processor Logic:**
```typescript
// BullMQ job fires after delay
const { nextNodeIds, context, branchId } = job.data;
// If multiple next nodes → create sub-branches
// Otherwise continue with same branch
```

---

### 16. Manual Trigger Execution

**Decision:** Synchronous API call that fires all active flows in parallel

**Endpoint:** `POST /api/flows/trigger/:triggerType`

**Scale Considerations:**

| Approach | MVP (chosen) | Production |
|----------|--------------|------------|
| **Sync Parallel** | Simple, fast for <10 flows | Blocks server if 100+ flows |
| **BullMQ Queue** | Added complexity | Truly async, unlimited scale, webhook stays responsive |

**When to Migrate:** When trigger fires 50+ flows OR webhook latency > 500ms

---

### 17. Analytics & Execution History

**Decision:** Build dedicated executions page with real-time monitoring

**Index for Performance:**
```javascript
{ flowId: 1, status: 1, createdAt: -1 }  // Fast queries, sorted
```

**Scale Path:**
- Aggregation pipeline for complex analytics
- Pre-computed metrics in separate collection
- Hire Peppe :)
