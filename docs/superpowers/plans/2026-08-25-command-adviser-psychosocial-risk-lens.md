# Command Adviser Psychosocial Risk Lens Implementation Plan

> **For Codex:** Execute this plan with the `superpowers:executing-plans` workflow. Use test-first implementation, keep the feature within the existing Risk Register, and do not create a second scoring system.

**Goal:** Add an evidence-informed psychosocial-hazard review to PR #29 that highlights relevant work-design factors without automatically creating risks, changing ADFP matrix scores, or overwhelming the Command Brief.

**Architecture:** Extend the existing signed `RiskRecordV1` contract in Rust and TypeScript with one bounded `psychosocialReview` object. Derive temporary Battle Rhythm suggestions locally from short-notice all-day programme changes. The user must open and save a draft before anything is persisted. Existing risk controls, owners, dates, matrix scoring, export, and brief projection remain authoritative.

**Tech Stack:** Rust/Serde, TypeScript/React 19, Tauri 2, Node test runner, Playwright, Nostr parameterised replaceable events.

---

## Task 1: Extend the signed risk contract

**Files:**
- Modify: `crates/buzz-core/src/risk.rs`
- Modify: `crates/buzz-core/tests/risk_contracts.rs`
- Modify: `desktop/src/features/risk/domain/contracts.ts`
- Modify: `desktop/src/features/risk/domain/contracts.test.mjs`

**Steps:**

1. Add failing Rust and TypeScript tests for a valid `psychosocialReview`, invalid material/consideration states, and a linked risk on a non-material review.
2. Run the focused tests and confirm the new cases fail because the field is not accepted.
3. Add the exact enums and validation rules from the design specification to both contracts.
4. Add a default `notIndicated` review to every risk-record factory and fixture.
5. Re-run focused Rust and TypeScript tests and confirm they pass.
6. Commit with sign-off: `feat(risk): add psychosocial review contract`.

## Task 2: Add programme-change suggestions and editor controls

**Files:**
- Create: `desktop/src/features/risk/domain/psychosocialReview.ts`
- Create: `desktop/src/features/risk/domain/psychosocialReview.test.mjs`
- Modify: `desktop/src/features/risk/domain/riskPresentation.ts`
- Modify: `desktop/src/features/risk/domain/riskPresentation.test.mjs`
- Modify: `desktop/src/features/risk/ui/RiskEditorDialog.tsx`
- Modify: `desktop/src/features/risk/ui/RiskScreen.tsx`
- Modify: `desktop/tests/e2e/risk.spec.ts`

**Steps:**

1. Add failing pure-domain tests showing that a changed all-day FAS/Longcast event within seven days creates an advisory suggestion, while timed, distant, and Shortcast events do not.
2. Add a failing test showing a suggestion creates an unsaved draft with consideration state and source evidence but does not alter the ADFP assessment.
3. Implement the pure suggestion engine, labels, and draft factory with no writes or side effects.
4. Add a compact programme-change panel, psychosocial-attention filter, and row marker to the Risk screen.
5. Add review state, hazard checkboxes, exposure context, basis, and optional linked-risk input to the existing editor. State clearly that these fields do not alter the 5x5 score.
6. Add or update the Risk E2E journey to prove that a suggestion is not persisted until `Save risk` is selected.
7. Run focused domain and E2E tests.
8. Commit with sign-off: `feat(risk): add psychosocial review workflow`.

## Task 3: Keep brief and exports concise

**Files:**
- Modify: `desktop/src-tauri/src/command_brief/sources/planning_evidence.rs`
- Modify: relevant tests beside `planning_evidence.rs`
- Modify: `desktop/src/features/risk/ui/RiskScreen.tsx`
- Modify: export tests where the Risk Register row shape is asserted

**Steps:**

1. Add failing Rust tests proving that consideration/material records expose only psychosocial state and hazard labels, while `notIndicated` records expose neither.
2. Implement bounded planning evidence fields without including the full basis, individual details, or a separate evidence source.
3. Add one concise psychosocial column to Excel/PDF export rows using existing labels.
4. Re-run focused planning-evidence and export tests.
5. Commit with sign-off: `feat(risk): project psychosocial attention concisely`.

## Task 4: Verify and update PR #29

**Steps:**

1. Activate the repository Hermit environment.
2. Run focused Risk desktop tests, Rust risk-contract tests, Tauri command-brief tests, desktop typecheck/lint, and the Risk E2E smoke journey.
3. Run the applicable full PR gate (`just ci`) and record any unrelated infrastructure-only limitation precisely.
4. Inspect the diff for accidental score changes, automatic persistence, sensitive personal fields, placeholder text, or unrelated edits.
5. Push `codex/phase-risk-register` to origin.
6. Update PR #29 with a concise psychosocial-risk-lens summary and test evidence; leave it ready for review only if all relevant gates pass.
7. Record the implemented contract, guardrails, and verification outcome in Memory MCP with agent `CODEX`.

## Acceptance Checklist

- Safe Work Australia factors are available as a review lens inside existing risks.
- Psychosocial review never changes matrix likelihood, consequence, or level.
- Battle Rhythm produces only advisory, unsaved prompts for short-notice all-day FAS/Longcast changes.
- The user controls whether a prompt becomes a risk record.
- Temporary factors can remain on the operational risk; material factors may link to a personnel risk.
- General records exclude individual medical and protected complaint details.
- Briefing and export outputs are concise and action-oriented.
- Existing PR #29 Risk Register behaviour and existing Command Adviser data remain compatible.
