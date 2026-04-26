# Testing Patterns

**Analysis Date:** 2026-04-26

## Test Framework

**Runner:** Vitest 3.2.4 (`package.json:104`)
- UI: `@vitest/ui@3.2.4`
- Coverage provider: `@vitest/coverage-v8@3.2.4`
- Executed via Nx through the `@nx/vite/plugin` (`nx.json:14-22`) — the plugin auto-creates a `test` target for any project that has a `vite.config.ts` / `vitest.config.ts` with a `test:` block.

**Workspace discovery:** `vitest.workspace.ts`
```ts
export default ['**/*/vite.config.{ts,mts}', '**/*/vitest.config.{ts,mts}'];
```
Globs match every `vite.config.*` and `vitest.config.*` in the repo. Currently this resolves to:
- `chat/vite.config.ts`
- `devops/awsweb/vite.config.ts`

`mcp/`, `mcp-client/`, and `chrome-llm-ts/` have **no Vitest configuration** — they cannot run `vitest`.

**Assertion library / globals:** Vitest built-ins (no separate Chai/Jest assertion lib). Both Vite configs set `globals: true`, so `describe`, `it`, `expect`, `vi`, `beforeAll`, etc. are available without imports. The corresponding `tsconfig.spec.json` files include `"vitest/globals"` and `"vitest/importMeta"` in `types`.

**React testing tools available** (in `package.json` devDeps but not yet wired into any test): `@testing-library/react@16.3.0`, `jsdom@~22.1.0`, `@vitejs/plugin-react@5.0.2`.

**Playwright** (`@playwright/test@^1.36.0`) is configured at the workspace level via the `@nx/playwright/plugin` (`nx.json:25`) but no `playwright.config.*` exists yet.

**NestJS testing utilities**: `@nestjs/testing@^10.0.2` is in devDeps even though no NestJS service is currently part of the build — likely vestigial.

## Test Configuration Per Workspace

**`chat/vite.config.ts:41-48`**
```ts
test: {
  watch: false,
  globals: true,
  environment: 'jsdom',
  include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  reporters: ['default'],
  coverage: { reportsDirectory: '../coverage/chat', provider: 'v8' },
},
```

**`devops/awsweb/vite.config.ts:11-22`**
```ts
test: {
  watch: false,
  globals: true,
  environment: 'jsdom',
  include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  reporters: ['default'],
  coverage: {
    reportsDirectory: './test-output/vitest/coverage',
    provider: 'v8' as const,
  },
  passWithNoTests: true,
},
```

Differences worth knowing:
- `chat` does **not** set `passWithNoTests` → a `nx test chat` invocation today exits non-zero ("no tests found") because there are no test files yet.
- `devops/awsweb` writes coverage locally (`./test-output/vitest/coverage`); other workspaces write to `../coverage/<name>` at the repo root.

## Test File Location & Naming

**Location convention (configured but unused):**
- Tests live colocated with source under `src/**`.
- Pattern: `src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}` (set in both Vite configs and mirrored in `chat/tsconfig.spec.json:18-26` and `devops/awsweb/tsconfig.spec.json:14-26`).
- No `__tests__/` directories exist — `find . -type d -name "__tests__" -not -path "*/node_modules/*"` returns nothing. Prefer the colocated `*.test.ts(x)` form when adding new tests.

**Spec configs (TypeScript build setup for tests):**
- `chat/tsconfig.spec.json` — extends `chat/tsconfig.json`; `outDir: "../dist/out-tsc"`; types include `vitest/globals`, `vitest/importMeta`, `vite/client`, `node`, `vitest`, `@nx/react/typings/cssmodule.d.ts`, `@nx/react/typings/image.d.ts`.
- `devops/awsweb/tsconfig.spec.json` — same shape, omits the React typings.

**Application excludes:** `chat/tsconfig.app.json:11-25` excludes `src/**/*.{spec,test}.{ts,tsx,js,jsx}` and `vite.config.ts` / `vitest.config.ts` from the application build, so test files cannot leak into production bundles.

## Existing Tests

**There are zero unit/integration tests in the repository as of the analysis date.**

Confirmed by:
- `find . -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | grep -v node_modules` → no source matches.
- `find . -type d -name "__tests__" -not -path "*/node_modules/*"` → empty.

The only file with "test" in the name is **`mcp/src/test.ts`** — a manual demo runner (not Vitest):
```ts
// mcp/src/test.ts:10-55
async function runTests() {
  console.log('🧪 Testing Payment Service...\n');
  const users = await PaymentService.getAllUsers();
  // ... ad-hoc console.log assertions, no expect() calls
}
runTests().catch(console.error);
```
It is invoked as a node script (`#!/usr/bin/env node`), not through Vitest. Treat this as an integration smoke script, not a test suite. Do not model new tests on it.

There is also `mcp/test-with-inspector.sh` — a shell helper that launches the MCP Inspector against the built server, again not part of the Vitest pipeline.

## Mocking, Fixtures, and Setup Patterns

No mocks, no `vi.fn()` / `vi.mock()` calls, no `setup.ts`, no factories, no fixture files exist yet. When you add tests, **establish the conventions** — there is nothing to copy from. Recommended starting points based on the dependencies already installed:

- **DOM tests** for `chat`: `environment: 'jsdom'` is already set; use `@testing-library/react` for component tests.
- **Module mocks**: Vitest's built-in `vi.mock(path, factory)` — no `__mocks__/` convention exists.
- **Module-augmented globals**: components rely on `window.Summarizer`, `window.Writer`, `window.LanguageModel`, `window.Translator`, `window.gtag` (see `chat/src/app/services/*.ts`). Tests will need to stub these on `globalThis` / `window` in a setup file.
- **MCP services**: `PaymentService` and `PaymentMCPClient` carry mutable in-memory state (`mockUsers`, `transactionCounter`) at module scope (`mcp/src/services/paymentService.ts:24-33`, `mcp-client/src/services/paymentMCPClient.ts:29-42`). Reset state with `beforeEach` or `vi.resetModules()` to keep tests isolated.

## Coverage

- Provider: V8 (`@vitest/coverage-v8@3.2.4`).
- Output directories:
  - `chat` → `<repo-root>/coverage/chat` (relative `../coverage/chat` from `chat/`).
  - `devops/awsweb` → `devops/awsweb/test-output/vitest/coverage`, plus the Nx target `test` defines `reportsDirectory: ../../coverage/devops/awsweb` in `devops/awsweb/project.json:90-95` (the per-target option overrides the vite config).
- No coverage thresholds are configured.
- `.prettierignore` and `.gitignore` exclude `/coverage`.

## How to Run Tests

Nx is the entry point. Per-project commands (replace `<project>` with the project name from `project.json`):

```bash
# Single project
npx nx test chat
npx nx test awsweb           # name from devops/awsweb/project.json -> "@monorepo/awsweb" (project key is "awsweb")

# All projects with a test target
npx nx run-many -t test

# Watch mode (requires bypassing the configured `watch: false`)
npx nx test chat --watch=true
# Or invoke vitest directly inside the workspace
cd chat && npx vitest

# Coverage
npx nx test chat --coverage
# or:
cd chat && npx vitest --coverage
```

**Notes:**
- Today `npx nx test chat` will fail until either (a) at least one `*.test.ts(x)` exists or (b) `passWithNoTests: true` is added to `chat/vite.config.ts` (matching `devops/awsweb/vite.config.ts`).
- `mcp`, `mcp-client`, and `chrome-llm-ts` projects have no `test` target — `npx nx test mcp` is a no-op / error. Add a `vite.config.ts` (or `vitest.config.ts`) with a `test:` block to opt them in.
- The root `package.json:7` `"test"` script is the npm-init placeholder (`echo "Error: no test specified" && exit 1`) — do NOT use `npm test`.

## Test Types

**Unit tests:** Not present. Recommended scope when added: pure helpers in `chat/src/app/tools/`, the `chrome-llm-ts/src/lib/*` interface modules, and `PaymentService` static methods.

**Component tests:** Not present. The `chat/vite.config.ts` jsdom environment plus `@testing-library/react` is the intended path.

**Integration tests:** Not present. `mcp/src/test.ts` is the only ad-hoc integration check (manual, console-based).

**E2E tests:** Not present. `@nx/playwright/plugin` is registered in `nx.json:25`, but there is no `playwright.config.*`, no `e2e/` directory.

## Common Patterns (When You Add Them)

Because no precedent exists, these are recommendations consistent with the rest of the codebase:

**Async test pattern (services / Chrome AI wrappers):**
```ts
// chat/src/app/services/SummaryService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { summarizeText } from './SummaryService';

describe('summarizeText', () => {
  beforeEach(() => {
    (globalThis as any).Summarizer = {
      create: vi.fn().mockResolvedValue({
        summarize: vi.fn().mockResolvedValue('summary'),
        destroy: vi.fn(),
      }),
    };
  });

  it('returns summary text', async () => {
    await expect(summarizeText('hello')).resolves.toBe('summary');
  });
});
```

**Error testing pattern:** mirror the DOMException → Error mapping in `SummaryService.ts:58-69`:
```ts
it('rewrites QuotaExceededError as a friendly Error', async () => {
  const err = Object.assign(new DOMException('q', 'QuotaExceededError'), {
    requested: 100, quota: 50,
  });
  (globalThis as any).Summarizer.create = vi.fn().mockRejectedValue(err);
  await expect(summarizeText('x')).rejects.toThrow(/Input too large/);
});
```

**State reset for MCP services:** use `vi.resetModules()` between tests because `mockUsers` and `transactionCounter` are module-scoped mutable state.

---

*Testing analysis: 2026-04-26*
