# Cross-Border Desk — Authoritative Implementation Plan

Single source of truth for building the **Cross-Border Desk** as a real React 19 feature in the `map` Nx app (webpack + Tailwind, TypeScript strict). This plan merges the design/pixel spec, the architecture spec, and the reuse map. Implementers follow it verbatim — file tree is LOCKED, type contracts are FINAL, and every string is copied character-for-character from `brain.js` (including `¥`, `≈`, `…`, `×`, em-dashes `—`, curly quotes `“ ”`, and all Japanese text).

> Environment already verified (do not re-scaffold):
> - `map/src/styles.scss` already declares the 4 `@font-face` blocks (Avenir Next World Regular/Medium/Demi/Bold), `--font-family-base`, and `--shadow-card-soft`. **No SCSS work required beyond adding the `@keyframes cbd-pulse` block (see §6).**
> - `map/src/assets/fonts/` holds the 4 OTFs; `map/src/assets/payoneer-logo.png` is copied.
> - `map/tsconfig.app.json` globs `src/**/*.ts` / `*.tsx` → ambient `.d.ts` files auto-resolve with **no tsconfig change**.
> - `map/src/main.tsx` wraps `<App/>` in `<BrowserRouter>` (StrictMode on). `map/src/app/app.tsx` is a scaffold to be replaced.

---

## 1. Overview + PRD thesis

The Cross-Border Desk is an **on-device payments copilot**. A chat where the user drops a Japanese invoice; the app reads it, translates it, summarizes the terms, drafts/refines a reply, and stages then settles a payout — every step showcasing Chrome's built-in AI. **The chat IS the app.** Gemini Nano's only job is to route a single user turn to exactly **one** tool via Prompt-API structured output; our own deterministic dispatch loop expands multi-tool chains, calls each tool through a WebMCP registry (`document.modelContext`), and feeds results back into the transcript and side-rail panels. Every tool wraps a real Chrome built-in AI API and has a **Tier-3 deterministic mock fallback** so the 5-beat demo runs on any machine (even a plain preview with no Nano).

**PRD thesis — the three load-bearing claims the demo proves on a projector:**

1. **Intelligence on-device.** Reading, translating, summarizing, drafting, proofreading, and validating an invoice all run through Chrome's built-in APIs (Prompt / Translator / LanguageDetector / Summarizer / Writer / Rewriter / Proofreader) with the network provably OFF (airplane indicator; every chip badged `on-device`). Beats 1–4 complete with the cable pulled — enforced by construction, not narration.
2. **Settlement on the rail.** Only `settle_payout` is `phase:"online"`. It is the single moment the network is used, gated behind a human confirm and an explicit online guard. Money moves on the payment rail; nothing else does.
3. **PII never on the wire.** When settle finally transmits, it sends exactly four fields — `recipient_token`, `amount`, `currency`, `idempotency_key`. The invoice image, vendor name, bank details, line items, every draft, and the local `signature`/`nonce` **never leave the device**. The "What crossed the network" privacy card and the settle confirm dialog make the minimal payload legible before and after it is sent.

---

## 2. LOCKED file tree

All paths under `/Users/danielos/dev/window-ai/map/src/app/`. Every file below is created; nothing else in `map/` is touched except `app.tsx` (§6) and `styles.scss` (one keyframe block, §6).

```
map/src/app/
  types/
    dom-chromium-ai.d.ts          # AMBIENT: copy verbatim from chat/src/app/types/ — LanguageModel class + window.{Summarizer,Writer,Rewriter,Translator,LanguageDetector,Proofreader}. Script-mode, no top-level import/export.
    webmcp.d.ts                   # AMBIENT: copy verbatim from chat/src/app/types/ — Document/Navigator.modelContext, ModelContext, ModelContextTool. Ends with `export {}` but only augments via `declare global`.
  cross-border-desk/
    CrossBorderDesk.tsx           # ROOT component: 100vh flex column (Header → Main → PresenterRail) + ConfirmDialog overlay; owns useDesk(); wires all panels. This is the map home route.
    types.ts                      # ALL shared TS contracts (§3): ToolName, Tier, ToolMeta, ToolResult, InvoiceItem, InvoiceData, DetectedLang, TranslatedDoc, ReplyVariant, PayoutData, MinimalPayload, Msg, DeskState, DeskAction, RouteDef, Beat, ConfirmKind.
    tokens.ts                     # Frozen palette + shadow/font/mono constants (all inline hexes from the design spec) as typed string consts. Single import site for colors.
    icons.tsx                     # BillYen + SecurePayment inline SVG React components (fill="currentColor", size prop). Logo is a PNG import, not here.
    brain.ts                      # Tier-3 data + typed 1:1 port of brain.js: TOOLS, INVOICE, SUMMARY, REPLIES, PAYOUT, RESULTS, ROUTES, FALLBACK, NEEDS_INVOICE, NEEDS_PAYOUT, OFFLINE_BLOCK, BEATS, plus SEED_ASSISTANT + net toggle messages. Exports keywordChain() + routeReplyFor() + CHAINS.
    capabilities.ts               # Tier detection: selectTier() → 1|2|3 (Nano availability + mic probe); per-API probe map perApiTier(); safeAvailable() wrapper. Runs once at mount.
    orchestrator.ts               # Nano routing (Prompt API + ROUTE_SCHEMA responseFormat, outputLanguage:'en') → nanoChain(); ROUTE_SCHEMA + ROUTING_SYSTEM_PROMPT; keyword fallback delegated to brain.keywordChain; checkPreconditions() guard; the ~30-line dispatch() loop.
    registry.ts                   # buildToolDefs() → ModelContextTool[] from tools/*; registerDeskTools() = StrictMode-hardened document.modelContext.registerTool loop w/ page-unique AbortController + duplicate-name guard; callTool() lookup shim.
    useDesk.ts                    # State-machine hook: useReducer(deskReducer, initialState) + all UI handlers (send, attachSample, clearAttach, toggleNet, resetAll, selectReply, selectLang, confirmResolve, runBeat). Owns capability detection + registration effects. Returns {state, handlers}.
    tools/
      invoiceTools.ts             # extract_invoice, detect_language, translate_document, summarize_terms, check_document — real API call w/ per-tool mock fallback + latency sim.
      replyTools.ts               # draft_reply, restyle_reply, polish_reply — Writer/Rewriter/Proofreader wrappers w/ mock fallback.
      payoutTools.ts              # queue_payout (sign+stage local), settle_payout (mock rail, minimal 4-field payload) — app logic, no external API.
      shared.ts                   # ToolCtx type, mockResult(name), simulateLatency(ms, speed), makeToolResult() helper shared across the 3 tool files.
    components/
      Header.tsx                  # 60px header: logo, divider, title, on-device pill, spacer, tier pill, network toggle button.
      ChatTranscript.tsx          # Scroller + inner 680px column; maps state.transcript → message renderers; auto-scroll to bottom; typing indicator when busy.
      messages/
        UserMessage.tsx           # m.k==="u": right bubble + optional InvoiceAttachmentCard above it.
        AssistantMessage.tsx      # m.k==="a": left grey bubble.
        StatusPill.tsx            # m.k==="s": centered system note pill.
        ToolChipMessage.tsx       # m.k==="t": tool chip (status dot, name, api label, phase pill, result line).
        PrivacyCard.tsx           # m.k==="p": dark "What crossed the network" card (4 monospace fields + footer).
        InvoiceAttachmentCard.tsx # the 220px JA attachment card rendered inside UserMessage when m.att is set.
        TypingIndicator.tsx       # 3 staggered pulsing dots.
      Composer.tsx                # footer: pending-attach pill + attach button + text input (focus ring) + Send button.
      SideRail.tsx                # 380px aside (layout==="panels"); empty state OR ordered cards; hosts the 4 card components.
      cards/
        InvoiceCard.tsx           # vendor halo, detected pill, lang toggle (原文/English), line items, total + USD/FX.
        GistCard.tsx              # "The gist" + 4 purple-bulleted key points.
        ReplyCard.tsx             # "Reply" + progressive tabs (Draft·EN/Formal/Polished/日本語) + pre-wrap body.
        PayoutCard.tsx            # "Payout instruction" halo (staged/settled), state pill, 4 monospace fields, staged/settled note.
      PresenterRail.tsx           # dark footer: "Demo script" label, 5 beat buttons (number/✓ circle), spacer, Reset.
      ConfirmDialog.tsx           # scrim + dialog for queue|settle: title/body/data-box/Cancel/OK variants.
```

**Import rule:** never import across the Nx boundary from `chat/`. The two `.d.ts` files and the `modelContext` helper logic are **copied** into `map`. `types/*.d.ts` are ambient — never `import` them.

---

## 3. Complete shared TS contracts (`types.ts`)

Write this file first; every other file imports from it. This is FINAL — parallel implementers agree on these shapes.

```ts
// ── Tiers ────────────────────────────────────────────────────────────────
export type Tier = 1 | 2 | 3;

// ── Tool identity ────────────────────────────────────────────────────────
export type ToolName =
  | 'extract_invoice' | 'detect_language' | 'translate_document'
  | 'summarize_terms' | 'check_document' | 'draft_reply'
  | 'restyle_reply' | 'polish_reply' | 'queue_payout' | 'settle_payout';

/** Superset including the Nano "no tool fits" sentinel. */
export type RouteToolName = ToolName | 'none';

export type Phase = 'offline' | 'online';

export interface ToolMeta {
  api: string;        // e.g. "Prompt API · image → JSON"
  phase: Phase;
  ms: number;         // Tier-3 simulated latency (chip animation)
  confirm?: boolean;  // true → dispatcher awaits ConfirmDialog first
}

// ── Domain data (from brain.js) ──────────────────────────────────────────
export interface InvoiceItem { ja: string; en: string; amt: string; }

export interface InvoiceData {
  file: string;
  vendor: string;        // JA — "佐藤デザイン事務所"
  vendorEn: string;      // EN — "Sato Design Studio"
  number: string;        // "INV-2026-0614"
  issued: string;        // "June 14, 2026"
  due: string;           // "July 14, 2026"
  currency: string;      // "JPY"
  totalDisplay: string;  // "¥479,600"
  usd: string;           // "≈ $2,973.71 USD"
  fx: string;            // "1 USD = 161.28 JPY"
  langName: string;      // "Japanese"
  langCode: string;      // "ja"
  confidence: string;    // "98%"
  recipientToken: string;// "rcp_7f3a…9c21"
  items: InvoiceItem[];
  check?: { itemsSumToTotal: boolean; datesOk: boolean; taxOk: boolean }; // set by check_document
}

export interface DetectedLang { code: string; name: string; confidence: string; } // "ja","Japanese","98%"
export interface TranslatedDoc { text: string; items: InvoiceItem[]; }             // translate_document(en)

export interface ReplyVariant {
  label: string;   // "Draft · EN" | "Formal" | "Polished" | "日本語"
  tool: ToolName;  // origin tool (draft/restyle/polish/translate)
  text: string;    // multi-line, \n preserved
}

export interface PayoutData {
  recipient_token: string; // "rcp_7f3a…9c21"
  amount: string;          // "479600"
  currency: string;        // "JPY"
  idempotency_key: string; // "idk_9f2e41ac-07c2"
  signature: string;       // "sha256:7b3c19…e91f" — stays local
  nonce: string;           // "n_58d13a" — stays local
}

/** Exactly the four fields that cross the wire on settle. No PII, no docs. */
export interface MinimalPayload {
  recipient_token: string;
  amount: string;
  currency: string;
  idempotency_key: string;
}

export interface SettleResult { payload: MinimalPayload; status: '202 Accepted'; }

// ── Transcript messages (kinds a/u/s/t/p) ────────────────────────────────
export type MsgKind = 'a' | 'u' | 's' | 't' | 'p';
export type ChipStatus = 'running' | 'done' | 'error';

export interface AttachmentRef { file: string; dataUrl: string; }

export interface Msg {
  id: string;
  k: MsgKind;
  // k==="a" | "u" | "s": plain text
  text?: string;
  // k==="u": optional invoice attachment card rendered above the bubble
  att?: AttachmentRef;
  // k==="t": tool chip
  tool?: ToolName;
  status?: ChipStatus;   // running → done | error
  api?: string;          // ToolMeta.api
  phase?: Phase;         // ToolMeta.phase
  result?: string;       // RESULT line (only after done/error)
  mocked?: boolean;      // per-tool fallback used → chip badged "mock"
  // k==="p": privacy card reads state.settled.payload; no extra fields
}

// ── Dispatch result contract (tool.execute return) ───────────────────────
export interface ToolResult {
  resultLine: string;                 // RESULTS[tool] or regenerated line
  mocked: boolean;                    // true if per-tool mock fallback fired
  mutation: DeskAction;               // reducer action the dispatcher applies
}

// ── State machine ────────────────────────────────────────────────────────
export type Layout = 'panels' | 'chat';

export interface DeskState {
  tier: Tier;
  layout: Layout;                     // default "panels"
  presenterRail: boolean;             // default true
  online: boolean;                    // default false (airplane on)
  busy: boolean;                      // typing indicator + input lock
  pendingAttach: AttachmentRef | null;
  transcript: Msg[];
  // panels
  invoice: InvoiceData | null;
  detected: DetectedLang | null;
  translated: TranslatedDoc | null;
  summary: string[] | null;
  replies: (ReplyVariant | null)[];   // fixed length 4: [draft, formal, polished, ja]
  payout: PayoutData | null;
  settled: SettleResult | null;
  // view state
  showEn: boolean;                    // invoice lang toggle (English active by default → true)
  replyIx: number;                    // active reply tab
  // confirm gating (dispatcher awaits resolution)
  confirm: ConfirmKind | null;        // "queue" | "settle" | null
}

export type ConfirmKind = 'queue' | 'settle';

export type DeskAction =
  | { type: 'SET_TIER'; tier: Tier }
  | { type: 'ADD_MSG'; msg: Msg }
  | { type: 'UPDATE_CHIP'; id: string; patch: Partial<Msg> }
  | { type: 'SET_BUSY'; busy: boolean }
  | { type: 'SET_PENDING_ATTACH'; att: AttachmentRef | null }
  | { type: 'SET_ONLINE'; online: boolean }
  | { type: 'SET_INVOICE'; invoice: InvoiceData }
  | { type: 'SET_INVOICE_CHECK'; check: NonNullable<InvoiceData['check']> }
  | { type: 'SET_DETECTED'; detected: DetectedLang }
  | { type: 'SET_TRANSLATED'; translated: TranslatedDoc }
  | { type: 'SET_SUMMARY'; summary: string[] }
  | { type: 'SET_REPLY'; index: number; reply: ReplyVariant }
  | { type: 'SET_PAYOUT'; payout: PayoutData }
  | { type: 'SET_SETTLED'; settled: SettleResult }
  | { type: 'SET_SHOW_EN'; showEn: boolean }
  | { type: 'SET_REPLY_IX'; replyIx: number }
  | { type: 'SET_CONFIRM'; confirm: ConfirmKind | null }
  | { type: 'RESET' };

// ── Routing ──────────────────────────────────────────────────────────────
export interface RouteDef {
  id: string;                         // "settle" | "queue" | "reply" | "translate" | "read"
  test: RegExp;                       // first-match-wins keyword matcher
  chain: ToolName[];                  // full deterministic tool sequence
  needs?: 'invoice' | 'payout';       // precondition guard
  needsAttach?: boolean;              // read requires a dropped attachment
  reply: string;                      // assistant closing line
}

/** One resolved step the dispatcher runs. */
export interface ChainStep { tool: ToolName; args: Record<string, unknown>; }

// ── Presenter ──────────────────────────────────────────────────────────────
export interface Beat {
  n: number;                          // 1..5
  label: string;
  msg: string;                        // injected as a user message
  attach?: boolean;                   // beat 1 drops the sample invoice
  goOnline?: boolean;                 // beat 5 flips network on
}
```

**Contract notes for implementers:**
- `Msg.id` is a monotonically-unique string (`crypto.randomUUID()` or a counter). The dispatcher creates a chip with `status:'running'` then patches it to `done`/`error` via `UPDATE_CHIP` by `id`.
- `replies` is **always length 4**, indices `[0]=Draft·EN, [1]=Formal, [2]=Polished, [3]=日本語`; `null` until its tool runs. Tabs render only for non-null entries (progressive build), but selection uses the fixed index.
- `ToolResult.mutation` is a `DeskAction` so a tool never writes state directly — the reducer is the single writer (arch spec §3.1). The dispatcher applies `mutation` after resolving the chip.

---

## 4. Per-file build instructions

Design-spec section numbers (`D§`) and architecture-spec section numbers (`A§`) are cited so implementers cross-reference exact values.

### 4.1 `types/dom-chromium-ai.d.ts` + `types/webmcp.d.ts`
Copy **verbatim** from `chat/src/app/types/`. Do not edit. Do not import them anywhere. They are script-mode ambient files auto-included by the tsconfig `src/**/*.ts` glob (reuse-map §0). `webmcp.d.ts`'s trailing `export {}` is intentional — keep it.

### 4.2 `tokens.ts`
Export the full palette as `const` string literals (D§0). Group by role; add the two token strings and the mono stack. Example shape:
```ts
export const COLORS = {
  canvas: '#F1F2F7', white: '#FFFFFF', charcoal: '#1E1E28', charcoalHover: '#35353E',
  ink600: '#4B4B53', ink500: '#78787E', ink400: '#A5A5A9', border: '#D9D9D9',
  divider: '#E9E9E9', purple100: '#D5CBFF', purple200: '#C1B1FF', purple500: '#977DFF',
  electric500: '#0033FF', electric600: '#001AE5', electric100: '#99ADFF',
  midnight100: '#E5E9F1', midnight800: '#002373',
  scrim: 'rgba(30,30,40,0.45)', pillClose: 'rgba(30,30,40,0.12)',
  onDark55: 'rgba(255,255,255,0.55)', onDark70: 'rgba(255,255,255,0.7)',
} as const;
export const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
export const SHADOW_CARD_SOFT = 'var(--shadow-card-soft)';
export const FONT_BASE = 'var(--font-family-base)';
export const TRANSITION = 'background 160ms';
```
Components apply these as inline `style={{...}}` (the prototype styles inline; Tailwind is used only for layout convenience where trivial). **Match hexes exactly** — no approximations.

### 4.3 `icons.tsx`
Two components, each `({ size = 20 }: { size?: number })` → `<svg width={size} height={size} fill="currentColor" viewBox=...>`. Color inherits via `currentColor` (D§8):
- `BillYen` — viewBox `0 0 26 16`, banknote outline + ¥ glyph. Used in Composer attach (20) and InvoiceCard halo (22).
- `SecurePayment` — viewBox `0 0 24.884 25.720`, shield-with-card. Used in PayoutCard halo (22).
Recreate the path data from the SVG assets at `.../project/assets/icons/bill-yen.svg` and `secure-payment.svg` (read them at build time; if absent, author faithful equivalents at the stated viewBoxes). Logo: `import logo from '../../assets/payoneer-logo.png'` in Header, rendered `height:22px; width:auto; display:block`.

### 4.4 `brain.ts` — Tier-3 data + router (A§2, port of brain.js)
Port every export from `brain.js` 1:1 with the `types.ts` types. **Copy strings character-for-character** (verified against the file: `¥`, `≈`, `…`, `×`, `—`, `“ ”`, all Japanese, and `“`/`”` curly quotes in FALLBACK/NEEDS_*/etc.).
- `TOOLS: Record<ToolName, ToolMeta>` — exact api/phase/ms/confirm from brain.js lines 5–16.
- `INVOICE: InvoiceData` — lines 18–39. (Sum check: 260000+96000+80000+43600 = 479600 = totalDisplay → `check_document` passes.)
- `SUMMARY: string[]` — lines 41–46 (4 points).
- `REPLIES: ReplyVariant[]` — lines 48–57 (order: draft→formal→polished→ja).
- `PAYOUT: PayoutData` — lines 59–66.
- `RESULTS: Record<ToolName, string>` — lines 69–80.
- `ROUTES: RouteDef[]` — lines 83–99, **order load-bearing** (settle → queue → reply → translate → read).
- `FALLBACK`, `NEEDS_INVOICE`, `NEEDS_PAYOUT`, `OFFLINE_BLOCK` — lines 101–111 (preserve curly quotes).
- `BEATS: Beat[]` — lines 114–120.
- Add UI strings not in brain.js:
  - `SEED_ASSISTANT = "Offline and ready. Drop an invoice — …"` (D§3b initial message — reproduce full sentence: `"Offline and ready. Drop an invoice — I'll read it, translate it, and help you settle, all on this device."` if the prototype's full text is available; otherwise keep the truncated design-spec form).
  - `NET_ON_MSG = "Network on — one beat, settlement only"`, `NET_OFF_MSG = "Network off — airplane mode"` (D§2, status pills).
- Derived helpers:
  - `CHAINS: Partial<Record<ToolName, ToolName[]>>` — Tier-1 continuation map derived from ROUTES chains (A§3.4):
    - `translate_document → [summarize_terms]` (only when entered as the translate route, target en)
    - `draft_reply → [restyle_reply, polish_reply, translate_document]`
    - `extract_invoice → [detect_language]`
  - `keywordChain(msg: string): { route: RouteDef; steps: ChainStep[] } | null` — `ROUTES.find(r => r.test.test(msg))`, expands `chain` to `ChainStep[]` with per-tool args (see §4.7 arg rules).
  - `routeReplyFor(routeId: string): string` — returns the route's `reply`.

### 4.5 `capabilities.ts` — tier detection (A§5.1)
```ts
export async function safeAvailable(fn: () => Promise<string>): Promise<boolean> {
  try { const a = await fn(); return a === 'available' || a === 'downloadable' || a === 'downloading'; }
  catch { return false; }
}
export async function selectTier(): Promise<Tier> {
  if (typeof LanguageModel === 'undefined') return 3;
  const nanoOk = await safeAvailable(() => LanguageModel.availability({ outputLanguage: 'en' }));
  if (!nanoOk) return 3;
  const micOk = await hasMic();     // getUserMedia probe, try/catch → false
  return micOk ? 1 : 2;
}
export async function perApiTier(): Promise<Record<string, boolean>> { /* probe each window.X.availability() independently, try/catch each */ }
```
- Mirror `ChatAIService.getModelCapabilities` robustness: try/catch every `availability()`; never let a drifted runtime crash the mount. Do NOT call `LanguageModel.params()` (Canary dropped it; reuse-map §1a).
- Result stored in `state.tier` at mount. `perApiTier()` feeds each tool's per-API fallback decision (A§5.3). Mic probe only distinguishes Tier 1 vs 2 (voice is not built in this milestone — Tier 2 is a no-op input downgrade; treat identically to Tier 1 for routing/tools).

### 4.6 `orchestrator.ts` — Nano routing + dispatch (A§3)
- `ROUTE_SCHEMA` — the exact JSON Schema from A§3.3 (`tool` enum includes all 10 + `"none"`; `args` object with `target/intent/tone/length/recipient_token/amount/currency/idempotency_key/text`, `additionalProperties:false`). Passed as `responseFormat` (reuse-map §1d — this codebase only uses `responseFormat`, not `responseConstraint`; feature-detect both defensively but send `responseFormat`).
- `ROUTING_SYSTEM_PROMPT` — the one-paragraph prompt from A§3.2 listing the 10 tools + "If nothing fits, tool=`none`."
- `nanoChain(msg, state): Promise<{ route: RouteDef|null; steps: ChainStep[] }>`:
  1. Create session: `LanguageModel.create({ outputLanguage:'en', expectedOutputs:[{type:'text',languages:['en']}], responseFormat: ROUTE_SCHEMA, initialPrompts:[{role:'system',content:ROUTING_SYSTEM_PROMPT}] })`.
  2. `raw = await session.prompt(msg)`; **strip ``` fences defensively** before `JSON.parse` (reuse-map §1d); `session.destroy()`.
  3. `{ tool, args }`. If `tool==='none'` → return `{route:null,steps:[]}`.
  4. Map the entering tool back to its `RouteDef` (for the closing reply + guards), then expand: `steps = [{tool,args}, ...CHAINS[tool].map(t => ({tool:t, args: argsForChainedTool(t, args)}))]`.
  5. On any throw → fall back to `keywordChain(msg)` (per-turn Nano failure is caught here, not fatal).
- `checkPreconditions(route, state): 'ok' | string` (A§4.1):
  - `route.needsAttach && !state.pendingAttach && !state.invoice` → `NEEDS_INVOICE`
  - `route.needs === 'invoice' && !state.invoice` → `NEEDS_INVOICE`
  - `route.needs === 'payout' && !state.payout` → `NEEDS_PAYOUT`
  - route contains any `phase:'online'` tool && `!state.online` → `OFFLINE_BLOCK`
- `dispatch(msg, ctx)` — the ~30-line loop (A§3.5). `ctx` carries `state`, `dispatch` (reducer), `callTool` (registry), `requestConfirm` (returns a Promise<boolean> the useDesk hook resolves via the dialog), and `speed`:
  1. `ADD_MSG` user message (with `att` if `pendingAttach` present; then clear pending attach).
  2. Produce `{route, steps}`: Tier 1 → `nanoChain`; Tier 3 (and Tier 2 treated as 1's routing) → `keywordChain`. If no steps → `ADD_MSG` assistant `FALLBACK`; return.
  3. `guard = checkPreconditions(route, state)`; if `!== 'ok'` → `ADD_MSG` assistant `guard`; return.
  4. `SET_BUSY true`. For each step: if `TOOLS[tool].confirm` → `await requestConfirm(tool==='settle_payout'?'settle':'queue')`; if cancelled → `ADD_MSG` assistant `"Cancelled — nothing was staged or sent."`, `SET_BUSY false`, return. Add running chip (`ADD_MSG` k:'t' status:'running' + api/phase). `result = await callTool(tool, args)`. `UPDATE_CHIP` → status:'done'(or 'error'), result:result.resultLine, mocked:result.mocked. Apply `result.mutation` via reducer.
  5. `ADD_MSG` assistant `routeReplyFor(route.id)`. For the `settle` route, ALSO `ADD_MSG` a `k:'p'` privacy card. `SET_BUSY false`.

### 4.7 `tools/*.ts` + `tools/shared.ts` (A§1, A§5.3)
Each tool is a factory returning `{ meta: ToolMeta, def: ModelContextTool }` or a plain object consumed by `registry.buildToolDefs()`. `execute(input)` pattern (A§5.3):
```ts
execute: async (input) => {
  await simulateLatency(TOOLS[name].ms, speed);        // Tier-3 & fallback pacing
  if (globalTier === 3 || !apiLive[name]) return mockResult(name);
  try {
    const real = await realCall(input, state);
    return makeToolResult(name, lineFrom(real) ?? RESULTS[name], mutationFrom(name, real), false);
  } catch { return mockResult(name); }   // per-tool fallback, mocked:true
}
```
`shared.ts`:
- `ToolCtx { state: DeskState; speed: number; tier: Tier; apiLive: Record<string,boolean> }`.
- `simulateLatency(ms, speed)` → `setTimeout(ms / speed)`.
- `mockResult(name): ToolResult` → `{ resultLine: RESULTS[name], mocked:true, mutation: cannedMutation(name) }` where `cannedMutation` maps each tool to its brain.ts slice:
  - extract_invoice → `SET_INVOICE INVOICE`
  - detect_language → `SET_DETECTED {code:'ja',name:'Japanese',confidence:'98%'}`
  - translate_document(en) → `SET_TRANSLATED {text, items: INVOICE.items}`; translate_document(ja, reply context) → `SET_REPLY index:3 REPLIES[3]`
  - summarize_terms → `SET_SUMMARY SUMMARY`
  - check_document → `SET_INVOICE_CHECK {itemsSumToTotal:true, datesOk:true, taxOk:true}`
  - draft_reply → `SET_REPLY index:0 REPLIES[0]`; restyle_reply → `SET_REPLY index:1 REPLIES[1]`; polish_reply → `SET_REPLY index:2 REPLIES[2]`
  - queue_payout → `SET_PAYOUT PAYOUT`
  - settle_payout → `SET_SETTLED { payload: pickMinimal(PAYOUT), status:'202 Accepted' }`
- `pickMinimal(p)` → `{recipient_token, amount, currency, idempotency_key}` (4 fields only; signature/nonce dropped — thesis claim 3).

**Per-tool arg rules** (used by keywordChain + nanoChain expansion, `argsForChainedTool`):
- `translate_document` in the `translate` route → `{target:'en'}`; the 4th step of the `reply` route → `{target:'ja'}`. Disambiguate the mutation by `args.target`.
- `draft_reply` → `{intent:'confirm receipt; pay within two weeks; ask for PDF', tone:'neutral'}`.
- `restyle_reply` → `{tone:'more-formal', length:'as-is'}`. `polish_reply` → `{}`.
- `queue_payout` → `{recipient_token: PAYOUT.recipient_token, amount: PAYOUT.amount, currency: PAYOUT.currency}`.
- `settle_payout` → `{idempotency_key: PAYOUT.idempotency_key}`.

**Real API wiring (Tier 1)** — mine sibling services (reuse-map §1–5), create→call→destroy, DOMException handling:
- `extract_invoice`: multimodal Prompt API — `LanguageModel.create({expectedInputs:[{type:'text',languages:['en']},{type:'image'}], expectedOutputs:[{type:'text',languages:['en']}], outputLanguage:'en', responseFormat: INVOICE_SCHEMA})`; prompt with content-parts array via the `MultimodalLanguageModel` local-cast (reuse-map §1e) using `state.pendingAttach.dataUrl → Blob`. If the model returns thin data → fall back to `INVOICE`.
- `detect_language`: `window.LanguageDetector` detect on the invoice text; accept `confidence>=0.4 && !=='und'`, else fall back to `ja/98%`.
- `translate_document`: `window.Translator.create({sourceLanguage, targetLanguage})` (ja→en for invoice; en→ja for reply).
- `summarize_terms`: `window.Summarizer.create({type:'key-points', outputLanguage:'en', expectedInputLanguages:['ja','en']})`.
- `check_document`: pure app math (sum items vs total) + optional Prompt-API reasoning; always deterministic pass on the fixture.
- `draft_reply`: `window.Writer` (`tone:'neutral'`, `outputLanguage:'en'`). `restyle_reply`: `window.Rewriter` (`tone:'more-formal'`, `length:'as-is'`, per-call `context`). `polish_reply`: `window.Proofreader`. **All three are flag/OT → gate on `availability()` and fall back to canned REPLIES silently** (A§5.3, reuse-map §4–5) so the demo never stalls.
- `queue_payout` / `settle_payout`: pure app logic, no external API. queue builds the local signed instruction (in memory only, no persistence — A§4.3); settle transmits `pickMinimal` (mock rail; no network call actually made in mock, but gated `online`).

### 4.8 `registry.ts` — WebMCP registration (reuse-map §6, A§7)
- Copy the `getModelContext()` / `isModelContextAvailable()` helpers into this file (or a sibling `modelContext.ts`) verbatim from `chat/src/app/services/modelContext.ts`.
- `buildToolDefs(ctx: ToolCtx): ModelContextTool[]` — 10 entries, each `{ name, description, inputSchema, execute }`. `inputSchema` per A§1 args column.
- `registerDeskTools(defs, onStatus)` — StrictMode-hardened loop with a **page-unique module-scope controller**: `let previousDeskRegistrationController: AbortController | null = null;`. Pre-abort a stale controller, create a fresh one, `registerTool(tool,{signal})` in a try/catch that swallows `/duplicate tool name|already registered/i` and rethrows others. Cleanup `abort()`s (deregisters the whole set atomically). Exactly the `RecipeWorkbenchPage.tsx:166-231` pattern.
- `makeCallTool(defs)` → `callTool(name, args)` looks up the registered def and awaits its `execute` — the dispatcher calls tools ONLY through this shim so `document.modelContext` stays the single source of truth (A§3.5).

### 4.9 `useDesk.ts` — state-machine hook
- `initialState: DeskState`: `{ tier:3, layout:'panels', presenterRail:true, online:false, busy:false, pendingAttach:null, transcript:[{id, k:'a', text:SEED_ASSISTANT}], invoice:null, detected:null, translated:null, summary:null, replies:[null,null,null,null], payout:null, settled:null, showEn:true, replyIx:0, confirm:null }`.
- `deskReducer(state, action)` — pure switch over `DeskAction`; `UPDATE_CHIP` maps `transcript` patching by id; `RESET` returns `initialState` (fresh seed message + tier preserved from a ref). `SET_REPLY` sets `replies[index]` and moves `replyIx` to the highest non-null index (progressive selection), except keep user-selected tab if the user has clicked.
- Effects:
  1. Mount: `selectTier()` → `SET_TIER`; `perApiTier()` → store in a ref for tools.
  2. Mount: build `ToolCtx` (reads latest state via ref), `buildToolDefs`, `registerDeskTools`; cleanup aborts. Empty deps.
- Confirm bridge: `requestConfirm(kind)` sets `state.confirm=kind` and returns a Promise stored in a ref; `confirmResolve(ok)` (called by ConfirmDialog OK/Cancel) resolves it and clears `confirm`. Cancel also pushes the "Cancelled…" assistant line via dispatch (per D§7 / A§4.2).
- Handlers returned: `send(text)`, `attachSample()` (sets `pendingAttach` to the sample invoice — a bundled data-URL/placeholder for `invoice_2026-0614.png`), `clearAttach()`, `toggleNet()` (no-op if same; else `SET_ONLINE` + push status pill NET_ON_MSG/NET_OFF_MSG — D§2), `resetAll()` → `RESET`, `selectLang(showEn)`, `selectReply(ix)`, `runBeat(beat)` (if `beat.attach` → attachSample; if `beat.goOnline` → ensure online; then `send(beat.msg)`), `speed` (default 1).

### 4.10 `CrossBorderDesk.tsx` — root (D§1)
- Outer div: `height:100vh; display:flex; flex-direction:column; overflow:hidden; background:#F1F2F7; fontFamily:FONT_BASE; color:#1E1E28`.
- Children: `<Header/>` (fixed 60px) → `<div style={{flex:1, minHeight:0, display:'flex'}}>` containing `<ChatColumn>` (`<ChatTranscript/>` + `<Composer/>`) and `<SideRail/>` (only when `layout==='panels'`) → `<PresenterRail/>` (when `presenterRail`). `<ConfirmDialog/>` rendered last as fixed overlay when `state.confirm`.
- Pull `{state, handlers}` from `useDesk()`; thread props down. No business logic here.

### 4.11 Components — exact styles
Every component uses the tokens (§4.2) and the exact values below. Cross-reference D§ for pixel-perfect rules.

- **`Header.tsx`** (D§2): flex row, gap 16, padding `0 24px`, height 60, bg white, `border-bottom:1px solid #E9E9E9`, `flex:none`. Logo 22px. Divider 1×24 `#E9E9E9`. Title 16/600 `-0.01em`. On-device pill "On-device · Chrome built-in AI" 12/600 `#4B4B53` bg `#F1F2F7` radius 999 pad `4px 12px`. Spacer `flex:1`. Tier pill text driven by tier: Tier 3 → "Tier 3 · mock brain", Tier 1/2 → "Tier 1 · on-device Nano" (12/600 `#78787E`, border `1px solid #E9E9E9`, radius 999, pad `4px 12px`). Network toggle button per D§2 (offline: bg `#1E1E28`, dot `#977DFF`, "Network off — airplane"; online: bg `#0033FF`, dot `#99ADFF`, "Network on"; `transition:background 160ms`).
- **`ChatTranscript.tsx`** (D§3): scroller `flex:1; overflow-y:auto; padding:28px 32px`; inner `max-width:680px; margin:0 auto; display:flex; flex-direction:column; gap:14px`. `useRef` + `useEffect` scroll-to-bottom on every transcript/busy change. Map each `Msg` by `k` to the right renderer. Append `<TypingIndicator/>` when `state.busy`.
- **`messages/UserMessage.tsx`** (D§3a): wrapper `align-self:flex-end; max-width:72%; align-items:flex-end; gap:8px`. If `m.att` render `<InvoiceAttachmentCard/>` above. Bubble bg `#1E1E28`, color white, radius `14px 14px 4px 14px`, pad `10px 16px`, 15/1.45.
- **`messages/InvoiceAttachmentCard.tsx`** (D§3a): 220px white card, border `#D9D9D9`, radius 12, pad `12px 14px`, shadow soft. Title "請求書" 12/600; vendor "佐藤デザイン事務所 · INV-2026-0614" 10 `#4B4B53`; 4 line rows 9 `#78787E` justify-between (LPデザイン一式/¥260,000 · バナー制作 8点/¥96,000 · 修正対応（2ラウンド）/¥80,000 · 消費税 10%/¥43,600); total row `border-top #E9E9E9` 10/600 (合計/¥479,600); filename "invoice_2026-0614.png" 10 `#A5A5A9`.
- **`messages/AssistantMessage.tsx`** (D§3b): `align-self:flex-start; max-width:78%; bg #F1F2F7; radius 14px 14px 14px 4px; pad 11px 16px; 15/1.5`.
- **`messages/StatusPill.tsx`** (D§3c): centered pill 12/600 `#78787E` bg `#F1F2F7` radius 999 pad `4px 14px`.
- **`messages/ToolChipMessage.tsx`** (D§3d): card `align-self:flex-start; width:100%; max-width:480px; border:1px solid #E9E9E9; radius 10; pad 10px 14px; gap 4`. Header row: status dot 8×8 (running `#0033FF` + `cbd-pulse 1s infinite`; done `#977DFF`; error `#1E1E28`); tool name mono 13/600; api label 12 `#78787E`; spacer; phase pill 11/600 radius 999 pad `2px 10px` (online → "network" bg `#0033FF`/white; offline → "on-device" bg `#C1B1FF`/`#1E1E28`). If `m.mocked`, append a small "mock" tag next to the api label (tier badge — §5). Result line (when set): mono 12, `padding-left:18px`, color `#78787E` (or `#1E1E28` on error).
- **`messages/PrivacyCard.tsx`** (D§3e): dark card bg `#1E1E28` white, radius 14, pad `18px 20px`. Eyebrow "What crossed the network" 12/600 `letter-spacing:0.06em` uppercase `#C1B1FF` mb12. Fields mono 13 gap 6, label span `rgba(255,255,255,0.55)` width 150: reads `state.settled.payload` → `recipient_token`, `amount`, `currency`, `idempotency_key`. Footer border-top `#4B4B53` 13 `rgba(255,255,255,0.7)`: "Never left the device: the invoice image, vendor name, bank details, line items, and every draft."
- **`messages/TypingIndicator.tsx`** (D§3f): 3 dots 7×7 `#A5A5A9`, `cbd-pulse` staggered 0/0.2s/0.4s.
- **`Composer.tsx`** (D§4): container border-top `#E9E9E9` pad `14px 32px`; inner 680 gap 8. Pending-attach pill (when `pendingAttach`) bg `#D5CBFF` with ×-button (bg `rgba(30,30,40,0.12)`, 18×18 circle) → `clearAttach`. Input row gap 10: attach button 40×40 circle border `#D9D9D9` bg white (hover `#F1F2F7`) containing `<BillYen size={20}/>`; text input `flex:1; height:44; border #D9D9D9; radius 8; pad 0 16; 15` focus border `#0033FF` (Enter submits trimmed non-empty → `send`); Send button height 44 pad `0 22` bg `#0033FF` white 14/600 radius 6 hover `#001AE5`. Disable inputs while `busy`.
- **`SideRail.tsx`** (D§5): aside `width:380px; flex:none; overflow-y:auto; padding:20px; gap:14px`. If `railEmpty` (no invoice/summary/replies-any/payout) render dashed empty state (D§5a). Else render, in order, the cards for whichever state slices exist: InvoiceCard → GistCard → ReplyCard → PayoutCard.
- **`cards/InvoiceCard.tsx`** (D§5b): shell white radius 20 shadow pad 20. Halo 40 circle bg `#C1B1FF` with `<BillYen size={22}/>`. Vendor = `showEn ? vendorEn : vendor`; sub-line "INV-2026-0614 · due July 14, 2026" 12 `#78787E`. Detected pill (when `detected`) "JA · 98%" bg `#E5E9F1` `#002373`. Lang toggle (when `translated`): 原文(`showJa`)/English pills, active bg `#1E1E28`/white, inactive white/`#4B4B53`/border `#D9D9D9`; `showEn` drives active (English default). Line items 14, desc `#4B4B53` (JA↔EN by toggle), amt 500. Total row border-top: label "Total"/"合計" 14/600; amount "¥479,600" 20/600; sub "≈ $2,973.71 USD · 1 USD = 161.28 JPY" 12 `#78787E`.
- **`cards/GistCard.tsx`** (D§5c): header "The gist" 15/600 + right "Summarizer" 11/600 `#78787E`. 4 bullets, dot 5×5 `#977DFF`, text 14/1.45.
- **`cards/ReplyCard.tsx`** (D§5d): header "Reply" 15/600 + right "Writer · Rewriter · Proofreader" 11/600. Tabs (one per non-null reply, order fixed) 12/600 radius 999 pad `4px 13px`; active (`i===replyIx`) bg `#1E1E28`/white/border `#1E1E28`, inactive white/`#4B4B53`/`#D9D9D9`; click → `selectReply(i)`. Body: `replies[replyIx].text` `white-space:pre-wrap` 14/1.55 bg `#F1F2F7` radius 12 pad `14px 16px`.
- **`cards/PayoutCard.tsx`** (D§5e): halo 40 circle, bg staged `#C1B1FF` / settled `#99ADFF`, `<SecurePayment size={22}/>`. Title "Payout instruction" 15/600. State pill: staged "Staged · offline" bg `#C1B1FF`/`#1E1E28`; settled "Settled" bg `#0033FF`/white (`settled` = `state.settled !== null`). Fields mono 12.5 gap 6, label width 128 `#78787E`: `amount` 479600 JPY · `recipient_token` rcp_7f3a…9c21 · `idempotency_key` idk_9f2e41ac-07c2 · `signature` sha256:7b3c19…e91f (signature shown here — it's local; it is NOT in the settle payload). Note border-top: staged "Signed and staged on this device. Idempotent — reconnecting can't double-send." / settled "Transmitted: the four fields above. The documents never left this device."
- **`PresenterRail.tsx`** (D§6): dark footer bg `#1E1E28`, flex row gap 10 pad `10px 24px` overflow-x auto. "Demo script" label 11/600 uppercase `rgba(255,255,255,0.55)`. 5 beat buttons: pill border `#4B4B53`, transparent bg (hover `#35353E`), 13/500, number circle 22×22 — not-done shows n bg `#35353E`, done shows "✓" bg `#977DFF`/`#1E1E28`. "Done" = derive per beat from state (beat1: invoice!=null; beat2: summary!=null; beat3: replies[3]!=null; beat4: payout!=null; beat5: settled!=null). Click → `runBeat(beat)`. Spacer. Reset button border `#4B4B53` `rgba(255,255,255,0.7)` (hover white) → `resetAll`.
- **`ConfirmDialog.tsx`** (D§7): fixed scrim `rgba(30,30,40,0.45)` centered. Dialog white radius 20 shadow width 440 pad 28. Title 20/600, body 14 `#4B4B53`, data box bg `#F1F2F7` radius 12 mono 12.5 (rows: amount 479600 JPY · ≈ $2,973.71 · recipient_token rcp_7f3a…9c21 · idempotency_key idk_9f2e41ac-07c2). Buttons: Cancel (border `#D9D9D9`, hover `#F1F2F7`) → `confirmResolve(false)`; OK (bg `#0033FF` hover `#001AE5`) → `confirmResolve(true)`. Variants: queue → title "Queue this payout?", body "Signs and stages the instruction on this device. Nothing is transmitted until you settle.", CTA "Queue payout"; settle → title "Settle this payout?", body "Transmits the three fields below (plus currency) to the payment rail. No documents, no PII.", CTA "Settle now".

---

## 5. Tier strategy

**Detection** (`capabilities.ts`, run once at mount):
1. `LanguageModel` undefined or `availability()` not usable → **Tier 3**.
2. Nano usable + mic present → **Tier 1**. Nano usable + no mic → **Tier 2** (voice not built this milestone; routing/tools identical to Tier 1 — a pure input-modality note).

**Routing by tier:**
- Tier 1/2 → `nanoChain()` (Nano single hop + `CHAINS` expansion). On any Nano throw, silently fall back to `keywordChain()` for that turn.
- Tier 3 → `keywordChain()` (deterministic `ROUTES.find`) returns the whole chain up front. Same downstream code path.

**Per-tool fallback** (independent of global tier): each tool checks `apiLive[name]` (from `perApiTier()`). If its backing API is not live, or the real call throws, `execute` returns `mockResult(name)` (canned brain.ts slice + `RESULTS[name]` line + `mocked:true`). This lets extract/translate stay real while Writer/Rewriter/Proofreader (flag/OT) fall back to canned reply text — the 5-beat flow never stalls.

**Header badge (the pill):** shows the *global* tier:
- Tier 3 → **"Tier 3 · mock brain"** (`#78787E`, border `#E9E9E9`).
- Tier 1/2 → **"Tier 1 · on-device Nano"**.
Additionally, any chip whose tool fell back (`m.mocked`) shows a small **"mock"** tag next to its API label (D§3d region), so a mixed run (real extract, mocked draft) is legible on the projector. Beat flow, panels, and copy are identical across tiers — only routing source and the badge/mock tags differ.

---

## 6. Wiring

**Home route** — replace `map/src/app/app.tsx` scaffold:
```tsx
import { Route, Routes } from 'react-router-dom';
import { CrossBorderDesk } from './cross-border-desk/CrossBorderDesk';
export function App() {
  return (<Routes><Route path="/" element={<CrossBorderDesk />} /></Routes>);
}
export default App;
```
`main.tsx` (`BrowserRouter` + `StrictMode`) is unchanged. **The StrictMode-hardened registration in `registry.ts` is mandatory** — StrictMode double-mounts (reuse-map §6b).

**styles.scss** — already has `@font-face`×4, `--font-family-base`, `--shadow-card-soft` (verified). **Add only** the keyframe (D§1) and body base if not present:
```scss
@keyframes cbd-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
body { font-family: var(--font-family-base); font-size: 16px; line-height: 155%; box-sizing: border-box; }
*, *::before, *::after { box-sizing: border-box; }
```

**Assets** — `map/src/assets/payoneer-logo.png` (copied). Import in Header via webpack asset handling: `import logo from '../../assets/payoneer-logo.png'`. Fonts already referenced by styles.scss. The sample invoice image for `attachSample()`: bundle a small `invoice_2026-0614.png` under `map/src/assets/` (or a data-URL constant in brain.ts) so the attachment pill + multimodal extract have a real Blob; if the real asset is unavailable, use a 1×1 placeholder data-URL — Tier-3 extract ignores the pixels anyway.

**Origin isolation** — serve on clean `localhost:4200` (webpack devServer). Never set `document.domain` (WebMCP disabled otherwise — A§7).

**No persistence** — all extracted data lives in the reducer for the session only. No IndexedDB, no backend.

---

## 7. Build + verify checklist

**Build/typecheck:**
- [ ] `npx nx build map` — clean (TS strict; no `any`/`as any` at API boundaries; multimodal uses the local-cast interface, not ambient edits).
- [ ] `npx nx serve map` — serves at `localhost:4200`; home route renders the desk; Avenir Next World loads (inspect a header element's `font-family`).
- [ ] No console errors on mount; tier pill resolves (Tier 3 on a plain machine, Tier 1 with Nano).

**The 5 beats (via presenter rail, network OFF at start):**
- [ ] Beat 1 "Read it." (+ sample attached) → chips `extract_invoice` (on-device, ~1.5s pulse) → `detect_language`; InvoiceCard populates (vendor, items, total, "JA · 98%" pill); assistant closing line matches `read` route.
- [ ] Beat 2 "Translate it and give me the gist." → `translate_document`(en) → `summarize_terms`; InvoiceCard gains lang toggle (English active), GistCard shows 4 bullets.
- [ ] Beat 3 "Draft a reply…" → `draft_reply` → `restyle_reply` → `polish_reply` → `translate_document`(ja); ReplyCard builds 4 tabs in order, 日本語 last; tab switching works, body preserves newlines.
- [ ] Beat 4 "Queue the payout." → ConfirmDialog (queue variant) → OK → `queue_payout` chip (on-device); PayoutCard "Staged · offline", 4 fields incl. signature; still network OFF.
- [ ] Beat 4 offline proof: with network OFF, "Settle it." → assistant `OFFLINE_BLOCK` verbatim; no `settle_payout` chip fires.
- [ ] Beat 5: flip network ON (button → `#0033FF`, "Network on", status pill) → "Settle it." → ConfirmDialog (settle variant, shows minimal payload) → OK → `settle_payout` chip (phase pill "network"); PayoutCard flips to "Settled"; **PrivacyCard** appears listing exactly `recipient_token`, `amount`, `currency`, `idempotency_key` + the "Never left the device…" footer.

**Guards + gating:**
- [ ] "read it" with no attachment → `NEEDS_INVOICE`. "queue payout" before invoice → `NEEDS_INVOICE`. "settle" before queue → `NEEDS_PAYOUT`.
- [ ] Cancel on either ConfirmDialog → "Cancelled — nothing was staged or sent."; chain aborts, no state mutated.

**Offline/online proof (thesis):**
- [ ] Beats 1–4 complete with network OFF (visually: all chips "on-device"/`#C1B1FF`; airplane button charcoal). Only beat 5 uses "network"/`#0033FF`.
- [ ] Minimal-payload reveal: settle confirm dialog + PrivacyCard both show 4 fields only — no image, vendor, line items, signature, or nonce.

**Tier proof:**
- [ ] Tier-3 path (disable Nano / plain preview): keyword router drives all 5 beats; chips badged "mock"; header pill "Tier 3 · mock brain".
- [ ] Reset button returns to the seeded offline/empty screen.
