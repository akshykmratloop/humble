# Humble — Design System Specification

Design direction: **"Dating app meets competitive social game."** Gen-Z internet culture + playful gaming UI + premium dating-app trust. Not childish, not neon-overload, not a corporate SaaS dashboard. If it could be mistaken for an admin panel, it's wrong.

Explicit anti-patterns (never do these): sidebar+dashboard-card layout, purple gradient hero, "Welcome back, John," generic rounded-rectangle-everything, stock `animate-pulse` skeletons (project mandate: use `boneyard-js`, see global CLAUDE.md), copy that reads like enterprise software.

## 1. Brand personality

Playful, confident, slightly chaotic, premium enough to trust with a real photo and real conversations, social/screenshot-worthy. Humor targets the _mechanic_ (mutual rejection), never a person's appearance, identity, or protected class.

## 2. Design tokens

### 2.1 Color

Base neutrals:

- `ink` `#111114` — primary text/dark surfaces
- `surface` `#FFFFFF` — light surface
- `surface-dim` `#F4F4F6` — secondary light surface
- `muted` `#8A8A93` — secondary text

Brand:

- `primary` (electric coral) `#FF4D5E` — primary CTA, Like accent
- `primary-ink` `#B8202F` — pressed/dark variant

Semantic:

- `success` (Normal Match) `#22C55E`
- `rejection` (Reject / Humble Match accent) `#6C5CE7` (chosen deliberately _not_ red — red reads as "error"; Humble Match is a celebration, so it borrows game-purple, distinct from the coral "like" primary and from the red-adjacent tones used for destructive/error states)
- `power` (game mechanics: streaks, power-ups) `#FFB020` (amber/gold, "achievement" association)
- `warning` (safety/moderation) `#EF4444`
- `info` `#3B82F6`

Dark mode mirrors: `ink` and `surface` swap roles; brand/semantic hues keep hue but shift lightness for AA contrast (finalized during implementation with a contrast-checked palette, not guessed).

Rule: no more than the palette above. No ad-hoc gradients invented per-screen; if a gradient is used (e.g., Humble Match reveal background), it is a named token (`gradient-humble`, `gradient-streak`) reused consistently, not a one-off.

### 2.2 Typography

Primary typeface: **Plus Jakarta Sans** (modern, geometric, has personality without being a novelty display font; good variable-weight support for the bold headline moments the game UI needs). Fallback stack: system sans.

Scale (mobile-first, rem-based, 4px baseline-aligned):

- `display` 32/38 700 — match celebration headlines
- `h1` 24/30 700
- `h2` 20/26 600
- `body` 16/24 400
- `body-sm` 14/20 400
- `caption` 12/16 500 (uppercase tracking for badges/labels)

### 2.3 Spacing

Strict 4/8/12/16/24/32/48px scale (per global CLAUDE.md §10). No invented gaps.

### 2.4 Radius

- `sm` 8px (chips, inputs)
- `md` 16px (cards, buttons)
- `lg` 24px (modals, bottom sheets, the discovery card)
- `full` — avatars, pill badges

### 2.5 Elevation

Flat by default (premium apps in 2025+ trend flat/bordered over heavy shadow). Cards use a 1px hairline border (`rgba(0,0,0,0.08)`) + a soft shadow only on the actively-dragged discovery card and modals/sheets.

### 2.6 Motion

Durations: `micro` 100–150ms (button press, toggle), `standard` 200–300ms (card transitions, sheet open), `dramatic` 400–700ms (match celebrations, streak counter).

Signature sequences:

- **Like**: card tilts right → flies off → coral heart burst.
- **Reject**: card tilts left → flies off → small skull/dust puff (not aggressive, more "poof").
- **Humble Match reveal**: screen dims → two rejection cards slide in from opposite edges and "collide" center-screen → brief impact flash → `HUMBLE MATCH` wordmark scales in → supporting copy lines stagger in → CTA appears.
- **Kill Streak**: counter increments with a scale-bounce per tick → on threshold, screen flashes `power` amber → reward card reveals.

All motion respects `prefers-reduced-motion`: reduced-motion variants swap flight/collision animations for simple cross-fades of equal semantic clarity, never just "instant with no animation" (state changes must still be perceivable).

## 3. Core components (spec, implementation in Phase 13+)

- `Button` (primary/secondary/ghost/destructive, sizes sm/md/lg)
- `Avatar`, `Badge` (streak, power-up, verification), `Chip`
- `ProfileCard` (discovery stack card: photo carousel, name/age/location, bio excerpt, prompt answer)
- `MatchCard` (list item: type indicator Normal vs. Humble, last message preview)
- `PowerUpCard` / `InventoryGrid` _(post-MVP)_
- `StreakBadge` (compact counter + flame icon)
- `Modal`, `BottomSheet` (mobile-primary interaction pattern for confirmations, filters)
- `Toast` (non-blocking feedback: "Profile updated", error surfaces)
- `ChatBubble` (sent/received, delivery/read state)
- `EmptyState`, `ErrorState`, `LoadingState` (skeletons via `boneyard-js` only, per global mandate)

## 4. Patterns (screen-level compositions)

- **Discovery**: full-bleed card stack, mobile shell (see §6), action row (Reject / Like, Super Reject post-MVP as a secondary smaller control so it can't be mis-tapped).
- **Match** (Normal): celebratory but restrained — this is the "expected" outcome.
- **HumbleMatch**: the biggest emotional beat in the product, per product principle #1 — gets the most animation budget.
- **Messaging**: standard two-pane on desktop (list + thread), single-pane with back-navigation on mobile.
- **Profile** (own + viewing): photo-first, personality prompts over dry metadata fields.
- **GameInventory** _(post-MVP)_: tasteful, not "mobile casino" — a small grid, not a slot-machine aesthetic.

## 5. Layouts

- `MobileShell`: bottom tab bar (Discovery, Matches, Messages, Profile), fixed viewport per the global "fixed app shell" mandate — the document never scrolls, only the designated content region does.
- `DesktopShell`: left icon rail + content area, same fixed-viewport rule applies.

## 6. Responsive targets

Design and visually verify at, minimum: 390×844 (primary), 375×812, 430×932, 768×1024, 1440×900. Every major screen must be visually inspected at all five before being marked complete (see global CLAUDE.md Visual QA loop and `10-testing-strategy.md`).

## 7. Accessibility

WCAG 2.1 AA target: color contrast ≥4.5:1 for body text, ≥3:1 for large text/icons; all interactive elements keyboard-reachable with visible focus rings; semantic HTML (`button`, `nav`, `dialog`) over div-soup; form errors announced via `aria-describedby`/`aria-live`; motion-heavy moments (Humble Match reveal, streak) have a reduced-motion fallback that preserves informational content; touch targets ≥44×44px.

## 8. Implementation notes (for Phase 13+)

- Tailwind CSS with a token-driven `tailwind.config` (colors/spacing/radius pulled from §2, not hard-coded per-component).
- shadcn/ui as the primitive foundation (Radix-based), restyled to the tokens above — not used with its default look.
- Framer Motion for the sequences in §2.6.
- Lucide icons.
- Loading skeletons: `boneyard-js` exclusively, per global CLAUDE.md mandate — no hand-rolled `animate-pulse`.
- JavaScript only (no TypeScript), per explicit product-owner instruction — components use JSDoc comments for any non-obvious prop shape where it aids maintainability, not enforced type-checking.
