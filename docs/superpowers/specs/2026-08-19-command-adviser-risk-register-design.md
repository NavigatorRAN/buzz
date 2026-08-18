# Command Adviser Risk Register Design

## Purpose

Add a native Risk surface to Command Adviser that supports operational risk management without turning the application into a full JMAP suite. The register is the working command view for identified risks, controls, residual risk, review dates, and acceptance or elevation. It is advisory and records the Commanding Officer's decisions; it does not accept risk on the user's behalf.

The design follows ADFP 5.0.1 Annex 1C: risk is considered throughout planning and execution, evaluated through likelihood and consequence, treated through controls, reviewed as conditions change, and accepted or transferred at the appropriate authority. The supplied `Risk Assessment.xlsx` informed the layout and 5x5 lookup only; it is not the runtime or formula authority.

## Scope

Version 1 provides:

1. A `Risk` destination in the main Command Adviser sidebar.
2. A command summary showing open risks, risks requiring elevation, overdue reviews, and projected controls.
3. An interactive 5x5 likelihood/consequence matrix using the exact ADFP lookup rather than multiplication.
4. A filterable register of ship-wide, operation, project, activity, and task risks.
5. Create and edit workflows for hazard, consequence, domain, owner, inherent assessment, controls, residual assessment, review, status, source evidence, and command disposition.
6. A configurable risk-authority profile seeded from ADFP 5.0.1 Table 1C.5.
7. Explicit `Projected` residual risk until controls are implemented and their effectiveness is reviewed; only then may it be `Validated`.
8. Promotion of a Plans `MissionConstraint` in `riskCandidate` state into a linked risk record.
9. Links from controls to existing Plans tasks; due and review dates are shown in Risk and remain available as signed evidence for the Daily Command Brief.
10. Open, overdue, elevation-required, and accepted risks are supplied to the Daily Command Brief as concise signed planning evidence.
11. Excel and PDF export of the current filtered register through the native save dialog.

Structured workbook import, quantitative/probabilistic models, portfolio aggregation, automatic risk acceptance, a separate Risk Adviser, and a complete formal JMAP workspace are deferred.

## Doctrine Model

### Likelihood

- `5` Almost Certain
- `4` Probable
- `3` Occasional
- `2` Improbable
- `1` Rare

### Consequence

- `A` Minor
- `B` Moderate
- `C` Major
- `D` Critical
- `E` Catastrophic

### Exact Matrix

| Likelihood | A | B | C | D | E |
|---|---|---|---|---|---|
| 5 | Low | Medium | High | Very High | Very High |
| 4 | Low | Medium | High | High | Very High |
| 3 | Very Low | Low | Medium | High | High |
| 2 | Very Low | Very Low | Low | Medium | Medium |
| 1 | Very Low | Very Low | Very Low | Low | Low |

### Default Authority Profile

- Very High: Secretary/CDF/Chief of Service/CJOPS/CJC/Group Head.
- High: Functional or Formation Commander/National Command/CJTF/1–2 Star/SES Band 1–2.
- Medium: Commanding Officer/independent Officer Commanding/Director EL2/O4–O6.
- Low: O3–O4/Deputy Director/EL1.
- Very Low: Team Leader APS4–6/Corporal–O3.

The profile is editable because an operation or higher command may prescribe a different tolerance threshold. The application derives the required authority from the residual level, compares it with the configured local acceptance ceiling, and marks a risk `Elevation required` when it exceeds that ceiling. It never infers that acceptance occurred.

## Data Contracts

### `RiskRecordV1` — Nostr kind `30639`

Owner-authored parameterised replaceable event with stable `d=<risk id>` and optional `project`, `task`, `activity`, `review`, and `constraint` tags.

```ts
type RiskRecordV1 = {
  schemaVersion: 1;
  id: string;
  title: string;
  description: string;
  consequenceDescription: string;
  domain: "mission" | "personnel" | "capability" | "reputation" | "environment";
  operationalTags: string[];
  owner: string;
  scope: {
    type: "ship" | "operation" | "project" | "activity" | "task";
    id: string | null;
    label: string;
  };
  inherentAssessment: { likelihood: 1 | 2 | 3 | 4 | 5; consequence: "A" | "B" | "C" | "D" | "E" };
  controls: Array<{
    id: string;
    description: string;
    owner: string;
    status: "planned" | "inProgress" | "implemented" | "ineffective";
    linkedTaskId: string | null;
    dueDate: string | null;
    effectiveness: string | null;
  }>;
  residualAssessment: {
    likelihood: 1 | 2 | 3 | 4 | 5;
    consequence: "A" | "B" | "C" | "D" | "E";
    basis: string;
    state: "projected" | "validated";
  };
  status: "open" | "treating" | "controlled" | "accepted" | "elevated" | "closed";
  reviewDate: string;
  acceptance: {
    state: "notAccepted" | "accepted" | "elevationRequired" | "elevated";
    authority: string | null;
    decidedBy: string | null;
    decidedAt: string | null;
    direction: string | null;
  };
  sourceEvidence: string | null;
  sourceConstraintId: string | null;
  createdAt: string;
  updatedAt: string;
};
```

Contract validation requires exact fields, bounded text and arrays, valid dates/timestamps, unique control IDs, no task scope without an ID, at least one control for `controlled`/`accepted`, every control implemented before residual state can be `validated`, and a complete acceptance decision before state can be `accepted` or `elevated`.

### `RiskAuthorityProfileV1` — Nostr kind `30640`

Owner-authored parameterised replaceable event with `d=<profile id>`. The app creates the doctrine seed locally when no signed profile exists, but only persists it when edited.

```ts
type RiskAuthorityProfileV1 = {
  schemaVersion: 1;
  id: string;
  title: string;
  localAcceptanceCeiling: "veryLow" | "low" | "medium" | "high" | "veryHigh";
  authorities: Record<RiskLevel, string>;
  reviewCadenceDays: Record<RiskLevel, number>;
  source: string;
  updatedAt: string;
};
```

## Behaviour

### Assessment and treatment

- The matrix derives the level from the selected likelihood and consequence.
- Inherent and residual assessments are separately editable; either dimension may change after treatment.
- The editor displays the resulting index (`C3`) and level while the user works.
- If controls are incomplete, residual risk is visibly `Projected` and cannot be marked `Validated`.
- A risk above the profile's local ceiling is marked `Elevation required`. A lower risk remains unaccepted until the user records a decision.
- Closing a risk requires a direction note so the outcome is not ambiguous.

### Constraint promotion

Plans retains Mission Constraints as the precursor state. A `riskCandidate` row receives a `Promote to Risk` action. It opens the Risk editor prefilled with the description, owner, project/task links, source evidence, and source constraint ID; the user supplies the assessment and saves. No constraint is automatically changed or deleted.

### Daily Command Brief

The signed risk record is treated as a planning source. The brief receives only active material risk fields: title, owner, domain, scope, inherent index/level, residual index/level/state, control progress, review date, status, and acceptance state. Closed risks are excluded. Sort priority is elevation required, overdue review, then descending risk level. The bounded planning evidence limit remains in force.

### Export

`Export Excel` produces a real `.xlsx` package with a `Risk Register` sheet and one row per filtered risk. `Export PDF` produces a concise landscape-style register summary. Both use the native save dialog and do not mutate application state.

## UI

The Risk screen uses the established dark navy Command Adviser theme and rem-based typography.

- Header: title, short purpose, `New risk`, `Export Excel`, `Export PDF`, and `Authority profile`.
- Summary cards: Open, Elevation required, Review overdue, and Controls outstanding.
- Main grid: interactive matrix on the left; filterable register on the right. Selecting a matrix cell filters matching current residual assessments.
- Register columns: Risk, Scope, Owner, Inherent, Residual, Controls, Review, and Disposition.
- Selecting a row opens a detail panel with full assessment, controls, evidence, links, acceptance, and edit action.
- Empty state explains how to create a risk or promote a Mission Constraint.

## Acceptance

- Existing Buzz/Command Adviser data remains untouched and readable.
- Risk kinds are registered in Rust and TypeScript and round-trip through signed Nostr events.
- Matrix outputs match every one of the 25 doctrine cells.
- Malformed or cross-tag-substituted events are rejected.
- The UI supports create, edit, filter, matrix selection, authority-profile edit, and constraint promotion.
- Project/task links resolve against existing Plans data.
- The Daily Command Brief includes concise active risk evidence and excludes closed risks.
- Excel and PDF exports save through the macOS native dialog.
- Desktop unit tests, Rust unit tests, typecheck, lint/checks, E2E smoke for the Risk journey, and the relevant full project gates pass before installation.

