# WhatsApp Marketing Automation Flow Builder

## Take‑Home Assignment for Full‑Stack Engineer

### Overview

Build an MVP of a WhatsApp marketing automation **flow builder** that lets users create, visualize, and execute automated marketing workflows with conditional logic.

### Loom example
https://www.loom.com/share/115e322f2e754cb682115c2d69e3502d?sid=3062262e-07e2-4307-98b6-4fbaed2bab07

## Technical Stack

### Frontend

* **Framework:** Next.js with React and TypeScript
* **Styling:** Tailwind CSS
* **Flow visualization:** React Flow
* **Notes:** You may use built‑in React state and hooks; 

### Backend

* **Runtime:** Node.js + TypeScript
* **Framework:** Express.js (NestJS is acceptable but not required)
* **Database:** Your choice ( MongoDB, or in‑memory for simplicity)
* **API:** **REST** endpoints only

---

## Core Requirements

### 1) Data Modeling & Validation ⭐

* Define persistent models for flows, nodes, edges, and execution history/state.
* Support conditional logic (AND/OR) and multiple branches.
* Implement server‑side validation for flows and connections (e.g., dangling edges, invalid targets, cycles if disallowed, missing configs).

### 2) Visual Flow Builder ⭐

* **Drag & Drop:** Create and position nodes via React Flow.
* **Connections:** Create/modify connections; prevent invalid wiring.
* **Conditional Branching:** Visualize decision splits and branches.
* **Configuration UI:** Edit node properties in a side panel or modal.

### 3) Flow Traversal & Execution ⭐

* **Triggers:** Support multiple trigger types (see below).
* **Sequencing:** Execute actions in order; support parallel branches.
* **Conditions:** Evaluate complex AND/OR logic from trigger/context data.
* **Delays:** Respect time delays (minutes/hours/days). For demo, you may shorten delays (e.g., seconds) but keep units configurable.
* **State Persistence:** Save execution state and history between steps.
* **External Integrations:** **Mock all external calls** (e.g., WhatsApp send, order service). Provide mock REST endpoints and/or a test console to verify interactions.

---

## Triggers & Nodes

### Supported Trigger Types

* **New Order**
* **Abandoned Checkout**
* **Customer Registration**
* **Order Status Change**

> Triggers may be fired via REST webhook‑like calls to your backend or via a simple admin page in the frontend.

### Node Types

**Action Nodes**

* **Send Message:** Simulate sending a WhatsApp message (template support). Calls a **mock** endpoint.
* **Add Order Note:** Persist a note linked to an order. Calls a **mock** endpoint.
* **Add Customer Note:** Persist a note linked to a customer. Calls a **mock** endpoint.
* **Time Delay:** Wait a specified duration before proceeding.

**Logic Nodes**

* **Conditional Split:** Evaluate multiple conditions with **AND/OR** composition; support multiple output paths (e.g., true/false).

---

## Flow Execution Rules

* **Sequential Processing:** Respect node ordering on a path.
* **Parallel Branches:** Allow fan‑out and process concurrently.
* **Condition Evaluation:** Support numeric/string operators (equals, contains, greater\_than, less\_than).
* **State:** Store per‑run state, including current node(s), retries, and last error.

---

## Required Features

### A. Frontend (Next.js)

* **Flow Builder UI**

  * [ ] Drag‑and‑drop node creation with React Flow
  * [ ] Connect/disconnect nodes with validation
  * [ ] Inline validation feedback (tooltips/badges/toasts)
  * [ ] Node configuration panel (edit action/logic settings)
  * [ ] Visual display of conditional branches and delay nodes
* **Flow Operations**

  * [ ] Create, read, update, delete flows
  * [ ] Activate/deactivate a flow
  * [ ] Save and load flows to/from backend
  * [ ] Basic test interface (trigger a flow with sample payloads) (BONUS)

### B. Backend (Express/Nest)

* **Flow Management API (REST)**

  * [ ] CRUD flows (including nodes/edges)
  * [ ] Validate flow structure
  * [ ] Activate/deactivate flows
* **Execution Engine**

  * [ ] Endpoint to fire triggers
  * [ ] Core traversal to process nodes sequentially/in parallel
  * [ ] Conditional evaluation with AND/OR
  * [ ] Time delays (using timers/queues or simplified scheduler)
  * [ ] **Mock external services** (WhatsApp send, order system) exposed as REST endpoints for testing



## Deliverables

### Code Repository

* **frontend/** Next.js app (React Flow builder)
* **backend/** Express/Nest API server
* **README.md** setup & run
* **ARCHITECTURE.md** key decisions and trade‑offs

### Core Functionality Demo ( make a loom )

1. **Flow Creation:** Build the sample flow with conditions
2. **Visual Updates:** Show real‑time visual changes as nodes/edges are edited
3. **Flow Execution:** Trigger and observe the end‑to‑end run
4. **Conditional Logic:** Demonstrate condition evaluation and branching output

---


## Bonus (Optional)

* Unit tests for engine/validators
* Flow templates and JSON import/export
* Basic execution analytics (run counts, success/fail)

---

## Submission Guidelines

**Submit:**

1. Source code in a GitHub repo
2. README with setup and usage
3. 5‑minute demo video (screen recording)
4. Short **ARCHITECTURE.md** covering key decisions

---

## Questions

If anything is unclear, ask concise questions early to avoid rework.
