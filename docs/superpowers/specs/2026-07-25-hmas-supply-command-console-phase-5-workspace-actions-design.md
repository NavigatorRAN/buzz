# HMAS Supply Command Console Phase 5 Workspace Actions Design

**Status:** Proposed for CO review

**Scope:** Approval-gated mutations inside the Buzz workspace. No external
system action, cloud processing of `OFFICIAL` material, or operational control.

## Outcome

Phase 5 turns the pending proposals already emitted by the Daily Command Brief
into an owner-controlled action queue. A proposal can be inspected, approved,
rejected, or allowed to become stale. Approval is a separate signed user event;
it is never inferred from generating, opening, or discussing a proposal.

The first Phase 5 sub-project builds this approval and execution substrate.
Monthly reporting and long-range planning will use the same substrate in a
second design and implementation plan after the gate has passed its recovery
and replay tests. This decomposition keeps action safety independently
reviewable from the larger reporting workflows.

## Constraints inherited from the approved programme

- `OFFICIAL` remains the default and never falls back to cloud processing.
- Only artefacts already classified `PUBLIC` may use the later cloud lane.
- The system remains advisory and does not make navigation or command decisions.
- Actions are limited to the Buzz workspace.
- No ship-control, navigation-control, communications, combat, logistics,
  personnel, Apple productivity write, or other external operational action is
  introduced.
- A prompt, persona, retrieved document, adviser output, or model tool call
  cannot approve or execute an action.
- Every accepted mutation is attributable to the active owner and preserved in
  the signed Buzz history.
- `PHASE4-COMMISSION-001` remains independent; Phase 5 does not convert fixture
  acceptance into live operational proof.

## Approaches considered

### Recommended: Command Console native action ledger

Add an owner-encrypted signed action event and a native Rust approval/execution
state machine next to the existing command-brief store. Each supported action
uses a small adapter that revalidates its target and applies one idempotent Buzz
workspace mutation.

This gives the application one auditable boundary for approval, replay
protection, crash recovery, and owner switching. It also permits action types to
be added without granting general-purpose model access to Tauri commands.

### Reuse Buzz workflow approvals

The existing workflow approval UI and relay handlers are not a safe foundation
for this phase. `crates/buzz-workflow/src/lib.rs` explicitly marks approval
gates as not implemented (`WF-08`) and fails runs that reach one. Reusing the
surface would imply a wire-live guarantee that the executor does not provide.

### Frontend confirmation followed by existing Tauri commands

A React confirmation dialog could call `set_canvas`, message, or schedule
commands directly. This is rejected because a renderer compromise, duplicate
click, restart, or forged invoke could bypass durable approval semantics, and
there would be no atomic link between the approval and resulting mutation.

## Trust boundary

The model may create only an untrusted `pending` proposal. Native Rust:

1. parses it against a closed action schema;
2. binds it to the originating brief, source ledger, owner, classification,
   and immutable payload hash;
3. persists and signs the proposed state;
4. presents an exact effect preview to the active owner;
5. accepts an explicit approve or reject gesture through an owner-locked Tauri
   command;
6. revalidates the target immediately before execution;
7. applies one allowlisted adapter with an idempotency marker; and
8. persists a signed terminal receipt or a bounded failure/stale record.

The renderer cannot supply owner identity, approval state, payload hash,
execution adapter, target revision, or idempotency key. Those values are loaded
or derived in Rust.

## Contract evolution

Phase 4 brief history remains readable. Existing version 1 proposals contain
only display text and therefore remain permanently non-executable with the
status `legacy_untyped`.

Newly generated briefs use a version 2 typed proposal contract. A specialist
may return only:

- a bounded proposal key unique within its contribution;
- one closed action type and its exact typed effect;
- rationale and source-ledger IDs;
- an expected target revision where the action has a mutable target; and
- literal approval state `pending`.

Rust validates the effect and citations, then derives the durable action ID
from the run ID, adviser, proposal key, and canonical effect hash. Model output
cannot choose a cross-run action ID or collide with an existing proposal.
TypeScript receives the validated Rust representation; its parser remains a
renderer guard rather than the security boundary.

The command-brief reader accepts versions 1 and 2, while the Phase 5 generator
emits only version 2. A version 1 artefact is never upgraded in place.

## Closed action set

Phase 5 supports the five existing `ProposedWorkspaceAction` variants. Each
variant has a fixed effect; unsupported or malformed variants remain pending
with a non-sensitive diagnostic and cannot be approved.

### Task

A task becomes an owner-visible Command Console task record stored as a signed
Buzz workspace event. It contains a title, required due time, source brief,
status, and immutable task ID. It does not create an Apple Reminder or call an
external task system.

### Canvas checklist update

The proposal names one channel canvas, checklist, item, desired completion
state, and expected canvas event ID. Approval applies a single structured
checklist transition only if the current canvas revision still equals the
previewed revision. A changed or deleted canvas makes the proposal `stale`;
there is no blind overwrite or automatic merge.

Only a Phase 5 managed checklist block with stable checklist and item IDs is
mutable through this adapter. The block uses a versioned canonical encoding
inside the canvas; surrounding free-form Markdown is preserved byte-for-byte.
An unstructured Markdown checkbox that merely looks similar is not an
actionable target.

### Scheduled brief

The proposal creates one future Daily Command Brief request identified by
`briefId` and `scheduledFor`. It is separate from the recurring 0600 schedule.
Approval validates the RFC 3339 instant, requires it to be in the future and
within 90 days, and writes one idempotent native schedule claim. It cannot
change classification, timezone, recurring catch-up policy, or concurrency.

### Draft message

Approval creates or updates an owner-local Buzz draft for the named channel.
It never sends or schedules the message. The normal composer remains the only
place from which the owner can send it.

### Routing action

Approval records an internal assignment of a proposal to one of the six
Command Console advisers and one existing Buzz destination. It does not invoke
the adviser, create an external notification, or transmit content outside the
workspace.

## Signed event and local store

Introduce a regular stored kind adjacent to the command-brief kind for
owner-authored workspace action lifecycle events. The payload is NIP-44
encrypted to self, signed by the active owner, and carries only an owner `p`
tag plus bounded routing tags. Relay read, count, ID lookup, search, and ingest
must enforce the same owner-only rules as command briefs.

The encrypted payload contains:

- schema version, classification, action ID, action type, and payload hash;
- source brief run ID and lifecycle event ID;
- source ledger IDs required to understand the rationale;
- lifecycle state and predecessor event ID;
- proposed effect and expected target revision;
- approval or rejection timestamp and owner identity where applicable;
- execution attempt number; and
- a bounded receipt containing the resulting Buzz event/revision ID or a closed
  failure code.

The post-signing action event ID is kept outside its own plaintext, following
the command-brief anti-self-reference pattern.

The local SQLite store is the immediate authority for queue state and recovery.
It stores encrypted proposal material, immutable hashes, state transitions,
outbox rows, execution claims, and exact event IDs. Sensitive content never
appears in public tags or plaintext diagnostics.

## State machine

Valid transitions are:

```text
proposed -> approved -> executing -> succeeded
         -> rejected
         -> stale

approved  -> stale
executing -> failed_retryable -> executing
executing -> stale
executing -> failed_terminal
```

- Only `proposed` may be approved or rejected.
- Approval and rejection use compare-and-set and are single-use.
- `approved` does not imply the effect occurred.
- One durable execution claim owns an attempt.
- Recovery may retry only `failed_retryable` with the same idempotency key.
- A target revision mismatch produces `stale`, not a retry.
- Owner switch, classification mismatch, payload-hash mismatch, expired active
  identity, or missing source brief fails closed.
- A terminal receipt is immutable. A correction creates a new proposal.

## Approval interaction

The Command Console shows a queue grouped by source brief. Opening one proposal
shows:

- exact proposed effect and target;
- before/after preview;
- rationale and adviser;
- source citations, snapshot, and freshness;
- target revision and staleness state;
- explicit statement of what the action cannot do; and
- separate `Approve` and `Reject` controls.

There is no bulk approval in the first release. Approval requires a fresh modal
with the action-specific effect, active owner identity, and an unambiguous
button label such as `Approve draft creation`. Keyboard, screen-reader,
reduced-motion, narrow-width, and focus-return behavior match the existing
Command Console requirements.

Generating a brief, clicking a citation, opening the proposal, pressing Enter
outside the confirmation control, or approving a different proposal has no
mutation effect.

## Execution adapters

Adapters receive only a native `ApprovedWorkspaceAction` and return a bounded
`WorkspaceActionReceipt`. They do not accept model text or arbitrary command
names.

Each adapter:

- checks the active owner immediately before mutation;
- validates the immutable proposal hash;
- loads the current target and compares its expected revision;
- applies exactly one supported effect;
- includes the action idempotency marker in the resulting Buzz record where
  the target format permits;
- detects an already-applied effect during recovery; and
- returns only closed failure codes to the UI and audit payload.

Direct existing mutation commands remain available to their normal UI, but the
Command Console never calls them from JavaScript as a substitute for the native
adapter boundary.

## Offline and relay behavior

Approval and local effects work while the relay is unavailable when the target
is locally authoritative. Signed lifecycle events enter the existing exact-ID
outbox and publish after reconnect. Relay rejection cannot roll back an
already-applied local effect; it remains visibly `publication_pending` until
the exact signed event is accepted or a terminal policy rejection is recorded.

Actions that require a current relay-owned target cannot execute offline. They
remain approved but blocked with a truthful reason and are revalidated before
the first later attempt.

## Failure and recovery

Startup reconciliation inspects non-terminal claims before enabling new
execution:

- no target effect and no receipt: retry with the same idempotency key;
- target effect exists and matches the immutable proposal: write the missing
  receipt without applying again;
- target changed incompatibly: mark stale or terminal failure;
- ambiguous target state: block and require owner review.

Backup and restore include the action ledger, outbox, idempotency markers, and
signed event IDs. A clean-profile restore must prove that an approved or
succeeded action is not applied a second time.

## Security and negative requirements

- No action adapter accepts a URL, executable, shell command, Apple write,
  webhook, cloud provider, arbitrary Tauri command, or arbitrary Nostr kind.
- Approval events from another owner, agent, channel member, or stale identity
  are rejected.
- Retrieved prompt injection cannot alter action type, target, effect, hash,
  approval state, adapter, or failure policy.
- `OFFICIAL` proposal or receipt content cannot enter logs, telemetry, public
  tags, crash metadata, or cloud calls.
- Draft-message approval never sends.
- Navigation adviser proposals cannot create executable navigation orders.

## Verification

Acceptance requires:

- strict wire and hash tests for every action variant and unknown-field case;
- owner-only event encryption, ingest, REQ, COUNT, ID, and search tests;
- forged approval, agent approval, owner-switch, replay, duplicate click, and
  concurrent approve/reject tests;
- stale target and compare-and-set tests for canvas mutations plus duplicate,
  past-time, and over-90-day one-off brief scheduling tests;
- crash tests before mutation, after mutation/before receipt, and during relay
  publication;
- exact idempotency and clean-profile backup/restore tests;
- offline relay tests with truthful blocked versus locally-applied states;
- UI tests for exact effect preview, individual approval/rejection, focus,
  keyboard, screen reader, reduced motion, and no implicit approval;
- E2E proof that all five action types stay pending before approval and that
  each approved adapter performs only its declared Buzz effect;
- mutation tests showing removal of the owner/hash/revision gates makes the
  negative tests fail;
- upstream `just ci`, full desktop smoke, and independent review before push.

## Follow-on Phase 5 sub-project

After this substrate is approved, monthly reporting and long-range planning
receive their own design and implementation plan. They will create signed,
source-linked draft artefacts and pending workspace proposals through this
ledger. They will not receive separate execution privileges or bypass the
per-action approval UI.
