# HMAS Supply Command Console Phase 6 Buzz Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the app-owned, signed, content-free commissioning boundary and a disposable integrated assurance gate for the accepted Phase 4 Daily Command Brief.

**Architecture:** A small native Rust commissioning module owns a Unix-domain control socket, one-use challenge, closed protocol, evidence ledger, and owner-signed receipt. Existing Phase 4 orchestration remains the sole brief implementation; shell tooling only provisions a disposable stack, connects to the app boundary, and verifies retained content-free evidence.

**Tech Stack:** Rust/Tokio/Tauri 2, Nostr owner signatures, SQLite/JSON, Bash, Docker Compose, macOS codesign and spctl.

## Global Constraints

- Base is accepted Phase 4 commit `1dbfdafbc67f4fed5a8f439577810b7235836d1b`; Phase 5 must not be an ancestor.
- Every commissioning brief is `OFFICIAL`, literal-loopback only, with no cloud fallback.
- No request, response, receipt, log, or test artifact may contain prompts, adviser prose, source passages, private keys, bearer tokens, authorization headers, or decrypted Buzz events.
- The normal application exposes no commissioning socket; it exists only in explicit commissioning mode.
- The one-use challenge is 256 random bits, expires, and is consumed by the first authenticated request regardless of outcome.
- Socket parent mode is `0700`, socket/token files are `0600`, symlinks and wrong owners are rejected, frames are bounded, and the connecting macOS UID must match.
- The only protocol operations are `status`, `run_daily_command_brief_acceptance`, `cancel`, and `receipt`.
- The receipt is canonical, content-free, signed by the unlocked Buzz owner, and separately bound to macOS codesign/notarization evidence.
- No Phase 5 workspace action, external-system write, route, navigation order, automatic privacy grant, automatic firewall change, or accreditation claim.
- Rust production paths add no `unwrap()` or `expect()`, use no new `unsafe`, and new public APIs have doc comments.
- All tests are non-interactive and use test-only SecretStore services, disposable roots, and literal-loopback fakes.

---

### Task 1: Fresh-worktree and disposable stack boundary

**Files:**
- Modify: `Justfile`
- Modify: `docker-compose.yml`
- Modify: `scripts/check-daily-command-brief.sh`
- Modify: `scripts/lib/local-workspace-backup.sh`
- Modify: `scripts/backup-local-workspace.sh`
- Modify: `scripts/restore-local-workspace.sh`
- Create: `scripts/lib/command-console-project.sh`
- Create: `scripts/tests/command-console-project-test.sh`
- Modify: `scripts/tests/check-daily-command-brief-test.sh`
- Modify: `scripts/tests/local-workspace-backup-test.sh`

**Interfaces:**
- Produces: `command_console_project_id`, `command_console_compose`, `command_console_volume`, and `command_console_require_noninteractive` shell functions.
- Produces: environment contract `BUZZ_COMMAND_PROJECT`, `BUZZ_COMMAND_STATE_ROOT`, `BUZZ_COMMAND_*_PORT`, and `BUZZ_COMPOSE`.
- Consumes: existing backup/restore timeouts and exact-schema validation.

- [ ] **Step 1: Write failing namespace and non-interactive tests**

Add cases proving:

```bash
BUZZ_COMMAND_PROJECT=commission-a command_console_volume memory-vault
# prints commission-a-memory-vault

BUZZ_COMMAND_PROJECT='../../shared' command_console_project_id
# exits 64 without invoking docker

DAILY_BRIEF_FORCE_TTY=true scripts/check-daily-command-brief.sh
# exits 64 before backup/restore fixtures
```

Also prove two project IDs produce disjoint container, network, volume, port,
state-root, and archive identities, and teardown commands contain only the
selected project.

- [ ] **Step 2: Run the focused tests and verify failure**

Run:

```bash
bash scripts/tests/command-console-project-test.sh
bash scripts/tests/check-daily-command-brief-test.sh
bash scripts/tests/local-workspace-backup-test.sh
```

Expected: new assertions fail because the project helper and non-interactive
guard do not exist.

- [ ] **Step 3: Implement the closed project helper and Compose parameters**

Use a project grammar of `^[a-z][a-z0-9-]{2,31}$`. Build every Compose command
through:

```bash
command_console_compose() {
  command docker compose --project-name "$(command_console_project_id)" "$@"
}
```

Remove fixed `container_name` and `name` values from commissioning services and
volumes. Preserve developer defaults by deriving them from
`BUZZ_COMMAND_PROJECT=buzz`. Pass the selected project into backup manifests
and reject a restore whose manifest project differs.

Make `check-daily-command-brief.sh` run `just _ensure-sidecar-stubs` before Rust
selection and reject interactive execution before destructive negative
fixtures.

- [ ] **Step 4: Run focused and Phase 4 gates**

Run:

```bash
bash scripts/tests/command-console-project-test.sh
bash scripts/tests/check-daily-command-brief-test.sh
bash scripts/tests/local-workspace-backup-test.sh
just check-daily-command-brief
```

Expected: all pass non-interactively.

- [ ] **Step 5: Commit**

```bash
git add Justfile docker-compose.yml scripts
git commit -m "feat(command-console): isolate commissioning stacks"
```

### Task 2: Trusted SecretStore provisioning

**Files:**
- Create: `desktop/src-tauri/src/command_services/provisioning.rs`
- Create: `desktop/src-tauri/src/command_services/provisioning_tests.rs`
- Modify: `desktop/src-tauri/src/command_services/mod.rs`
- Modify: `desktop/src-tauri/src/secret_store.rs`
- Create: `desktop/src-tauri/src/commands/command_provisioning.rs`
- Modify: `desktop/src-tauri/src/commands/mod.rs`
- Modify: `desktop/src-tauri/src/lib.rs`

**Interfaces:**
- Produces: `ProvisioningBundleV1`, `ProvisioningReceiptV1`, `validate_protected_bundle`, and `merge_command_secrets`.
- Consumes: `SecretStore::shared("buzz-desktop")` and its locked read-modify-write path.
- Accepted logical keys: `memory.local.read`, `memory.local.attestation`, `memory.local.replicate`, `memory.remote.read`, `memory.remote.replicate`, `rag.local.read`, `rag.local.attestation`, and `lmstudio.local.api`.

- [ ] **Step 1: Write failing Rust tests**

Tests must construct a test-only `SecretStore` backend and prove:

```rust
let receipt = merge_command_secrets(&store, bundle)?;
assert_eq!(receipt.imported_keys(), &["memory.local.read", "rag.local.read"]);
assert_eq!(store.get("existing.identity")?, Some("preserved".into()));
assert!(!serde_json::to_string(&receipt)?.contains("token-value"));
```

Add failures for unknown/duplicate keys, empty/control-character values,
symlinked files, owner mismatch, mode other than `0600`, oversized input, and
attempts to use service `buzz-desktop` in tests.

- [ ] **Step 2: Run the selected tests and verify failure**

Run:

```bash
cargo test --manifest-path desktop/src-tauri/Cargo.toml provisioning_tests -- --test-threads=1
```

Expected: compilation fails because the provisioning module is absent.

- [ ] **Step 3: Implement protected bundle parsing and atomic merge**

Define a closed JSON schema:

```rust
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ProvisioningBundleV1 {
    format: ProvisioningFormat,
    secrets: BTreeMap<CommandSecretId, SecretString>,
}
```

Open the file with `O_NOFOLLOW`, validate regular-file metadata, current UID,
mode `0600`, maximum 64 KiB, and exact key vocabulary. Merge all values in one
locked SecretStore mutation and return only sorted key names plus the canonical
receipt digest.

- [ ] **Step 4: Expose only the native app-owned import command**

The Tauri command accepts a selected file path, requires the active owner, and
returns `ProvisioningReceiptV1`. It accepts no secret values from renderer
arguments and emits no values in errors.

- [ ] **Step 5: Run focused and native regression tests**

Run:

```bash
cargo test --manifest-path desktop/src-tauri/Cargo.toml provisioning_tests -- --test-threads=1
cargo test --manifest-path desktop/src-tauri/Cargo.toml command_services -- --test-threads=1
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add desktop/src-tauri/src
git commit -m "feat(command-console): provision protected local secrets"
```

### Task 3: Commissioning protocol, challenge, ledger, and receipt

**Files:**
- Create: `desktop/src-tauri/src/commissioning/mod.rs`
- Create: `desktop/src-tauri/src/commissioning/protocol.rs`
- Create: `desktop/src-tauri/src/commissioning/challenge.rs`
- Create: `desktop/src-tauri/src/commissioning/evidence.rs`
- Create: `desktop/src-tauri/src/commissioning/receipt.rs`
- Create: `desktop/src-tauri/src/commissioning/tests.rs`
- Modify: `desktop/src-tauri/src/lib.rs`
- Modify: `desktop/src-tauri/Cargo.toml`

**Interfaces:**
- Produces: `CommissioningServer::start`, `CommissioningRequestV1`, `CommissioningResponseV1`, `CommissioningEvidenceV1`, `CommissioningReceiptV1`, and `verify_receipt`.
- Consumes: `nostr::Keys` for canonical Schnorr signatures and the current app UID.
- Maximum frame: 16 KiB. Challenge lifetime: 5 minutes. One active run.

- [ ] **Step 1: Write failing protocol and security tests**

Use a temporary mode-`0700` root and real Unix sockets. Cover exact closed JSON,
16 KiB limit, token entropy/length, five-minute expiry with a fake clock,
one-use consumption after both valid and invalid authenticated requests,
replay, peer UID policy abstraction, socket/token modes, symlink swaps, wrong
owner, concurrent clients, cancellation, and cleanup after crash/restart.

Receipt tests sign and verify:

```rust
let signed = CommissioningReceiptV1::sign(evidence, &owner)?;
verify_receipt(&signed)?;
assert_eq!(signed.owner_pubkey(), owner.public_key().to_hex());
assert!(!signed.canonical_json()?.contains("source_text"));
```

Mutation of any canonical field must invalidate the signature.

- [ ] **Step 2: Run selected tests and verify failure**

Run:

```bash
cargo test --manifest-path desktop/src-tauri/Cargo.toml commissioning::tests -- --test-threads=1
```

Expected: compilation fails because the commissioning module is absent.

- [ ] **Step 3: Implement closed protocol and one-use challenge**

Represent operations as a tagged enum with `deny_unknown_fields`. Use Tokio
Unix sockets, bounded line reads, constant-time token digest comparison, an
in-memory challenge state machine, and a current-UID peer verifier. Challenge
creation uses the OS CSPRNG and protected atomic file creation.

- [ ] **Step 4: Implement the content-free evidence schema and signed receipt**

Use closed enums for `passed`, `failed`, `blocked`, and `not_run`. Evidence
contains identifiers/counts/statuses only. Canonicalize with deterministic key
and array ordering, hash with SHA-256, and create a Nostr Schnorr signature over
the canonical receipt payload. Add a lexical denylist test for prohibited
content-bearing field names.

- [ ] **Step 5: Run focused tests, fmt, and clippy**

Run:

```bash
cargo fmt --manifest-path desktop/src-tauri/Cargo.toml -- --check
cargo test --manifest-path desktop/src-tauri/Cargo.toml commissioning::tests -- --test-threads=1
cargo clippy --manifest-path desktop/src-tauri/Cargo.toml --all-targets -- -D warnings
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add desktop/src-tauri
git commit -m "feat(command-console): add signed commissioning protocol"
```

### Task 4: Bind commissioning to the real Phase 4 runtime

**Files:**
- Create: `desktop/src-tauri/src/commissioning/command_brief.rs`
- Create: `desktop/src-tauri/src/commissioning/command_brief_tests.rs`
- Modify: `desktop/src-tauri/src/commissioning/mod.rs`
- Modify: `desktop/src-tauri/src/startup.rs`
- Modify: `desktop/src-tauri/src/command_brief/orchestrator.rs`
- Modify: `desktop/src-tauri/src/command_brief/lmstudio.rs`
- Modify: `desktop/src-tauri/src/command_brief/sources.rs`
- Modify: `desktop/src-tauri/src/command_brief/audit.rs`
- Modify: `desktop/src-tauri/src/app_state.rs`

**Interfaces:**
- Produces: `CommissioningRunObserver` and `run_acceptance_brief`.
- Consumes: the existing production `CommandBriefOrchestrator`, fixed manual run path, encrypted audit spool, and latest-history loader.
- The fixed acceptance intent is native-owned and contains no route, order, task, message, action, or decision request.

- [ ] **Step 1: Write failing integration tests with loopback fakes**

Instrument the existing provider traits rather than adding a second
orchestrator. Prove one real-structure Memory call and RAG call, exactly five
specialist completions, configured concurrency `1` and `2`, one later
tool-free Chief of Staff call, a common snapshot, signed spool-before-publish,
forced publication failure, exact-ID republish, and restart/history equality.

The observer output must contain only:

```rust
StructuredCallObservation {
    adviser: AdviserRole,
    tool_name: CatalogToolName,
    completed: bool,
}
```

with counts and digests, never arguments or results.

- [ ] **Step 2: Run selected tests and verify failure**

Run:

```bash
cargo test --manifest-path desktop/src-tauri/Cargo.toml commissioning::command_brief_tests -- --test-threads=1
```

Expected: missing observer and run binding fail compilation.

- [ ] **Step 3: Add content-free observation hooks to the existing runtime**

Add an optional no-op-by-default observer at successful structured-call,
specialist-terminal, Chief-of-Staff-terminal, spool-commit, publish, and
history-load boundaries. The observer receives only typed identifiers, counts,
durations, states, and digests.

- [ ] **Step 4: Run the native-owned acceptance intent through production**

Commissioning calls the same startup/manual path used by the Command Console,
waits for its terminal lifecycle, verifies the persisted result, exercises
exact-ID replay with a commissioning-only transient publisher gate, reloads
history, assembles evidence, and signs the receipt with the active owner.

- [ ] **Step 5: Run focused and Phase 4 regression tests**

Run:

```bash
cargo test --manifest-path desktop/src-tauri/Cargo.toml commissioning:: -- --test-threads=1
just check-daily-command-brief
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add desktop/src-tauri/src
git commit -m "feat(command-console): prove live brief lifecycle"
```

### Task 5: Operator runner and receipt verifier

**Files:**
- Create: `scripts/commission-command-console.sh`
- Create: `scripts/verify-command-console-receipt.sh`
- Create: `scripts/tests/commission-command-console-test.sh`
- Modify: `scripts/check-daily-command-brief.sh`
- Create: `docs/command-console/phase-6-assurance.md`

**Interfaces:**
- Produces: `commission-command-console.sh preflight|run|status|cancel|verify|offline-plan`.
- Consumes: the protected challenge path, Unix socket, signed receipt, literal-loopback endpoints, and the packaged app.

- [ ] **Step 1: Write failing shell tests**

Use fake socket/app/codesign/spctl binaries. Cover protected input metadata,
closed arguments, literal-loopback endpoints, no proxy environment,
non-interactive operation, challenge deletion, receipt signature verification,
app hash/codesign binding, blocked notarization, redacted output, and an
offline plan with timeout/rollback but no automatic `sudo` or `pfctl`.

- [ ] **Step 2: Run the tests and verify failure**

Run:

```bash
bash scripts/tests/commission-command-console-test.sh
```

Expected: failure because the runner is absent.

- [ ] **Step 3: Implement the runner and verifier**

The runner creates a mode-`0700` evidence directory, validates the packaged app
and protected files, clears proxy variables for child probes, connects only to
the exact socket, and writes only the signed content-free receipt plus
codesign/notarization/resource observations. It never receives operational
content.

`offline-plan` prints a bounded operator-reviewed PF plan, a harmless canary,
an automatic timeout, and exact rollback commands. It does not execute a
privileged command.

- [ ] **Step 4: Replace arbitrary live-driver execution**

`scripts/check-daily-command-brief.sh --live` must invoke the repository-owned
runner in `run` mode. Remove `BUZZ_DAILY_BRIEF_LIVE_DRIVER`; retain explicit
model and literal-loopback endpoint inputs plus packaged app and evidence root.

- [ ] **Step 5: Run focused tests and shell lint**

Run:

```bash
bash scripts/tests/commission-command-console-test.sh
bash scripts/tests/check-daily-command-brief-test.sh
shellcheck scripts/commission-command-console.sh scripts/verify-command-console-receipt.sh
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add scripts docs/command-console/phase-6-assurance.md
git commit -m "feat(command-console): add controlled commissioning runner"
```

### Task 6: Integrated dependency manifest, package gate, and full verification

**Files:**
- Create: `config/command-console/phase-6-dependencies.json`
- Create: `scripts/check-command-console-assurance.sh`
- Create: `scripts/tests/check-command-console-assurance-test.sh`
- Modify: `Justfile`
- Modify: `desktop/src-tauri/tauri.conf.json`
- Modify: `docs/command-console/phase-6-assurance.md`

**Interfaces:**
- Produces: `just check-command-console-assurance`.
- Consumes: exact Buzz, Memory, and RAG commits/image digests; disposable stack helper; packaged app; commissioning runner.

- [ ] **Step 1: Write the failing aggregate-gate test**

The test supplies fake component manifests and proves rejection of mutable image
tags, missing SHA-256 digests, wrong source revisions, Phase 5 ancestry,
non-disposable projects, unsigned helpers, absent notarization state in live
mode, and content-bearing receipt fields.

- [ ] **Step 2: Run and verify failure**

Run:

```bash
bash scripts/tests/check-command-console-assurance-test.sh
```

Expected: failure because the aggregate gate is absent.

- [ ] **Step 3: Implement the dependency and aggregate gate**

The dependency file uses exact 40-character Git revisions and 64-character
lowercase SHA-256 digests. The gate verifies manifests, builds the disposable
stack, provisions test-only secrets, runs the structured fake acceptance,
verifies its owner signature, backs up/restores, compares exact history/event
IDs, and tears down only its project.

- [ ] **Step 4: Add release packaging checks**

Verify bundle identifier, version, hardened runtime, embedded Apple helper,
minimum entitlements, source revision, codesign chain, and Gatekeeper result.
Hermetic mode records notarization as `not_run`; live mode requires `passed`.

- [ ] **Step 5: Run all Phase 6 and upstream gates**

Run:

```bash
just check-command-console-assurance
just check-daily-command-brief
just ci
```

Expected: all repository-assurance checks pass; live-only checks are explicitly
`blocked` or `not_run` unless real operator inputs are present.

- [ ] **Step 6: Commit**

```bash
git add config scripts Justfile desktop/src-tauri/tauri.conf.json docs
git commit -m "test(command-console): gate phase 6 assurance"
```
