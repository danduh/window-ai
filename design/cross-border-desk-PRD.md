# PRD — Cross-Border Desk
### A Chrome-only, on-device payments copilot. Your app is the chat; Gemini Nano is the brain; every capability is a WebMCP tool.

**Status:** Draft v0.2 (supersedes v0.1)
**Author:** Daniel
**Date:** July 2, 2026
**Runtime:** Chrome / Chrome Canary 150+, all on-device built-in AI flags enabled. No servers, no external agents, no cloud.

---

## 0. What changed from v0.1

The architecture is now settled and correct — this is the version to build against:

- **The app is the chat.** We build the chat UI in the page. No external agent, no Inspector chat, no Ollama, no Gemini sidebar.
- **Nano is the orchestrator via our own dispatch loop.** Confirmed on the M3: `LanguageModel` does *not* auto-call tools (neither WebMCP nor a `tools:` option — it silently ignores them and returns text). So our code reads Nano's structured output and calls the function. That is the only mechanism that works on-device, and it's all ours.
- **WebMCP stays as the tool registry, called by our own loop.** Registration via `document.modelContext` (the API is `document.modelContext`, *not* `navigator.modelContext` — deprecated). The "every capability is a real registered tool" story is the architecture; our dispatcher is the caller. The Inspector extension is a *dev debug panel* only, not part of the running demo.
- **Origin-isolation is mandatory.** WebMCP APIs are disabled on any page with `document.domain` set. Runs on clean `localhost`.

## 1. One-liner

A chat, in one Chrome tab. Drop a foreign invoice; the app reads it, translates it, drafts a professional reply in the client's language, and stages a payout — entirely on-device with the network pulled. The only moment the network is touched is settlement, and even then only a signed instruction crosses the wire, never the documents or PII.

## 2. Thesis (the reason the demo exists)

> **Intelligence on-device. Settlement on the rail. PII never on the wire.**

Everything that *understands* the document runs locally in the browser via Chrome's built-in AI. The single unavoidable network event (moving money) carries a minimal signed instruction, not the source material.

## 3. Problem

Cross-border freelancers/SMBs receive invoices in languages they don't read, holding exactly the data that must not be sprayed to cloud LLMs: IDs, bank details, tax numbers. Today that means manual drudgery or pasting sensitive documents into a cloud model. Chrome's on-device AI removes that trade-off.

## 4. Non-goals

- Not a real payment integration. `settle_payout` is mocked; no funds move.
- No backend, no server, no external agent, no cloud model of any kind.
- Not mobile (Nano-backed APIs and Translator/Language Detector are desktop-only today).
- Not a general planner. Nano *routes* to one tool at a time; deterministic code chains sequences.

## 5. Architecture

One Chrome tab. Four parts, all in the page:

1. **Chat UI (our code).** Transcript + composer. User types, or drops an invoice image. Every tool call renders inline as a chip so the demo shows its own wiring.
2. **Orchestrator = Gemini Nano (Prompt API).** Given the message + state, Nano returns structured `{tool, args}` via `responseConstraint` (JSON Schema). **Always pass an output language** (`expectedOutputs: [{ type:"text", languages:["en"] }]`) — Canary warns and quality/structure degrade without it. Nano's job is routing only.
3. **Dispatch loop (our code).** Reads Nano's `{tool, args}`, looks the tool up in the registry, calls its `execute`, renders the result, feeds it back into the transcript. ~30 lines. This is the piece that actually invokes tools — not Nano, not any agent.
4. **Tool registry.** Every capability registered once via `document.modelContext.registerTool(...)`. Our dispatcher calls tools through this registry, so WebMCP is the single source of truth for "what the app can do." Each tool wraps a built-in Chrome AI API or app logic.

**Data flow per turn:** user message -> Nano routes -> dispatcher calls tool -> tool runs a built-in AI API on-device -> result renders in chat + updates the invoice/reply/payout panels.

```
[ Chat UI ] --msg--> [ Nano: route to {tool,args} ] --> [ our dispatcher ]
                                                              |
                                        looks up in document.modelContext registry
                                                              v
                                   [ tool.execute -> built-in Chrome AI API ]
                                                              |
                                          result --> chat chip + panel update
```

## 6. Built-in API -> tool mapping

| Tool | Wraps (Chrome built-in) | Phase | Confirm? |
|---|---|---|---|
| `extract_invoice` | Prompt API — image input + structured output (JSON) | offline | no |
| `detect_language` | Language Detector | offline | no |
| `translate_document` | Translator | offline | no |
| `summarize_terms` | Summarizer | offline | no |
| `check_document` | app math + Prompt API reasoning (line-item sum vs total, format sanity) | offline | no |
| `draft_reply` | Writer | offline | no |
| `restyle_reply` | Rewriter (Formal <-> Friendly, shorten/expand) | offline | no |
| `polish_reply` | Proofreader (grammar/spelling — vital in a 2nd language) | offline | no |
| `queue_payout` | app logic — stage a **signed, idempotent** instruction locally | offline | **yes** |
| `settle_payout` | app logic (mocked rail) — transmit minimal instruction | **online** | **yes** |

Every current built-in AI API is load-bearing; nothing is decorative.

## 7. The offline / online boundary (the product)

| Phase | Tools | Network |
|---|---|---|
| Understand & prepare | extract, detect, translate, summarize, check, draft, restyle, polish, queue | **none** — airplane mode ON |
| Settle | settle_payout | **required** — airplane mode OFF, one beat only |

`queue_payout` stages a signed instruction offline; `settle_payout` is a separate tool that only works with the link up and transmits `{recipient_token, amount, currency, idempotency_key}` — **no image, no PII**.

## 8. Demo script (5 beats)

1. **Airplane mode ON.** Drop a Japanese invoice into the chat. Say *"read it."* -> `extract_invoice`, `detect_language -> ja`. Invoice card populates.
2. *"Translate it and give me the gist."* -> `translate_document`, `summarize_terms`.
3. *"Draft a reply: I'll pay in two weeks, ask for a PDF. Make it formal, then proofread, then in Japanese."* -> `draft_reply -> restyle_reply -> polish_reply -> translate_document`.
4. *"Queue the payout."* -> `queue_payout` fires; confirmation dialog; signed instruction staged locally. Still offline.
5. **Flip network ON.** *"Settle it."* -> `settle_payout` with confirmation; show the outbound payload on screen — a few structured fields, no image, no PII. Line: *"Everything that understood this document happened with the cable pulled. The only thing that ever crossed the network was the money-movement instruction."*

## 9. Built-in AI dependency & risk (Chrome 150, July 2 2026)

| Capability | Status | Path | Risk |
|---|---|---|---|
| Prompt API (text/image in, structured out) | Stable (148) | direct | Low. |
| Summarizer / Translator / Language Detector | Stable | direct | Low. Desktop-only; language packs download on first use — **pre-warm before the talk**. |
| Writer / Rewriter | OT lapsed (137->148) | localhost flag `#optimization-guide-on-device-model` | Med. Localhost demo fine; keep canned fallback text. |
| Proofreader | OT lapsed (141->145) | localhost flag | Med. Same. |
| WebMCP (`document.modelContext`) | OT 149->156 | flag `#enable-webmcp-testing`; origin-isolated only | Low for us — we call our own registry; no external consumer needed. |
| Nano routing quality | — | single-hop routing, tight schemas | **High.** ~15–24% task-failure. Mitigate: few tools, sharp descriptions, deterministic chaining, pinned eval per release. |

**Cadence:** Chrome goes to a 2-week release cycle from Chrome 153 (Sept 2026). Re-run the prompt-eval suite every release; a regression on beats 1–4 is a blocker.

## 10. Degradation tiers (stage insurance)

1. **Tier 1 (target):** real Nano + all APIs. Everything below is fallback only.
2. **Tier 2:** no audio/mic (skip voice; text composer is primary anyway).
3. **Tier 3:** Nano absent -> deterministic keyword router + canned tool outputs, badged, so the flow still runs on any machine (and in a plain preview).

Each tool has a mock fallback returning realistic canned data on capability-detection failure.

## 11. Security & correctness

- Sensitive tools (`queue_payout`, `settle_payout`) show a **confirmation dialog** before firing — the model proposes, a human confirms.
- The staged instruction is **signed + idempotent** (hash + nonce + idempotency key) so an offline-queue-then-online-settle flow can't double-send on reconnect.
- **Minimal payload** on settle: recipient token + amount + currency + idempotency key only. Never the documents.
- **No PII persistence** — extracted data lives in memory for the session; nothing written to storage.
- WebMCP `tools` Permissions Policy defaults to `self` — noted for completeness, though we have no cross-origin surface.

## 12. Success criteria (demo, not product)

- Five beats complete with the network provably down through beats 1–4.
- The offline/online boundary is *visible* (airplane indicator + per-tool phase chips) without narration.
- The minimal-payload reveal in beat 5 is legible on the projector.
- No overclaim survives Q&A: the offline-settlement correction is demonstrated *by the demo itself*.

## 13. Build milestones

1. **Chat shell + registry + dispatcher + Tier-3 mock brain.** Runs anywhere; proves the whole five-beat flow with canned data.
2. **Wire real Nano routing** (`document.modelContext` registration; `responseConstraint`; explicit output language) + `extract_invoice` (image input).
3. **Language tools** (detect / translate / summarize) + **writing tools** (draft / restyle / polish) as real API calls.
4. **Offline `queue` / online `settle` split** + confirmation dialogs + signed instruction + minimal-payload reveal + airplane-mode indicator.
5. **Dress rehearsal on the M3:** pre-warm model + language packs, pin eval suite, verify origin isolation on the serving localhost.

## 14. Open questions

- `draft_reply` in the target language: draft in English -> translate (more reliable with a small model) vs. ask Writer to draft directly in Japanese. Default to draft-then-translate.
- Payoneer sample invoice: use a realistic JP->USD freelance invoice as the demo fixture; confirm figures for the check_document math.

---
*Confirmed on the target machine: the app is the chat, Nano routes, our dispatcher calls the tools, tools are registered via `document.modelContext`, everything on-device in one Chrome tab. No external agent. The offline-settlement correction and the minimal-payload reveal are load-bearing to the talk's credibility.*
