# Phase 3: Documentation + SEO — Pattern Map

**Mapped:** 2026-04-28
**Files analyzed:** 4 (1 create, 3 modify)
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `chat/src/app/docs/WebMCP-API.md` (CREATE) | docs (markdown content) | static asset | `chat/src/app/docs/Tool-Calling-API.md` | exact (covers an API + tool descriptors; closest tonal match) |
| `chat/src/app/hooks/useSEOData.ts` (MODIFY) | config (SEO config map) | request-response (effect → `<head>`) | `seoConfigs.webmcp` block in same file (lines 62-66) | exact (sibling addition, same shape) |
| `chat/src/app/components/RecipeWorkbenchPage.tsx` (MODIFY) | component (page) | request-response (path → SEO + tab content) | `WriteRewritePage.tsx:255-263` (DocsRenderer mount) + `Tabs.tsx:2,18` (useLocation pattern) | role-match (no existing page does path-aware SEO; novel composition) |
| `chat/scripts/prerender-react.js` (MODIFY) | config (build-time SEO map) | static (JSON object) | The adjacent `/webmcp` entry at lines 346-356 | exact (same JSON shape, sibling key) |

## Pattern Assignments

---

### `chat/src/app/docs/WebMCP-API.md` (docs, static asset)

**Analog:** `chat/src/app/docs/Tool-Calling-API.md` (417 lines — closest size + topic match; lean alternative `Translate-API.md` is 316 lines, exhaustive ceiling `Writer-ReWriter-API.md` is 490 lines).

**Heading-level pattern** (Tool-Calling-API.md heading map):
```
# <Title>                                  ← line 1 (H1, single)
## Overview                                ← line 5 (H2, "what it is + bullets")
## Basic Usage                             ← line 14 (H2 with H3 subsections)
### Creating a Session with Tools          ← line 16
### Tool Definition Structure              ← line 47
## Input Schema                            ← line 56
### Supported Types                        ← line 73
## Execute Function                        ← line 81
## Example Tools                           ← line 106 (the code-sample anchor)
### Weather Tool / Calculator Tool / ...   ← lines 108, 136, 168
## Best Practices                          ← line 205
## Error Handling                          ← line 228
## Limitations                             ← line 391 (short bulleted list)
## Troubleshooting                         ← line 399
```
The pattern: H1 once, H2 for top-level sections, H3 inside H2 for sub-API or per-example. **Code-sample sections live under their own H2 or H3** (Tool-Calling-API.md uses `## Example Tools` then `### <Name> Tool` — but `Translate-API.md` and `Writer-ReWriter-API.md` instead inline samples directly under each API's H2). Either pattern is valid; D-05/D-06 do not require a wrapping `## Code Samples` section.

**Code-fence languages used across docs** (verified via Tool-Calling-API.md scan):
- ` ```javascript ` for ALL code samples in Tool-Calling-API.md (lines 18, 60, 90, 110, 138, 170, 199, 232, 251, 283, 318, 340, 366, 377)
- Translate-API.md and Writer-ReWriter-API.md also use `javascript` exclusively
- No existing doc uses ` ```typescript ` — but Prism supports it (RESEARCH.md Pattern 4)
- ` ```json ` and ` ```bash ` available but not used in existing docs

**Recommendation:** Use ` ```typescript ` for new samples that show typed snippets (matches the codebase's TS-strict reality and lets D-07 "no `as any`" land cleanly with explicit type annotations on the sample). Existing docs are JS-only because they predate the TS-typed `RECIPE_TOOLS` shape that Sample 1 + Sample 2 will use.

**Opening pattern** (lines 1-13 of Tool-Calling-API.md):
```markdown
# Tool Calling API Documentation

The Chrome AI Tool Calling API allows language models to interact with external functions, enabling powerful integrations with your application's capabilities.

## Overview

Tool calling enables the AI model to:
- Execute JavaScript functions when needed
- Access external data sources
- Perform calculations and computations
- Interact with APIs and services
- Provide real-time information
```
H1 → one-paragraph "what it is" → `## Overview` → bulleted list of capabilities.

**Code-sample shape pattern** (lines 18-45 of Tool-Calling-API.md — Sample 1 reference):
```javascript
const session = await LanguageModel.create({
  initialPrompts: [{
    role: "system",
    content: "You are a helpful assistant with access to various tools."
  }],
  tools: [
    {
      name: "getWeather",
      description: "Get the weather in a location.",
      inputSchema: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The city to check for weather condition.",
          },
        },
        required: ["location"],
      },
      async execute({ location }) {
        const response = await fetch(`https://api.weather.com/v1/current?location=${location}`);
        return JSON.stringify(await response.json());
      },
    }
  ]
});
```
Pattern: tool descriptor inline as object literal, JSON Schema for `inputSchema`, async `execute` returning a JSON string. New `WebMCP-API.md` Sample 1 swaps this for `navigator.modelContext.registerTool(scaleRecipe, { signal })` per D-05; descriptor shape stays the same.

**"Limitations" callout pattern** (Tool-Calling-API.md lines 391-397):
```markdown
## Limitations

1. **Return Type**: Tools must return strings
2. **Serialization**: Complex objects need JSON.stringify()
3. **Async Only**: All tool functions are treated as async
4. **Browser Security**: Some APIs may not be available in browser context
5. **Memory**: Large responses may impact performance
```
Numbered list, bold key, terse explanation. Use this exact shape for the optional "Limitations" callout flagged in CONTEXT.md Discretion.

**Browser Support pattern** (Translate-API.md:15-25 — closer to what WebMCP needs):
```markdown
### Browser Support

The Chrome Translation API requires:
- **Chrome browser version**: 138 or higher
- **Hardware requirements**: Sufficient storage for language packs
- **Operating System**: Windows 10/11, macOS 13+, Linux, or ChromeOS
- **Network connection**: Required for initial language pack downloads
```
WebMCP equivalent (per D-03 §4 + RESEARCH.md Example 6) replaces version + flag info; same bullet+bold pattern.

**Source line counts (D-01 budget reference):**
- Translate-API.md: 316 lines (lean lower bound)
- Tool-Calling-API.md: 417 lines (recommended template — within D-01 300-400 hybrid target if minor sections trimmed)
- Writer-ReWriter-API.md: 490 lines (exhaustive ceiling — do NOT exceed)

---

### `chat/src/app/hooks/useSEOData.ts` (config, request-response)

**Analog:** `seoConfigs.webmcp` block in the same file at lines 62-66 — the new `webmcpDocs` key is a sibling addition with identical shape, different copy.

**Existing `seoConfigs.webmcp` block to mirror** (lines 62-66, verbatim):
```typescript
  webmcp: {
    title: 'WebMCP Recipe Workbench - navigator.modelContext demo | Chrome AI APIs',
    description: 'A page-side WebMCP demo using navigator.modelContext in Chrome 146+ Canary. Browse seeded recipes from IndexedDB and (in later phases) drive them with native browser tools — no MCP server required.',
    keywords: 'WebMCP, navigator.modelContext, Model Context Protocol, page-side tools, Chrome 146, recipe workbench, browser AI tools, IndexedDB demo'
  }
```
Note: the closing `}` at line 66 is followed by `} as const;` at line 67. The new entry inserts BEFORE that closing brace. Append a comma after the existing `webmcp` block.

**Existing `SEOConfig` interface** (lines 4-9, the contract `webmcpDocs` MUST satisfy):
```typescript
interface SEOConfig {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
}
```
`title` and `description` are required; `keywords` is optional but every existing entry includes it. New `webmcpDocs` MUST have all three.

**`useSEOData` signature pattern** (lines 11-28 — what the hook does with the config):
```typescript
export const useSEOData = (config: SEOConfig, path?: string) => {
  const { updateSEO } = useSEO();

  useEffect(() => {
    const baseUrl = window.location.origin;
    const currentPath = path || window.location.pathname;
    
    updateSEO({
      title: config.title,
      description: config.description,
      keywords: config.keywords,
      ogTitle: config.title,
      ogDescription: config.description,
      ogImage: config.ogImage ? `${baseUrl}${config.ogImage}` : undefined,
      canonicalUrl: `${baseUrl}${currentPath}`
    });
  }, [config, path, updateSEO]);
};
```
**Critical for path-aware swap (RESEARCH.md Pitfall 7):** Effect deps are `[config, path, updateSEO]`. Passing different `seoConfigs.*` reference re-fires the effect. Module-scope `seoConfigs.webmcp` and `seoConfigs.webmcpDocs` are stable references → reference-equality check holds across renders within each branch.

**New `webmcpDocs` entry to add** (insert between current line 66 and line 67's `} as const;`, with copy from D-08 spec-drift resolution — D-12/D-13/D-14 require dropping `provideContext` references):
```typescript
  ,
  webmcpDocs: {
    title: 'WebMCP API Documentation - Recipe Workbench guide | Chrome AI APIs',
    description: 'Documentation for the WebMCP Recipe Workbench demo. Walks through navigator.modelContext, registerTool, and the page-side tool descriptor.',
    keywords: 'WebMCP documentation, navigator.modelContext API, registerTool, page-side tools docs, JSON Schema tools'
  }
```
**IMPORTANT:** This is the post-D-12 copy (drops `provideContext` from description and keywords). The prerender file at `chat/scripts/prerender-react.js:357-367` STILL contains the old copy referencing `provideContext` — it MUST be updated in lockstep this phase (see prerender pattern below). Per D-08, runtime config and prerender JSON MUST stay verbatim-identical.

---

### `chat/src/app/components/RecipeWorkbenchPage.tsx` (component, request-response)

This file gets THREE distinct edits. Each has a different analog.

#### Edit (a): Add `useLocation` import

**Analog:** `chat/src/app/components/Tabs.tsx:2,18` (the only other place in the chat workspace that imports `useLocation` from `react-router-dom`).

**Verbatim from Tabs.tsx:**
```typescript
// Line 2:
import { useLocation, useNavigate } from 'react-router-dom';
// Line 18 (inside component body):
const location = useLocation();
```
Also referenced from `useGoogleAnalytics.ts:2,9`:
```typescript
import { useLocation } from 'react-router-dom';
// inside hook:
const location = useLocation();
```

**Where to add in `RecipeWorkbenchPage.tsx`:** A new line after the existing imports (current line 1-20 import block ends with `AgentDrawer` at line 20). Add ONLY `useLocation` (the page does not need `useNavigate` — that lives in Tabs.tsx). Suggested placement: alongside React imports near top.

#### Edit (b): Path-aware `useSEOData` switch (replaces line 105)

**Analog:** **None in this codebase.** RESEARCH.md confirmed (line 13: "Path-aware useSEOData is novel here") — no existing page selects an SEO config based on `location.pathname`. Every other page (Chat/Summary/Writer/Translate) calls `useSEOData(seoConfigs.<demo>, '<path>')` once unconditionally as the first hook in the component body. The pattern composition:
- Pull `useLocation` shape from `Tabs.tsx:18`
- Pull `useSEOData(config, path)` call signature from `RecipeWorkbenchPage.tsx:105` (current state)
- New composition: switch the config + path arguments based on a `pathname.startsWith('/webmcp/docs')` check.

**Current code at line 105 to replace:**
```typescript
useSEOData(seoConfigs.webmcp, '/webmcp');
```

**Replacement pattern** (per RESEARCH.md Example 1 + Pitfall 6 — exact prefix match, NOT `.includes()`):
```typescript
const location = useLocation();
const isDocs = location.pathname.startsWith('/webmcp/docs');
useSEOData(
  isDocs ? seoConfigs.webmcpDocs : seoConfigs.webmcp,
  isDocs ? '/webmcp/docs' : '/webmcp',
);
```
**Critical:** The `useSEOData` call MUST remain the **first** statement in the component body (Rules of Hooks). Place `useLocation()` and the `isDocs` const above it — they are not hooks (well, `useLocation` is, but it has no deps and is order-stable). Do NOT inline-construct config objects inside `useSEOData(...)` — RESEARCH.md Pitfall 7 explains this thrashes `<head>`.

#### Edit (c): Replace Docs-tab placeholder (lines 249-256)

**Analog:** `chat/src/app/components/WriteRewritePage.tsx:255-263` (the canonical DocsRenderer-as-tab-content pattern). Also matched by `chat/src/app/components/Summary.tsx:181-185`.

**Verbatim from WriteRewritePage.tsx:255-263:**
```tsx
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

**Verbatim from Summary.tsx:177-186** (second confirming reference):
```tsx
{
  id: 'docs',
  label: 'API Documentation',
  path: '/summary-api-documentation',
  content: (
    <div className="max-w-none">
      <DocsRenderer docFile="Summary-API.md" initOpen={true} />
    </div>
  )
}
```

**Current placeholder to replace** (`RecipeWorkbenchPage.tsx:244-257` — the WHOLE `docs` tab block):
```tsx
{
  id: 'docs',
  label: 'Docs',
  path: '/docs',
  content: (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
      <p className="text-gray-600 dark:text-gray-400">
        Documentation coming in Phase 3 &mdash; see{' '}
        <code className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded font-mono text-sm">WebMCP-API.md</code>.
      </p>
    </div>
  ),
},
```

**Replacement** (per D-11 — preserve `id`, `label`, `path`; swap `content` to the WriteRewritePage pattern):
```tsx
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

**ANTI-PATTERN guard (per CONTEXT.md D-11 + RESEARCH.md "Anti-Patterns"):** The placeholder uses `bg-white dark:bg-gray-800 rounded-xl shadow-lg border ... p-6 transition-colors duration-200` as the outer container. **DROP this entire className.** `DocsRenderer.tsx:41` already renders its own `bg-white dark:bg-gray-800 rounded-lg overflow-hidden transition-colors duration-200` card. Doubling them produces a card-in-a-card. Use only `<div className="max-w-none">` (verified shape from BOTH WriteRewritePage and Summary).

**Required new import** (top of `RecipeWorkbenchPage.tsx`):
```typescript
import { DocsRenderer } from '../tools/DocsRenderer';
```
Note path is `../tools/DocsRenderer` (NOT `../components/DocsRenderer` — DocsRenderer lives under `tools/`).

**DocsRenderer contract** (from `DocsRenderer.tsx:12`):
```typescript
export function DocsRenderer({docFile, initOpen}: { docFile: string, initOpen?: boolean })
```
Both props required-shape (`docFile` mandatory string, `initOpen` boolean). Setting `initOpen={true}` skips the "Show Documentation" toggle button (`DocsRenderer.tsx:29-37`) and renders the markdown immediately — correct behavior for tab-as-doc per RESEARCH.md Pattern 2.

#### Tabs ordering preservation (NOT an edit — just a guard)

`RecipeWorkbenchPage.tsx:240-243` carries a Phase 2 comment explaining the docs tab MUST appear BEFORE the workbench tab in the array because Tabs.tsx uses `currentPath.includes(tab.path)` for matching, and the workbench tab's path is `''` (empty), which would match any URL. **Do NOT reorder the tabs.** Edit (c) replaces only the `content` field of the docs tab; ordering stays.

---

### `chat/scripts/prerender-react.js` (config, static)

**Analog:** The adjacent `/webmcp` entry at lines 346-356 (same shape, sibling key in the same `seoConfigs` map).

**Lines 346-367 verbatim — both entries side-by-side for reference:**
```javascript
    '/webmcp': {
      title: 'WebMCP Recipe Workbench - navigator.modelContext demo | Chrome AI APIs',
      description: 'A page-side WebMCP demo using navigator.modelContext in Chrome 146+ Canary. Browse seeded recipes from IndexedDB.',
      keywords: 'WebMCP, navigator.modelContext, Model Context Protocol, page-side tools, Chrome 146, recipe workbench, browser AI tools',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'WebMCP Recipe Workbench',
        description: 'Page-side tools demo built on navigator.modelContext',
      },
    },
    '/webmcp/docs': {
      title: 'WebMCP API Documentation - Recipe Workbench guide | Chrome AI APIs',
      description: 'Documentation for the WebMCP Recipe Workbench demo. Walks through navigator.modelContext, registerTool, and provideContext.',
      keywords: 'WebMCP documentation, navigator.modelContext API, registerTool, provideContext, page-side tools docs',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        name: 'WebMCP API Documentation',
        description: 'Technical documentation for the WebMCP Recipe Workbench',
      },
    },
```

**Edit required** (per D-08 + D-12 — drop `provideContext` references in the `/webmcp/docs` entry to match the post-D-12 spec-drift resolution; runtime `seoConfigs.webmcpDocs` and prerender entry MUST be verbatim-identical):

Replace lines 358-360 with:
```javascript
      title: 'WebMCP API Documentation - Recipe Workbench guide | Chrome AI APIs',
      description: 'Documentation for the WebMCP Recipe Workbench demo. Walks through navigator.modelContext, registerTool, and the page-side tool descriptor.',
      keywords: 'WebMCP documentation, navigator.modelContext API, registerTool, page-side tools docs, JSON Schema tools',
```

Lines 357 (`'/webmcp/docs': {`), 361-366 (`structuredData` block — `@type: 'TechArticle'` etc.), and 367 (closing `},`) are UNCHANGED. Only the three string fields (title, description, keywords) get rewritten.

**Title is unchanged** (already matches D-08 post-resolution). Only `description` and `keywords` need updating.

**Note:** The `/webmcp` entry at lines 346-356 is NOT modified — its strings already match `seoConfigs.webmcp` in `useSEOData.ts:62-66` (no `provideContext` reference there).

---

## Shared Patterns

### Pattern: SEO copy is split-source (prerender + runtime), kept verbatim-identical

**Sources:** `chat/scripts/prerender-react.js` (build-time JSON, served to crawlers) + `chat/src/app/hooks/useSEOData.ts` (runtime React, served to humans).

**Apply to:** Both `/webmcp` (already done in Phase 1) and `/webmcp/docs` (this phase).

**Verification command (RESEARCH.md Pitfall 5):**
```bash
grep -F "WebMCP API Documentation - Recipe Workbench guide" \
  chat/src/app/hooks/useSEOData.ts \
  chat/scripts/prerender-react.js
# Both files must hit; same line count expected.
```

**Recommended comment** to add in `useSEOData.ts` near new `webmcpDocs` entry:
```typescript
// Must match prerender-react.js:357-367 verbatim — single source of truth lives
// in prerender for crawler parity. See Phase 3 D-08.
```

### Pattern: DocsRenderer-as-tab-content with `<div className="max-w-none">` wrapper

**Source files (3 instances confirmed):**
- `WriteRewritePage.tsx:259-262` (already canonical reference)
- `Summary.tsx:182-184` (second confirming instance)
- (Translate.tsx exists in canonical_refs but not verified here — both above are sufficient analogs)

**Apply to:** Docs-tab content in `RecipeWorkbenchPage.tsx` (this phase, edit c).

**Always:**
- Use `<div className="max-w-none">` (NOT a card-style container)
- Pass `initOpen={true}` (no toggle button needed when the tab IS the doc)
- Pass `docFile` as a string filename only (DocsRenderer's `loadMDFile` handles path resolution)

### Pattern: `useLocation()` in component body (existing in codebase)

**Source files (2 instances confirmed):**
- `Tabs.tsx:2, 18` — `import { useLocation, useNavigate } from 'react-router-dom';` then `const location = useLocation();`
- `useGoogleAnalytics.ts:2, 9` — `import { useLocation } from 'react-router-dom';` then `const location = useLocation();`

**Apply to:** `RecipeWorkbenchPage.tsx` (this phase, edit a). Confirms the import path and call shape are project-conventional.

### Pattern: Existing markdown doc layout

**Source files (5 docs in `chat/src/app/docs/`):**

| File | Lines | Headings (top-level H2) | Use as |
|------|-------|-------------------------|--------|
| Tool-Calling-API.md | 417 | Overview / Basic Usage / Input Schema / Execute Function / Example Tools / Best Practices / Error Handling / Advanced Examples / Limitations / Troubleshooting | **Primary structural template** (D-01 size, tool-descriptor topic match) |
| Translate-API.md | 316 | Overview / Prerequisites / Language Detection API / Translation API / Error Handling / ... / Best Practices / Conclusion | Lean lower bound |
| Writer-ReWriter-API.md | 490 | Overview / Prerequisites / Writer API / Rewriter API / TypeScript / Best Practices / Conclusion | Exhaustive ceiling — **don't exceed** |
| Summary-API.md | 362 | (similar shape) | Reference |
| Chat-API.md | 432 | (similar shape) | Reference |

**Apply to:** `WebMCP-API.md` authoring. Target ~350 lines (mid-range of D-01 hybrid 300-400). Recommended section order from RESEARCH.md Pattern 3: `Overview → Browser Support → API Surface → Sample 1 → Sample 2 → Security & Permission Model → Limitations (optional) → References (optional)`.

## No Analog Found

| Item | Role | Reason |
|------|------|--------|
| Path-aware `useSEOData(seoConfigs.X, '/X')` switch in a single component handling multiple URLs | Component logic | Confirmed novel via `grep useLocation chat/src` — only `Tabs.tsx` and `useGoogleAnalytics.ts` use `useLocation`, and neither feeds an SEO config. RESEARCH.md line 13 also confirms novelty. **Composition pattern** built from `Tabs.tsx:18` + `useSEOData.ts:11` signatures. Planner has full RESEARCH.md Example 1 to copy from. |

## Metadata

**Analog search scope:**
- `chat/src/app/docs/*.md` (5 files, all read or counted)
- `chat/src/app/hooks/useSEOData.ts` (full file read)
- `chat/src/app/components/{RecipeWorkbenchPage,WriteRewritePage,Summary,Tabs}.tsx` (relevant ranges read)
- `chat/src/app/tools/DocsRenderer.tsx` (full file read)
- `chat/scripts/prerender-react.js` (lines 340-374 read)
- `chat/src/app/services/recipeTools.ts` (lines 1-100 read for sample reference)
- `grep useLocation chat/src` (full workspace search)

**Files scanned:** 12

**Pattern extraction date:** 2026-04-28
