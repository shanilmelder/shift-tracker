"""
Builds the Shift Tracker presentation as a .pptx.

Walkthrough slides carry a labelled placeholder where a screenshot goes, rather than a
stand-in image. The design mockups in docs/design/screens are stale relative to what was
built (they show a role-picker the app does not have), and presenting them as screenshots of
the running application would misrepresent it. Each placeholder names the exact screen to
capture and the route to reach it — see docs/report/SCREENSHOT-GUIDE.md.

Drop a PNG into docs/report/screenshots/ using the filename each slide names, then re-run:
the image is picked up automatically and the placeholder disappears.

Run:  python docs/report/build_slides.py
"""

import os

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Inches, Pt

# Pulled from the app's own design tokens (app/src/components/theme.ts) so the deck matches
# the product rather than defaulting to Office blue.
GREEN = RGBColor(0x1F, 0x6F, 0x4A)
GREEN_DARK = RGBColor(0x17, 0x5A, 0x3B)
INK = RGBColor(0x1C, 0x1F, 0x1C)
MUTED = RGBColor(0x5F, 0x63, 0x5C)
LIGHT = RGBColor(0xFA, 0xFA, 0xF8)
SURFACE_MUTED = RGBColor(0xF2, 0xF1, 0xED)
BORDER = RGBColor(0xE3, 0xE1, 0xDA)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
AMBER = RGBColor(0xC2, 0x41, 0x0C)

FONT = "Calibri"
SHOTS_DIR = "docs/report/screenshots"

# 16:9
W, H = Inches(13.333), Inches(7.5)


def _text(frame, text, size, bold=False, color=INK, align=PP_ALIGN.LEFT, space_after=6):
    p = frame.paragraphs[0] if not frame.paragraphs[0].runs and not frame.paragraphs[0].text else frame.add_paragraph()
    p.alignment = align
    p.space_after = Pt(space_after)
    run = p.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = FONT
    return p


def _blank(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, W, H)
    bg.fill.solid()
    bg.fill.fore_color.rgb = LIGHT
    bg.line.fill.background()
    bg.shadow.inherit = False
    return slide


def _heading(slide, title, kicker=None):
    if kicker:
        box = slide.shapes.add_textbox(Inches(0.7), Inches(0.45), Inches(11.9), Inches(0.35))
        _text(box.text_frame, kicker.upper(), 12, bold=True, color=GREEN)
    box = slide.shapes.add_textbox(Inches(0.7), Inches(0.75), Inches(11.9), Inches(0.9))
    _text(box.text_frame, title, 32, bold=True, color=INK)
    rule = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.7), Inches(1.62), Inches(1.6), Pt(3))
    rule.fill.solid()
    rule.fill.fore_color.rgb = GREEN
    rule.line.fill.background()
    rule.shadow.inherit = False


def _bullets(slide, items, left=0.7, top=2.0, width=11.9, size=17, gap=14):
    box = slide.shapes.add_textbox(Inches(left), Inches(top), Inches(width), Inches(4.6))
    tf = box.text_frame
    tf.word_wrap = True
    for i, item in enumerate(items):
        if isinstance(item, tuple):
            head, detail = item
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.space_after = Pt(gap)
            r = p.add_run()
            r.text = f"{head}  "
            r.font.size = Pt(size)
            r.font.bold = True
            r.font.color.rgb = INK
            r.font.name = FONT
            r2 = p.add_run()
            r2.text = detail
            r2.font.size = Pt(size)
            r2.font.color.rgb = MUTED
            r2.font.name = FONT
        else:
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.space_after = Pt(gap)
            r = p.add_run()
            r.text = f"•  {item}"
            r.font.size = Pt(size)
            r.font.color.rgb = INK
            r.font.name = FONT


def _card(slide, left, top, width, height, title, lines, accent=GREEN):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
    card.fill.solid()
    card.fill.fore_color.rgb = WHITE
    card.line.color.rgb = BORDER
    card.line.width = Pt(1)
    card.shadow.inherit = False
    card.adjustments[0] = 0.06

    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(left), Inches(top), Inches(width), Pt(4))
    bar.fill.solid()
    bar.fill.fore_color.rgb = accent
    bar.line.fill.background()
    bar.shadow.inherit = False

    box = slide.shapes.add_textbox(Inches(left + 0.25), Inches(top + 0.22), Inches(width - 0.5), Inches(height - 0.4))
    tf = box.text_frame
    tf.word_wrap = True
    _text(tf, title, 15, bold=True, color=INK, space_after=8)
    for line in lines:
        p = tf.add_paragraph()
        p.space_after = Pt(4)
        r = p.add_run()
        r.text = line
        r.font.size = Pt(12)
        r.font.color.rgb = MUTED
        r.font.name = FONT


def _screenshot(slide, filename, caption):
    """A phone-shaped slot on the right: the image if present, a labelled placeholder if not."""
    left, top, width, height = Inches(8.9), Inches(1.35), Inches(3.4), Inches(5.6)
    path = os.path.join(SHOTS_DIR, filename)

    if os.path.exists(path):
        slide.shapes.add_picture(path, left, top, height=height)
        return True

    slot = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    slot.fill.solid()
    slot.fill.fore_color.rgb = SURFACE_MUTED
    slot.line.color.rgb = BORDER
    slot.line.width = Pt(1.5)
    slot.line.dash_style = 4  # dashed, so it reads as "to be filled"
    slot.shadow.inherit = False

    tf = slot.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    _text(tf, "SCREENSHOT", 12, bold=True, color=AMBER, align=PP_ALIGN.CENTER, space_after=8)
    p = tf.add_paragraph()
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = caption
    r.font.size = Pt(11)
    r.font.color.rgb = MUTED
    r.font.name = FONT
    p2 = tf.add_paragraph()
    p2.alignment = PP_ALIGN.CENTER
    r2 = p2.add_run()
    r2.text = f"\nsave as\n{filename}"
    r2.font.size = Pt(9)
    r2.font.color.rgb = MUTED
    r2.font.italic = True
    r2.font.name = FONT
    return False


def _walkthrough(prs, kicker, title, points, filename, caption, missing):
    slide = _blank(prs)
    _heading(slide, title, kicker)
    _bullets(slide, points, width=7.8, size=15, gap=12)
    if not _screenshot(slide, filename, caption):
        missing.append((filename, caption))
    return slide


def build():
    prs = Presentation()
    prs.slide_width, prs.slide_height = W, H
    missing = []

    # ---------------------------------------------------------------- title
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, W, H)
    bg.fill.solid()
    bg.fill.fore_color.rgb = GREEN
    bg.line.fill.background()
    bg.shadow.inherit = False
    box = slide.shapes.add_textbox(Inches(1.1), Inches(2.4), Inches(11), Inches(2.6))
    tf = box.text_frame
    tf.word_wrap = True
    _text(tf, "SHIFT TRACKER", 14, bold=True, color=RGBColor(0xB8, 0xDC, 0xC8), space_after=10)
    _text(tf, "Mobile Workforce Scheduling\nwith Conversational Reporting", 40, bold=True, color=WHITE, space_after=18)
    _text(tf, "React Native  ·  Fastify  ·  PostgreSQL  ·  On-device-capable LLM", 16, color=RGBColor(0xD6, 0xEA, 0xE0))
    box2 = slide.shapes.add_textbox(Inches(1.1), Inches(6.2), Inches(11), Inches(0.6))
    _text(box2.text_frame, "Student Name  |  Student ID  |  Module Code", 12, color=RGBColor(0xB8, 0xDC, 0xC8))

    # ---------------------------------------------------------------- problem
    slide = _blank(prs)
    _heading(slide, "The problem", "Context")
    _bullets(slide, [
        ("Shift work runs the service economy.", "Retail, hospitality, healthcare — hours vary weekly, staff are deskless."),
        ("Small operators still use spreadsheets, paper rotas and group chats.", ""),
        ("A rota on a staffroom wall is invisible to anyone off site.", ""),
        ("Swaps agreed in a chat leave no auditable record.", ""),
        ("Paper attendance can't be reconciled against scheduled hours —", "pay disputes become one person's word against another's."),
        ("Commercial tools exist, but price per employee", "and lock the data away from the business that generated it."),
    ])

    # ---------------------------------------------------------------- summary
    slide = _blank(prs)
    _heading(slide, "What Shift Tracker does", "Summary")
    _card(slide, 0.7, 2.0, 3.9, 2.2, "For employees", [
        "See your shifts, and the whole team's rota",
        "Clock in and out with location awareness",
        "Request time off; swap a shift with a colleague",
        "Works offline — actions queue and replay",
    ])
    _card(slide, 4.85, 2.0, 3.9, 2.2, "For managers", [
        "Build and staff the schedule",
        "Approve time off and swaps in one queue",
        "Dashboard of what needs attention today",
        "Create staff accounts; reset passwords",
    ])
    _card(slide, 9.0, 2.0, 3.6, 2.2, "The differentiator", [
        "Ask questions in plain English",
        "\"Who's on the morning shift tomorrow?\"",
        "\"Who took the most time off this month?\"",
        "Answers come from live data, not a guess",
    ], accent=AMBER)
    box = slide.shapes.add_textbox(Inches(0.7), Inches(4.6), Inches(11.9), Inches(1.4))
    tf = box.text_frame
    tf.word_wrap = True
    _text(tf, "Two role-aware apps in one codebase. Every authorisation decision is made server-side — "
              "the mobile client holds no database credential at all.", 15, color=MUTED)

    # ---------------------------------------------------------------- architecture
    slide = _blank(prs)
    _heading(slide, "Architecture", "How it fits together")
    tiers = [
        (0.7, "Mobile client", ["React Native + Expo", "iOS and Android, one codebase", "Offline cache + mutation queue", "Holds NO database credential"], GREEN),
        (4.15, "REST API", ["Fastify on Node 24 (serverless)", "The only component that", "touches the database", "Every authz decision made here"], GREEN_DARK),
        (7.6, "Data + Auth", ["PostgreSQL via Supabase", "Row-level security as backstop", "Managed authentication", "Trigger-enforced integrity"], INK),
        (11.05, "AI", ["Ollama tool-calling", "9 typed tools", "Model never sees the DB", "Relocatable to the edge"], AMBER),
    ]
    for left, title, lines, accent in tiers:
        width = 3.2 if left < 11 else 1.85
        _card(slide, left, 2.15, width, 3.0, title, lines, accent=accent)
    for x in (3.95, 7.4, 10.85):
        arrow = slide.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, Inches(x), Inches(3.4), Inches(0.35), Inches(0.3))
        arrow.fill.solid()
        arrow.fill.fore_color.rgb = BORDER
        arrow.line.fill.background()
        arrow.shadow.inherit = False
    box = slide.shapes.add_textbox(Inches(0.7), Inches(5.45), Inches(11.9), Inches(1.2))
    _text(box.text_frame, "Single trusted boundary: a compromised or modified client can request no more than the API grants it.",
          15, color=MUTED)

    # ---------------------------------------------------------------- tech stack
    slide = _blank(prs)
    _heading(slide, "Technology stack", "Tools and why")
    _card(slide, 0.7, 2.0, 3.9, 2.35, "Client", [
        "React Native 0.81 / Expo SDK 54",
        "TypeScript · Expo Router",
        "TanStack Query — offline cache + queue",
        "Zustand · React Hook Form + Zod",
        "expo-location, -notifications, -secure-store",
    ])
    _card(slide, 4.85, 2.0, 3.9, 2.35, "API", [
        "Fastify 4 · TypeScript · Node 24",
        "Zod schema validation at the edge",
        "Vitest — 100 automated tests",
        "Deployed serverless on Vercel",
    ], accent=GREEN_DARK)
    _card(slide, 9.0, 2.0, 3.6, 2.35, "Data & AI", [
        "PostgreSQL 17 (Supabase)",
        "Supabase Auth · Row-level security",
        "Ollama — gpt-oss:120b, tool calling",
        "Resend — transactional email",
    ], accent=AMBER)
    _bullets(slide, [
        ("Why one API, not microservices?", "Independent scaling and team autonomy are the costs' justification — neither applies to a project this size."),
        ("Why tool calling, not text-to-SQL?", "The model picks from typed operations it cannot go outside; our code runs the query."),
    ], top=4.75, size=14, gap=10)

    # ---------------------------------------------------------------- security
    slide = _blank(prs)
    _heading(slide, "Security by design", "Non-negotiables")
    _bullets(slide, [
        ("No self-registration exists anywhere.", "Accounts are manager-created — an entire attack surface simply absent."),
        ("The device holds no database credential.", "Decompiling the app yields nothing; the service-role key is server-side only."),
        ("Temporary passwords are enforced server-side.", "Middleware refuses every route until the user sets their own — a UI prompt alone could be bypassed by calling the API."),
        ("The AI can never widen its own scope.", "No tool accepts a location ID; each re-derives it from the authenticated caller. A test asserts this."),
        ("Location never blocks clocking in.", "A missing or out-of-range reading flags for review — it never denies someone their wages."),
        ("Session tokens live in Keychain / Keystore,", "not general app storage."),
    ], size=16, gap=12)

    # ---------------------------------------------------------------- walkthrough
    slide = _blank(prs)
    _heading(slide, "Walkthrough", "Using the app")
    _bullets(slide, [
        "First sign-in and setting a password",
        "Employee — my schedule, the team rota, clocking in, requests",
        "Manager — dashboard, building the schedule, approvals, AI reports",
    ], top=2.4, size=20, gap=20)

    steps = [
        ("Step 1 \u00b7 Access", "Signing in", [
            ("No self-registration exists.", "Managers create accounts; there is no sign-up route anywhere in the API."),
            ("A generated temporary password arrives by email.", "Confusable characters are stripped \u2014 no 0/O, 1/l/I, 5/S, 8/B \u2014 because it gets dictated across a counter."),
            ("Forgotten it?", "Self-service recovery emails a fresh one. The response is identical whether or not the address is registered, so the form cannot be used to discover who works here."),
        ], "01-login.png", "Sign-in"),

        ("Step 2 \u00b7 Access", "Forgotten password", [
            ("Self-service, no manager needed.", "Enter an email and a fresh temporary password is sent."),
            ("The response is identical either way.", "Registered or not, same message, same status \u2014 otherwise the form becomes a way to discover who works here."),
            ("The email is sent BEFORE the password changes.", "The reverse order would lock someone out of a working account whenever a send failed, with no way to learn the new password."),
        ], "01b-forgot-password.png", "Forgotten password"),

        ("Step 3 \u00b7 Access", "Choose your own password", [
            ("Not dismissible.", "No skip, no back, no tab bar."),
            ("Enforced by the API, not the screen.", "Middleware refuses every other route until it is done \u2014 a UI-only prompt could be bypassed by calling the API directly."),
            ("Confirmation required.", "The temporary password dies the instant this succeeds, so a typo would lock you out."),
        ], "02-set-password.png", "Choose a password"),

        ("Step 4 \u00b7 Employee", "My schedule", [
            ("Your own shifts, day / week / month.", ""),
            ("Grouped by date with status badges.", ""),
            ("Renders offline.", "The last synced schedule is cached, so a stockroom with no signal still shows your shifts."),
            ("See who\u2019s working leads to the shared rota.", ""),
        ], "03-employee-schedule.png", "Employee schedule"),

        ("Step 5 \u00b7 Employee", "Shift detail and swaps", [
            ("Times, status, and who else is staffed.", ""),
            ("Request a swap with an eligible colleague.", "The list excludes anyone already booked that window \u2014 and excludes you, which was a real bug: with one employee on site, the only person offered was themselves."),
            ("Your colleague accepts, then a manager approves.", "Two gates, so no shift changes hands unnoticed."),
        ], "03b-shift-detail.png", "Shift detail"),

        ("Step 6 \u00b7 Everyone", "Who\u2019s working \u2014 the shared rota", [
            ("Every user sees the whole location.", "Shift name, start and end time, day, date, and who is on it."),
            ("Day / week / month, with paging.", "Tap the date label to jump back to today."),
            ("The shift leader is marked;", "an unstaffed shift is called out rather than blending in."),
            ("Grouped in the site\u2019s timezone, not the phone\u2019s,", "so the same shift lands on the same day for everyone reading it."),
        ], "04-roster.png", "Who's working"),

        ("Step 7 \u00b7 Employee", "Clocking in", [
            ("One button per shift.", "A split shift keeps its own independent clock state."),
            ("Location is checked, never enforced.", "Out of range \u2014 or no permission at all \u2014 still clocks you in, flagged for a manager. Refusing would be the harshest possible response to an unreliable signal."),
            ("Note the location indicator in the status bar.", "Requesting that permission at runtime was the fix for clock-in failing entirely."),
        ], "05-clock-in.png", "Clock in"),

        ("Step 8 \u00b7 Employee", "Clocked in: timer and breaks", [
            ("Live elapsed time.", ""),
            ("Break start and end recorded separately", "so paid and unpaid time can be separated later."),
            ("Offline-safe.", "An idempotency key means a replayed request returns the original entry instead of double-clocking you."),
        ], "05b-clocked-in.png", "Clocked in"),

        ("Step 9 \u00b7 Employee", "Requesting time off", [
            ("Dates and a reason; the reason is required.", ""),
            ("Track the outcome \u2014 approved, pending, denied.", ""),
            ("An approved request blocks staffing", "over the same dates, so a manager cannot accidentally roster someone on leave."),
        ], "06-requests.png", "Request time off"),

        ("Step 10 \u00b7 Manager", "Overview", [
            ("Today at a glance.", "Shifts running, unfilled, open board, pending swaps and time off."),
            ("Coverage across the week.", "Staffed versus total, per day."),
            ("Needs you is the actionable list.", "Time off awaiting a decision, flagged clock-ins, unstaffed shifts."),
        ], "07-manager-dashboard.png", "Manager overview"),

        ("Step 11 \u00b7 Manager", "Building shifts", [
            ("Define the shift once \u2014 name and time of day.", ""),
            ("Reusable.", "Which dates it runs on is a separate step, so a recurring pattern is not retyped."),
            ("Created shifts are listed underneath,", "ready to be assigned to dates."),
        ], "08-build-create.png", "Create shifts"),

        ("Step 12 \u00b7 Manager", "Assigning to dates", [
            ("Pick a shift, pick a date.", ""),
            ("Existing shifts listed with status", "so duplicates are obvious before you create one."),
            ("Swipe an existing shift to delete \u2014", "refused if anyone has already clocked in against it, since that is payroll history."),
        ], "08b-build-assign.png", "Assign to dates"),

        ("Step 13 \u00b7 Manager", "Staffing a shift", [
            ("Add or remove workers; nominate one leader.", "At most one, enforced by a database index rather than trusted to the UI."),
            ("Conflicts checked before saving.", "Double-booking, insufficient rest between shifts, and approved time off."),
        ], "08c-staff-this-shift.png", "Staff this shift"),

        ("Step 14 \u00b7 Manager", "Approvals", [
            ("One queue per type \u2014 time off and swaps.", ""),
            ("Approve or deny in a tap;", "the employee is notified by push."),
            ("Every affected screen refreshes together.", "Approving updates the queue, the employee\u2019s list and the dashboard at once \u2014 previously each screen refreshed only itself."),
        ], "09-manager-approvals.png", "Approvals"),

        ("Step 15 \u00b7 Manager", "The team", [
            ("Everyone at the location, with role and status.", ""),
            ("Invited marks an account", "that has not yet replaced its temporary password."),
            ("Tap through to edit pay or role, or", "issue a fresh temporary password."),
        ], "12-team-list.png", "Team"),

        ("Step 16 \u00b7 Manager", "AI reports \u2014 ask, don\u2019t navigate", [
            ("Replaces four fixed report screens.", "Those remain, one tap away under Standard."),
            ("Suggested questions make the scope visible.", "The honest problem with a bounded assistant is that a blank box tells you nothing about what it covers."),
            ("Answers come from typed lookups, not generated SQL.", "The model picks a tool; our code runs the query and re-derives the location from the signed-in user."),
            ("It declines what it cannot answer", "instead of inventing a figure."),
        ], "10-ai-reports.png", "AI reports"),

        ("Step 17 \u00b7 Manager", "Adding a staff member", [
            ("Name, email, role, pay rate.", ""),
            ("A temporary password is generated, emailed,", "and shown once on screen."),
            ("The on-screen copy is the point.", "Onboarding still works when email does not \u2014 an unverified sending domain took it down completely at one stage."),
        ], "11-add-staff.png", "Add staff"),

        ("Step 18 \u00b7 Manager", "The password, shown once", [
            ("Readable exactly here, and never again.", "The server stores only a hash \u2014 a lost one is reissued, not recovered."),
            ("Copyable in a tap.", "It gets read out or pasted into a message."),
            ("Shown even when the email succeeded.", "Email is the unreliable half of onboarding; the manager holding the password is what keeps it working."),
        ], "11b-account-created.png", "Account created"),
    ]

    for kicker, title, points, filename, caption in steps:
        _walkthrough(prs, kicker, title, points, filename, caption, missing)

    # ---------------------------------------------------------------- engineering
    slide = _blank(prs)
    _heading(slide, "Engineering challenges", "What went wrong, and what it taught")
    _bullets(slide, [
        ("Invite links couldn't work in Expo Go.", "Custom URL schemes aren't registered there, and iOS testing needed a paid account. Redesigned around temporary passwords — simpler than the original spec."),
        ("An ambiguous database join emptied a queue.", "Two foreign keys to the same table made the join ambiguous; the screen showed the failure as \"nothing pending\". Found by reasoning from the discrepancy with the dashboard."),
        ("Clock-in never worked.", "The permission was declared but never requested at runtime, so every location call threw. Zero clock-ins existed in the database."),
        ("Stale screens after every action.", "Each mutation refreshed only its own screen. Fixed by mapping domain events — not screens — to affected caches."),
        ("A test caught a daylight-saving bug.", "Adding 24 hours to local midnight is the wrong boundary twice a year — it would have misreported a day's staffing."),
    ], size=14, gap=11)

    # ---------------------------------------------------------------- evaluation
    slide = _blank(prs)
    _heading(slide, "Evaluation", "Does it hold up?")
    _card(slide, 0.7, 2.0, 3.9, 2.5, "Correctness", [
        "100 automated tests",
        "Unit + integration",
        "Business logic as pure functions",
        "TypeScript + lint gates on both tiers",
    ])
    _card(slide, 4.85, 2.0, 3.9, 2.5, "Performance", [
        "API reads well under 1s",
        "(Nielsen's flow threshold)",
        "AI answers ~1.5–2.5s end to end",
        "Indexed on location + time range",
    ], accent=GREEN_DARK)
    _card(slide, 9.0, 2.0, 3.6, 2.5, "Honest limits", [
        "No formal usability study (no SUS)",
        "Single location per user",
        "Rate limiting resets on cold start",
        "Some flows untested on device",
    ], accent=AMBER)
    box = slide.shapes.add_textbox(Inches(0.7), Inches(4.9), Inches(11.9), Inches(1.2))
    _text(box.text_frame, "Failure and emptiness are now visually distinct — a queue that fails to load once looked "
                          "identical to one that was genuinely empty, and that concealed a real defect.", 15, color=MUTED)

    # ---------------------------------------------------------------- future
    slide = _blank(prs)
    _heading(slide, "Future work", "Where it goes next")
    _bullets(slide, [
        ("Edge computing.", "Today a cloud model means employee names leave the business. Running a smaller model on-premises keeps data local — the model endpoint is one config value, so no code changes."),
        ("Retrieval-augmented generation.", "Ground answers in the company's own staffing policy, not just its schedule."),
        ("Demand forecasting.", "Move from reporting what happened to proposing a schedule before a manager builds one."),
        ("Extended reality.", "An AR overlay of who's covering which area; a spatial handover at shift change. The shift-area model already holds the context."),
        ("Nearer term.", "Multi-location support, platform-level rate limiting, biometric confirmation at clock-in."),
    ], size=15, gap=13)

    # ---------------------------------------------------------------- close
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, W, H)
    bg.fill.solid()
    bg.fill.fore_color.rgb = GREEN
    bg.line.fill.background()
    bg.shadow.inherit = False
    box = slide.shapes.add_textbox(Inches(1.1), Inches(3.0), Inches(11), Inches(1.6))
    tf = box.text_frame
    _text(tf, "Thank you", 44, bold=True, color=WHITE, space_after=14)
    _text(tf, "Questions?", 20, color=RGBColor(0xD6, 0xEA, 0xE0))

    out = "docs/report/Shift-Tracker-Presentation.pptx"
    prs.save(out)
    print(f"Saved {out}  ({len(prs.slides.__iter__.__self__._sldIdLst)} slides)")
    if missing:
        print(f"\n{len(missing)} screenshot placeholder(s) awaiting an image in {SHOTS_DIR}/:")
        for filename, caption in missing:
            print(f"  - {filename:<28} {caption}")
        print("\nDrop the PNGs in and re-run this script; placeholders are replaced automatically.")
    return out


if __name__ == "__main__":
    os.makedirs(SHOTS_DIR, exist_ok=True)
    build()
