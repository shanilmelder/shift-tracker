# Ledger — Design System

Ledger is a personal finance tracker for one person's income and expenses, denominated in Sri Lankan rupees (LKR). It is a single-surface product: a web app with a fixed sidebar, four views (Dashboard, Transactions, Budgets, Reports) and a sign-in screen. There is no marketing site, mobile app or docs site in the source material.

The product's job is answering a question about money — *what did I spend on groceries this month, am I over budget, what's left* — so numbers are the loudest element on every screen and the chrome around them stays quiet.

## Sources

This system was built from one source:

- `uploads/DESIGN-SYSTEM.md` — the written Ledger design system: character, colour, typography, layout/space/radius/elevation, component specs, formatting rules, and a Tailwind mapping.

No Figma file, repository or screenshots were provided. Every token, size and component spec here is transcribed from that document; nothing was invented beyond what is listed under **Intentional additions** below. If a codebase or Figma file exists, attach it and this system should be re-checked against it.

**No logo was supplied.** Wherever a brand mark belongs, the word "Ledger" is set in Fraunces 600. Do not draw, reconstruct or approximate a mark.

---

## Index

| Path | What it is |
|---|---|
| `styles.css` | The single stylesheet consumers link. `@import` list only. |
| `tokens/` | `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `radius.css`, `elevation.css`, `base.css` |
| `components/core/` | Button, IconButton, Card, Badge, Money, Icon |
| `components/forms/` | Input, Select, FieldRow |
| `components/data/` | KpiCard, Table, BarChart, ProgressBar |
| `components/navigation/` | Sidebar, NavItem, PageHeader |
| `components/feedback/` | Modal, EmptyState |
| `ui_kits/ledger-app/` | Click-through recreation of the app — see its README |
| `guidelines/` | Foundation specimen cards (colour, type, spacing, brand) |
| `assets/icons/` | The 24 Lucide SVGs this system uses |
| `SKILL.md` | Agent-skill entry point |

### Components

Core: **Button**, **IconButton**, **Card**, **Badge**, **Money**, **Icon**.
Forms: **Input**, **Select**, **FieldRow**.
Data: **KpiCard**, **Table**, **BarChart**, **ProgressBar**.
Navigation: **Sidebar**, **NavItem**, **PageHeader**.
Feedback: **Modal**, **EmptyState**.

Each has a sibling `.d.ts` (props contract) and `.prompt.md` (what/when plus a usage example).

### Intentional additions

The source document specifies Button, Input/Select, Card, KPI card, Table, Badge, Nav item, Modal and Empty state. These were added because the specified components cannot be built or used without them:

- **Icon** — the document mandates 20px, 1.5px-stroke line icons but names no set. Wrapper over Lucide (substitution flagged below).
- **IconButton** — the document requires icon-only row actions with a `danger` delete; that is a control, not a Button variant.
- **Money** — the money formatting rule (`LKR 274,950.00`, tabular figures, never `NaN`) is unenforceable without one component owning it.
- **BarChart** / **ProgressBar** — the document defines a chart palette and over/under-budget colours; charts must exist to consume them. Both are plain CSS, no charting library.
- **Sidebar** / **PageHeader** — the fixed 240px rail and the page title row are layout rules in section 4, promoted to components so they are applied consistently.
- **FieldRow** — enforces the mandated 16px form field gap.

---

## Content fundamentals

Ledger writes like a well-kept ledger book: plain, specific, unexcited. Copy exists to identify things and confirm what happened, not to encourage or congratulate.

- **Person.** Second person for anything the user owns or did ("You spent 12.4% more than last month", "Your August budgets"). First person never appears; the app does not have a personality that speaks. System actions are stated impersonally ("Transaction saved").
- **Casing.** Sentence case everywhere: buttons, labels, headings, menu items, modal titles. "Add transaction", not "Add Transaction". Table headers are the one exception — they are uppercase by *style* (xs, 500, 0.04em), not by writing.
- **Length.** Buttons are one or two words with a verb: "Save", "Add transaction", "Clear filters". Labels are nouns: "Amount", "Category", "Account". Empty states are one sentence and end with a full stop.
- **Numbers carry the message.** Where a number can say it, prose doesn't. "LKR 19,640.00 of LKR 18,000.00" beats "You have exceeded this budget".
- **No exclamation marks, no emoji, no jokes, no encouragement.** Money is not gamified: no streaks, no "great job", no confetti. Never scold either — over-budget is stated in colour and figures, not in words.
- **Destructive copy names the thing and the consequence.** "Delete this transaction? This cannot be undone." Never a bare "Are you sure?".
- **Errors say what to do.** "Enter a description", "Amount must be a number". Not "Invalid input".
- **Currency and dates are written out in full, always the same way.** `LKR 274,950.00` and `12 Aug 2026`. Sri Lankan context is implicit in the data (Keells, CEB, PickMe, Nugegoda), never explained.

Examples, in Ledger's voice against what it avoids:

| Ledger writes | Ledger avoids |
|---|---|
| Add transaction | Create New Transaction Entry |
| No transactions in August 2026. | Oops! Nothing here yet 🙈 |
| You spent 12.4% more than last month. | Your spending has increased significantly! |
| Delete this transaction? This cannot be undone. | Are you sure?! |
| Sign in to see where your money went. | Welcome back, friend! |

---

## Visual foundations

**Palette.** Warm neutrals, not cold greys — the page is `#FAFAF8` paper, surfaces are pure white, dividers are `#E3E1DA`. Text is a near-black with a green cast (`#1C1F1C`). Exactly one accent, a deep green `#1F6F4A`, reserved for primary buttons, active nav and focus rings. Green and terracotta (`#B4462F`) are *semantic*: money in, money out. They never appear as decoration, and a badge never takes a tone for variety. Category breakdowns draw from a fixed eight-colour chart palette in order; charting-library defaults are not used.

**Type.** Two families. Fraunces 600 for anything titular — page titles (32/40), card titles (20/28), the wordmark (40/48). Inter for everything else, at 400 body, 500 labels and table headers, 600 KPI values; nothing heavier. Sizes are restricted to the seven-step scale (12/14/16/20/24/32/40) with fixed line heights. Every element that renders money carries `font-variant-numeric: tabular-nums` — mandatory, so columns of figures align and digits don't jitter when values change.

**Space and layout.** A fixed 240px sidebar down the left, full height, never collapsing; the content area fills the rest at 32px page padding. Spacing comes from eight steps only (4·8·12·16·24·32·48·64) — nothing in between. Card padding 24, card gap 16, section gap 32, table cells 12×16, form fields 16 apart. Vertical rhythm is generous, horizontal density is tight: rows are compact, sections breathe.

**Backgrounds.** Flat colour, nothing else. No imagery, no illustration, no gradients, no textures, no patterns, no full-bleed photography, no protection scrims. A surface is white on `#FAFAF8`; that is the whole background system. Because there is no imagery, there is no image colour treatment to define — if photography is ever introduced it should follow the palette's warmth rather than the cool blue-grey default of stock finance imagery.

**Borders and elevation.** Borders do the work: 1px `#E3E1DA` on every card, input, table row and the sidebar edge. Shadows are a hint — `raised` (`0 1px 2px rgba(28,31,28,0.05)`) on cards, `overlay` (`0 4px 12px`) on dropdowns and popovers, `modal` (`0 16px 40px`) on modals and drawers. All three are warm-tinted, built from the text colour rather than pure black. There are no inner shadows and no glows. A card is therefore: white surface, 1px warm border, 8px radius, whisper of a shadow, 24px padding — never a coloured left border, never a tinted fill.

**Radii.** 4px on badges and inputs, 8px on buttons and cards, 12px on modals, full only on avatars, pills and the 6px budget bars. Nothing else.

**Transparency and blur.** Used in exactly two places: the modal backdrop `rgba(28,31,28,0.4)`, and the 10% terracotta tint behind expense badges. No frosted glass, no backdrop blur, no translucent chrome.

**Motion.** Restrained. Enter transitions fade in and rise 4px over ~160–200ms with a plain ease. Bars and progress fills animate their dimension over 240ms `cubic-bezier(0.2,0,0,1)`. Hover and colour changes take 120ms. Nothing bounces, springs, parallaxes or shimmers, and nothing loops.

**States.** Hover steps the background one level: transparent → `surface-muted`, `surface` → `surface-muted`, `accent` → `accent-hover`; ghost and nav items also darken their label from `text-secondary` to `text`. Press is a darker colour only — no scale, no shadow change, no translate. Focus is a 2px `accent` ring at 2px offset on every focusable element, without exception. Disabled is 40% opacity plus `not-allowed`; it never changes colour. Table rows hover to `surface-muted`; inputs move from `border` to `border-strong` on focus and to `danger` on error.

**Fixed elements.** Only the sidebar. Content scrolls; there are no sticky headers, floating action buttons or bottom bars.

---

## Iconography

- **Set.** Lucide, 20px, 1.5px stroke, drawn in `text-secondary`. Delete glyphs use `danger`. 16px is used inside buttons; 24px inside empty states.
- **Substitution — please confirm.** The source document specifies "line icons, 20px, 1.5px stroke" but names no icon set. Lucide was chosen as the closest match to that description (open-source, 24-unit grid, uniform stroke, rounded caps). If Ledger's real product uses a different set, send it and `components/core/icons.js` plus `assets/icons/` can be swapped in one pass.
- **Delivery.** The 24 SVGs in use are copied into `assets/icons/` and also inlined as strings in `components/core/icons.js`, so glyphs need no network and inherit `currentColor`. Use the `<Icon name="…" />` component; do not hand-draw SVG, and do not load icons from a CDN (cross-origin SVGs cannot be masked, which is why they are inlined).
- **In use.** `layout-dashboard`, `list`, `target`, `chart-pie`, `settings`, `log-out` for navigation; `plus`, `download`, `pencil`, `trash-2`, `x`, `search`, `filter`, `check` for actions; `receipt`, `wallet`, `banknote`, `piggy-bank`, `calendar`, `circle-alert`, `arrow-up-right`, `arrow-down-left`, `chevron-down`, `ellipsis` for content and affordances.
- **Emoji are never used** — not in UI, not in empty states, not in copy. Unicode characters appear only as typography: `−` for negative amounts, `·` as a separator, `—` for a missing value.
- **No illustrations exist** in the source material, and none were created. Empty states use a single muted glyph and a sentence.

---

## Fonts

Fraunces and Inter are served from Google Fonts via `tokens/fonts.css`; no binaries are vendored, per the source document ("Both families are served from Google Fonts"). Offline or self-hosted builds should download both families and replace that `@import` with local `@font-face` rules.

---

## Using this system

```jsx
const { Card, Table, Money, Badge, Button } = window.LedgerDesignSystem_7a4742;
```

Link `styles.css`, then read components off the compiled bundle. Rules that are not negotiable: money renders through `Money`, amounts are right-aligned and tabular, dates are `DD MMM YYYY`, colour on a figure means income or expense, one primary button per view, and every list and chart ships an `EmptyState`.
