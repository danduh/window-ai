# Contributing to window-ai

Thanks for helping improve the on-device AI showcase! This guide covers local setup, how the demos are structured, code style, and what to check before you push.

## Prerequisites

- **Node 20+** and npm
- **Desktop Chrome 150+** to actually exercise the built-in AI (Windows / macOS / Linux). Some APIs (Writer, Rewriter, Proofreader, WebMCP) need a `chrome://flags` toggle — each demo's in-app docs name the flag. The apps still build and render without them; they degrade gracefully when an API is unavailable.

## Setup

```bash
git clone git@github.com:danduh/window-ai.git
cd window-ai
npm install
```

## Develop

```bash
npx nx serve chat     # demo gallery      → http://localhost:4300
npx nx serve map      # Cross-Border Desk → http://localhost:4200
```

Useful workspace commands (Nx):

```bash
npx nx build <project>            # e.g. nx build chat
npx nx lint <project>
npx nx test <project>             # Vitest
npx nx run-many -t build lint     # everything at once
npx nx graph                      # visualize the workspace
```

## Adding a demo page (in `chat/`)

Every demo follows the same shape — mirror it:

1. **Page component** — `chat/src/app/components/<Demo>Page.tsx`
2. **Service wrapper** — `chat/src/app/services/<Demo>Service.ts` that calls the Chrome AI API
3. **Docs** — `chat/src/app/docs/<Demo>-API.md`, rendered by `chat/src/app/tools/DocsRenderer.tsx` (code blocks get a copy button automatically)
4. **Route** — register it in the app router
5. **Nav link** — add it to the main navigation
6. Tailwind styling with dark-mode support, and SEO metadata

## Code style

- **TypeScript strict** — no `: any` / `as any` at API boundaries. For experimental Chrome APIs, prefer the ambient types in `types/*.d.ts` or a narrow local cast over `any`.
- **Prettier + ESLint** are enforced (`eslint.base.config.js`, `.prettierrc`). Run `nx lint` before pushing.
- **Streaming AI responses** — use `ReadableStream<string>` and render incrementally (see the existing `/writer` and `/translate` services).
- **Feature-detect + degrade** — always check `availability()` before `create()`, wire up the download `monitor`, and provide a non-AI fallback. Never freeze the page on a model download.
- **On-device APIs** — pass `outputLanguage` (e.g. `'en'`) to every Nano-backed `create()`, and use `document.modelContext` (falling back to `navigator.modelContext`) for WebMCP.

## Before you push

- [ ] `npx nx run-many -t build lint` is green
- [ ] Relevant tests pass (`nx test`)
- [ ] Docs/snippets updated if you changed an API's behavior, and reflect current Chrome facts
- [ ] No `debugger`, stray `console.log`, `.DS_Store`, or large binaries in the diff

## Commits & pull requests

- Branch off `main` (e.g. `feat/…`, `fix/…`) — don't commit directly to `main`.
- Write clear, scoped commit messages.
- Open a PR against `main` describing **what** changed and **how you verified it** (build/lint + which demo you exercised in Chrome).
