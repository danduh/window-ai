# Coding Conventions

**Analysis Date:** 2026-04-26

## Lint & Format Configuration

**ESLint (flat config, ESLint 9):**
- Root base: `eslint.base.config.js` — composes `@nx/eslint-plugin` flat presets (`flat/base`, `flat/typescript`, `flat/javascript`).
- Root extension: `eslint.config.js` — extends `eslint.base.config.js`, ignores `**/dist`, `**/vite.config.*.timestamp*`, `**/vitest.config.*.timestamp*`.
- Per-workspace overrides:
  - `chat/eslint.config.js` — adds `@nx/eslint-plugin` `flat/react` rules.
  - `chrome-llm-ts/eslint.config.js` — adds `@nx/dependency-checks` (error level) for `**/*.json`, parser `jsonc-eslint-parser`.
  - `devops/awsweb/eslint.config.mjs` — adds `@nx/dependency-checks` (warn level) with extra ignored files (`vite.config.*`).
- Module boundary rule (enforced everywhere):
  ```js
  '@nx/enforce-module-boundaries': ['error', {
    enforceBuildableLibDependency: true,
    allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?js$'],
    depConstraints: [{ sourceTag: '*', onlyDependOnLibsWithTags: ['*'] }],
  }],
  ```
- Custom rules block (`rules: {}`) is empty in every workspace — projects rely on Nx defaults plus the boundary check; no extra naming/style rules are codified.
- ESLint dependencies in `package.json`: `eslint@^9.8.0`, `eslint-config-prettier@10.1.8`, `eslint-plugin-import@2.31.0`, `eslint-plugin-jsx-a11y@6.10.1`, `eslint-plugin-react@^7.37.5`, `eslint-plugin-react-hooks@^5.2.0`, `typescript-eslint@8.42.0`.

**Prettier:**
- Config: `.prettierrc`
  ```json
  { "singleQuote": true }
  ```
- Single setting: prefer single quotes. All other defaults (2-space indent, semicolons, trailing comma `es5`, 80-col width) come from Prettier 3 defaults.
- Ignore: `.prettierignore` excludes `/dist`, `/coverage`, `/.nx/cache`, `/.nx/workspace-data`.

**Observed reality vs. config:**
- Code uses single quotes most of the time but many string literals use double quotes (e.g. `chat/src/app/services/SummaryService.ts:55` uses `"QuotaExceededError"`). Prettier has not been run repo-wide; running it would normalize quotes.
- Some files use 2-space indentation (most files), but indentation/whitespace is inconsistent.
- Spaces inside braces vary: `import {useState} from 'react'` (e.g. `chat/src/main.tsx:1`) vs `import { useState } from 'react'` (e.g. `chat/src/app/components/HomePage.tsx:1`). No `bracketSpacing` override is set, so Prettier defaults to spaces.

## TypeScript Configuration

**Base:** `tsconfig.base.json`
- `target: es2015`, `module: esnext`, `moduleResolution: node`, `lib: ["es2020", "dom"]`.
- `experimentalDecorators: true`, `emitDecoratorMetadata: true`, `importHelpers: true`.
- `baseUrl: "."` with single path alias: `"chrome-llm-ts": ["chrome-llm-ts/src/index.ts"]`.
- `sourceMap: true`, `declaration: false`, `skipLibCheck: true`.

**Per-workspace strictness:**
- `chat/tsconfig.json` — `strict: true`, `jsx: "react-jsx"`, `allowJs: false`, `allowSyntheticDefaultImports: true`, `esModuleInterop: false`.
- `chrome-llm-ts/tsconfig.json` — `strict: true` plus `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`, `forceConsistentCasingInFileNames`. (Strictest in the repo — apply this template when adding new libraries.)
- `mcp/tsconfig.json`, `mcp-client/tsconfig.json` — only override `esModuleInterop: true`; rely on base settings (no `strict` override → strict NOT explicitly enabled).
- Spec configs (e.g. `chat/tsconfig.spec.json`, `devops/awsweb/tsconfig.spec.json`) include `vitest/globals`, `vitest/importMeta`, `vite/client`, `node`, `vitest` types.

## Naming Patterns

**Files:**
- Services: `PascalCase` + `Service.ts` suffix — `chat/src/app/services/ChatAIService.ts`, `chat/src/app/services/SummaryService.ts`, `chat/src/app/services/TranslateService.ts`, `chat/src/app/services/WriterService.ts`, `chat/src/app/services/GoogleAnalyticsService.ts`, `mcp/src/services/paymentService.ts` (note: lowercase `payment` in mcp), `mcp-client/src/services/paymentMCPClient.ts`.
- React components: `PascalCase.tsx` — `chat/src/app/components/ChatPage.tsx`, `chat/src/app/components/HomePage.tsx`, `chat/src/app/components/Tabs.tsx`, `chat/src/app/components/ThemeToggle.tsx`.
- Hooks: `camelCase` starting with `use` — `chat/src/app/hooks/useSEOData.ts`, `chat/src/app/hooks/useGoogleAnalytics.ts`.
- Contexts: `PascalCase` + `Context.tsx` — `chat/src/app/context/ThemeContext.tsx`, `chat/src/app/context/SEOContext.tsx`.
- Library modules (chrome-llm-ts): `lowercase` single-word — `chrome-llm-ts/src/lib/global.ts`, `chrome-llm-ts/src/lib/interfaces.ts`, `chrome-llm-ts/src/lib/summary.ts`, `chrome-llm-ts/src/lib/translation.ts`, `chrome-llm-ts/src/lib/writer.ts`, `chrome-llm-ts/src/lib/mockStreamService.ts` (mixed: one camelCase outlier).
- Config/utility helpers (chat): `camelCase.ts` — `chat/src/app/tools/isCanary.ts`, `chat/src/app/tools/md-loader.ts` (kebab-case outlier), `chat/src/app/config/analytics.ts`.
- Tests: would be `*.test.ts` / `*.spec.ts` per `chat/tsconfig.spec.json` patterns. No tests currently exist (see TESTING.md).

**Symbols:**
- Functions: `camelCase` — e.g. `summarizeText`, `writeText`, `rewriteText`, `detectAndTranslate`, `zeroShot`, `getModelCapabilities` (`chat/src/app/services/ChatAIService.ts:12`).
- React components: `PascalCase` — `ChatPage`, `HomePage`, `APISection` (`chat/src/app/components/HomePage.tsx:6`), `Tabs`.
- Hooks: `useCamelCase` — `useSEOData`, `useGoogleAnalytics`, `useTheme` (`chat/src/app/context/ThemeContext.tsx:12`).
- Classes: `PascalCase` — `PaymentService` (`mcp/src/services/paymentService.ts:35`), `PaymentMCPClient` (`mcp-client/src/services/paymentMCPClient.ts:39`), `PaymentCLI` (`mcp-client/src/cli.ts:7`), `GoogleAnalyticsService` (`chat/src/app/services/GoogleAnalyticsService.ts:25`).
- Interfaces / types: `PascalCase`, no `I`-prefix — `SummaryOptions`, `WriterOptions`, `RewriterOptions`, `TransferResult`, `BalanceValidationResult`, `Message`, `Tab`.
- Enums: `PascalCase` with `PascalCase` members — `AIModelAvailability` (`chrome-llm-ts/src/lib/interfaces.ts` legacy types), `AISummarizerType`.
- Variables/locals: `camelCase` — `mockUsers`, `transactionCounter`, `messageIdCounter`.
- Constants: occasional `SCREAMING_SNAKE_CASE` — `WEBSITES`, `COMMON_CONFIG` (`devops/awsweb/src/main.ts:4`), `ANALYTICS_CONFIG` (`chat/src/app/config/analytics.ts`), `GA_MEASUREMENT_ID` (`chat/src/app/services/GoogleAnalyticsService.ts:26` — `private readonly` field). Most singletons exported as `googleAnalytics` (`camelCase`, `GoogleAnalyticsService.ts:174`).

**Be aware:** there is no enforced linter rule for naming. The above are conventions — follow them, but the codebase will accept anything.

## Import / Module Patterns

**ES module style:** all source uses `import`/`export` (TypeScript `module: esnext`).

**Compiled output style varies:**
- `chat` is a Vite-bundled SPA → ESM imports.
- `mcp` and `mcp-client` build with `@nx/esbuild:esbuild` → CJS output (`format: ['cjs']`), so internal imports add the `.js` extension to be Node-resolvable: `import { PaymentService } from './services/paymentService.js';` (`mcp/src/main.ts:8`, `mcp-client/src/main.ts:2`, `mcp-client/src/cli.ts:3`). This is mandatory for Node-targeted workspaces.
- `chrome-llm-ts` is `"type": "commonjs"` (`chrome-llm-ts/package.json:8`) — built with `@nx/js:tsc`. Source imports do not add `.js`.

**Barrel files:**
- `chrome-llm-ts/src/index.ts` is the package barrel:
  ```ts
  export * from './lib/interfaces';
  export * from './lib/mockStreamService';
  export * from './lib/summary'
  export * from './lib/translation'
  export * from './lib/writer'
  export * from './lib/global'
  ```
  (Inconsistent semicolons within a single file — preserve the surrounding style when editing.)
- `chat` does not use barrels — components/services import each other by direct path (e.g. `import {getModelCapabilities, zeroShot} from '../services/ChatAIService';` in `chat/src/app/components/ChatPage.tsx:9`).

**Path aliases:**
- Only `chrome-llm-ts` is aliased (`tsconfig.base.json:18`). Cross-workspace consumers import via the alias: `import { TranslationLanguageOptions } from "chrome-llm-ts";` (`chat/src/app/services/TranslateService.ts:1`).
- Vite resolves the alias via `@nx/vite/plugins/nx-tsconfig-paths.plugin` (see `chat/vite.config.ts:3`).

**Quote / spacing inconsistencies in imports:**
- Mixed double and single quotes — `import ChatBox from './ChatBox';` (`chat/src/app/components/ChatPage.tsx:5`) vs `import { Server } from '@modelcontextprotocol/sdk/server/index.js';` (`mcp/src/main.ts:1`) vs `import {DocsRenderer} from "../tools/DocsRenderer";` (double quotes, `chat/src/app/components/ChatPage.tsx:10`).
- Treat single quotes as canonical (Prettier `.prettierrc`); convert when touching a file.

**Side-effect-free entry style:**
- React entry: `chat/src/main.tsx` calls `ReactDOM.createRoot(...).render(...)` at module top level.
- Node entries: wrapped in `async function main()` and invoked at bottom — `mcp/src/main.ts:230-240`, `mcp-client/src/main.ts:178-206`.

## Error Handling Patterns

**Wrapped DOMException → Error pattern (Chrome AI services):** The four chat AI services (`ChatAIService.ts`, `SummaryService.ts`, `WriterService.ts`, `TranslateService.ts`) all share the same shape — try the call, catch `DOMException`, rethrow as a friendly `Error`:
```ts
// chat/src/app/services/SummaryService.ts:53-71
try {
  const summarizer = await window.Summarizer.create(options);
  const result = await summarizer.summarize(text, { signal: options?.signal });
  summarizer.destroy();
  return result;
} catch (error) {
  if (error instanceof DOMException) {
    if (error.name === "QuotaExceededError") {
      const quotaError = error as QuotaExceededError;
      throw new Error(`Input too large! Requested: ${quotaError.requested}, Quota: ${quotaError.quota}`);
    } else if (error.name === "NotSupportedError") {
      throw new Error("Summarization with these options is not supported");
    } else if (error.name === "AbortError") {
      throw new Error("Summarization was aborted");
    }
  }
  throw error;
}
```
When adding a new Chrome AI wrapper, mirror this exact try/catch shape and the four error names.

**Result-object pattern (MCP services):** Server/business code returns a discriminated result object instead of throwing:
```ts
// mcp/src/services/paymentService.ts:40-65
async validateUserBalance(userId, requiredAmount): Promise<BalanceValidationResult> {
  const user = mockUsers.find(u => u.id === userId);
  if (!user) {
    return { isValid: false, currentBalance: 0, requiredAmount, message: `User with ID ${userId} not found` };
  }
  // ...
}
```
The MCP server (`mcp/src/main.ts:212-226`) only catches errors at the outermost dispatch boundary and shapes them into the MCP `isError: true` response.

**Express error handling (mcp-client):** Each route handler uses an inner `try/catch`:
```ts
// mcp-client/src/main.ts:39-50
app.get('/users', async (req, res) => {
  try {
    const users = await mcpClient.listAllUsers();
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
```
A 4-arg fallback middleware logs `Unhandled error` (`mcp-client/src/main.ts:156-162`).

**React component error handling:** Per-async-call try/catch with user-facing fallback message:
```ts
// chat/src/app/components/ChatPage.tsx:100-124
try {
  const response = await zeroShot(text, useStream, systemMsg, destroy);
  // ...
} catch (error) {
  console.error('Error getting AI response:', error);
  trackError('chat_error', { error: error instanceof Error ? error.message : 'Unknown error', ... });
  addMessage('Sorry, I encountered an error. Please try again.', 'Bot');
} finally {
  setIsLoading(false);
}
```

**`error instanceof Error ? error.message : 'Unknown error'` idiom** appears in every Express route, the MCP server (`mcp/src/main.ts:219`), and `ChatPage.tsx:115`. Reuse it verbatim when narrowing `unknown` errors.

**Process-level handlers (Node entry points):**
- Both `mcp/src/main.ts:237` and `mcp-client/src/main.ts:200` wrap top-level startup in `.catch((error) => { console.error(...); process.exit(1); })`.
- `mcp-client/src/main.ts:165-175` registers `SIGINT` and `SIGTERM` for graceful shutdown.

## Logging

- No logging library — uses `console.log`, `console.error`, `console.warn` directly.
- Logs are emoji-prefixed for human scanning: `🏦`, `🔌`, `✅`, `❌`, `📋`, `💸`, `🎮`, `🛑` (e.g. `mcp/src/main.ts:233`, `mcp-client/src/main.ts:180-197`).
- MCP server is restricted to **`console.error`** for runtime logs because stdout is reserved for the MCP protocol (`mcp/src/main.ts:233-234`). Never use `console.log` inside MCP server handlers.
- The chat app introduces a `GoogleAnalyticsService` (`chat/src/app/services/GoogleAnalyticsService.ts`) for product telemetry, with a `DEBUG`-mode console fallback (line 50, 80).

## Async Patterns

- `async`/`await` everywhere — no `.then()`/`.catch()` chains in business code (one exception: top-level `.catch` on `main()` invocations and `cli.start().catch(...)` in `mcp-client/src/cli.ts:176`; and one `useEffect` chain in `chat/src/app/components/ChatPage.tsx:44`).
- `Promise<ReadableStream<string>>` is the streaming contract for AI calls (e.g. `summarizeTextStreaming`, `writeTextStreaming`, `translateStreaming`, `zeroShot`).
- `AbortSignal` is threaded through option objects (`signal?: AbortSignal` in `SummaryOptions`, `WriterOptions`, `TranslationOptions`, `LanguageDetectionOptions`).
- Artificial delays in mock services use `await new Promise(resolve => setTimeout(resolve, ms))` (`mcp/src/services/paymentService.ts:42`, `:72`, `:134`, `:142`; same in `mcp-client/src/services/paymentMCPClient.ts`).

## React Patterns

- **Functional components with `React.FC<Props>`** typing — e.g. `const ChatPage: React.FC = () => { ... }` (`chat/src/app/components/ChatPage.tsx:23`), `const Tabs: React.FC<TabsProps> = ({ tabs, defaultTab, basePath = '' }) => { ... }` (`chat/src/app/components/Tabs.tsx:17`).
- **Default exports for components**: `export default ChatPage;` (`chat/src/app/components/ChatPage.tsx:310`). Named exports for hooks, services, contexts, and the `HomePage` outlier (`chat/src/app/components/HomePage.tsx:39`).
- **Inline `useState` typing**: `useState<string>('')`, `useState<Message[]>([])` (`chat/src/app/components/ChatPage.tsx:27-29`).
- **Refs**: `useRef<number>(0)` for mutable counters (`chat/src/app/components/ChatPage.tsx:41`).
- **Context pattern**: `createContext<ContextType | undefined>(undefined)` + custom hook that throws if used outside provider (`chat/src/app/context/ThemeContext.tsx:10-18`):
  ```ts
  export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
  };
  ```
- **Tailwind for styling** — `darkMode: 'class'` (`chat/tailwind.config.js:13`), custom `primary` color scale, `transition-colors duration-200` boilerplate on most interactive elements.
- **JSX inline SVGs** are used heavily instead of an icon library (see most components in `chat/src/app/components/`).

## Common Idioms

- **Singleton service**: `export const googleAnalytics = new GoogleAnalyticsService();` plus default export of the class (`chat/src/app/services/GoogleAnalyticsService.ts:174-175`).
- **Static class for stateless service operations**: `PaymentService` exposes only `static async` methods (`mcp/src/services/paymentService.ts:35-145`).
- **Event-emitter base class**: `PaymentMCPClient extends EventEmitter` and emits `'connected'` / `'disconnected'` (`mcp-client/src/services/paymentMCPClient.ts:39`).
- **Module-augmented `Window` interface** for Chrome AI surfaces — every AI service redeclares `interface Window` to add the new global (`chat/src/app/services/SummaryService.ts:31-44`, `WriterService.ts:43-67`, `TranslateService.ts:5-16`).
- **JSDoc on exported helpers**: every exported function in the four chat AI services and `PaymentService` has a one-line `/** ... */`. Add JSDoc when extending these files.
- **`@deprecated` legacy compatibility shims** at the bottom of each AI service: e.g. `getSummaryAI` (`SummaryService.ts:127`), `writeAI` and `reWriteAI` (`WriterService.ts:200, 226`), `canTranslate` (`TranslateService.ts:167`). Keep the pattern when removing/renaming public exports.
- **`type` aliases for string unions**: `AvailabilityStatus = "unavailable" | "downloadable" | "downloading" | "available"` is duplicated across three service files. When adding similar unions, prefer importing from `chrome-llm-ts` if the type exists there.

## Comments

- Section dividers in interface files: `// AI Interface`, `// Language Model Factory` (`chrome-llm-ts/src/lib/interfaces.ts:6, 17`).
- TODO/HACK comments are absent — none found in `src/**`.
- `debugger` statement left in production code at `chat/src/app/services/ChatAIService.ts:22` — this is technical debt (see CONCERNS.md).
- Block comments document non-obvious behavior: `// Mock user database` (`paymentService.ts:23`), `// Simulate async operation` (`:42`), `// Use this to deploy your own sandbox environment` (`devops/awsweb/src/main.ts:13`).

## Environment / Configuration

- Env access via direct `process.env.X` reads (`mcp-client/src/main.ts:4-5`, `devops/awsweb/src/main.ts:16`). No central config loader.
- `Number(process.env.PORT)` and `?? 'localhost'` defaults — `mcp-client/src/main.ts:4-5`.

## Where to Add New Code

- New chat React component → `chat/src/app/components/<Name>.tsx`, default export, register a route in `chat/src/app/AppRouter.tsx`.
- New chat hook → `chat/src/app/hooks/use<Name>.ts`, named export.
- New chat service (Chrome AI wrapper) → `chat/src/app/services/<Name>Service.ts`, follow the SummaryService/WriterService template (interfaces at top, `declare global { interface Window { ... } }`, exported `async` helpers with the DOMException try/catch).
- New shared interface for Chrome AI APIs → add to `chrome-llm-ts/src/lib/<topic>.ts` and re-export from `chrome-llm-ts/src/index.ts`.
- New MCP tool → register in the `tools` array and `switch` block in `mcp/src/main.ts`; add the implementation as a `static async` method on `PaymentService` (or a sibling service) in `mcp/src/services/`.
- New Express route in mcp-client → wrap the handler body in try/catch, return `{ success, ... }` JSON, mirror the existing handlers in `mcp-client/src/main.ts`.
- New CDK stack → `devops/awsweb/src/stacks/<name>.ts`, instantiate from `devops/awsweb/src/main.ts`.

---

*Convention analysis: 2026-04-26*
