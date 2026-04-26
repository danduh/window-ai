# window-ai — Claude Code Project Guide

This file is automatically loaded into Claude's context when working in this repo.

## Project

**window-ai** is a public showcase site (windowai.danduh.me) demonstrating Chrome's experimental built-in AI APIs (`window.ai` / `LanguageModel`, `Summarizer`, `Translator`/`LanguageDetector`, `Writer`/`Rewriter`) plus a Model Context Protocol (MCP) reference implementation.

**Current milestone:** WebMCP Recipe Workbench — adding a new `/webmcp` demo page to the existing `chat/` SPA showcasing `navigator.modelContext` (the WebMCP API in Chrome 146 Canary).

**Branch:** work happens on `feature/mcp-preview`.

For the full project context, see `.planning/PROJECT.md`.

## Repository Layout (Nx monorepo)

| Workspace | What it is |
|-----------|------------|
| `chat/` | React 19 SPA — public window.ai demo gallery. **WebMCP demo lives here under `/webmcp`.** |
| `chrome-llm-ts/` | Publishable npm library (`@danduh/chrome-llm-ts`) — TS types for `window.ai` |
| `mcp/` | Reference Model Context Protocol server (stdio) — payment demo. Untouched in WebMCP milestone. |
| `mcp-client/` | Express HTTP API + readline CLI wrapping an MCP client. Untouched in WebMCP milestone. |
| `devops/awsweb/` | AWS CDK infra (S3 + CloudFront + Route53). Untouched in WebMCP milestone. |

For deeper detail: `.planning/codebase/ARCHITECTURE.md`, `STRUCTURE.md`, `CONVENTIONS.md`.

## Existing Demo Page Pattern (mirror this for `/webmcp`)

Each demo page in `chat/` follows the same shape:
- A page component at `chat/src/app/<demo>/<Demo>Page.tsx`
- A service wrapper at `chat/src/app/services/<Demo>Service.ts` that calls Chrome's AI APIs
- A markdown doc at `chat/src/app/docs/<demo>.md` rendered via `chat/src/app/tools/DocsRenderer.tsx`
- A route registered in `chat/src/app/AppRouter.tsx`
- A nav link in the main navigation
- Tailwind styling with dark-mode support via `ThemeProvider`
- SEO metadata via `SEOProvider`

The WebMCP Recipe Workbench follows this exact pattern.

## GSD Workflow

This project uses GSD (Get Shit Done) for planning + execution. Key directories:
- `.planning/PROJECT.md` — current milestone context (read before non-trivial work)
- `.planning/REQUIREMENTS.md` — v1 requirements (REQ-IDs map to phases)
- `.planning/ROADMAP.md` — 3 phases for the WebMCP milestone
- `.planning/STATE.md` — current phase / progress
- `.planning/codebase/` — codebase map (ARCHITECTURE, STACK, CONVENTIONS, TESTING, INTEGRATIONS, STRUCTURE, CONCERNS)
- `.planning/config.json` — workflow config (mode: yolo, granularity: coarse, parallelization: true, model: balanced, research/plan_check/verifier: enabled)

**Workflow conventions:**
- Mode = **YOLO**: auto-approve gates and execute without per-step confirmation
- Granularity = **coarse**: phases are broad (1–3 plans each)
- **Each phase commits atomically** when work lands
- **Don't refactor what isn't being touched** — brownfield discipline
- **Don't touch `mcp/`, `mcp-client/`, `devops/awsweb/`** in this milestone

**Commands you'll commonly run:**
- `/gsd-progress` — see current state
- `/gsd-plan-phase <N>` — plan the next phase
- `/gsd-execute-phase <N>` — execute the planned phase
- `/gsd-discuss-phase <N>` — pre-plan exploration

## Build & Run

```bash
npm install                          # install monorepo deps
npx nx serve chat                    # run the SPA at localhost:4200
npx nx build chat                    # production build
npx nx test chat                     # run tests for chat workspace
npx nx run-many -t test              # run all tests
npx nx run-many -t lint              # lint everything
```

Test framework: **Vitest** (configured in `vitest.workspace.ts`). See `.planning/codebase/TESTING.md` for patterns.

## Code Style

- **TypeScript** strict mode — no `: any`, no `as any` at API boundaries
- **Prettier** + **ESLint** enforced (`eslint.base.config.js`, `.prettierrc`)
- Imports: keep workspace boundaries respected (Nx `@nx/enforce-module-boundaries` is configured but currently permissive)
- Streaming AI responses: use `ReadableStream<string>` and render incrementally (see existing `/writer`, `/translate` services for the pattern)

## Important Constraints (current milestone)

- **WebMCP demo is native-only** — no `@mcp-b/global` polyfill. Browsers without `navigator.modelContext` see a banner.
- **No deployment** in this milestone (local-only via `nx serve chat`).
- **IndexedDB only** for recipe persistence. No backend.
- **Definition of done = "2-min demo"** — not reference-quality, not production-polished.

---

*Generated 2026-04-26 during `/gsd-new-project`. Edit freely — this file is yours.*
