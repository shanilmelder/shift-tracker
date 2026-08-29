"""
Builds the Shift Tracker project report as a .docx with the page setup the brief specifies:
A4, 1in left/right margins, 0.5in binding gutter, 1in header/footer, Calibri 11pt.

Run:  python docs/report/build_report.py
"""

from docx import Document
from docx.enum.section import WD_SECTION_START
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from docx.shared import Inches, Pt

from appendices import (
    add_letter_of_support,
    add_system_summary,
    add_tech_stack,
    add_user_guide,
)

BODY_FONT = "Calibri"
BODY_SIZE = Pt(11)

# (heading, [paragraphs])
SECTIONS = [
    (
        "1. Introduction",
        [
            "Shift-based work underpins a large part of the service economy. Retail, hospitality, "
            "healthcare and logistics all depend on staff whose hours vary week to week, who rarely "
            "sit at a desk, and whose only practical link to their employer's systems is a personal "
            "smartphone. Coordinating these workforces involves publishing a rota, recording who "
            "actually attended, handling absence and shift swaps, and turning all of it into hours "
            "that can be paid accurately. In smaller organisations this is still commonly managed "
            "with spreadsheets, printed rotas and instant-messaging groups.",

            "That approach fails in predictable ways. A rota pinned to a staffroom wall is invisible "
            "to anyone not on site. Swap arrangements agreed in a group chat leave no auditable "
            "record. Attendance captured on paper is difficult to reconcile against scheduled hours, "
            "and disputes about pay become one person's recollection against another's. These are "
            "not merely administrative irritations: they translate into payroll error, avoidable "
            "understaffing, and a measurable compliance risk where working-time rules apply.",

            "Shift Tracker was developed in response to this problem domain. It is a cross-platform "
            "mobile application, backed by a cloud API, that gives managers a single place to build "
            "and staff a schedule, and gives employees their own shifts, a shared view of who else "
            "is working, geofence-aware clock-in, and self-service routes for time off and shift "
            "swaps. Its distinguishing feature is a conversational reporting assistant: rather than "
            "navigating fixed dashboards, a manager can ask a question in natural language and "
            "receive an answer derived from live scheduling data.",

            "The motivation is timely. Smartphone ownership among deskless workers is now near "
            "universal, and the sensing, connectivity and background-processing capabilities of "
            "modern mobile platforms make it feasible to verify attendance by location, deliver "
            "schedule changes by push notification, and keep an application usable when the network "
            "is not. In parallel, the maturity of large language models has made natural-language "
            "querying of operational data a realistic feature rather than a research prototype. The "
            "objectives of the project were therefore to deliver a secure, role-aware scheduling "
            "application; to make it resilient to intermittent connectivity; to incorporate an "
            "emerging technology in a way that is genuinely useful rather than decorative; and to do "
            "so on a stack that a small organisation could realistically afford to run.",
        ],
    ),
    (
        "2. Literature Review",
        [
            "Workforce scheduling has a long history in operational research, where it is typically "
            "framed as a constrained optimisation problem balancing demand forecasts, labour cost "
            "and employee preference. Commercial workforce management platforms such as Deputy, "
            "When I Work and Homebase have translated this into mobile products offering rota "
            "publishing, timesheets and attendance capture. These are mature and feature-rich, but "
            "share characteristics that limit their suitability for smaller operators: per-employee "
            "subscription pricing that scales poorly for organisations with high headcount and low "
            "margins, and closed data models that make integration or self-hosting impractical.",

            "A clear industry trend is the shift from bespoke backend infrastructure toward "
            "backend-as-a-service platforms. Supabase, Firebase and comparable offerings bundle "
            "managed relational or document storage, authentication and row-level authorisation "
            "behind a hosted API (Supabase, 2025). Bass, Clements and Kazman (2021) note that such "
            "decisions are architectural rather than merely operational: adopting a managed platform "
            "fixes significant qualities of the system, including its security model and its failure "
            "modes. The literature on data-intensive systems similarly stresses that where "
            "authorisation is enforced determines whether a system is defensible as it grows "
            "(Kleppmann, 2017).",

            "A second trend concerns location-verified attendance. Geofencing offers a lightweight "
            "alternative to biometric or hardware time clocks, but introduces a tension the "
            "literature treats seriously. The OWASP Mobile Top 10 (OWASP, 2024) identifies excessive "
            "or poorly justified permission use as a recurring weakness, and location is among the "
            "most sensitive permissions a mobile application can request. Systems that treat a "
            "location reading as authoritative risk denying a legitimate worker their wages because "
            "of a GPS inaccuracy or a declined permission prompt.",

            "The most significant recent development is the application of large language models to "
            "operational data. The transformer architecture (Vaswani et al., 2017) underpins models "
            "now capable of reliable structured output and function calling. Lewis et al. (2020) "
            "demonstrated that grounding a model in retrieved, authoritative content substantially "
            "reduces fabrication in knowledge-intensive tasks — a finding directly applicable to "
            "business reporting, where an invented figure is worse than no answer at all. Commercial "
            "analytics products increasingly expose natural-language querying, most commonly by "
            "generating SQL from a schema description.",

            "Reviewing this landscape identifies several gaps that Shift Tracker addresses. First, "
            "existing conversational analytics tends toward text-to-SQL, which is flexible but "
            "permits a model to construct queries whose correctness cannot easily be verified and "
            "whose scope is bounded only by database permissions. A constrained tool-calling design, "
            "in which the model may only select from a fixed set of typed operations, trades breadth "
            "for verifiability. Second, offline capability is frequently treated as a caching "
            "afterthought rather than a design constraint, despite shift workers routinely operating "
            "in basements, stockrooms and other areas with poor coverage. Third, the privacy "
            "implications of transmitting employee data to a third-party model host are seldom made "
            "explicit to the deploying organisation. Finally, the academic literature on edge "
            "computing (Satyanarayanan, 2017; Shi et al., 2016) anticipates exactly this tension "
            "between cloud-scale inference and data locality, but few workforce products yet expose "
            "that choice as a deployment decision.",
        ],
    ),
    (
        "3. Methodology",
        [
            "The project followed an iterative and incremental development lifecycle informed by "
            "agile practice (Beck et al., 2001; Schwaber and Sutherland, 2020), organised into "
            "vertical slices that each delivered a working path from user interface through API to "
            "database. A plan-driven waterfall approach was rejected deliberately. Sommerville "
            "(2016) argues that waterfall is appropriate only where requirements are stable and well "
            "understood in advance, and that was demonstrably not the case here: the authentication "
            "design was reworked substantially mid-project once testing revealed that email-based "
            "invitation links could not function in the development environment, a discovery no "
            "amount of upfront specification would have surfaced.",

            "The system architecture is a conventional three-tier client–server design. A "
            "cross-platform mobile client communicates over HTTPS with a stateless REST API, which "
            "is the sole component permitted to reach the database. This boundary is the central "
            "design decision of the project. The mobile client holds no database credential of any "
            "kind; the privileged service-role key exists only in server-side configuration. "
            "Consequently every authorisation decision is made on trusted infrastructure, and a "
            "compromised or modified client can request no more than the API is willing to grant. "
            "Row-level security policies in the database act as a defence-in-depth backstop rather "
            "than the primary control.",

            "The API follows REST conventions (Fielding, 2000), exposing resource-oriented endpoints "
            "with predictable semantics and a uniform error contract. It is deliberately a single "
            "deployable unit rather than a set of microservices. Newman (2021) is explicit that "
            "microservice decomposition imposes operational and consistency costs justified chiefly "
            "by independent scaling and team autonomy, neither of which applies to a single-developer "
            "project of this scope.",

            "The technology stack was selected against these constraints. React Native with Expo "
            "provides a single codebase targeting both iOS and Android while retaining access to "
            "native location and notification services through a managed native layer (Expo, 2025). "
            "Fastify was chosen for the API for its schema-oriented validation and low overhead. "
            "PostgreSQL, provisioned through Supabase, supplies relational integrity, timezone-aware "
            "timestamp handling and managed authentication. TypeScript is used across both tiers, "
            "allowing request and response shapes to be checked at compile time on the client and "
            "the server.",

            "Emerging technology is incorporated in two places. The reporting assistant integrates a "
            "large language model served through Ollama, using a tool-calling interface rather than "
            "free-form query generation. The API is deployed to a serverless platform, so compute is "
            "provisioned per request rather than as a continuously running host — appropriate for a "
            "workload whose demand follows shift-change peaks. Quality was maintained throughout by "
            "an automated test suite executed alongside static type checking and linting, with "
            "business logic deliberately extracted into pure functions to keep it testable without "
            "database or network dependencies.",
        ],
    ),
    (
        "4. Design and Implementation",
        [
            "The application presents two distinct navigation trees selected by the authenticated "
            "user's role. Employees see their schedule, a clock-in screen, requests and their "
            "profile; managers see an operational dashboard, schedule construction tools, approval "
            "queues, staff administration and reporting. Role separation is enforced at the router "
            "level so that an employee cannot reach a manager screen even by direct navigation, and "
            "again independently at every API endpoint — the client-side guard is treated as a "
            "convenience, never as the security control.",

            "The interface is built from a shared component library driven by a single design-token "
            "module defining colour, spacing, typography and radius. No screen defines its own "
            "one-off values. This produces visual consistency and makes accessibility requirements "
            "enforceable centrally: every interactive component honours a minimum 48-density-"
            "independent-pixel touch target, meeting the stricter of the two major platform "
            "guidelines. Where a gesture is the primary interaction, as in swipe-to-delete, an "
            "equivalent accessibility action is exposed so that assistive technology users are not "
            "excluded from the capability.",

            "Server state is managed through a query-caching layer that acts as the single source of "
            "truth for data retrieved from the API. Reads persist to encrypted device storage, so a "
            "cold start without connectivity renders the last-known schedule rather than an error. "
            "Writes made offline are queued and replayed in order once connectivity returns. Because "
            "replay can duplicate a request, clock-in and clock-out operations carry a "
            "client-generated idempotency key that the server uses to return the original record "
            "rather than create a second one. A server-sent events stream pushes change "
            "notifications to connected clients, which invalidate the affected cache entries.",

            "Cache invalidation proved a significant design concern. The initial implementation had "
            "each mutation invalidate only the cache key its own screen read from, which is correct "
            "locally and wrong globally: an employee submitting a leave request refreshed their own "
            "list but not the manager's approval queue, and the aggregate dashboard was refreshed by "
            "nothing at all. This was resolved by centralising invalidation into a module that maps "
            "domain events, rather than screens, to the complete set of affected cache keys — an "
            "application of the principle that duplicated knowledge should be consolidated where it "
            "can be reasoned about once (Fowler, 2019).",

            "Account provisioning is closed by design: there is no self-registration endpoint "
            "anywhere in the system. Managers create accounts, and the server generates a "
            "cryptographically random temporary password, drawn from an alphabet with visually "
            "confusable characters removed so that it can be dictated or retyped reliably. The user "
            "must replace it at first sign-in, and this is enforced by middleware that refuses every "
            "API route except the password change itself while the account remains in that state. "
            "Placing the constraint on the server rather than in the interface is essential; a "
            "client-side prompt alone could be bypassed by calling the API directly.",

            "Attendance capture combines a scheduled shift with a location reading, comparing the "
            "device position against the site's configured coordinates using the haversine formula. "
            "The critical design rule is that this check never blocks the action. A reading outside "
            "the permitted radius, or no reading at all where the user has declined the permission, "
            "records the entry and flags it for managerial review. Denying a worker the ability to "
            "clock in because of a GPS failure would be the harshest possible response to an "
            "inherently unreliable signal.",

            "The reporting assistant is implemented as a bounded tool-calling loop. The model is "
            "offered a fixed set of typed operations — retrieving who is working on a date, "
            "summarising time off, computing hours or overtime, and similar — and may only choose "
            "among them and supply arguments. It never receives a location identifier: each tool "
            "re-derives scope from the authenticated caller, so a confused or adversarially prompted "
            "model can at worst call the wrong tool for its own location, and can never read another "
            "organisation's data or write anything. Query results are returned to the model, which "
            "words the final answer, and the interface displays which tools produced it so that a "
            "figure can be traced rather than trusted blindly. Temporal expressions such as "
            "\"tomorrow\" are resolved against the site's timezone, and date boundaries are computed "
            "so that daylight-saving transitions cannot shift a reporting window.",
        ],
    ),
    (
        "5. Evaluation",
        [
            "Functional correctness was assessed through an automated suite of one hundred unit and "
            "integration tests covering authorisation, attendance flagging, overtime calculation, "
            "date handling and the assistant's tool layer. Business logic was written as pure "
            "functions wherever possible so that boundary conditions could be exercised directly. "
            "This proved its value repeatedly: a test of the roster date range revealed that adding "
            "twenty-four hours to local midnight produces the wrong boundary across a daylight-"
            "saving transition, a defect that would have silently misreported a day's staffing twice "
            "a year and would almost certainly not have been found by manual testing.",

            "Performance was evaluated informally against Nielsen's (1994) response-time thresholds. "
            "Ordinary API reads complete well within the one-second limit for uninterrupted flow, "
            "assisted by database indexes on the location and time-range columns that dominate "
            "query patterns. Assistant responses were measured between approximately 1.5 and 2.5 "
            "seconds end to end, including model inference and one database round trip. This exceeds "
            "the one-second threshold but sits within the ten-second limit for retaining attention, "
            "and is mitigated by an explicit progress indicator, which Nielsen identifies as the "
            "appropriate response where latency cannot be eliminated.",

            "Usability was addressed through design decisions rather than formal study, and this is "
            "the clearest limitation of the evaluation. No System Usability Scale instrument (Brooke, "
            "1996) was administered and no participant testing was conducted, so claims about "
            "learnability remain unsubstantiated. What can be evidenced is that error states are "
            "expressed in plain language and directed at the person able to act on them, and that "
            "failure and emptiness are visually distinguished — a distinction that was absent "
            "initially and actively concealed a defect, since an approval queue failing to load "
            "rendered identically to one that was genuinely empty.",

            "Several substantial challenges arose during development. The most instructive concerned "
            "the invitation flow: the original design emailed a deep link that opened the application "
            "to set a password, which could not function in the development client because custom "
            "URL schemes are not registered there, and which additionally required a paid developer "
            "account to test on the target platform. Rather than work around the symptom, the flow "
            "was redesigned around emailed temporary passwords, removing the deep-link dependency "
            "from authentication entirely and producing a simpler system than the one originally "
            "specified. A second class of defect involved ambiguous database relationship traversal: "
            "where a table referenced the user table through two distinct foreign keys, an "
            "unqualified join was rejected by the data layer, and because the calling screen "
            "presented the resulting failure as an empty list, the manager approval queue appeared "
            "permanently empty while the dashboard correctly reported outstanding items. Diagnosis "
            "required reasoning from the discrepancy between two views of the same records.",

            "Security was evaluated against the OWASP Mobile Top 10 (OWASP, 2024). The closed "
            "account model removes an entire class of exposure by having no registration endpoint "
            "to attack, and the absence of any database credential on the device means that "
            "decompiling the client yields nothing of value. Insecure data storage is mitigated by "
            "holding the session token in platform-backed secure storage rather than general "
            "application storage. The containment boundary around the assistant was tested by "
            "confirming that no tool definition accepts a location identifier, so that scope cannot "
            "be influenced by model output. The residual concern is data residency: where a "
            "cloud-hosted model is configured, query results including employee names leave the "
            "deploying organisation, and this is documented as a deployment decision rather than "
            "left implicit.",

            "Remaining limitations should be stated plainly. The system currently models a single "
            "location per user. Rate limiting on the public password-recovery endpoint is enforced "
            "in application memory and therefore resets when a serverless instance is recycled; "
            "platform-level protection is required before public exposure. Several flows have been "
            "verified only through automated tests and against live data rather than on physical "
            "devices.",
        ],
    ),
    (
        "6. Conclusion and Future Work",
        [
            "The project delivered a working, role-aware shift management application spanning a "
            "cross-platform mobile client, a stateless REST API and a managed relational database, "
            "with offline-resilient reads and writes, location-aware attendance capture, and a "
            "natural-language reporting assistant grounded in a constrained tool interface. The "
            "architectural decision to route all data access through a single trusted API boundary, "
            "and the corresponding decision to enforce every constraint server-side, proved sound "
            "under repeated change. The most valuable methodological outcome was the demonstrated "
            "return on automated testing of pure logic, which surfaced timezone and boundary defects "
            "that inspection and manual use would not have found.",

            "Three directions for future work follow from evolving technology. The first is edge "
            "computing. The assistant currently transmits query results to a model host, which for a "
            "cloud-served model means employee names and schedules leave the deploying organisation's "
            "infrastructure. Executing a smaller model at the network edge, or on-premises, would "
            "keep that data local while retaining conversational access — precisely the latency and "
            "data-locality argument advanced by Satyanarayanan (2017) and Shi et al. (2016). The "
            "architecture already anticipates this: the model endpoint is a single configuration "
            "value, so relocating inference requires no code change.",

            "The second is advanced artificial intelligence. Retrieval-augmented generation (Lewis "
            "et al., 2020) would allow the assistant to answer policy questions by grounding "
            "responses in an organisation's own staffing handbook alongside its scheduling data. "
            "Beyond retrieval, historical attendance and trading data could support demand "
            "forecasting, moving the system from reporting what happened toward proposing a schedule "
            "before a manager builds one.",

            "The third is extended reality. Situating a rota within the physical workplace — an "
            "augmented overlay showing which colleague is covering which area, or a spatial handover "
            "briefing at shift change — occupies the middle of the reality–virtuality continuum "
            "described by Milgram and Kishino (1994). The application's existing location and "
            "shift-area data model would supply much of the required spatial context. Nearer-term "
            "enhancements include multi-location support, platform-level rate limiting, and biometric "
            "confirmation at clock-in to strengthen attendance assurance without additional hardware.",
        ],
    ),
]

REFERENCES = [
    "Bass, L., Clements, P. and Kazman, R. (2021) Software Architecture in Practice. 4th edn. Boston: Addison-Wesley.",
    "Beck, K., Beedle, M., van Bennekum, A., Cockburn, A., Cunningham, W., Fowler, M., Grenning, J., Highsmith, J., Hunt, A., Jeffries, R., Kern, J., Marick, B., Martin, R.C., Mellor, S., Schwaber, K., Sutherland, J. and Thomas, D. (2001) Manifesto for Agile Software Development. Available at: https://agilemanifesto.org/ (Accessed: 23 August 2026).",
    "Brooke, J. (1996) 'SUS: a “quick and dirty” usability scale', in Jordan, P.W., Thomas, B., Weerdmeester, B.A. and McClelland, I.L. (eds.) Usability Evaluation in Industry. London: Taylor & Francis, pp. 189–194.",
    "Expo (2025) Expo Documentation. Available at: https://docs.expo.dev/ (Accessed: 23 August 2026).",
    "Fielding, R.T. (2000) Architectural Styles and the Design of Network-based Software Architectures. PhD thesis. University of California, Irvine.",
    "Fowler, M. (2019) Refactoring: Improving the Design of Existing Code. 2nd edn. Boston: Addison-Wesley.",
    "Kleppmann, M. (2017) Designing Data-Intensive Applications. Sebastopol, CA: O'Reilly Media.",
    "Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., Küttler, H., Lewis, M., Yih, W., Rocktäschel, T., Riedel, S. and Kiela, D. (2020) 'Retrieval-augmented generation for knowledge-intensive NLP tasks', Advances in Neural Information Processing Systems, 33, pp. 9459–9474.",
    "Milgram, P. and Kishino, F. (1994) 'A taxonomy of mixed reality visual displays', IEICE Transactions on Information and Systems, E77-D(12), pp. 1321–1329.",
    "Newman, S. (2021) Building Microservices: Designing Fine-Grained Systems. 2nd edn. Sebastopol, CA: O'Reilly Media.",
    "Nielsen, J. (1994) Usability Engineering. San Francisco: Morgan Kaufmann.",
    "OWASP (2024) OWASP Mobile Top 10. Available at: https://owasp.org/www-project-mobile-top-10/ (Accessed: 23 August 2026).",
    "Satyanarayanan, M. (2017) 'The emergence of edge computing', Computer, 50(1), pp. 30–39.",
    "Schwaber, K. and Sutherland, J. (2020) The Scrum Guide. Available at: https://scrumguides.org/ (Accessed: 23 August 2026).",
    "Shi, W., Cao, J., Zhang, Q., Li, Y. and Xu, L. (2016) 'Edge computing: vision and challenges', IEEE Internet of Things Journal, 3(5), pp. 637–646.",
    "Sommerville, I. (2016) Software Engineering. 10th edn. Harlow: Pearson Education.",
    "Supabase (2025) Supabase Documentation. Available at: https://supabase.com/docs (Accessed: 23 August 2026).",
    "Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A.N., Kaiser, Ł. and Polosukhin, I. (2017) 'Attention is all you need', Advances in Neural Information Processing Systems, 30, pp. 5998–6008.",
]


def set_base_font(document: Document) -> None:
    """Calibri 11pt everywhere, headings included.

    Word's built-in heading styles default to a different theme font, so setting the Normal
    style alone leaves headings in the wrong typeface. Each heading style is overridden too,
    and `w:eastAsia` is set explicitly or Word substitutes a fallback for some glyphs.
    """
    for style_name in ["Normal", "Heading 1", "Heading 2", "Title"]:
        try:
            style = document.styles[style_name]
        except KeyError:
            continue
        style.font.name = BODY_FONT
        style.element.rPr.rFonts.set(qn("w:eastAsia"), BODY_FONT)
        if style_name == "Normal":
            style.font.size = BODY_SIZE


def configure_page(document: Document) -> None:
    """A4 with the brief's margins: 1in sides, 0.5in binding gutter, 1in header/footer."""
    section = document.sections[0]
    section.start_type = WD_SECTION_START.NEW_PAGE
    section.page_width = Inches(8.27)
    section.page_height = Inches(11.69)
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)
    section.top_margin = Inches(1)
    section.bottom_margin = Inches(1)
    section.gutter = Inches(0.5)
    section.header_distance = Inches(1)
    section.footer_distance = Inches(1)


def add_header_footer(document: Document) -> None:
    section = document.sections[0]
    header = section.header.paragraphs[0]
    header.text = "Shift Tracker – Project Report"
    header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    for run in header.runs:
        run.font.name = BODY_FONT
        run.font.size = Pt(9)

    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    # A real PAGE field rather than literal text, so numbering follows the document.
    run = footer.add_run()
    run.font.name = BODY_FONT
    run.font.size = Pt(9)
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = " PAGE "
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    for element in (begin, instr, end):
        run._r.append(element)


def add_table_of_contents(document) -> None:
    """Inserts a real Word TOC field.

    python-docx cannot compute the page numbers itself, so this writes the field instruction
    Word evaluates. The document opens showing the placeholder text below until the field is
    updated — Ctrl+A then F9, or right-click > Update Field — which is also what keeps it
    correct after any later edit.
    """
    document.add_heading("Table of Contents", level=1)

    paragraph = document.add_paragraph()
    run = paragraph.add_run()

    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")

    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    # \o "1-2"  headings 1 and 2;  \h  hyperlinked;  \z  hide tab leader in web view;
    # \u  use applied paragraph outline level.
    instr.text = r' TOC \o "1-2" \h \z \u '

    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")

    placeholder = OxmlElement("w:t")
    placeholder.text = "Right-click here and choose \u201cUpdate Field\u201d to build the table of contents."

    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")

    for element in (begin, instr, separate, placeholder, end):
        run._r.append(element)

    document.add_page_break()


def add_title_page(document) -> None:
    """A title page of its own, so the report opens on a cover rather than mid-heading."""
    for _ in range(4):
        document.add_paragraph()

    title = document.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run("Shift Tracker")
    run.font.size = Pt(28)
    run.font.bold = True
    run.font.name = BODY_FONT

    subtitle = document.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = subtitle.add_run("A Mobile Workforce Scheduling Application\nwith Conversational Reporting")
    run.font.size = Pt(15)
    run.font.name = BODY_FONT

    for _ in range(6):
        document.add_paragraph()

    # Placeholders rather than invented values — these are the author's to fill in.
    for label in ("Student Name:", "Student ID:", "Module:", "Submission Date:"):
        line = document.add_paragraph()
        line.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = line.add_run(f"{label}  ______________________")
        run.font.size = Pt(11)
        run.font.name = BODY_FONT

    for _ in range(4):
        document.add_paragraph()

    counts = document.add_paragraph()
    counts.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = counts.add_run("Word count (main body, excluding references and appendices): 2,977")
    run.font.size = Pt(10)
    run.font.italic = True
    run.font.name = BODY_FONT

    document.add_page_break()


def add_references(document) -> None:
    """Harvard reference list. Placed after the appendices at the author's request.

    Note the more common Harvard convention places references immediately after the body and
    appendices last; check the module handbook if it specifies an order.
    """
    document.add_page_break()
    document.add_heading("References", level=1)
    for reference in sorted(REFERENCES):
        paragraph = document.add_paragraph(reference)
        # Hanging indent, as a Harvard reference list conventionally uses.
        paragraph.paragraph_format.left_indent = Inches(0.5)
        paragraph.paragraph_format.first_line_indent = Inches(-0.5)
        paragraph.paragraph_format.space_after = Pt(8)


def build() -> str:
    document = Document()
    configure_page(document)
    set_base_font(document)
    add_header_footer(document)

    add_title_page(document)
    add_table_of_contents(document)

    def render(section):
        """Renders one (heading, paragraphs) entry from SECTIONS, returning its word count."""
        heading, paragraphs = section
        document.add_heading(heading, level=1)
        count = 0
        for text in paragraphs:
            paragraph = document.add_paragraph(text)
            paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            paragraph.paragraph_format.space_after = Pt(8)
            count += len(text.split())
        return count

    # Document order. The System Summary leads, so a reader meets the product before the
    # argument about it, and the Conclusion closes the document immediately before the
    # references. The assessed sections keep their original numbering (1-6) so a marker can map
    # them to the brief even though the supporting sections now sit between 5 and 6.
    supporting_words = add_system_summary(document)

    word_count = 0
    for section in SECTIONS[:-1]:          # 1. Introduction .. 5. Evaluation
        word_count += render(section)

    supporting_words += add_tech_stack(document)
    supporting_words += add_user_guide(document)
    supporting_words += add_letter_of_support(document)

    document.add_page_break()
    word_count += render(SECTIONS[-1])     # 6. Conclusion and Future Work

    add_references(document)
    appendix_words = supporting_words

    out = "docs/report/Shift-Tracker-Project-Report.docx"
    document.save(out)
    print(f"Saved {out}")
    print(f"  Body       {word_count} words   (the six assessed sections, 1-6)")
    print(f"  Supporting {appendix_words} words   (summary, stack, user guide, letter)")
    print(f"  Total      {word_count + appendix_words} words")
    print("\n  Order: Title page \u2192 Contents \u2192 Sections 1-6 \u2192 System Summary, Tech Stack, User Guide, Letter \u2192 References")
    print("  Open in Word and press Ctrl+A then F9 to populate the table of contents.")
    return out


if __name__ == "__main__":
    build()
