# window-ai

**A live showcase of Chrome's built-in, on-device AI** — the Prompt API (`LanguageModel`), `Summarizer`, `Translator` / `LanguageDetector`, `Writer` / `Rewriter`, and `Proofreader` — plus **WebMCP** (`document.modelContext`) and a Model Context Protocol reference implementation.

🔗 **Live demo → [windowai.danduh.me](https://windowai.danduh.me)**

Everything runs **in the browser, on-device** via Chrome's built-in Gemini Nano: no backend, no API keys, no per-request cost, and no data leaving the machine.

---

## What it demonstrates

- **Prompt API (`LanguageModel`)** — chat, streaming, structured output, tool calling, and multimodal (image) input
- **Summarizer** — key-points / TL;DR / headline summaries, steered with `sharedContext`
- **Translator + Language Detector** — on-device translation, plus a live voice-translation demo
- **Writer / Rewriter** — generate new text and transform existing text (tone, length, format)
- **Proofreader** — positioned, inline grammar corrections
- **WebMCP (`document.modelContext`)** — the page as a callable tool surface: a Recipe Workbench and a Generative-UI carousel
- **Cross-Border Desk** — an on-device payments copilot that reads a foreign invoice, translates it, drafts a reply, and stages/settles a payout (the `map` app)
- **MCP reference** — a stdio Model Context Protocol server + client

Each demo page ships its own API documentation with copy-and-run console snippets.

---

## Monorepo layout

This is an [Nx](https://nx.dev) monorepo.

| Workspace | What it is | Run |
|---|---|---|
| **`chat/`** | React 19 SPA — the built-in-AI demo gallery + WebMCP demos | `nx serve chat` → http://localhost:4300 |
| **`map/`** | **Cross-Border Desk** — on-device payments copilot demo | `nx serve map` → http://localhost:4200 |
| **`chrome-llm-ts/`** | Publishable npm library [`@danduh/chrome-llm-ts`](https://www.npmjs.com/package/@danduh/chrome-llm-ts) — TypeScript types for `window.ai` | — |
| **`mcp/`** | Reference Model Context Protocol server (stdio) | — |
| **`mcp-client/`** | Express HTTP API + CLI wrapping an MCP client | — |
| **`devops/awsweb/`** | AWS CDK infrastructure (S3 + CloudFront + Route53) | — |
| **`notebooklm/`** | Talk pack — *"Small LLM in your Browser"* (sources, slide deck, narration) | docs |

---

## Quickstart

```bash
npm install                       # install monorepo dependencies

npx nx serve chat                 # demo gallery      → http://localhost:4300
npx nx serve map                  # Cross-Border Desk → http://localhost:4200

npx nx build chat                 # production build of a single app
npx nx run-many -t build lint     # build + lint everything
npx nx run-many -t test           # run all tests (Vitest)
```

---

## Requirements

The demos call Chrome's built-in AI, so they need a capable desktop Chrome:

- **Desktop Chrome 150+** on Windows, macOS, or Linux — the built-in AI APIs are desktop-only.
- **Gemini Nano on-device** — downloaded by Chrome on first use (a few GB; needs ~22 GB free disk and either >4 GB VRAM or 16 GB RAM). It can be disabled in Chrome settings, so demos always feature-detect and degrade gracefully.
- **Stable, no flag:** Prompt API (Chrome 148+), Summarizer / Translator / Language Detector (Chrome 138+).
- **Behind a flag / origin trial:** Writer, Rewriter, Proofreader, and WebMCP — enable via `chrome://flags` (each demo's in-app docs list the exact flag).

**Toolchain:** Node 20+ · Nx 21 · React 19 · TypeScript · Tailwind CSS · Vitest.

---

## Contributing

Contributions are welcome — see **[CONTRIBUTING.md](CONTRIBUTING.md)** for setup, the demo-page pattern, code style, and the pre-push checklist.

## License

[ISC](LICENSE).
