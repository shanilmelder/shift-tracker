<!--
Sync Impact Report
==================
Version change: [none] → 1.0.0 (initial ratification)
Modified principles: N/A (initial creation)
Added sections:
  - Core Principles (8): Security First; Two-Role Clarity; Offline Resilience;
    Simplicity Over Cleverness; Consistent Design System; Type Safety;
    Testable Business Logic; Accessibility
  - Non-Negotiables (Security & Data Standards)
  - Governance
Removed sections: N/A (initial creation)
Templates requiring alignment check:
  - .specify/templates/plan-template.md ⚠ pending manual review (not modified by this command)
  - .specify/templates/spec-template.md ⚠ pending manual review (not modified by this command)
  - .specify/templates/tasks-template.md ⚠ pending manual review (not modified by this command)
Follow-up TODOs: none — all placeholders resolved from user input.
-->

# Mobile Shift Management App Constitution

## Core Principles

### I. Security First
Authorization decisions MUST be enforced at the data layer, never solely in client-side
code. Every read or write of shift, schedule, timekeeping, or personnel data MUST be
checked against the requesting user's role and permissions at the point where the data
is stored or served. Client-side role checks (hiding a button, disabling a screen) are
permitted only as a UX convenience and MUST NOT be treated as an access control
boundary. Any feature that cannot state which data-layer rule enforces its access
restriction is not complete.

**Rationale**: Client code is inspectable and modifiable by the party running it. Only
enforcement at the layer the client cannot control provides real protection for shift,
pay-relevant, and personnel data.

### II. Two-Role Clarity
The system recognizes exactly two role classes: employee and manager/admin. Every
feature specification and every implementation MUST explicitly define the behavior,
visible data, and allowed actions for both roles before it is considered complete. A
feature that only describes what a manager sees, or only what an employee sees, is
under-specified. Where a feature is genuinely single-role, the specification MUST say
so explicitly and state why the other role has no interaction with it, rather than
leaving it unaddressed.

**Rationale**: Silent gaps between roles are a recurring source of both access-control
bugs and confusing user experience; requiring both perspectives up front catches this
at design time instead of in production.

### III. Offline Resilience
Viewing an already-loaded schedule and clocking in/out MUST continue to function, in a
clearly degraded but honest form, when connectivity is poor or absent. Actions taken
while offline MUST be queued locally and synchronized automatically once connectivity
returns, without silent data loss or silent duplication. The user MUST always be able
to tell, from the interface, whether an action is confirmed, pending sync, or failed.
Features that inherently require a live connection (e.g., real-time approval by
another party) MAY fail fast offline, but MUST say so clearly rather than hanging or
failing silently.

**Rationale**: Shift work happens in warehouses, retail floors, and other places with
unreliable connectivity; a shift tracker that stops working without a signal fails at
its core job.

### IV. Simplicity Over Cleverness
When a well-supported, built-in platform capability can satisfy a requirement, it MUST
be preferred over introducing custom infrastructure, novel abstractions, or bespoke
protocols to do the same job. Added complexity (a new layer, a new sync mechanism, a
new state store) MUST be justified in writing by a concrete requirement that built-in
capabilities cannot meet. Simplicity is evaluated at the level of the whole system, not
just a single file: a "simple" module that forces complexity onto everything around it
does not count.

**Rationale**: A small team maintaining a mobile app benefits far more from
predictable, well-documented platform behavior than from custom mechanisms that only
the original author fully understands.

### V. Consistent Design System
All screens MUST draw from one shared set of components and one shared theme
definition for colors, spacing, and typography. A screen MUST NOT define its own
one-off colors, spacing values, or type styles when an equivalent already exists in the
shared theme. New visual patterns are added to the shared system before being used, not
copy-pasted locally and reconciled later.

**Rationale**: Consistency reduces user confusion, speeds up development by giving
every new screen a working starting point, and prevents accessibility and branding
regressions caused by ad hoc styling.

### VI. Type Safety
All code MUST use strong, static typing; `any`-equivalent escape hatches require an
explicit, written justification at the point of use. Data models representing shifts,
users, roles, timekeeping entries, and approvals MUST be defined once and kept in sync
with whatever is treated as the source of truth for that data — client-side types MUST
be regenerated or manually updated whenever the source-of-truth shape changes, not
allowed to silently drift.

**Rationale**: Shift, pay, and approval data is consequential to get right; type
mismatches between client and source of truth are a common cause of silent data
corruption and hard-to-reproduce bugs.

### VII. Testable Business Logic
Shift conflict detection, overtime calculation, and approval workflow logic MUST be
implemented as pure functions or equivalent logic that is decoupled from UI code and
unit-testable without rendering any screen. This logic MUST have unit tests covering
its edge cases (boundary times, overlapping shifts, threshold crossings, multi-step
approval/rejection paths) independent of any UI or integration test. UI code may call
this logic but MUST NOT re-implement it inline.

**Rationale**: These three areas are where incorrect behavior has the most direct
impact on pay and scheduling correctness; keeping them pure and isolated makes them
verifiable and prevents logic from silently forking between screens.

### VIII. Accessibility
Every interactive element MUST be operable via screen reader and MUST meet the
platform's minimum tap target size. Meaning conveyed by color MUST also be conveyed by
a non-color signal (text, icon, or pattern). No feature is complete until it has been
checked against these two requirements.

**Rationale**: Shift workers using this app on the job are a broad and varied
population; accessibility is a baseline usability requirement, not an optional
enhancement.

## Non-Negotiables (Security & Data Standards)

The following rules admit no exceptions and no per-feature justification overrides
them:

- **No committed secrets**: No credential, API key, token, or secret of any kind MUST
  be committed to client code or to version control, in any branch or history. Secrets
  belong in a secret-management mechanism external to the client bundle and the
  repository.
- **Timezone-independent storage**: All timestamps MUST be stored in a consistent,
  timezone-independent format (e.g., an absolute instant). Conversion to a local
  timezone for display MUST happen only at the point of display, never baked into
  stored data.
- **Explicit confirmation for destructive actions**: Any destructive action — deleting
  a shift, removing a staff member, or any other irreversible change — MUST require an
  explicit, unambiguous confirmation step before it executes. A single accidental tap
  MUST NOT be sufficient to perform a destructive action.
- **Closed account creation**: There is no public or self-service sign-up. Every
  account, including every manager/admin account except the single first
  pre-provisioned account, MUST be created by an existing manager or admin. No feature
  MAY introduce a path for a user to create their own account or grant themselves a
  role.

## Governance

This constitution takes precedence over any other project practice, template, or prior
convention when the two conflict. All feature specifications, technical plans, and
task breakdowns MUST demonstrate compliance with the Core Principles and the
Non-Negotiables before being approved for implementation; any deviation MUST be
justified in writing in the plan's complexity-tracking section, with the justification
naming the specific principle at stake and why no simpler compliant option exists.

**Amendment procedure**: A change to this constitution MUST be proposed in writing,
stating the specific section changed and the reason. Upon acceptance, the version is
bumped per the versioning policy below, `LAST_AMENDED_DATE` is updated to the date of
acceptance, and any templates or workflows that reference the changed guidance are
reviewed for consistency in the same change.

**Versioning policy**: This constitution is versioned MAJOR.MINOR.PATCH.
- MAJOR: backward-incompatible removal or redefinition of a principle or
  non-negotiable.
- MINOR: a new principle, non-negotiable, or materially expanded guidance is added.
- PATCH: wording clarifications, typo fixes, or non-semantic refinements.

**Compliance review**: Every plan and every pull request MUST be checked against this
constitution before merge. Reviewers MUST reject work that weakens a Non-Negotiable or
that fails to address both roles under Principle II, regardless of how minor the
change appears.

**Version**: 1.0.0 | **Ratified**: 2026-08-20 | **Last Amended**: 2026-08-20
