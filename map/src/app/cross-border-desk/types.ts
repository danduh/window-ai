// ── Tiers ────────────────────────────────────────────────────────────────
export type Tier = 1 | 2 | 3;

// ── Language ─────────────────────────────────────────────────────────────
export type Lang = 'ja' | 'de' | 'es';

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
export interface InvoiceItem { native: string; en: string; amt: string; }

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
  originalLabel: string;  // toggle label for the untranslated view — "原文" (ja), "Original" (de/es)
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

export interface AttachmentRef {
  file: string;
  dataUrl: string;
  lang?: Lang;
  /**
   * Where the attachment came from. `sample` renders the stylized 請求書 card
   * (design fixture); `upload`/`webcam` render the actual captured image so the
   * user sees exactly what they attached and what the multimodal extract reads.
   */
  kind: 'sample' | 'upload' | 'webcam';
}

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
