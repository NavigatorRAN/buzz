# Incident Control Design

## Purpose

Command Adviser needs a dedicated Incident Control capability that lets the
Commanding Officer retain command ownership from the first safety action until
evidence-backed closure. It must turn the interim Incident Management guidance
into a live control loop, not merely store a DECMS reference or imitate generic
project planning.

The first version is deliberately provisional. It is governed by the supplied
two-page guidance and must be able to adopt a later ADF Incident Management
Playbook through explicit, versioned rule changes.

## Command and authority boundaries

- The CO owns every incident and is the only role that starts, closes, or
  reopens the command incident record.
- The XO, N1, and specialists may own actions. Action ownership never transfers
  command responsibility.
- Command Adviser derives follow-up flags but never sends reminders, meeting
  invitations, or directions automatically.
- A missing update never implies completion. Status remains explicit and
  evidence-backed.
- Calendar content is deliberately generic. The title is `CO Incident Sync` and
  never contains an incident title, allegation, or person's name.

## Source-derived lifecycle

Every incident uses the following six stages from interim guidance version
`interim-incident-guidance-2026-08-25`:

1. Manage - make people safe, control immediate risk, preserve evidence and the
   scene, and apply necessary workplace or access controls.
2. Establish - separate facts, allegations, assumptions, and unknowns; do not
   investigate beyond competence.
3. Notify - identify the command chain and specialist support that need to know.
4. Report - track formal reporting separately from command notification.
5. Manage and update - continue risk, welfare, evidence, action, ownership, and
   reporting work while circumstances change.
6. Close and learn - close only when actions, outcomes, support, handover,
   reporting, and lessons are evidenced.

DECMS is represented as the record of incident management, not incident
management itself.

## Data model and persistence

Use a new owner-authored NIP-33 parameterized replaceable event kind,
`KIND_INCIDENT_CONTROL_RECORD` (`30639`), keyed by incident UUID in the `d` tag.
The relay applies its normal host-derived community boundary. No new HTTP
endpoint is introduced.

Each strict version-1 record contains:

- classification, schema version, ID, human reference, title, summary, stage,
  status, playbook version, and opened/updated timestamps;
- explicit immediate-safety state and the controls considered or applied;
- facts, allegations, assumptions, and unknowns as separate bounded lists;
- actions with owner role, due time, status, evidence, blocker, and timestamp;
- command-notification and formal-reporting checkpoints;
- last CO review, next CO review, last confirmed DECMS update, and DECMS
  reference;
- an append-only-in-payload review history and bounded closure evidence.

The signed replacement contains the complete current record and its bounded
review history. Corrections change the current snapshot without silently
asserting that earlier information was fact. A future schema or playbook
version does not change existing incidents unless the CO explicitly adopts it.

## Derived command controls

The client derives flags deterministically from signed records:

- immediate safety is not confirmed;
- an action is overdue, blocked without a next step, or claimed complete
  without evidence;
- a 14-day CO review is approaching or overdue;
- the preferred 14-day DECMS update target is approaching or overdue;
- the 28-day DECMS maximum is approaching or breached;
- closure is attempted with incomplete gates.

Every flag names the incident, responsible role, reason, due time, and priority.
The UI does not infer attendance, completion, notification, or reporting from
silence.

## Combined CO Incident Sync

Every active incident retains its own `nextReviewAt`. One combined sync is
derived from the earliest date. The meeting:

- is a timed attendance commitment, not all-day mission context;
- is projected to Apple Calendar as `CO Incident Sync`;
- contains only a count, generic agenda, and a deep link to Incident Control;
- does not create attendees or send invitations;
- reviews every active incident, not only the incident that drove the date.

Recording a combined sync requires a summary for every active incident. Each
confirmed incident review resets its internal 14-day review clock. A confirmed
DECMS update separately resets the 14-day target and 28-day maximum clocks.

## User experience

Add an `Incident Control` item to the desktop sidebar and routes for the
incident dashboard and incident detail.

The dashboard leads with:

1. the next combined sync and the incident driving its date;
2. CO follow-ups ordered by criticality and due time;
3. active incident cards showing lifecycle stage, safety state, outstanding
   actions, next review, and DECMS age;
4. controls to start an incident and record the combined sync.

Starting an incident records the minimum safe baseline: reference, title,
occurrence time, summary, explicit safety state, and initial known/unknown
information. The detail screen then supports structured actions and review
history.

The Command Console shows a concise live `Incident follow-ups` card above the
Daily Command Brief. It links to Incident Control and never alters the signed
generated brief or invents source claims.

Battle Rhythm publishes the derived timed sync alongside approved programme
events and plan milestones. Changes to incidents trigger reconciliation.

## Error handling and privacy

- Invalid or unknown fields fail closed at parsing boundaries.
- Relay failures retain the last readable record and show a scoped error.
- A partially saved combined sync reports which incident updates failed; clocks
  reset only for successfully signed records.
- Apple Calendar permission or publication failure does not change incident
  state and remains visible through existing calendar status.
- Calendar output contains no incident names or personal details.
- The incident workspace warns operators to record only information appropriate
  to the configured command workspace. Existing workspace access controls are
  not silently treated as accreditation for every incident category.

## Verification

- Unit tests cover parsing, scheduling, flag priorities, 14/28-day boundaries,
  evidence gates, combined-sync reset behavior, event tags, and calendar
  privacy.
- UI tests cover routing, empty state, safety-first creation, follow-up display,
  action evidence, and combined-sync recording.
- A desktop E2E scenario creates overlapping incidents and verifies one combined
  meeting on the earliest required date.
- The final build runs desktop checks, TypeScript validation, Rust kind tests,
  the changed E2E suite, and a visual screenshot review before local deployment.
