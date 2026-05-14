# External Integrations

**Analysis Date:** 2026-04-26

## APIs & External Services

**Browser-native AI (Chrome built-in / `window.ai` family):**
The chat application is the primary consumer; all of the following are *in-browser* integrations that run on-device with no network call to a hosted LLM.
- **Chrome `LanguageModel` (Gemini Nano / Prompt API)** — Used for chat and tool-calling demos.
  - File: `chat/src/app/services/ChatAIService.ts` (calls `LanguageModel.create()`, `.prompt()`, `.promptStreaming()`, `.availability()`, `.params()`).
  - Type contract: `chrome-llm-ts/src/lib/interfaces.ts` (`AILanguageModel`, `AILanguageModelFactory`, etc.) and `@types/dom-chromium-ai`.
  - Auth: none (on-device).
- **Chrome `Summarizer` API** — In-browser summarization with options `type` (`key-points` | `tl;dr` | `teaser` | `headline`), `format`, `length`.
  - File: `chat/src/app/services/SummaryService.ts`.
- **Chrome `Translator` API** — On-device translation (e.g., `en` → `ru`).
  - File: `chat/src/app/services/TranslateService.ts` (`translate`, `translateStreaming`, `checkTranslationAvailability`).
- **Chrome `LanguageDetector` API** — Detects source language before translation.
  - File: `chat/src/app/services/TranslateService.ts` (`detectLanguage`, `detectPrimaryLanguage`, `detectAndTranslate`).
- **Chrome `Writer` / `Rewriter` APIs** — Generates / rewrites text with `tone`, `format`, `length` options.
  - File: `chat/src/app/services/WriterService.ts`.
- **Chrome canary detection helper** — `chat/src/app/tools/isCanary.ts` (gates UI on availability).

**Third-party hosted AI (Hugging Face):**
- **Hugging Face / Xenova Transformers (in-browser ONNX)** — Speech synthesis pipeline.
  - File: `chat/src/app/services/TexToSpeachService.ts`.
  - Model: `Xenova/speecht5_tts`, downloaded by `@xenova/transformers` ^2.17.2 from the public Hugging Face CDN at runtime.
  - Speaker embeddings URL: `https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/speaker_embeddings.bin`.
  - Auth: none (public anonymous fetch).

**Local LLM provider (Ollama):**
- **Ollama HTTP API** at `http://localhost:11434/api/chat` — Used during local experiments and Modelfile demos (referenced from `func.http`, the included `*.Modelfile` files, and `functionphi-interactive.Modelfile`).
  - Modelfiles target base models `llama3.2` (`apple.Modelfile`, `appleAgr.Modelfile`, `s.Modelfile`) and `phi4-mini:latest` (`function.Modelfile`, `functionphi.Modelfile`, `functionphi-interactive.Modelfile`).
  - Auth: none (loopback only).

**Tracking / analytics (Google):**
- **Google Analytics 4 (gtag.js)** — Loaded inline in `chat/src/index.html` via `https://www.googletagmanager.com/gtag/js?id=G-ZC3N8B4VGB`. Wrapped by `chat/src/app/services/GoogleAnalyticsService.ts` and the `useGoogleAnalytics` hook (`chat/src/app/hooks/useGoogleAnalytics.ts`).
  - Measurement ID (committed): `G-ZC3N8B4VGB` (`chat/src/app/config/analytics.ts`).
  - Auth: none on the client side.

**Static asset / external links (informational):**
- Repo references the public site `https://windowai.danduh.me/` and social links to GitHub (`https://github.com/danduh/window-ai`), X, LinkedIn, YouTube — exposed as nav links in `chat/src/app/AppRouter.tsx`. No API integration.

## Data Storage

**Databases:**
- None active. `rxdb` ^15.39.0 is declared in root `package.json` but no source file imports it (no client-side persistence wired in yet).
- The MCP "payment" demo uses an **in-memory mock** as its data store (`mcp/src/services/paymentService.ts` — hard-coded `mockUsers` array; mutated in process and lost on restart). The MCP client mirrors the same mock list in `mcp-client/src/services/paymentMCPClient.ts`.

**File Storage:**
- AWS S3 (production) — Bucket `danduh-static-websites` defined in `devops/awsweb/src/config/websites.ts` (shared across multiple `*.danduh.me` static sites).
- Local-only filesystem during dev (`tmp/local-registry/storage` for Verdaccio, `dist/` outputs).

**Caching:**
- CloudFront edge cache — Configured in `chat/cloudfront-config.json`: HTML `DefaultTTL` 3600s, JS/CSS `DefaultTTL` 31536000s, root TTL 86400s. 403/404 → `/index.html` (SPA fallback).
- No server-side cache (Redis, Memcached) detected.

## Authentication & Identity

**Auth Provider:**
- None. No auth/OIDC/SSO library in `package.json` (no `next-auth`, `passport`, `firebase`, `@supabase/*`, `@aws-amplify/auth`, `@clerk/*`, etc.).
- `chat/` is fully client-side and unauthenticated.
- `mcp-client/`'s Express endpoints (`mcp-client/src/main.ts`) are unauthenticated and bound by default to `localhost:3001`.

## Monitoring & Observability

**Error Tracking:**
- None. No Sentry / Datadog / Rollbar / LogRocket SDK in dependencies.
- App-level error handling routes to `googleAnalytics.trackError()` (`GoogleAnalyticsService.trackError` in `chat/src/app/services/GoogleAnalyticsService.ts`).

**Logs:**
- `console.log` / `console.error` only.
  - MCP server writes status to `console.error` (`mcp/src/main.ts`) so STDOUT remains a clean JSON-RPC channel for stdio transport.
  - MCP client uses standard `console.log` for HTTP request lifecycle (`mcp-client/src/main.ts`).

**Performance:**
- Custom in-app metrics via `googleAnalytics.trackPerformance()` (`chat/src/app/services/GoogleAnalyticsService.ts`).

## CI/CD & Deployment

**Hosting:**
- Production SPA: AWS S3 + CloudFront fronted at `windowai.danduh.me`.
  - IaC: AWS CDK v2 in `devops/awsweb/` (stacks `ApplicationStack`, `SharedInfrastructureStack`, `WebsiteStack` in `devops/awsweb/src/stacks/`).
  - Cert: ACM `arn:aws:acm:us-east-1:411429114957:certificate/e3ea7859-fa8e-4da2-8e7a-3819310c2c8c` (committed in `devops/awsweb/src/config/websites.ts`).
- AWS Amplify pipeline configured in `amplify.yml` — currently builds an `ai-docs/` MkDocs site (legacy / unrelated to the React chat app).
- MCP server: distributed as a local Node binary, registered into Claude Desktop via `mcp/claude-desktop-config.json` pointing at `/Users/danielos/dev/window-ai/dist/mcp/main.js` over **stdio** transport.

**CI Pipeline:**
- `.github/` directory is present (contains `copilot-instructions.md` and likely workflow files) — no GitHub Actions workflow inspected here, but `nx affected` style targets are wired through `nx.json`.
- Local registry: Verdaccio target on port 4873 (`project.json` root, `nx run window-ai:local-registry`).

**Deploy commands:**
- `npx nx run @monorepo/awsweb:deploy-windowai` → CDK deploy of `static-websites-shared` + `website-windowai` (`devops/awsweb/project.json`).
- `npm run build:seo` → `nx serve chat --configuration=production && node chat/scripts/prerender-react.js` (SEO prerender via JSDOM in `chat/scripts/prerender-react.js`).
- `bash mcp/run-server.sh` → builds and runs MCP server.
- `bash mcp-client/start-api.sh` / `bash mcp-client/start-cli.sh` → builds + runs MCP client REST API or interactive CLI.

## Environment Configuration

**Required env vars:**
- `NODE_ENV` — Read by `chat/src/app/config/analytics.ts` (gates GA on/off) and `chat/vite.config.ts` (sets base path `/window-ai/` in production).
- `HOST` (optional) — MCP client API host, default `localhost` (`mcp-client/src/main.ts`).
- `PORT` (optional) — MCP client API port, default `3001` (`mcp-client/src/main.ts`).
- `CDK_DEFAULT_ACCOUNT` — Required for CDK synth/deploy (`devops/awsweb/src/main.ts`).
- `CDK_DEFAULT_REGION` — Required for CDK synth/deploy (`devops/awsweb/src/main.ts`).
- `DEPLOY_SITE` (optional) — Selects a single site from `WEBSITES` map in `devops/awsweb/src/config/websites.ts`; if unset, all sites are deployed.

**Secrets location:**
- No `.env*` files exist in the repo (`.env`, `.env.*.local` are listed in `.gitignore` as a precaution).
- No secrets are required at runtime — the chat app makes no authenticated calls; Google Analytics measurement ID is a public client identifier; ACM certificate ARN is committed plaintext (non-sensitive resource identifier).
- AWS credentials are expected from the developer's CLI profile (`~/.aws/credentials`), not from the repo.

## Webhooks & Callbacks

**Incoming:**
- None for the static chat SPA.
- `mcp-client` exposes the following Express HTTP endpoints (`mcp-client/src/main.ts`), but they are not webhooks per se — they are demo REST endpoints intended for local testing:
  - `GET /` — API info.
  - `GET /health` — Liveness + MCP connection status.
  - `GET /users`, `GET /users/:userId` — List / fetch users.
  - `POST /validate-balance` — Body `{ userId, requiredAmount }`.
  - `POST /transfer` — Body `{ fromUserId, toUserEmail, amount }`.
  - `GET /demo` — Runs end-to-end demo and returns captured logs.

**Outgoing:**
- None initiated by the backend.
- The chat SPA makes outgoing fetches to:
  - `https://www.googletagmanager.com/gtag/js` (script tag in `chat/src/index.html`).
  - `https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/speaker_embeddings.bin` (`chat/src/app/services/TexToSpeachService.ts`).
  - Hugging Face CDN for `Xenova/speecht5_tts` model weights (`@xenova/transformers` default behavior).
  - Google Fonts preconnect/prefetch (`chat/src/index.html`: `https://fonts.googleapis.com`).

## MCP (Model Context Protocol)

**MCP servers exposed by this repo:**
- **`payment-demo-mcp` v1.0.0** — Implemented in `mcp/src/main.ts` using `@modelcontextprotocol/sdk/server`. Transport: `StdioServerTransport`.
  - Registered with Claude Desktop via `mcp/claude-desktop-config.json` as the `payment-demo` server (`node dist/mcp/main.js`).
  - Tools advertised:
    - `validate_balance` — params `{ userId: string, requiredAmount: number }`.
    - `make_transfer` — params `{ fromUserId: string, toUserEmail: string, amount: number }`.
    - `get_user_info` — params `{ userId: string }`.
    - `list_all_users` — no params.
  - Backed by an in-memory mock (`mcp/src/services/paymentService.ts`).

**MCP servers consumed:**
- `mcp-client/src/services/paymentMCPClient.ts` is a *simulated* client that imports `child_process.spawn` and `EventEmitter` but does not yet wire up the real MCP SDK transport — its file-level comment states "simulates MCP connection for demo purposes". A real connection to the `payment-demo-mcp` server is the intended next step.

---

*Integration audit: 2026-04-26*
