---
name: flow-well-architected
description: "Nine-principle framework for well-architected Salesforce Flows. Use when: building new flows, reviewing flow architecture, naming flow elements, documenting flow decisions, optimizing flow performance, extracting subflows, adding error handling to flows, planning flow testing strategy, refactoring monolith or spaghetti flows, evaluating flow design quality."
argument-hint: "Describe the flow task: build, review, refactor, document, or optimize"
---

# Flow Well-Architected Framework

Nine principles in three layers. Apply bottom-up: **Foundation** (Communication) → **Design** (Architecture) → **Quality** (Production-readiness).

## When to Use

- Building a new record-triggered, screen, scheduled, or platform-event flow
- Reviewing or refactoring an existing flow for quality
- Naming flow elements, variables, or resources
- Documenting flow decisions, fault paths, or business rules
- Optimizing flow performance (DML/SOQL in loops, bulkification)
- Extracting subflows from a monolith
- Adding error handling or fault paths
- Planning test coverage for flows
- Evaluating whether a flow follows Salesforce well-architected principles

## Procedure

### Step 1 — Assess Current State

Before building or reviewing, determine where the flow stands against each principle. Score each 0 (not addressed) to 2 (fully met):

| # | Principle | Score |
|---|-----------|-------|
| 1 | Clear Intent Through Naming | |
| 2 | Document Decisions and Context | |
| 3 | Start Simple, Evolve Thoughtfully | |
| 4 | Deep Flows Over Shallow Complexity | |
| 5 | Performance-First | |
| 6 | Modularity Through Subflows | |
| 7 | Cohesive Organization | |
| 8 | Error Handling (First-Class) | |
| 9 | Testability | |

Prioritize fixing the lowest-scoring principles first.

### Step 2 — Apply Foundation Principles (1–3)

#### Principle 1: Clear Intent Through Naming

Use natural language. Descriptive, complete words, consistent, business-perspective.

**Element naming rules:**
- Flow API name: `{Object}__{Trigger}__{BusinessProcess}` (e.g., `Case__After__SupportEscalation`)
- Variables: `var{Type}{Name}` — `varTextErrorMessage`, `varCollAccountIds`
- Get Records: `get{Object}{Purpose}` — `getContactsPrimary`
- Decisions: `dec{Question}` — `decIsHighValue`
- Assignments: `assign{Target}{Action}` — `assignAccountFields`
- Loops: `loop{Collection}` — `loopOpenCases`
- Subflows: `sub{Process}` — `subValidateAddress`

**Test:** Can someone unfamiliar with the flow understand each element's purpose from its name alone?

#### Principle 2: Document Decisions and Context

Descriptions capture the **"why"**, not the "what." Preserve:
- Compliance requirements and policy references
- Platform workarounds and known limitations
- Business rules and their source
- Trade-off decisions and alternatives considered

| ❌ Bad | ✅ Good |
|--------|---------|
| "Checks if amount > 1000" | "Orders >$1K require manual approval per compliance policy POL-2024-18" |
| "Get Account record" | "LIMIT 1 — PE-triggered flows lack full record context" |
| "Loop through contacts" | "Iterates open contacts to build notification list; max ~200 per account per SLA" |

#### Principle 3: Start Simple, Evolve Thoughtfully

**Rule of Three:**
1. **1st occurrence** → inline in the flow
2. **2nd occurrence** → copy is acceptable
3. **3rd occurrence** → extract to reusable subflow or invocable action

**Evolution signals** (time to refactor):
- Same logic duplicated across 3+ flows
- Frequent business rule changes require edits in multiple places
- Flow grows beyond ~50 elements or comfortable comprehension
- Multiple developers editing the same flow causes merge conflicts

### Step 3 — Apply Design Principles (4–7)

#### Principle 4: Deep Flows Over Shallow Complexity

Deliver complete business value in a single flow. Test with one sentence from the user's perspective:

| ❌ Shallow (technical) | ✅ Deep (business value) |
|------------------------|--------------------------|
| "Updates account, creates task, sends email" | "Onboards new customers" |
| "Sets fields on opportunity" | "Qualifies enterprise deals for review" |

If you can't describe the flow's purpose in one business sentence, it either does too much (split) or too little (combine).

#### Principle 5: Performance-First

**Hard rule: Never DML or SOQL inside loops.**

Think in collections. Bulkify by default:

```
❌ Loop → Get Record → Update Record (per item)
✅ Get Records (filtered query) → Loop (build collection) → Update Records (single DML)
```

**Performance checklist:**
- [ ] Filter in the query (`WHERE`), not after retrieval
- [ ] Select only needed fields in Get Records
- [ ] Use relationship queries to reduce SOQL count
- [ ] Entry criteria filter out irrelevant triggers early
- [ ] No DML or SOQL inside any loop
- [ ] Tested with realistic data volumes (not just 1–2 records)

**Governor limits to track:** 100 SOQL queries, 150 DML statements, 12 MB heap per transaction. CPU time multiplies inside loops.

#### Principle 6: Modularity Through Subflows

Extract subflows for reusable components with clear input/output contracts.

**Good subflow candidates:**
- Validation logic (returns `isValid` + `errorMessages`)
- Calculations (discount, tax, shipping)
- Integration callouts (external API wrapper)
- Notification builders (email/chatter with templates)
- Data lookups shared across multiple flows

**Subflow contract rules:**
- Define explicit input and output variables (no reliance on global state)
- Name inputs `in{Name}`, outputs `out{Name}`
- Include a description of what the subflow does, its preconditions, and return values
- Keep subflows focused on one responsibility

#### Principle 7: Cohesive Organization

Organize by **business domain**, not by technical trigger. No "god flows."

```
❌ Case - After - Handle all updates (dozens of branches for unrelated logic)

✅ Case - After - Support escalation to management
   Entry criteria: Type = 'Support' AND Status changed to 'Escalated'

✅ Case - After - Warranty claim processing
   Entry criteria: Type = 'Warranty' AND Status = 'Submitted'
```

**Cohesion test:** If you removed any one element, would the rest still make sense as a unit? If elements serve unrelated purposes, split the flow.

### Step 4 — Apply Quality Principles (8–9)

#### Principle 8: Error Handling (First-Class)

Every DML operation must have a fault path. Use the **three-step error pattern:**

1. **Capture** — Assign a user-friendly message to `varTextErrorMessage`
2. **Log** — Record the error details: include where, what, context, severity
3. **Respond** — Based on flow type:

| Flow Type | Error Response |
|-----------|---------------|
| Screen Flow | Display error screen with `varTextErrorMessage` and retry/cancel options |
| Record-Triggered | Add `$Flow.FaultMessage` to custom error or platform event for monitoring |
| Scheduled Flow | Send admin notification (email or Chatter) |
| Integration | Implement retry logic with exponential backoff, then alert |

**Fault path naming:** `fault{Operation}{Object}` — `faultUpdateAccount`, `faultCreateCase`

#### Principle 9: Testability

Design flows so they can be tested systematically:

- **Strategic checkpoints:** Decision outcomes, loop counts, assignment results should be observable
- **Test coverage matrix:**

| Category | What to Test |
|----------|-------------|
| Happy path | Standard successful execution end-to-end |
| Edge cases | Null values, empty collections, boundary values, max lengths |
| Error paths | Each fault path triggers correctly and logs/responds properly |
| Data variations | Different record types, permission sets, field combinations |
| Bulk | 200+ records to verify governor limit compliance |

- **Predictable behavior:** Avoid reliance on org-specific data; use test data factories
- **Isolation:** Each test verifies one flow behavior; failures pinpoint the issue

### Step 5 — Identify and Fix Anti-Patterns

| Anti-Pattern | Symptoms | Fix |
|-------------|----------|-----|
| **Monolith** | 150+ elements, multiple unrelated branches | Group logically → extract subflows → create orchestrator flow |
| **Spaghetti** | 8+ decision outcomes, crossing connector lines | Break into multiple simple decisions → extract to subflows → linearize paths |
| **Silent Failer** | DML with no fault path, errors vanish | Add fault connector to every DML → three-step error pattern → log everything |
| **Copy-Paste Flow** | Same logic in 3+ flows with minor variations | Extract shared logic to subflow → parameterize differences via input variables |
| **God Flow** | One flow handles all triggers for an object | Split by business domain → use entry criteria → one concern per flow |
| **Loop Querier** | SOQL/DML inside loop elements | Collect IDs first → single query outside loop → map results back |

### Step 6 — Final Review Checklist

Before marking a flow as production-ready:

- [ ] Every element has a descriptive name (Principle 1)
- [ ] Key decisions and workarounds are documented in descriptions (Principle 2)
- [ ] No premature abstractions; subflows extracted only at 3+ reuse (Principle 3)
- [ ] Flow delivers one complete business outcome (Principle 4)
- [ ] Zero DML/SOQL in loops; entry criteria set; fields filtered (Principle 5)
- [ ] Reusable logic extracted to subflows with clear contracts (Principle 6)
- [ ] Flow is cohesive — one domain, one concern (Principle 7)
- [ ] Every DML has a fault path with capture → log → respond (Principle 8)
- [ ] Happy path, edge cases, error paths, and bulk tested (Principle 9)

## Common Orchestration Patterns

| Pattern | Structure |
|---------|-----------|
| **Sequential Pipeline** | Main → validate → check availability → process payment → calculate shipping → notify |
| **Data Validation** | Subflow checks all rules → returns `outIsValid` + `outErrorMessages` collection |
| **Conditional Branch** | Decision → Subflow A or Subflow B → converge at assignment → continue |
| **Retry Integration** | Callout → fault → increment retry counter → wait → re-enter (max 3 retries) → alert |
