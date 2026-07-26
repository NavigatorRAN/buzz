# HMAS Supply Command Console Phase 6 Assurance Design

**Status:** Approved for implementation
**Date:** 2026-07-26
**Buzz base:** accepted Phase 4 commit `1dbfdafbc67f4fed5a8f439577810b7235836d1b`
**Explicit exclusion:** parked Phase 5 workspace actions

## Purpose

Phase 6 turns the accepted, hermetically tested Daily Command Brief into a
commissionable local macOS capability. It adds the missing operational proof
around the signed application, LM Studio, Memory MCP, RAG MCP, local
persistence, offline egress, recovery, and resource use.

This phase does not relax the system's advisory or information-handling
boundaries. It does not make navigational decisions, generate executable
navigation orders, connect to ship systems, or accredit the application for
Defence use. The corpus must remain non-classified until the applicable
information-handling review is complete.

Phase 5 is intentionally absent. No Phase 5 workspace-action code, approval
state, or unaccepted workflow mutation is available to the Phase 6 application.

## Completion model

Phase 6 has two distinct completion states:

1. **Repository assurance complete:** all code, tests, operator tooling,
   packages, and runbooks are reviewed and green in disposable environments.
2. **MacBook commissioning complete:** the signed and notarized app has passed
   the controlled live exercise with the selected local model, reviewed local
   Memory and RAG services, approved corpus and golden queries, Apple privacy
   grants, offline containment, recovery, and retained evidence.

Repository assurance can be completed without inventing operator inputs.
MacBook commissioning remains explicitly blocked if any signing identity,
notarization credential, approved corpus, golden navigation case, home
replication credential, Apple allowlist/grant, or privileged offline-test
participation is unavailable. A blocked live gate is an honest outcome, not a
test failure and not permission to substitute a fixture.

## Repository boundaries

### Buzz

Buzz owns:

- the signed macOS application and its app-owned commissioning control plane;
- one-time authorization of a commissioning run;
- invocation of the real Phase 4 orchestration path;
- content-free signed commissioning receipts and the local evidence ledger;
- protected SecretStore provisioning and diagnostics;
- disposable local Compose namespaces, backup, restore, and recovery checks;
- the integrated live commissioning runner and operator runbook.

The Phase 6 Buzz branch is based directly on accepted Phase 4. The parked
Phase 5 branch is not an ancestor.

### Memory MCP

Memory MCP owns:

- the immutable CPython 3.12 service image;
- frozen, hash-verified runtime dependencies;
- non-root execution, read-only root filesystem compatibility, health checks,
  and bounded persistent volumes;
- replication/readiness behavior already established in Phase 3;
- an appliance manifest that binds source revision, runtime, dependencies, and
  image identity.

The Phase 6 Memory branch is based on the accepted Phase 3 replication branch.
The existing incomplete Phase 4 appliance branch contributes no production
code and is superseded by this work.

### RAG MCP

RAG MCP owns:

- export of a complete signed offline snapshot bundle;
- staged validation and atomic activation;
- exact rollback to the previous active snapshot;
- backup and restore of the active, previous, and staged state;
- golden-query execution and machine-readable comparison reports;
- an operator CLI that exposes these actions without bypassing validation;
- an appliance manifest binding Qdrant, dense, sparse, reranker, schema,
  service, and signed logical catalogue identities.

The Phase 6 RAG branch is based on the latest reviewed Phase 4 logical
catalogue branch so the existing signed-snapshot contract is preserved.

## App-owned commissioning control plane

### Why the app owns the boundary

A shell driver calling internal Tauri commands would prove only that test code
can invoke Rust functions. The live exercise must traverse the packaged
application boundary and use the same owner identity, SecretStore, source
catalogue, orchestrator, spool, and relay publisher as a manual Command Console
run.

The packaged app therefore exposes a narrow Unix-domain commissioning socket
only while explicitly started in commissioning mode.

### Socket and filesystem rules

- The socket lives below the app's private Application Support directory.
- The parent directory is mode `0700`; the socket is mode `0600`.
- The server rejects non-regular token or configuration files, symlinks, paths
  outside the private directory, wrong ownership, and group/world permissions.
- On macOS the server verifies the connecting peer belongs to the current UID.
- The socket is absent during normal application operation.
- Requests and responses are bounded, newline-delimited JSON with closed
  schemas and size limits.
- The socket exposes no general command execution, file read, secret read,
  model prompt, or arbitrary Tauri invocation.

### One-time authorization

The operator asks the running app to create a commissioning challenge. The app
generates a cryptographically random 256-bit token, stores only its digest in
memory, and writes the token once to a protected mode-`0600` regular file in
the private directory. The runner opens the file without following symlinks,
validates owner and mode, reads it once, and removes it.

The first authenticated request consumes the in-memory challenge regardless of
success. Replay, expiry, wrong token, wrong UID, malformed input, or a second
request fails closed. A new attempt requires a new challenge from the app.

### Closed operations

The initial protocol supports only:

- `status`: returns versioned, content-free commissioning readiness;
- `run_daily_command_brief_acceptance`: starts exactly one bounded manual
  acceptance run with a fixed inert request identifier;
- `cancel`: requests cancellation of that exact run;
- `receipt`: returns the content-free terminal receipt for that exact run.

No prompt or operational content crosses the socket. The app constructs the
fixed acceptance intent internally. Real source content remains inside the
existing Phase 4 evidence and model boundaries.

## Evidence and receipt contract

### Content-free evidence

The commissioning ledger may contain:

- run and receipt identifiers;
- UTC timestamps and durations;
- app bundle identifier, semantic version, source revision, executable hash,
  code-signing status, signing team identifier, notarization assessment, and
  hardened-runtime status;
- selected model identifier and LM Studio version;
- admitted endpoint origins and service/snapshot identifiers;
- structured tool-call names, counts, adviser identity, and success/failure
  codes;
- specialist and Chief of Staff execution counts;
- source counts, snapshot equality, stale/conflict/degraded counts, but no
  source text;
- signed lifecycle event ID, publication state, spool state, restart-reload
  equality, and history-visible equality;
- network-containment observations;
- backup/restore identifiers and equality checks;
- peak duration, memory, disk, and thermal observations;
- named acceptance checks with pass, fail, blocked, or not-run state.

It must not contain prompts, adviser prose, retrieved passages, Notes,
Calendar or Reminder text, private keys, bearer tokens, authorization headers,
environment dumps, home paths containing user data, or decrypted Buzz events.

### Signing

The app canonicalizes the receipt and signs it with the unlocked Buzz owner
identity. The receipt includes the owner public key and signature but never the
private key. A standalone verifier recomputes the digest, validates the
signature, checks the closed schema, and confirms that no prohibited
content-bearing fields exist.

The receipt signature proves which Buzz owner accepted the result. macOS
`codesign`, Gatekeeper, and notarization evidence separately prove which app
binary executed it. Both are required for final live acceptance.

### Evidence states

Every check has one of four states:

- `passed`: directly observed and retained;
- `failed`: directly observed and did not satisfy the contract;
- `blocked`: a named prerequisite was unavailable;
- `not_run`: the operator did not authorize or reach the exercise.

The aggregate passes only if every required check is `passed`. `blocked` never
collapses into `passed`.

## Live Daily Command Brief proof

The app-owned live run must prove all of the following in one evidence-linked
exercise:

1. The selected LM Studio model answered through literal IPv4 loopback.
2. Memory and RAG were admitted through their protected, literal-loopback MCP
   bindings.
3. At least one real structured Memory call and one real structured RAG call
   completed; reasoning-text pseudo-calls did not count.
4. Each of the five specialist advisers ran exactly once against the same
   frozen source snapshot.
5. Specialist concurrency never exceeded the configured value of one or two.
6. The Chief of Staff ran exactly once after the specialists and received zero
   tools.
7. The result satisfied the Phase 4 structured contract and retained dissent,
   limitations, freshness, and missing-source signals.
8. The owner signed and encrypted one exact terminal lifecycle event, committed
   it to the local spool before publication, and retained its event ID.
9. A forced publication interruption retained the exact signed event for
   idempotent replay rather than creating a replacement.
10. App restart reloaded the same terminal result and event ID into history.

The acceptance intent is deliberately inert and non-operational. It asks the
team to describe source availability and limitations for a fixed commissioning
scenario; it does not request a route, order, task, message, or decision.

## Offline and egress assurance

There are two layers:

### Application observation

The app records the literal-loopback provider and MCP origins actually admitted
for the run. Its egress guard rejects cloud routes, proxies, redirects, remote
relay selection, telemetry hooks, update traffic, and non-loopback tools for
the OFFICIAL acceptance run.

### Host observation

The operator-controlled test temporarily denies non-loopback outbound traffic
for the packaged app and local supporting processes while preserving local
loopback. It then:

- restarts the local stack;
- runs the complete acceptance brief;
- searches RAG;
- reads and writes local Memory;
- reloads Buzz history;
- records attempted connections and confirms no prohibited egress succeeded.

Because host firewall changes require local privilege and can disrupt access,
the tooling only generates a bounded plan, verifies prerequisites, and runs a
harmless canary until the local operator explicitly authorizes the privileged
step. It includes an automatic timeout and rollback command. It never changes
shared LAN infrastructure.

## Disposable local stack

All Compose services, networks, volumes, container names, ports, configuration
paths, and backup targets used by commissioning are parameterized by an
explicit project identifier. No hard-coded `buzz-*` volume or container name
may cause a clean-profile test to read or mutate the developer stack.

The disposable stack contract:

- derives names from a validated bounded project identifier;
- allocates or accepts explicit loopback host ports;
- uses a private configuration and Application Support root;
- uses dedicated Memory, Postgres, Redis, MinIO, and relay state;
- proves teardown removes only the disposable namespace;
- leaves the developer and accepted Phase 4 state unchanged.

Backup and restore take the same explicit stack identity. Restore refuses
cross-project archives, unknown writers, unvalidated archives, symlinks,
permission drift, and insufficient free space.

The Phase 4 assurance gate must create required ignored sidecar stubs itself
and must reject an interactive terminal for destructive negative fixtures, so
a fresh worktree cannot hang or fail before testing product code.

## Trusted SecretStore provisioning

Phase 6 adds a native provisioning path instead of asking operators to edit the
shared Keychain JSON blob.

- Import accepts a closed schema of known Command Console secret identifiers.
- Values enter through an app-owned prompt or protected input file, never
  command-line arguments or normal environment variables.
- The app merges through `SecretStore`'s locked read-modify-write path so
  existing identity and agent keys are preserved.
- Unknown keys, empty values, control characters, duplicate logical
  credentials, symlinks, weak file modes, and wrong ownership are rejected.
- Output lists only key names, availability, and a receipt digest.
- Rotation writes the new value atomically and invalidates cached service
  bindings.
- Diagnostics prove presence and service admission without returning values.
- Test stores use unique development service names and never touch the
  production `buzz-desktop` Keychain item.

## Memory MCP appliance

The reviewed image:

- uses an immutable CPython `3.12.x` base pinned by digest;
- installs dependencies from a hash-locked file;
- includes only the server package and required runtime files;
- runs as a fixed non-root UID/GID;
- supports a read-only root filesystem, `no-new-privileges`, dropped
  capabilities, and a bounded writable data volume;
- exposes only the configured loopback-published service port;
- has a readiness check that authenticates and verifies the expected node ID;
- emits a content-free build manifest with source revision, Python version,
  dependency lock digest, and OCI image digest;
- proves backup/restore and restart on a disposable volume.

Buzz Compose references a reviewed immutable image digest for commissioning.
The mutable `memory-mcp:local` default remains development-only and cannot pass
the production admission check.

## RAG lifecycle CLI

The CLI is closed to the following subcommands:

- `export`: create a complete signed bundle from the authoritative service;
- `stage`: import into a new staging root without changing the active pointer;
- `validate`: verify signatures, hashes, schema, counts, model identities,
  service revision, free space, and golden queries;
- `activate`: atomically switch a fully validated staging root to active;
- `rollback`: atomically restore the retained previous activation;
- `status`: emit a content-free active/previous/staged summary;
- `backup`: produce an encrypted, checksummed operational backup;
- `restore`: validate and stage a backup before explicit activation.

Every mutating command supports a dry run. Activation, rollback, and restore
require an exact manifest hash confirmation and hold an exclusive lifecycle
lock. Interrupted operations are resumable or recover to the last complete
active pointer. The CLI never deletes the prior valid snapshot automatically.

The signed bundle includes Qdrant data, catalogue and document metadata,
collection schemas and counts, RAG source revision, service configuration,
dense encoder, sparse-search, reranker, tokenizer/configuration assets, hashes,
and snapshot timestamp. Validation rejects missing model assets or provenance
even when Qdrant itself opens successfully.

## Apple input commissioning

The signed EventKit/Notes helper remains read-only. Phase 6 adds:

- protected allowlist provisioning with canonical paths and stable Calendar,
  Reminder, and Notes identifiers;
- a startup permission canary for each selected source;
- a signed-app test matrix for granted, denied, stale, recurring, deleted, and
  empty data;
- fail-soft evidence showing only source type, counts, freshness, and status.

Tests cannot grant macOS privacy consent. Final commissioning requires the
operator to grant access to the signed app and inspect the visible macOS
privacy state.

## Signing, notarization, and packaging

The Phase 6 release candidate is built from a clean checkout with:

- the expected bundle identifier and version;
- hardened runtime and the minimum entitlements;
- the read-only Apple helper embedded and signed by the same team;
- no debug control socket unless commissioning mode is explicitly selected;
- reproducible source revision and dependency manifests;
- Developer ID signing, notarization, stapling, Gatekeeper assessment, and
  post-install hash capture.

Credentials stay in Keychain or the existing release secret path. Logs and
receipts retain identities and result codes only.

## Test strategy

### Per-repository hermetic gates

- Tests are written before production changes.
- Memory and RAG use local fake data and disposable directories/volumes.
- Buzz uses fake loopback LM Studio, Memory, RAG, relay, and Unix peers for
  protocol tests, then the existing Phase 4 suites.
- Negative tests cover replay, wrong UID, wrong mode, symlink swaps, oversized
  frames, stale challenges, malformed receipts, signature mismatch, content
  leakage, wrong snapshot, wrong project, interrupted activation, insufficient
  space, and restore rollback.

### Integrated repository gate

The integrated gate builds the app and reviewed appliances, creates a
disposable stack, provisions test-only secrets, runs a fully structured fake
brief, verifies the signed receipt, backs up and restores, and tears down only
its namespace. It runs non-interactively.

### Live gate

The live gate uses the signed release candidate, real selected local model,
reviewed local services, approved data, and operator-controlled containment.
It never substitutes fixtures for a missing live prerequisite.

### Required regression gates

- Buzz: Phase 4 Daily Command Brief gate plus `just ci`.
- Memory MCP: full Python server suite and appliance smoke/restore tests.
- RAG MCP: full Python suite, signed snapshot lifecycle tests, and reviewed
  golden-query set.
- macOS: native Rust tests, Apple helper tests, packaged-app launch, signing,
  notarization, Gatekeeper, restart, and history reload.

## Review and delivery

Each repository gets a dedicated `codex/phase-6-*` branch and draft pull
request based on its accepted prerequisite branch. Commits are pushed only
after their scoped gates pass. Cross-repository commit and image identities are
recorded in a Phase 6 dependency manifest in Buzz.

Implementation is reviewed at four boundaries:

1. protocol and threat-model review;
2. per-repository implementation review;
3. integrated failure/recovery review;
4. final independent acceptance review.

High-value decisions, verified endpoints, test evidence, blockers, and gotchas
are recorded in Memory MCP with agent `CODEX`.

## Explicit non-goals

- No Phase 5 workspace actions.
- No external-system writes.
- No cloud fallback for OFFICIAL work.
- No route generation, navigation order, or ship-control integration.
- No automatic macOS privacy approval.
- No automatic privileged firewall change.
- No claim of Defence accreditation.
- No real classified or operationally sensitive corpus before approval.
