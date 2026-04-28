# Phase 3: Documentation + SEO — Research

**Researched:** 2026-04-28
**Domain:** Markdown documentation authoring (mirroring existing `chat/src/app/docs/*.md` shape) + path-aware runtime SEO (`useSEOData` keyed on `useLocation().pathname`)
**Confidence:** HIGH for codebase patterns; HIGH for SEO wiring; MEDIUM for WebMCP API surface (spec is moving — current draft IDL exposes only `registerTool`, but earlier drafts and ambient types in this repo still reference `provideContext` / `unregisterTool`).

## Summary

Phase 3 is a small, mechanical phase: author one new markdown file (`chat/src/app/docs/WebMCP-API.md`), append one entry to `seoConfigs` (`webmcpDocs`), make `useSEOData` path-aware in `RecipeWorkbenchPage.tsx`, and replace the Phase 2 placeholder under the Docs tab with a `<DocsRenderer docFile="WebMCP-API.md" initOpen={true} />` mount. All 11 lockable decisions have been frozen in `03-CONTEXT.md`; this research fills the "what does the doc body say, and what does the runtime swap look like" gap.

The headline finding is a **spec drift gap**: the current W3C Draft Community Group Report (April 23, 2026 — *not* February 10, 2026 as still referenced in places) defines exactly **one** method on `ModelContext`: `registerTool`. Earlier drafts had `provideContext` / `unregisterTool` / `clearContext`; these were removed in March 2026. This repository's ambient `webmcp.d.ts` still declares `provideContext`, but no production code calls it, and the registration code at `RecipeWorkbenchPage.tsx:178` already uses `AbortSignal`-based unregistration consistent with the current spec. CONTEXT.md D-03 lists `provideContext` and `unregisterTool` as required API-surface coverage in the doc — the planner needs to decide whether to (a) describe the current spec only, (b) cover removed methods as "earlier drafts" historical context, or (c) describe `provideContext` because it still appears in this repo's `webmcp.d.ts`. The doc must clearly version-pin its snapshot so future readers know what minimum to expect.

**Primary recommendation:** Mirror the structural template from `Tool-Calling-API.md` (closest tonal/structural match, ships at 417 lines — comparable to the D-01 hybrid 300-400 line target). Open with a "W3C Draft Community Group Report — snapshot of Apr 23, 2026" callout to version-pin against ongoing spec churn. Use `RECIPE_TOOLS[4]` (`scaleRecipe`) for Sample 1 because it's the headline demo tool. Build Sample 2 around `RECIPE_TOOLS` + `toLanguageModelTools(RECIPE_TOOLS, onEvent)` (the **plural** export — `toLanguageModelTool` singular does not exist) — the planner should simplify away the event callback in the doc snippet to keep the "one definition, two consumers" message uncluttered. Path-aware `useSEOData` is novel in this codebase (no other page does it); use `useLocation()` + a `useMemo` selecting `seoConfigs.webmcpDocs` when `location.pathname.startsWith('/webmcp/docs')` else `seoConfigs.webmcp`.

<user_constraints>
## User Constraints (from 03-CONTEXT.md)

### Locked Decisions

**Doc Content & Structure**
- **D-01: Hybrid depth (~300-400 lines).** Lean enough to honor the milestone DoD ("2-min demo, not reference-quality") but long enough to cover all 4 DOCS-01 sections with substance. Splits the difference between Translate-API.md (316 lines, lean) and Writer-ReWriter-API.md (490 lines, exhaustive).
- **D-02: Filename `WebMCP-API.md`.** Matches site convention. Already referenced by the placeholder copy at `RecipeWorkbenchPage.tsx:253`. Closes the inconsistency where REQUIREMENTS.md DOCS-01 mentioned `webmcp.md`.
- **D-03: Required sections (all 4 from DOCS-01):**
  1. **Overview** — What WebMCP is + W3C Draft Feb 2026 status callout. *(Note: this research found the current draft is Apr 23, 2026 — see Spec Drift Risk below.)*
  2. **API surface** — `navigator.modelContext.registerTool`, `provideContext`, `unregisterTool`. Descriptor shape (`{name, description, inputSchema, handler, annotations?}`). JSON Schema input pattern. *(Note: `provideContext`/`unregisterTool` removed from current IDL — see Pitfall §"Spec drift: methods removed".)*
  3. **Security / permission model** — Inherits the user's browser session, no OAuth, user-mediated, runs only on the page that registered the tool.
  4. **Browser support + flag** — Chrome 146+ Canary, Edge 147+, `chrome://flags/#WebMCP for testing`, fallback messaging (point at `MissingFlagBanner` for context).

**Code Samples (DOCS-01: ≥2)**
- **D-04: Exactly 2 samples, both drawn from real `RECIPE_TOOLS`.** No abstract `getWeather` filler.
- **D-05: Sample 1 — single-tool registration.** A pruned `scaleRecipe` (or similar) shown end-to-end, then `navigator.modelContext.registerTool(tool)` mount-time call.
- **D-06: Sample 2 — "one definition, two consumers".** Same `RECIPE_TOOLS` array feeding BOTH `navigator.modelContext.registerTool(tool)` AND `LanguageModel.create({ tools: RECIPE_TOOLS.map(toLanguageModelTool) })`. **HEADLINE sample.**
- **D-07: Sample fidelity.** May simplify (drop AbortController plumbing, drop duplicate-name try/catch) but stay typed. **No `as any`** — must compile against `webmcp.d.ts`.

**SEO per-tab differentiation (DOCS-02)**
- **D-08: Add `seoConfigs.webmcpDocs` matching prerender-react.js:357-367 verbatim:**
  - title: `WebMCP API Documentation - Recipe Workbench guide | Chrome AI APIs`
  - description: `Documentation for the WebMCP Recipe Workbench demo. Walks through navigator.modelContext, registerTool, and provideContext.`
  - keywords: `WebMCP documentation, navigator.modelContext API, registerTool, provideContext, page-side tools docs`
- **D-09: Path-aware `useSEOData` in `RecipeWorkbenchPage.tsx`.** Replace unconditional call at line 105 with a `useLocation()`-driven switch.
- **D-10: No URL plumbing changes.** Tabs.tsx already syncs URL ↔ tab.
- **D-11: Wire the Docs tab content.** Replace placeholder at lines 249-256 with `<DocsRenderer docFile="WebMCP-API.md" initOpen={true} />`, mirror `WriteRewritePage.tsx:261` styling (`<div className="max-w-none">` wrapper).

### Claude's Discretion

- **Section ordering** inside `WebMCP-API.md` (all 4 DOCS-01 sections required, order flexible).
- **Inline tone** — match matter-of-fact register of `Translate-API.md` / `Writer-ReWriter-API.md`.
- **Optional "Limitations" / "Not in v1" callout** — helps set expectations.
- **JSON Schema example sophistication** — flat shape OR pull a richer one from `recipeTools.ts`.
- **Whether to reference `MissingFlagBanner.tsx`** — good context, not required.

### Deferred Ideas (OUT OF SCOPE)

- External links + CTA section (cross-links to W3C draft / GitHub repo / Tool Inspector) — minimal "References" footer is fine, anything more is out.
- Polished error states / a11y audit / analytics events for the docs route.
- Tone/voice exploration.
- Content for V2-08 additional tools (`convertToMetric`, `simplifyInstructions`, `findSubstitute`).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **NAV-02** | A new `/webmcp/docs` route is registered and renders the WebMCP markdown explainer via `DocsRenderer`, matching the structure of the existing `/writer` and `/summary` doc tabs | Route registration shipped in Phase 1 (`AppRouter.tsx` + `prerender-react.js`); Tabs.tsx URL-sync confirmed to drive `/webmcp/docs` → Docs tab. This phase **completes** NAV-02 by replacing the placeholder content with the live `DocsRenderer` mount per D-11. |
| **DOCS-01** | A markdown explainer covers what WebMCP is, W3C spec status, the `navigator.modelContext.registerTool` API surface, security/permission model, browser support (Chrome 146+ / Edge 147+), and ≥2 code samples | This phase authors `chat/src/app/docs/WebMCP-API.md` per D-01..D-07. Research below provides: (1) verified current API surface from W3C draft, (2) two real-code samples derived from `RECIPE_TOOLS` + `toLanguageModelTools`, (3) version-pinned spec status callout, (4) browser-support copy. |
| **DOCS-02** | SEO metadata (title, description) is set for both `/webmcp` and `/webmcp/docs` routes via the existing `SEOProvider` pattern, observable in the rendered `<head>` | This phase adds `seoConfigs.webmcpDocs` and makes `useSEOData` path-aware (D-08 + D-09). Verbatim strings already pre-authored in `prerender-react.js:357-367`; runtime config matches them so `<title>` and `<meta>` swap when the user clicks the Docs tab. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Markdown content authoring (`WebMCP-API.md`) | Static asset (Vite `import.meta.glob`-style markdown loader) | — | `loadMDFile` dynamically `import()`s the file at render time; pure content — no runtime logic. |
| Markdown rendering (Prism, dark mode, shadow DOM) | Browser / Client (React component) | — | `DocsRenderer.tsx` already handles all of this; this phase only mounts it. |
| SEO `<head>` writes (title, meta, og:, canonical) | Browser / Client (`useSEOData` → `SEOContext`) | Build / Static (`prerender-react.js` for crawlers) | Runtime config in `useSEOData.ts` writes via React; prerender output is the SEO baseline for crawlers. **Both must agree** — D-08 makes runtime match prerender verbatim. |
| Path-aware tab → `<head>` swap | Browser / Client (`useLocation()` in `RecipeWorkbenchPage`) | — | Pure client routing decision; no server-side branching since `/webmcp` and `/webmcp/docs` both render `RecipeWorkbenchPage`. |

**Why this matters:** The phase touches three layers (static assets, runtime React, build-time prerender) but only the runtime React layer changes — the static markdown is a new file (additive), and prerender already has the correct strings. Misassigning the SEO swap to the build-time prerender (which is already correct) would waste effort; the phase's job is the **runtime** swap, which is the only thing currently missing.

## Standard Stack

### Core (already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-markdown` | (installed) | Markdown → React rendering inside `DocsRenderer.tsx` | `[VERIFIED: chat/src/app/tools/DocsRenderer.tsx:2]` Already used by every existing doc page; this phase requires no new install. |
| `remark-gfm` | (installed) | GitHub-flavored markdown (tables, strikethrough) | `[VERIFIED: DocsRenderer.tsx:3]` Already wired into `<Markdown remarkPlugins={[remarkGfm]} />`. |
| `react-syntax-highlighter` (Prism) | (installed) | Code block syntax highlighting with `dracula` theme | `[VERIFIED: DocsRenderer.tsx:7-8]` Auto-applied to fenced code blocks via `language-*` className. |
| `react-router-dom` | v6 | `useLocation()` for path-aware SEO swap | `[VERIFIED: chat/src/app/components/Tabs.tsx:2, useGoogleAnalytics.ts:2]` Already in use; v6 first-match semantics already exercised in `AppRouter.tsx`. |

### Supporting (already in repo)

| Module | Purpose | When to Use |
|--------|---------|-------------|
| `chat/src/app/tools/DocsRenderer.tsx` | Single integration point for any markdown doc | Mount with `<DocsRenderer docFile="WebMCP-API.md" initOpen={true} />` (D-11) |
| `chat/src/app/tools/md-loader.ts` | Async markdown loader (`loadMDFile(filename)`) | Called by `DocsRenderer`; we never call it directly |
| `chat/src/app/hooks/useSEOData.ts` | Path-aware SEO writer; `seoConfigs` map | Add `webmcpDocs` key (D-08); call path-aware `useSEOData` in `RecipeWorkbenchPage` (D-09) |
| `chat/src/app/services/recipeTools.ts` | Source of `RECIPE_TOOLS` for code samples | Pull real `scaleRecipe` (Sample 1) and the array (Sample 2) from this file |
| `chat/src/app/services/toolAdapter.ts` | `toLanguageModelTools` (plural) — already exists | Sample 2 references this; **note plural name** |
| `chat/src/app/types/webmcp.d.ts` | Ambient `ModelContextTool` type | Code samples must compile against this — no `as any` |

### Alternatives Considered (and rejected — locked by CONTEXT.md)

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `WebMCP-API.md` (D-02) | `webmcp.md` (REQUIREMENTS.md DOCS-01 alternate) | CONTEXT.md D-02 closes this; `WebMCP-API.md` matches existing convention and is already referenced by the Phase 2 placeholder. |
| Path-aware `useSEOData` (D-09) | Two separate page components, each with its own `useSEOData` | More invasive; both routes already render the same `RecipeWorkbenchPage` and Tabs handles the body swap. |
| `<DocsRenderer initOpen={false}>` with toggle button | `<DocsRenderer initOpen={true}>` (D-11) | The Docs tab IS the doc — no need for a "Show Documentation" button inside the tab. Mirrors `Summary.tsx:183`, `WriteRewritePage.tsx:261`. |

**Installation:** None. No new dependencies.

**Version verification:** Skipped — phase adds no new packages; existing tooling versions are pinned in `package.json` and unchanged.

## Architecture Patterns

### System Architecture Diagram

```
                         user clicks "Docs" tab
                                  │
                                  ▼
                   Tabs.tsx (handleTabChange → navigate)
                                  │
                                  ▼
                  React Router → URL: /webmcp/docs
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
       RecipeWorkbenchPage re-renders    Tabs.tsx useEffect
                  │                       sees new pathname,
                  │                       sets activeTab='docs'
                  ▼                               │
   useSEOData(seoConfigs.webmcpDocs,             ▼
              '/webmcp/docs')          Renders Docs tab content:
                  │                    <DocsRenderer docFile=
                  ▼                       "WebMCP-API.md"
       SEOContext.updateSEO              initOpen={true} />
                  │                               │
                  ▼                               ▼
       <head>:  <title>WebMCP API     loadMDFile('WebMCP-API.md')
                Documentation - …</   → dynamic import → markdown text
                title>                          │
                <meta name=               <Markdown>
                description …>            (Prism, remarkGfm,
                                          rehypeRaw)
                                                  │
                                                  ▼
                                          Rendered docs in
                                          shadow-DOM container
```

The SEO update and the Docs render fire on the SAME navigation event but are **independent paths**: one writes to `<head>`, the other writes to the tab body. Both must complete for DOCS-01 + DOCS-02 to pass.

### Recommended File Layout

```
chat/src/app/
├── docs/
│   ├── WebMCP-API.md                    # NEW (this phase)
│   ├── Tool-Calling-API.md              # structural template
│   ├── Translate-API.md                 # lean (316 lines)
│   ├── Writer-ReWriter-API.md           # exhaustive (490 lines)
│   ├── Summary-API.md
│   └── Chat-API.md
├── hooks/
│   └── useSEOData.ts                    # MODIFY — add webmcpDocs key
├── components/
│   └── RecipeWorkbenchPage.tsx          # MODIFY — path-aware useSEOData + DocsRenderer mount
└── types/
    └── webmcp.d.ts                      # READ-ONLY — code samples must compile against
```

### Pattern 1: Path-aware `useSEOData` switch (NEW for this codebase)

**What:** Use `useLocation()` from `react-router-dom` to select which `seoConfigs` entry to feed `useSEOData` based on the current pathname.

**When to use:** When a single page component handles multiple URLs that should each have distinct `<head>` metadata. (`RecipeWorkbenchPage` is the only page in this codebase that does this — Chat/Summary/Writer/Translate each route to dedicated documentation page components.)

**Example:**
```tsx
// chat/src/app/components/RecipeWorkbenchPage.tsx
// Source: NEW pattern — verified non-existent elsewhere in codebase via grep
import { useLocation } from 'react-router-dom';
import { useSEOData, seoConfigs } from '../hooks/useSEOData';

export const RecipeWorkbenchPage: React.FC = () => {
  const location = useLocation();
  const isDocs = location.pathname.startsWith('/webmcp/docs');
  // useSEOData internally gates on `[config, path, updateSEO]` — passing
  // different references re-fires the effect and updates <head>.
  useSEOData(
    isDocs ? seoConfigs.webmcpDocs : seoConfigs.webmcp,
    isDocs ? '/webmcp/docs' : '/webmcp',
  );
  // … rest of component unchanged
};
```

**Note:** `useSEOData`'s internal `useEffect` deps are `[config, path, updateSEO]` (`useSEOData.ts:27`). Passing a different `config` object reference re-fires it and writes new tags to `<head>`. The two `seoConfigs.*` entries are stable module-scope objects, so reference equality is preserved across renders within each branch.

### Pattern 2: DocsRenderer-as-tab-content

**What:** Mount `DocsRenderer` directly inside a Tab's `content` field with `initOpen={true}` and a max-width container.

**When to use:** Any tab whose entire content is a markdown doc (no other UI alongside).

**Example (verbatim from `WriteRewritePage.tsx:255-263`):**
```tsx
// Source: chat/src/app/components/WriteRewritePage.tsx:255-263
{
  id: 'docs',
  label: 'API Documentation',
  path: '/writer-api-documentation',
  content: (
    <div className="max-w-none">
      <DocsRenderer docFile="Writer-ReWriter-API.md" initOpen={true} />
    </div>
  )
}
```

**For this phase**, the equivalent in `RecipeWorkbenchPage.tsx:249-256` becomes:
```tsx
// Source: D-11 + WriteRewritePage.tsx:255-263 styling pattern
{
  id: 'docs',
  label: 'Docs',
  path: '/docs',
  content: (
    <div className="max-w-none">
      <DocsRenderer docFile="WebMCP-API.md" initOpen={true} />
    </div>
  ),
}
```

The current placeholder uses an explicit Tailwind container (`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200`). When swapping to `DocsRenderer`, **drop this outer styling** in favor of `<div className="max-w-none">` because `DocsRenderer` itself renders a styled `bg-white dark:bg-gray-800 rounded-lg overflow-hidden` container at `DocsRenderer.tsx:41`. Doubling the container would create nested cards.

### Pattern 3: Markdown structural template

**What:** Mirror `Tool-Calling-API.md` (closest tonal/structural match — covers an API + tool descriptors, ships at 417 lines).

**Section sequence used by `Tool-Calling-API.md`:**
1. `# <Title>` — opening one-paragraph what-it-is.
2. `## Overview` — bulleted "what it does" + 1-2 paragraph elaboration.
3. `## Basic Usage` — first concrete code example with subsection `### Creating a Session with Tools`.
4. `## <Sub-API>` heading per major method (e.g., `### Tool Definition Structure`, `## Input Schema`, `## Execute Function`).
5. `## Example <Tools|Recipes|...>` — additional code samples (Calculator, Weather, Time in Tool-Calling).
6. `## Best Practices` — bulleted lists by topic (Tool Design, Performance, Security).
7. `## Error Handling` — patterns + code.
8. `## Advanced Examples` — richer scenarios.
9. `## Limitations` — short bulleted list.
10. `## Troubleshooting` — Common Issues + Debug Checklist.

This phase doesn't need ALL of these — D-01's 300-400 line target sits between Translate-API.md (316) and Tool-Calling-API.md (417). A reasonable cut: drop `## Best Practices`, `## Advanced Examples`, `## Troubleshooting`, and consolidate `## Error Handling` into the Security section or a single "Limitations" callout.

**Recommended section order for `WebMCP-API.md`:**
```
# WebMCP API — Recipe Workbench guide

## Overview                     (D-03 §1; W3C status callout here)
## Browser Support              (D-03 §4; flag, Canary, Edge, fallback banner)
## API Surface                  (D-03 §2; registerTool, descriptor shape, JSON Schema)
## Code Sample 1: Single Tool   (D-05; pruned scaleRecipe + registerTool call)
## Code Sample 2: One Definition, Two Consumers   (D-06; HEADLINE)
## Security & Permission Model  (D-03 §3)
## Limitations                  (optional per Discretion; non-streaming, no polyfill)
## References                   (optional per Discretion + Deferred footer)
```

CONTEXT.md "section ordering" is at Claude's Discretion as long as all 4 DOCS-01 sections appear; the order above leads with Browser Support immediately after Overview because the doc is useless to a reader who isn't on Chrome 146+ Canary. The "common flow" CONTEXT.md mentions (Overview → Browser support → API surface → Security) is what I've recommended.

### Pattern 4: Code fence languages

**What:** Use ` ```typescript ` for type-bearing snippets, ` ```javascript ` for runtime-only snippets, ` ```json ` for JSON Schema blobs, ` ```bash ` for terminal commands. All four are pre-configured in Prism via `react-syntax-highlighter`.

**Why:** Existing docs are inconsistent — `Tool-Calling-API.md` uses `javascript` for everything, `Translate-API.md` uses `javascript`, `Writer-ReWriter-API.md` uses `javascript`. For new authoring, use `typescript` for snippets that show TypeScript-specific syntax (interfaces, generics, type imports), otherwise `javascript`. This matches the codebase's TS-strict reality without forcing readers who copy snippets into a TS context.

### Anti-Patterns to Avoid

- **Doubling the doc container.** `DocsRenderer` renders its own card; wrapping it in another `bg-white dark:bg-gray-800 rounded-xl shadow-lg …` makes a card-in-a-card. Use `<div className="max-w-none">` only.
- **Mounting `useSEOData` after `useEffect` hooks.** Place it as the **first** statement in the component body (currently is at line 105 — keep it first when refactoring per D-09). Hook-order rules require it.
- **Recomputing the SEO branch inline in JSX.** Compute `isDocs` (or the chosen config) once at the top of the component so the `useSEOData` deps array gets stable references.
- **`as any` in code samples** (D-07). The ambient `ModelContextTool` type is in scope globally via `webmcp.d.ts` — samples should compile cleanly.
- **Citing the W3C draft as "stable" or as a "W3C Recommendation".** It is a Draft Community Group Report (NOT a W3C standard); the doc must say so verbatim.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown rendering | Custom react-markdown wrapper | `DocsRenderer` (existing) | Already handles dark mode, Prism, shadow DOM, lazy load. Adding a second renderer fragments the doc UX. |
| Tab → URL sync | Custom history management | `Tabs basePath="/webmcp"` (existing) | Already round-trips path ↔ tab via `useLocation` + `navigate`. Phase 2 verified. |
| Path-aware SEO branching at the route layer | `<Route path="/webmcp" element={<WorkbenchSEO/>}/>` + `<Route path="/webmcp/docs" element={<DocsSEO/>}/>` wrapper components | `useLocation()` inside the existing single component | The page already lives at one component; introducing wrapper components multiplies code paths and breaks Phase 1's "both routes render `RecipeWorkbenchPage`" pattern. |
| Code-sample data | Hand-typed mock tool definitions | Real `RECIPE_TOOLS` entries (D-04) | The whole point of Sample 2 is "the same code that runs on the next tab". Mock data dilutes the message. |
| Markdown loader | Custom fetch + cache | `loadMDFile()` (existing) | Single-line dynamic import; cache is Vite/browser; no value in re-implementing. |

**Key insight:** Every "complex" piece of this phase is already solved. The actual work is **content** (~350 lines of markdown) and **wiring** (~10-line useSEOData refactor + 4-line DocsRenderer mount + ~6-line `seoConfigs.webmcpDocs` entry). Resist the urge to add infrastructure.

## Common Pitfalls

### Pitfall 1: Spec drift — `provideContext` / `unregisterTool` removed from current IDL

**What goes wrong:** The doc covers methods that don't exist in the current `navigator.modelContext` shipping in Chrome 146 Canary, or the doc covers only `registerTool` while CONTEXT.md D-03 demands coverage of `provideContext` / `unregisterTool`.

**Why it happens:** The W3C draft has been moving fast. As of `[VERIFIED: webmachinelearning.github.io/webmcp Apr 23 2026 IDL block]`, the `ModelContext` interface exposes exactly **one** method: `registerTool`. Earlier drafts (Feb 2026) had `provideContext` / `unregisterTool` / `clearContext`; these were `[VERIFIED: searchengineland.com / bug0.com / multiple Apr 2026 sources]` removed in March 2026. Yet:
- This repo's `chat/src/app/types/webmcp.d.ts:21` still declares `provideContext(context: object): void`.
- This repo's `RecipeWorkbenchPage.tsx:140` comment correctly states "there is no separate `unregisterTool` method" and uses `AbortSignal`-based unregistration.
- CONTEXT.md D-03 lists `provideContext` and `unregisterTool` as required API-surface coverage.
- `prerender-react.js:359` keyword string mentions `provideContext` (locked verbatim by D-08).

**Resolution paths (planner picks one):**
- **(A) Cover only the current IDL** — describe `registerTool` + AbortSignal unregistration; add a "Spec history" note that earlier drafts had `provideContext`/`unregisterTool`/`clearContext` (removed March 2026). The keyword string in SEO can stay as-is; users searching for `provideContext` still land on the page that explains why it's gone. **Recommended** — most accurate to today's runtime.
- **(B) Cover all four for completeness** — describe `registerTool` (current) + `provideContext`/`unregisterTool`/`clearContext` (historical; mark each as "removed in March 2026, kept here for context"). Risk: implies they work today.
- **(C) Cover what `webmcp.d.ts` declares** — describe `registerTool` and `provideContext` (the two members of the local ambient type) but NOT `unregisterTool`. Inconsistent with the IDL; ambient type is itself stale.

**How to avoid:** Pick (A); version-pin the doc to "W3C Draft Community Group Report — snapshot of April 23, 2026"; add a one-line "Spec history" note. **Do not modify `webmcp.d.ts`** (out of scope per CONTEXT.md "don't refactor existing demos") — the stale `provideContext` declaration is a known follow-up.

**Warning signs:** Doc reviewer asks "do these methods actually exist?"; readers paste `navigator.modelContext.unregisterTool` into DevTools and get `undefined`.

### Pitfall 2: Spec date mismatch (Feb 2026 vs Apr 23, 2026)

**What goes wrong:** The doc cites "W3C Draft Feb 2026" but the current published draft is dated April 23, 2026.

**Why it happens:** The `[VERIFIED: webmachinelearning.github.io/webmcp]` "this version" date is **April 23, 2026**, not February 10, 2026. PROJECT.md context, CONTEXT.md D-01, and STATE.md "Risks Watched" all reference Feb 2026 — that was the date when Chrome 146 Canary started shipping the flag, not the current spec publication date.

**How to avoid:** In the doc's Overview section, write: *"This page documents WebMCP as of the W3C Draft Community Group Report dated April 23, 2026. WebMCP is not a W3C Recommendation; the API surface is changing — see the spec for the current state."* Reference the W3C draft URL once, prominently. Don't promise stability.

**Warning signs:** Reader pastes the doc's example into Chrome 146 and the API doesn't match.

### Pitfall 3: Sample 2 doesn't reflect what AgentDrawer actually does

**What goes wrong:** The doc shows `LanguageModel.create({ tools: RECIPE_TOOLS.map(toLanguageModelTool) })` but the production `AgentDrawer.tsx` doesn't use `LanguageModel.create({ tools })` at all — it uses a `responseFormat`-based JSON dispatch loop (`AgentDrawer.tsx:23-42` `INTENT_SCHEMA`, `:50-60` `SYSTEM_PROMPT`).

**Why it happens:** Phase 2 found `LanguageModel.create({ tools })` was broken on Chrome 147 Canary at the time and worked around it with a JSON-loop pattern. The "one definition, two consumers" narrative is the **idealized** WebMCP story (per PROJECT.md Decision Log row 3 + REQUIREMENTS.md AGENT-02 + Phase 2 D-01) — what the spec promises and what we'll switch back to once `LanguageModel.create({ tools })` stabilizes.

**Resolution:** D-07 explicitly permits sample fidelity simplifications ("MUST stay typed and runnable in spirit"). Sample 2 should show the **canonical** WebMCP narrative (`navigator.modelContext.registerTool` + `LanguageModel.create({ tools: RECIPE_TOOLS.map(toLanguageModelTool) })`), not the workaround. Optionally add a one-line note: *"This site's in-page agent uses a JSON-loop fallback while `LanguageModel.create({ tools })` stabilizes — see `AgentDrawer.tsx`."*

**Warning signs:** Reader copies Sample 2 into a sandbox, runs it on Chrome 147, the model never calls a tool. Mitigated by the optional fallback note.

### Pitfall 4: Export name confusion — `toLanguageModelTool` vs `toLanguageModelTools`

**What goes wrong:** Sample 2 uses `RECIPE_TOOLS.map(toLanguageModelTool)` (singular, like a per-tool adapter), but the actual export is `toLanguageModelTools` (plural, takes the array directly).

**Why it happens:** CONTEXT.md additional_context references `toLanguageModelTool` (singular); the codebase exports `toLanguageModelTools` (plural). `[VERIFIED: chat/src/app/services/toolAdapter.ts:47]`.

**How to avoid:** Sample 2 must call the array form:
```ts
import { toLanguageModelTools } from '../services/toolAdapter';
const session = await LanguageModel.create({
  tools: toLanguageModelTools(RECIPE_TOOLS, () => {}),  // 2nd arg is event sink
});
```
Or, for a doc-friendly simplification (D-07 permits dropping plumbing):
```ts
// Strip the event-sink complexity — keep the message clear.
const noopEvent = () => {};
const session = await LanguageModel.create({
  tools: toLanguageModelTools(RECIPE_TOOLS, noopEvent),
});
```
This compiles against `toLanguageModelTools(tools: ModelContextTool[], onEvent: (e: ToolCallEvent) => void): LanguageModelTool[]` (`toolAdapter.ts:47-50`) without `as any`. **Or**, the doc can write a hand-rolled inline adapter and skip the import altogether (clearest pedagogically):
```ts
const lmTools = RECIPE_TOOLS.map(t => ({
  name: t.name,
  description: t.description,
  inputSchema: t.inputSchema ?? { type: 'object', properties: {} },
  execute: async (input: Record<string, unknown>) => {
    const result = await t.execute(input);
    return typeof result === 'string' ? result : JSON.stringify(result);
  },
}));
```
Either path is D-07-compliant. The hand-rolled inline form has the advantage of showing the reader exactly how WebMCP's `execute` (returns `Promise<unknown>`) maps to LanguageModel's `execute` (must return `Promise<string>`).

**Warning signs:** Doc compiles fine when only readable, but a reader pasting it gets `Cannot find name 'toLanguageModelTool'`.

### Pitfall 5: SEO drift between prerender and runtime

**What goes wrong:** The runtime `seoConfigs.webmcpDocs` strings drift from the prerender entries at `prerender-react.js:357-367`, so crawlers see one title/description and the in-app `<head>` shows another.

**Why it happens:** Two files own the same data. Easy to update one and forget the other.

**How to avoid:** D-08 locks the runtime to **verbatim match** the prerender. Implementation strategy:
1. Open `chat/scripts/prerender-react.js` lines 357-367.
2. Copy the `title`, `description`, `keywords` strings character-for-character into the new `seoConfigs.webmcpDocs` entry.
3. Add a code comment in `useSEOData.ts` near the new entry: `// Must match prerender-react.js:357-367 verbatim — single source of truth lives in prerender for crawler parity.`
4. Verify with: `grep -F "WebMCP API Documentation - Recipe Workbench guide" chat/src/app/hooks/useSEOData.ts chat/scripts/prerender-react.js` — both files must hit.

**Warning signs:** `<title>` text mid-app-session differs from `<title>` text seen by `curl -s localhost:4300/webmcp/docs.html | grep title`.

### Pitfall 6: Tabs path matching — leading slash double-slash gotcha

**What goes wrong:** Tabs.tsx matches via `currentPath.includes(tab.path)`. The Docs tab's `path` is `/docs` (in `RecipeWorkbenchPage.tsx:248`), which means `Tabs basePath="/webmcp"` constructs the URL as `/webmcp/docs` (basePath + path). The `useEffect` in Tabs.tsx:34 then matches `/webmcp/docs`.includes(`/docs`) which is true.

**Why this matters here:** Path-aware `useSEOData` should match on `pathname.startsWith('/webmcp/docs')`, NOT on `pathname.includes('/docs')` — the latter would also match `/foo/docs` if such a route existed. Use exact prefix matching.

**How to avoid:** `const isDocs = location.pathname.startsWith('/webmcp/docs');` — exact and unambiguous.

**Warning signs:** SEO config doesn't swap when navigating to `/webmcp/docs`, OR swaps incorrectly on unrelated `/docs` paths.

### Pitfall 7: `useSEOData` dependency identity stability

**What goes wrong:** Inline-constructing the config object (`useSEOData({ title: …, description: … }, isDocs ? '/webmcp/docs' : '/webmcp')`) creates a new object reference every render, re-firing the effect every render and thrashing `<head>` writes.

**Why it happens:** `useSEOData.ts:27` deps are `[config, path, updateSEO]`. New object reference → "changed" by React's `Object.is`.

**How to avoid:** Always reference module-scope `seoConfigs.webmcp` / `seoConfigs.webmcpDocs` directly (stable across renders); don't construct config objects inline.

```ts
// GOOD — stable reference per branch
useSEOData(
  isDocs ? seoConfigs.webmcpDocs : seoConfigs.webmcp,
  isDocs ? '/webmcp/docs' : '/webmcp',
);
// BAD — new object per render, infinite SEO writes
useSEOData(
  { title: 'X', description: 'Y' },  // new ref every render
  isDocs ? '/webmcp/docs' : '/webmcp',
);
```

**Warning signs:** React DevTools shows `useSEOData`'s effect re-firing on every render; performance dips.

## Code Examples

Verified patterns from existing files. Sample lengths and shapes match what the planner will land.

### Example 1: Path-aware `useSEOData` (Pattern 1)

```tsx
// chat/src/app/components/RecipeWorkbenchPage.tsx (REPLACES line 105)
// Source: this research; pattern combines useGoogleAnalytics.ts:9 (useLocation) + useSEOData.ts:11 (path arg)
import { useLocation } from 'react-router-dom';

export const RecipeWorkbenchPage: React.FC = () => {
  const location = useLocation();
  const isDocs = location.pathname.startsWith('/webmcp/docs');
  useSEOData(
    isDocs ? seoConfigs.webmcpDocs : seoConfigs.webmcp,
    isDocs ? '/webmcp/docs' : '/webmcp',
  );
  // ... rest of component (recipes state, registration effect, etc.) unchanged
};
```

Note: existing `useSEOData(seoConfigs.webmcp, '/webmcp')` at line 105 must remain the **first** statement in the component body (hook order). The new `useLocation()` call goes immediately above it; the new switch replaces the existing line.

### Example 2: `seoConfigs.webmcpDocs` entry (verbatim from prerender)

```ts
// chat/src/app/hooks/useSEOData.ts (NEW key, append before `} as const;`)
// Source: prerender-react.js:357-367 — runtime config matches prerender verbatim per D-08
webmcpDocs: {
  title: 'WebMCP API Documentation - Recipe Workbench guide | Chrome AI APIs',
  description: 'Documentation for the WebMCP Recipe Workbench demo. Walks through navigator.modelContext, registerTool, and provideContext.',
  keywords: 'WebMCP documentation, navigator.modelContext API, registerTool, provideContext, page-side tools docs'
},
```

After this addition, the final `seoConfigs` key list (8 keys): `home`, `chat`, `toolCalling`, `summary`, `translate`, `writer`, `webmcp`, `webmcpDocs`. **Note:** The `description` and `keywords` strings reference `provideContext` (a method removed from the current spec — see Pitfall 1). They are locked by D-08 because they come from the prerender; do not "fix" them. The doc body should explain the gap.

### Example 3: DocsRenderer mount (D-11)

```tsx
// chat/src/app/components/RecipeWorkbenchPage.tsx — REPLACES lines 249-256
// Source: WriteRewritePage.tsx:255-263 styling + D-11 docFile name
{
  id: 'docs',
  label: 'Docs',
  path: '/docs',
  content: (
    <div className="max-w-none">
      <DocsRenderer docFile="WebMCP-API.md" initOpen={true} />
    </div>
  ),
},
```

Add the import at the top of the file: `import { DocsRenderer } from '../tools/DocsRenderer';` (note: file location is `chat/src/app/tools/DocsRenderer.tsx`, **not** `components/`).

### Example 4: Sample 1 in the doc — single-tool registration (D-05)

```typescript
// Pruned from chat/src/app/services/recipeTools.ts:70-83 — scaleRecipe entry
// + chat/src/app/components/RecipeWorkbenchPage.tsx:178 registration call.
// Real handler logic lives in recipeToolHandlers.ts:executeScaleRecipe;
// inlined here for self-contained reading.

const scaleRecipe: ModelContextTool = {
  name: 'scaleRecipe',
  description: 'Scale a recipe to a new serving count. All ingredient quantities are scaled proportionally.',
  inputSchema: {
    type: 'object',
    properties: {
      servings: { type: 'integer', minimum: 1, description: 'Target servings count' },
      recipeId: { type: 'string', description: '(optional) recipe id; defaults to active recipe' },
    },
    required: ['servings'],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false },
  execute: async ({ servings, recipeId }) => {
    const recipe = await getRecipe(recipeId ?? getActiveRecipeId());
    const factor = servings / recipe.servings;
    const updated = {
      ...recipe,
      servings,
      ingredients: recipe.ingredients.map(ing => ({ ...ing, quantity: ing.quantity * factor })),
    };
    await saveRecipe(updated);
    return { id: recipe.id, oldServings: recipe.servings, newServings: servings, factor };
  },
};

// Mount-time registration. Pass an AbortSignal — when aborted, the tool
// is unregistered (no separate unregisterTool method exists).
const controller = new AbortController();
navigator.modelContext.registerTool(scaleRecipe, { signal: controller.signal });

// Later (e.g., in a React effect cleanup):
controller.abort();  // tool is now deregistered
```

Compiles against `chat/src/app/types/webmcp.d.ts` — `ModelContextTool` is ambient. No `as any`.

### Example 5: Sample 2 in the doc — one definition, two consumers (D-06; HEADLINE)

```typescript
// THE WebMCP narrative: a single tool definition feeds both an external
// agent (via navigator.modelContext) and an in-page agent (via LanguageModel).

const RECIPE_TOOLS: ModelContextTool[] = [scaleRecipe, swapIngredient, /* ... */];

// Consumer 1: external Chrome agent (Tool Inspector extension, etc.)
// Tools are discoverable via navigator.modelContext on the page.
const controller = new AbortController();
for (const tool of RECIPE_TOOLS) {
  navigator.modelContext.registerTool(tool, { signal: controller.signal });
}

// Consumer 2: in-page LanguageModel chat agent.
// The same RECIPE_TOOLS array, adapted to LanguageModel's tool shape
// (which requires execute() to return Promise<string>).
const lmTools = RECIPE_TOOLS.map(t => ({
  name: t.name,
  description: t.description,
  inputSchema: t.inputSchema ?? { type: 'object', properties: {} },
  execute: async (input: Record<string, unknown>) => {
    const result = await t.execute(input);
    return typeof result === 'string' ? result : JSON.stringify(result);
  },
}));

const session = await LanguageModel.create({
  initialPrompts: [{ role: 'system', content: 'You are a recipe assistant.' }],
  tools: lmTools,
});

// One definition. Two consumers. Both see the same handler logic, the same
// JSON Schema, the same descriptions. Add a tool once, both agents gain it.
```

This is what the WebMCP value prop sounds like in code. The hand-rolled adapter (instead of importing `toLanguageModelTools`) keeps the example self-contained — readers see exactly how the two shapes relate.

### Example 6: Browser support copy reference

```markdown
## Browser Support

WebMCP is available behind a flag in:

- **Chrome 146+ Canary** (`chrome://flags/#WebMCP for testing`, set to "For testing")
- **Microsoft Edge 147+** (added March 2026)

Other browsers do not implement `navigator.modelContext` as of April 2026. On
those browsers this page shows a yellow banner explaining how to enable the
flag, but the recipe browser remains usable. See
[`MissingFlagBanner.tsx`](https://github.com/.../chat/src/app/components/RecipeWorkbench/MissingFlagBanner.tsx)
for the in-app fallback.

**Production readiness:** WebMCP is a Draft Community Group Report, not a W3C
Recommendation. The API surface is expected to change before stabilization
(targeted mid-to-late 2026). Don't ship to production yet.
```

Source: `[VERIFIED: webmachinelearning.github.io/webmcp]` for spec status; `[CITED: searchengineland.com/webmcp-explained-inside-chrome-146s-agent-ready-web-preview-470630]` for Edge 147 + March 2026 date; `[VERIFIED: bug0.com/blog/webmcp-chrome-146-guide]` for "WebMCP for testing" flag name; `[VERIFIED: chat/src/app/components/RecipeWorkbench/MissingFlagBanner.tsx]` for in-app fallback context.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `provideContext()`, `unregisterTool()`, `clearContext()` methods on `ModelContext` | `registerTool()` only — unregistration via `AbortSignal` | Removed in **March 2026** per `[CITED: searchengineland.com / datacamp.com]` | The doc must NOT show these methods as currently working. The repo's `webmcp.d.ts` still declares `provideContext` (stale; out of scope to fix). |
| `handler:` field on tool descriptor | `execute:` field | Throughout spec evolution; current IDL uses `execute` | Some third-party blogs (`[CITED: bug0.com]`) still use `handler:`. The spec, the local ambient type (`webmcp.d.ts:38`), and `RECIPE_TOOLS` all use `execute`. **Always use `execute:`.** |
| W3C Draft "Feb 2026" | W3C Draft Community Group Report — **23 April 2026** | The "this version" header on the spec page | Doc must cite Apr 23, 2026 as its snapshot. Feb 2026 is the date Chrome shipped the flag, NOT the spec date. |

**Deprecated/outdated:**
- The `handler:` field name (some blogs still cite it) — use `execute:`.
- "W3C Standard" / "W3C Recommendation" framing — it is a **Draft Community Group Report**.
- The `provideContext` / `unregisterTool` / `clearContext` methods — removed.
- "Production-ready" framing — explicitly NOT yet (per multiple Apr 2026 sources).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The current `chat/scripts/prerender-react.js:357-367` SEO copy is correct and intentional (we should match it verbatim, not "fix" it). | Pattern §"SEO drift" + Example 2 | If the prerender copy itself has a typo, runtime would inherit it. CONTEXT.md D-08 instructs to match verbatim; assumption is that copy was reviewed and approved. **Mitigation:** before landing, eyeball the prerender strings — if anything looks wrong, surface BEFORE matching. |
| A2 | `pathname.startsWith('/webmcp/docs')` exactly matches every URL the Docs tab can land on (no trailing slash, no query string, no nested routes). | Pattern 1 + Pitfall 6 | If react-router-dom v6 routing produces `/webmcp/docs/` with a trailing slash in some scenario, `startsWith` still matches. If it produces `/webmcp/docs?foo=1`, `startsWith` still matches. Low risk. |
| A3 | `DocsRenderer` correctly mounts when wrapped in `<div className="max-w-none">` — no extra container needed. | Example 3 + Pattern 2 | Verified — `WriteRewritePage.tsx:259-262` and `Summary.tsx:182-184` use exactly this shape. HIGH confidence. |
| A4 | Resolution path (A) for Pitfall 1 (cover only current IDL, mention `provideContext` removal in passing) is acceptable to the user. | Pitfall 1 | CONTEXT.md D-03 explicitly lists `provideContext` and `unregisterTool` as required coverage — the user (or their proxy CONTEXT.md) DID ask for these. Choosing (A) is a partial deviation from D-03. **Planner MUST surface this choice in the plan and confirm.** |
| A5 | The recommended section order (Overview → Browser Support → API Surface → Sample 1 → Sample 2 → Security → Limitations → References) is acceptable. | Pattern 3 | CONTEXT.md "Section ordering" is explicitly Claude's Discretion as long as all 4 DOCS-01 sections appear. LOW risk. |

## Open Questions

1. **Does the planner address D-03 by covering removed methods (`provideContext`, `unregisterTool`)?**
   - What we know: CONTEXT.md D-03 lists them; current W3C IDL doesn't; the local ambient type still declares `provideContext`; production code uses AbortSignal-based unregistration.
   - What's unclear: whether the user wants the doc to (a) reflect today's reality or (b) document earlier-draft methods for completeness.
   - Recommendation: option (A) per Pitfall 1 — current IDL only, single "Spec history" line for removed methods. Planner should confirm in the plan or proceed under D-07 sample-fidelity discretion.

2. **Sample 2: hand-rolled adapter or import `toLanguageModelTools`?**
   - What we know: both compile; `toLanguageModelTools` exists; D-07 permits simplification.
   - What's unclear: which is more pedagogical for the reader.
   - Recommendation: hand-rolled inline adapter — reader sees exactly how `Promise<unknown>` (WebMCP) becomes `Promise<string>` (LanguageModel). The import-the-helper version is one step removed.

3. **"Limitations" callout — include it?**
   - What we know: optional per Discretion; no specific request.
   - Recommendation: yes, short — one paragraph saying (a) tool handlers don't stream, (b) no `@mcp-b/global` polyfill in this demo, (c) spec is moving. Sets honest expectations and reinforces the milestone DoD.

4. **Should the doc reference `MissingFlagBanner.tsx` by file path?**
   - What we know: Discretion — "good context, not required".
   - Recommendation: yes — one inline link in Browser Support. Helps readers find the in-app fallback.

## Project Constraints (from CLAUDE.md)

- Mode = **YOLO**: auto-approve gates, no per-step confirmation.
- Granularity = **coarse**: 1-3 plans per phase. Phase 3 is small enough for **1 plan** (4 file edits, all in `chat/`).
- Each phase commits atomically.
- Don't refactor what isn't being touched (brownfield discipline). **Specifically: do NOT modify `webmcp.d.ts` to remove the stale `provideContext` declaration in this phase.**
- Don't touch `mcp/`, `mcp-client/`, `devops/awsweb/`.
- TypeScript strict — no `: any`, no `as any` at API boundaries (D-07 reinforces this for code samples).
- Prettier + ESLint enforced.
- Vitest for tests — no test framework changes needed for this phase (no test scaffolding required for a markdown file + 3-line code edits; this matches `01-03-SUMMARY.md`'s pattern of skipping test coverage for routing/SEO wiring).
- Build + run: `npx nx build chat` (must exit 0 before commit); `npx nx serve chat` for local verification at port 4300.
- `npx nx lint chat` is unavailable in this Nx workspace (`01-03-SUMMARY.md` confirms — pre-existing config, not a regression). Do not block on lint.

## Validation Architecture

**Skipped per `.planning/config.json` workflow.nyquist_validation = false.**

The phase's verification surface is small: build green, file exists, runtime SEO swaps. No new test files needed. Manual verification list (mirrors Phase 1's `01-03-SUMMARY.md` "Phase Canonical Verification"):

1. `npx nx build chat` exits 0.
2. `chat/src/app/docs/WebMCP-API.md` exists, contains the H1 `# WebMCP API`, the four required section headings (Overview / API Surface / Security / Browser Support — exact wording flexible), and exactly two ` ```typescript ` (or ` ```javascript `) fenced code samples drawn from `RECIPE_TOOLS`.
3. `chat/src/app/hooks/useSEOData.ts` contains a `webmcpDocs:` key with the three exact strings from `prerender-react.js:357-367`.
4. `chat/src/app/components/RecipeWorkbenchPage.tsx` imports `useLocation` from `react-router-dom` and uses it to switch between `seoConfigs.webmcp` and `seoConfigs.webmcpDocs` in the `useSEOData` call.
5. `chat/src/app/components/RecipeWorkbenchPage.tsx` no longer contains the placeholder `Documentation coming in Phase 3` string; the Docs tab content is now `<DocsRenderer docFile="WebMCP-API.md" initOpen={true} />`.
6. **Manual:** visit `http://localhost:4300/webmcp` — `<title>` reads `WebMCP Recipe Workbench - …`. Click Docs tab — `<title>` swaps to `WebMCP API Documentation - …` AND the doc renders. Click Workbench — `<title>` swaps back. Reload on `/webmcp/docs` — `<title>` is the docs title.

## Sources

### Primary (HIGH confidence)
- **W3C WebMCP Draft Community Group Report — IDL block** — `[VERIFIED: https://webmachinelearning.github.io/webmcp/ Apr 23 2026]` — only `registerTool` on `ModelContext`; `execute` field name; `signal`-based unregistration; SecureContext requirement.
- **`chat/src/app/types/webmcp.d.ts`** — local ambient declarations (still has `provideContext`; documents drift in Pitfall 1).
- **`chat/src/app/services/recipeTools.ts`** — source of `RECIPE_TOOLS`, eight tool definitions; reference for code samples.
- **`chat/src/app/services/toolAdapter.ts`** — `toLanguageModelTools` (plural) export; reference adapter for Sample 2.
- **`chat/scripts/prerender-react.js:357-367`** — verbatim source of `seoConfigs.webmcpDocs` strings.
- **`chat/src/app/components/RecipeWorkbenchPage.tsx`** — current file state; placeholder location at lines 249-256.
- **`chat/src/app/tools/DocsRenderer.tsx`** — DocsRenderer contract (`docFile`, `initOpen`, internal styling).
- **`chat/src/app/components/Tabs.tsx`** — basePath + path URL sync mechanics.
- **`chat/src/app/components/WriteRewritePage.tsx:255-263`** — `<div className="max-w-none"><DocsRenderer …/></div>` pattern.
- **`chat/src/app/components/Summary.tsx:173-186`** — additional DocsRenderer mount reference.
- **`chat/src/app/docs/Tool-Calling-API.md`** — closest tonal/structural template (417 lines).

### Secondary (MEDIUM confidence — verified against primary)
- **`[CITED: https://www.searchengineland.com/webmcp-explained-inside-chrome-146s-agent-ready-web-preview-470630]`** — `chrome://flags/#WebMCP for testing`; "removed in March 2026" wording for `provideContext`/`clearContext`; Edge 147 March 2026 timing.
- **`[CITED: https://www.datacamp.com/tutorial/webmcp-tutorial]`** — Chrome 146.0.7672.0 minimum; `execute` field name confirmation.
- **`[CITED: https://bug0.com/blog/webmcp-chrome-146-guide]`** — uses `handler:` instead of `execute:` (highlights ecosystem inconsistency — the spec/local types use `execute`).
- **`[CITED: https://venturebeat.com/infrastructure/google-chrome-ships-webmcp-in-early-preview]`** — early-preview framing; Microsoft + Google co-authorship.
- **`[CITED: https://github.com/webmachinelearning/webmcp]`** — repo URL for spec source-of-truth.

### Tertiary (LOW confidence)
- None used as load-bearing references.

## Metadata

**Confidence breakdown:**
- Codebase patterns (DocsRenderer, useSEOData, Tabs, RECIPE_TOOLS shape): **HIGH** — all directly read.
- WebMCP spec API surface (current draft): **HIGH** — fetched IDL directly from spec page.
- WebMCP spec evolution (which methods existed when): **MEDIUM** — multiple secondary sources agree on March 2026 removals; not directly verified by W3C changelog.
- Sample fidelity for D-06 (does the in-page agent actually use `LanguageModel.create({ tools })` today?): **HIGH** — verified by reading `AgentDrawer.tsx:23-60` (it doesn't; it uses a JSON-loop fallback). Doc presents the canonical narrative per D-07.
- SEO string verbatim match (D-08): **HIGH** — copied directly from `prerender-react.js:357-367`.

**Research date:** 2026-04-28

**Valid until:** 2026-05-12 (14 days — WebMCP spec is moving; if the planner doesn't land this within ~2 weeks, re-verify the W3C draft IDL since the spec has shown month-scale change).
