# Payoneer Marketing Design System

This is a working design system for **Payoneer**, the cross-border financial platform
that connects underserved businesses to a rising global economy. It's a recreation of
the *Marketing DS + templates* Figma file v2.1 (01/25) plus the master brand guidelines
PDF — distilled into CSS tokens, copy/tone rules, icon assets, and an interactive web
UI kit you can prototype against.

> Payoneer is one master brand. We are one brand because we offer one complete
> financial platform — a single, trusted place to manage the complexities of operating
> and growing a global business.
> — *Brand Guidelines v2.1, "Brand Architecture"*

---

## Sources

- **Figma file** — `Marketing DS + templates (1).fig` (36 pages, 706 frames). Mounted
  read-only as a virtual filesystem during build. Key pages referenced:
  - `/Color-palette/Color-Palette` — full token swatches with tints & shades
  - `/Logos/*` — horizontal + stacked, on-light + on-dark
  - `/Components-WIP/button-desktop`, `/Components-WIP/feature-box-desktop`,
    `/Components-WIP/header` — desktop kit
  - `/Illustrations` — circular persona + icon composites
  - `/New-brand-on-a-page` — single-page brand summary
  - `/Web-site-home-page-Anna/HP-design` — full marketing home page
  - `/external-shared/Level1-*` — the level-1 icon library (~120 icons)

- **Brand Guidelines PDF** — `uploads/Payo-Brand-Guidelines---Update-v1.0.pdf` (52pp).
  Single source of truth for tone, color usage ratios, imagery rules, and the
  Employer Brand sub-system.

- **Uploaded logos** (kept verbatim in `assets/logos/`):
  - `Payoneer_Master_Logo_OnWhite_RGB.png` / `…_OnDark_RGB.png` — horizontal
  - `Payoneer_Stacked_Logo_OnWhite_RGB.png` / `…_OnDark_RGB.png` — vertical

- **Uploaded type** — `uploads/Avenir_Next_World.zip` containing the six TTFs the
  master brand specifies. Extracted into `fonts/`.

---

## At a glance

Payoneer is the all-in-one financial platform that removes the friction from
cross-border business. The brand exists to "remove the friction between ambition and
achievement" — black & white form 70–90% of every layout, with a strategically dosed
secondary palette (Midnight Blue, Electric Blue, Neon Purple, Hazy Pink) used as
accent and action driver.

The visual language is **Minimalistic, Product-led, Authentic, Monochrome**. Imagery
leans on real people in real work environments — never staged stock photography.

**Audiences:** entrepreneurs, freelancers, marketplace sellers, small/mid businesses
operating across 190+ countries.

---

## Content Fundamentals

### Voice in one line
> "If our promise is to remove the friction between ambition and achievement, then we
> must make sure there's no friction between what we say and what our customers need
> to know."

### Tone pillars (verbatim from the guidelines)
1. **Keep it Simple** — shortest, simplest, most familiar word for what you're trying
   to say. No jargon, no internal abbreviations, no region-specific phrasing.
2. **Be Concise** — never 100 words when 10 will do. Lead with the most important
   info; remove preambles; break long messages into smaller parts.
3. **Create Connections** — bring intelligent wit; avoid clichés. Smart but never
   self-indulgent. Straight-talking but never blunt. Accessible but never generic.
4. **Inspire Action** — specific CTAs. Talk truthfully about how easy, fast, safe,
   rewarding something will be. No vague "discover more". No "smash through borders,
   crush your goals" energy.

### House examples — write LIKE THIS
- "We're the all-in-one financial platform that removes the friction from doing
  business across borders."
- "Get paid like a local with virtual accounts in 10+ currencies."
- "Wherever your business grows, that's where Payoneer goes."
- "Sign up for a Payoneer account and you'll be able to manage all your global
  business finances in one place."

### Write NEVER like this
- ❌ "Payoneer provides a comprehensive suite of intelligent financial services in
  order to facilitate cross-border trade for business." *(convoluted, impersonal)*
- ❌ "Don't miss out on the game-changing platform that will revolutionize the way
  you do business across borders." *(too much hype, too selly)*
- ❌ "Smash through borders. Crush your goals." *(trying too hard)*

### Style rules
- **Person**: "We" for Payoneer; "you / your business" for the customer. Speak with
  the customer, not at them.
- **Casing**: Sentence case is the default everywhere. ALL CAPS is reserved for
  oversized social/campaign posters and the occasional ALL-CAPS stat. Title Case is
  fine for sub-headers when it improves scannability.
- **Justification**: Left-aligned in LTR languages; centre alignment only for short
  campaign lines or social post headlines.
- **Emoji**: **Not used** in master-brand surfaces. (None appear in the Figma file or
  guidelines.)
- **Numbers as proof**: lead with them — "$6.1B quarterly volume", "+25% YoY",
  "190+ countries", "17+ languages". Pair with a one-line context label.
- **CTAs**: specific, action-led. "Download now", "Sign up free", "Get started",
  "See how it works". Avoid "Learn more" / "Discover more" unless absolutely needed.
- **Pillar shorthand** — when you want to *show* (not say) Efficiency / Flexibility /
  Reliability, lean on these proof points:
  - *Efficiency* → time saved, all-in-one platform, freedom to focus on growth.
  - *Flexibility* → 190+ countries & territories, 17+ languages, scalable solutions.
  - *Reliability* → years of cross-border expertise, compliance, security.

---

## Visual Foundations

### Color (the most important rule)
- **70–90% of every layout is Charcoal Black + Pure White** (including their tints).
  This is non-negotiable; it's what makes the brand feel premium and trustworthy.
- **10–30% is secondary palette** — Midnight Blue, Electric Blue, Neon Purple, Hazy
  Pink — used as accent and action driver. Never let secondary colors dominate.
- **Employer Brand** flips this: Hazy Pink becomes the dedicated 20–30% secondary;
  the other three secondaries drop to ≤10% combined tertiary use. The Employer Brand
  also adds two gradient backgrounds (Charcoal→Midnight, White→Pink) — **gradients
  are background-only**, never on text, icons, or graphic elements.
- Tints scale 80/60/40/20% mixes with white (or the 100/200/300/500 numeric scale
  in CSS tokens).

### Typography
- **Avenir Next World** is the master typeface in three weights:
  - **Regular** — long-form body, descriptions, blog/email body
  - **Demi** — *primary* weight for headers, sub-headers, callouts, statistics
  - **Bold** — campaign lines and major hero headlines *only*. Reserve for impact.
- For PowerPoint distributed across the org, **Avenir Next LT Pro** is the approved
  fallback (it ships with Microsoft fonts).
- Line height runs tight (100%–125%) on display copy and headlines; long-form drops
  to ~155%.
- Letter spacing trends slightly negative on headers (-0.02em) — confident, not stiff.

### Layout & rhythm
- Marketing grid baseline is **1280px** wide with a `20–48px` outer gutter; the
  homepage uses card modules in a 2-up / 3-up grid with `20–24px` gaps.
- Feature cards are **413×572 or full-width 1280×350**, internal padding `32px`,
  `radius-xl (20px)`, soft layered shadow (the "card-soft" token).
- The repeating shape system is: **Circle** (decorative dot, icon halo, map dot) →
  **Rounded-corner Box** (content container) → **Line** (divider / section break).
  The Halo *is* the logo's signature ring — it stays inside the logo and is not
  extracted as a standalone graphic element.

### Iconography (see the dedicated section below for usage)
- **Level-1 line icons** are the standard — single-color line strokes that sit
  inside a filled circle "halo" (typically Neon Purple-200 `#C1B1FF` for light
  cards; Hazy Pink for warmer / Employer surfaces).
- Halo size is `50×50` icon container with `32×32` icon inside, on desktop.

### Background treatments
- **Light backgrounds** dominate: `#FFFFFF` canvas, `#F1F2F7` surface for cards.
- **Dark backgrounds** are `#1E1E28` Charcoal with cards stepped at `#35353E` and
  `#4B4B53`. Used for product hero modules, dark sections, and the Employer Brand.
- **Hand-drawn illustrations / textures**: none. The system is photographic and
  geometric — circles, lines, boxes, no organic doodles.
- **Patterns**: only the Employer Brand has dot-wave patterns (4 variants). Master
  brand backgrounds are clean and unornamented.

### Imagery
Three approved styles, used in proportion:
1. **Product on devices** — clean, high-impact device shots (latest models),
   blank background, subtle grounding shadow.
2. **Product in real life** — hands tapping/swiping/typing in real environments
   (coffee shops, home offices, travel). Cross-device continuity is key.
3. **People & customers** — *unscripted* moments. No direct eye contact. Real,
   uncluttered workspaces with warm natural light. Diverse, global.

When using **cut-outs** of people: always frame inside a circle or rounded-corner
box; max 1 per layout; never in templates non-designers will adapt.

### Borders, shadows, corners, transparency
- Default border: `1px solid #E9E9E9`. Strong border on dark: `1.6px solid #FFFFFF`.
- Shadows are *soft, layered drops* (see `--shadow-card-soft`). No hard 1-step
  drop shadows. No inner shadows in core layouts.
- Corner radii: buttons `6px`, inputs `6–8px`, content cards `20px`, icon halos
  fully circular, pill chips `999px`.
- Transparency: white at 90% over light backgrounds for floating UI mock cards;
  Neon-Purple at 60% (`rgba(151,125,255,0.6)`) for the "circle behind icon" motif on
  the New-brand-on-a-page layout.

### Motion
- **Fades + small position shifts**. No bounces, no overshoot, no spring physics
  in the master brand. Easing is gentle (`cubic-bezier(0.22, 0.61, 0.36, 1)`) and
  durations sit in the 160–320ms range.
- The Halo itself is treated as animated (logo intro/outro) but discreet — a steady
  rotation or fade, never theatrical.
- Hover states are **subtle**: primary buttons darken (Electric `#0033FF` →
  `#001AE5`); secondary buttons go from Charcoal to Midnight Blue. No scale change.
- Press states: micro shadow drop (`--shadow-press`) and a 2-3% darken — no shrink.

### Density
Spacious. The brand earns trust through whitespace. Every element must earn its
place; strip out the non-essential.

---

## Iconography

- **System used**: a custom Payoneer "level-1" line icon set (the file calls them
  `level1-NNNN-*`). They render at 32px inside a 50px circular halo on desktop,
  24px inside 40px on mobile.
- **Format**: SVG, single path, `fill="currentColor"` (color is set via the halo's
  contents — typically Charcoal on a Purple/Pink/Electric halo). Stroke-style line
  icons with consistent 1.5–2px equivalent weight.
- **PNG icons / emoji**: not used in the master brand. The PDF and Figma file do
  not contain emoji anywhere.
- **Font icons**: Figma references `Font Awesome 6 Pro` for *internal mockup chrome
  only* (e.g. small UI in device cards) — it is not part of the public brand and
  is **not** shipped with this design system.
- **Substitutions**: when we don't have a level-1 icon for a concept, fall back to
  Lucide (matching stroke weight, geometric style, single color). Flag the
  substitution to the brand team.
- **Halo color**: Neon Purple-200 `#C1B1FF` is the default. Use Hazy Pink for
  Employer Brand, Electric-100 for product/UI surfaces, or Midnight-200 for cool
  enterprise contexts. Never use raw white halos on white surfaces.
- 110+ icons are organized in `assets/icons/` covering **currency & payments**
  (card, bill, coins, currencies, exchange, money-in/out, get-money, withdraw,
  add-payment, fast-payment, secure-payment, plus per-currency bills + coins for
  USD/EUR/GBP/JPY), **business & growth** (business, entrepreneur, ecommerce,
  marketing, partnership, collaboration, goal, trophy), **people** (user, users,
  add-user, avatar, support, notification, network), **security** (security,
  password, touch-id, doc-approved, certificate, thumbs-up, vat, zero-fees),
  **devices** (mobile, desktop, laptop, globe, local, languages, travel-plane,
  bank), **time** (time, calendar, date-time, time-clock, fast), **navigation**
  (arrow-up/down/left/right, chevrons, close), **system** (tick, info, view,
  settings, edit, play, click) and **social** (facebook, linkedin, twitter,
  youtube, instagram, tiktok).
- All icons use `currentColor` so you can recolor by setting `color` on the
  parent halo. Browse the full set at `preview/icons-index.html` — has search,
  light/halo/dark preview modes, and click-to-copy.

---

## Index — what's in this folder

| Path | What it is |
|---|---|
| `README.md` | this file — brand context, content & visual rules |
| `SKILL.md` | machine-readable skill prompt — load before designing |
| `colors_and_type.css` | the single source of truth for color + type tokens (and base CSS) |
| `fonts/` | Avenir Next World TTFs — Regular / Medium / Demi / Bold / Black / UltLt |
| `assets/logos/` | master + stacked Payoneer logos, on-light + on-dark |
| `assets/icons/` | level-1 icon SVGs (currentColor) extracted from the Figma file |
| `preview/` | small HTML cards that render in the Design System tab (foundations) |
| `ui_kits/marketing-site/` | high-fidelity React-in-HTML recreation of the marketing site components |
| `slides/` | 16:9 slide templates following the official Payoneer Master PPT deck. Includes `Payoneer_Master_PPT_Template.pptx` (the original source) and `index.html` (browse all templates side by side). |

---

## How to use this in a design

1. Open `SKILL.md` first (it's the agent prompt).
2. Drop `<link rel="stylesheet" href=".../colors_and_type.css">` into your HTML.
3. Pull logos from `assets/logos/`, icons from `assets/icons/` (recolor via parent
   `color:`).
4. For UI patterns (header, hero, feature box, CTA, footer, balance card),
   `ui_kits/marketing-site/` has working JSX components.
5. For slide decks, copy a template out of `slides/` and replace the slot content.

---

## Caveats & known substitutions

- The Figma file's `Font Awesome 6 Pro` references in mockup chrome are not
  shipped — substitute Lucide or omit.
- The icon SVGs are extracted as single-path `<path>` elements; stroke-style icons
  are reconstructed as filled paths and may differ from the original strokes in
  fine detail. They are visually correct at 32px.
- The Halo (the brand mark's signature element) has a conic gradient in Figma —
  the master logo PNG bakes it in correctly. The standalone Halo SVG renders as a
  flat ring; use the PNG for production.
