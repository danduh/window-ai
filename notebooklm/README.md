# NotebookLM Source Pack — "Small LLM in your Browser"

**Talk title:** *Small LLM in your Browser — Huge Opportunities for Web Applications*
**Target length:** ~30 minutes (24–28 min talk + 2–6 min Q&A)
**Audience:** working web developers; some AI familiarity, no ML background assumed.
**Companion site:** [windowai.danduh.me](https://windowai.danduh.me) — all demos are live.

This folder is the **input + production pack** for a NotebookLM-driven content project. NotebookLM ingests the `sources/` markdown to power its Q&A, mind map, and audio overview. The `script/`, `slides/`, and `demo/` artifacts are the human-authored deliverables that NotebookLM cannot produce.

## Folder map

| Path | What it is | Who consumes it |
|------|------------|-----------------|
| `sources/00-thesis-and-opportunity.md` | Talk thesis, headline numbers, one-paragraph elevator | NotebookLM + you |
| `sources/01-why-on-device-now.md` | The shift: privacy, cost, latency, offline | NotebookLM |
| `sources/02-chrome-builtin-apis-overview.md` | API surface tour at a glance | NotebookLM |
| `sources/03-prompt-api.md` | `LanguageModel` deep dive (Gemini Nano) | NotebookLM |
| `sources/04-task-apis.md` | Summarizer, Writer, Rewriter, Proofreader | NotebookLM |
| `sources/05-translation.md` | `Translator` + `LanguageDetector` + live voice translation | NotebookLM |
| `sources/06-multimodal.md` | Image + webcam input via `expectedInputs` | NotebookLM |
| `sources/07-webmcp.md` | `document.modelContext` (WebMCP) — page as tool surface | NotebookLM |
| `sources/08-architecture-patterns.md` | Streaming, availability, fallbacks, session reuse | NotebookLM |
| `sources/09-opportunities.md` | Concrete app categories unlocked by on-device AI | NotebookLM |
| `sources/10-limitations-and-roadmap.md` | What doesn't work yet; what's coming | NotebookLM |
| `script/narration-v2.md` | **Current** full talk narration (B2 English, ~30 min, Chrome 150 facts) | You (record) |
| `slides/outline-v2.md` | **Current** slide-by-slide outline (39 slides) | You / pptx builder |
| `slides/Small-LLM-in-your-Browser-v2.pptx` | **Current** built deck (Payoneer brand, speaker notes in each slide) | You (present) |
| `script/narration.md` | v1 narration — **superseded** by v2 | reference only |
| `slides/outline.md` | v1 outline — **superseded** by v2 | reference only |
| `script/shot-list.md` | Video shot list, B-roll, on-screen text cuts | You / video editor |
| `demo/runbook.md` | Click-by-click demo flow with fallbacks | You (live demo) |
| `image1.png` | Payoneer logo (used in the v2 deck) | asset |

## How to use this in NotebookLM

1. Create a new NotebookLM notebook titled *"Small LLM in your Browser"*.
2. Upload all 11 files from `sources/` as separate sources. NotebookLM works better with multiple focused sources than one giant document — its retrieval surfaces tighter quotes.
3. Optionally upload the current deck `slides/Small-LLM-in-your-Browser-v2.pptx` for slide context.
4. Generate the **Audio Overview** ("Deep Dive") — useful for reviewing the talk's coherence by listening to the AI hosts discuss it.
5. Generate the **Mind Map** — sanity-check that the structure flows.
6. Use the Q&A box to interrogate your own material: *"What's the strongest counterargument to running LLMs in the browser?"* / *"What demo should open the talk?"* / *"Which API is most likely to disappear?"*

## Talk thesis (one sentence)

> Web apps just got a free, private, offline-capable LLM — every Chrome user already has it on their disk — and the developer surface to use it is small, stable enough to ship on, and unlocks a new category of ambient, real-time AI features that were economically impossible 18 months ago.

## Status

- Generated 2026-05-24. **Aligned to current facts 2026-07-02.**
- Source content reflects **Chrome 150 stable** (July 2026):
  - Summarizer / Translator / Language Detector — stable since Chrome 138.
  - Prompt API (`LanguageModel`) — stable on the web since Chrome 148 (multimodal + structured output).
  - Writer / Rewriter / Proofreader — still origin trial / behind a flag.
  - WebMCP — public origin trial from Chrome 149; entry point moved to `document.modelContext` (`navigator.modelContext` deprecated in Chrome 150). Still a moving draft — do not ship to production.
- The **v2** deck/narration/outline are the delivery-ready artifacts; the v1 files are kept for reference.
- Update when API shapes change — WebMCP especially.
