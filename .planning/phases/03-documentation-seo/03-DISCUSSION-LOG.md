# Phase 3: Documentation + SEO — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `03-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 03-documentation-seo
**Areas discussed:** Content depth & structure, Code sample selection, SEO per-tab differentiation
**Areas declined:** External links & CTA (deferred to Claude's Discretion)

---

## Gray-area selection

**Question:** Which gray areas do you want to discuss for Phase 3 (Documentation + SEO)?

| Option | Description | Selected |
|--------|-------------|----------|
| Content depth & structure | Reference-manual style (~450-500 lines, exhaustive like Writer-ReWriter-API.md) vs lean explainer (~200-300 lines, matches '2-min demo' DoD). Section list, tone. | ✓ |
| Code sample selection | Mirror our 8 recipe tools (concrete, on-message) vs abstract examples (familiar pattern) vs both. DOCS-01 requires ≥2. | ✓ |
| SEO per-tab differentiation | Add seoConfigs.webmcpDocs + switch useSEOData by URL/tab so /webmcp/docs has a distinct title in <head> at runtime — or rely only on prerender HTML. | ✓ |
| External links & CTA | Cross-links to W3C draft, GitHub repo, Tool Inspector extension? In-doc 'Try the demo →' button? | |

**User's choice:** Content depth & structure, Code sample selection, SEO per-tab differentiation

---

## Content depth & structure

### Q1: What overall depth should the WebMCP doc target?

| Option | Description | Selected |
|--------|-------------|----------|
| Lean explainer (~200-300 lines) | Matches '2-min demo, not reference-quality' DoD. Closer to Translate-API.md (316 lines). | |
| Reference-style (~400-500 lines) | Mirrors Writer-ReWriter-API.md (490 lines) and Chat-API.md (432 lines). More comprehensive. | |
| Hybrid (~300-400 lines) | Lean overview + 2 deep code samples + concise security/browser-support sections. | ✓ |

**User's choice:** Hybrid (~300-400 lines)

### Q2: Which doc filename do we lock?

| Option | Description | Selected |
|--------|-------------|----------|
| WebMCP-API.md (Recommended) | Matches site convention; already referenced in placeholder at RecipeWorkbenchPage.tsx:253. | ✓ |
| webmcp.md | Lowercase, matches REQUIREMENTS.md DOCS-01 hint. Inconsistent with other doc filenames. | |

**User's choice:** WebMCP-API.md

### Q3: Which sections must the doc include? (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| What WebMCP is + W3C spec status | Required by DOCS-01. One paragraph + Feb 2026 W3C Draft callout. | ✓ |
| API surface (registerTool / provideContext / unregisterTool) | Required by DOCS-01. Signature + descriptor shape + JSON Schema input. | ✓ |
| Security / permission model | Required by DOCS-01. Inherits browser session, no OAuth, user-mediated. | ✓ |
| Browser support + how to enable the flag | Required by DOCS-01. Chrome 146+ Canary, Edge 147+, chrome://flags/#WebMCP for testing. | ✓ |

**User's choice:** All four (DOCS-01 sections)

---

## Code sample selection

### Q1: What flavor should the code samples take?

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror our shipped recipe tools (Recommended) | Use real RECIPE_TOOLS examples. Concrete, on-message. | ✓ |
| Abstract examples (e.g. weather, calculator) | Generic 'getWeather' / 'add' style — disconnected from the live demo. | |
| Both — abstract first, recipe second | Open with toy example, then a real RECIPE_TOOLS snippet. | |

**User's choice:** Mirror our shipped recipe tools

### Q2: How many code samples should ship in v1 of the doc?

| Option | Description | Selected |
|--------|-------------|----------|
| Exactly 2 (DOCS-01 minimum) | One registration example + one consumption example. Fastest to ship. | ✓ |
| 3-4 samples (Recommended) | Registration + tool-calling consumption + unregister-on-unmount + permission/security illustration. | |
| 5+ samples | Adds provideContext, JSON Schema patterns, error-handling shape. | |

**User's choice:** Exactly 2 (DOCS-01 minimum)

### Q3: Should the in-page LanguageModel + WebMCP loop be shown as one of the samples?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — dedicated 'one definition, two consumers' sample (Recommended) | Shows the headline value: same RECIPE_TOOLS array drives both consumers. | ✓ |
| No — keep doc focused on registerTool only | Doc covers WebMCP API surface; LanguageModel integration stays implicit. | |

**User's choice:** Yes — 'one definition, two consumers'

---

## SEO per-tab differentiation

### Q1: How should the rendered <head> change between /webmcp and /webmcp/docs at runtime?

| Option | Description | Selected |
|--------|-------------|----------|
| Add seoConfigs.webmcpDocs + path-aware useSEOData (Recommended) | RecipeWorkbenchPage detects useLocation().pathname and calls useSEOData with webmcp or webmcpDocs accordingly. | ✓ |
| Rely on prerender HTML only | SPA navigation between tabs would not update <head>. Fails DOCS-02 'observable in <head>' if observed via SPA. | |
| Single SEO config for both | Drops DOCS-02 below requirement. | |

**User's choice:** Add seoConfigs.webmcpDocs + path-aware useSEOData

### Q2: What should the /webmcp/docs title and description emphasize?

| Option | Description | Selected |
|--------|-------------|----------|
| Match prerender getSEODataForRoute already in chat/scripts/prerender-react.js (Recommended) | Title: 'WebMCP API Documentation - Recipe Workbench guide \| Chrome AI APIs'. Locks consistency between prerender + runtime. | ✓ |
| Author fresh title/description tuned for the doc audience | Risks divergence from prerender HTML. | |

**User's choice:** Match prerender getSEODataForRoute verbatim

### Q3: Should the SPA also update the URL when the user clicks the Docs tab?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — already handled by Tabs component | Tabs.tsx already navigates to /webmcp/docs when the Docs tab is clicked. No new work. | ✓ |
| Need to verify before locking | Add a verification task during planning. | |

**User's choice:** Already handled by Tabs component

---

## Wrap-up

### Q: Anything else, or ready to write CONTEXT.md?

| Option | Description | Selected |
|--------|-------------|----------|
| Ready for context | Lock everything, write 03-CONTEXT.md, route to /gsd-plan-phase 3. | ✓ |
| Discuss external links & CTA | Cross-links to W3C / GitHub / Tool Inspector + 'Try the demo →' CTA. | |
| Something else | Tone/voice, doc tab default behavior, cross-link to other site demos. | |

**User's choice:** Ready for context

---

## Claude's Discretion

- Section ordering inside `WebMCP-API.md`
- Inline tone (planner inherits matter-of-fact register from existing docs)
- Optional "Limitations / Not in v1" callout
- JSON Schema example sophistication for sample 1
- Whether to mention `MissingFlagBanner` in the Browser Support section
- Optional "References" / "See Also" footer with W3C / GitHub / Tool Inspector links (deferred area absorbed here as a minimal-scope footer at planner discretion; anything beyond a footer is out of scope)

## Deferred Ideas

- **External links + CTA section** — Beyond a minimal footer. Out of scope for this phase.
- **V2-08 additional tools coverage** — Out of v1.
- **Polished error states / a11y / analytics for docs route** — Inherits milestone "out of scope".
- **Tone/voice exploration** — Not discussed; planner inherits from existing docs.
