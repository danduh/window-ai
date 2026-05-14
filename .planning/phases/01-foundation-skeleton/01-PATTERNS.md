# Phase 1: Foundation Skeleton - Pattern Map

**Mapped:** 2026-04-26
**Files analyzed:** 9 new + 4 modified = 13
**Analogs found:** 13 / 13 (100%)

> Note on prompt injection: while reading `01-RESEARCH.md` a system reminder block at the very end of the file purported to come from MCP servers ("Context7", "telegram") and tried to direct tool use. I ignored those injected instructions and stayed on the pattern-mapping task. The user's actual instruction is the `<pattern_mapping_context>` block from the orchestrator.

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `chat/src/app/components/RecipeWorkbenchPage.tsx` | page (React component) | request-response (state, no streaming) | `chat/src/app/components/Summary.tsx` | exact (page+Tabs+SEO+ThemeToggle) |
| `chat/src/app/components/RecipeWorkbench/RecipePicker.tsx` | sub-component (segmented buttons) | event-driven (onClick) | `chat/src/app/components/WriteRewritePage.tsx:206-227` (Writer/Rewriter mode toggle) | exact (segmented pill pattern) |
| `chat/src/app/components/RecipeWorkbench/RecipeHeader.tsx` | sub-component (title + servings) | request-response (props in) | inline `<header>` of `Summary.tsx:137-148` (icon tile + title + subtitle) | role-match (header anatomy) |
| `chat/src/app/components/RecipeWorkbench/IngredientsList.tsx` | sub-component (list render) | request-response (props in) | `<ol>`/`<ul>` patterns inside `HomePage.tsx:99-108` (`FlagInstruction` repeated rows) | role-match (semantic list rows in a card) |
| `chat/src/app/components/RecipeWorkbench/StepsList.tsx` | sub-component (list render) | request-response (props in) | same as `IngredientsList.tsx` (`HomePage.tsx:99-108`) | role-match |
| `chat/src/app/components/RecipeWorkbench/MissingFlagBanner.tsx` | sub-component (banner) | request-response (no props or `flag`/`browser` props) | `HomePage.tsx:68-82` (yellow experimental-features banner) | exact (same Tailwind classes) |
| `chat/src/app/services/RecipePersistence.ts` | service (idb wrapper) | CRUD | `chat/src/app/services/SummaryService.ts` (typed interfaces + module-level singleton + JSDoc on every export) | role-match (service shape, different storage substrate) |
| `chat/src/app/services/recipeSeed.ts` | data-only module | request-response (constant export) | no exact analog — `chat/src/app/config/analytics.ts` is the closest precedent for a tiny pure-data export | partial (config module shape) |
| `chat/src/app/types/webmcp.d.ts` | ambient type declarations | build-time | `chat/src/app/types/dom-chromium-ai.d.ts` (ambient `declare global { ... }` for Chrome AI) + `chat/src/app/services/SummaryService.ts:31-44` (Window augmentation excerpt) | exact (`declare global { interface ... }` shape) |
| `chat/src/app/AppRouter.tsx` (MODIFY) | routing chrome | request-response | itself — pattern is established, must be extended in place | self |
| `chat/src/app/hooks/useSEOData.ts` (MODIFY) | hook + config | request-response | itself — `seoConfigs` object literal extended with new key | self |
| `chat/scripts/prerender-react.js` (MODIFY) | build script | batch | itself — append to `routes[]` and add a key to `getSEODataForRoute`'s map | self |
| `package.json` (MODIFY, root) | manifest | build-time | itself — append `"idb": "^8.0.3"` to `dependencies` (root, not `chrome-llm-ts/`) | self |

**No analog found:** none. Every Phase 1 file has either an exact or close existing analog in `chat/`.

---

## Pattern Assignments

### `chat/src/app/components/RecipeWorkbenchPage.tsx` (page, request-response)

**Analog:** `chat/src/app/components/Summary.tsx` (lines 1-355)

**Rationale:** Phase 1 page must mirror the canonical demo-page shell — `useSEOData` + `useGoogleAnalytics` + outer `min-h-screen`/`max-w-6xl` wrapper + header with gradient icon tile + `ThemeToggle` + `<Tabs>` with `defaultTab` + `basePath`. `Summary.tsx` is the cleanest example because (a) it has only a single primary view (no mode toggle like `WriteRewritePage`) which matches the Phase-1 single-tab story, and (b) the UI-SPEC explicitly anchors many decisions to it.

**Imports pattern** (`Summary.tsx:1-14`):
```tsx
import React, { useState } from 'react';
import { Message } from './ChatBox';
import {
  summarizeText,
  summarizeTextStreaming,
  checkSummaryAvailability,
  type SummaryOptions,
  type AvailabilityStatus
} from '../services/SummaryService';
import { DocsRenderer } from '../tools/DocsRenderer';
import ThemeToggle from './ThemeToggle';
import Tabs from './Tabs';
import { useSEOData, seoConfigs } from '../hooks/useSEOData';
import { useGoogleAnalytics } from '../hooks/useGoogleAnalytics';
```

For RecipeWorkbenchPage, adapt to:
```tsx
import React, { useEffect, useState } from 'react';
import ThemeToggle from './ThemeToggle';
import Tabs from './Tabs';
import { useSEOData, seoConfigs } from '../hooks/useSEOData';
import { useGoogleAnalytics } from '../hooks/useGoogleAnalytics';
import { getRecipes, seedIfEmpty, type Recipe } from '../services/RecipePersistence';
import { SEED_RECIPES } from '../services/recipeSeed';
import { RecipePicker } from './RecipeWorkbench/RecipePicker';
import { RecipeHeader } from './RecipeWorkbench/RecipeHeader';
import { IngredientsList } from './RecipeWorkbench/IngredientsList';
import { StepsList } from './RecipeWorkbench/StepsList';
import { MissingFlagBanner } from './RecipeWorkbench/MissingFlagBanner';
```

**SEO + analytics hook calls — first lines of body** (`Summary.tsx:16-18`):
```tsx
export function Summary() {
  useSEOData(seoConfigs.summary, '/summary');
  const { trackAIToolUsage, trackUserInteraction, trackError } = useGoogleAnalytics();
```

For RecipeWorkbenchPage:
```tsx
export function RecipeWorkbenchPage() {
  useSEOData(seoConfigs.webmcp, '/webmcp');
  const { trackUserInteraction } = useGoogleAnalytics();
```

(Phase 1 doesn't issue AI calls, so `trackAIToolUsage`/`trackError` not needed yet — `trackUserInteraction` is enough for picker clicks if desired.)

**Outer shell + header pattern** (`Summary.tsx:133-171`):
```tsx
return (
  <div className="min-h-screen bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors duration-200">
    <div className="max-w-6xl mx-auto p-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="bg-gradient-to-r from-primary-500 to-purple-600 text-white p-3 rounded-xl">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Summarizer</h1>
            <p className="text-gray-600 dark:text-gray-400">Powered by Chrome's Summarization API</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {/* ... settings/clear buttons ... */}
          <ThemeToggle />
        </div>
      </header>
```

For RecipeWorkbenchPage — same shell, swap H1 to "Recipe Workbench" (UI-SPEC §Copywriting), subtitle to "A WebMCP demo: tools live on the page, not on a server.", and pick a chef-hat / book / lab SVG (any 24x24 stroke icon). Phase 1 needs no settings/clear buttons in the right cluster — just `<ThemeToggle />`.

**Tabs wrapper pattern** (`Summary.tsx:173-349`):
```tsx
<Tabs
  defaultTab="docs"
  basePath="/summary"
  tabs={[
    {
      id: 'docs',
      label: 'API Documentation',
      path: '/summary-api-documentation',
      content: (
        <div className="max-w-none">
          <DocsRenderer docFile="Summary-API.md" initOpen={true} />
        </div>
      )
    },
    {
      id: 'demo',
      label: 'Demo',
      path: '/summary-demo',
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* settings panel + main panel */}
        </div>
      )
    }
  ]}
/>
```

For RecipeWorkbenchPage — invert default to `'workbench'` (per UI-SPEC §Layout note: "the workbench tab is the default and `path` for `/webmcp`"), add the `MissingFlagBanner` directly above `<Tabs>`:
```tsx
{!navigator.modelContext && <MissingFlagBanner />}
<Tabs
  defaultTab="workbench"
  basePath="/webmcp"
  tabs={[
    {
      id: 'workbench',
      label: 'Workbench',
      path: '',  // /webmcp itself — this is the default tab
      content: <WorkbenchPanel recipes={recipes} activeId={activeId} setActiveId={setActiveId} />
    },
    {
      id: 'docs',
      label: 'Docs',
      path: '/docs',
      content: (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
          <p className="text-gray-600 dark:text-gray-400">Documentation coming in Phase 3 — see <code className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded font-mono text-sm">WebMCP-API.md</code>.</p>
        </div>
      )
    }
  ]}
/>
```

**Tabs basePath URL gotcha:** `Tabs.tsx:23-29, 34-42` resolves the active tab by checking `currentPath.includes(t.path)`. `path: ''` means the workbench is matched whenever the current pathname starts with `/webmcp` (i.e. always under this route) — this is fine because the docs tab's `path: '/docs'` is more specific and matched first IF the find-order puts it first. Recommendation: list `docs` BEFORE `workbench` in the `tabs[]` array to make `/webmcp/docs` win the `find()` call, so `/webmcp` falls through to the workbench default. Alternative — give workbench a non-empty path like `/workbench` and add a Route alias/redirect.

**State + effects pattern** (Phase-1 specific; no exact analog — closest is `Summary.tsx:20-29` which uses pure useState, plus the `getModelCapabilities` useEffect in `chat/src/app/components/ChatPage.tsx:44-50` for an `await` inside `useEffect`):
```tsx
const [recipes, setRecipes] = useState<Recipe[]>([]);
const [activeId, setActiveId] = useState<string | null>(null);
const [loading, setLoading] = useState<boolean>(true);

useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      await seedIfEmpty(SEED_RECIPES);
      const all = await getRecipes();
      if (cancelled) return;
      setRecipes(all);
      setActiveId(all[0]?.id ?? null);
    } catch (err) {
      console.error('Failed to load recipes:', err);
    } finally {
      if (!cancelled) setLoading(false);
    }
  })();
  return () => { cancelled = true; };
}, []);
```

The `cancelled` flag handles React 19 StrictMode double-invocation cleanly (RESEARCH §Pitfall 1).

---

### `chat/src/app/components/RecipeWorkbench/RecipePicker.tsx` (sub-component, event-driven)

**Analog:** `chat/src/app/components/WriteRewritePage.tsx:206-227` (Writer/Rewriter mode toggle — segmented pill buttons)

**Rationale:** UI-SPEC §Layout calls out segmented buttons stacked vertically in a sidebar card and explicitly references this analog: "This visually echoes the `WriteRewritePage.tsx:206-227` Writer/Rewriter toggle but promotes the active state from neutral `bg-white` to accent `bg-primary-600`."

**Existing pattern to mirror** (`WriteRewritePage.tsx:206-227`):
```tsx
<div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
  <button
    onClick={() => setActiveMode('writer')}
    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
      activeMode === 'writer'
        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
    }`}
  >
    Writer
  </button>
  <button
    onClick={() => setActiveMode('rewriter')}
    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
      activeMode === 'rewriter'
        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
    }`}
  >
    Rewriter
  </button>
</div>
```

**Adapted (per UI-SPEC §Layout — vertical stack, `primary-600` active state, `aria-pressed`):**
```tsx
import React from 'react';
import type { Recipe } from '../../services/RecipePersistence';

interface RecipePickerProps {
  recipes: Recipe[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export const RecipePicker: React.FC<RecipePickerProps> = ({ recipes, activeId, onSelect }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recipes</h3>
    <div className="flex flex-col gap-2" role="group" aria-label="Active recipe">
      {recipes.map((r) => {
        const isActive = r.id === activeId;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r.id)}
            aria-pressed={isActive}
            className={
              isActive
                ? 'w-full text-left px-4 py-3 rounded-lg bg-primary-600 text-white font-medium transition-colors duration-200'
                : 'w-full text-left px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200'
            }
          >
            {r.title}
          </button>
        );
      })}
    </div>
  </div>
);
```

The class strings here are dictated verbatim by UI-SPEC §Layout `PickerButton (active)` / `PickerButton (inactive)`.

---

### `chat/src/app/components/RecipeWorkbench/RecipeHeader.tsx` (sub-component, request-response)

**Analog:** `Summary.tsx:144-148` (header inner block — H2-style title + servings/subtitle Body line). UI-SPEC §Copywriting locks `Recipe title` as `<h2>`-level (page H1 is the page header) and `Serves {n}` as a Label.

**Pattern excerpt** (`Summary.tsx:144-148`, the inner title+subtitle block):
```tsx
<div>
  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Summarizer</h1>
  <p className="text-gray-600 dark:text-gray-400">Powered by Chrome's Summarization API</p>
</div>
```

**Adapted (recipe header — inside the recipe view card, semantic `<h2>`):**
```tsx
import React from 'react';

interface RecipeHeaderProps {
  title: string;
  servings: number;
}

export const RecipeHeader: React.FC<RecipeHeaderProps> = ({ title, servings }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">Serves {servings}</p>
  </div>
);
```

Card class string is the verbatim repeated card primitive (UI-SPEC §Layout: "Reuse this exact class string verbatim. Do not introduce a new `<Card>` component"). H2 size = Heading role (`text-xl font-semibold`, UI-SPEC §Typography).

---

### `chat/src/app/components/RecipeWorkbench/IngredientsList.tsx` (sub-component, request-response)

**Analog:** `HomePage.tsx:99-108` (`<ol class="space-y-2 mb-6">` with `<FlagInstruction>` rows) — the closest "list of structured rows inside a card" precedent.

**Pattern excerpt** (`HomePage.tsx:26-31` for the row component + `99-108` for the list container):
```tsx
const FlagInstruction = ({ flag, description }: { flag: string; description: string }) => (
  <li className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
    <span className="font-semibold text-primary-600 dark:text-primary-400">{flag}:</span>
    <span className="ml-2 text-gray-700 dark:text-gray-300">{description}</span>
  </li>
);
// ...
<ol className="space-y-2 mb-6">
  <FlagInstruction flag="Enable Gemini Nano" description='...' />
  <FlagInstruction flag="Enable Prompt API" description='...' />
</ol>
```

**Adapted (ingredients are unordered per UI-SPEC §Accessibility — `<ul>`, format `{quantity} {unit} {name}`):**
```tsx
import React from 'react';
import type { Ingredient } from '../../services/RecipePersistence';

interface IngredientsListProps {
  ingredients: Ingredient[];
}

export const IngredientsList: React.FC<IngredientsListProps> = ({ ingredients }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Ingredients</h3>
    {ingredients.length === 0 ? (
      <p className="text-gray-500 dark:text-gray-400 italic">No ingredients listed.</p>
    ) : (
      <ul className="space-y-2">
        {ingredients.map((ing, idx) => (
          <li key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-100">
            <span className="font-medium">{ing.quantity} {ing.unit}</span>{' '}
            <span className="text-gray-700 dark:text-gray-300">{ing.name}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
);
```

Empty-state copy matches UI-SPEC §Empty/fallback states (`No ingredients listed.`, italic, `text-gray-500 dark:text-gray-400`).

---

### `chat/src/app/components/RecipeWorkbench/StepsList.tsx` (sub-component, request-response)

**Analog:** `HomePage.tsx:99-108` (same as IngredientsList — list-of-rows-in-a-card pattern), but `<ol>` instead of `<ul>` per UI-SPEC §Accessibility.

**Adapted:**
```tsx
import React from 'react';

interface StepsListProps {
  steps: string[];
}

export const StepsList: React.FC<StepsListProps> = ({ steps }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Steps</h3>
    {steps.length === 0 ? (
      <p className="text-gray-500 dark:text-gray-400 italic">No steps listed.</p>
    ) : (
      <ol className="space-y-3 list-decimal list-inside">
        {steps.map((step, idx) => (
          <li key={idx} className="text-gray-900 dark:text-gray-100 leading-relaxed">
            {step}
          </li>
        ))}
      </ol>
    )}
  </div>
);
```

Body text uses default `text-base` size (Body role, UI-SPEC §Typography). `list-decimal list-inside` provides default `<ol>` numbering — UI-SPEC §Copywriting allows either an explicit `Step {n}` Label or default numbering "but must be consistent across both seeded recipes". Default is simpler and ships less code.

---

### `chat/src/app/components/RecipeWorkbench/MissingFlagBanner.tsx` (sub-component, request-response)

**Analog:** `HomePage.tsx:68-82` (yellow `Experimental Features` alert) — UI-SPEC §Banner cites this exact block as the source-of-truth for class strings.

**Pattern excerpt** (`HomePage.tsx:68-82`):
```tsx
<div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
  <div className="flex items-start">
    <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
    <div>
      <p className="text-yellow-800 dark:text-yellow-200 font-medium">Experimental Features</p>
      <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
        These APIs are experimental and require Chrome Canary with specific flags enabled.
        Features may change or be removed in future versions.
      </p>
    </div>
  </div>
</div>
```

**Adapted (UI-SPEC §Banner — switched margin-top to `mb-6`, kept class strings, added the `Browser:` / `Flag:` code rows from `HomePage.tsx:33-37` `CodeSnippet`):**
```tsx
import React from 'react';

export const MissingFlagBanner: React.FC = () => (
  <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg" role="status">
    <div className="flex items-start">
      <svg
        className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2 flex-shrink-0"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <div>
        <p className="text-yellow-800 dark:text-yellow-200 font-medium">WebMCP isn&apos;t enabled in this browser.</p>
        <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
          The recipe browser still works. To register tools and run the agent demo, open this page in Chrome 146+ Canary with the WebMCP flag enabled.
        </p>
        <div className="mt-3 space-y-1 text-sm">
          <div>
            <span className="text-yellow-700 dark:text-yellow-300">Browser:</span>{' '}
            <code className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded font-mono text-sm">Chrome 146+ Canary</code>
          </div>
          <div>
            <span className="text-yellow-700 dark:text-yellow-300">Flag:</span>{' '}
            <code className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded font-mono text-sm">chrome://flags/#WebMCP</code>{' '}(set to &quot;For testing&quot;)
          </div>
        </div>
      </div>
    </div>
  </div>
);
```

Copy strings come verbatim from UI-SPEC §Copywriting (Missing-flag banner table).

---

### `chat/src/app/services/RecipePersistence.ts` (service, CRUD)

**Analog:** `chat/src/app/services/SummaryService.ts` (lines 1-71) — for the file *shape*: typed interfaces at top, JSDoc on every export, exported `async` functions, single module owns the API surface.

**Rationale:** `SummaryService.ts` is the canonical service template (CONVENTIONS.md §"Where to add new code" calls it out by name: "follow the SummaryService/WriterService template"). The DOMException-translation try/catch block doesn't apply (we're not calling Chrome AI), but the structural template — interfaces → declare-global if needed → JSDoc'd named exports — does.

**Imports + types pattern** (`SummaryService.ts:1-29`):
```ts
// Summary availability status type
export type AvailabilityStatus = "unavailable" | "downloadable" | "downloading" | "available";

// Summary options interface
export interface SummaryOptions {
  type?: "key-points" | "tl;dr" | "teaser" | "headline";
  format?: "markdown" | "plain-text";
  // ...
}
```

For RecipePersistence, mirror the "interfaces at top, exported, named meaningfully":
```ts
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: string;
  title: string;
  servings: number;
  ingredients: Ingredient[];
  steps: string[];
}

interface RecipeDB extends DBSchema {
  recipes: {
    key: string;
    value: Recipe;
  };
}

const DB_NAME = 'window-ai-recipes';
const DB_VERSION = 1;
const STORE = 'recipes';

let dbPromise: Promise<IDBPDatabase<RecipeDB>> | null = null;
```

**JSDoc on every export pattern** (`SummaryService.ts:46-71`):
```ts
/**
 * Creates a summary of the input text with the specified options
 */
export const summarizeText = async (
  text: string,
  options?: SummaryOptions
): Promise<string> => {
  try { /* ... */ } catch (error) { /* ... */ }
};
```

For RecipePersistence — every CRUD export gets a one-line JSDoc:
```ts
const getDB = (): Promise<IDBPDatabase<RecipeDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<RecipeDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

/** Returns every persisted recipe, ordered by IndexedDB key. */
export const getRecipes = async (): Promise<Recipe[]> => {
  const db = await getDB();
  return db.getAll(STORE);
};

/** Looks up a single recipe by id; resolves to undefined if missing. */
export const getRecipe = async (id: string): Promise<Recipe | undefined> => {
  const db = await getDB();
  return db.get(STORE, id);
};

/** Upserts a recipe into the store. */
export const saveRecipe = async (recipe: Recipe): Promise<void> => {
  const db = await getDB();
  await db.put(STORE, recipe);
};

/** Removes a recipe by id. No-op if id is unknown. */
export const deleteRecipe = async (id: string): Promise<void> => {
  const db = await getDB();
  await db.delete(STORE, id);
};

/** Idempotent first-load seed: writes the supplied recipes only when the store is empty. */
export const seedIfEmpty = async (seeds: Recipe[]): Promise<void> => {
  const db = await getDB();
  const count = await db.count(STORE);
  if (count > 0) return;
  const tx = db.transaction(STORE, 'readwrite');
  await Promise.all(seeds.map((r) => tx.store.put(r)));
  await tx.done;
};
```

**Error handling — adapted from `SummaryService.ts:58-69` `instanceof DOMException` pattern:** `idb` rejections are usually plain `Error` (and sometimes `DOMException` for quota issues). Phase 1 doesn't need the four-name ladder; the page-level try/catch in `RecipeWorkbenchPage.tsx`'s mount effect logs to console and the picker stays empty (covered by UI-SPEC §Error states "Persistence read failed" copy). Do not wrap each CRUD call in DOMException translation — that would be over-engineered for the DoD.

**Naming:** PascalCase + "Service" suffix is the project convention (CONVENTIONS.md §Naming Patterns), but `chat/` already has a `services/` directory and the file matches the precedent (`SummaryService.ts`, `TranslateService.ts`, etc.). RESEARCH §3 calls the file `RecipePersistence.ts` — that drops the "Service" suffix. Either is fine; planner's call. Recommendation: keep `RecipePersistence.ts` because it's not a Chrome-AI wrapper, and the existing services file naming reflects "ChromeAI service wrapper" specifically.

---

### `chat/src/app/services/recipeSeed.ts` (data-only module)

**Analog:** `chat/src/app/config/analytics.ts` is the closest precedent for a tiny pure-data export module. There's no other "static seed data" file in `chat/`.

**Pattern (analytics.ts is the lightweight constant-export shape):**
```ts
// chat/src/app/config/analytics.ts (referenced from STRUCTURE.md, not re-read here)
// Pattern: export const ANALYTICS_CONFIG = { measurementId: 'G-...', debug: false };
```

**Adapted — exports a typed array of two seed recipes per RESEARCH §4 + UI-SPEC §Copywriting (titles `Buttermilk Pancakes`, `Tomato Pasta`):**
```ts
import type { Recipe } from './RecipePersistence';

export const SEED_RECIPES: Recipe[] = [
  {
    id: 'buttermilk-pancakes',
    title: 'Buttermilk Pancakes',
    servings: 4,
    ingredients: [
      { name: 'flour', quantity: 200, unit: 'g' },
      { name: 'buttermilk', quantity: 240, unit: 'ml' },
      { name: 'eggs', quantity: 2, unit: 'piece' },
      { name: 'sugar', quantity: 2, unit: 'tbsp' },
      { name: 'baking powder', quantity: 1, unit: 'tsp' },
      { name: 'salt', quantity: 0.5, unit: 'tsp' },
    ],
    steps: [
      'Whisk flour, sugar, baking powder, and salt in a bowl.',
      'In a separate bowl, beat eggs and buttermilk together.',
      'Combine the wet and dry mixtures; stir until just combined (lumps are fine).',
      'Heat a non-stick skillet over medium heat and ladle on the batter.',
      'Cook 2 minutes per side, until bubbles set and edges look dry.',
      'Serve warm with maple syrup.',
    ],
  },
  {
    id: 'tomato-pasta',
    title: 'Tomato Pasta',
    servings: 2,
    ingredients: [
      { name: 'spaghetti', quantity: 200, unit: 'g' },
      { name: 'crushed tomatoes', quantity: 400, unit: 'g' },
      { name: 'garlic cloves', quantity: 2, unit: 'piece' },
      { name: 'olive oil', quantity: 2, unit: 'tbsp' },
      { name: 'basil leaves', quantity: 6, unit: 'piece' },
      { name: 'salt', quantity: 1, unit: 'tsp' },
    ],
    steps: [
      'Bring a large pot of salted water to a boil and cook spaghetti to al dente.',
      'Meanwhile, warm olive oil in a saucepan and sauté sliced garlic until fragrant.',
      'Pour in crushed tomatoes, season with salt, and simmer for 8 minutes.',
      'Drain pasta and toss it with the sauce.',
      'Tear basil over the top and serve.',
    ],
  },
];
```

The shape is dictated by the `Recipe` interface from `RecipePersistence.ts`; `unit` is a free-form string per RESEARCH §A5.

---

### `chat/src/app/types/webmcp.d.ts` (ambient types)

**Analog:** `chat/src/app/types/dom-chromium-ai.d.ts` (lines 1-124) — local-only ambient `.d.ts` augmenting global types for a Chrome experimental API. Plus `chat/src/app/services/SummaryService.ts:30-44` for the `declare global { interface ... }` excerpt pattern.

**Pattern excerpt — `dom-chromium-ai.d.ts:1-9, 36-51, 99-108`:**
```ts
// Re-export types from @types/dom-chromium-ai for easier use
declare global {
  // Re-export the types to make them available globally
  interface LanguageModelParams {
    readonly defaultTopK: number;
    // ...
  }

  abstract class LanguageModel extends EventTarget {
    static create(options?: LanguageModelCreateOptions): Promise<LanguageModel>;
    static availability(options?: Partial<LanguageModelCreateOptions>): Promise<"unavailable" | "downloadable" | "downloading" | "available">;
    // ...
  }
}
```

**Pattern excerpt — `SummaryService.ts:30-44` (Window augmentation):**
```ts
// Extend the Window interface to include Summarizer
declare global {
  interface Window {
    Summarizer: {
      create(options?: SummaryOptions): Promise<{ /* ... */ }>;
      availability(options?: SummaryOptions): Promise<AvailabilityStatus>;
    };
  }
}
```

**Adapted — augment `Navigator`, not `Window`, per RESEARCH §3 Pattern 2:**
```ts
// chat/src/app/types/webmcp.d.ts
// Ambient declarations for the WebMCP API (Chrome 146 Canary, W3C draft).
// Picked up automatically by chat/tsconfig.app.json `include: ["src/**/*.ts"]`.
// DO NOT import this file from a .ts/.tsx — that would convert it to a module
// and break the ambient global augmentations.

declare global {
  interface Navigator {
    /**
     * The WebMCP entry point. Undefined when the user agent does not implement
     * `navigator.modelContext` or when the page is not a Secure Context.
     */
    readonly modelContext?: ModelContext;
  }

  interface ModelContext {
    /**
     * Registers a tool with the user agent. Pass an `AbortSignal` via `options`
     * to deregister; per the W3C IDL there is no separate `unregisterTool` method.
     */
    registerTool(tool: ModelContextTool, options?: ModelContextRegisterToolOptions): void;
    provideContext(context: object): void;
  }

  interface ModelContextRegisterToolOptions {
    signal?: AbortSignal;
  }

  interface ModelContextTool {
    name: string;
    description: string;
    /** JSON Schema describing the input shape passed to `execute`. */
    inputSchema?: object;
    /**
     * Tool handler. Input is dynamic per-tool (driven by `inputSchema`), so `any`
     * is the spec-correct shape — narrow per-tool at the call site in Phase 2.
     */
    execute: (input: any, client?: ModelContextClient) => Promise<unknown> | unknown;
    title?: string;
    annotations?: ModelContextToolAnnotations;
  }

  interface ModelContextToolAnnotations {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  }

  interface ModelContextClient {
    requestUserInteraction(callback: (...args: any[]) => any): Promise<any>;
  }
}

export {};
```

Notes for the planner:
- `export {}` at the end is required by the existing precedent — `dom-chromium-ai.d.ts` does NOT have it but `SummaryService.ts` is a real module so its `declare global` works. For a pure ambient `.d.ts` file in `chat/src/app/types/`, follow `dom-chromium-ai.d.ts` and OMIT `export {}` (the file becomes a script, not a module, and global augmentations apply repo-wide).
- Verify by running `npx nx build chat` — TS will emit "Property 'modelContext' does not exist on type 'Navigator'" if the file isn't picked up.
- The two `any` uses (`execute` input + `requestUserInteraction` callback signature) are spec-mandated per RESEARCH §3 Pattern 2 and §Pitfall 4 — do not eslint-disable them, do not refactor them away.

---

### `chat/src/app/AppRouter.tsx` (MODIFY)

**Self-analog.** The pattern lives in this file and must be extended in place. Three concrete additions:

**Addition 1 — desktop nav `<Link>`** (insert between Translate at line 64 and Writer/Rewriter at line 65, mirroring the exact class string from `AppRouter.tsx:50-67`):
```tsx
<Link to="/webmcp"
      onClick={() => trackUserInteraction('navigation_click', 'webmcp_link')}
      className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">WebMCP</Link>
```

**Addition 2 — mobile nav `<Link>`** (insert between Translate at line 148 and Writer/Rewriter at line 149, mirroring `AppRouter.tsx:134-151`):
```tsx
<Link to="/webmcp"
      onClick={() => trackUserInteraction('navigation_click', 'webmcp_link_mobile')}
      className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200">WebMCP</Link>
```

**Addition 3 — route(s)** (insert between Translate routes ending at line 212 and Writer routes starting at line 215, mirroring the `Tabs`-style demos at `AppRouter.tsx:204-217`):
```tsx
{/* WebMCP routes */}
<Route path="/webmcp" element={<RecipeWorkbenchPage/>}/>
<Route path="/webmcp/docs" element={<RecipeWorkbenchPage/>}/>
```

**Addition 4 — import** (top of file, alongside the other page imports at lines 3-8):
```tsx
import { RecipeWorkbenchPage } from './components/RecipeWorkbenchPage';
```

Note the existing files use a mix of default and named imports — `Summary` is default-imported (`AppRouter.tsx:5`), `HomePage` is named-imported (`AppRouter.tsx:8`). UI-SPEC §Layout / RESEARCH structure shows `RecipeWorkbenchPage` as a named export. Either works; pick named for consistency with `HomePage`.

**Catch-all sentinel:** `AppRouter.tsx:218` (`<Route path="*" element={<Navigate to="/" replace/>}/>`) MUST remain the last route. Insert WebMCP routes BEFORE it.

---

### `chat/src/app/hooks/useSEOData.ts` (MODIFY)

**Self-analog.** Append to the `seoConfigs` object at lines 31-62. Pattern of every existing entry:
```ts
summary: {
  title: 'Text Summarization API - AI-powered content summarization | Chrome AI APIs',
  description: 'Generate intelligent summaries with Chrome\'s Summarization API. Multiple formats including key-points, TL;DR, headlines, and teasers with customizable length options.',
  keywords: 'text summarization, AI summarization, content summarization, key points, TL;DR, headlines, browser AI'
},
```

**New entry to add** (insert before the closing `} as const;` at line 62):
```ts
webmcp: {
  title: 'WebMCP Recipe Workbench - navigator.modelContext demo | Chrome AI APIs',
  description: 'A page-side WebMCP demo using navigator.modelContext in Chrome 146+ Canary. Browse seeded recipes from IndexedDB and (in later phases) drive them with native browser tools — no MCP server required.',
  keywords: 'WebMCP, navigator.modelContext, Model Context Protocol, page-side tools, Chrome 146, recipe workbench, browser AI tools, IndexedDB demo'
}
```

(Title/description/keywords are derived from the requirements — finalize wording with the planner if needed; the shape and the trailing-comma-rules-as-the-others matter most.)

---

### `chat/scripts/prerender-react.js` (MODIFY)

**Self-analog.** Two locations to extend:

**Location 1 — `routes` array** (`prerender-react.js:25-52`). Pattern of every existing entry:
```js
// Summary routes
{ path: '/summary', filename: 'summary.html' },
{ path: '/summary/summary-api-documentation', filename: 'summary-api-documentation.html' },
{ path: '/summary/summary-demo', filename: 'summary-demo.html' },
```

**New routes to append** (insert before the closing `]` at line 52, after the Writer routes):
```js
// WebMCP routes
{ path: '/webmcp', filename: 'webmcp.html' },
{ path: '/webmcp/docs', filename: 'webmcp-docs.html' },
```

**Location 2 — `getSEODataForRoute` function** (`prerender-react.js:109-345`). Pattern of every existing entry:
```js
'/summary': {
  title: 'Text Summarization API - AI-powered content summarization | Chrome AI APIs',
  description: '...',
  keywords: '...',
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Text Summarization Demo',
    description: 'AI-powered text summarization with multiple formats',
  },
},
```

**New entries** (insert inside the `seoConfigs` object before line 342):
```js
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

The `seoConfigs` keys here are *route paths* (with leading slash), NOT the camelCase keys used in `useSEOData.ts`. Don't conflate the two.

---

### `package.json` (MODIFY, root)

**Self-analog.** RESEARCH §Q7 locks the answer: add `idb` to root `dependencies` ONLY (not to `chrome-llm-ts/package.json`). Existing pattern for runtime deps at `package.json:16-37`. New entry to add (alphabetically — between `fastify-plugin` and `prismjs`):
```json
"idb": "^8.0.3",
```

Final dependency block fragment:
```json
"fastify-plugin": "5.0.1",
"idb": "^8.0.3",
"prismjs": "^1.29.0",
```

After editing, run `npm install` and verify `node_modules/idb/package.json` shows `"version": "8.0.3"` (or `>=8.0.3`).

---

## Shared Patterns

### Card primitive (apply everywhere a content card is rendered)
**Source:** `Summary.tsx:196`, `WriteRewritePage.tsx:276`, `HomePage.tsx:62`, `HomePage.tsx:15`, `Summary.tsx:253`, `Summary.tsx:314`, `Summary.tsx:335` — five demo pages all repeat this verbatim.
**Apply to:** every workbench card (RecipePicker, RecipeHeader, IngredientsList, StepsList, the Docs-tab placeholder).
**Class string (UI-SPEC §Layout: Reuse this exact class string verbatim. Do not introduce a new `<Card>` component):**
```
bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200
```

### Page outer shell
**Source:** `Summary.tsx:134-135`, `WriteRewritePage.tsx:190-191`, `HomePage.tsx:43-44`.
**Apply to:** `RecipeWorkbenchPage.tsx` outer wrapper.
```tsx
<div className="min-h-screen bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors duration-200">
  <div className="max-w-6xl mx-auto p-4">
    {/* page content */}
  </div>
</div>
```

### Header (gradient icon tile + H1 + subtitle + ThemeToggle)
**Source:** `Summary.tsx:137-171`, `WriteRewritePage.tsx:193-249`, `HomePage.tsx:46-59`.
**Apply to:** `RecipeWorkbenchPage.tsx` header section.
**Skeleton:**
```tsx
<header className="flex items-center justify-between mb-8">
  <div className="flex items-center space-x-4">
    <div className="bg-gradient-to-r from-primary-500 to-purple-600 text-white p-3 rounded-xl">
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {/* 24x24 stroke-currentColor SVG path — pick a chef-hat or book icon */}
      </svg>
    </div>
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Recipe Workbench</h1>
      <p className="text-gray-600 dark:text-gray-400">A WebMCP demo: tools live on the page, not on a server.</p>
    </div>
  </div>
  <ThemeToggle />
</header>
```
The right-side cluster ONLY contains `<ThemeToggle />` for Phase 1 (no settings/clear buttons — UI-SPEC §Copywriting: "There is no primary CTA in Phase 1").

### Workbench grid (4-col on lg+)
**Source:** `Summary.tsx:192` — `<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">`.
**Apply to:** the `Workbench` tab content inside `RecipeWorkbenchPage.tsx`. Picker takes `lg:col-span-1`, recipe view takes `lg:col-span-3`. UI-SPEC §Layout codifies this.
```tsx
<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
  <aside className="lg:col-span-1">
    {/* RecipePicker card */}
  </aside>
  <section className="lg:col-span-3 space-y-6">
    {/* RecipeHeader, IngredientsList, StepsList */}
  </section>
</div>
```

### Yellow alert banner
**Source:** `HomePage.tsx:68-82`. Used by `MissingFlagBanner.tsx`. Code-text inline pieces (`Browser:` / `Flag:` rows) reuse `HomePage.tsx:33-37` `CodeSnippet` class string.

### Error / loading copy
**Source:** UI-SPEC §Empty/fallback states + §Error states (no exact code analog — closest is `Summary.tsx:339` "Summary will appear here..." placeholder).
**Apply to:** the recipe view column while `loading === true`:
```tsx
{loading ? (
  <p className="text-gray-500 dark:text-gray-400">Loading your recipes…</p>
) : (
  /* RecipeHeader + IngredientsList + StepsList */
)}
```

### Feature detection (no helper — inline)
**Source:** RESEARCH §Pitfall 2 + UI-SPEC §Interaction Contract §Feature detection ("Single-line `if (!navigator.modelContext)` check at component-mount time. Don't wrap in a helper.").
**Apply to:** `RecipeWorkbenchPage.tsx` render branch:
```tsx
{!navigator.modelContext && <MissingFlagBanner />}
```

The `?` on `Navigator.modelContext` in `webmcp.d.ts` makes this narrow correctly — no `@ts-ignore` needed.

### `error instanceof Error ? error.message : 'Unknown error'` idiom
**Source:** `mcp/src/main.ts:219`, `mcp-client/src/main.ts:46`, `chat/src/app/components/ChatPage.tsx:115` (CONVENTIONS.md §Error Handling).
**Apply to:** any `console.error` inside the mount-time persistence load. Phase 1 logs to console only (UI-SPEC §Error states: "Couldn't load recipes from your browser's storage. Try reloading the page." is the visible copy if a yellow alert is added; the planner can decide to render this or just ship the `loading` placeholder).

### React 19 StrictMode safety
**Source:** RESEARCH §Pitfall 1.
**Apply to:** the seeding effect in `RecipeWorkbenchPage.tsx`. The `count > 0` guard inside `seedIfEmpty()` (defined above) handles double-invocation correctly. No additional React-level guard is needed.

### Naming
- Page component: `RecipeWorkbenchPage` (named export, matches `HomePage` precedent — `HomePage.tsx:39`). Sub-components in `RecipeWorkbench/` directory all named exports for parity.
- Service file: `RecipePersistence.ts` (deviates from `*Service.ts` suffix because it's not a Chrome-AI wrapper — the existing convention is "Chrome-AI service" specifically, per CONVENTIONS.md §Naming).
- Seed module: `recipeSeed.ts` (camelCase, matches `analytics.ts` precedent for pure-data modules).
- Ambient types: `webmcp.d.ts` (kebab-case lowercase, matches `dom-chromium-ai.d.ts` precedent).

### TypeScript strict mode discipline
**Source:** CLAUDE.md §"Code Style" + RESEARCH §Pitfall 4.
**Apply to:** every new file. Two specifically-allowed `any` uses, both in `webmcp.d.ts`:
- `execute: (input: any, ...) => Promise<unknown> | unknown` — spec-mandated dynamic input.
- `requestUserInteraction(callback: (...args: any[]) => any)` — spec-mandated.
Anywhere else `any` would appear, the answer is to add a proper type.

### JSDoc on exported helpers
**Source:** `SummaryService.ts:46-71` and across the four chat AI services (CONVENTIONS.md §Common Idioms).
**Apply to:** every exported function in `RecipePersistence.ts`. Skip JSDoc for sub-component files (existing components in `chat/src/app/components/` don't use JSDoc on the component declaration).

---

## No Analog Found

None. Every Phase 1 file has at least a role-match analog already in `chat/`. The pattern map above leaves no gaps that the planner has to fill from RESEARCH.md guesswork.

---

## Metadata

**Analog search scope:** `chat/src/app/components/`, `chat/src/app/services/`, `chat/src/app/hooks/`, `chat/src/app/types/`, `chat/src/app/config/`, `chat/scripts/`, `chat/src/global.d.ts`, `chat/tsconfig.app.json`, root `package.json`.

**Files read in full or in targeted ranges (no overlapping re-reads):**
- `.planning/phases/01-foundation-skeleton/01-RESEARCH.md` (full)
- `.planning/phases/01-foundation-skeleton/01-UI-SPEC.md` (full)
- `./CLAUDE.md` (full)
- `.planning/codebase/ARCHITECTURE.md` (full)
- `.planning/codebase/STRUCTURE.md` (full)
- `.planning/codebase/CONVENTIONS.md` (full)
- `chat/src/app/AppRouter.tsx` (full, 226 lines)
- `chat/src/app/components/Tabs.tsx` (full, 86 lines)
- `chat/src/app/components/Summary.tsx` (full, 355 lines)
- `chat/src/app/components/HomePage.tsx` (full, 290 lines)
- `chat/src/app/components/WriteRewritePage.tsx` (lines 180-300, segmented-button range)
- `chat/src/app/components/ThemeToggle.tsx` (full, 26 lines)
- `chat/src/app/services/SummaryService.ts` (full, 138 lines)
- `chat/src/app/types/dom-chromium-ai.d.ts` (full, 124 lines)
- `chat/src/app/hooks/useSEOData.ts` (full, 62 lines)
- `chat/src/global.d.ts` (full, 45 lines)
- `chat/scripts/prerender-react.js` (full, 452 lines)
- `chat/tsconfig.app.json` (full)
- `package.json` (full)

**Files NOT read (deliberately — would have been duplicate analogs):**
- `chat/src/app/components/ChatPage.tsx`, `ToolCallingPage.tsx`, `TranslatePage.tsx`, `WriteRewritePage.tsx` (lines 1-179, 300+) — `Summary.tsx` covers the page shell pattern; reading more demos would not change the analog assignment.
- `chat/src/app/services/{ChatAIService,TranslateService,WriterService}.ts` — `SummaryService.ts` covers the service template.
- `chat/src/app/context/{Theme,SEO}Context.tsx`, `chat/src/app/hooks/useGoogleAnalytics.ts` — usage patterns are visible from the consumer files (`Summary.tsx`, `AppRouter.tsx`, `HomePage.tsx`); no new file in Phase 1 modifies these contexts.

**Pattern extraction date:** 2026-04-26
