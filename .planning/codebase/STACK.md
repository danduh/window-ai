# Technology Stack

**Analysis Date:** 2026-04-26

## Languages

**Primary:**
- TypeScript 5.9.2 — Used across all workspaces (`chat/`, `chrome-llm-ts/`, `mcp/`, `mcp-client/`, `devops/awsweb/`, `packages/aws-infra/`). Pinned via `package.json` devDependencies and root `tsconfig.base.json`.
- JavaScript (ES2015 target, ESNext modules) — Build tool config (`chat/webpack.config.js`, `chat/postcss.config.js`, `chat/tailwind.config.js`, `eslint.config.js`, `eslint.base.config.js`).
- TSX/JSX — React 19 components in `chat/src/app/components/`.

**Secondary:**
- Bash — Operational scripts (`mcp/run-server.sh`, `mcp-client/start-api.sh`, `mcp-client/start-cli.sh`, `devops/awsweb/deploy.sh`).
- Modelfile (Ollama DSL) — Six Ollama Modelfiles at repo root (`apple.Modelfile`, `appleAgr.Modelfile`, `s.Modelfile`, `function.Modelfile`, `functionphi.Modelfile`, `functionphi-interactive.Modelfile`). Define system prompts, parameters, and tool-calling templates over `llama3.2` and `phi4-mini:latest`.
- HTML — `chat/src/index.html` (entry HTML with inline Google Analytics + JSON-LD structured data).
- SCSS / CSS — `chat/src/styles.scss`, `chat/src/global.css`. Default style for new components is SCSS (per `nx.json` generators config).
- Markdown — Documentation pages embedded as React routes (`chat/src/app/docs/*.md` loaded via Vite/Webpack raw loaders).
- HTTP request spec — `func.http` (REST Client format pointing at `http://localhost:11434/api/chat`).

## Runtime

**Environment:**
- Node.js — `@types/node` is pinned at `18.16.9` (no explicit `.nvmrc` or `engines` field). All non-browser workspaces (`mcp`, `mcp-client`, `devops/awsweb`) target Node via `@nx/esbuild` with `"platform": "node"` and `"format": ["cjs"]` (see `mcp/project.json`, `mcp-client/project.json`).
- Browser — `chat/` is a SPA targeting Chrome (uses Chrome's experimental built-in AI APIs: `LanguageModel`, `Translator`, `LanguageDetector`, `Summarizer`, `Writer`, `Rewriter`).

**Package Manager:**
- npm — Lockfile present at `package-lock.json` (~1.3MB). No yarn/pnpm lockfiles.
- Lockfile: present (`package-lock.json`).

## Frameworks

**Core (frontend — `chat/`):**
- React 19.1.1 + React DOM 19.1.1 — App entry `chat/src/main.tsx`.
- React Router DOM 6.27.0 — Routing in `chat/src/app/AppRouter.tsx`.
- Tailwind CSS 3.4.3 — `chat/tailwind.config.js`, custom primary color palette + `darkMode: 'class'`.
- PostCSS 8.4.38 + Autoprefixer 10.4.13 — `chat/postcss.config.js`.
- Sass 1.55+ — Default style preprocessor per `nx.json` (`"style": "scss"`).

**Core (backend / MCP):**
- `@modelcontextprotocol/sdk` ^1.12.1 — MCP server (`mcp/src/main.ts`) and (commented for) MCP client (`mcp-client/src/services/paymentMCPClient.ts`).
- Express 4.21.2 — REST API wrapper around the MCP client (`mcp-client/src/main.ts`).
- Fastify 5.2.2 + `@fastify/autoload` 6.0.3 + `@fastify/sensible` 6.0.3 + `fastify-plugin` 5.0.1 — Dependencies declared at root `package.json` but not yet imported by any source file (planned/unused).

**Core (infrastructure — `devops/awsweb/`):**
- AWS CDK v2 (`aws-cdk-lib` ^2.214.0, `constructs` ^10.4.2) — Stacks defined in `devops/awsweb/src/stacks/`. Entrypoint `devops/awsweb/src/main.ts`.
- `@aws/nx-plugin` 0.46.0 — Generator that produced the CDK workspace.

**AI / ML libraries:**
- `chrome-llm-ts` (workspace package, version 0.2.0 from `chrome-llm-ts/package.json`) — TypeScript types and helpers for Chrome's `window.ai` and translation APIs. Also published to npm as `@danduh/chrome-llm-ts`.
- `@xenova/transformers` ^2.17.2 — In-browser text-to-speech via `chat/src/app/services/TexToSpeachService.ts` using model `Xenova/speecht5_tts` and remote speaker embeddings hosted on Hugging Face.
- `@types/dom-chromium-ai` ^0.0.9 + `@types/chrome` ^0.0.287 — Type declarations for Chrome AI surface; included via `chat/tsconfig.json`'s `"include": ["./src/global.d.ts", "./src/app/types/dom-chromium-ai.d.ts"]`.

**UI extras:**
- `react-markdown` ^9.0.1 + `rehype-raw` ^7.0.0 + `remark-gfm` ^4.0.0 — Renders the `*.md` documentation pages.
- `react-syntax-highlighter` ^15.6.1 + `prismjs` ^1.29.0 — Code-block highlighting in docs.
- `react-shadow` ^20.5.0 — Shadow-DOM wrapper for embeddable widgets.

**Data / state:**
- RxJS ^7.8.1 — Declared dep (used by `chrome-llm-ts/src/lib/mockStreamService.ts` typings).
- RxDB ^15.39.0 — Declared dep but not yet referenced from any `.ts/.tsx` source.
- `reflect-metadata` ^0.1.13 — Decorator metadata polyfill (matches `tsconfig.base.json` `emitDecoratorMetadata: true`).

**Testing:**
- Vitest 3.2.4 + `@vitest/coverage-v8` 3.2.4 + `@vitest/ui` 3.2.4 — Configured per project (e.g. `chat/vite.config.ts` `test` block, `environment: 'jsdom'`, coverage to `../coverage/chat`). Workspace globs in `vitest.workspace.ts`.
- `@testing-library/react` 16.3.0 — Component tests.
- jsdom ~22.1.0 — DOM environment for unit tests + the `chat/scripts/prerender-react.js` SEO prerender pipeline.
- `@playwright/test` ^1.36.0 + `@nx/playwright` 21.5.1 + `eslint-plugin-playwright` ^1.6.2 — E2E target wired in `nx.json` (no e2e workspace exists yet).
- NestJS testing utilities (`@nestjs/testing` ^10.0.2, `@nestjs/schematics` 11.0.7) — Declared but no Nest source files in repo.

**Build/Dev:**
- Nx 21.5.1 monorepo (`nx.json`) — Plugins enabled: `@nx/webpack/plugin`, `@nx/vite/plugin`, `@nx/playwright/plugin`, `@nx/rspack/plugin`. `@nx/eslint/plugin` line is commented out.
- Vite 7.1.5 + `@vitejs/plugin-react` 5.0.2 — `chat/vite.config.ts` (with `nxViteTsPaths`, `nxCopyAssetsPlugin(['*.md'])`, and a custom inline markdown loader).
- Webpack (via `@nx/webpack` 21.5.1, `@nx/react` 21.5.1, `webpack-cli` ^5.1.4) — `chat/webpack.config.js` (Nx React webpack plugin with `compiler: 'babel'`, `raw-loader` for `.md`).
- esbuild ^0.19.2 — Used by MCP build targets (`@nx/esbuild:esbuild` in `mcp/project.json`, `mcp-client/project.json`).
- SWC (`@swc/core` ~1.5.7, `@swc/cli` 0.6.0, `@swc/helpers` ~0.5.11, `@swc-node/register` ~1.9.1) — TS execution helpers.
- Babel (`@babel/core` ^7.14.5, `@babel/preset-react` ^7.14.5) — Webpack compiler for the chat app (`compiler: 'babel'`).
- `@svgr/webpack` ^8.0.1, `@pmmmwh/react-refresh-webpack-plugin` ^0.5.7, `react-refresh` ~0.14.0, `raw-loader` ^4.0.2 — Webpack ecosystem extras.
- tsx ^4.20.5 — Runs CDK app entry (`tsx src/main.ts` per `devops/awsweb/cdk.json`).
- Verdaccio 6.1.6 — Local registry target (`project.json` root: `nx run @window-ai:local-registry` on port 4873, storage `tmp/local-registry/storage`).

## Key Dependencies

**Critical (runtime):**
- `@modelcontextprotocol/sdk` ^1.12.1 — Powers the MCP server in `mcp/src/main.ts` and is the conceptual contract used by `mcp-client/`.
- `react` / `react-dom` ^19.1.1 — Application UI framework.
- `react-router-dom` ^6.27.0 — App routing (`chat/src/app/AppRouter.tsx`).
- `chrome-llm-ts` (internal workspace package) — Type contracts for Chrome AI APIs, consumed by `chat/src/app/services/TranslateService.ts`.
- `@xenova/transformers` ^2.17.2 — Runs ONNX-quantized speech model in-browser, downloads weights from Hugging Face CDN.
- `express` 4.21.2 — Public HTTP surface for `mcp-client` (`mcp-client/src/main.ts`).

**Critical (declared, not yet used):**
- `fastify` 5.2.2 + plugins — No imports detected; reserved for future API.
- `rxdb` ^15.39.0 — No imports detected.

**Infrastructure:**
- `aws-cdk-lib` ^2.214.0 + `constructs` ^10.4.2 — CDK app for static-site deployments.
- `@aws/nx-plugin` 0.46.0 — Nx generator for the CDK workspace.

## Configuration

**Root TypeScript:**
- `tsconfig.base.json` — `target: es2015`, `module: esnext`, `lib: ["es2020", "dom"]`, `moduleResolution: node`, `experimentalDecorators: true`, `emitDecoratorMetadata: true`, `importHelpers: true`. Path alias `chrome-llm-ts -> chrome-llm-ts/src/index.ts`.
- `chat/tsconfig.json` — Extends base; sets `jsx: react-jsx`, `strict: true`, `allowSyntheticDefaultImports: true`. References `tsconfig.app.json` and `tsconfig.spec.json`.
- `chrome-llm-ts/tsconfig.lib.json`, `mcp/tsconfig.app.json`, `mcp-client/tsconfig.app.json`, `devops/awsweb/tsconfig.lib.json` — Per-project compiler configs.

**Lint / Format:**
- ESLint 9 (flat config) — `eslint.config.js` extends `eslint.base.config.js` (uses `@nx/eslint-plugin` flat presets `flat/base`, `flat/typescript`, `flat/javascript`). `@nx/enforce-module-boundaries` rule enabled.
- TypeScript ESLint 8.42.0 (`@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `@typescript-eslint/utils`).
- React lint plugins: `eslint-plugin-react` ^7.37.5, `eslint-plugin-react-hooks` ^5.2.0, `eslint-plugin-jsx-a11y` 6.10.1, `eslint-plugin-import` 2.31.0, `eslint-plugin-playwright` ^1.6.2.
- `eslint-config-prettier` 10.1.8 — Disables formatting rules.
- Prettier 3.6.2 — `.prettierrc` sets `{ "singleQuote": true }`. Ignore list at `.prettierignore`.

**Build configs (frontend):**
- `chat/vite.config.ts` — Vite for dev/test; base path `'/window-ai/'` in production, `'/'` otherwise; `manualChunks` splits `vendor` (react, react-dom) and `router` (react-router-dom).
- `chat/webpack.config.js` — Nx React webpack plugin, custom `raw-loader` for `.md`, dev server on port 4200, baseHref `'/'`.
- `chat/tailwind.config.js` — Custom `primary` palette, animations `fade-in` / `slide-up`.
- `chat/postcss.config.js` — Tailwind + Autoprefixer.

**Build configs (backend / infra):**
- `mcp/project.json`, `mcp-client/project.json` — `@nx/esbuild:esbuild`, `platform: node`, `format: ["cjs"]`, `bundle: false`, `generatePackageJson: true`. Output `dist/mcp` and `dist/mcp-client`.
- `devops/awsweb/cdk.json` — `app: tsx src/main.ts`, `output: ../../dist/devops/awsweb/cdk.out`, full set of CDK feature flags.

**Environment / runtime config:**
- No `.env*` files exist (gitignored entries `.env`, `.env.*.local` are listed in `.gitignore` but no files present).
- `process.env` references found in:
  - `chat/src/app/config/analytics.ts` — `process.env.NODE_ENV` toggles analytics enabled / debug.
  - `chat/vite.config.ts` — `process.env.NODE_ENV` selects base path.
  - `mcp-client/src/main.ts` — `process.env.HOST` (default `localhost`), `process.env.PORT` (default `3001`).
  - `devops/awsweb/src/main.ts` — `process.env.CDK_DEFAULT_ACCOUNT`, `process.env.CDK_DEFAULT_REGION`, `process.env.DEPLOY_SITE`.

## Platform Requirements

**Development:**
- Node 18+ (matches `@types/node` 18.16.9 and Nx 21 minimums).
- npm (lockfile is `package-lock.json`).
- Chrome Canary / Dev with experimental AI flags enabled — required at runtime for the chat app's `LanguageModel`, `Summarizer`, `Translator`, `LanguageDetector`, `Writer`, `Rewriter` globals (`chat/src/app/tools/isCanary.ts`).
- Optional: Ollama running locally at `http://localhost:11434` (per `func.http`) to use the bundled Modelfiles (`function.Modelfile`, `functionphi*.Modelfile`, etc.).
- Optional: AWS credentials with permission to deploy CDK stacks to `us-east-1` for the static site infra (`devops/awsweb/`).

**Production:**
- Static SPA hosted on AWS S3 + CloudFront — Bucket `danduh-static-websites`, ACM cert in `us-east-1` (`arn:aws:acm:us-east-1:411429114957:certificate/e3ea7859-fa8e-4da2-8e7a-3819310c2c8c`), production domain `windowai.danduh.me` (`devops/awsweb/src/config/websites.ts`).
- AWS Amplify build pipeline declared in `amplify.yml` (note: it builds an `ai-docs/` MkDocs site, not the chat SPA — orphan/legacy).
- CloudFront SPA caching policy at `chat/cloudfront-config.json` (HTML 1h TTL, JS/CSS 1y TTL, 403/404 → `/index.html` 200 fallback).
- MCP server distribution: bundled as CommonJS at `dist/mcp/main.js` and registered in Claude Desktop via `mcp/claude-desktop-config.json`.

---

*Stack analysis: 2026-04-26*
