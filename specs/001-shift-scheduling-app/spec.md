# Feature Specification: Mobile Shift Scheduling App

**Feature Branch**: `001-shift-scheduling-app`

**Created**: 2026-08-20

**Status**: Draft

**Input**: User description: "Build a mobile shift management app for hourly and shift-based workplaces such as retail, hospitality, and healthcare. The app has two user roles, employee and manager/admin. Account creation model: there is no public sign-up... [full description provided by user, covering account provisioning, shift-leader scoped permissions, employee capabilities, manager/admin capabilities, and the shift creation/staffing, shift swap, time-off, clock-in/out, and open-shift-claim workflows]"

## Clarifications

### Session 2026-08-20

- Q: How should a brand-new employee or manager first get into the app — by setting their own password via an invite, or with a password the manager hands them? → A: Email or SMS invite — new user sets their own password via a link/code.
- Q: What should the default geofence radius be for clock-in/out location checks, and does a manager set it per location or is it one fixed value app-wide? → A: Per-location configurable radius, default 150 meters.
- Q: When more than one eligible employee claims the same open shift before a manager acts, how is the winner picked — automatically first-come, or does the manager always choose? → A: All claimants are shown to the manager, who picks whichever one they want, regardless of claim order.
- Q: Should the "reason" field on a time-off request be required, or can an employee submit a request with no reason given? → A: Required — request cannot be submitted without a reason.
- Q: How should overtime be calculated — hours over a daily threshold, hours over a weekly threshold, or both — and is that threshold fixed or manager-configurable? → A: Fixed daily threshold only (over 8 hours/day), not configurable.

### Session 2026-08-20 (resolved during /speckit-plan)

- Q: Can a manager/admin account be scoped to a single location, or must it be able to manage
  multiple locations/departments in v1? → A: A manager/admin account is scoped to exactly one
  home location in v1; it manages staff, shifts, and reports for that location only. A person
  who oversees multiple locations gets a separate manager account per location for v1.
  Cross-location oversight for a single account is deferred to a future version.
- Q: How long must past schedules and timesheets remain available, and can they ever be purged
  or archived? → A: Schedules and timesheets are retained indefinitely in v1 with no automatic
  purge or archival; deactivating a staff account never deletes their historical shift or
  timesheet records. Time-boxed retention/archival policy (e.g., for a specific jurisdiction's
  compliance requirement) is deferred to a future version, to be revisited once a target
  region is known.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manager onboards staff without public sign-up (Priority: P1)

A manager, starting from a single pre-provisioned manager account, creates accounts for
employees and other managers by entering their name, role, location, and initial access
method. No one can create their own account; every account traces back to a manager who
created it.

**Why this priority**: Nothing else in the system works until staff have accounts. This is
the foundation every other story depends on, and it is also the story that enforces the
closed-account security model.

**Independent Test**: Can be fully tested by having the seeded manager account log in, create
one employee account and one additional manager account, and verify both new accounts can
sign in and see only the login screen's sign-in and password-reset options (no create-account
path exists anywhere in the app).

**Acceptance Scenarios**:

1. **Given** a freshly installed app with only the pre-provisioned manager account existing,
   **When** that manager signs in, **Then** they land on a manager dashboard and have no
   account-creation step of their own to complete.
2. **Given** a signed-in manager, **When** they create a new employee account with a name,
   role, and location, **Then** the account is created inactive until the employee completes
   their first access step, and the manager sees it listed among staff.
3. **Given** the login screen, **When** any user opens it, **Then** they see only sign-in and
   "forgot/reset password" options, with no way to register a new account.
4. **Given** a signed-in manager, **When** they deactivate a staff account, **Then** that
   account can no longer sign in, but its historical shifts and timesheets remain visible in
   reports.

---

### User Story 2 - Employee views their schedule and shift details (Priority: P2)

An employee opens the app and sees their upcoming shifts on a calendar (day, week, and month
views), and can tap into any shift to see its time, location, area, role, and any manager
notes.

**Why this priority**: This is the single most frequent action employees take and the core
reason to install the app; it delivers value the moment accounts and shifts exist, without
requiring any other workflow to be built first.

**Independent Test**: Can be fully tested by staffing an employee on at least one shift and
confirming they can find and view it in all three calendar views with full shift details.

**Acceptance Scenarios**:

1. **Given** an employee staffed on three shifts across two weeks, **When** they open the
   calendar, **Then** all three shifts appear correctly on their respective dates in day,
   week, and month views.
2. **Given** an employee viewing their calendar, **When** they tap a shift, **Then** they see
   its start/end time, location, area, their assigned role for that shift, and any notes the
   manager attached.
3. **Given** an employee with no shifts staffed in a given week, **When** they view that week,
   **Then** the app clearly shows they have no shifts rather than an ambiguous empty screen.

---

### User Story 3 - Manager builds and staffs the schedule (Priority: P3)

A manager creates a shift by naming it and setting its start/end date and time only — with no
staff attached — and later, in a separate step, opens that shift to assign one employee as
shift leader and any number of employees as shift workers. The system flags conflicts such as
double-booking or insufficient rest once staff are assigned.

**Why this priority**: This is how shifts and their staffing come to exist at all, which is
required before employees have anything to view, clock into, swap, or claim — but it is
ranked after the viewing story because the two-step creation/staffing distinction is the
system's most structurally important behavior and deserves to be verified in isolation.

**Independent Test**: Can be fully tested by creating a shift with no staff, confirming it
appears unstaffed on the schedule, then staffing it in a separate action and confirming the
staffing can later be edited without touching the shift's name or time.

**Acceptance Scenarios**:

1. **Given** a manager on the schedule screen, **When** they create a shift with only a name
   and start/end date-time, **Then** the shift appears on the schedule as unstaffed with no
   employees attached.
2. **Given** an existing unstaffed shift, **When** the manager opens it and assigns one
   employee as shift leader and two others as shift workers, **Then** all three appear as
   staffed on that shift and the designated leader gains shift-scoped staffing and
   approval permissions for that shift only.
3. **Given** a staffed shift, **When** the manager edits only the staffing (e.g., swaps one
   shift worker for another), **Then** the shift's name, start time, and end time remain
   unchanged.
4. **Given** an employee already staffed on an overlapping shift, **When** a manager attempts
   to staff that same employee on a conflicting shift, **Then** the manager sees a
   double-booking conflict warning before confirming.
5. **Given** an employee whose prior shift ends too close to a new shift's start time, **When**
   a manager attempts to staff them on the new shift, **Then** the manager sees an
   insufficient-rest conflict warning before confirming.
6. **Given** a shift leader designated on a shift, **When** that employee opens the staffing
   screen for that specific shift, **Then** they can reassign staff on it but have no option to
   create a new shift.

---

### User Story 4 - Employee clocks in and out with location verification (Priority: P4)

An employee taps clock in at the start of their shift; the app checks their GPS position
against the shift's assigned location within a configurable radius, allowing the clock-in to
proceed either way but flagging it for manager review if outside the radius. The same applies
to clock-out, and the resulting hours automatically populate the employee's timesheet.

**Why this priority**: This is the operational core of tracking actual hours worked, and it
depends on shifts already existing and being staffed (Story 3), so it is sequenced after
schedule-building.

**Independent Test**: Can be fully tested by staffing an employee on a shift, clocking in and
out from within the geofence and confirming clean timesheet entries, then repeating from
outside the geofence and confirming the action still succeeds but is flagged for manager
review.

**Acceptance Scenarios**:

1. **Given** an employee at their shift's assigned location, **When** they tap clock in,
   **Then** the clock-in is recorded with no flag and a running shift timer starts.
2. **Given** an employee outside the configured geofence radius for their shift's location,
   **When** they tap clock in, **Then** the clock-in still succeeds but is flagged for manager
   review.
3. **Given** an employee who has clocked in, **When** they tap clock out at the end of their
   shift, **Then** the same location check applies and the shift's worked hours are computed
   and added to their timesheet.
4. **Given** a completed pay period, **When** an employee views their timesheet, **Then** they
   see hours worked per day and per pay period, split into regular and overtime hours.

---

### User Story 5 - Employee requests a shift swap and it is approved (Priority: P5)

An employee selects one of their shifts, sees eligible coworkers with no scheduling
conflicts, and sends a swap request. The coworker accepts or declines; an accepted request
then goes to the manager, or to the shift's designated shift leader if one exists, for final
approval. Both employees are notified of the outcome.

**Why this priority**: Swaps are a high-value convenience feature but depend on shifts,
staffing, and the shift-leader designation already existing (Stories 2–3), so they are
sequenced after the core scheduling and viewing flows.

**Independent Test**: Can be fully tested end-to-end by having one staffed employee request a
swap with an eligible coworker, having the coworker accept, having the manager (or shift
leader) approve, and confirming both employees see the updated staffing and a notification of
the outcome.

**Acceptance Scenarios**:

1. **Given** an employee viewing one of their shifts, **When** they open the swap flow,
   **Then** they see only coworkers who are eligible and have no conflicting shifts.
2. **Given** a sent swap request, **When** the target coworker declines, **Then** the requesting
   employee is notified the swap was declined and no approval step occurs.
3. **Given** a coworker who accepts a swap request, **When** the shift has no designated
   shift leader, **Then** the request routes to the manager for final approval.
4. **Given** a coworker who accepts a swap request, **When** the shift has a designated shift
   leader, **Then** that shift leader can approve or deny the request for that shift, acting
   as an approver alongside the manager.
5. **Given** a shift leader who leads shift A but not shift B, **When** they attempt to act on
   a swap request for shift B, **Then** the app does not permit them to approve or deny it.
6. **Given** an approved swap, **When** the approval is recorded, **Then** the shift's staffing
   updates immediately and both employees receive a notification of the outcome.

---

### User Story 6 - Employee requests time off and manager reviews it (Priority: P6)

An employee submits a date range and reason for time off. The manager reviews it against
coverage needs and approves or denies it with an optional comment. The employee is notified,
and approved time off blocks that employee from being scheduled during that range.

**Why this priority**: Time off is a regular but lower-frequency workflow than swaps and
clock-in, and its enforcement (blocking scheduling) depends on the schedule-building story
already existing.

**Independent Test**: Can be fully tested by submitting a time-off request, having the manager
approve it, and confirming a manager can no longer staff that employee on a shift that falls
within the approved range.

**Acceptance Scenarios**:

1. **Given** an employee on the time-off screen, **When** they submit a date range and reason,
   **Then** the request appears as pending for both the employee and the manager.
2. **Given** a pending time-off request, **When** the manager approves it with an optional
   comment, **Then** the employee is notified of the approval and the comment if one was given.
3. **Given** a pending time-off request, **When** the manager denies it with an optional
   comment, **Then** the employee is notified of the denial and the comment if one was given.
4. **Given** an employee with approved time off covering a date, **When** a manager attempts to
   staff that employee on a shift during that date, **Then** the manager is prevented from
   doing so or is clearly warned of the conflict.

---

### User Story 7 - Manager posts an open shift and an employee claims it (Priority: P7)

A manager posts an unfilled shift to an open shift board. Eligible employees see it and can
claim it; the manager gives final confirmation before the claim is locked in.

**Why this priority**: This is a valuable but supplementary way to fill gaps in the schedule,
building on staffing and eligibility concepts already established in earlier stories.

**Independent Test**: Can be fully tested by posting one unfilled shift, having an eligible
employee claim it, and confirming the shift remains unconfirmed until the manager gives final
approval, after which it appears as staffed for that employee.

**Acceptance Scenarios**:

1. **Given** an unstaffed shift, **When** the manager posts it to the open shift board,
   **Then** only employees eligible for that shift (by role, location, and no conflicts) see
   it there.
2. **Given** an open shift, **When** an eligible employee claims it, **Then** the claim is
   marked pending manager confirmation and the shift does not yet show as staffed.
3. **Given** a pending claim, **When** the manager gives final confirmation, **Then** the
   claiming employee is staffed on the shift and it is removed from the open shift board.
4. **Given** multiple employees claiming the same open shift before manager confirmation,
   **When** the manager views the shift, **Then** they see all claimants (regardless of claim
   order) and may confirm whichever one they choose; the other claimants are then notified the
   shift is no longer available.

---

### User Story 8 - Manager oversees coverage, reporting, and communication (Priority: P8)

A manager views a dashboard summarizing today's coverage, open shifts, and pending approvals;
manages location "area" labels (e.g., Floor, Till, Stockroom) used to tag shifts; reviews
labor and attendance reports; and sends broadcast announcements to a team, a location, or a
specific shift's staff.

**Why this priority**: These are oversight and communication capabilities that add
significant management value but are not required for the core employee-facing workflows to
function, making this the lowest-priority independently shippable slice.

**Independent Test**: Can be fully tested by confirming the dashboard reflects real shift and
approval data, that a manager can create/rename/remove an area label and see it selectable
when staffing a shift (with employees never seeing the creation screen), and that a broadcast
sent to a specific shift's staff reaches only those employees.

**Acceptance Scenarios**:

1. **Given** shifts with unfilled staffing and pending swap/time-off requests, **When** a
   manager opens the dashboard, **Then** they see accurate counts of today's coverage, open
   unfilled shifts, and pending approvals.
2. **Given** a manager on the area-management screen, **When** they create a new area label,
   **Then** it becomes selectable when creating or staffing any shift, and no employee-facing
   screen exposes the ability to create, rename, or remove area labels.
3. **Given** historical shift and timesheet data, **When** a manager opens reports, **Then**
   they can view labor cost versus budget, hours by employee, attendance/no-show trends, and
   overtime trends.
4. **Given** a manager sending a broadcast to a specific shift's staff, **When** the broadcast
   is sent, **Then** only the employees staffed on that shift receive it.

---

### Edge Cases

- What happens when a manager deactivates an employee who is currently the designated shift
  leader on a future shift? The leader designation on that shift must be cleared or
  reassigned, and the shift must not be left with an inaccessible staffing screen.
- What happens when a shift leader's designation is removed mid-swap-approval (e.g., they are
  reassigned off the shift after a swap request was submitted but before they acted on it)?
  The pending request must fall back to the manager as approver.
- How does the system handle a clock-in attempt for a shift that was cancelled or reassigned
  after the employee last synced their schedule?
- How does the system handle two managers editing the same shift's staffing at the same time?
- What happens when an employee's device has no connectivity at clock-in or clock-out time?
  The action must be queued locally and synced once connectivity returns, with the employee
  able to see it is pending sync rather than confirmed.
- What happens when an approved time-off request is later found to overlap a shift the
  employee was already staffed on before the request was approved? The manager must be
  alerted to resolve the conflict.
- What happens when an open shift claim is made by an employee who becomes ineligible (e.g.,
  goes on approved time off) between claiming and manager confirmation?
- How does the system handle a swap request where the shift is claimed by a second workflow
  (e.g., cancelled by the manager) while the request is still pending?

## Requirements *(mandatory)*

### Functional Requirements

**Accounts, Roles, and Access**

- **FR-001**: The system MUST support exactly two account role classes: employee and
  manager/admin.
- **FR-002**: The system MUST provide no public or self-service sign-up path anywhere in the
  app; the login screen MUST offer only sign-in and forgot/reset-password options.
- **FR-003**: The system MUST come with exactly one manager account pre-provisioned before any
  other account can be created, and that account MUST NOT be created through the app's own UI.
- **FR-004**: The system MUST allow a signed-in manager to create new employee or
  manager/admin accounts by specifying name, role, and location, and to assign an initial
  method for that person to gain access.
- **FR-005**: The system MUST NOT provide any mechanism for a user to register their own
  account or elevate their own role.
- **FR-006**: The system MUST allow a manager to edit staff details (role, pay rate, location)
  and to deactivate a staff account, and a deactivated account MUST be immediately unable to
  sign in while its historical records remain intact for reporting.
- **FR-007**: New manager-created accounts MUST use an email or SMS invite — sent to the
  contact method on file — that lets the new user set their own password, as their initial
  access method. An account remains inactive/unable to sign in until this invite step is
  completed.

**Shift Leader (scoped, temporary designation)**

- **FR-008**: The system MUST treat "shift leader" as a per-shift designation assigned during
  staffing, not as a distinct account role; a shift leader's underlying account remains an
  employee account.
- **FR-009**: A shift leader MUST be able to access the staffing screen only for the specific
  shift(s) they are designated leader on, to assign or reassign the workers staffed on that
  shift.
- **FR-010**: A shift leader MUST NOT be able to create new shifts; shift creation remains
  restricted to manager/admin accounts.
- **FR-011**: A shift leader MUST be able to approve or deny shift swap or reassignment
  requests that involve a shift they lead, acting as an approver alongside the manager for
  that shift only.
- **FR-012**: A shift leader MUST NOT be able to approve or deny requests on any shift they do
  not currently lead.
- **FR-013**: All shift-leader permissions MUST apply only while the employee remains the
  designated leader on that specific shift, and MUST be revoked immediately if the
  designation is removed or reassigned.

**Employee Capabilities**

- **FR-014**: Employees MUST be able to view their upcoming shifts in day, week, and month
  calendar views.
- **FR-015**: Employees MUST be able to view a shift's time, location, area, role, and notes.
- **FR-016**: Employees MUST be able to set recurring availability and block out specific
  unavailable dates.
- **FR-017**: Employees MUST be able to request a shift swap with an eligible coworker and see
  the request's status as pending, approved, or denied.
- **FR-018**: Employees MUST be able to submit a time-off request with a date range and a
  required reason (the request cannot be submitted with the reason left blank), and see its
  status.
- **FR-019**: Employees MUST be able to clock in and out of a shift, with the action location-
  checked against the shift's assigned location.
- **FR-020**: Employees MUST be able to view a personal timesheet showing hours worked per day
  and per pay period, split into regular and overtime hours, where overtime is any worked
  time beyond a fixed daily threshold of 8 hours (hours worked on a given day beyond 8 count
  as overtime; this threshold is not configurable).
- **FR-021**: Employees MUST be able to view a directory of coworkers on their team.
- **FR-022**: Employees MUST receive push notifications for: shift assigned, shift changed,
  swap approved or denied, time-off approved or denied, and upcoming shift reminders.
- **FR-023**: Employees MUST be able to manage their own profile details and notification
  preferences.
- **FR-024**: Employees MUST NOT have access to any area/location-label creation, staff
  management, or reporting screens.

**Manager/Admin Capabilities**

- **FR-025**: Managers MUST be able to view a dashboard summarizing today's coverage, open
  unfilled shifts, and pending approvals.
- **FR-026**: The system MUST separate shift creation from shift staffing into two distinct
  steps: creating a shift MUST require only a name and a start/end date-time and MUST result
  in an unstaffed shift; staffing a shift MUST be a separate action, performable at any later
  time, that assigns one employee as shift leader and any number of employees as shift
  workers.
- **FR-027**: Managers MUST be able to edit a shift's staffing independently of its name or
  time, and to edit its name or time independently of its staffing.
- **FR-028**: The system MUST detect and warn of scheduling conflicts — including double-
  booking an employee across overlapping shifts and insufficient rest between an employee's
  consecutive shifts — at the point staff are assigned or reassigned.
- **FR-029**: Managers MUST be able to post an unfilled shift to an open shift board visible to
  eligible employees, and MUST give final confirmation before a claim is locked in.
- **FR-030**: Managers MUST be able to review, and approve or deny, shift swap and time-off
  requests, with an optional comment on the decision.
- **FR-031**: Managers MUST be able to add, edit, and deactivate staff accounts, and assign
  each one a role, pay rate, and location.
- **FR-031a**: A manager/admin account MUST be scoped to exactly one location; a manager MUST
  only be able to view, create, edit, or staff shifts, area labels, and staff records for
  their own location, and MUST NOT see or act on another location's data. A person overseeing
  multiple locations uses a separate manager account per location in v1.
- **FR-032**: Managers MUST be able to create, rename, and remove area/zone labels (e.g.,
  Floor, Till, Stockroom) scoped to a location, through a screen that is not visible or
  accessible to employee accounts.
- **FR-033**: Area/zone labels MUST be selectable when creating or staffing a shift, and
  employees MUST only see the label already attached to a shift, never the management screen
  that created it.
- **FR-034**: Managers MUST be able to view reports covering labor cost versus budget, hours by
  employee, attendance and no-show trends, and overtime trends.
- **FR-035**: Managers MUST be able to send broadcast announcements scoped to a team, a
  location, or the staff of a specific shift.
- **FR-036**: An approved time-off request MUST block that employee from being newly scheduled
  during the approved date range, and MUST warn a manager who attempts to do so anyway.
- **FR-036a**: The system MUST retain schedule, staffing, swap, time-off, and timesheet
  records indefinitely; deactivating a staff account MUST NOT delete or hide that person's
  historical records from reports.

**Clock-In / Clock-Out**

- **FR-037**: The system MUST check the employee's device location against the shift's
  assigned location using a geofence radius that is configurable per location by a manager
  (default 150 meters), applied at both clock-in and clock-out.
- **FR-038**: A clock-in or clock-out outside the configured geofence radius MUST still be
  permitted to complete, but MUST be flagged for manager review rather than blocked.
- **FR-039**: Completed clock-in/clock-out pairs MUST automatically compute worked hours and
  populate the employee's timesheet without manual re-entry.
- **FR-040**: Clock-in and clock-out actions taken while the device has no connectivity MUST be
  queued locally and MUST sync automatically once connectivity is restored, without silent
  data loss.

**Shift Swap and Open Shift Claim**

- **FR-041**: The system MUST determine swap eligibility for a coworker based on having no
  scheduling conflicts with the shift being swapped, and MUST present only eligible coworkers
  to the requesting employee.
- **FR-042**: An accepted swap request MUST route to the manager for final approval, or to the
  shift's designated shift leader as an additional/alternate approver if one exists, and
  either approver's decision MUST be treated as final for that request.
- **FR-043**: Both parties to a swap request MUST be notified of its final outcome.
- **FR-044**: The system MUST determine open-shift-claim eligibility using the same criteria as
  swap eligibility (role, location, no scheduling conflicts).
- **FR-045**: An open shift claim MUST remain unconfirmed, and the shift MUST remain shown as
  unfilled, until a manager gives final confirmation.
- **FR-046**: When multiple eligible employees claim the same open shift, the system MUST
  present all claimants to the manager, in no particular priority order, and let the manager
  confirm whichever claimant they choose; claim order MUST NOT automatically determine the
  outcome.

### Key Entities

- **User Account**: Represents a person who can sign in; has a name, a role class (employee
  or manager/admin), a location, contact info for notifications, an active/inactive status,
  and (for employees) a pay rate. Created only by an existing manager/admin, except the single
  pre-provisioned first manager account.
- **Shift**: Represents a block of scheduled work; has a name, start date-time, end date-time,
  an assigned location and area/zone label, and optional notes. Exists independently of any
  staffing.
- **Shift Assignment**: Links a User Account to a Shift with a role on that shift (shift
  leader or shift worker). The shift-leader designation is scoped to one Shift Assignment
  record and does not change the underlying account's role class.
- **Availability**: A record of an employee's recurring available time and specific blocked-
  out dates, used to inform staffing and conflict detection.
- **Time-Off Request**: Represents an employee's request for a date range off, with a reason,
  a status (pending/approved/denied), and an optional manager comment.
- **Shift Swap Request**: Represents a request to change the staffing of a specific Shift
  Assignment from one employee to a coworker; tracks the coworker's accept/decline decision
  and the approver's (manager or shift leader) approve/deny decision.
- **Open Shift Posting**: Represents an unstaffed Shift made visible to eligible employees for
  claiming; tracks claimant(s) and manager confirmation status.
- **Clock Event**: Represents a single clock-in or clock-out action tied to a Shift Assignment,
  with a timestamp, recorded device location, and a flag indicating whether it fell outside
  the configured geofence.
- **Timesheet Entry**: Aggregates Clock Events into worked hours per day and per pay period,
  split into regular and overtime hours.
- **Area/Zone Label**: A manager-defined tag (e.g., Floor, Till, Stockroom) scoped to a
  location, selectable when creating or staffing a Shift.
- **Announcement**: A broadcast message created by a manager, scoped to a team, a location, or
  a specific shift's staffed employees.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A manager can create a new staff account and have that person able to sign in
  within 5 minutes of account creation.
- **SC-002**: An employee can locate any of their upcoming shifts and view its full details in
  under 10 seconds from opening the app.
- **SC-003**: A manager can create a new shift and separately staff it, end to end, in under 2
  minutes combined.
- **SC-004**: At least 95% of clock-in and clock-out attempts complete successfully (recorded,
  flagged, or queued for sync) without the employee needing to retry or contact a manager.
- **SC-005**: 100% of shift staffing actions that would create a double-booking or
  insufficient-rest conflict are flagged to the manager before the assignment is confirmed.
- **SC-006**: A shift swap request that is accepted by a coworker reaches a final
  approve/deny decision, and both parties are notified, within one business day in typical
  use.
- **SC-007**: An approved time-off request reliably prevents that employee from appearing as a
  valid staffing option for a conflicting shift, with zero exceptions observed in testing.
- **SC-008**: Managers report they can determine today's staffing coverage and outstanding
  approvals from the dashboard without needing to cross-reference any other screen.
- **SC-009**: Actions taken while offline (clock-in/out) are synced and correctly reflected in
  the timesheet within 1 minute of connectivity being restored.

## Assumptions

- The pre-provisioned first manager account is created and delivered outside the app (e.g., by
  whoever provisions the system for a business), not through any in-app flow; how exactly it
  is provisioned is an operational/technical concern for the implementation plan, not this
  specification.
- Password reset ("forgot password") uses a standard identity-verification step (e.g., a reset
  link or code sent to the account's registered contact method) and is not otherwise
  elaborated here, as it is a well-understood standard pattern.
- Swap and open-shift-claim eligibility is determined by matching role and location and
  having no scheduling conflicts with the shift in question; a business may have finer-grained
  eligibility needs, but this is a reasonable default for v1.
- The minimum rest period used for insufficient-rest conflict detection is configurable by a
  manager/admin rather than hard-coded, since rest requirements vary by workplace and
  jurisdiction.
- Employees can see their own regular/overtime hour totals on their timesheet; whether dollar
  amounts are shown alongside hours is a manager-configurable display preference, not a fixed
  requirement.
- Open shift claiming shows all eligible claimants to the manager without regard to claim
  order; no claim is final until the manager gives explicit confirmation, resolving the "first
  to claim or manager-selected" phrasing in the source description in favor of manager choice.
- Payroll processing, payment disbursement, a native desktop app, and complex shift bidding/
  auction mechanics are out of scope for this version, per the source description; timesheet
  data export for downstream payroll processing is in scope.

## Out of Scope

- Payroll processing or payment disbursement (timesheet export for downstream payroll
  processing is in scope; the disbursement itself is not).
- A native desktop application.
- Complex shift bidding or auction systems beyond the single-claim-with-manager-confirmation
  open shift board described above.
