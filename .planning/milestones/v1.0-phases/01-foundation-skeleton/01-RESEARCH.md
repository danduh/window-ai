# Phase 1: Foundation Skeleton — Research

**Researched:** 2026-04-26
**Domain:** WebMCP (`navigator.modelContext`), IndexedDB persistence, React 19 page integration into the existing `chat/` SPA
**Confidence:** HIGH (codebase patterns + Chrome 146 spec verified)

## Summary

This phase delivers a tracer-bullet vertical slice for the `/webmcp` Recipe Workbench: a new route renders a Tailwind/dark-mode page that reads recipes from IndexedDB, lets the user switch the active recipe, surfaces a non-blocking missing-flag banner when `navigator.modelContext` is undefined, and ships type-safe ambient declarations for the WebMCP API so Phase 2 can register tools without `any` casts. **No tool registration happens this phase** — only the surface area, types, persistence, and UI.

Three things matter most for planning. **First, the WebMCP TypeScript surface is small and stable enough to lock in.** The native API on Chrome 146 is `navigator.modelContext.registerTool({ name, description, inputSchema, execute })` plus `navigator.modelContext.provideContext(state)` — both verified against the Google Chrome Labs reference patterns and the W3C WebIDL [VERIFIED: Context7 /googlechromelabs/webmcp-tools]. Note that the spec uses `execute` (not `handler`), and tool unregistration is via `AbortSignal` passed in registration options — not a separate `unregisterTool()` method per the W3C IDL [CITED: webmachinelearning.github.io/webmcp/ §4.2]. Some community sources list `unregisterTool` and `clearContext` as Chrome-side conveniences [CITED: dev.to/ai-agent-economy webmcp-2026 article] — these are documented as `[ASSUMED]` below and worth treating as Phase-2-time additions.

**Second, the IndexedDB story is best served by `idb` (Jake Archibald's promise wrapper), not raw IndexedDB, and not `idb-keyval`.** The recipe data is structured (lists, queries by id, indexed iteration), which `idb-keyval`'s flat key/value model does not match. The raw IndexedDB API works but adds ~80 lines of event-callback boilerplate per CRUD path; `idb` (8.0.3, ~16kB unpacked, zero deps, full TypeScript types via `DBSchema` generic) is the lightest option that supports the schema-typed pattern the planner needs [VERIFIED: npm view idb].

**Third, this codebase has an established demo-page recipe — mirror it exactly, including the Tabs wrapper.** All five existing demos (`/chat`, `/tool-calling`, `/summary`, `/translate`, `/writer`) use the `Tabs` component (`chat/src/app/components/Tabs.tsx`) with two routes — one for documentation, one for the demo. The roadmap has `/webmcp` (Phase 1) and `/webmcp/docs` (Phase 3) which maps cleanly onto this pattern even though Phase 1 only ships the workbench tab. **Recommendation: ship the Tabs wrapper now with a single "Workbench" tab and a placeholder "Documentation" tab content (or omit the docs tab entirely until Phase 3) — discussed with options in §3.**

**Primary recommendation:** New page at `chat/src/app/components/RecipeWorkbenchPage.tsx`; persistence at `chat/src/app/services/RecipePersistence.ts` using `idb` ^8.0.3; ambient WebMCP types at `chat/src/app/types/webmcp.d.ts` (with optional later promotion to `chrome-llm-ts/src/lib/webmcp.ts`); route registered in `AppRouter.tsx`; nav links added to both desktop and mobile menus; SEO entry added to `seoConfigs`; prerender route appended to `chat/scripts/prerender-react.js`.

## Project Constraints (from CLAUDE.md)

CLAUDE.md is consumed verbatim into context. Directives the planner must honor:

- **TypeScript strict mode** — no `: any`, no `as any` at API boundaries (CLAUDE.md "Code Style"). The MCP-01 requirement reinforces this for the WebMCP surface.
- **Streaming AI responses use `ReadableStream<string>`** (CLAUDE.md "Code Style"). Not directly relevant to Phase 1 (no AI calls yet) but locks the Phase 2 contract.
- **Mirror the existing demo pattern** — `<Demo>Page.tsx` + `<Demo>Service.ts` + `<demo>.md` doc + `AppRouter` route + nav link + `useSEOData`/`SEOProvider`/`ThemeProvider` (CLAUDE.md "Existing Demo Page Pattern").
- **Native-only WebMCP** — no `@mcp-b/global` polyfill (CLAUDE.md "Important Constraints"). Banner explains the flag; rest of page must remain usable.
- **IndexedDB only** for recipe persistence. No backend (CLAUDE.md "Important Constraints").
- **Brownfield discipline** — don't touch `mcp/`, `mcp-client/`, `devops/awsweb/`. Don't refactor what isn't being touched (CLAUDE.md "Workflow conventions").
- **Each phase commits atomically** — Phase 1 lands as one cohesive commit (CLAUDE.md "Workflow conventions").
- **Definition of done = "2-min demo"** — not reference-quality, not production-polished (CLAUDE.md "Important Constraints"). Tests scope follows this — see §8.
- **YOLO mode + coarse granularity** — auto-approve gates and execute without per-step confirmation; phases are broad (1–3 plans each) (CLAUDE.md "Workflow conventions").

NO CONTEXT.md exists for this phase (discuss-phase was skipped). Plan from this research alone.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NAV-01 | `/webmcp` route registered in `chat/src/app/AppRouter.tsx` | §3 (page structure) + §5 (routing additions) |
| NAV-03 | Nav link to `/webmcp` in main nav alongside `/writer`/`/summary` | §5 (nav additions, desktop + mobile) |
| UI-01 | Render active recipe (title, servings, ingredients name+qty+unit, ordered steps), Tailwind + dark mode | §3 (workbench layout) + §4 (Recipe data model) |
| UI-02 | Missing-flag banner explaining Chrome 146 Canary + flag, rest of page usable | §3 (banner pattern) + §6 (feature detection) |
| UI-03 | Recipe picker switches active recipe with real-time UI update | §3 (picker affordance options) |
| DATA-01 | IndexedDB persistence; survives reloads | §2 (idb pattern) |
| DATA-02 | 1–2 sample recipes (pancakes, tomato pasta) seeded on first load | §2 (seed-on-empty) + §4 (data model) |
| DATA-03 | Typed persistence module: `getRecipes`/`getRecipe`/`saveRecipe`/`deleteRecipe` — single source of truth | §2 (RecipePersistence shape) |
| MCP-01 | TypeScript declarations for `navigator.modelContext`, `ModelContext`, `registerTool`, `provideContext`, tool descriptor — clean compile across `chat/`, no `any` at API surface | §1 (WebMCP surface) + §6 (augmentation pattern) |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `/webmcp` route mount | Browser (React Router) | — | SPA route registration; no SSR backend |
| Recipe rendering (UI-01) | Browser (React component) | — | Pure client render from IndexedDB-backed state |
| Recipe picker switching (UI-03) | Browser (React state) | Browser (IndexedDB) | `useState` for active id; persistence reads on mount |
| Missing-flag banner (UI-02) | Browser (React conditional render) | — | Feature detection on `navigator.modelContext` at mount |
| Recipe persistence (DATA-01..03) | Browser (IndexedDB via `idb`) | — | No backend; IndexedDB is the only store |
| First-load seeding (DATA-02) | Browser (run-once on mount) | Browser (IndexedDB) | Service module checks if store empty, writes seed records |
| WebMCP type declarations (MCP-01) | Build-time (TypeScript ambient `.d.ts`) | — | Pure type artefact; emits no runtime code |
| SEO metadata | Browser (SEOProvider effect) | Build-time (prerender) | Runtime via `useSEOData`; static via `prerender-react.js` |
| Nav link rendering | Browser (AppRouter chrome) | — | Plain `<Link>` additions |

All capabilities sit in the browser tier. There is no backend, no SSR server, no edge worker — this is a pure React SPA running on Chrome 146 Canary.

## Standard Stack

### Core (already in monorepo — reuse)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 19.1.1 | UI framework | Already pinned (`package.json:88-89`); all existing demos use it [VERIFIED: codebase] |
| react-router-dom | 6.27.0 | Routing | Already used in `chat/src/app/AppRouter.tsx` [VERIFIED: codebase] |
| tailwindcss | 3.4.3 | Styling | Already used by every demo page; `darkMode: 'class'` is configured (`chat/tailwind.config.js:13`) [VERIFIED: codebase] |
| chrome-llm-ts | 0.2.0 (workspace) | Chrome AI types | Path alias already wired (`tsconfig.base.json:18`); pattern for ambient interfaces [VERIFIED: codebase] |

### New (this phase introduces — recommended)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| idb | ^8.0.3 | Promise-based IndexedDB wrapper with TypeScript schema typing | Most-downloaded IDB wrapper on npm; zero deps; written by Jake Archibald (Chrome team); `DBSchema` generic delivers type-safe stores [VERIFIED: npm view idb — 8.0.3 published 2025-05-07; ISC licensed; deps:none] |

**Installation:**

```bash
npm install idb
```

**Verified version:** `idb@8.0.3` published 2025-05-07. ~83 KB unpacked, zero runtime deps, full TypeScript types ship in the package. Browser support: any browser with native IndexedDB (i.e., everything we care about) [VERIFIED: npm view idb 2026-04-26].

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `idb` (recommended) | Raw IndexedDB API | Saves a dep but adds ~80 lines of event-listener boilerplate per CRUD path. The cost of "no new dep" is fragility around `onupgradeneeded`, `onerror`, and transaction lifecycle. Counter-argument: `chat/` currently has zero persistence libs, so adding the first one sets a precedent worth reusing. |
| `idb` (recommended) | `idb-keyval@6.2.2` | `idb-keyval` is a flat key/value store with a single object store. Fine for "save the user's last theme", wrong for a recipe collection where you want structured records, an index by id, and the ability to add tags/categories later. Choosing it would force re-keying all access through string concatenation. |
| `idb` (recommended) | `rxdb@^15.39.0` (already declared in `package.json:31` but unused) | RxDB is a full reactive document database with schemas, plugins, replication. Massive overkill for two recipes; ~150 KB minified; a steep learning curve that the rest of the team would inherit. **Active anti-recommendation** — this declared-but-unused dep is a trap to avoid. Per CONCERNS.md it's listed as "no source file imports it" — don't be the one who lights it up for a 2-recipe seed. |
| `idb` (recommended) | `localforage` | Slightly larger, fallback to localStorage/WebSQL we don't need (Chrome 146 always has IDB), no first-class TypeScript schema typing. |

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Browser (Chrome 146 Canary)                       │
│                                                                         │
│   ┌─────────────────────────────┐                                       │
│   │  URL: /webmcp               │                                       │
│   │  Entry: chat/src/main.tsx   │                                       │
│   └──────────────┬──────────────┘                                       │
│                  │ React Router match                                   │
│                  ▼                                                      │
│   ┌─────────────────────────────┐                                       │
│   │  AppRouter.tsx              │  (new <Route path="/webmcp" .../>)    │
│   │  ThemeProvider wraps        │                                       │
│   └──────────────┬──────────────┘                                       │
│                  │                                                      │
│                  ▼                                                      │
│   ┌─────────────────────────────┐    on mount                           │
│   │  RecipeWorkbenchPage.tsx    │ ─────────────► useSEOData(seo, '/webmcp')
│   │  (new file)                 │                                       │
│   │                             │ ─── feature ──► if (!navigator.       │
│   │  • useState activeRecipeId  │     detect       modelContext) show   │
│   │  • useEffect → seed+load    │                  <MissingFlagBanner/> │
│   │                             │                                       │
│   │   ┌─────────────────────┐   │                                       │
│   │   │ Recipe picker       │   │                                       │
│   │   │ (dropdown / list)   │   │                                       │
│   │   └──────────┬──────────┘   │                                       │
│   │              │ onSelect     │                                       │
│   │              ▼              │                                       │
│   │   ┌─────────────────────┐   │                                       │
│   │   │ Recipe view         │   │                                       │
│   │   │ • title + servings  │   │                                       │
│   │   │ • ingredients list  │   │                                       │
│   │   │ • ordered steps     │   │                                       │
│   │   └─────────────────────┘   │                                       │
│   └──────────────┬──────────────┘                                       │
│                  │ getRecipes / getRecipe                               │
│                  ▼                                                      │
│   ┌─────────────────────────────┐                                       │
│   │  RecipePersistence.ts       │  (new file)                           │
│   │  • openRecipeDB()           │                                       │
│   │  • getRecipes()             │                                       │
│   │  • getRecipe(id)            │                                       │
│   │  • saveRecipe(r)            │                                       │
│   │  • deleteRecipe(id)         │                                       │
│   │  • seedIfEmpty()            │                                       │
│   └──────────────┬──────────────┘                                       │
│                  │ idb.openDB('window-ai-recipes', 1, {...})            │
│                  ▼                                                      │
│   ┌─────────────────────────────┐                                       │
│   │  IndexedDB                  │                                       │
│   │  DB: 'window-ai-recipes'    │                                       │
│   │  Store: 'recipes' (keyPath: │                                       │
│   │          'id', autoIncr off)│                                       │
│   └─────────────────────────────┘                                       │
│                                                                         │
│   ┌─────────────────────────────┐                                       │
│   │  webmcp.d.ts (ambient)      │  type-only — emits no runtime code    │
│   │  • Navigator.modelContext   │  consumed by tsc; available           │
│   │  • ModelContext interface   │  globally to all chat/* files         │
│   │  • ModelContextTool dict    │                                       │
│   │  • etc.                     │                                       │
│   └─────────────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
chat/src/app/
├── AppRouter.tsx                            # MODIFY: add /webmcp route + nav link
├── components/
│   └── RecipeWorkbenchPage.tsx              # NEW: page component (mirrors Summary.tsx layout)
├── services/
│   └── RecipePersistence.ts                 # NEW: idb wrapper exposing typed CRUD
├── types/
│   └── webmcp.d.ts                          # NEW: ambient declarations (Phase 1 location)
├── hooks/
│   └── useSEOData.ts                        # MODIFY: append `webmcp` entry to seoConfigs
└── docs/
    └── WebMCP-API.md                        # OPTIONAL Phase 1 placeholder, FULL in Phase 3
chat/scripts/
└── prerender-react.js                       # MODIFY: append { path: '/webmcp', filename: 'webmcp.html' }
```

### Pattern 1: Mirror the existing Demo + Tabs page shape

**What:** Every existing demo (`Summary.tsx`, `WriteRewritePage.tsx`, `TranslatePage.tsx`, `ChatPage.tsx`, `ToolCallingPage.tsx`) follows the same outer shape:

1. Function component named `<Domain>Page` (or just the domain name like `Summary`).
2. First call inside the body: `useSEOData(seoConfigs.<domain>, '/<domain>')`.
3. Second call: `useGoogleAnalytics()` for `trackUserInteraction`/`trackError`.
4. Outer wrapper: `<div className="min-h-screen bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors duration-200">`.
5. Inside: `<div className="max-w-6xl mx-auto p-4">`.
6. Header with icon + title + subtitle + ThemeToggle button (right side).
7. `<Tabs>` component (in 5/5 existing demos) with `defaultTab="docs"`, `basePath="/<domain>"`, and an array of `{ id, label, path, content }` entries.

**Phase 1 has UI-01..03 only — no chat panel, no tool registration.** Workbench content is the second tab.

**Source pattern from `chat/src/app/components/Summary.tsx:133-352`:**

```tsx
return (
  <div className="min-h-screen bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors duration-200">
    <div className="max-w-6xl mx-auto p-4">
      <header className="flex items-center justify-between mb-8">
        {/* icon + title + ThemeToggle */}
      </header>
      <Tabs
        defaultTab="docs"
        basePath="/summary"
        tabs={[
          { id: 'docs', label: 'API Documentation', path: '/summary-api-documentation', content: <DocsRenderer ... /> },
          { id: 'demo', label: 'Demo', path: '/summary-demo', content: <div className="grid ..."> ... </div> }
        ]}
      />
    </div>
  </div>
);
```

### Pattern 2: Augment `Navigator` instead of `Window`

**What:** All existing Chrome AI types augment `Window` (`window.Summarizer`, `window.Translator`, etc.). WebMCP is on **`navigator`**, not `window` — so the augmentation target is different.

**When to use:** Every place we'd normally write `interface Window { ... }`, write `interface Navigator { ... }` for WebMCP.

**Example (verified pattern from `chat/src/app/services/SummaryService.ts:31-44`):**

```ts
// chat/src/app/services/SummaryService.ts:31-44 (existing pattern — for reference)
declare global {
  interface Window {
    Summarizer: {
      create(options?: SummaryOptions): Promise<...>;
      availability(options?: SummaryOptions): Promise<AvailabilityStatus>;
    };
  }
}
```

WebMCP equivalent:

```ts
// chat/src/app/types/webmcp.d.ts (new)
declare global {
  interface Navigator {
    readonly modelContext?: ModelContext;
  }

  interface ModelContext {
    registerTool(tool: ModelContextTool, options?: ModelContextRegisterToolOptions): void;
    provideContext(context: object): void;
    // unregisterTool / clearContext: see Open Questions §7
  }

  interface ModelContextTool {
    name: string;
    description: string;
    inputSchema?: object;          // JSON Schema
    execute: (input: any, client?: ModelContextClient) => Promise<any> | any;
    title?: string;
    annotations?: ToolAnnotations;
  }

  interface ModelContextRegisterToolOptions {
    signal?: AbortSignal;
  }

  interface ToolAnnotations {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  }

  interface ModelContextClient {
    requestUserInteraction(callback: (...args: any[]) => any): Promise<any>;
  }
}

export {};
```

The `?` on `modelContext` is critical — `if (!navigator.modelContext)` becomes a typed feature detection that narrows correctly.

**Note on `any` for `execute` input/return:** WebIDL specifies `Promise<any> (object input, ModelContextClient client)` [CITED: webmachinelearning.github.io/webmcp/ §4.2.1]. The handler input genuinely is dynamic (driven by JSON Schema at runtime), so `any` is the spec-correct shape, NOT a type smell. Phase 2 task handlers can narrow per-tool with their own input types.

### Pattern 3: Page-scope IndexedDB module with `idb`

**What:** A single module owns the DB connection, schema, and CRUD. The page imports typed functions; never touches IndexedDB primitives directly.

**Example (uses `idb`'s `DBSchema` generic for full type-safety):**

```ts
// chat/src/app/services/RecipePersistence.ts (new)
import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;       // 'g' | 'ml' | 'cup' | 'tbsp' | 'tsp' | 'piece' — keep as string for now
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
    key: string;          // Recipe.id
    value: Recipe;
  };
}

const DB_NAME = 'window-ai-recipes';
const DB_VERSION = 1;
const STORE = 'recipes';

let dbPromise: Promise<IDBPDatabase<RecipeDB>> | null = null;

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

export const getRecipes = async (): Promise<Recipe[]> => {
  const db = await getDB();
  return db.getAll(STORE);
};

export const getRecipe = async (id: string): Promise<Recipe | undefined> => {
  const db = await getDB();
  return db.get(STORE, id);
};

export const saveRecipe = async (recipe: Recipe): Promise<void> => {
  const db = await getDB();
  await db.put(STORE, recipe);
};

export const deleteRecipe = async (id: string): Promise<void> => {
  const db = await getDB();
  await db.delete(STORE, id);
};

export const seedIfEmpty = async (seeds: Recipe[]): Promise<void> => {
  const db = await getDB();
  const count = await db.count(STORE);
  if (count > 0) return;
  const tx = db.transaction(STORE, 'readwrite');
  await Promise.all(seeds.map(r => tx.store.put(r)));
  await tx.done;
};
```

This shape satisfies DATA-01..03 and is consumable from both UI (Phase 1) and tool handlers (Phase 2) — single source of truth.

### Anti-Patterns to Avoid

- **Don't put recipe state in React `useState` only.** UI-03 requires updates to "reflect the active recipe in real time," but DATA-01 requires reload-survival. The persistence module must be the source of truth; React state mirrors it.
- **Don't auto-import `chat/src/app/types/webmcp.d.ts` from a `.tsx` file.** Ambient `.d.ts` files are picked up by `tsc` automatically when listed in `tsconfig.app.json` `include`. Importing them creates module-mode files and breaks ambient declarations.
- **Don't write directly to `dom-chromium-ai.d.ts`.** That file is for Chrome built-in AI; WebMCP is a separate spec with a separate lifecycle. Keep them in adjacent files for clean separation.
- **Don't seed inside a `useEffect` without an "already seeded" guard.** First-load seeding must be idempotent (use `count` or a sentinel record). React 19 StrictMode will run effects twice in dev — we already see this fail without a guard pattern.
- **Don't rebuild the navigation chrome.** AppRouter is 226 lines of working nav. The plan is two `<Link>` additions (desktop nav + mobile menu) and one `<Route>`. Period.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Promise-wrapped IndexedDB CRUD | Custom `openRequest.onsuccess`/`onerror` callback layer | `idb` library | Transactions, version upgrades, error mapping all solved; ~40 lines of business code instead of ~150 lines of IDB plumbing |
| TypeScript types for `navigator.modelContext` | Inferring from runtime probes | Ambient `.d.ts` augmenting `Navigator` (mirroring the SummaryService pattern) | `@types/webmcp` does not exist on npm yet [VERIFIED: `npm view @types/webmcp` 404]; the codebase has a clear precedent in `dom-chromium-ai.d.ts` |
| Recipe data validation | Hand-rolled `if (!recipe.title) ...` checks at every read site | Strict TypeScript types in `RecipePersistence.ts` + structural seeding only | The DoD is "2-min demo" — no malformed recipes can enter the store because only seed code writes them this phase. Phase 2 adds tool-driven writes; that's where validation libraries (zod) become worth considering. Out of scope here. |
| Feature-detection helper for `navigator.modelContext` | New tool function `isWebMCPSupported()` | Inline `if (!navigator.modelContext)` guard with optional `?.` typing | The check is one line; wrapping it in a helper hides it from grep and adds no value |
| Tab routing | A new `WebMCPTabs` component | The existing `chat/src/app/components/Tabs.tsx` | It's already used by 5 demos and handles `basePath` + URL-driven tab selection (`Tabs.tsx:34-42`) |

**Key insight:** The chat workspace is a *brownfield* monorepo demo site. New code belongs alongside existing code with the same shape. The temptation to "do this one cleaner than the others" is the trap. UI-01..03 + DATA-01..03 + MCP-01 + NAV-01/03 fit cleanly inside the established mold — every shortcut is one of the existing patterns.

## Runtime State Inventory

> Phase 1 introduces new browser-side persistence. This is rename-adjacent (we're naming a new IDB database for the first time), so the inventory is short but worth being explicit about.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None pre-existing — `window-ai-recipes` IndexedDB does not yet exist on any user's machine. First mount creates it. | Choose DB name carefully now — renaming later is a migration, not an edit. **Recommendation: `window-ai-recipes` v1, store `recipes`** |
| Live service config | None — no external service config tied to a string identifier | None |
| OS-registered state | None — pure browser SPA | None |
| Secrets/env vars | None new this phase | None |
| Build artifacts | `dist/chat/webmcp.html` will be added by `prerender-react.js` after the route is registered. `npm run build:seo` regenerates it. | None special; standard build cycle |

**Verified by:** No grep for `webmcp`, `RecipePersistence`, or `modelContext` against `chat/src` (would be empty — these are all new symbols).

## Common Pitfalls

### Pitfall 1: React 19 StrictMode double-invokes seeding effect
**What goes wrong:** `useEffect(() => { seedIfEmpty(...) }, [])` runs twice in dev. First call writes 2 recipes; second call also runs `seedIfEmpty` but the `count > 0` guard inside the persistence module prevents a duplicate write. **However**, if the seeding effect *also* sets the active recipe id via `setActiveRecipeId(seeds[0].id)`, two consecutive `setState` calls are fine — but if you instead call `await getRecipes()` and pick the first, you've now done two reads which both succeed. No correctness issue, just slightly wasteful in dev.
**Why it happens:** `chat/src/main.tsx:16` wraps the root in `<StrictMode>`. This is intentional and shouldn't be removed.
**How to avoid:** Make seeding idempotent inside `RecipePersistence.seedIfEmpty()` — use `db.count(STORE)` as the gate (shown in §3 Pattern 3). Don't rely on a React-level guard.
**Warning signs:** "I see two pancakes in DevTools → Application → IndexedDB after first load" — your seed function ran twice without the `count` guard.

### Pitfall 2: `navigator.modelContext` is `undefined`, not missing-property-access-throws
**What goes wrong:** Devs reach for `'modelContext' in navigator` because that's how some browser feature detection works. For `navigator.modelContext`, the property simply doesn't exist on browsers without the flag — `navigator.modelContext` returns `undefined` cleanly, no exception.
**Why it happens:** The W3C spec defines `modelContext` as a `[SecureContext]` IDL attribute on `Navigator`. On browsers that don't implement it, the property is absent.
**How to avoid:** Use the canonical pattern shown in every Google Chrome Labs example: `if (window.navigator.modelContext) { ... }` or simply `if (!navigator.modelContext) renderBanner()` [CITED: Context7 /googlechromelabs/webmcp-tools — pizza tools example]. The TypeScript declaration in §3 Pattern 2 marks `modelContext?: ModelContext` so this narrows correctly.
**Warning signs:** TypeScript complains "Property 'modelContext' does not exist on type 'Navigator'" — your `webmcp.d.ts` isn't being picked up; check `tsconfig.app.json` `include`.

### Pitfall 3: `navigator.modelContext` requires Secure Context
**What goes wrong:** Dev tries it on an `http://` origin or a custom `.test` domain, gets `undefined` even on Chrome 146 with the flag enabled.
**Why it happens:** The spec marks the attribute `[SecureContext]` [VERIFIED: webmachinelearning.github.io/webmcp/ §4.2]. Localhost (`http://localhost:4200`) is granted Secure Context status by Chrome's policy, so `nx serve chat` works. Anything else needs HTTPS.
**How to avoid:** This phase's demo runs at `http://localhost:4200` via `nx serve chat` — that's secure-context-eligible by default. Document this in the missing-flag banner copy: "Open this page on `localhost` or a Secure Context (HTTPS)."
**Warning signs:** "Works at localhost, broken at 192.168.x.x" — non-localhost IP without HTTPS is not a secure context.

### Pitfall 4: Accidentally tripping CONCERNS.md technical debt
**What goes wrong:** The roadmap says "type-safe, no `any` casts at the API surface" (MCP-01). The repo already has 21 `any` occurrences that ESLint doesn't catch (CONCERNS.md "any-typed surface"). It's tempting to slip in `as any` to satisfy a deadline.
**Why it happens:** Pressure + the codebase appears to permit it.
**How to avoid:** The new file `webmcp.d.ts` should NOT use `any` for any *named* type — only for `execute` input/return where the spec actually demands it. Add a code-review checklist: "Does the new file introduce `: any` or `as any`?"
**Warning signs:** A reviewer can grep `any` in the diff and find non-spec-mandated occurrences.

### Pitfall 5: Choosing the wrong active-recipe affordance
**What goes wrong:** Picker is implemented as a popover/modal because it "feels nicer," but that hides UI-03's "real-time update" behavior — the demo viewer can't see both the picker and the recipe at once.
**Why it happens:** Common UI inclination.
**How to avoid:** Pick a flat, always-visible affordance. Three options ranked by demo value below in §3 (page structure).
**Warning signs:** During the 2-min demo dry-run, you can't see "the picker changed" and "the rendered recipe changed" in the same screenshot.

### Pitfall 6: Not adding the route to `prerender-react.js`
**What goes wrong:** `npm run build:seo` regenerates static HTML but `/webmcp.html` is missing — search engines see only `/index.html` for the route, no per-route SEO.
**Why it happens:** The prerender script has its own `routes[]` array that mirrors `AppRouter` but is maintained separately (`chat/scripts/prerender-react.js:25-52`).
**How to avoid:** When you add a `<Route>` to `AppRouter.tsx`, also append `{ path: '/webmcp', filename: 'webmcp.html' }` to the prerender array.
**Warning signs:** Phase 1 verifier runs `npm run build:seo` and `dist/chat/` contains no `webmcp.html`.

### Pitfall 7: Mistaking the polyfill API for the native API
**What goes wrong:** Devs find `jasonjmcghee/webmcp` on Context7 (which ranks higher than the spec for keyword "webmcp") and copy the positional-args pattern: `mcp.registerTool(name, desc, schema, fn)`. The native Chrome 146 API takes a single object: `navigator.modelContext.registerTool({name, description, inputSchema, execute})`.
**Why it happens:** Search results conflate the polyfill and the native API. Both are public, both call themselves "WebMCP."
**How to avoid:** When in doubt, check that the example uses `navigator.modelContext.registerTool({` (single object arg). The W3C spec and Chrome Labs reference both use the object form [VERIFIED: Context7 /googlechromelabs/webmcp-tools].
**Warning signs:** Code calls `registerTool('name', 'description', schema, fn)` — that's the polyfill, not the native API. It will compile (because `webmcp.d.ts` types it as `(tool: ModelContextTool, options?)`), but the `'name'` string passed in place of the object will fail TypeScript anyway.

## Code Examples

### Verified WebMCP feature detection + (Phase-2-bound) registration pattern

Source: [VERIFIED: Context7 /googlechromelabs/webmcp-tools — pizza tools example, simplified]

```ts
// Phase 2 will use this pattern. Phase 1 only needs the `if (!navigator.modelContext)` half.
if (window.navigator.modelContext) {
  navigator.modelContext.registerTool({
    name: 'scaleRecipe',
    description: 'Scale the active recipe to a new servings count',
    inputSchema: {
      type: 'object',
      properties: {
        servings: { type: 'integer', minimum: 1, description: 'Target servings count' }
      },
      required: ['servings']
    },
    execute: async ({ servings }) => {
      // ... mutate recipe via RecipePersistence + setState
      return `Scaled to ${servings} servings`;
    }
  });
}
```

### Verified `idb` schema + open pattern

Source: [VERIFIED: github.com/jakearchibald/idb v8.0.3 README — `DBSchema` generic]

```ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface RecipeDB extends DBSchema {
  recipes: { key: string; value: Recipe };
}

const dbPromise = openDB<RecipeDB>('window-ai-recipes', 1, {
  upgrade(db) {
    db.createObjectStore('recipes', { keyPath: 'id' });
  },
});
```

### Verified existing-codebase ambient-augmentation pattern

Source: [VERIFIED: chat/src/app/services/SummaryService.ts:31-44]

```ts
declare global {
  interface Window {
    Summarizer: {
      create(options?: SummaryOptions): Promise<{ /* ... */ }>;
      availability(options?: SummaryOptions): Promise<AvailabilityStatus>;
    };
  }
}
```

Apply the same `declare global { interface Navigator { ... } }` shape to WebMCP — see §3 Pattern 2 for the full type set.

### Existing route + nav pattern to mirror

Source: [VERIFIED: chat/src/app/AppRouter.tsx:50-67 (desktop nav), :134-151 (mobile nav), :191-219 (routes)]

```tsx
// Desktop nav addition (insert near AppRouter.tsx:65-67, between Translate and Writer/Rewriter)
<Link to="/webmcp"
      onClick={() => trackUserInteraction('navigation_click', 'webmcp_link')}
      className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">WebMCP</Link>

// Mobile nav addition (insert near AppRouter.tsx:149-151)
<Link to="/webmcp"
      onClick={() => trackUserInteraction('navigation_click', 'webmcp_link_mobile')}
      className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200">WebMCP</Link>

// Route addition (insert near AppRouter.tsx:213-217 — adjacent Tabs-style demos)
<Route path="/webmcp" element={<RecipeWorkbenchPage/>}/>
{/* Phase 3 will add: <Route path="/webmcp/docs" element={<RecipeWorkbenchPage/>}/> */}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Page polyfills via `@mcp-b/global` to access tools | Native `navigator.modelContext` in Chrome 146 | Feb 2026 (Chrome 146 Canary; promoted to stable Mar 10, 2026) [CITED: dev.to/czmilo guide] | Demo can showcase the actual standard. Polyfill banned by milestone constraints. |
| Tools handler signature: positional args `(name, desc, schema, fn)` (jasonjmcghee polyfill) | Single object arg `{ name, description, inputSchema, execute }` (W3C spec + Chrome Labs reference) | Feb 2026 W3C draft | Match the native shape; ignore positional-args examples |
| `handler` as the callback property name | `execute` per W3C IDL §4.2.1 | W3C draft Feb 2026 | TypeScript declaration must use `execute`. Some older blog posts still say `handler` |
| Manual `unregisterTool(name)` | `AbortSignal` passed to `registerTool` (per W3C IDL) | W3C draft Feb 2026 | Phase 2 unmount cleanup uses `AbortController.abort()`, not a method call. Some Chrome implementations may also expose `unregisterTool` for convenience [ASSUMED] |

**Deprecated/outdated:**
- **Polyfill-style positional registration** — explicitly excluded from this milestone (no `@mcp-b/global`). Recipes in `Article_1.md` or older blog posts using positional args do not match the native API.
- **`handler` (vs `execute`)** — earlier WebMCP drafts used `handler`. The W3C draft Feb 2026 standardized on `execute` [VERIFIED: webmachinelearning.github.io/webmcp/ §4.2.1]. Use `execute`.
- **`@types/dom-chromium-ai`** — already in devDeps but does NOT cover WebMCP; only the existing Chrome AI surface (Summarizer, Translator, etc.). A new file is needed.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `unregisterTool(name)` and `clearContext()` exist as direct methods on `ModelContext` (Chrome 146 implementation) | §1 Summary, §3 Pattern 2 | LOW — Phase 1 doesn't call either; both are listed only in `webmcp.d.ts` for Phase 2 use. If they don't exist, drop them from the type file. The W3C spec only mandates `AbortSignal`-based unregistration. |
| A2 | `provideContext(state)` accepts a single arbitrary object — no schema constraint | §1, §3 Pattern 2 | LOW — verified in Google Chrome Labs reference [Context7]. If Chrome later requires a structured shape, the `object` type is broad enough to accept it. |
| A3 | The recipe data shape (id, title, servings, ingredients[name+qty+unit], steps[]) is sufficient for Phase 2's `scaleRecipe`/`swapIngredient`/`addIngredient`/`removeIngredient`/`generateShoppingList` tools | §4 (data model) | LOW-MEDIUM — Phase 2 needs only these fields. If Phase 2 needs `category`, `notes`, or per-ingredient `optional` flags, a v2 IndexedDB schema migration is straightforward (`db.createObjectStore` is in `upgrade` callback). Keep v1 minimal. |
| A4 | `Tabs` wrapper is the right Phase 1 shell even though only one tab exists | §3 (page structure options) | MEDIUM — see §3 for tradeoff: planner picks. |
| A5 | `unit: string` is sufficient (vs. enum) for ingredient units | §4 | LOW — strings make seeding simple; if Phase 2 needs validation, zod can be added then. |
| A6 | `provideContext` is implemented in Chrome 146 (not just in the spec) | §1 | MEDIUM — Chrome Labs reference includes it; Bug0 article lists it; per Wave-0 step the planner should add a Phase-2 task to verify with the Tool Inspector. Phase 1 doesn't call it. |
| A7 | `ModelContextClient` (the second parameter to `execute`) is implemented and useful in Chrome 146 | §3 Pattern 2 | LOW — typed as optional in `webmcp.d.ts`; Phase 1 doesn't use it. |

**Action for the planner:** A1, A4, A6 are the discussion items most worth flagging if they want a sanity check before locking. A2/A3/A5/A7 are LOW-impact and can ride forward.

## Open Questions

1. **Should `webmcp.d.ts` live in `chat/src/app/types/` or in `chrome-llm-ts/src/lib/webmcp.ts`?**
   - What we know: `chrome-llm-ts` is the established home for shared Chrome AI types and is published to npm. `chat/src/app/types/dom-chromium-ai.d.ts` is the local-only escape hatch.
   - What's unclear: Is WebMCP "shared enough" to warrant a publishable home? It's not a Chrome built-in AI API per se — it's a W3C standard.
   - Recommendation: **Phase 1: put it in `chat/src/app/types/webmcp.d.ts`** (lower friction; no library version bump; consistent with the local-only `dom-chromium-ai.d.ts` precedent). Promote to `chrome-llm-ts/src/lib/webmcp.ts` later if external consumers ask for it. Captures the "ship it now, generalize later" YOLO ethos.

2. **Should Phase 1 wire the Tabs wrapper or skip straight to a single workbench page?**
   - What we know: All 5 existing demos use Tabs. Phase 3 adds `/webmcp/docs`. Roadmap says NAV-02 (Phase 3) registers `/webmcp/docs` — could be a separate route or a tab.
   - What's unclear: Easier to add Tabs now (matches pattern) or later (less work this phase)?
   - Recommendation: **Wire the Tabs wrapper in Phase 1 with two tabs: `Workbench` (active) and `Docs` (placeholder content "Documentation coming in Phase 3").** This way Phase 3 only swaps the placeholder for `<DocsRenderer docFile="WebMCP-API.md" initOpen={true}/>`. Routing pattern: `/webmcp` → Workbench tab, `/webmcp/docs` → Docs tab — exactly mirrors `/summary/summary-demo` and `/summary/summary-api-documentation`. Costs ~10 lines now, saves a structural change later. **Alternative: ship a single-page workbench in Phase 1 and add Tabs in Phase 3.** This is also acceptable per the brownfield discipline — but Phase 3 then has more work. Planner's call.

3. **What does the missing-flag banner actually say?**
   - What we know: UI-02 requires Chrome 146+ Canary + `chrome://flags/#WebMCP for testing`. The rest of the page must remain usable.
   - What's unclear: Top-of-page banner vs. inline-above-recipe-card vs. corner toast?
   - Recommendation: **Top-of-page yellow alert banner inside the page container (NOT spanning the full viewport)** — mirrors the existing experimental-feature warning in `HomePage.tsx:68-82` which uses `bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800`. Banner copy: "WebMCP isn't enabled. The recipe browser still works, but tool registration requires Chrome 146+ Canary with `chrome://flags/#WebMCP` set to 'For testing'." Position it directly above the workbench, not over it — UI-02's "rest of the page remains usable" requires non-blocking.

4. **Is the recipe picker a `<select>` dropdown, a sidebar list, or segmented buttons?**
   - What we know: Only 1–2 recipes are seeded. Existing demos lean on `<select>` for simple choices (see `Summary.tsx:208-217`).
   - What's unclear: With 1–2 recipes, even buttons are fine.
   - Recommendation: **Segmented buttons** — visually shows both options at a glance, makes "switching active recipe" obvious during the 2-min demo (UI-03 success criterion). One row of 2 pill-shaped buttons with the active one filled in `primary-600`, others outlined. Costs ~15 lines vs. `<select>`'s ~8 lines but pays off in demo legibility. Fallback: `<select>` if the planner prioritizes line economy over demo polish.

5. **Are tests in scope for Phase 1?**
   - What we know: `nyquist_validation: false` in `.planning/config.json:11`; the repo currently has zero tests; CONCERNS.md flags "zero tests" as High severity.
   - What's unclear: Is "DoD = 2-min demo" hard enough to skip tests entirely?
   - Recommendation: **One smoke test per new module — `RecipePersistence.test.ts` (round-trip get/save/delete + seedIfEmpty idempotency) and `RecipeWorkbenchPage.test.tsx` (renders with 0/1/2 recipes + missing-flag banner branch).** ~3 tests total. The `chat/vite.config.ts` has the test runner configured but `passWithNoTests` is missing — add it OR add these tests. If the planner picks "no tests," they MUST add `passWithNoTests: true` to `chat/vite.config.ts:41-48` so `nx test chat` doesn't break. See §8 for full test strategy.

6. **Does `chat/vite.config.ts` need a fix to allow zero tests, or do we add tests?**
   - What we know: TESTING.md confirms `chat` does NOT have `passWithNoTests` set; running `nx test chat` today fails. CONCERNS.md flags this.
   - Recommendation: **Add tests AND `passWithNoTests` to be safe.** The first new test means we don't trip the existing breakage; `passWithNoTests` is a defense in depth.

7. **Should this phase commit `idb` to `package.json` only at the root, or also expose it through `chrome-llm-ts`?**
   - What we know: The chat app reads `package.json` at the root (single root manifest per `package.json` for the whole monorepo).
   - Recommendation: **Root `package.json` only.** Don't add it to `chrome-llm-ts/package.json` — `chrome-llm-ts` is published to npm and adding `idb` would force consumers to pull in a wrapper they don't need.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | nx serve / build | ✓ | already used by repo (>= 18) | — |
| npm | dependency install | ✓ | already used | — |
| Chrome 146+ Canary | Phase 1 *runtime testing* of `navigator.modelContext` (banner-on path is the same path either way) | UNKNOWN | — | The page works without it (banner branch); test on Chrome 145 stable to verify the banner appears |
| Chrome (any modern) | Phase 1 demo via `nx serve chat` | ✓ assumed | — | — |
| `idb` package | DATA-01..03 | ✗ (must be installed by Phase 1) | 8.0.3 | If `npm install idb` fails, fall back to raw IndexedDB (~150 lines extra in `RecipePersistence.ts`) |
| WebMCP Tool Inspector extension | Phase 2 verification (NOT Phase 1) | UNKNOWN | — | Phase 1 doesn't need it; Phase 2 will require it for MCP-05 |

**Missing dependencies with no fallback:** None for Phase 1.
**Missing dependencies with fallback:** Chrome 146+ Canary is the demo target but Phase 1 specifically tests both branches (with-flag and without-flag); developer can validate the missing-flag branch on any browser.

## Security Domain

> Required when `security_enforcement` is enabled. Config does not set it explicitly, so it's enabled by default. Phase 1 has minimal security surface — pure client-side code, no auth, no PII, no network.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth in Phase 1 |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | Single-user local browser app |
| V5 Input Validation | partial | Recipe data is seeded by static code; no user input flows in this phase. Phase 2 will need V5 for tool inputs (handled by JSON Schema in `inputSchema`) |
| V6 Cryptography | no | No secrets stored in IndexedDB |
| V7 Error Handling | yes | Persistence errors should not leak stack traces to the UI; mirror the existing `try/catch → friendly Error` pattern from `SummaryService.ts:53-71` |
| V8 Data Protection | partial | IndexedDB data is local-only and non-sensitive (recipes). No data classification needed. |
| V13 API & Web Service | no | No remote APIs |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IndexedDB schema downgrade attack (e.g., user opens an old tab while another has a newer schema) | Tampering | `idb`'s `upgrade(db, oldVersion, newVersion, transaction)` callback handles version bumps; Phase 1 starts at v1 — no migration risk yet |
| XSS via recipe content rendering | Tampering / Information Disclosure | React's default JSX escaping handles all string rendering; no `dangerouslySetInnerHTML` is required for Phase 1. **Don't introduce one.** |
| `navigator.modelContext` Secure Context bypass | Spoofing | None needed — Chrome enforces Secure Context at the platform level. Just test on `localhost` (which is secure-context-eligible). |
| Phase-2 tool handlers receive untrusted JSON Schema-validated inputs | Tampering | Out of scope this phase, but a note: validate `execute` inputs server-side (here: client-side at the persistence boundary). The W3C spec does NOT mandate runtime schema validation by the user agent — handlers must defend themselves. |

## Sources

### Primary (HIGH confidence)
- `chat/src/app/AppRouter.tsx`, `chat/src/app/components/{Summary,WriteRewritePage,TranslatePage,ChatPage,HomePage}.tsx`, `chat/src/app/components/Tabs.tsx`, `chat/src/app/hooks/useSEOData.ts`, `chat/src/app/context/{Theme,SEO}Context.tsx`, `chat/src/app/services/SummaryService.ts`, `chat/src/global.d.ts`, `chat/src/app/types/dom-chromium-ai.d.ts`, `chat/scripts/prerender-react.js`, `chat/vite.config.ts` — all read directly from disk
- `.planning/codebase/{ARCHITECTURE,STRUCTURE,CONVENTIONS,STACK,TESTING,INTEGRATIONS,CONCERNS}.md` — read directly
- `.planning/{PROJECT,REQUIREMENTS,ROADMAP,STATE}.md` — read directly
- W3C WebMCP draft IDL — fetched from https://webmachinelearning.github.io/webmcp/ via WebFetch
- Context7 `/googlechromelabs/webmcp-tools` — fetched via `npx ctx7 docs` (3 times: registerTool TypeScript example, pizza tools example, AGENTS.md provideContext example)
- `npm view idb` and `npm view idb-keyval` — verified versions and metadata
- `npm view @types/webmcp` and `npm view @webmcp/types` — both 404 (verified neither exists)

### Secondary (MEDIUM confidence)
- WebSearch query "navigator.modelContext Chrome 146 Canary WebMCP flag 2026" — multiple corroborating sources confirm Chrome 146 + flag name + Feb 10 2026 launch + Mar 10 2026 stable promotion
- Context7 `/jasonjmcghee/webmcp` — confirms the polyfill version's API differs from native (positional args + `mcp.registerTool` instead of `navigator.modelContext.registerTool`)

### Tertiary (LOW confidence — flagged in Assumptions Log)
- Listing `unregisterTool` and `clearContext` as direct methods (A1) — appears in [dev.to/ai-agent-economy article] but NOT in W3C IDL §4.2; W3C only specifies `AbortSignal`-based unregistration. Phase-2 task: verify against actual Chrome 146 implementation via the Tool Inspector before relying on these.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `idb` version + metadata verified directly via npm; existing codebase libs read from `package.json` and `.planning/codebase/STACK.md`
- Architecture: HIGH — every existing pattern read directly from source files with line numbers
- Pitfalls: HIGH — derived from CONCERNS.md (existing repo failure modes) plus Chrome 146 Secure Context spec
- WebMCP type surface: HIGH for `registerTool`/`provideContext`/`AbortSignal`-unregister; MEDIUM for `unregisterTool`/`clearContext` (assumed convenience methods, not in W3C IDL)

**Research date:** 2026-04-26
**Valid until:** 2026-05-26 (30 days for stable Chrome AI / W3C draft surface) — but Chrome 146 stable was promoted only Mar 10, 2026, so the WebMCP API surface itself may shift; re-verify before Phase 2 kickoff

## RESEARCH COMPLETE
