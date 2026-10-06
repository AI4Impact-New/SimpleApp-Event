# AI4Impact Design System

Design system for **AI4Impact** — a career school for AI, data and product roles — and its learning platform **PiLearn**, a serverless learning and event-engagement platform. Students and working professionals use a mobile/web app to browse courses, join events with a QR code, answer live polls, download materials and see leaderboards.

## Sources
- **Source project:** https://claude.ai/design/p/a75035eb-2b77-4704-96c5-09ddedd1523f. This folder is a snapshot of it; when they disagree, update this folder from the project.
- Two full-page captures of a v0 build ("edtech-platform-development-v0"): the marketing home page (2940×18466, 2× of a 1470px viewport) and `/courses` (Career tracks). They live in `uploads/`, which is **not committed** (~10 MB); get them from the source project.
- No codebase, Figma, font files or icon set were supplied; every value here is measured from the screenshots.
- **Where the rules below and the screenshots disagree, the rules win.** The screenshots show an earlier, busier style (mono uppercase eyebrows, amber sparkles, coloured trainer tiles) that this system deliberately tones down.
- **Not covered:** the PiLearn app itself (event QR join, live polls, materials, leaderboards). No screens were provided, so no app UI kit exists yet.

## Products represented
1. **Marketing website** (ai4impact.in) — home and career-tracks pages. → `ui_kits/website/`
2. **PiLearn learner app** — described only; not recreated.

---

## CONTENT FUNDAMENTALS
- **Voice:** direct, plain, outcome-focused, slightly blunt. It sells proof of ability, not inspiration: "Prove you can do the work.", "Projects that look like the job.", "tell you honestly which track fits, or if none of them do yet."
- **Person:** speaks to **you**; the company is **we** sparingly ("We look at your background"). Brand name written **AI4Impact** (never "Ai4impact").
- **Headlines:** short declarative sentences ending in a full stop, often in triplets or pairs: "Choose the role. Build the skills. Prove you can do the work." / "Six roles. One standard: can you do the work?" Deliberate line breaks.
- **Casing:** Sentence case everywhere — headings, buttons ("Explore career tracks", "Enrol in this course"), nav. Module names are Title Case proper nouns ("Interview Builder", "Personal Handholding"). Eyebrows/labels are uppercase only via styling.
- **Spelling:** British/Indian English — enrol, practise (verb), programme, authorisation, visualisation.
- **Numbers:** concrete and ranged with en dashes: "12–24 weeks", "8–10 hrs", "3–4 portfolio projects", "₹24,999", "10+ recruitment … relationships", "70% or more". Times as "11:00 AM – 1:00 PM IST". Middle dot `·` separates metadata ("01 · Build", "12–24 weeks · 8–10 hrs/week").
- **Contrast framing:** "Pick a role, not a topic", "reliable services, not notebook experiments", "something built, not just watched".
- **Honesty / compliance copy** is part of the voice: "Professional certificates are not academic degrees. Career support does not guarantee employment.", DPDP Act 2023 notices, "Subject to eligibility".
- **Emoji:** never. Unicode used: `·`, `—`, `→` (inside mock code only), `₹`.
- **Mock artefacts** use realistic fintech data in mono: `rows_loaded=1,284,512 · null_rate=0.02% · sla=met`, `POST /v1/score`.

## VISUAL FOUNDATIONS
- **Palette:** deep navy (`--navy-900 #081328`) for heroes, dark bands and footer; near-white slate (`--slate-50`) page with `--slate-100` alternate bands; **teal** as the single brand accent (`--teal-600` on light, bright `--teal-400` on dark); **amber** (`--amber-500`) reserved for highlights inside product artefacts — the Capstone tag, the `code-amber` chip, the last bar in charts. Cream (`--cream-50`) only for the certificate.
- **Labels:** eyebrows are sentence-case Inter, 14px medium, neutral (`--text-body` on light, `--text-on-dark-body` on dark, `--text-muted` inside cards). No mono, no uppercase, no leading rule by default. Meta labels, indices ("01 · Build", step and module numbers) and footer headings are sentence-case Inter in muted colours.
- **Accent:** teal and amber are rare — default chrome is navy/slate; badges are neutral (including Flagship); step titles, feature icons and trainer tiles are navy/slate, not teal. Code windows and pipeline chips appear only as product artefacts (hero mock, projects band), never as decoration elsewhere.
- **Restraint:** one accent per view, eyebrows without rules, at most one badge per card, one primary + one secondary action. Don't stack eyebrow + badge + chips + mono labels on the same element.
- **Type:** Space Grotesk 700 display with tight negative tracking (−3.5% hero, −3% H2) and line-height ~1; Inter for body at 1.7 line-height (airy); JetBrains Mono only inside product artefacts — spec labels (11px, 0.08em, uppercase), file paths, chips and code. *Fonts are Google substitutes — see Caveats.*
- **Backgrounds:** the hero uses `--bg-hero-gradient` (navy-900 with a teal glow top-right and a warm haze bottom-left, `--glow-teal` + `--glow-warm`) plus a faint 64px `--grid-line` grid. The projects band uses the same gradient without the grid. Other dark sections are flat navy (`--bg-hero`). Use dark sparingly: hero, projects band, one form band, footer. No photography, no illustrations, no hand-drawn art. Light sections are flat and alternate `--surface-page` / `--surface-alt` full-bleed bands.
- **Imagery:** replaced by product-like artefacts — faux code windows (three grey dots + mono path), pipeline chips, mini KPI tiles and bar charts, a certificate. Cool, dark, technical. Trainers are shown as neutral slate initial tiles, not photos.
- **Layout:** 1216px container, 24px gutters, ~112–120px section padding, 3-up card grids with 16px gaps; "panel" grids where one 20px-radius bordered box is split by 1px hairlines (how-it-works, features, Programme+). Sticky 64px nav under a 40px announcement marquee.
- **Cards:** white, 1px `--slate-200` border, **20px radius**, **no shadow**. Highlighted variant = 2px teal border. Dark cards: `--navy-750` fill, 1px `--border-dark`, 20px radius. Only floating artefacts (certificate, hero mock cards) cast large soft shadows; hero mock cards are tilted ±1–3°.
- **Radii:** buttons 8px (hero 10px), inputs 10px, choice options 14px, cards 20px, badges/journey chips pill, code chips 4px.
- **Borders over shadows:** separation is always a 1px line (`--border-default` light, `--border-dark` dark). Dividers inside cards are full-width 1px.
- **Buttons:** solid navy primary; white outline secondary; on dark heroes the primary inverts to near-white (`light`) with a navy-raised ghost secondary. Arrow icons trail: `→` to go somewhere, `↗` to open a course.
- **Hover:** subtle — navy darkens/lightens one step, outlines go to `--slate-300`, links go from slate to navy. **Press:** no shrink; colour only. Transitions 120–180ms `cubic-bezier(.2,.7,.2,1)`.
- **Selected state:** teal-tinted fill + 1px teal border (finder options); active nav = navy text + 2px teal underline.
- **Transparency/blur:** none beyond the dark-band background glows and the marquee edge fade. No glassmorphism.
- **Animation:** announcement marquee scrolls continuously; otherwise static. No bounces.

## ICONOGRAPHY
- Icons match **Lucide** (2px stroke, round caps, 24 grid): arrow-right, arrow-up-right, log-in, circle-play, hammer, messages-square, calendar-clock, database, check, chevron-right, chevron-down, circle-check. No icon files were supplied, so Lucide is linked from CDN (`unpkg.com/lucide@0.460.0`) and wrapped by the `Icon` component — **substitution flagged**. Production apps use the `lucide-react` package instead of the CDN.
- Usage: 14–18px, navy on light feature cells, slate/navy inline in buttons, teal only for done-state checks inside dark artefacts. The announcement bar separates items with `·`, not icons. Never filled, never in coloured circles.
- No emoji. `→` appears as a character only inside mock code/pipelines.
- **Logo:** `assets/logo-light.png` (navy A4 tile + navy/teal wordmark, for light bg) and `assets/logo-dark.png` (white tile + white/teal wordmark, for navy bg), cropped from the screenshots. No vector logo was provided — please supply an SVG.

---

## Index
- `styles.css` — entry point (imports only) → `tokens/fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `effects.css`, `base.css`
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand)
- `components/` — React primitives (below), one `@dsCard` per folder
- `ui_kits/website/` — marketing site recreation (`index.html`, `start.html` starting point, `README.md`)
- `assets/` — logo PNGs
- `thumbnail.html` — project tile
- `SKILL.md` — Agent Skill entry
- `_ds_bundle.js` — generated bundle of `components/` used by the `*.card.html` and UI-kit previews; regenerate it from the source project rather than editing it
- `uploads/` — source screenshots (local only, gitignored)

## Components
- **core/** — Button, Badge, Eyebrow, Chip, Icon, Logo
- **forms/** — Input, Select, Checkbox, ChoiceOption
- **data/** — Stat, MetaGrid, CompareTable
- **cards/** — TrackCard, CellGrid, StepCell, FeatureCell, ModuleCell, TrainerCard, CodeWindow, ProjectCard, CheckCard, Certificate
- **navigation/** — AnnouncementBar, NavBar, SectionHeader, Footer

### Intentional additions
- **Icon** — wrapper that loads Lucide from CDN, since no icon assets were supplied.
- **CellGrid** — container that reproduces the hairline-divided panels seen in three sections.

## UI kits
- `ui_kits/website/` — Home + Career tracks.

## Caveats
- Fonts are **Google Fonts substitutes**: Space Grotesk (display), Inter (body), JetBrains Mono (mono). Send the real font files if these differ.
- All measurements come from screenshots, not code.

## Using this in an app
- Copy tokens into the app (for example `landing-page/src/styles/tokens/`) and port components to the app's stack (for example `landing-page/src/components/`). Never import from this folder at runtime.
- Keep the copied tokens in step with `tokens/`: change a value here first, then copy it.
- Logos: copy from `assets/` into the app's static folder.

## Decision log
- **2026-10-07 — landing page.** Approved deviations from the source screenshots, now part of the system: the hero uses a tilted product mock (code window, pipeline chips, amber Capstone tag, mentor-review card) on the grid background; the projects section is a dark gradient band with code/pipeline/chart previews and `tag` chips. Everything else follows the restrained styling above.
