# Phase 8: Proofreader Foundation — Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 8 lands the Proofreader demo skeleton on Chrome Canary:
1. `/proofreader` + `/proofreader/docs` routes registered in `AppRouter.tsx` + nav link
2. Ambient `Proofreader` type declarations added to `chat/src/app/types/dom-chromium-ai.d.ts`
3. `ProofreaderService.ts` typed wrapper around `Proofreader.create()` with pooled sessions keyed by language
4. `ProofreaderPage` with single-column shell: header → language selector + textarea input → Proofread button → result panel
5. Result renders in **plain + suggestion list** mode only (Phase 9 adds the other two modes); a disabled segmented control is visible showing all three options
6. `MissingFlagBanner` extended to accept a `flags` prop (additive, default preserves v1.0 / v1.1 behavior) and **moved to `chat/src/app/components/`** with import updates in `RecipeWorkbenchPage.tsx` and `GenerativeUIPage.tsx`
7. Tabs component on the page with Docs tab first (placeholder content) and Workbench second — matches v1.1 lesson

Out of scope: alternate output modes (Phase 9), all multimodal work (Phase 10-11), real docs markdown (Phase 12), SEO byte-identical mirror polish (Phase 12 — initial SEO entries land in Phase 8 but the prerender mirror is a Phase 12 audit).

</domain>

<decisions>
## Implementation Decisions

### Proofreader type declarations + service surface
- **Ambient types live in `chat/src/app/types/dom-chromium-ai.d.ts`** alongside existing LanguageModel / Writer / Summarizer / Translator declarations. New interfaces:
  - `ProofreaderCorrectionType` = `'spelling' | 'punctuation' | 'capitalization' | 'preposition' | 'missing-words' | 'grammar'`
  - `ProofreaderCorrection` = `{ startIndex: number; endIndex: number; correction: string; types?: ProofreaderCorrectionType[]; explanation?: string }`
  - `ProofreadResult` = `{ correctedInput: string; corrections: ProofreaderCorrection[] }`
  - `ProofreaderCreateOptions` = `{ includeCorrectionTypes?: boolean; includeCorrectionExplanations?: boolean; correctionExplanationLanguage?: string; expectedInputLanguages?: string[]; signal?: AbortSignal; monitor?: (m: AICreateMonitor) => void }`
  - `Proofreader` interface with `proofread(input: string, opts?: { signal?: AbortSignal }): Promise<ProofreadResult>` and `destroy(): void`
  - `ProofreaderConstructor` with `create(options?: ProofreaderCreateOptions): Promise<Proofreader>` and `availability(options?: { expectedInputLanguages?: string[] }): Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>`
  - `Window` augmented with `Proofreader: ProofreaderConstructor`
- **`AICreateMonitor`** type is already in `dom-chromium-ai.d.ts` (used by LanguageModel/Writer). Reuse as-is.
- **`ProofreaderService.ts` lives at `chat/src/app/services/ProofreaderService.ts`** with module-function exports:
  - `proofread(text: string, opts?: { language?: string; signal?: AbortSignal }): Promise<ProofreadResult>` — top-level call, internally gets pooled session
  - `getAvailability(language?: string): Promise<AvailabilityState>` — typed wrapper around `Proofreader.availability()`
  - `createWithProgress(language: string, onProgress: (pct: number) => void): Promise<Proofreader>` — used by the page on first call to show download UI
  - `destroyAllSessions(): void` — cleanup helper for unmount
- **Defaults locked into ProofreaderService**: `{ includeCorrectionTypes: true, includeCorrectionExplanations: true, correctionExplanationLanguage: 'en' }`. Phase 9 needs the full data for the three output modes; opt-in defaults would force Phase 9 to extend the service.
- **Session pooling**: module-scope `Map<string, Promise<Proofreader>>` keyed by language code. Reused across `proofread()` calls. Mirrors v1.0 `ChatAIService.ts` session caching. Avoids ~50-200ms init overhead per call.
- **Language code locked set**: `'en' | 'es' | 'ja' | 'de' | 'fr'` exported as a TS union type. `localStorage` key: `window-ai.proofreader.language`. Default: `'en'`.

### MissingFlagBanner reuse strategy
- **Component moved** from `chat/src/app/components/RecipeWorkbench/MissingFlagBanner.tsx` to `chat/src/app/components/MissingFlagBanner.tsx`. Imports updated in:
  - `chat/src/app/components/RecipeWorkbenchPage.tsx` (v1.0)
  - `chat/src/app/components/GenerativeUIPage.tsx` (v1.1)
  - Any v1.1 phase test still using the old path (verify via `grep -F "RecipeWorkbench/MissingFlagBanner"`)
- **Extended with new optional props (additive — no behavior change for v1.0 / v1.1 callers)**:
  ```ts
  interface MissingFlagBannerProps {
    title?: string;          // default: "WebMCP isn't enabled in this browser."
    body?: string;           // default: existing copy
    flags?: Array<{          // default: [{ name: 'WebMCP', url: 'chrome://flags/#WebMCP', note: 'set to "For testing"' }]
      name: string;
      url: string;           // e.g. 'chrome://flags/#proofreader-api-for-gemini-nano'
      note?: string;         // e.g. 'set to "Enabled"' or 'set to "Enabled BypassPerfRequirement"'
    }>;
    browserRequirement?: string; // default: "Chrome 146+ Canary"
  }
  ```
- **`/proofreader` banner specifics** (passed as props):
  - title: `"Proofreader API isn't enabled in this browser."`
  - body: `"Enable the flags below in Chrome 146+ Canary, then reload."`
  - flags:
    1. `{ name: 'Optimization Guide On Device', url: 'chrome://flags/#optimization-guide-on-device-model', note: 'set to "Enabled BypassPerfRequirement"' }`
    2. `{ name: 'Proofreader API', url: 'chrome://flags/#proofreader-api-for-gemini-nano', note: 'set to "Enabled"' }`
  - browserRequirement: `"Chrome 146+ Canary"`
- **Detection**: `typeof Proofreader === 'undefined'` (window-scoped). Banner renders above the page header (same placement v1.0 / v1.1 use).

### Page shell + routing + tabs
- **Component subdir**: `chat/src/app/components/Proofreader/` with files:
  - `ProofreaderPage.tsx` (top-level page; route handler)
  - `ProofreaderHeader.tsx` (page title + tagline icon block — mirrors `GenerativeUIHeader.tsx`)
  - `ProofreaderForm.tsx` (textarea + language selector + Proofread button)
  - `ProofreaderOutputModeToggle.tsx` (segmented control; Phase 8 ships with non-"plain" modes disabled)
  - `ProofreaderResultPanel.tsx` (renders ProofreadResult in the selected mode; Phase 8 only implements `'plain'` mode)
- **Routes registered in Phase 8**: `/proofreader` and `/proofreader/docs` both pointing to `ProofreaderPage` (which switches on `location.pathname.endsWith('/docs')`). Phase 12 fills the docs markdown.
- **Nav link**: clone the existing nav link block from `AppRouter.tsx` (desktop ~line 75 area, mobile ~line 170 area). Label: "Proofreader". Place AFTER "Generative UI" in both desktop + mobile. `font-medium` per v1.0 / v1.1 convention.
- **Tabs from day 1**: `Tabs` component with Docs (first in array, path `/docs`) and Workbench (second, path empty). Phase 8 Docs tab content: a simple placeholder card "Documentation coming in Phase 12" (so the URL works but doesn't 404 if shared).
- **Page layout**: header → MissingFlagBanner (conditional) → Tabs strip → either DocsRenderer placeholder OR Workbench content (textarea form + output panel).
- **Workbench layout**: single-column, `max-w-4xl mx-auto`. Top: textarea (~6 rows). Beside the textarea (or below on narrow screens): language selector dropdown + Proofread button. Below: ProofreaderOutputModeToggle (segmented, all 3 options visible; only "Plain + list" enabled). Below that: ProofreaderResultPanel.

### SEO + page metadata
- `seoConfigs.proofreader` entry in `chat/src/app/hooks/useSEOData.ts` (title, description). Phase 12 audits the byte-identical mirror in `prerender-react.js`; Phase 8 ships the entry in BOTH files to avoid drift but the formal `grep -F` validation happens in Phase 12.
- `seoConfigs.proofreaderDocs` entry too (since route is registered now). Same dual-write pattern.
- Title format: `"Proofreader — Chrome on-device grammar + spelling correction | Chrome AI APIs"` (locked).
- Description format: `"Gemini Nano proofreads your text on-device with grammar, spelling, capitalization, and punctuation corrections. Three output styles, five languages, zero network."` (locked).
- Docs title: `"Proofreader API Docs — surface, corrections shape, language support | Chrome AI APIs"` (locked).

### Error UX
- **Model unavailable** (`typeof Proofreader === 'undefined'`): MissingFlagBanner above page; form is disabled with a tooltip "Enable the Proofreader flag to use this demo".
- **Model downloadable / downloading**: when `Proofreader.availability()` returns `'downloadable'` or `'downloading'`, the Proofread button shows "Download model first" → clicking calls `createWithProgress()` which streams progress via the `monitor` callback. A small progress bar appears below the button. Page-side state: `'idle' | 'unavailable' | 'downloading' | 'ready' | 'proofreading' | 'error'`.
- **proofread() throws**: inline error in the result panel ("Couldn't proofread — [error message]") with a Retry button. No alert(), no console-only failure.

### Claude's Discretion
- Exact textarea placeholder copy ("Paste or type some text to proofread…" or similar) — planner picks
- Exact button labels — "Proofread", "Download model", "Retry" — planner picks
- Specific Tailwind classes for the segmented control's disabled-state visual — planner picks (gray-out + cursor-not-allowed)
- Whether the language selector is a native `<select>` or a custom dropdown — planner picks; native is simpler and dark-mode-friendly with v1.0 patterns
- Default textarea content for first-time visitors (could be an example sentence with errors to demo the flow) — planner picks

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `chat/src/app/types/dom-chromium-ai.d.ts` — ambient AI surface declarations; mirrors LanguageModel / Writer / Summarizer / Translator pattern. Add Proofreader here.
- `chat/src/app/services/WriterService.ts` — closest API-wrapper analog. Read for the `WriterOptions` / availability check / session create pattern.
- `chat/src/app/services/ChatAIService.ts` — module-scope session caching pattern (mirror for ProofreaderService session pool).
- `chat/src/app/components/RecipeWorkbench/MissingFlagBanner.tsx` — the component to move + extend. Currently zero-coupling, zero-prop component.
- `chat/src/app/components/WriteRewritePage.tsx` (or similar v1.0 page) — closest layout analog: form input + result output, mirrors what Proofreader needs.
- `chat/src/app/components/GenerativeUIPage.tsx` — Tabs integration + path-aware SEO + max-w-6xl wrapper. Mirror this structure.
- `chat/src/app/components/Tabs.tsx` — reusable Tabs (Docs FIRST per v1.1 lesson at line 254-256 area).
- `chat/src/app/tools/DocsRenderer.tsx` — placeholder docs tab content via `<DocsRenderer docFile="placeholder.md" />` OR inline JSX placeholder.
- `chat/src/app/hooks/useSEOData.ts` — `seoConfigs` map structure.
- `chat/scripts/prerender-react.js` — mirror entries (Phase 12 audits; Phase 8 ships both sides to avoid drift).
- `chat/src/app/AppRouter.tsx` — insertion points: desktop nav (line ~75), mobile nav (line ~170), Route registration (line ~245).

### Established Patterns
- Demo page = page component + service wrapper + markdown doc (filled later) + AppRouter route + nav link + SEO entry (mirrored in prerender-react.js).
- Module-scope session pool keyed by config — `ChatAIService.ts` pattern.
- StrictMode-safe `useEffect` with `cancelled` flag for async page-mount work.
- Native `navigator.modelContext` / `LanguageModel` / `Proofreader` — no polyfill (carries from v1.0).
- TS strict, no `any`, no `as any` at API boundaries.
- Tailwind v4 with `dark:` variants. `max-w-6xl mx-auto p-4` for page outer wrapper (v1.1 lesson — fixed at end of v1.1).
- 8-point spacing scale; `primary-600` accent for buttons; `font-medium` (500) nav links.

### Integration Points
- `AppRouter.tsx`: add `<Route path="/proofreader" element={<ProofreaderPage />} />` and `<Route path="/proofreader/docs" element={<ProofreaderPage />} />` after the existing /generative-ui routes. Add desktop nav link + mobile nav link after the "Generative UI" links. Track via `trackUserInteraction('navigation_click', 'proofreader_link')`.
- `useSEOData.ts`: add `seoConfigs.proofreader` and `seoConfigs.proofreaderDocs` entries.
- `prerender-react.js`: add both routes + matching `seoConfigs` entries (byte-identical strings — `grep -F` verifies in Phase 12).
- `dom-chromium-ai.d.ts`: add ambient Proofreader declarations.
- `RecipeWorkbenchPage.tsx` + `GenerativeUIPage.tsx`: update `MissingFlagBanner` import path (move from `./RecipeWorkbench/MissingFlagBanner` to `./MissingFlagBanner`). No prop changes — defaults preserve v1.0 / v1.1 behavior.

</code_context>

<specifics>
## Specific Ideas

- **The downloaded LoRA adapter is small** (~MB-scale) but the base Gemini Nano is the same ~2.5GB other Chrome AI demos already need. Users who already ran `/chat` or `/webmcp` have the base; only the Proofreader-specific LoRA gets pulled on first `Proofreader.create()`.
- **Demo affordance**: default the textarea content to a sentence with mixed errors so visitors see results without typing: `"i think there going to a meetting tommorow at the office. there progress have been great on the project!"` — captures all 6 correction types in one sentence.
- **The page-state machine** (`'idle' | 'unavailable' | 'downloading' | 'ready' | 'proofreading' | 'error'`) is shared between Phase 8 and Phase 9. Implement it cleanly in Phase 8 so Phase 9 only adds rendering branches.

</specifics>

<deferred>
## Deferred Ideas

- Side-by-side diff + inline strikethrough output modes → Phase 9 (PROOF-04)
- Streaming `proofreadStreaming()` — research notes it was broken in OT, defer verification to v1.3
- Multi-document batch proofreading — out of v1.2 scope
- Inline editor with click-to-accept corrections — out of scope; v1.2 demo is read-only output
- `/proofreader/docs` markdown content → Phase 12 (DOC-01)
- SEO `grep -F` byte-identical audit → Phase 12 (DOC-03)
- 5-cold-run rehearsal log → Phase 12 (POLISH-01)

</deferred>
