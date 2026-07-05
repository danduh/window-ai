# Shot List — Recording the Talk

This is the **video production companion** to `narration.md`. Maps every section in the narration to camera setup, slide cuts, demo cuts, B-roll, and on-screen text overlays.

## Recording setup

| Element | Spec |
|---|---|
| Speaker camera | 1080p minimum; framed mid-chest up; eyes on top third |
| Background | Solid, low contrast — gray fabric or a neutral wall |
| Lighting | Key light camera-front, soft fill; avoid laptop-screen-as-light |
| Audio | Lavalier or shotgun mic; -18 dB peaks, no compression at capture |
| Screen capture | Native resolution of the demo laptop (1440p or 1600p); 60 fps for the live-translate demo |
| Tally | Wireless trigger to switch between speaker cam and screen cap |
| Aspect ratio | 16:9 master; vertical 9:16 cutdowns for social later |

## Cut style

- Speaker cam dominates introductions, transitions, and the closing.
- Screen cap dominates demos (cut to full-screen).
- Picture-in-picture for code walkthroughs — speaker bottom-right at 25% scale.
- Lower-thirds for the first appearance of each API name and each speaker beat.

## Shot list by section

### Section 1 — Opening hook (0:00 – 2:30)

| Time | Shot | Notes |
|---|---|---|
| 0:00 | Title card | Slide 1 full-screen; hold 3 seconds |
| 0:03 | Speaker cam | "I want to start by showing you something..." |
| 0:15 | Cut to screen cap | Show network tab open, page loading |
| 0:25 | Picture-in-picture | Speaker bottom-right while at the live-translate page |
| 0:45 | Full screen cap | Live translation columns filling in as the speaker speaks |
| 1:15 | Lower third | "windowai.danduh.me/live-translate" |
| 1:30 | B-roll cut-in | 2-second zoom on the empty network tab. Caption overlay: "0 requests" |
| 1:45 | Back to speaker cam | "What just happened is the headline of this talk..." |
| 2:00 | Slide 2 | "What just happened" — speaker voice-over |
| 2:30 | Speaker cam | End of section beat |

**B-roll opportunities:**
- Close-up of the laptop screen showing only the translation columns (no UI chrome)
- A clip from outside the venue / a stock "browsing on a laptop" shot, very brief (1–2 sec)

**On-screen captions to overlay:**
- "0 requests" (over the empty network tab)
- "Local inference. No backend." (over the translation in progress)

### Section 2 — The shift (2:30 – 5:30)

| Time | Shot | Notes |
|---|---|---|
| 2:30 | Slide 3 | "The four forces" — full screen |
| 2:45 | Speaker cam | Narrate the four forces |
| 3:00 | Slide 4, 5, 6, 7 | One per force, ~30 sec each, voice-over |
| 4:30 | Animated cost comparison | Slide 8 — animated table showing cost flip |
| 5:00 | Speaker cam | Land the "design space changed" beat |
| 5:25 | Slide 8 hold | "The browser became an inference runtime..." closes the section |

**B-roll opportunities:**
- Generic "data center" stock for the cloud LLM cost line (2 seconds)
- "Laptop on a kitchen table" for the on-device line (2 seconds)
- Avoid stock with humans — keeps focus on the message

**On-screen captions:**
- "$0 / call" (large, animated in for emphasis)
- "0 ms network latency"
- "0 bytes egress"

### Section 3 — API surface tour (5:30 – 19:00)

The longest section. **Multiple demo-heavy beats**, each gets its own shot pattern. WebMCP (3e) now runs long — it carries the biggest news in the v2 talk.

#### 3a — LanguageModel (5:30 – 9:00)

| Time | Shot | Notes |
|---|---|---|
| 5:30 | Slide 9 | "The whole surface on one page" — hold 5 seconds for the audience to read |
| 5:45 | Slide 10 | "LanguageModel — the chat API" |
| 6:00 | Code slide 11 | Speaker voice-over |
| 6:30 | Cut to /chat demo | Type a question, watch streaming reply |
| 7:00 | PIP code overlay | Show the `promptStreaming` call live |
| 7:30 | Code slide 12 | `responseConstraint` JSON schema (caption note: Chrome currently ships this as `responseFormat`) |
| 8:00 | Demo /chat with constraint | If wired; otherwise stay on slide. Also flag the Prompt API is now STABLE on the open web (Chrome 148), not extensions-only |
| 8:30 | Back to speaker cam | Land the "critical pattern" beat; mention `tools[]` tool-calling is functional as of Chrome 148 |

#### 3b — Task APIs (9:00 – 12:30)

| Time | Shot | Notes |
|---|---|---|
| 9:00 | Slide 13 | "The task APIs" |
| 9:15 | Code slide 14 — Summarizer | |
| 9:30 | Cut to /summary demo | Paste a long article, run all four types |
| 10:30 | Side-by-side overlay | All four summary types simultaneously (pre-baked screenshot) |
| 10:45 | Slide 15 | Writer vs Rewriter distinction. Caption: "Writer / Rewriter / Proofreader — still origin trial / behind a flag, NOT stable" |
| 11:30 | Slide 16 + /proofreader demo | Type "she dont know nothing", show inline corrections. Say honestly this API is not yet stable |
| 12:15 | Speaker cam | Section close. Contrast: Summarizer / Translator / Language Detector are STABLE (since Chrome 138) |

#### 3c — Translation (12:30 – 14:00)

| Time | Shot | Notes |
|---|---|---|
| 12:30 | Slide 17 | Translator + LanguageDetector |
| 12:45 | Code slide 18 | Composing them |
| 13:15 | Callback to opening demo | Brief 5-sec cut to the live-translate page running |
| 13:30 | Speaker cam | "Pre-warm translators" beat |
| 14:00 | Section end |

#### 3d — Multimodal (14:00 – 16:00)

| Time | Shot | Notes |
|---|---|---|
| 14:00 | Slide 19 | Multimodal intro |
| 14:15 | /multimodal demo | Drag a pre-prepared photo |
| 14:45 | PIP code overlay | The `expectedInputs` line highlighted |
| 15:00 | Live webcam demo | **High-risk beat — fallback in demo/runbook.md** |
| 15:30 | Overlay captions | "Downsample. Single in-flight. Reuse the session." |
| 16:00 | Speaker cam |

#### 3e — WebMCP (16:00 – 19:00)

The expanded beat. WebMCP graduated from flag-only (Chrome 146) to a public **origin trial from Chrome 149**, and the entry point moved — so give it more room.

| Time | Shot | Notes |
|---|---|---|
| 16:00 | Slide 20 | WebMCP intro. Caption: "W3C draft — still moving, do NOT ship to production" |
| 16:15 | Slide 21 | `registerTool` code. **Show the current entry point:** `const modelContext = document.modelContext ?? navigator.modelContext;` then `modelContext.registerTool(...)`. Caption: "`navigator.modelContext` is DEPRECATED in Chrome 150 — use `document.modelContext`" |
| 16:30 | PIP code overlay | The AbortSignal path — `registerTool(tool, {signal})`, abort to unregister. Caption: "portable across Chrome 146–150 — the recommended pattern". Mention Chrome 150 also adds `unregisterTool(name)` and `clearContext()`; `provideContext` replaces the full toolset |
| 16:50 | Speaker cam | **Session inheritance — the key idea.** "The agent is a guest in the user's tab; it uses the user's existing login and cookies, so `purchase()` or `book()` work with no separate auth or API key." |
| 17:15 | Slide — adopters | Logo wall: Expedia, Booking.com, Shopify, Instacart, TurboTax, Etsy, Target, Redfin. Caption: "already experimenting" |
| 17:35 | Slide — efficiency stats | Animated build vs the old "agent reads screenshots and clicks" approach. Large numbers: **~98% task accuracy**, **~89% fewer tokens**, **~68% less overhead**. Caption: "Structured tools beat pixel-peeping" |
| 17:55 | B-roll / demo cut | Google's WebMCP demo suite — the maze you escape by prompting an agent, CineFlow (movie tickets), the L'Atelier hotel booking app, and the smart-home demo. Use screen capture of one (the maze reads well on camera) |
| 18:15 | /webmcp demo | Recipe browser + agent panel (our own demo) |
| 18:35 | Demo continued | Agent invokes `scaleRecipe` |
| 19:00 | Speaker cam | Land the "fourth option" beat. Note for local dev: `chrome://flags/#enable-webmcp-testing`; deployed origins register an OT token |

### Section 4 — Architecture patterns (19:00 – 22:00)

Slide-heavy, low demo. Hold speaker cam for most of it.

| Time | Shot | Notes |
|---|---|---|
| 19:00 | Slide 22 | "Four patterns" |
| 19:15 | Slide 23 | `monitor` callback code |
| 19:40 | Speaker cam | "Two: one session per feature..." |
| 20:05 | Slide 24 | Abort pattern code. Callback: same `AbortSignal` shape unregisters a WebMCP tool (`registerTool(tool, {signal})`) |
| 20:45 | Speaker cam | "Three: single in-flight..." |
| 21:30 | Speaker cam | "Four: degrade gracefully..." |
| 22:00 | End section |

### Section 5 — The opportunity + finale (22:00 – 26:30)

This is where the v2 talk pays off: the opportunity survey lands into **one "kitchen-sink" app** that uses most of the APIs together. The finale is **slot-neutral** — record whichever form is built, script both.

| Time | Shot | Notes |
|---|---|---|
| 22:00 | Slide 25 | "What this unlocks" (section opens as Patterns closes at 22:00) |
| 22:15 | Slide 26 | Seven categories, animated build |
| 23:00 | Cut to speaker cam | Land each category briefly |
| 23:30 | Slide 27 | "What stays in the cloud" |
| 23:50 | Slide 28 | "The first thing to ship" |
| 24:00 | Slide 29 — finale intro | "One app, most of the APIs." Set up the kitchen-sink demo |
| 24:15 | **Finale demo — full screen cap** | Record whichever form exists (see below). Cut wide, let it breathe |
| 26:15 | Speaker cam | "This is the whole toolbox in one place" — bridge into the close |
| 26:30 | End section |

**Finale demo — two interchangeable forms (record whichever is built):**

- **Form A — "Sidekick"** (Chrome extension side panel, works on ANY site): summarize the current page, translate a selection, proofread an input, rewrite text, explain an image, warn before pasting private data, and drive a page's WebMCP tools. Shot pattern: keep the host site on the left, the side panel on the right; PIP the speaker bottom-left. Move deliberately through 3–4 capabilities, don't rush all seven.
- **Form B — "The Fridge"** (web app): fridge photo → recipe ideas (multimodal Prompt API) → translate a foreign recipe → summarize the steps → a voice agent scales/swaps ingredients via WebMCP. Shot pattern: full-screen cap, one clean linear pass through the flow; overlay a small caption per stage naming the API in play.

**B-roll opportunities:**
- Quick montage (2 seconds total) of the demos already shown, fast-cut to land "design space"
- Generic "developer at desk" if appropriate, but avoid overuse
- For the finale, a 1-sec caption sequence naming each API as it fires ("Summarizer → Translator → Prompt API → WebMCP")

### Section 6 — Close (26:30 – 27:30)

| Time | Shot | Notes |
|---|---|---|
| 26:30 | Speaker cam | "The closing line" — slowed pace, eye contact |
| 27:00 | Slide 30 | The closing slide; hold |
| 27:15 | Slide 31 | Resources slide |
| 27:30 | Speaker cam | "Thank you, I'd love to take questions" |

## On-screen text — masters

These overlays appear in multiple places; standardize the font/style:

- **API name lower-thirds** — appear once per API on first mention. Style: medium-weight sans-serif, lower-left, fade in 0.3s.
- **Code emphasis highlight** — yellow underline animation over a specific line when speaker lands the relevant beat.
- **"0 requests" / "0 ms" / "0 bytes"** — large, center-screen, briefly held (1 second each), bold.
- **URL lower-third** — `windowai.danduh.me/<route>` appears whenever a new demo opens. Style: smaller, lower-right.

## B-roll inventory to capture

If you have a recording day, also capture:

1. Speaker cam, 30 seconds of "intent listening" — useful as a cutaway when transitioning sections.
2. Close-up shot of the demo laptop's screen with the network tab visible — for the opening hook.
3. Hands-on-keyboard shot — generic, transitional.
4. The Chrome flags page (`chrome://flags/`) scrolling, for the setup section if you decide to add one — include `chrome://flags/#enable-webmcp-testing` for the WebMCP local-dev beat.
5. The `chrome://on-device-internals/` model status page — useful for the "everything you saw runs from here" beat.

## Demo failure plan

Every live demo has a fallback (see `demo/runbook.md`). If a demo fails in recording:

- **Take 1:** retry the demo on-camera; if it works, edit out the first attempt
- **Take 2 (cleaner):** cut to a pre-recorded screen capture of the same demo and voice-over from this script
- **Take 3 (cleanest):** cut to slide showing the same outcome with code + caption

Don't pretend a failure didn't happen on stage; do hide it in the recording. The talk is the artifact.

## Master timeline summary

```
0:00 ─────── 2:30 ─────── 5:30 ─────────── 19:00 ──── 22:00 ──────── 26:30 ── 27:30
   Hook       Shift          API Surface     Patterns   Opportunity+Finale  Close
                            (5:30–19:00)
                                       │
                       ┌──────┬────────┼────────┬──────┐
                  LM 3:30  Task 3:30  Trans 1:30  MM 2:00  WebMCP 3:00
```

Total master target: **27:30**.
Q&A buffer: **+5:00** built into the venue slot (post-master).

**Retiming note (v2):** WebMCP (3e) grew from 1:30 to 3:00 to carry the origin-trial news, session-inheritance idea, adopter wall, efficiency stats, and Google demo suite. The opportunity section now folds in the ~2:00 grand-finale kitchen-sink demo. Net master runtime moved from 25:30 to 27:30 — confirm this still fits the venue slot before recording.
