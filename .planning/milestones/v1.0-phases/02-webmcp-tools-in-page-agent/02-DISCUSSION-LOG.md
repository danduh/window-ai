# Phase 2: WebMCP Tools + In-Page Agent - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `02-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-27
**Phase:** 02-webmcp-tools-in-page-agent
**Areas discussed:** Tool source-of-truth, Chat panel layout, Tool execution feedback, Streaming, Tool list visibility, Failure handling, External-agent verification

---

## A. Tool definition source-of-truth

| Option | Description | Selected |
|--------|-------------|----------|
| Single array + 2 adapters | One typed `RecipeTool[]` + adapters for both APIs | |
| Define for WebMCP, derive for LM | WebMCP is canonical; LanguageModel reads back / derives | ✓ |
| Inline in both places | Duplicate definitions, no abstraction | |

**User's choice:** Define for WebMCP, derive for LM
**Notes:** User wants the architecture to model the WebMCP spec's intent — registering tools is the canonical act, the in-page agent is just another consumer of the registered set. Researcher must validate whether `navigator.modelContext` exposes registered-tool enumeration in Chrome 146 Canary; if not, fall back to a local typed array as the source with a `toLanguageModelTools()` adapter.

---

## B. Chat panel layout

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom sticky drawer | Pinned to viewport bottom; recipe full-width above | ✓ |
| Right-side split panel | Recipe left ~60%, chat right ~40% | |
| New 'Chat' tab | Third tab in existing Tabs wrapper | |
| Below the recipe (vertical) | Stacked, scrolls away | |

**User's choice:** Bottom sticky drawer
**Notes:** Demo-friendly — user sees recipe update live while typing. Always reachable on any tab. Matches the visible preview ASCII layout.

---

## C. Tool execution feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Inline tool indicators | `⚙ Calling scaleRecipe(servings: 6)... ✓ done` system messages in chat | ✓ |
| Silent — only assistant text | Tool calls hidden; recipe updates implicitly | |
| Full tool-call detail | Args + result + timing inline (like ToolCallingPage) | |

**User's choice:** Inline tool indicators
**Notes:** Visible enough to demonstrate WebMCP's value, not so verbose it overwhelms the chat.

---

## D. Streaming vs non-streaming

| Option | Description | Selected |
|--------|-------------|----------|
| Non-streaming | session.prompt — matches /tool-calling | |
| Streaming | session.promptStreaming — matches /chat | ✓ |

**User's choice:** Streaming
**Notes:** User picked the harder option over the recommendation. This is a flagged risk — Chrome's tool-call + streaming combo has known quirks (tool calls arrive as deltas during streaming). The researcher must verify the Canary build's behavior. If unstable, fall back to non-streaming and record as a deviation in the plan summary.

---

## E. Tool list visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Compact tool list panel | Names + descriptions in collapsible panel | ✓ |
| 'N tools registered' counter | Pill/badge that expands on click | |
| Hidden | No tool surface | |

**User's choice:** Compact tool list panel
**Notes:** Mirrors `ToolCallingPage` pattern at smaller scale. Demonstrates which tools are registered with `navigator.modelContext` — which is the headline of the WebMCP demo.

---

## F. Failure handling

| Option | Description | Selected |
|--------|-------------|----------|
| Graceful inline messages | Banner-style 'AI not available' in chat; tool errors surfaced to agent; minimal retries | ✓ |
| Minimal — console errors only | Generic 'something went wrong' visible; details in console | |
| Retry-first design | Auto-retry, exponential backoff, progress UI | |

**User's choice:** Graceful inline messages
**Notes:** Match Phase 1's `MissingFlagBanner` styling for the LanguageModel-unavailable inline state. Tool errors return as structured strings the agent can verbalize.

---

## G. External-agent verification helper

| Option | Description | Selected |
|--------|-------------|----------|
| Registration confirmation pill | `✓ 8 tools registered` near header, reactive | ✓ |
| Skip — manual test is enough | No on-page UI; rely entirely on Tool Inspector extension | |
| Full debug panel | Tool list + invocation log + force re-register | |

**User's choice:** Registration confirmation pill
**Notes:** Helps the user (and the manual MCP-05 verification) confirm tools are live before opening the inspector.

---

## Claude's Discretion

- System prompt content for the in-page agent
- Tool error message wording
- Exact chat drawer height / responsive breakpoints
- Registration pill placement (header vs Tabs bar)

## Deferred Ideas

- V2-08 follow-on tools (convertToMetric, simplifyInstructions, findSubstitute, addStep, reorderSteps)
- V2-03 production-quality error states
- V2-02 live deployment
- V2-07 recipe creation from blank
- Tool-result streaming / async handlers (explicitly out of scope per REQUIREMENTS.md)
