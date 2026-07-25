# HMAS Supply Command Console Phase 5 Workspace Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn typed Daily Command Brief proposals into owner-approved, signed,
idempotent Buzz workspace mutations without granting models or the renderer an
execution capability.

**Architecture:** Add a new owner-private Nostr action-lifecycle kind and store
only its encrypted signed events in the existing protected Command Brief SQLite
database. A Rust state machine derives action identity, performs compare-and-set
approval, revalidates exact target revisions, invokes one closed adapter, and
records signed receipts. React renders native-provided previews and confirmation
controls; it never supplies effect payloads or execution routing.

**Tech Stack:** Rust 2021, Tauri 2, Nostr/NIP-44, rusqlite, React 19,
TypeScript, Node test runner, Playwright, Bash, Docker-backed relay integration
tests.

## Global Constraints

- Activate Hermit before every `cargo`, `pnpm`, `just`, Git hook, commit, or
  push command: `. ./bin/activate-hermit`.
- Work only in
  `/Users/matthewwarren/Documents/Buzz AI/.worktrees/codex-phase-5-workspace-actions`
  on `codex/phase-5-workspace-actions`.
- `OFFICIAL` remains local-only with no cloud fallback.
- Models may emit only untrusted `pending` proposals; only native Rust may
  derive action IDs, approve, reject, claim, execute, or retry them.
- Actions are limited to the five closed Buzz-only effects in the approved
  design. No arbitrary Nostr kind, Tauri command, URL, process, Apple write,
  webhook, cloud request, message send, or external operational action.
- Phase 4 version 1 briefs remain readable and their text-only proposals remain
  permanently non-executable.
- Every action transition is owner-signed, NIP-44 encrypted to self, `p`-gated,
  predecessor-linked, bounded, and locally durable before it is exposed as
  successful.
- Do not add `unsafe`, production `unwrap()`, or production `expect()`.
- Every new public Rust API has a doc comment.
- Every production behavior follows RED, GREEN, refactor; the failing test must
  be observed and recorded before implementation.
- `PHASE4-COMMISSION-001` remains separate and unwaived.

---

### Task 1: Add the owner-private workspace-action event contract

**Files:**
- Create: `crates/buzz-core/src/workspace_action.rs`
- Create: `docs/nips/NIP-WA.md`
- Modify: `crates/buzz-core/src/lib.rs`
- Modify: `crates/buzz-core/src/kind.rs`
- Modify: `crates/buzz-core/src/filter.rs`
- Test: `crates/buzz-core/src/workspace_action.rs`
- Test: `crates/buzz-core/src/kind.rs`
- Test: `crates/buzz-core/src/filter.rs`

**Interfaces:**
- Consumes: `nostr::{Event, EventBuilder, Keys, Kind, Tag}`,
  `buzz_core::kind`, and the existing command-brief NIP-44 envelope pattern.
- Produces:
  `KIND_WORKSPACE_ACTION = 44211`,
  `WorkspaceActionType`,
  `WorkspaceActionLifecycleState`,
  `WorkspaceActionEffect`,
  `WorkspaceActionReceipt`,
  `WorkspaceActionFailureCode`,
  `WorkspaceActionEventPayload`,
  `build_workspace_action_event`,
  `decrypt_workspace_action_event`, and
  `validate_workspace_action_envelope`.

- [ ] **Step 1: Write failing core contract tests**

Add literal fixtures covering all five effects, every valid state, exact public
tags, self-recipient encryption, predecessor integrity, unknown fields,
oversized text, non-`OFFICIAL` classification, non-self `p`, duplicate tags,
invalid timestamps, invalid hashes, and forbidden receipt fields.

The desired closed effect shape is:

```rust
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(
    tag = "actionType",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum WorkspaceActionEffect {
    Task { title: String, due_at: String },
    CanvasChecklistUpdate {
        channel_id: String,
        checklist_id: String,
        item_id: String,
        completed: bool,
        expected_canvas_event_id: String,
    },
    ScheduledBrief { brief_id: String, scheduled_for: String },
    DraftMessage { channel_id: String, body: String },
    RoutingAction { adviser: String, destination: String },
}
```

Name the break: removing self-recipient enforcement, accepting an unknown
effect, or leaking proposal content into public tags must fail these tests.

- [ ] **Step 2: Run the tests and observe RED**

Run:

```bash
. ./bin/activate-hermit
cargo test -p buzz-core workspace_action --lib
```

Expected: compilation fails because `workspace_action` and
`KIND_WORKSPACE_ACTION` do not exist.

- [ ] **Step 3: Implement the minimal event contract**

Use `KIND_WORKSPACE_ACTION = 44_211`. The only public tags are:

```text
p=<owner pubkey>
action=<bounded opaque action id>
state=<closed lifecycle label>
```

Serialize the bounded payload, NIP-44-v2 encrypt to the same owner key, sign it
with that owner, and validate the public envelope before decrypting. Keep the
post-signing event ID outside `WorkspaceActionEventPayload`.

- [ ] **Step 4: Add kind/filter privacy behavior**

Register the kind as regular stored, non-replaceable, non-ephemeral, global,
and `p`-gated. Add `reader_authorized_for_event` coverage proving that only the
single self-recipient can read it.

- [ ] **Step 5: Run GREEN and the adjacent core suites**

Run:

```bash
. ./bin/activate-hermit
cargo test -p buzz-core workspace_action --lib
cargo test -p buzz-core kind --lib
cargo test -p buzz-core filter --lib
```

Expected: all selected tests pass.

- [ ] **Step 6: Document NIP-WA and commit**

Document exact public tags, encrypted payload, state vocabulary, owner rules,
predecessor chain, relay behavior, and privacy limitations. Then:

```bash
. ./bin/activate-hermit
git add crates/buzz-core/src/workspace_action.rs crates/buzz-core/src/lib.rs crates/buzz-core/src/kind.rs crates/buzz-core/src/filter.rs docs/nips/NIP-WA.md
git commit -m "feat(core): add owner-private workspace action events"
```

---

### Task 2: Introduce typed version 2 brief proposals with version 1 compatibility

**Files:**
- Modify: `crates/buzz-core/src/command_brief_wire.rs`
- Modify: `desktop/src-tauri/src/command_brief/types.rs`
- Modify: `desktop/src-tauri/src/command_brief/types_tests.rs`
- Modify: `desktop/src-tauri/src/command_brief/personas.rs`
- Modify: `desktop/src-tauri/src/command_brief/personas_tests.rs`
- Modify: `desktop/src-tauri/src/command_brief/orchestrator/assembly.rs`
- Modify: `desktop/src-tauri/src/command_brief/orchestrator_tests.rs`
- Modify: `desktop/src-tauri/src/command_brief/lmstudio_tests.rs`
- Modify: `desktop/src/features/command-console/domain/briefContracts.ts`
- Modify: `desktop/src/features/command-console/domain/briefContracts.test.mjs`

**Interfaces:**
- Consumes: `WorkspaceActionEffect` from Task 1, a specialist adviser ID,
  the run ID, and the exact source-ledger ID set.
- Produces:
  `TypedPendingProposal`,
  `LegacyPendingProposal`,
  `PendingProposalView`,
  `derive_workspace_action_id(run_id, adviser, proposal_key, effect)`,
  a version 1-or-2 `CommandBriefWire` reader, and version 2-only generation.

- [ ] **Step 1: Write RED fixtures for the version boundary**

Add hand-authored version 1 and version 2 JSON fixtures. Prove:

- version 1 text proposals deserialize as `legacyUntyped: true`;
- version 1 proposals expose no approve-capable effect;
- version 2 requires `proposalKey`, `rationale`, non-empty `sourceIds`, one
  closed `effect`, and literal `approvalState: "pending"`;
- source IDs must belong to the run ledger;
- duplicate proposal keys in one contribution are rejected;
- model-supplied `actionId`, approved/rejected state, URLs, commands, and
  unknown fields are rejected;
- changing run ID, adviser, proposal key, or canonical effect changes the
  derived action ID; identical input is stable.

Name the break: accepting a model-selected durable action ID or treating a
legacy text proposal as executable must fail.

- [ ] **Step 2: Observe RED**

Run:

```bash
. ./bin/activate-hermit
cargo test -p buzz-core command_brief --lib
cargo test --manifest-path desktop/src-tauri/Cargo.toml command_brief::types_tests -- --test-threads=1
pnpm --dir desktop exec node --import ./test-loader.mjs --experimental-strip-types --test src/features/command-console/domain/briefContracts.test.mjs
```

Expected: new version 2 assertions fail because only version 1 text proposals
exist.

- [ ] **Step 3: Implement strict Rust version 2 parsing**

Use this native representation:

```rust
pub enum PendingProposalView {
    LegacyUntyped {
        action_id: String,
        text: String,
    },
    Typed {
        action_id: String,
        proposal_key: String,
        rationale: String,
        source_ids: Vec<String>,
        effect: WorkspaceActionEffect,
        expected_target_revision: Option<String>,
    },
}
```

Derive `action_id` in Rust as lowercase SHA-256 over an unambiguous
length-prefixed sequence of run ID, adviser label, proposal key, and
`serde_json::to_vec` output from the validated map-free Rust effect type. Rust
struct field order is therefore the canonical effect order; TypeScript never
serializes or hashes an effect. Do not accept an `actionId` field in version 2
input.

- [ ] **Step 4: Make generation version 2-only**

Update specialist schemas and prompts to require typed pending proposals.
Pass the run ID into contribution validation. The Chief of Staff remains
tool-free and may preserve or omit no specialist proposal; deterministic
assembly carries validated proposals forward without rewriting effects.

- [ ] **Step 5: Update the renderer parser**

Represent legacy and typed proposals as a discriminated union. The parser must
reject mixed version shapes and treat the Rust-provided action ID as opaque.
TypeScript must not compute hashes.

- [ ] **Step 6: Run GREEN and commit**

Run:

```bash
. ./bin/activate-hermit
cargo test -p buzz-core command_brief --lib
cargo test --manifest-path desktop/src-tauri/Cargo.toml command_brief::types_tests -- --test-threads=1
cargo test --manifest-path desktop/src-tauri/Cargo.toml command_brief::personas_tests -- --test-threads=1
cargo test --manifest-path desktop/src-tauri/Cargo.toml command_brief::orchestrator_tests -- --test-threads=1
cargo test --manifest-path desktop/src-tauri/Cargo.toml command_brief::lmstudio_tests -- --test-threads=1
pnpm --dir desktop test
git add crates/buzz-core/src/command_brief_wire.rs desktop/src-tauri/src/command_brief desktop/src/features/command-console/domain/briefContracts.ts desktop/src/features/command-console/domain/briefContracts.test.mjs
git commit -m "feat(command-console): add typed workspace proposals"
```

Expected: all selected suites pass and no version 1 fixture is rewritten.

---

### Task 3: Enforce workspace-action privacy at every relay boundary

**Files:**
- Modify: `crates/buzz-relay/src/handlers/ingest.rs`
- Modify: `crates/buzz-relay/src/handlers/event.rs`
- Modify: `crates/buzz-relay/src/handlers/req.rs`
- Modify: `crates/buzz-relay/src/api/bridge.rs`
- Create: `crates/buzz-test-client/tests/e2e_workspace_action.rs`

**Interfaces:**
- Consumes: `validate_workspace_action_envelope` and
  `KIND_WORKSPACE_ACTION`.
- Produces: owner-only ingest, WebSocket REQ, HTTP query/count, ID lookup,
  search, and live fan-out behavior.

- [ ] **Step 1: Add failing relay and E2E tests**

Clone the command-brief privacy matrix but use independent workspace-action
fixtures. Cover malformed envelope rejection, author-not-equal-`p`, outsider
REQ/COUNT/ID/search denial, kindless ID denial, self read, and cross-community
isolation.

Name the break: omitting the new kind from any one `p`-gated or fan-out
chokepoint must fail at least one test.

- [ ] **Step 2: Observe RED**

Run:

```bash
. ./bin/activate-hermit
cargo test -p buzz-relay workspace_action
```

Expected: outsider/privacy tests fail because the relay does not recognize the
new owner-private kind.

- [ ] **Step 3: Implement all relay gates**

Add the new kind beside `KIND_COMMAND_BRIEF` in required scope, global-kind,
ingest validation, `P_GATED_KINDS`, explicit no-ID-exemption, final fan-out,
bridge query/count, and search authorization branches. Generalize duplicated
command-brief self-recipient predicates only when the resulting helper remains
closed over the two exact kinds.

- [ ] **Step 4: Run GREEN and commit**

Run:

```bash
. ./bin/activate-hermit
cargo test -p buzz-relay workspace_action
cargo test -p buzz-relay command_brief
cargo test -p buzz-core filter --lib
git add crates/buzz-relay crates/buzz-test-client/tests/e2e_workspace_action.rs
git commit -m "feat(relay): protect workspace action events"
```

Expected: all selected tests pass. Leave the Docker-backed E2E binary for the
Task 9 aggregate unless the local relay test stack is already healthy.

---

### Task 4: Build the encrypted-event action store and state machine

**Files:**
- Create: `desktop/src-tauri/src/workspace_actions/mod.rs`
- Create: `desktop/src-tauri/src/workspace_actions/store.rs`
- Create: `desktop/src-tauri/src/workspace_actions/store/schema.rs`
- Create: `desktop/src-tauri/src/workspace_actions/store_tests.rs`
- Modify: `desktop/src-tauri/src/lib.rs`
- Modify: `desktop/src-tauri/src/startup.rs`

**Interfaces:**
- Consumes: signed NIP-WA event JSON and metadata from Task 1.
- Produces:
  `WorkspaceActionStore`,
  `WorkspaceActionHead`,
  `WorkspaceActionClaim`,
  `WorkspaceActionPublication`,
  `open_workspace_action_store`,
  `append_transition`,
  `compare_and_set_head`,
  `claim_execution`,
  `complete_execution`,
  `due_publications`, and `validate_workspace_action_store_schema`.

- [ ] **Step 1: Write failing schema and state-machine tests**

Use temporary real SQLite databases. Prove exact schema, file mode `0600`,
owner/action composite isolation, append-only sequence, exact predecessor,
allowed transitions, concurrent approve/reject winner, duplicate-click
rejection, one durable execution claim, stable idempotency key, retryable-only
reclaim, terminal immutability, and publication of the exact stored event ID.

The tables are:

```sql
workspace_action_events(
  owner_pubkey, action_id, sequence, lifecycle_state, event_id, event_json,
  payload_hash, predecessor_event_id, publish_state, retry_count,
  next_retry_at, created_at,
  PRIMARY KEY(owner_pubkey, action_id, sequence),
  UNIQUE(event_id)
)
workspace_action_heads(
  owner_pubkey, action_id, lifecycle_state, head_event_id, payload_hash,
  updated_at,
  PRIMARY KEY(owner_pubkey, action_id)
)
workspace_action_claims(
  owner_pubkey, action_id, idempotency_key, attempt, claim_state, claimed_at,
  updated_at,
  PRIMARY KEY(owner_pubkey, action_id),
  UNIQUE(idempotency_key)
)
workspace_action_scheduled_briefs(
  owner_pubkey, action_id, brief_id, scheduled_for, run_id, state, updated_at,
  PRIMARY KEY(owner_pubkey, action_id),
  UNIQUE(owner_pubkey, brief_id)
)
workspace_action_draft_handoffs(
  owner_pubkey, action_id, channel_id, handoff_state, acknowledged_at,
  PRIMARY KEY(owner_pubkey, action_id)
)
```

`event_json` is the signed encrypted event. No rationale, body, title, or
source text has its own plaintext column.

- [ ] **Step 2: Observe RED**

Run:

```bash
. ./bin/activate-hermit
cargo test --manifest-path desktop/src-tauri/Cargo.toml workspace_actions::store_tests -- --test-threads=1
```

Expected: compilation fails because the store module does not exist.

- [ ] **Step 3: Implement schema and transactional transitions**

Use `TransactionBehavior::Immediate` for head changes and claims. Encode the
allowed transition table in Rust and recheck it inside the same transaction
that appends the event and updates the head. Derive idempotency as lowercase
SHA-256 of owner pubkey plus action ID plus payload hash.

- [ ] **Step 4: Run GREEN and commit**

Run:

```bash
. ./bin/activate-hermit
cargo test --manifest-path desktop/src-tauri/Cargo.toml workspace_actions::store_tests -- --test-threads=1
git add desktop/src-tauri/src/workspace_actions desktop/src-tauri/src/lib.rs desktop/src-tauri/src/startup.rs
git commit -m "feat(command-console): persist workspace action state"
```

Expected: the full store suite passes with one selected writer thread.

---

### Task 5: Implement local-only task, routing, and draft-handoff adapters

**Files:**
- Create: `desktop/src-tauri/src/workspace_actions/adapters.rs`
- Create: `desktop/src-tauri/src/workspace_actions/adapters_tests.rs`
- Create: `desktop/src-tauri/src/workspace_actions/draft_handoff.rs`
- Modify: `desktop/src-tauri/src/workspace_actions/mod.rs`
- Modify: `desktop/src/features/messages/lib/useDrafts.ts`
- Modify: `desktop/src/features/messages/lib/useDrafts.test.mjs`

**Interfaces:**
- Consumes: native `ApprovedWorkspaceAction`, immutable effect hash, active
  owner, and store transaction APIs.
- Produces:
  `WorkspaceActionAdapter`,
  `WorkspaceActionReceipt`,
  `apply_local_action`,
  `list_draft_handoffs`,
  `acknowledge_draft_handoff`, and
  `importWorkspaceActionDraft`.

- [ ] **Step 1: Write failing adapter tests**

Prove task and routing actions create exactly one succeeded receipt, replay
returns the same receipt, an owner switch blocks execution, and no adapter
accepts a model string or arbitrary kind. For drafts, prove approval creates
one native handoff, the browser imports only native-returned channel/body data,
replay overwrites the same draft key without duplication, and acknowledgement
occurs only after `localStorage` persistence succeeds.

Name the break: calling `send_channel_message`, accepting renderer-supplied
body during acknowledgement, or dropping a handoff before successful storage
must fail.

- [ ] **Step 2: Observe RED**

Run:

```bash
. ./bin/activate-hermit
cargo test --manifest-path desktop/src-tauri/Cargo.toml workspace_actions::adapters_tests -- --test-threads=1
pnpm --dir desktop exec node --import ./test-loader.mjs --experimental-strip-types --test src/features/messages/lib/useDrafts.test.mjs
```

Expected: native adapter and import APIs are missing.

- [ ] **Step 3: Implement minimal local effects**

Treat the signed succeeded action event as the authoritative task/routing
record. For a draft, keep the body only inside the encrypted proposed event;
decrypt on `list_draft_handoffs`, return it to the active owner, persist via
`persistDraftEntry(channel_id, body, channel_id, [], [])`, then acknowledge
using only `action_id`. Never invoke the send path.

- [ ] **Step 4: Run GREEN and commit**

Run:

```bash
. ./bin/activate-hermit
cargo test --manifest-path desktop/src-tauri/Cargo.toml workspace_actions::adapters_tests -- --test-threads=1
pnpm --dir desktop test
git add desktop/src-tauri/src/workspace_actions desktop/src/features/messages/lib/useDrafts.ts desktop/src/features/messages/lib/useDrafts.test.mjs
git commit -m "feat(command-console): add local workspace action adapters"
```

---

### Task 6: Add revision-safe managed checklists and one-off brief scheduling

**Files:**
- Create: `desktop/src-tauri/src/workspace_actions/managed_checklist.rs`
- Create: `desktop/src-tauri/src/workspace_actions/managed_checklist_tests.rs`
- Create: `desktop/src-tauri/src/workspace_actions/one_off_schedule.rs`
- Create: `desktop/src-tauri/src/workspace_actions/one_off_schedule_tests.rs`
- Modify: `desktop/src-tauri/src/workspace_actions/adapters.rs`
- Modify: `desktop/src-tauri/src/commands/canvas.rs`
- Modify: `desktop/src-tauri/src/startup.rs`
- Modify: `desktop/src-tauri/src/command_brief/scheduler.rs`

**Interfaces:**
- Consumes: current canvas event/content, exact expected event ID,
  `scheduled_for`, active owner, and `start_manual_command_brief`.
- Produces:
  `update_managed_checklist`,
  `claim_due_one_off_briefs`, and native canvas/schedule adapter receipts.

- [ ] **Step 1: Write RED managed-checklist tests**

Use this exact line-oriented block:

```markdown
<!-- buzz:checklist:v1 id=morning-checks -->
- [ ] Verify readiness <!-- buzz:item:v1 id=readiness -->
<!-- /buzz:checklist:v1 -->
```

Prove only the named checkbox byte changes, surrounding Markdown is
byte-identical, duplicate/malformed/nested markers are rejected, unstructured
checkboxes are ignored, target event mismatch returns `stale`, and a retry
detects the already-applied marker instead of publishing again.

- [ ] **Step 2: Write RED one-off schedule tests**

Use a fixed clock. Prove past, more-than-90-day, duplicate brief ID, duplicate
action ID, wrong owner, and non-RFC3339 inputs fail. Prove two racing timer
checks claim once, a restart does not duplicate a started run, and the recurring
0600 schedule is unchanged.

- [ ] **Step 3: Observe RED**

Run:

```bash
. ./bin/activate-hermit
cargo test --manifest-path desktop/src-tauri/Cargo.toml workspace_actions::managed_checklist_tests -- --test-threads=1
cargo test --manifest-path desktop/src-tauri/Cargo.toml workspace_actions::one_off_schedule_tests -- --test-threads=1
```

Expected: both modules are missing.

- [ ] **Step 4: Implement managed checklist mutation**

Extract reusable current-canvas load and signed-canvas publish functions below
the Tauri command. The adapter supplies validated UUIDs and never accepts an
arbitrary event builder. Recheck active owner and current event ID immediately
before publish.

- [ ] **Step 5: Implement one-off claims and startup wiring**

Store UTC instants. The timer reads due rows, claims with an immediate
transaction, starts the fixed native manual brief, and records the returned run
ID. On startup, reconcile a claimed row against existing run history before any
retry.

- [ ] **Step 6: Run GREEN and commit**

Run:

```bash
. ./bin/activate-hermit
cargo test --manifest-path desktop/src-tauri/Cargo.toml workspace_actions::managed_checklist_tests -- --test-threads=1
cargo test --manifest-path desktop/src-tauri/Cargo.toml workspace_actions::one_off_schedule_tests -- --test-threads=1
cargo test --manifest-path desktop/src-tauri/Cargo.toml command_brief::scheduler_tests -- --test-threads=1
git add desktop/src-tauri/src/workspace_actions desktop/src-tauri/src/commands/canvas.rs desktop/src-tauri/src/startup.rs desktop/src-tauri/src/command_brief/scheduler.rs
git commit -m "feat(command-console): execute bounded workspace actions"
```

---

### Task 7: Add owner-locked approval commands, execution, and recovery

**Files:**
- Create: `desktop/src-tauri/src/workspace_actions/service.rs`
- Create: `desktop/src-tauri/src/workspace_actions/service_tests.rs`
- Create: `desktop/src-tauri/src/workspace_actions/recovery.rs`
- Create: `desktop/src-tauri/src/workspace_actions/recovery_tests.rs`
- Create: `desktop/src-tauri/src/commands/workspace_actions.rs`
- Create: `desktop/src-tauri/src/commands/workspace_actions_tests.rs`
- Modify: `desktop/src-tauri/src/commands/mod.rs`
- Modify: `desktop/src-tauri/src/lib.rs`
- Modify: `desktop/src-tauri/src/app_state.rs`

**Interfaces:**
- Consumes: active signing keys, latest published brief, store, adapters, and
  relay publisher.
- Produces Tauri commands:
  `list_workspace_actions`,
  `get_workspace_action`,
  `approve_workspace_action`,
  `reject_workspace_action`,
  `list_workspace_action_draft_handoffs`, and
  `ack_workspace_action_draft_handoff`.

- [ ] **Step 1: Write RED service and command tests**

Prove proposals are imported once from a signed completed/degraded version 2
brief by creating and durably appending one signed encrypted `proposed`
workspace-action event per typed proposal. Prove list/get are owner-confined,
legacy actions are visible but non-executable, renderer extra fields are
rejected, approval loads the native effect by action ID, approve/reject races
have one winner, owner switching between preview and approval fails, and status
transitions emit no sensitive content.

- [ ] **Step 2: Write RED crash-recovery tests**

Inject failures before effect, after effect/before receipt, after receipt/before
publish, and during relay reconnect. Prove recovery reuses the same idempotency
key, detects an existing effect, writes a missing receipt once, publishes the
exact signed event ID, and blocks ambiguous state for owner review.

- [ ] **Step 3: Observe RED**

Run:

```bash
. ./bin/activate-hermit
cargo test --manifest-path desktop/src-tauri/Cargo.toml workspace_actions::service_tests -- --test-threads=1
cargo test --manifest-path desktop/src-tauri/Cargo.toml workspace_actions::recovery_tests -- --test-threads=1
cargo test --manifest-path desktop/src-tauri/Cargo.toml commands::workspace_actions_tests -- --test-threads=1
```

Expected: services and commands are missing.

- [ ] **Step 4: Implement the approval service**

Approval input is exactly `{ actionId: string }`; rejection is
`{ actionId: string }`. Rationale/effect/owner/hash/adapter never come from the
renderer. Persist the signed approved transition, claim execution, invoke the
closed adapter, then persist the signed terminal transition.

- [ ] **Step 5: Wire startup recovery and publication**

Run reconciliation before enabling new approvals. Reuse the bounded
command-brief publication retry semantics while keeping action and brief queues
separate. Emit only action ID, closed state, update timestamp, and publication
state.

- [ ] **Step 6: Run GREEN and commit**

Run:

```bash
. ./bin/activate-hermit
cargo test --manifest-path desktop/src-tauri/Cargo.toml workspace_actions -- --test-threads=1
cargo test --manifest-path desktop/src-tauri/Cargo.toml commands::workspace_actions -- --test-threads=1
git add desktop/src-tauri/src/workspace_actions desktop/src-tauri/src/commands desktop/src-tauri/src/lib.rs desktop/src-tauri/src/app_state.rs
git commit -m "feat(command-console): enforce native action approvals"
```

---

### Task 8: Build the accessible action queue and exact-effect confirmation UI

**Files:**
- Create: `desktop/src/features/command-console/domain/workspaceActions.ts`
- Create: `desktop/src/features/command-console/domain/workspaceActions.test.mjs`
- Create: `desktop/src/features/command-console/hooks/useWorkspaceActions.ts`
- Create: `desktop/src/features/command-console/hooks/useWorkspaceActions.hook.test.mjs`
- Create: `desktop/src/features/command-console/ui/WorkspaceActionQueue.tsx`
- Create: `desktop/src/features/command-console/ui/WorkspaceActionQueue.test.mjs`
- Create: `desktop/src/features/command-console/ui/WorkspaceActionDialog.tsx`
- Modify: `desktop/src/features/command-console/ui/AdviserContributionCard.tsx`
- Modify: `desktop/src/features/command-console/ui/DailyCommandBrief.tsx`
- Modify: `desktop/src/features/command-console/ui/DailyCommandBrief.test.mjs`
- Modify: `desktop/src/features/command-console/hooks/useDailyCommandBrief.ts`
- Create: `desktop/src/shared/api/tauriWorkspaceActions.ts`

**Interfaces:**
- Consumes: renderer-safe native action summaries and Tauri commands from Task
  7.
- Produces: immutable action view parser, queue hook, exact-effect modal,
  per-action approve/reject controls, and draft-handoff import/ack.

- [ ] **Step 1: Write RED parser and hook tests**

Prove strict keys, closed states/effects/failure codes, legacy non-executable
rendering, owner-provided action ID opacity, event-driven refresh, mutation
serialization, draft handoff acknowledgement after persistence, and reset on
community switch.

- [ ] **Step 2: Write RED component tests**

Render real components. Prove before/after effect text, citations, snapshot,
freshness, stale/blocked/publication states, separate approve/reject, no bulk
control, focus trap/return, Escape cancellation, reduced motion, and
action-specific button labels. Opening a card, citation, or modal must not call
approval.

Name the break: adding an implicit approval handler or hiding the exact effect
must fail.

- [ ] **Step 3: Observe RED**

Run:

```bash
. ./bin/activate-hermit
pnpm --dir desktop exec node --import ./test-loader.mjs --experimental-strip-types --test src/features/command-console/domain/workspaceActions.test.mjs src/features/command-console/hooks/useWorkspaceActions.hook.test.mjs
pnpm --dir desktop exec node --import ./test-loader.mjs --experimental-strip-types --test src/features/command-console/ui/WorkspaceActionQueue.test.mjs
```

Expected: new modules do not exist.

- [ ] **Step 4: Implement the queue and modal**

Use stock rem text tokens, existing Card/AlertDialog/Button components, and no
colour-only state. The modal receives a frozen native view and submits only the
opaque action ID. Legacy proposals show `Historical proposal — no executable
effect`.

- [ ] **Step 5: Integrate draft handoffs and community reset**

After owner/community initialization, import native draft handoffs through the
real draft store and acknowledge each only after storage success. Add any new
module singleton reset to `resetCommunityState()`.

- [ ] **Step 6: Run GREEN and commit**

Run:

```bash
. ./bin/activate-hermit
pnpm --dir desktop test
just desktop-check
git add desktop/src/features/command-console desktop/src/features/messages/lib/useDrafts.ts desktop/src/features/communities/useCommunityInit.ts desktop/src/shared/api/tauriWorkspaceActions.ts
git commit -m "feat(command-console): add workspace action approvals"
```

---

### Task 9: Prove backup, E2E, acceptance-runner, and offline behavior

**Files:**
- Create: `scripts/check-workspace-actions.sh`
- Create: `scripts/tests/check-workspace-actions-test.sh`
- Modify: `scripts/lib/validate-command-brief-store.sh`
- Modify: `scripts/tests/local-workspace-backup-test.sh`
- Modify: `desktop/src/testing/e2eBridge.ts`
- Create: `desktop/tests/e2e/workspace-actions.spec.ts`
- Modify: `desktop/playwright.config.ts`
- Modify: `Justfile`

**Interfaces:**
- Consumes: all native and renderer Phase 5 interfaces.
- Produces: `just check-workspace-actions`, clean-profile store validation,
  and user-visible five-action E2E evidence.

- [ ] **Step 1: Write a failing acceptance-runner contract**

The shell contract must prove every filtered Rust command selects at least one
test, failures propagate, live claims are never printed by the hermetic path,
and Just invokes the script. Do not grep production source as acceptance.

- [ ] **Step 2: Extend backup/restore RED fixtures**

Add all five new tables and realistic signed-event metadata to the synthetic
database. Prove missing table/index, invalid lifecycle, duplicate idempotency,
plaintext proposal columns, and a succeeded action without a receipt are
rejected before restore mutation. Prove a clean restore does not reapply the
action or duplicate a one-off brief.

- [ ] **Step 3: Add RED E2E scenarios**

Through the real production parsers and mock Tauri boundary, prove:

- all five proposals render pending;
- no mutation occurs before approval;
- each modal exposes its exact effect and limitation;
- task/routing receipts appear once;
- canvas stale state does not overwrite;
- scheduled brief duplicates do not create two rows;
- approved draft appears in the normal composer but is never sent;
- rejection is terminal; and
- owner/community switching hides the prior queue.

- [ ] **Step 4: Observe RED**

Run:

```bash
. ./bin/activate-hermit
bash scripts/tests/check-workspace-actions-test.sh
bash scripts/tests/local-workspace-backup-test.sh
pnpm --dir desktop exec playwright test --project=smoke tests/e2e/workspace-actions.spec.ts
```

Expected: runner/fixtures/bridge behavior is absent.

- [ ] **Step 5: Implement runner, validation, bridge, and E2E wiring**

The runner executes non-empty core wire tests, relay policy tests, Tauri
contract/store/service/adapter/recovery tests, frontend tests, and backup
fixtures. Keep `check-workspace-actions` as an explicit Phase 5 gate rather
than adding it to `just ci`; the aggregate gate already runs its constituent
suites and duplicating them would add cost without new coverage. The existing
backup and restore scripts already snapshot and restore the whole
`command-brief/audit.db`, so only its validator and synthetic fixtures change.

- [ ] **Step 6: Run GREEN and commit**

Run:

```bash
. ./bin/activate-hermit
bash scripts/tests/check-workspace-actions-test.sh
just check-workspace-actions
bash scripts/tests/local-workspace-backup-test.sh
pnpm --dir desktop exec playwright test --project=smoke tests/e2e/workspace-actions.spec.ts
git add scripts Justfile desktop/src/testing/e2eBridge.ts desktop/tests/e2e/workspace-actions.spec.ts desktop/playwright.config.ts
git commit -m "test(command-console): prove workspace action gates"
```

---

### Task 10: Complete Phase 5 documentation, independent review, and gates

**Files:**
- Create: `docs/command-console/phase-5-workspace-actions.md`
- Create: `.superpowers/sdd/phase-5-workspace-actions-report.md`
- Modify: `docs/superpowers/specs/2026-07-25-hmas-supply-command-console-phase-5-workspace-actions-design.md`
- Modify: `docs/superpowers/plans/2026-07-26-hmas-supply-command-console-phase-5-workspace-actions.md`
- Modify: GitHub draft PR #5 body

**Interfaces:**
- Consumes: verified implementation and retained test evidence.
- Produces: operator/developer runbook, independent review record, final commit,
  pushed branch, updated draft PR, and Memory MCP checkpoint.

- [ ] **Step 1: Run focused final gates**

Run:

```bash
. ./bin/activate-hermit
just check-workspace-actions
just check-daily-command-brief
just check-command-knowledge
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer just apple-inputs-test
```

- [ ] **Step 2: Run aggregate gates**

Run:

```bash
. ./bin/activate-hermit
just ci
pnpm --dir desktop exec playwright test --project=smoke
```

Expected: zero failures. Record exact pass/skip/ignore counts and duration.

- [ ] **Step 3: Perform independent review**

Review the full diff from `1dbfdafb` against the approved design. Require
separate verdicts for:

- typed proposal trust boundary;
- owner/private relay behavior;
- approval/replay/concurrency state machine;
- adapter effect confinement;
- crash and restore idempotency;
- frontend no-implicit-approval behavior; and
- external-action prohibition.

Fix every Critical and Important finding with a new RED/GREEN cycle, then rerun
affected focused and aggregate gates.

- [ ] **Step 4: Write the runbook and acceptance report**

Document event kind/tags, state transitions, action adapters, legacy behavior,
offline/publication states, backup/restore, closed failure codes, operator
limitations, exact commands/results, and the continuing
`PHASE4-COMMISSION-001` boundary.

- [ ] **Step 5: Record high-value Memory MCP events**

Use `agent="CODEX"` and record:

1. final action architecture and event/store contracts;
2. review findings and their fixes, if any; and
3. exact final verification and remaining operational limitations.

Update the `buzz-ai` and `phase-5-workspace-actions` entities and link the phase
to its principal code modules.

- [ ] **Step 6: Commit, push, and update PR #5**

Run:

```bash
. ./bin/activate-hermit
git add docs/command-console/phase-5-workspace-actions.md .superpowers/sdd/phase-5-workspace-actions-report.md docs/superpowers/specs/2026-07-25-hmas-supply-command-console-phase-5-workspace-actions-design.md docs/superpowers/plans/2026-07-26-hmas-supply-command-console-phase-5-workspace-actions.md
git commit -m "docs(command-console): complete phase 5 workspace actions"
git push -u origin codex/phase-5-workspace-actions
```

Update draft PR #5 with exact verification and review evidence. Keep it stacked
on `codex/phase-4-daily-command-brief`; do not merge.

## Plan self-review record

- Spec coverage: Tasks 1-9 cover every approved workspace-action requirement;
  Task 10 covers review, evidence, Memory MCP, and publication.
- Scope: monthly reporting and long-range planning remain a separate Phase 5
  sub-project, as required by the approved design.
- Type consistency: `WorkspaceActionEffect`, `PendingProposalView`,
  `ApprovedWorkspaceAction`, and `WorkspaceActionReceipt` are introduced once
  and consumed by named later tasks.
- Placeholder scan: the plan contains no deferred implementation placeholder;
  `PHASE4-COMMISSION-001` is an explicit external commissioning boundary, not a
  Phase 5 code omission.
