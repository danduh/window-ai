# Architecture

**Analysis Date:** 2026-04-26

## Pattern Overview

**Overall:** Nx-managed multi-project monorepo with one publishable library, one browser SPA, two Node.js services, and an AWS CDK infrastructure project. Each workspace is an independent build target; the library `chrome-llm-ts` is the only first-party dependency shared across workspaces.

**Key Characteristics:**
- Nx 21.5.x workspace orchestrates builds, caching, and dependency-aware task running. Configured in `nx.json` with `@nx/webpack`, `@nx/vite`, `@nx/playwright`, and `@nx/rspack` plugins. `defaultBase` is `main`.
- Heterogeneous runtimes coexist in one repo: browser (React SPA in `chat/`), Node CLI/server (Express + MCP SDK in `mcp/` and `mcp-client/`), and AWS CDK synth (TypeScript executed via `tsx` in `devops/awsweb/`).
- Single TypeScript path alias `chrome-llm-ts` (mapped in `tsconfig.base.json` to `chrome-llm-ts/src/index.ts`) provides typed access to the shared library without publishing during dev.
- ESLint-enforced module boundaries via `@nx/enforce-module-boundaries` (configured in `eslint.base.config.js`). Currently a permissive `*` tag allows any-to-any project deps.
- No app-to-app coupling: `mcp/` and `mcp-client/` communicate at runtime via the MCP stdio protocol, not via TypeScript imports.
- `packages/aws-infra/` exists as an empty placeholder (only an empty `eslint.config.mjs` file). Active CDK code lives in `devops/awsweb/`.

## Layers

**Workspace: `chat/` (browser SPA, projectType `application`):**
- Purpose: Public-facing React 19 SPA demonstrating Chrome's built-in AI APIs (Prompt / `LanguageModel`, Summarizer, Translator/LanguageDetector, Writer/Rewriter) plus a chat-style tool-calling demo.
- Location: `chat/src/`
- Contains: React components, page-level routes, AI service wrappers, hooks, contexts, markdown documentation imported as modules.
- Depends on: `chrome-llm-ts` (type definitions for the experimental `window.ai` / `LanguageModel` surface), `react`, `react-router-dom`, `react-markdown`, `react-syntax-highlighter`, `@xenova/transformers`, `tailwindcss`.
- Used by: End users in browser (Chrome with AI flags); `chat/scripts/prerender-react.js` consumes the production build via JSDOM for SEO HTML pre-rendering.

**Workspace: `chrome-llm-ts/` (publishable TypeScript library, projectType `library`):**
- Purpose: TypeScript interfaces, types, and small helper utilities for Chrome's experimental built-in AI APIs (`window.ai`, `Translator`, `Summarizer`, `Writer`, `Rewriter`, `LanguageModel`). Published to npm as `@danduh/chrome-llm-ts`.
- Location: `chrome-llm-ts/src/`
- Contains: Pure type declarations and a `mockStreamService.ts` helper.
- Depends on: `tslib` only (intentionally minimal for distribution).
- Used by: `chat/` workspace via the `chrome-llm-ts` path alias. External consumers via npm.

**Workspace: `mcp/` (Node.js MCP server, projectType `application`):**
- Purpose: Reference Model Context Protocol server exposing four payment-demo tools (`validate_balance`, `make_transfer`, `get_user_info`, `list_all_users`) over stdio transport. Designed for use with Claude Desktop or MCP Inspector.
- Location: `mcp/src/`
- Contains: `main.ts` (server bootstrap + tool dispatcher), `services/paymentService.ts` (mock domain service with in-memory user store), `test.ts` (standalone test harness).
- Depends on: `@modelcontextprotocol/sdk`. Built with esbuild as CommonJS. Output: `dist/mcp/main.js`.
- Used by: MCP clients (Claude Desktop via `mcp/claude-desktop-config.json`; `mcp-client/` over stdio in production design).

**Workspace: `mcp-client/` (Node.js Express API + CLI, projectType `application`):**
- Purpose: Two entry points wrapping an MCP client. `main.ts` exposes an HTTP API on port 3001 that delegates to the MCP payment server; `cli.ts` is an interactive readline CLI.
- Location: `mcp-client/src/`
- Contains: `main.ts` (Express HTTP server), `cli.ts` (interactive CLI), `services/paymentMCPClient.ts` (currently a *simulated* MCP client containing duplicated mock data — not connected to the real `mcp/` server in code).
- Depends on: `express`. Note: the project graph only records `npm:express` for this workspace; real MCP wiring is stubbed.
- Used by: Local developers via `mcp-client/start-api.sh` and `mcp-client/start-cli.sh`.

**Workspace: `devops/awsweb/` (AWS CDK infrastructure, projectType `application`):**
- Purpose: AWS CDK app provisioning S3 + CloudFront + Route53 for hosting the static-built `chat/` SPA on `windowai.danduh.me`.
- Location: `devops/awsweb/src/`
- Contains: `main.ts` (CDK app entry), `stacks/` (`SharedInfrastructureStack`, `WebsiteStack`, `StaticWebStack`, `ApplicationStack`), `config/websites.ts` (per-site domain/bucket map).
- Depends on: `aws-cdk-lib`, `constructs`. Executed by `npx cdk` invoked through Nx `run-commands` targets.
- Used by: `npx nx run awsweb:deploy-windowai` (deploys shared bucket + windowai site); `devops/awsweb/deploy.sh`.

**Placeholder: `packages/aws-infra/`:**
- Currently contains only an empty `eslint.config.mjs`. Not registered as an Nx project. Reserved for future infrastructure code.

## Data Flow

**Browser SPA flow (`chat/`):**
1. `chat/src/main.tsx` mounts React root inside `<div id="root">` declared in `chat/src/index.html`.
2. `BrowserRouter` (`react-router-dom`) wraps `AppRouter` (`chat/src/app/AppRouter.tsx`) which defines top-level routes `/`, `/chat/*`, `/tool-calling/*`, `/summary/*`, `/translate/*`, `/writer/*`.
3. Each page component (e.g. `ChatPage.tsx`, `Summary.tsx`, `TranslatePage.tsx`, `WriteRewritePage.tsx`, `ToolCallingPage.tsx`) imports a service from `chat/src/app/services/` (`ChatAIService`, `SummaryService`, `TranslateService`, `WriterService`).
4. Services call the global Chrome AI surface (`LanguageModel`, `window.Summarizer`, `window.Translator`, `window.LanguageDetector`, `window.Writer`) typed by `chrome-llm-ts` and `chat/src/app/types/dom-chromium-ai.d.ts`. Streaming responses are returned as `ReadableStream<string>` and rendered incrementally.
5. Markdown docs in `chat/src/app/docs/*.md` are imported via the custom Vite/Webpack `markdown-loader` plugins (in `chat/vite.config.ts` and `raw-loader` in `chat/webpack.config.js`) and rendered through `chat/src/app/tools/DocsRenderer.tsx`.
6. Cross-cutting concerns: `SEOProvider` (`chat/src/app/context/SEOContext.tsx`) updates `<head>`; `ThemeProvider` (`chat/src/app/context/ThemeContext.tsx`) controls dark mode; `useGoogleAnalytics` (`chat/src/app/hooks/useGoogleAnalytics.ts`) emits GA events using `ANALYTICS_CONFIG` from `chat/src/app/config/analytics.ts`.

**MCP server flow (`mcp/`):**
1. `mcp/src/main.ts` instantiates `Server` from `@modelcontextprotocol/sdk/server/index.js` and connects it to `StdioServerTransport`.
2. Static `tools[]` array declares the four tool schemas. `ListToolsRequestSchema` handler returns this array.
3. `CallToolRequestSchema` handler switches on tool name and delegates to `PaymentService` static methods in `mcp/src/services/paymentService.ts`.
4. `PaymentService` operates on an in-memory `mockUsers` array; mutations (transfers) update balances directly.
5. Responses are wrapped in `{ content: [{ type: 'text', text: JSON.stringify(...) }] }`. Errors return `isError: true`.

**MCP client API flow (`mcp-client/`):**
1. `mcp-client/src/main.ts` boots an Express app and constructs `PaymentMCPClient`.
2. `PaymentMCPClient.connect()` (`mcp-client/src/services/paymentMCPClient.ts`) currently *simulates* a connection (does not spawn the `mcp/` server) — this is explicitly noted in the file comments.
3. HTTP routes (`/health`, `/users`, `/users/:userId`, `/validate-balance`, `/transfer`, `/demo`) call methods on the client, which operate on a local copy of `mockUsers`.
4. `cli.ts` provides an interactive readline menu calling the same client methods.

**Infrastructure flow (`devops/awsweb/`):**
1. `npx cdk synth` (or Nx target `synth`) executes `tsx src/main.ts`.
2. `main.ts` constructs `ApplicationStack` (sandbox), `SharedInfrastructureStack` (shared S3 bucket `danduh-static-websites`), and per-site `WebsiteStack`s based on `WEBSITES` map in `devops/awsweb/src/config/websites.ts`.
3. `WebsiteStack` / `StaticWebStack` provision CloudFront distribution (HTTP/2+3, SPA error rewrites to `/index.html`), Route53 alias, and import an existing ACM certificate from `us-east-1`.
4. Synth output goes to `dist/devops/awsweb/cdk.out`. `deploy-ci` consumes that output for CI deploys.

**Build pipeline:**
1. `npm run build:chat` → `nx build chat` (Vite production build to `dist/chat/`).
2. `npm run build:seo` → production serve build then `node chat/scripts/prerender-react.js` which uses JSDOM to pre-render each route in `routes[]` to a separate static HTML file.
3. `nx build mcp` / `nx build mcp-client` → esbuild produces CommonJS bundles in `dist/mcp/` / `dist/mcp-client/`. Run with `node dist/<name>/main.js`.
4. `nx build chrome-llm-ts` → `@nx/js:tsc` compiles to `dist/chrome-llm-ts/` with declarations; `nx-release-publish` target publishes that directory to npm.

**State Management:**
- `chat/`: local React `useState` in page components; cross-cutting state via two contexts (`AppContext` for `inIframe` flag in `chat/src/app/context.ts`; `SEOContext` and `ThemeContext` in `chat/src/app/context/`).
- `mcp/` and `mcp-client/`: in-memory module-level arrays (`mockUsers`, `transactionCounter`). No persistence.

## Key Abstractions

**MCP `Tool` (server side):**
- Purpose: JSON-schema description of a callable function exposed to MCP clients.
- Examples: `mcp/src/main.ts` lines 24-90 declare four tools.
- Pattern: declarative `tools[]` array → switch dispatch in `CallToolRequestSchema` handler → static `PaymentService` methods.

**`PaymentService` (mcp) and `PaymentMCPClient` (mcp-client):**
- Purpose: Domain layer for the payment demo. Server holds canonical mock data; client holds duplicate mock data (currently disconnected from the server runtime).
- Examples: `mcp/src/services/paymentService.ts`, `mcp-client/src/services/paymentMCPClient.ts`.
- Pattern: static methods (`PaymentService`) vs class instance extending `EventEmitter` (`PaymentMCPClient`).

**Chrome AI service wrappers (browser):**
- Purpose: Thin async wrappers around globals (`LanguageModel`, `window.Summarizer`, etc.) that handle session lifecycle, streaming, abort signals, and `QuotaExceededError` translation.
- Examples: `chat/src/app/services/ChatAIService.ts`, `SummaryService.ts`, `TranslateService.ts`, `WriterService.ts`.
- Pattern: top-level exported async functions; per-call session creation with `destroy()` cleanup.

**CDK Stack constructs:**
- Purpose: Reusable infrastructure units composed in `devops/awsweb/src/main.ts`.
- Examples: `SharedInfrastructureStack`, `WebsiteStack` (`devops/awsweb/src/stacks/multi-website-stack.ts`), `StaticWebStack` (`devops/awsweb/src/stacks/static-web-stack.ts`).
- Pattern: classes extending `cdk.Stack`, accepting strongly-typed `*StackProps` interfaces, exposing public readonly resource references.

**Route → page → service chain (chat):**
- Purpose: One React page per Chrome AI domain, paired with a service module of the same name.
- Examples: `/chat` → `ChatPage.tsx` → `ChatAIService.ts`; `/summary` → `Summary.tsx` → `SummaryService.ts`; `/translate` → `TranslatePage.tsx` → `TranslateService.ts`; `/writer` → `WriteRewritePage.tsx` → `WriterService.ts`.

## Entry Points

**Browser SPA:**
- Location: `chat/src/main.tsx`
- Triggers: `chat/src/index.html` referencing the bundled main script.
- Responsibilities: Mount React root, install `BrowserRouter`, wrap with `SEOProvider`, render `AppRouter`.

**MCP Server:**
- Location: `mcp/src/main.ts`
- Triggers: `node dist/mcp/main.js` (run by `mcp/run-server.sh` after build, or by Claude Desktop via `mcp/claude-desktop-config.json`).
- Responsibilities: Construct MCP `Server`, register tool handlers, connect to `StdioServerTransport`.

**MCP Client API:**
- Location: `mcp-client/src/main.ts`
- Triggers: `node dist/mcp-client/main.js` (run by `mcp-client/start-api.sh`).
- Responsibilities: Boot Express server on `localhost:3001`, connect `PaymentMCPClient`, register HTTP routes, install SIGINT/SIGTERM graceful shutdown.

**MCP Client CLI:**
- Location: `mcp-client/src/cli.ts`
- Triggers: `node dist/mcp-client/cli.js` (run by `mcp-client/start-cli.sh`).
- Responsibilities: Interactive readline menu for invoking client methods.

**CDK App:**
- Location: `devops/awsweb/src/main.ts`
- Triggers: `npx cdk synth|deploy|destroy` (configured in `devops/awsweb/cdk.json` as `tsx src/main.ts`); Nx targets `synth`, `deploy`, `deploy-windowai`, `deploy-shared`.
- Responsibilities: Construct `cdk.App`, instantiate stacks per environment variables (`CDK_DEFAULT_ACCOUNT`, `CDK_DEFAULT_REGION`, `DEPLOY_SITE`).

**Library entry:**
- Location: `chrome-llm-ts/src/index.ts`
- Triggers: TS path alias `chrome-llm-ts` from any consumer; npm `import '@danduh/chrome-llm-ts'`.
- Responsibilities: Re-export everything from `lib/interfaces`, `lib/mockStreamService`, `lib/summary`, `lib/translation`, `lib/writer`, `lib/global`.

**SEO pre-render:**
- Location: `chat/scripts/prerender-react.js`
- Triggers: `npm run prerender:chat` (or `npm run build:seo`).
- Responsibilities: Spin up JSDOM, hydrate each route in the `routes[]` list, write per-route static HTML next to `index.html` in `dist/chat/`.

## Error Handling

**Strategy:** Each runtime layer handles errors close to the call site and surfaces user-readable messages. No centralized error pipeline.

**Patterns:**
- Browser AI services: `try/catch` around `window.Summarizer.create(...)`/etc.; `DOMException` is inspected by `name` (`QuotaExceededError`, `NotSupportedError`, `AbortError`) and re-thrown as a plain `Error` with a descriptive message. See `chat/src/app/services/SummaryService.ts` lines 53-69.
- MCP server: top-level `try/catch` inside `CallToolRequestSchema` handler returns `{ content: [...], isError: true }` with the error message embedded as JSON text. Top-level `main().catch(...)` calls `process.exit(1)`.
- MCP client API: per-route `try/catch` returns `res.status(500).json({ success: false, error })`. A trailing Express error middleware logs unhandled errors. SIGINT/SIGTERM handlers call `mcpClient.disconnect()` before exit.
- CDK: relies on `cdk synth` / `cdk deploy` to fail-fast; `--require-approval=never` in deploy targets.

## Cross-Cutting Concerns

**Logging:**
- Browser: `console.log` / `console.error` (no logging library).
- MCP server: `console.error` to keep stdout free for the MCP protocol stream over stdio.
- MCP client: `console.log` / `console.error`; `/demo` route monkey-patches `console.log` to capture demo output into the response body.

**Validation:**
- MCP tool inputs: declared via JSON Schema in each `Tool.inputSchema`. The MCP SDK enforces shape; handlers cast to `as { ... }` types without further runtime validation.
- MCP client HTTP routes: manual `typeof`/truthy checks (`mcp-client/src/main.ts` lines 79-83, 102-107).
- Browser: form-level checks inside React components.

**Authentication:** None. All runtimes are local-only / public-read.

**Configuration:**
- Browser build base path: `chat/vite.config.ts` switches `base` between `/window-ai/` (production) and `/`.
- MCP client: env vars `HOST` (default `localhost`) and `PORT` (default `3001`) read in `mcp-client/src/main.ts`.
- CDK: env vars `CDK_DEFAULT_ACCOUNT`, `CDK_DEFAULT_REGION`, `DEPLOY_SITE` read in `devops/awsweb/src/main.ts`. Static config (bucket name, certificate ARN, domain map) lives in `devops/awsweb/src/config/websites.ts`.

## Deployment Model

**Frontend (`chat/`):**
- Production target: AWS S3 bucket `danduh-static-websites` fronted by CloudFront + Route53 alias `windowai.danduh.me`. ACM certificate imported from `us-east-1`.
- Provisioned by: `devops/awsweb/` CDK app via Nx target `awsweb:deploy-windowai` or `devops/awsweb/deploy.sh windowai`.
- CloudFront SPA routing: 403/404 → `/index.html` (configured in both `chat/cloudfront-config.json` and the CDK `WebsiteStack`).
- A separate `amplify.yml` at the repo root configures AWS Amplify to build a `mkdocs` site from a (non-tracked) `ai-docs/` directory; this is unrelated to the `chat/` SPA pipeline.

**MCP server / client:** Local-only. No hosted deployment. `mcp/` is intended to be invoked by Claude Desktop locally.

**Library (`chrome-llm-ts`):** Published to npm as `@danduh/chrome-llm-ts` via `nx-release-publish` target reading the built `dist/chrome-llm-ts/` package.

## Runtime Model Summary

| Workspace | Runtime | Module Format | Build Tool | Output |
|-----------|---------|---------------|------------|--------|
| `chat/` | Browser (Chrome with AI flags) | ESM | Vite (primary) + Webpack (alternative config) | `dist/chat/` static assets |
| `chrome-llm-ts/` | Library (any) | CJS (`type: commonjs`) with type declarations | `@nx/js:tsc` | `dist/chrome-llm-ts/` npm package |
| `mcp/` | Node.js | CJS | `@nx/esbuild:esbuild` | `dist/mcp/main.js` |
| `mcp-client/` | Node.js | CJS | `@nx/esbuild:esbuild` | `dist/mcp-client/{main,cli}.js` |
| `devops/awsweb/` | Node.js (CDK synth via `tsx`) | TS source | `tsc --build` (compile) + `cdk synth` | `dist/devops/awsweb/cdk.out` |

---

*Architecture analysis: 2026-04-26*
