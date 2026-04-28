---
phase: 03-documentation-seo
context_gathered: 2026-04-28
locked_decisions: 11
---

# Phase 3: Documentation + SEO — Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Author the `/webmcp/docs` markdown explainer (referenced by an existing placeholder in `RecipeWorkbenchPage.tsx` but not yet written) and finish the SEO tail so that `/webmcp` and `/webmcp/docs` show distinct titles/descriptions in the rendered `<head>` at runtime — not just in the prerender output.

This phase delivers:
- A new `chat/src/app/docs/WebMCP-API.md` covering what WebMCP is (W3C Draft Feb 2026), the `navigator.modelContext` API surface (`registerTool` / `provideContext` / `unregisterTool`), the security/permission model, and Chrome 146+ Canary / Edge 147+ browser support — with exactly 2 code samples drawn from this app's real `RECIPE_TOOLS`.
- A second SEO config (`seoConfigs.webmcpDocs`) and a path-aware `useSEOData` call inside `RecipeWorkbenchPage.tsx` so the in-app `<head>` swaps between the two configs when the user clicks the Docs tab.
- Wiring the Docs tab content from its current placeholder to `<DocsRenderer docFile="WebMCP-API.md" initOpen={true} />`, mirroring `Summary.tsx:183`, `WriteRewritePage.tsx:261`, etc.

Out of scope (do NOT touch):
- The doc filename convention or DocsRenderer mechanics (locked by site convention).
- The `/webmcp/docs` route itself, the prerender entry, or `getSEODataForRoute('/webmcp/docs')` copy — all completed in Phase 1.
- The Tabs component, tab ordering, or URL→tab sync — verified working in Phase 2.
- `mcp/`, `mcp-client/`, `devops/awsweb/`, or any existing demo pages.

</domain>

<decisions>
## Implementation Decisions

### Doc Content & Structure

- **D-01: Hybrid depth (~300-400 lines).** Lean enough to honor the milestone DoD ("2-min demo, not reference-quality") but long enough to cover all 4 DOCS-01 sections with substance. Splits the difference between Translate-API.md (316 lines, lean) and Writer-ReWriter-API.md (490 lines, exhaustive).
- **D-02: Filename `WebMCP-API.md`.** Matches site convention (`Chat-API.md`, `Tool-Calling-API.md`, `Summary-API.md`, `Translate-API.md`, `Writer-ReWriter-API.md`). Already referenced by the placeholder copy at `RecipeWorkbenchPage.tsx:253`. **Closes** the inconsistency where REQUIREMENTS.md DOCS-01 mentioned `webmcp.md` as an alternate location.
- **D-03: Required sections (all 4 from DOCS-01).** Doc MUST contain:
  1. **Overview** — What WebMCP is + W3C Draft Feb 2026 status callout.
  2. **API surface** — `navigator.modelContext.registerTool`, `provideContext`, `unregisterTool`. Descriptor shape (`{name, description, inputSchema, handler, annotations?}`). JSON Schema input pattern.
  3. **Security / permission model** — Inherits the user's browser session, no OAuth, user-mediated, runs only on the page that registered the tool.
  4. **Browser support + flag** — Chrome 146+ Canary, Edge 147+, `chrome://flags/#WebMCP for testing`, fallback messaging (point at `MissingFlagBanner` for context).

### Code Samples (DOCS-01: ≥2)

- **D-04: Exactly 2 samples, both drawn from real `RECIPE_TOOLS`.** No abstract `getWeather` filler. Visitor reading the doc sees the same code that runs on the workbench tab next door — reinforces "this is real, switch tabs and try it."
- **D-05: Sample 1 — single-tool registration.** A pruned `scaleRecipe` (or similar single tool from `chat/src/app/services/recipeTools.ts`) shown end-to-end: `name`, `description`, `inputSchema` (JSON Schema), `handler` body, then the `navigator.modelContext.registerTool(tool)` mount-time call. Demonstrates the descriptor shape against a real handler.
- **D-06: Sample 2 — "one definition, two consumers" loop.** The same `RECIPE_TOOLS` array feeding BOTH `navigator.modelContext.registerTool(tool)` (for an external Chrome agent / Tool Inspector) AND `LanguageModel.create({ tools: RECIPE_TOOLS.map(toLanguageModelTool) })` (for the in-page chat). This is the WebMCP narrative — surface it as the headline sample, not buried.
- **D-07: Sample fidelity.** Code samples may simplify (drop the registration controller / abort plumbing from `RecipeWorkbenchPage.tsx:88+`, drop the duplicate-name try/catch) but MUST stay typed and runnable in spirit. No `as any` in the samples; they should compile against the ambient types from `chat/src/app/types/webmcp.d.ts`.

### SEO per-tab differentiation (DOCS-02)

- **D-08: Add `seoConfigs.webmcpDocs` to `chat/src/app/hooks/useSEOData.ts`.** Title and description MUST match the existing prerender mapping at `chat/scripts/prerender-react.js:357-367` verbatim:
  - title: `WebMCP API Documentation - Recipe Workbench guide | Chrome AI APIs`
  - description: `Documentation for the WebMCP Recipe Workbench demo. Walks through navigator.modelContext, registerTool, and provideContext.`
  - keywords: `WebMCP documentation, navigator.modelContext API, registerTool, provideContext, page-side tools docs`

  Single source of truth: prerender copy is canonical; runtime config matches it.
- **D-09: Path-aware `useSEOData` in `RecipeWorkbenchPage.tsx`.** Replace the unconditional `useSEOData(seoConfigs.webmcp, '/webmcp')` at line 105 with a `useLocation()`-driven switch: `/webmcp/docs` → `seoConfigs.webmcpDocs` + `'/webmcp/docs'`; anything else under `/webmcp` → `seoConfigs.webmcp` + `'/webmcp'`. The existing `Tabs` component already navigates between the two URLs on tab click (Phase 2 verified — see `RecipeWorkbenchPage.tsx:240-243` ordering note), so the `<head>` will swap automatically when the user clicks the Docs tab.
- **D-10: No URL plumbing changes.** Tab → URL → re-render chain already works (proven in Phase 2). Planner does NOT need to touch `Tabs.tsx`, the route definitions, or the URL handling.
- **D-11: Wire the Docs tab content.** Replace the placeholder in `RecipeWorkbenchPage.tsx:249-256` with `<DocsRenderer docFile="WebMCP-API.md" initOpen={true} />`, mirroring the dark-mode-aware container styling used in `WriteRewritePage.tsx:261` (white bg / dark:gray-800, rounded, shadow). DOCS-01 will not pass UAT unless this swap happens.

### Claude's Discretion

- **Section ordering inside `WebMCP-API.md`** — As long as all 4 DOCS-01 sections are present, the planner can pick the order (Overview → Browser support → API surface → Security is the most common flow in our existing docs).
- **Inline tone** — Match the matter-of-fact register of `Translate-API.md` and `Writer-ReWriter-API.md`. Planner can pick exact phrasing.
- **Whether to add a small "Limitations" / "Not in v1" callout** — Optional; helps set expectations about non-streaming tool handlers, no polyfill, etc. Planner decides.
- **JSON Schema example sophistication** — Sample 1 can use a flat `{ type: 'object', properties: { servings: { type: 'number' } }, required: ['servings'] }` or pull a more nuanced one from `recipeTools.ts`. Planner picks.
- **Whether the doc references `MissingFlagBanner.tsx`** — Mentioning that the page already shows a fallback banner in unsupported browsers is good context; not required.

### Folded Todos

None. STATE.md only carries "Plan Phase 02" — already resolved.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase context (locked decisions, what was already shipped)
- `.planning/PROJECT.md` — Core Value, "Out of Scope" (no polyfill / no deploy), validated WEBMCP-08 / DOCS-01 / DOCS-02 framing
- `.planning/REQUIREMENTS.md` — DOCS-01 (≥2 code samples + 4 required sections), DOCS-02 (SEO via SEOProvider, observable in `<head>`), NAV-02 (route already registered)
- `.planning/ROADMAP.md` (Phase 3 section) — 3 success criteria, requirements list (NAV-02, DOCS-01, DOCS-02)
- `.planning/phases/01-foundation-skeleton/01-03-SUMMARY.md` — Phase 1 routing/SEO/prerender wiring; what was already done at that layer
- `.planning/phases/02-webmcp-tools-in-page-agent/02-CONTEXT.md` — Phase 2 decisions on Tabs ordering and `RECIPE_TOOLS` shape (drives the code samples)

### Existing code to read or mirror
- `chat/src/app/components/RecipeWorkbenchPage.tsx` (lines 105, 240-256, 304-306) — existing `useSEOData` call, Tabs ordering note, Docs tab placeholder to replace
- `chat/src/app/tools/DocsRenderer.tsx` — markdown rendering contract (`docFile` prop, `initOpen`)
- `chat/src/app/components/Tabs.tsx` — `basePath` + `path` URL sync (already routes `/webmcp/docs` to the Docs tab)
- `chat/src/app/hooks/useSEOData.ts` — `seoConfigs` map + `useSEOData(config, path)` signature; **add `seoConfigs.webmcpDocs` here**
- `chat/scripts/prerender-react.js` (lines 357-367) — canonical `/webmcp/docs` title/description/keywords; runtime config must match this verbatim
- `chat/src/app/components/Summary.tsx` (lines 173-186), `WriteRewritePage.tsx` (lines 251-267), `Translate.tsx` — mirror styling pattern for the Docs-tab DocsRenderer container
- `chat/src/app/services/recipeTools.ts` — source of `RECIPE_TOOLS` for code samples
- `chat/src/app/types/webmcp.d.ts` — ambient types samples MUST stay consistent with (no `as any`)
- `chat/src/app/components/RecipeWorkbench/MissingFlagBanner.tsx` — for the "fallback messaging" sub-section of the Browser Support copy

### Reference docs (already in `chat/src/app/docs/`)
- `chat/src/app/docs/Writer-ReWriter-API.md` — 490 lines, reference-style upper bound (don't exceed)
- `chat/src/app/docs/Translate-API.md` — 316 lines, lean lower bound
- `chat/src/app/docs/Tool-Calling-API.md` — closest tonal/structural match (it covers an API + tool descriptors); use as the structural template
- `chat/src/app/docs/Summary-API.md` and `chat/src/app/docs/Chat-API.md` — additional shape references

### External (research targets — verify before authoring)
- W3C WebMCP Draft Community Group Report: https://webmachinelearning.github.io/webmcp/ — for `navigator.modelContext.registerTool` exact signature, `provideContext` semantics, security/permission model wording, and Feb 2026 spec status
- WebMCP repository: https://github.com/webmachinelearning/webmcp — for any explainer / examples that should be cited
- Chrome 146 Canary release notes / `chrome://flags/#WebMCP for testing` — confirm flag name and Edge 147+ support claim

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DocsRenderer` component — single import (`<DocsRenderer docFile="WebMCP-API.md" initOpen={true} />`) is the entire integration. Already handles markdown loading, syntax highlighting (Prism + Dracula), dark-mode container styling, and shadow-DOM isolation.
- `seoConfigs.webmcp` — already defined in `useSEOData.ts:62-66`; new `seoConfigs.webmcpDocs` joins it as a sibling.
- `RECIPE_TOOLS` — single source for the 2 code samples. Authoring against the real array means the doc samples don't drift from production code.
- `Tabs.tsx` URL sync — `/webmcp/docs` already routes to the Docs tab without any new code.

### Established Patterns
- Each demo doc lives at `chat/src/app/docs/<Name>-API.md`, loaded via `loadMDFile` in `chat/src/app/tools/md-loader.ts`.
- Each demo page calls `useSEOData(seoConfigs.<demo>, '<path>')` once near the top of its component.
- DocsRenderer container styling: `bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200` (matches `WriteRewritePage.tsx:261`).
- Code blocks in markdown use ```language fences; Prism handles `javascript`, `typescript`, `jsx`, `tsx`, `json`, `bash`.
- Tailwind dark-mode coverage on every visible class (every `bg-`/`text-`/`border-` paired with `dark:` variant).

### Integration Points
- `RecipeWorkbenchPage.tsx` — only file that needs runtime changes (3 edits: add `useLocation`, swap `useSEOData` to be path-aware, replace Docs tab placeholder content).
- `chat/src/app/hooks/useSEOData.ts` — add one entry to `seoConfigs`.
- `chat/src/app/docs/WebMCP-API.md` — new file; only addition.
- No changes needed to `AppRouter.tsx`, `Tabs.tsx`, `prerender-react.js`, or any service.

</code_context>

<specifics>
## Specific Ideas

- **"One definition, two consumers" must be the headline code sample.** Project decision-log (PROJECT.md row 3, REQUIREMENTS.md AGENT-02, Phase 2 D-01) hammers this point: WebMCP's value is that the SAME tool array drives the page-side `navigator.modelContext` registration AND any tool-calling consumer (in-page `LanguageModel`, external Chrome 146 Canary agent, Tool Inspector extension). The doc's second sample MUST surface this — not bury it after registration boilerplate.
- **Prerender + runtime SEO must agree.** `prerender-react.js:357-367` already has crafted copy for `/webmcp/docs`. The new `seoConfigs.webmcpDocs` MUST be a verbatim copy of that title/description/keywords. If the planner finds the prerender copy off, fix BOTH together — never let them diverge.
- **The placeholder at `RecipeWorkbenchPage.tsx:253` references `WebMCP-API.md`.** Phase 1 already committed to this name in the user-visible "coming in Phase 3" copy. Don't rename.
- **Chrome 146 Canary spec drift risk.** STATE.md "Risks Watched" flagged that `navigator.modelContext` may shift before milestone closes. The doc should say "Chrome 146+ Canary, W3C Draft Community Group Report (Feb 10, 2026)" — clearly version-pinning this snapshot — so future readers know this is a moment-in-time explainer, not an evergreen reference.

</specifics>

<deferred>
## Deferred Ideas

- **External links + CTA section** — Cross-links to W3C draft / GitHub repo / Tool Inspector extension, plus an in-doc "Try the demo →" CTA. User opted not to discuss in this session. Planner can add a minimal "References" or "See Also" footer at their discretion (tracked in Claude's Discretion above), but anything beyond a footer is out of scope.
- **Polished error states / a11y audit / analytics events for the docs route** — Inherits the milestone-wide "out of scope" framing in PROJECT.md. DoD is "2-min demo-able", not reference-quality.
- **Tone/voice exploration** — Not discussed; planner inherits the matter-of-fact register from existing docs.
- **Content for V2-08 (additional tools)** — `convertToMetric`, `simplifyInstructions`, `findSubstitute`, etc. — out of v1; doc only covers what's shipped.

</deferred>

---

*Phase: 03-documentation-seo*
*Context gathered: 2026-04-28*
