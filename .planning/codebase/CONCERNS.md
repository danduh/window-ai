# Codebase Concerns

**Analysis Date:** 2026-04-26
**Branch analyzed:** `feature/mcp-preview`

This document catalogues technical debt, dangerous patterns, build hygiene issues, and gaps observed in the window-ai monorepo (Nx workspace with `chat`, `chrome-llm-ts`, `mcp`, `mcp-client`, `devops/awsweb`, `packages/aws-infra`).

Issues are ordered by **severity (high → medium → low)** within each category.

---

## Tech Debt

### High

**Forgotten `debugger` statement in shipped code path:**
- File: `chat/src/app/services/ChatAIService.ts:22`
- Issue: A bare `debugger` statement sits inside `zeroShot()`, the main entry point used by `ChatPage`. Any user with DevTools open will hit a debugger pause on every chat call.
- Files: `chat/src/app/services/ChatAIService.ts:22`
- Impact: Broken UX in dev/canary builds; signals that the file was last edited mid-investigation and never cleaned up.
- Fix approach: Remove the line; add an ESLint `no-debugger` rule (currently nothing enforces it — see "Linting too lax" below).

**Duplicated mock data + business logic between MCP server and client:**
- Files: `mcp/src/services/paymentService.ts:24-32` and `mcp-client/src/services/paymentMCPClient.ts:29-37,42`
- Issue: The five-user `mockUsers` array, transfer counter, and `validateUserBalance` / `makeTransfer` logic are copy-pasted across the server and the "client". The client never actually talks to the MCP server — `connect()` simulates a connection (`mcp-client/src/services/paymentMCPClient.ts:55-66`) and operations run against the local copy.
- Impact: Mutations on either side diverge silently. The client's REST endpoints (`/transfer`, `/validate-balance`) report state that does not reflect the MCP server. The whole MCP demo is a stub pretending to be an integration.
- Fix approach: Wire `PaymentMCPClient` to the real `@modelcontextprotocol/sdk` `Client` with a `StdioClientTransport`, delete the duplicated mock array, and remove the `simulate connection` branch.

**`@deprecated` API surface left in shipping library:**
- Files: `chat/src/app/services/TranslateService.ts:165`, `chat/src/app/services/WriterService.ts:198`, `chat/src/app/services/WriterService.ts:224`, `chat/src/app/services/SummaryService.ts:125`, `chrome-llm-ts/src/lib/interfaces.ts:75`
- Issue: Five `@deprecated` shims (legacy `getSummaryAI`, `getWriterAI`, `getRewriterAI`, `getTranslationAI`, `systemPrompt`) are still exported and reachable.
- Impact: Encourages new callers to bind to deprecated functions; doubles the API surface that has to be tested.
- Fix approach: Inline call sites, then delete the deprecated functions in a follow-up phase.

### Medium

**Stub/empty service path in `mcp-client`:**
- File: `mcp-client/src/services/paymentMCPClient.ts:55-66`
- Issue: Comment says `In a real implementation, this would use the MCP SDK`. The MCP SDK is already a dependency of the workspace.
- Fix approach: Replace the simulation with a real `Client` + `StdioClientTransport` from `@modelcontextprotocol/sdk`.

**Placeholder production domain in build artifacts:**
- Files: `chat/scripts/prerender.js:97`, `chat/scripts/prerender-react.js:428` (note: the same script writes the canonical `https://windowai.danduh.me` baseUrl in `chat/scripts/prerender-react.js:381` for the sitemap)
- Issue: `robots.txt` generation hardcodes `https://your-domain.com/window-ai` for the prod sitemap URL while the sitemap itself uses the real domain. The two files end up disagreeing on the production host.
- Impact: SEO breakage — search crawlers reading `robots.txt` will get a non-existent sitemap URL.
- Fix approach: Use `https://windowai.danduh.me` consistently or read from a single config constant.

**Dual prerender scripts duplicating logic:**
- Files: `chat/scripts/prerender.js` (5,545 bytes), `chat/scripts/prerender-react.js` (17,426 bytes)
- Issue: Two prerender entry points coexist; only `prerender-react.js` is wired into `package.json` (`prerender:chat`). The older `prerender.js` is dead.
- Fix approach: Delete `chat/scripts/prerender.js` or document why both exist.

**Inconsistent MCP SDK version pinning:**
- Files: `package.json:19`, `package-lock.json:317,5920`
- Issue: Root manifest declares `^1.12.1`. Lock resolves `1.17.5`. A nested resolution still pins `^1.11.3`. Drift between the two clients of the SDK is possible.
- Fix approach: Pin a single version, run `npm install`, commit a fresh lockfile.

**Service file with typo in filename:**
- File: `chat/src/app/services/TexToSpeachService.ts`
- Issue: Filename is misspelled (`TexToSpeach` → should be `TextToSpeech`). Imports across the codebase will need to follow the typo forever otherwise.
- Fix approach: Rename file + update imports (currently it has no importers — also a smell, see "Dead code").

### Low

**Long single-file React components ripe for extraction:**
- `chat/src/app/components/WriteRewritePage.tsx` — 594 lines
- `chat/src/app/components/ToolCallingPage.tsx` — 496 lines
- `chat/src/app/components/Summary.tsx` — 355 lines
- `chat/src/app/components/ChatPage.tsx` — 310 lines
- `chat/src/app/components/TranslatePage.tsx` — 297 lines
- `chat/src/app/components/HomePage.tsx` — 290 lines
- `chat/src/app/AppRouter.tsx` — 226 lines
- Issue: All page-level components mix data fetching, tool registry, settings UI, JSX, and analytics in a single file. No co-located unit tests exist.
- Fix approach: Extract sub-components, lift schema/tool registry into a separate module, move analytics calls into a hook.

**Duplicated DOM Chromium AI types:**
- Files: `chat/src/global.d.ts`, `chat/src/app/types/dom-chromium-ai.d.ts`, `chrome-llm-ts/src/lib/interfaces.ts`
- Issue: Three definitions of `LanguageModel` / `Summarizer` / `Writer` / `Translator` exist in parallel with subtly different shapes (e.g., `chrome-llm-ts/src/lib/interfaces.ts:34-54` defines `AILanguageModel` with `maxTokens`/`tokensSoFar` while `chat/src/global.d.ts:13-37` defines a `LanguageModel` class with `inputUsage`/`inputQuota`). The dev-dependency `@types/dom-chromium-ai` is also installed but apparently unused.
- Fix approach: Adopt `@types/dom-chromium-ai` as the single source of truth and delete the local re-declarations.

**Article_1.md dropped at repo root:**
- File: `Article_1.md`
- Issue: 13KB unsigned blog draft sitting at the workspace root, untracked.
- Fix approach: Move to a `docs/` or `articles/` directory and either commit or `.gitignore` deliberately.

---

## Known Bugs

### High

**`isChromeCanary` will throw if user-agent does not match expected pattern:**
- File: `chat/src/app/tools/isCanary.ts:6`
- Code:
  ```ts
  // @ts-ignore
  return userAgent.includes("Chrome") && parseInt(userAgent.match(/Chrome\/(\d+)/)[1], 10) > 132;
  ```
- Issue: `userAgent.match(...)` returns `null` for any non-Chrome browser. Indexing `[1]` then crashes the page. The `@ts-ignore` masks this from the TS compiler.
- Impact: Any Firefox/Safari visitor hits a runtime exception during module init (`isChromeCanary()` is called at module scope in `chat/src/app/components/ChatPage.tsx:21`).
- Fix approach: Guard against `null`, e.g. `const m = userAgent.match(/Chrome\/(\d+)/); return !!m && parseInt(m[1], 10) > 132;`

**Self-transfer logic order bug in payment service:**
- File: `mcp/src/services/paymentService.ts:67-100` (and the duplicated `mcp-client/src/services/paymentMCPClient.ts`)
- Issue: `makeTransfer` checks balance before checking self-transfer / non-positive amount. Therefore a `self-transfer of 0` returns "Cannot transfer money to yourself" even though balance is irrelevant; conversely an attempt with negative amount gets past the balance check (`fromUser.balance >= negative` is always true) only to be caught later — but the validations after the `>= 0` balance check would short-circuit only if the balance check passed first. The ordering is wrong even if no incorrect output reaches the user today.
- Fix approach: Validate `amount > 0`, recipient existence, and self-transfer **before** balance check.

### Medium

**Build script rewrites `dist/` then commits it back to git:**
- Files: `dist/chat/index copy.html`, `dist/.DS_Store`, all hashed bundles in `dist/chat/`
- Issue: `dist` is in `.gitignore` (line 91 of `.gitignore`) yet 38 build artefacts and a `index copy.html` (Finder duplication) are committed under `dist/`.
- Impact: Repo bloat, merge conflicts on every build, sensitive leaks if a future build embeds tokens. `index copy.html` strongly suggests a manual `cp` left over from debugging.
- Fix approach: `git rm -r --cached dist`, regenerate via `npm run build:seo`.

### Low

**`inIframe` URL parameter parsed via `JSON.parse`:**
- File: `chat/src/app/AppRouter.tsx:18-22`
- Issue: `JSON.parse(searchParams.get('inIframe'))` only catches errors via the surrounding `try/catch`. Acceptable today but the use of `JSON.parse` on user input is fragile — any string like `"{nonsense}"` is silently downgraded to `false`.
- Fix approach: Use a strict comparison: `searchParams.get('inIframe') === 'true'`.

---

## Security Considerations

### High

**`eval()` of user-controlled string in production tool:**
- File: `chat/src/app/components/ToolCallingPage.tsx:92`
- Code:
  ```ts
  const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
  const result = eval(sanitized);
  ```
- Issue: The `calculateMath` tool sanitises but still calls `eval()` on a string that an LLM (or directly the user via the test harness in `ToolCallingPage.tsx:257-262`) supplies. The regex only filters character classes — strings like `"(()(()(()))" ` or `"1/0"` pass through and execute. Arbitrary numeric expressions can still cause prototype pollution / DoS via expensive integer arithmetic.
- Impact: `eval` is flagged by every CSP and code-scanner. If this app is embedded in an iframe (it supports `?inIframe=true`), the eval expands the host's attack surface.
- Fix approach: Replace with a real expression evaluator (e.g., `mathjs.evaluate` with a restricted scope) or refuse non-trivial expressions. Add CSP headers via CloudFront (`chat/cloudfront-config.json`) to forbid `unsafe-eval`.

**Hardcoded Google Analytics measurement ID committed to source:**
- Files: `chat/src/app/config/analytics.ts:4`, `chat/GOOGLE_ANALYTICS_README.md:7,23,28,119`, `chat/src/index.html` (likely)
- Issue: `G-ZC3N8B4VGB` is checked in. Although the GA tag is public-by-design, exposing it without an env var means anyone can spam the property with synthetic traffic from staging/preview branches.
- Impact: Inflated metrics; no easy way to swap to a staging GA property.
- Fix approach: Read from `import.meta.env.VITE_GA_MEASUREMENT_ID` and add a `.env.example`.

**`isInitialized` retry loop never bounds:**
- File: `chat/src/app/services/GoogleAnalyticsService.ts:38-44`
- Issue: `checkInitialization()` recursively schedules itself every 100 ms forever if `window.gtag` never appears (e.g., ad-blockers).
- Impact: Memory + CPU leak in user tabs running with ad-blockers.
- Fix approach: Cap retries (e.g., 50 attempts ≈ 5 s) and log once.

### Medium

**Express error handler types argument as `any`:**
- File: `mcp-client/src/main.ts:156`
- Code: `app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {`
- Issue: Stripping the type means `err.message` access is unchecked.
- Fix approach: Type as `unknown` and narrow.

**No auth on payment REST API:**
- File: `mcp-client/src/main.ts:39-115`
- Issue: `/users`, `/transfer`, `/validate-balance` are exposed without any auth. The README presents this as a "demo" but the binary is built and runnable in `dist/mcp-client/` (also committed — see "build hygiene").
- Fix approach: Document the demo-only nature loudly in `mcp-client/README.md`, do not bind `0.0.0.0`, and gate behind an env-controlled API key.

**Console-monkey-patching in `/demo` endpoint:**
- File: `mcp-client/src/main.ts:120-145`
- Issue: The `/demo` handler globally replaces `console.log` to capture output, then restores it. If two requests overlap, captures collide and one request will leak its logs into another's response.
- Fix approach: Pass a logger through `runDemo(logger)` instead.

### Low

**`.env` example missing:**
- Files: none. `.env*` is properly listed in `.gitignore` (lines 32-36) and no `.env*` files are committed. Good — but there is also no `.env.example`/`.env.sample` to document required vars (`CDK_DEFAULT_ACCOUNT`, `DEPLOY_SITE`, `HOST`, `PORT`, `NODE_ENV`).
- Fix approach: Add `.env.example` at the relevant package roots.

---

## Performance Bottlenecks

### Medium

**`text-to-speech` model downloaded on every call:**
- File: `chat/src/app/services/TexToSpeachService.ts:5-12`
- Issue: `pipeline("text-to-speech", "Xenova/speecht5_tts", {quantized: false})` is invoked inside `talkToMe`, so every TTS request re-instantiates the pipeline (and the >100 MB model load on first call). `quantized: false` requests the heavier non-quantised weights.
- Impact: Unusable latency on cold call; 200+ MB download.
- Fix approach: Memoise the `synthesizer` promise at module scope; default to `quantized: true`.

**`zeroShot` recreates / destroys the language-model session on every call:**
- File: `chat/src/app/services/ChatAIService.ts:14-21`
- Issue: When `destroy=true` (default), every prompt call destroys the previous session and creates a new one, throwing away conversational context the user expected to keep.
- Impact: Each prompt pays the session-creation latency (~100 ms+ on Chrome canary) and discards system prompt history.
- Fix approach: Default `destroy=false`; expose a `clearChat` action that deliberately resets.

### Low

**Synchronous `fs.readFileSync` / `writeFileSync` in build scripts:**
- Files: `chat/scripts/prerender-react.js:73,92,421,436`, `chat/scripts/prerender.js:36,48`, `chat/scripts/validate-seo.js:25,39,40,81,82,102,103`
- Issue: Acceptable for build-time scripts but slows down CI as routes grow. If `prerender-react.js` is parallelised, the sync calls become bottlenecks.
- Fix approach: Switch to `fs.promises` and `Promise.all` over the `routes` array.

---

## Fragile Areas

### High

**Module-scoped `let session: any = null;` global state in chat service:**
- File: `chat/src/app/services/ChatAIService.ts:1`
- Issue: A mutable module-level `session` is shared across all consumers and across React Strict Mode double-invocation. Race conditions during streaming (`promptStreaming` returning while another caller resets `session`) will throw "destroyed" errors that surface as cryptic UI failures.
- Fix approach: Encapsulate in a class instance owned by `ChatPage`, or use a React context.

**Untyped tool registry in `ToolCallingPage`:**
- File: `chat/src/app/components/ToolCallingPage.tsx:14-19`
- Issue: `Tool.inputSchema: any`, `execute: (...args: any[]) => Promise<string>`. The schema is not validated at runtime against the LLM-supplied arguments. A malformed `args` payload from the model lands directly in `execute`.
- Fix approach: Type the schema (use `JSONSchema7`) and validate args with `ajv` before invoking `execute`.

### Medium

**`any`-typed surface in chat workspace (21 occurrences):**
- Files: `chat/src/global.d.ts:18,19,27,28,35`, `chat/src/app/components/ToolCallingPage.tsx:18,257`, `chat/src/app/services/ChatAIService.ts:1,24`, `chat/src/app/services/GoogleAnalyticsService.ts:6`, `chat/src/app/types/dom-chromium-ai.d.ts:29,54-67`, `chat/src/app/tools/DocsRenderer.tsx:48`, `mcp-client/src/main.ts:156`
- Issue: Strict mode is enabled in `chat/tsconfig.json:7` but ambient `.d.ts` files keep escape hatches. The two main service classes (`ChatAIService`, `GoogleAnalyticsService`) leak `any` into call sites.
- Fix approach: Replace `any` with proper Chromium AI types from `@types/dom-chromium-ai`; use `unknown` for the GA `gtag` config.

**Single `@ts-ignore` to mask runtime null-deref:**
- File: `chat/src/app/tools/isCanary.ts:5`
- (See Known Bugs — High.)

**Custom Vite markdown loader with `console.log` side-effect:**
- File: `chat/vite.config.ts:14-22`
- Issue: A custom plugin transforms `*.md` files into JS strings and logs every file path. The same job is also done by the webpack `raw-loader` config (`chat/webpack.config.js:10-15`) — two loaders, two formats.
- Fix approach: Pick one (Vite is wired up via `npm run build:chat`) and remove the webpack rule (or vice-versa).

### Low

**Multiple build systems coexist:**
- Files: `chat/vite.config.ts`, `chat/webpack.config.js`
- Issue: Both Vite and webpack configs exist for the chat project. `package.json` runs `nx build chat` which uses Vite, but the webpack file remains and is referenced by `nxCopyAssetsPlugin`-style legacy paths. New developers will be unsure which is canonical.
- Fix approach: Delete the unused config and remove the matching Nx executor entry.

---

## Build / Dev Hygiene

### High

**`dist/` is committed despite being in `.gitignore`:**
- Evidence: `git ls-files dist` returns 38 files including `dist/.DS_Store`, `dist/chat/index copy.html`, all minified bundles.
- File reference: `.gitignore:91` (`dist`)
- Impact: 1.9 MB of churn on every build; merge conflicts on hashed bundle filenames; `index copy.html` (a Finder duplicate, ~21 KB) leaked.
- Fix approach: `git rm -r --cached dist` and clean up the `index copy.html` artefact.

**`.DS_Store` files committed:**
- Files: `.DS_Store` (root, tracked per `git ls-files`), `chat/.DS_Store` (untracked, in git status), `dist/.DS_Store` (tracked)
- Fix approach: `git rm --cached .DS_Store dist/.DS_Store`, add `.DS_Store` to `.gitignore` (currently absent), and ignore `**/.DS_Store`.

**Stale Cursor/feature branches accumulating in remote:**
- Branches present: `cursor/optimize-chat-app-for-seo-with-pre-rendering-35dd`, `cursor/pre-render-chat-app-for-seo-21f0`, `cursor/implement-google-analytics-for-chat-app-1f6e`, `feature/aws`, `feature/rag`, `feature/react-19`, `feature/upgrade`, `devoxx`, `extantion` (sic), `seo`, `feat/nx-cloud/setup`. The active branch is `feature/mcp-preview`.
- Impact: Confusing for new contributors; some branches presumably already merged into `main`.
- Fix approach: Audit branches against `main`, delete merged ones with `git push origin --delete`.

### Medium

**Committed `tmp/` artefact:**
- File: `tmp/mcp/main-with-require-overrides.js`
- Issue: A 2025-09 build artefact tracked under `tmp/` (a path conventionally untracked). The file is not in `.gitignore` because `.gitignore` tracks `dist` not `tmp`.
- Fix approach: `git rm tmp/mcp/main-with-require-overrides.js` and add `tmp/` to `.gitignore`.

**Large committed lockfile (1.3 MB):**
- File: `package-lock.json` (1,323,108 bytes)
- Issue: Expected for a polyrepo with 50+ Nx packages, but lockfile churn dominates PR diffs. Combined with the inconsistent SDK version pinning above, history is noisy.
- Fix approach: Keep the lockfile but commit-message-policy "lockfile bumps" separately so review tools can collapse them.

**Untracked files in working tree (per `git status`):**
- `Article_1.md`, `.cursorignore`, `.github/copilot-instructions.md`, `chat/.DS_Store`
- Fix approach: Either `git add` the docs that belong (`.github/copilot-instructions.md`, `.cursorignore`) or `.gitignore` them. Always ignore `.DS_Store`.

**`.cursorignore` is a single-line stub:**
- File: `.cursorignore`
- Issue: Contains only a comment line (no actual patterns). Probably auto-generated and forgotten.
- Fix approach: Either populate with `dist/`, `tmp/`, `*.md`, `package-lock.json`, etc., or delete.

**Modelfiles committed at workspace root:**
- Files: `apple.Modelfile`, `appleAgr.Modelfile`, `function.Modelfile`, `functionphi.Modelfile`, `functionphi-interactive.Modelfile`, `s.Modelfile`, `sysPrompts.txt`
- Issue: Six Ollama `Modelfile`s and a `sysPrompts.txt` live in the repo root with no documentation explaining which app uses them.
- Fix approach: Move into a `modelfiles/` directory with a README, or remove if obsolete.

### Low

**Two large markdown docs at root (~80 KB combined):**
- Files: `LLM.md` (48,736 bytes), `WRITER_ASSISTANCE.md` (32,268 bytes), `TRANSALTIO_API.md` (26,253 bytes — note typo "TRANSALTIO" → "TRANSLATION")
- Fix approach: Move to `docs/` and rename `TRANSALTIO_API.md` → `TRANSLATION_API.md`.

**Empty `.cursorignore` plus committed `.idea/`, `.vscode/` directories despite `.gitignore` listing them (lines 113, 116):**
- Issue: `.idea/` and `.vscode/` are tracked even though `.gitignore` says to ignore them.
- Fix approach: `git rm -r --cached .idea .vscode` (after confirming with the team).

---

## Linting & Type Hygiene

### Medium

**Lint config has effectively no rules of its own:**
- Files: `eslint.config.js:23-26`, `eslint.base.config.js:31-34`
- Issue: Both files end with `rules: {}`. The only rule actively configured is `@nx/enforce-module-boundaries`. There is no `no-debugger`, no `no-eval`, no `@typescript-eslint/no-explicit-any`, no `react-hooks/exhaustive-deps`. That is consistent with the `debugger` and `eval` issues going unflagged.
- Fix approach: Adopt the recommended `@typescript-eslint/recommended` and `eslint-plugin-react-hooks/recommended` configs, plus `no-eval` and `no-debugger` as errors.

**No `prettier` rule integration with ESLint:**
- File: `.prettierrc` (26 bytes)
- Issue: Prettier exists but has no integration with ESLint (no `eslint-config-prettier` reference in either eslint config). `eslint-config-prettier` is installed but unused.
- Fix approach: Add `...require('eslint-config-prettier')` to the flat config.

---

## Test Coverage Gaps

### High

**The repo contains zero tests:**
- Evidence: `find . -name '*.test.*' -o -name '*.spec.*'` (excluding node_modules/dist) returns nothing.
- Files: All workspaces (`chat/src`, `chrome-llm-ts/src`, `mcp/src`, `mcp-client/src`, `devops/awsweb/src`, `packages/aws-infra`).
- Issue: `package.json:7` has `"test": "echo \"Error: no test specified\" && exit 1"`. Vitest, Jest, jsdom, `@testing-library/react`, `@nestjs/testing`, `@playwright/test` are all installed but unused. `chat/tsconfig.spec.json` exists but excludes everything because there are no `*.spec.tsx` files.
- Risk: No safety net for the eval/deprecated-API/session-state issues above. Refactors are scary.
- Priority: High.
- Fix approach: Start with one Vitest test per service (`SummaryService`, `WriterService`, `TranslateService`) using mocked `window.Summarizer`. Add a Playwright smoke test for `/chat`, `/translate`, `/summary`, `/writer`, `/tool-calling`.

**Dead `mcp/src/test.ts` masquerading as a test:**
- File: `mcp/src/test.ts`
- Issue: Imperative driver script (`PaymentService.getAllUsers()` etc.), not a test runnable by Vitest. Easy to mistake for coverage.
- Fix approach: Move to `mcp/src/scripts/demo.ts` or delete.

---

## Documentation Gaps

### Medium

**Top-level `README.md` is 4 lines:**
- File: `README.md` (95 bytes)
- Content:
  ```
  # window-ai
  Demo for window.ai API
  ### [Demo Application](https://danduh.github.io/window-ai/)
  ```
- Issue: No mention of the Nx monorepo structure, no build/run/test instructions, no description of the `mcp/`, `mcp-client/`, `chrome-llm-ts/` workspaces, no contribution guide.
- Fix approach: Document workspace layout, add `npm run build:chat`, `npm run build:seo`, `nx graph`, and link to the per-package READMEs.

**`devops/awsweb/README.md` references `TODO`:**
- File: `devops/awsweb/README.md:199`
- Content: `- [Infra reference docs](TODO)`
- Fix approach: Replace with the real link or remove.

### Low

**Inconsistent doc capitalisation / typos:**
- `TRANSALTIO_API.md` (root) — typo
- `chat/SEO_README.md`, `chat/GOOGLE_ANALYTICS_README.md` — uppercase mid-name where most of the repo uses kebab-case
- Fix approach: Normalise to kebab-case under `docs/`.

---

## Deprecated / Outdated Dependencies

### Medium

**`@types/node` pinned to a major behind:**
- File: `package.json:50`
- Pin: `"@types/node": "18.16.9"` while `tsconfig.base.json:11` targets `es2015` and lib `es2020,dom`. Node 18 is in maintenance.
- Fix approach: Bump to `@types/node@^20` matching modern runtimes.

**`@swc-node/register: ~1.9.1` and `@swc/core: ~1.5.7` lag behind Nx 21.x:**
- File: `package.json:39-40`
- Fix approach: Allow Nx upgrade scripts to bump these.

**`reflect-metadata: ^0.1.13`:**
- File: `package.json:31`
- Issue: NestJS 11 (`@nestjs/schematics: 11.0.7`) requires `reflect-metadata >= 0.2`. The mismatch indicates Nest is installed but not actually used at runtime.
- Fix approach: Remove `@nestjs/*` if unused; otherwise update `reflect-metadata`.

### Low

**Verdaccio committed as devDependency:**
- File: `package.json:99`
- Issue: `verdaccio: 6.1.6`. Useful for an Nx publish workflow, but no `.verdaccio/` config exists in the repo (it is gitignored). Suggests dead dep.
- Fix approach: Confirm whether the publish flow is in use; remove if not.

---

## Dead / Unused Code

**No importer for `chat/src/app/services/TexToSpeachService.ts`:**
- File: `chat/src/app/services/TexToSpeachService.ts`
- Evidence: `grep -rn "TexToSpeachService\|talkToMe"` returns only the file itself.
- Fix approach: Either wire up the TTS feature in a UI or delete the file (saves the `@xenova/transformers` dependency too).

**`chrome-llm-ts/src/lib/mockStreamService.ts` (19 lines) — unused export:**
- File: `chrome-llm-ts/src/lib/mockStreamService.ts`
- Fix approach: Verify there are no consumers and delete.

**`packages/aws-infra/` is empty:**
- File: `packages/aws-infra/eslint.config.mjs` is the only file.
- Fix approach: Delete the directory or move the future infra in.

---

## Summary by Severity

**High-impact items to address first:**
1. Remove `eval()` in `chat/src/app/components/ToolCallingPage.tsx:92`.
2. Delete the `debugger` statement in `chat/src/app/services/ChatAIService.ts:22`.
3. Fix the runtime crash in `chat/src/app/tools/isCanary.ts:6` for non-Chrome browsers.
4. Stop committing `dist/` (and `.DS_Store`) — `git rm -r --cached`.
5. Replace the simulated MCP client with the real SDK, removing the duplicated `mockUsers` data.
6. Introduce the first tests (services + page smoke tests). Add `no-debugger`, `no-eval`, `react-hooks` rules to ESLint.

**Medium and low items** are cosmetic, documentation, or dependency hygiene — schedule them after the high list.

---

*Concerns audit: 2026-04-26*
