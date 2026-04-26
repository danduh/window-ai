# Codebase Structure

**Analysis Date:** 2026-04-26

## Directory Layout

```
window-ai/
├── nx.json                       # Nx workspace config (plugins, target defaults, generators)
├── tsconfig.base.json            # Root TS config; declares the `chrome-llm-ts` path alias
├── package.json                  # Single root package.json with all deps for every workspace
├── package-lock.json             # Single lockfile for the entire monorepo
├── project.json                  # Root project (window-ai) — only registers a Verdaccio target
├── eslint.config.js              # Root ESLint flat config (extends eslint.base.config.js)
├── eslint.base.config.js         # Base ESLint config with @nx/enforce-module-boundaries rule
├── vitest.workspace.ts           # Glob-based Vitest workspace pointer
├── amplify.yml                   # AWS Amplify config (builds an ai-docs/ mkdocs site, NOT chat)
├── .prettierrc                   # `{ "singleQuote": true }`
├── .prettierignore               # /dist, /coverage, .nx caches
├── .gitignore                    # Standard Node + .nx/cache + .nx/workspace-data
├── README.md                     # Stub
├── LICENSE                       # ISC/MIT
├── chat/                         # React 19 SPA: Chrome built-in AI demos
├── chrome-llm-ts/                # Publishable TypeScript types library (@danduh/chrome-llm-ts)
├── mcp/                          # MCP server (payment demo) over stdio
├── mcp-client/                   # MCP client: Express HTTP API + interactive CLI
├── devops/                       # Infrastructure projects
│   └── awsweb/                   # AWS CDK app (S3 + CloudFront + Route53 for chat SPA)
├── packages/                     # Reserved area for future packages
│   └── aws-infra/                # Empty placeholder (only an empty eslint.config.mjs)
├── dist/                         # Build outputs for all workspaces (gitignored)
├── tmp/                          # Temp / local-registry storage (gitignored)
├── .nx/                          # Nx cache + project-graph cache (gitignored)
├── .planning/                    # This GSD planning directory
│   └── codebase/                 # Codebase mapping outputs (this file lives here)
├── .cursor/                      # Cursor IDE config (mcp.json, rules)
├── .vscode/                      # VS Code config
├── .idea/                        # JetBrains config
├── .github/                      # GitHub workflows + copilot-instructions.md
├── *.Modelfile                   # Local Ollama Modelfiles (apple, function, s, functionphi*)
├── apple.Modelfile, appleAgr.Modelfile, function.Modelfile, ...
├── func.http                     # HTTP request scratchpad
├── sysPrompts.txt                # Prompt scratchpad
├── Article_1.md, LLM.md, TRANSALTIO_API.md, WRITER_ASSISTANCE.md   # Long-form notes / drafts
└── apple.Modelfile etc.
```

## Directory Purposes

**`chat/`:**
- Purpose: React 19 single-page app demonstrating Chrome's built-in AI APIs (`LanguageModel`/Prompt, Summarizer, Translator + LanguageDetector, Writer/Rewriter) with documentation pages and live demos.
- Contains: Source under `chat/src/`, Vite + Webpack build configs (Vite is the primary path), Tailwind/PostCSS configs, SEO pre-render scripts, deployment helpers.
- Key files: `chat/project.json` (empty Nx target overrides — relies on Vite plugin auto-detection), `chat/vite.config.ts` (with custom `markdown-loader`), `chat/webpack.config.js` (alternative path), `chat/tsconfig.app.json`, `chat/tailwind.config.js`, `chat/postcss.config.js`, `chat/cloudfront-config.json`, `chat/scripts/prerender-react.js`.

**`chat/src/`:**
- Purpose: All chat application source.
- Key files: `chat/src/main.tsx` (React root), `chat/src/index.html` (HTML shell with GA snippet and JSON-LD), `chat/src/global.css`, `chat/src/global.d.ts` (extends `Window` with `ai`, `LanguageModel`, `Translator`, `Summarizer`, `Writer`; declares `*.md` modules), `chat/src/styles.scss`, `chat/src/favicon.ico`.

**`chat/src/app/`:**
- Purpose: React app code organized by responsibility.
- Subdirectories:
  - `chat/src/app/components/` — page-level and shared React components (`AppRouter.tsx` lives one level up at `chat/src/app/AppRouter.tsx`). Pages: `HomePage.tsx`, `ChatPage.tsx`, `ChatDocumentationPage.tsx`, `ToolCallingPage.tsx`, `Summary.tsx`, `TranslatePage.tsx`, `WriteRewritePage.tsx`. Shared: `ChatBox.tsx`, `ChatInput.tsx`, `Tabs.tsx`, `ThemeToggle.tsx`.
  - `chat/src/app/services/` — async wrappers around Chrome AI globals: `ChatAIService.ts`, `SummaryService.ts`, `TranslateService.ts`, `WriterService.ts`, plus `GoogleAnalyticsService.ts` and `TexToSpeachService.ts`.
  - `chat/src/app/context/` — React contexts: `SEOContext.tsx`, `ThemeContext.tsx`. Note: `chat/src/app/context.ts` (singular) defines `AppContext` for the `inIframe` flag.
  - `chat/src/app/hooks/` — `useGoogleAnalytics.ts`, `useSEOData.ts`.
  - `chat/src/app/config/` — `analytics.ts` (GA measurement ID, debug flag).
  - `chat/src/app/tools/` — utility helpers: `DocsRenderer.tsx`, `isCanary.ts`, `md-loader.ts` (dynamic `import()` of markdown docs).
  - `chat/src/app/docs/` — Markdown documentation files imported as modules: `Home.md`, `Chat-API.md`, `Tool-Calling-API.md`, `Summary-API.md`, `Translate-API.md`, `Writer-ReWriter-API.md`.
  - `chat/src/app/types/` — `dom-chromium-ai.d.ts` (typings for Chrome's experimental DOM AI surface).
- Key file: `chat/src/app/AppRouter.tsx` — single source of truth for routing, navigation chrome, and theme/menu state.

**`chrome-llm-ts/`:**
- Purpose: Publishable TS library of interfaces for Chrome's built-in AI APIs.
- Key files: `chrome-llm-ts/package.json` (npm name `@danduh/chrome-llm-ts`, `type: commonjs`), `chrome-llm-ts/project.json` (build target uses `@nx/js:tsc`), `chrome-llm-ts/tsconfig.lib.json`, `chrome-llm-ts/src/index.ts` (barrel re-export).
- Subdirectories: `chrome-llm-ts/src/lib/` containing `interfaces.ts` (LanguageModel types), `summary.ts`, `translation.ts`, `writer.ts`, `global.ts` (Window/AI ambient interfaces), `mockStreamService.ts`.

**`mcp/`:**
- Purpose: MCP (Model Context Protocol) server exposing payment-demo tools over stdio.
- Key files: `mcp/project.json` (esbuild build target outputting CJS to `dist/mcp/`), `mcp/tsconfig.app.json`, `mcp/src/main.ts` (server bootstrap + tool dispatch), `mcp/src/services/paymentService.ts` (mock domain logic), `mcp/src/test.ts` (standalone test harness), `mcp/run-server.sh`, `mcp/test-with-inspector.sh`, `mcp/claude-desktop-config.json` (Claude Desktop wiring), `mcp/CONNECTION_GUIDE.md`, `mcp/WORKSHOP_GUIDE.md`, `mcp/README.md`.
- Subdirectory: `mcp/src/assets/` (passed through by esbuild).

**`mcp-client/`:**
- Purpose: Node.js Express HTTP API and interactive CLI that wrap an MCP client.
- Key files: `mcp-client/project.json` (esbuild build target), `mcp-client/tsconfig.app.json`, `mcp-client/src/main.ts` (Express server on port 3001), `mcp-client/src/cli.ts` (readline CLI), `mcp-client/src/services/paymentMCPClient.ts` (client implementation — currently *simulated*, not connected to the real MCP server in code), `mcp-client/start-api.sh`, `mcp-client/start-cli.sh`, `mcp-client/README.md`.

**`devops/awsweb/`:**
- Purpose: AWS CDK app that provisions S3 + CloudFront + Route53 + ACM for hosting the static `chat/` SPA build.
- Key files: `devops/awsweb/project.json` (Nx wraps `npx cdk` via `nx:run-commands`; targets: `bootstrap`, `cdk`, `synth`, `deploy`, `deploy-windowai`, `deploy-shared`, `deploy-ci`, `destroy`, `destroy-ci`, `compile`, `test`), `devops/awsweb/cdk.json` (`app: tsx src/main.ts`), `devops/awsweb/tsconfig.lib.json`, `devops/awsweb/vite.config.ts` (for tests), `devops/awsweb/deploy.sh`.
- Source layout (`devops/awsweb/src/`):
  - `main.ts` — CDK app entry, instantiates stacks based on `DEPLOY_SITE` env var.
  - `stacks/application-stack.ts` — empty sandbox stack (`monorepo-infra-sandbox`).
  - `stacks/multi-website-stack.ts` — `SharedInfrastructureStack` (shared S3 bucket) and `WebsiteStack` (per-site CloudFront + Route53).
  - `stacks/static-web-stack.ts` — `StaticWebStack` standalone variant.
  - `config/websites.ts` — `WEBSITES` map (currently `windowai → windowai.danduh.me`) and `COMMON_CONFIG` (bucket name, certificate ARN).

**`packages/`:**
- Purpose: Reserved namespace for future shared packages.
- Contents: `packages/aws-infra/` exists but contains only an empty `eslint.config.mjs`. Not registered as an Nx project (no `project.json`).

**`dist/`:**
- Purpose: Build outputs. Subdirectories appear after each project builds: `dist/chat/`, `dist/chrome-llm-ts/`, `dist/mcp/`, `dist/mcp-client/`, `dist/devops/awsweb/cdk.out/`. Gitignored.

**`tmp/`:**
- Purpose: Local Verdaccio registry storage (`tmp/local-registry/storage`) for the root `local-registry` Nx target. Gitignored.

**`.nx/`:**
- Purpose: Nx computation cache and `workspace-data/project-graph.json` (the parsed project graph used by Nx). Gitignored.

**`.planning/codebase/`:**
- Purpose: GSD codebase mapping output directory. Contains `ARCHITECTURE.md` and this `STRUCTURE.md`.

**`.github/`:**
- Purpose: GitHub-specific config including `.github/copilot-instructions.md`.

**`.cursor/`:**
- Purpose: Cursor IDE config: `mcp.json`, `rules/`.

## Key File Locations

**Entry Points:**
- `chat/src/main.tsx` — React SPA entry.
- `chat/src/app/AppRouter.tsx` — router and navigation chrome.
- `chat/scripts/prerender-react.js` — SEO HTML pre-render script (consumes built `dist/chat/index.html`).
- `mcp/src/main.ts` — MCP server (stdio).
- `mcp-client/src/main.ts` — MCP client HTTP API (port 3001).
- `mcp-client/src/cli.ts` — MCP client interactive CLI.
- `devops/awsweb/src/main.ts` — AWS CDK app entry.
- `chrome-llm-ts/src/index.ts` — library barrel.

**Configuration:**
- `nx.json` — workspace plugins, target defaults, generators.
- `tsconfig.base.json` — root TS config; declares `chrome-llm-ts` alias.
- `eslint.config.js` / `eslint.base.config.js` — flat ESLint configs with `@nx/enforce-module-boundaries`.
- `chat/vite.config.ts` — primary chat build config (Vite + custom markdown loader).
- `chat/webpack.config.js` — alternative chat build (raw-loader for markdown).
- `chat/tailwind.config.js`, `chat/postcss.config.js` — CSS pipeline.
- `chat/tsconfig.app.json`, `chat/tsconfig.spec.json`, `chat/tsconfig.json` — chat TS configs.
- `mcp/tsconfig.app.json`, `mcp-client/tsconfig.app.json` — Node CJS strict TS configs.
- `chrome-llm-ts/tsconfig.lib.json` — library TS config (declarations on, sourceMap off).
- `devops/awsweb/cdk.json` — CDK app entry + feature flags.
- `devops/awsweb/src/config/websites.ts` — site domain/bucket map.
- `chat/src/app/config/analytics.ts` — Google Analytics measurement ID.
- `mcp/claude-desktop-config.json` — Claude Desktop MCP wiring.
- `amplify.yml` — AWS Amplify build (for a separate `ai-docs/` mkdocs site, not for chat).

**Core Logic:**
- Browser AI services: `chat/src/app/services/{ChatAIService,SummaryService,TranslateService,WriterService}.ts`.
- React pages: `chat/src/app/components/{HomePage,ChatPage,ToolCallingPage,Summary,TranslatePage,WriteRewritePage}.tsx`.
- MCP tool definitions: `mcp/src/main.ts` (tool array + dispatch switch).
- MCP domain logic: `mcp/src/services/paymentService.ts`.
- MCP client (simulated): `mcp-client/src/services/paymentMCPClient.ts`.
- CDK stacks: `devops/awsweb/src/stacks/*.ts`.
- AI type definitions: `chrome-llm-ts/src/lib/{interfaces,summary,translation,writer,global}.ts`.

**Testing:**
- `vitest.workspace.ts` (root) globs `**/*/vite.config.{ts,mts}` and `**/*/vitest.config.{ts,mts}`.
- `chat/vite.config.ts` `test` block (`environment: 'jsdom'`, includes `src/**/*.{test,spec}.*`).
- `chat/tsconfig.spec.json` — chat test TS config.
- `mcp/src/test.ts` — standalone Node test harness for `PaymentService` (run via `tsx` or after build).
- `devops/awsweb/tsconfig.spec.json`, `devops/awsweb/vite.config.ts` — Vitest config for CDK tests.
- No actual `*.test.*` / `*.spec.*` files are checked in at the time of this analysis.

## Naming Conventions

**Workspace folders:**
- Top-level workspace name = directory name (kebab-case). Nx project names match: `chat`, `mcp`, `mcp-client`, `chrome-llm-ts`, `awsweb`, `window-ai` (root).
- Infrastructure projects nested under `devops/<name>/`. The CDK project's npm name is namespaced `@monorepo/awsweb` in its `project.json`.

**Files (chat React app):**
- React components: `PascalCase.tsx` (e.g. `ChatPage.tsx`, `ToolCallingPage.tsx`, `WriteRewritePage.tsx`).
- Services: `PascalCaseService.ts` (e.g. `ChatAIService.ts`, `TranslateService.ts`).
- Hooks: `useCamelCase.ts` (e.g. `useGoogleAnalytics.ts`, `useSEOData.ts`).
- Contexts: `PascalCaseContext.tsx` (e.g. `SEOContext.tsx`, `ThemeContext.tsx`).
- Plain utilities: `camelCase.ts` (e.g. `isCanary.ts`, `md-loader.ts`).
- Config modules: `camelCase.ts` (e.g. `analytics.ts`).
- Type-only modules: `kebab-case.d.ts` (e.g. `dom-chromium-ai.d.ts`).
- Markdown docs: `Title-Case-API.md` (e.g. `Chat-API.md`, `Tool-Calling-API.md`).

**Files (Node services — `mcp/`, `mcp-client/`):**
- App entry always `main.ts`. Secondary entries (e.g. `cli.ts`) at `src/` root.
- Domain modules: `camelCaseService.ts` / `camelCaseClient.ts` under `src/services/`.

**Files (CDK — `devops/awsweb/`):**
- Stacks: `kebab-case-stack.ts` under `src/stacks/`.
- Config: `kebab-case.ts` under `src/config/`.

**Files (library — `chrome-llm-ts/`):**
- Source files: lowercase nouns under `src/lib/` (`interfaces.ts`, `summary.ts`, `translation.ts`, `writer.ts`, `global.ts`).
- Re-export everything through `src/index.ts`.

**Nx targets:**
- Standard Nx names used everywhere: `build`, `serve`, `test`, `lint`, `e2e`. CDK project adds custom verbs: `synth`, `deploy`, `deploy-windowai`, `deploy-shared`, `deploy-ci`, `destroy`, `destroy-ci`, `bootstrap`, `compile`.

## Where to Add New Code

**New chat page / Chrome AI demo:**
- Component: `chat/src/app/components/<PageName>.tsx`.
- Service wrapper (if calling a new AI surface): `chat/src/app/services/<NameService>.ts`.
- Markdown documentation: `chat/src/app/docs/<Page-Name>-API.md`.
- Hook into router: add `<Route>` entries in `chat/src/app/AppRouter.tsx` and a nav `<Link>`.
- SEO config: extend `seoConfigs` in `chat/src/app/hooks/useSEOData.ts`.
- Pre-render: add new path entries to the `routes[]` array in `chat/scripts/prerender-react.js` so the static HTML is generated at SEO build time.

**New shared Chrome AI type or helper:**
- Add a module under `chrome-llm-ts/src/lib/<name>.ts`.
- Export from `chrome-llm-ts/src/index.ts`.
- Bump version in `chrome-llm-ts/package.json` if publishing.

**New MCP tool (server side):**
- Append a `Tool` definition to the `tools[]` array in `mcp/src/main.ts`.
- Add a `case '<tool_name>':` branch inside the `CallToolRequestSchema` handler in the same file.
- Implement domain logic as a static method on `PaymentService` (or a new service class) in `mcp/src/services/`.
- If schemas grow, extract `tools[]` into `mcp/src/tools.ts` (does not yet exist).

**New MCP client functionality:**
- Add a method to `PaymentMCPClient` in `mcp-client/src/services/paymentMCPClient.ts`.
- Expose via Express route in `mcp-client/src/main.ts`.
- Mirror in the readline menu (`mcp-client/src/cli.ts`) if interactive use is desired.
- Note: The current client is *simulated*. Real MCP wiring needs `@modelcontextprotocol/sdk/client/*` integration first.

**New AWS-hosted website:**
- Add an entry to `WEBSITES` in `devops/awsweb/src/config/websites.ts` (`{ domain, siteName }`).
- Deploy with `DEPLOY_SITE=<key> npx nx run awsweb:deploy` or the `deploy-<key>` shortcut after adding a target in `devops/awsweb/project.json`.

**New CDK stack:**
- File: `devops/awsweb/src/stacks/<kebab-case>-stack.ts`. Class extends `cdk.Stack`, exports a strongly-typed `*StackProps` interface.
- Wire into `devops/awsweb/src/main.ts` (instantiate inside the existing `app`).

**New shared package (TypeScript library):**
- Either add under `packages/<name>/` (currently empty namespace) or as a new top-level workspace folder (matches the existing `chrome-llm-ts/` precedent).
- Provide `project.json` with a `build` target (`@nx/js:tsc` or `@nx/esbuild:esbuild`).
- Declare path alias in `tsconfig.base.json` `compilerOptions.paths`.

**New Node.js service (similar to `mcp-client`):**
- Create `<name>/` at the repo root.
- Add `<name>/project.json` mirroring `mcp-client/project.json` (esbuild, CJS, Node platform).
- Add `<name>/tsconfig.app.json` and `<name>/tsconfig.json` mirroring the same.
- Entry at `<name>/src/main.ts`.

**Tests:**
- Unit/integration tests for `chat/`: `chat/src/**/*.{test,spec}.{ts,tsx}` (Vitest with jsdom — already configured in `chat/vite.config.ts`).
- Tests for `devops/awsweb/`: `devops/awsweb/src/**/*.spec.ts` (Vitest, see `devops/awsweb/vite.config.ts`).
- For Node services (`mcp/`, `mcp-client/`): no test framework is wired yet. Convention from `mcp/src/test.ts` is a manual `tsx` script — graduate to Vitest by adding a `vite.config.ts` or `vitest.config.ts` to the workspace.

**Scripts and one-off tools:**
- Browser-build-related scripts: `chat/scripts/`.
- Per-workspace shell wrappers: alongside `project.json` (e.g. `mcp/run-server.sh`, `mcp-client/start-api.sh`, `devops/awsweb/deploy.sh`).
- Root-level npm scripts: `package.json` `scripts` (currently `build:chat`, `build:chat:prod`, `prerender:chat`, `build:seo`, `serve:chat`).

## Special Directories

**`packages/aws-infra/`:**
- Purpose: Empty placeholder (only an empty `eslint.config.mjs`). Active CDK code is in `devops/awsweb/`. Generated: No. Committed: Yes.

**`tmp/local-registry/`:**
- Purpose: Verdaccio storage for the root `local-registry` Nx target (`@nx/js:verdaccio` on port 4873). Generated: Yes. Committed: No.

**`dist/`:**
- Purpose: All build outputs. Generated: Yes. Committed: No.

**`.nx/cache/`, `.nx/workspace-data/`:**
- Purpose: Nx computation cache + project graph. Generated: Yes. Committed: No (gitignored).

**`ai-docs/`:**
- Purpose: Referenced by `amplify.yml` as a `mkdocs` site source. Not present in the working tree at the time of analysis.

**Modelfiles (`*.Modelfile`) and prompt notes (`Article_1.md`, `LLM.md`, `TRANSALTIO_API.md`, `WRITER_ASSISTANCE.md`, `sysPrompts.txt`, `func.http`):**
- Purpose: Author's personal Ollama Modelfiles and long-form draft notes. Not consumed by any build target.

---

*Structure analysis: 2026-04-26*
