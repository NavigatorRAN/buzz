# Incident Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and locally deploy a visual CO-owned Incident Control workspace with evidence-backed follow-ups, a combined 14-day sync, a 28-day DECMS safeguard, Daily Command Brief visibility, and Apple Calendar publication.

**Architecture:** Store each incident as a strict owner-authored NIP-33 record on a dedicated kind. Keep domain evaluation pure and deterministic, then expose it through a desktop workspace plus thin Command Console and Battle Rhythm adapters. The combined sync is derived rather than stored as a second authority.

**Tech Stack:** Rust kind registry, Nostr events, React 19, TypeScript, TanStack Query/Router, Tailwind, Tauri Apple EventKit sidecar, Node test runner, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-25-incident-control-design.md`

## Global Constraints

- The CO retains incident ownership; Command Adviser never sends reminders or directions automatically.
- Use interim playbook version `interim-incident-guidance-2026-08-25`.
- Internal review and preferred DECMS cadence is 14 days; maximum DECMS age is 28 days.
- One combined sync uses the earliest active incident review date and reviews every active incident.
- Calendar title is exactly `CO Incident Sync` and contains no incident or personal names.
- All readable text uses existing rem-based Tailwind tokens.
- New persistent operations use Nostr events, not new HTTP endpoints.

---

### Task 1: Incident contracts and deterministic control engine

**Files:**
- Create: `desktop/src/features/incidents/domain/contracts.ts`
- Create: `desktop/src/features/incidents/domain/evaluation.ts`
- Create: `desktop/src/features/incidents/domain/contracts.test.mjs`
- Create: `desktop/src/features/incidents/domain/evaluation.test.mjs`

**Interfaces:**
- Produces: `IncidentControlRecordV1`, `IncidentActionV1`, `IncidentReviewV1`, `parseIncidentControlRecord`, `deriveIncidentFollowUps`, `deriveCombinedIncidentSync`, `applyCombinedIncidentReview`.

- [ ] Write contract tests that reject unknown fields, malformed dates, missing safety state, invalid action completion without evidence, and invalid review histories.
- [ ] Run the contract test and confirm it fails because the module does not exist.
- [ ] Implement the strict version-1 parser and immutable return values.
- [ ] Run the contract test and confirm it passes.
- [ ] Write evaluation tests with hand-derived dates for safety flags, overdue actions, 14-day target, 28-day maximum, earliest combined meeting, all-active review reset, and calendar-safe summary data.
- [ ] Run the evaluation test and confirm it fails because the evaluator does not exist.
- [ ] Implement the minimal pure evaluator and review transition.
- [ ] Run both domain tests and confirm they pass.

### Task 2: Signed incident persistence

**Files:**
- Modify: `crates/buzz-core/src/kind.rs`
- Modify: `crates/buzz-relay/src/handlers/ingest.rs`
- Modify: `desktop/src/shared/constants/kinds.ts`
- Modify: `mobile/lib/shared/relay/nostr_models.dart`
- Create: `desktop/src/features/incidents/domain/eventCodec.ts`
- Create: `desktop/src/features/incidents/domain/eventCodec.test.mjs`
- Create: `desktop/src/features/incidents/data/incidentsService.ts`
- Create: `desktop/src/features/incidents/data/incidentsService.test.mjs`
- Create: `desktop/src/features/incidents/hooks.ts`

**Interfaces:**
- Consumes: `parseIncidentControlRecord`.
- Produces: `KIND_INCIDENT_CONTROL_RECORD = 30639`, `fetchIncidents`, `publishIncident`, `useIncidentsQuery`, and `useIncidentMutations`.

- [ ] Add failing codec tests for kind `30639`, stable `d` and playbook tags, monotonic replacement timestamps, signer authority, and tag/content agreement.
- [ ] Add failing service tests for newest-per-ID selection, owner-scoped explicit-kind queries, malformed-record rejection, and monotonic publish.
- [ ] Register kind `30639` in Rust, desktop, mobile, and relay owner-authored ingestion allowlists.
- [ ] Implement event encoding, decoding, fetch, publish, and TanStack hooks following the Plans patterns.
- [ ] Run codec, service, Rust kind, and relay ingest tests and confirm they pass.

### Task 3: Incident Control routes and visual workspace

**Files:**
- Create: `desktop/src/features/incidents/ui/IncidentsScreen.tsx`
- Create: `desktop/src/features/incidents/ui/IncidentDetailScreen.tsx`
- Create: `desktop/src/features/incidents/ui/StartIncidentDialog.tsx`
- Create: `desktop/src/features/incidents/ui/RecordIncidentSyncDialog.tsx`
- Create: `desktop/src/features/incidents/ui/IncidentFollowUpList.tsx`
- Create: `desktop/src/app/routes/incidents.tsx`
- Create: `desktop/src/app/routes/incidents.$incidentId.tsx`
- Modify: `desktop/src/app/routes.ts`
- Modify: `desktop/src/app/AppShell.helpers.ts`
- Modify: `desktop/src/app/navigation/useAppNavigation.ts`
- Modify: `desktop/src/features/sidebar/ui/AppSidebar.tsx`
- Modify: `desktop/src/features/sidebar/ui/AppSidebarPinnedHeader.tsx`
- Test: `desktop/src/app/AppShell.helpers.test.mjs`
- Create: `desktop/src/features/incidents/ui/IncidentsScreen.test.mjs`

**Interfaces:**
- Consumes: incident query/mutations and deterministic control engine.
- Produces: `/incidents`, `/incidents/$incidentId`, `goIncidents`, `goIncident`, start/update/review interactions, and sidebar selection.

- [ ] Add failing navigation tests for incident routes and accessible UI tests for the safety-first empty/start states.
- [ ] Add routes, navigation callbacks, and the `ShieldAlert` sidebar destination.
- [ ] Implement the dashboard with next sync, ordered CO follow-ups, active incident cards, 14/28-day explanations, and a privacy note.
- [ ] Implement safety-first creation and combined-sync recording; require an explicit summary for each active incident and DECMS confirmation evidence when selected.
- [ ] Implement the detail view with lifecycle stages, structured knowledge, actions, update evidence, DECMS status, and review history.
- [ ] Run navigation and incident UI tests and confirm they pass.

### Task 4: Daily Command Brief and Apple Calendar integration

**Files:**
- Create: `desktop/src/features/incidents/ui/IncidentBriefFollowUps.tsx`
- Create: `desktop/src/features/incidents/domain/calendarProjection.ts`
- Create: `desktop/src/features/incidents/domain/calendarProjection.test.mjs`
- Modify: `desktop/src/features/command-console/ui/CommandConsoleScreen.tsx`
- Modify: `desktop/src/features/battle-rhythm/data/applePublication.ts`
- Modify: `desktop/src/features/battle-rhythm/data/applePublication.test.mjs`
- Modify: `desktop/src/features/battle-rhythm/ui/BattleRhythmScreen.tsx`
- Test: `desktop/src/features/command-console/ui/DailyCommandBrief.test.mjs`

**Interfaces:**
- Consumes: incident records, follow-up evaluator, and combined-sync derivation.
- Produces: a concise live Command Console follow-up card and a timed private Apple projection.

- [ ] Add failing tests proving one timed projection uses the earliest active date, a generic title, no sensitive incident text, and a stable external ID.
- [ ] Implement the incident calendar projection and allow Apple reconciliation to accept it alongside Battle Rhythm and Plans projections.
- [ ] Query incident data in Battle Rhythm and trigger calendar reconciliation when the combined sync changes.
- [ ] Add a failing Command Console UI test for live incident follow-ups and navigation.
- [ ] Implement the follow-up card above the generated Daily Command Brief without modifying signed brief claims.
- [ ] Run calendar, Command Console, and TypeScript tests and confirm they pass.

### Task 5: Visual acceptance, quality gates, PR, and local deployment

**Files:**
- Create: `desktop/tests/e2e/incident-control.spec.ts`
- Modify: `desktop/playwright.config.ts`
- Modify: `desktop/src/testing/e2eBridge.ts` only if the real mock relay cannot round-trip kind `30639` without a narrow addition.

**Interfaces:**
- Consumes: the complete Incident Control feature.
- Produces: visual acceptance evidence, verified branch, PR, and installed local application.

- [ ] Write the E2E test first for two overlapping incidents, one earliest combined sync, all-active review, Daily Command Brief follow-up visibility, and no sensitive Apple title.
- [ ] Run it and confirm the first missing behavior fails.
- [ ] Add only the minimum mock bridge support needed for realistic signed event round-tripping.
- [ ] Run the changed E2E spec after `pnpm build:e2e` and confirm it passes.
- [ ] Capture focused dashboard and detail screenshots after `waitForAnimations`; verify distinct image hashes and inspect them for clipping, hierarchy, readability, and privacy.
- [ ] Run `just desktop-check`, `just desktop-typecheck`, `just desktop-test`, relevant Rust tests, and `just ci`.
- [ ] Commit with `git commit -s`, push the branch, update the dedicated PR, and wait for applicable checks.
- [ ] Build the signed/local desktop bundle using the repository-supported release path, replace the installed Command Adviser app only after a successful build, launch it, and verify the Incident Control route in the installed application.
