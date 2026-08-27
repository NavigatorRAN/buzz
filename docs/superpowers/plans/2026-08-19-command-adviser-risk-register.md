# Command Adviser Risk Register Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver an installed, user-testable native Risk Register in Command Adviser with doctrine scoring, signed persistence, Plans and Daily Brief integration, and Excel/PDF export.

**Architecture:** Add strict risk contracts to `buzz-core` and matching TypeScript domain contracts, persisted as two owner-authored parameterised replaceable Nostr event kinds. A standalone React Risk route projects the signed records into a matrix, summary, register, editor, and detail view. Existing Plans supplies project/task/constraint links; the Tauri planning-evidence collector supplies active risks to the Daily Command Brief; one bounded Tauri export command creates Excel or PDF bytes and opens the native save dialog.

**Tech Stack:** Rust, serde, Nostr event kinds, Tauri 2, React 19, TypeScript, TanStack Query/Router, Tailwind, Node test runner, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-19-command-adviser-risk-register-design.md`

## Global Constraints

- Preserve all existing Command Adviser data and event contracts.
- Persist risk state as signed Nostr events, not localStorage or a new REST endpoint.
- Use exact 5x5 lookup values from the approved spec; never multiply likelihood and consequence.
- Do not let the application or an agent accept risk for the user.
- Residual risk remains `projected` until all controls are implemented and effectiveness is reviewed.
- Use rem-based named Tailwind text tokens; do not add arbitrary text sizes.
- New Rust public APIs require doc comments; no `unsafe`, `unwrap()`, or `expect()` in production paths.
- Activate Hermit before Git or quality-gate commands; commits use `git commit -s`.

---

### Task 1: Strict Risk Domain and Event Kinds

**Files:**
- Modify: `crates/buzz-core/src/kind.rs`
- Modify: `crates/buzz-core/src/lib.rs`
- Create: `crates/buzz-core/src/risk.rs`
- Create: `crates/buzz-core/tests/risk_contracts.rs`
- Modify: `desktop/src/shared/constants/kinds.ts`
- Create: `desktop/src/features/risk/domain/contracts.ts`
- Create: `desktop/src/features/risk/domain/contracts.test.mjs`
- Create: `desktop/src/features/risk/domain/riskMatrix.ts`
- Create: `desktop/src/features/risk/domain/riskMatrix.test.mjs`

**Interfaces:**
- Produces: `RiskRecordV1`, `RiskAuthorityProfileV1`, `parseRiskRecord`, `parseRiskAuthorityProfile`, `riskLevelFor`, `riskIndexFor`, `requiredAuthorityFor`, `requiresElevation`.

- [ ] Write Rust and TypeScript tests with literal valid fixtures, all 25 matrix expectations, contract rejection cases, projected/validated control rules, acceptance completeness, and authority ceiling comparisons.
- [ ] Run the focused Rust and desktop tests and verify they fail because the risk contracts and kind constants do not exist.
- [ ] Add kinds `30639` and `30640`, strict Rust/TypeScript contracts, doctrine matrix lookup, authority seed, and pure derivation helpers.
- [ ] Re-run focused tests and refactor only after they pass.
- [ ] Commit with `git commit -s -m "feat(risk): add doctrine risk contracts"`.

### Task 2: Signed Risk Persistence

**Files:**
- Create: `desktop/src/features/risk/domain/eventCodec.ts`
- Create: `desktop/src/features/risk/domain/eventCodec.test.mjs`
- Create: `desktop/src/features/risk/data/riskService.ts`
- Create: `desktop/src/features/risk/data/riskService.test.mjs`
- Create: `desktop/src/features/risk/hooks.ts`
- Modify: `desktop/src/testing/e2eBridge.ts`

**Interfaces:**
- Consumes: Task 1 contracts and kind constants.
- Produces: `buildRiskRecordEvent`, `parseRelayRiskRecord`, `buildRiskAuthorityProfileEvent`, `parseRelayRiskAuthorityProfile`, `fetchRiskRegister`, `publishRiskRecord`, `publishRiskAuthorityProfile`, `useRiskRegisterQuery`, `useRiskMutations`.

- [ ] Write event-codec tests proving stable tags, monotonic updates, and rejection of ID/project/task/review tag substitution.
- [ ] Write service tests proving explicit kind/author queries, newest-head selection, safe doctrine default when no profile exists, and publish read-before-write behaviour.
- [ ] Run focused tests and verify the missing implementation failures.
- [ ] Implement the codec, service, hooks, and mock bridge support using the existing Plans patterns.
- [ ] Re-run focused tests and commit with `git commit -s -m "feat(risk): persist signed risk records"`.

### Task 3: Risk Route, Sidebar, Matrix and Register

**Files:**
- Create: `desktop/src/app/routes/risk.tsx`
- Modify: `desktop/src/app/routes.ts`
- Modify: `desktop/src/app/AppShell.helpers.ts`
- Modify: `desktop/src/app/AppShell.helpers.test.mjs`
- Modify: `desktop/src/app/navigation/useAppNavigation.ts`
- Modify: `desktop/src/app/navigation/useAppNavigation.test.mjs`
- Modify: `desktop/src/app/AppShell.tsx`
- Modify: `desktop/src/features/sidebar/ui/AppSidebar.tsx`
- Modify: `desktop/src/features/sidebar/ui/AppSidebarPinnedHeader.tsx`
- Create: `desktop/src/features/risk/ui/RiskScreen.tsx`
- Create: `desktop/src/features/risk/ui/RiskMatrix.tsx`
- Create: `desktop/src/features/risk/ui/RiskRegisterTable.tsx`
- Create: `desktop/src/features/risk/ui/RiskDetailPanel.tsx`
- Create: `desktop/src/features/risk/ui/riskPresentation.ts`
- Create: `desktop/src/features/risk/ui/riskPresentation.test.mjs`

**Interfaces:**
- Consumes: Task 2 query/mutations and existing Plans query.
- Produces: `/risk` route, `goRisk`, sidebar `Risk` destination, filterable Risk screen.

- [ ] Add failing route/navigation and presentation tests for selected sidebar state, matrix-cell filtering, summary counts, overdue review, control progress, and level labels/colours.
- [ ] Run focused tests and verify the new route and helpers are absent.
- [ ] Implement the lazy route, navigation wiring, sidebar item, summary cards, matrix, register, filters, and selected-risk detail panel.
- [ ] Run focused tests, typecheck, and component checks; then commit with `git commit -s -m "feat(risk): add command risk dashboard"`.

### Task 4: Risk Editing, Authority and Constraint Promotion

**Files:**
- Create: `desktop/src/features/risk/ui/RiskEditorDialog.tsx`
- Create: `desktop/src/features/risk/ui/RiskControlEditor.tsx`
- Create: `desktop/src/features/risk/ui/RiskAuthorityDialog.tsx`
- Create: `desktop/src/features/risk/domain/riskDraft.ts`
- Create: `desktop/src/features/risk/domain/riskDraft.test.mjs`
- Modify: `desktop/src/features/risk/ui/RiskScreen.tsx`
- Modify: `desktop/src/features/plans/ui/MissionConstraintsPanel.tsx`
- Modify: `desktop/src/features/plans/ui/PlanDetailScreen.tsx`
- Modify: `desktop/src/app/navigation/useAppNavigation.ts`
- Modify: `desktop/src/app/routes/risk.tsx`

**Interfaces:**
- Produces: `newRiskDraft`, `riskDraftFromConstraint`, `completeRiskDraft`, create/edit workflows, profile edit, and `/risk?constraint=<id>` promotion handoff.

- [ ] Write failing draft tests for new defaults, exact constraint prefill, valid control linking, projected residual enforcement, acceptance/elevation derivation, and close-direction requirement.
- [ ] Run tests and verify failures are caused by missing draft behaviour.
- [ ] Implement compact spellcheck-enabled forms, add/remove controls, project/task selectors, authority editor, and `Promote to Risk` on `riskCandidate` constraints.
- [ ] Re-run focused tests and typecheck; commit with `git commit -s -m "feat(risk): add assessment and promotion workflows"`.

### Task 5: Daily Brief Risk Evidence

**Files:**
- Modify: `desktop/src-tauri/src/command_brief/sources/planning_evidence.rs`
- Modify: `desktop/src-tauri/src/managed_agents/personas.rs`
- Modify: `desktop/src-tauri/src/managed_agents/personas/tests.rs`
- Modify: `desktop/src/features/command-console/ui/briefPresentation.ts`

**Interfaces:**
- Consumes: signed kind `30639` risk records.
- Produces: bounded `operational_risk` planning candidates ordered by elevation, overdue review, and residual risk level.

- [ ] Add Rust tests with literal signed-record projections proving active risks enter evidence, closed risks do not, malformed risks are excluded, and concise fields survive without full source/control prose.
- [ ] Run the focused Tauri tests and verify they fail before risk-kind support.
- [ ] Add the risk filter and candidate projection; update adviser planning guidance to treat the signed register as current risk state without inventing acceptance.
- [ ] Re-run focused Tauri tests and commit with `git commit -s -m "feat(risk): include active risks in command briefs"`.

### Task 6: Excel and PDF Export

**Files:**
- Create: `desktop/src-tauri/src/commands/risk_export.rs`
- Create: `desktop/src-tauri/src/commands/risk_export_tests.rs`
- Modify: `desktop/src-tauri/src/commands/mod.rs`
- Modify: `desktop/src-tauri/src/lib.rs`
- Create: `desktop/src/shared/api/tauriRisk.ts`
- Create: `desktop/src/shared/api/tauriRisk.test.mjs`
- Modify: `desktop/src/features/risk/ui/RiskScreen.tsx`
- Modify: `desktop/src/testing/e2eBridge.ts`

**Interfaces:**
- Produces: Tauri command `export_risk_register(format, title, risks)` and TypeScript `exportRiskRegister`.

- [ ] Add Rust tests that inspect generated XLSX ZIP entries/cells and PDF header/content, plus TypeScript boundary parsing tests.
- [ ] Run focused tests and verify the export API is missing.
- [ ] Implement bounded export input, Office XML/PDF generation, native save dialog, frontend API, UI buttons, and mock bridge response.
- [ ] Re-run focused tests and commit with `git commit -s -m "feat(risk): export register to Excel and PDF"`.

### Task 7: End-to-End Journey, Quality Gates and Installation

**Files:**
- Create: `desktop/tests/e2e/risk-register.spec.ts`
- Modify: `desktop/playwright.config.ts`
- Create: `docs/testing/risk-register-live-acceptance.md`

**Interfaces:**
- Proves: route visibility, create/edit/filter/detail/promotion/export journeys, persistence calls, brief-evidence projection, and installed app launch.

- [ ] Add an E2E spec that seeds an active plan, risk candidate, risk record, and authority profile; navigates via the sidebar; verifies summary/matrix/register; creates a risk; promotes the constraint; edits controls; and invokes both exports.
- [ ] Run the E2E spec against an E2E build and capture one readable Risk dashboard screenshot after `waitForAnimations`.
- [ ] Run desktop unit tests, typecheck, checks, focused Rust tests, Tauri tests, and `just ci`; fix only evidence-backed failures.
- [ ] Run the completion audit against every design acceptance item.
- [ ] Build the signed macOS application, back up the installed app, install the new bundle, launch it, and verify the process and Risk route are available without altering relay data.
- [ ] Commit remaining test/docs changes with signoff, push the phase branch, update the draft PR with evidence and screenshot, and leave the app ready for user testing.

