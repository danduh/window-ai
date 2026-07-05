// Nano routing + deterministic dispatch loop (A§3).
//
// Gemini Nano's only job is to route ONE user turn to exactly ONE tool via
// Prompt-API structured output. Our own dispatch() loop expands multi-tool
// chains (CHAINS), calls each tool through the WebMCP registry shim, and feeds
// results back into the transcript + panels. Any Nano throw falls back to the
// deterministic keyword router for that turn.

import {
  CHAINS,
  FALLBACK,
  NEEDS_INVOICE,
  NEEDS_PAYOUT,
  OFFLINE_BLOCK,
  ROUTES,
  TOOLS,
  keywordChain,
  routeReplyFor,
} from './brain';
import type {
  AttachmentRef,
  ChainStep,
  ConfirmKind,
  DeskAction,
  DeskState,
  Msg,
  RouteDef,
  ToolName,
  ToolResult,
} from './types';

// ── ROUTE_SCHEMA (A§3.3) ──────────────────────────────────────────────────────
// `tool` enum includes all 10 tools + the "none" sentinel; `args` is an open set
// of the union of every tool's parameters. additionalProperties:false on both.
export const ROUTE_SCHEMA = {
  type: 'object',
  properties: {
    tool: {
      type: 'string',
      enum: [
        'extract_invoice',
        'detect_language',
        'translate_document',
        'summarize_terms',
        'check_document',
        'draft_reply',
        'restyle_reply',
        'polish_reply',
        'queue_payout',
        'settle_payout',
        'none',
      ],
    },
    args: {
      type: 'object',
      properties: {
        target: { type: 'string' },
        intent: { type: 'string' },
        tone: { type: 'string' },
        length: { type: 'string' },
        recipient_token: { type: 'string' },
        amount: { type: 'string' },
        currency: { type: 'string' },
        idempotency_key: { type: 'string' },
        text: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  required: ['tool'],
  additionalProperties: false,
} as const;

// ── ROUTING_SYSTEM_PROMPT (A§3.2) ─────────────────────────────────────────────
export const ROUTING_SYSTEM_PROMPT =
  'You are the router for an on-device payments copilot. Read the user turn and choose exactly ONE tool to start the action, returning JSON {tool, args}. Tools: extract_invoice (read a dropped invoice image), detect_language (identify the invoice language), translate_document (translate the invoice or a reply; args.target is "en" or "ja"), summarize_terms (summarize the invoice terms), check_document (validate the invoice math), draft_reply (write a reply email), restyle_reply (make a reply more formal), polish_reply (proofread a reply), queue_payout (sign and stage the payout locally), settle_payout (transmit the payout on the network). If nothing fits, tool="none".';

/** Maps a tool the Nano router chose back to its entering RouteDef (for reply + guards). */
function routeForEnteringTool(tool: ToolName): RouteDef | null {
  return ROUTES.find((r) => r.chain[0] === tool) ?? null;
}

/** Per-tool args for a chained (follow-on) tool during Nano expansion (§4.7). */
function argsForChainedTool(
  tool: ToolName,
  entering: RouteDef | null,
): Record<string, unknown> {
  switch (tool) {
    case 'summarize_terms':
      return {};
    case 'restyle_reply':
      return { tone: 'more-formal', length: 'as-is' };
    case 'polish_reply':
      return {};
    case 'translate_document':
      // In the draft_reply chain the translate step targets Japanese.
      return { target: entering?.id === 'reply' ? 'ja' : 'en' };
    case 'detect_language':
      return {};
    default:
      return {};
  }
}

/** Defensively strip ``` / ```json fences the model may wrap around JSON. */
function stripFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fenced ? fenced[1].trim() : trimmed;
}

/**
 * Tier-1 routing: ask Nano for a single {tool,args}, then expand via CHAINS.
 * On ANY throw (or tool="none") this resolves gracefully — the caller decides
 * whether to fall back to keywordChain (per-turn Nano failure is not fatal).
 */
export async function nanoChain(
  msg: string,
  _state: DeskState,
): Promise<{ route: RouteDef | null; steps: ChainStep[] }> {
  try {
    // This codebase sends `responseFormat` (reuse-map §1d); we also set
    // `responseConstraint` defensively so runtimes that renamed the field still
    // get the JSON-Schema constraint. `create()` accepts an open options bag.
    const createOptions: Record<string, unknown> = {
      outputLanguage: 'en',
      expectedOutputs: [{ type: 'text', languages: ['en'] }],
      responseFormat: ROUTE_SCHEMA,
      responseConstraint: ROUTE_SCHEMA,
      initialPrompts: [{ role: 'system', content: ROUTING_SYSTEM_PROMPT }],
    };
    const session = await LanguageModel.create(createOptions);
    let raw: string;
    try {
      raw = await session.prompt(msg);
    } finally {
      session.destroy();
    }
    const parsed = JSON.parse(stripFences(raw)) as {
      tool?: string;
      args?: Record<string, unknown>;
    };
    const tool = parsed.tool as ToolName | 'none' | undefined;
    if (!tool || tool === 'none') return { route: null, steps: [] };

    const entering = routeForEnteringTool(tool);
    const enteringArgs = parsed.args ?? {};
    const followOn = CHAINS[tool] ?? [];
    const steps: ChainStep[] = [
      { tool, args: enteringArgs },
      ...followOn.map((t) => ({ tool: t, args: argsForChainedTool(t, entering) })),
    ];
    return { route: entering, steps };
  } catch {
    // Per-turn Nano failure → deterministic keyword fallback.
    return keywordChain(msg) ?? { route: null, steps: [] };
  }
}

/**
 * Precondition guard (A§4.1). Returns 'ok' or the verbatim assistant message to
 * show when a guard trips.
 */
export function checkPreconditions(
  route: RouteDef | null,
  steps: ChainStep[],
  state: DeskState,
): 'ok' | string {
  if (!route) return 'ok';
  if (route.needsAttach && !state.pendingAttach && !state.invoice) {
    return NEEDS_INVOICE;
  }
  if (route.needs === 'invoice' && !state.invoice) return NEEDS_INVOICE;
  if (route.needs === 'payout' && !state.payout) return NEEDS_PAYOUT;
  const hasOnlineTool = steps.some((s) => TOOLS[s.tool].phase === 'online');
  if (hasOnlineTool && !state.online) return OFFLINE_BLOCK;
  return 'ok';
}

/** Everything the dispatch loop needs from the hook. State is read live. */
export interface DispatchCtx {
  getState: () => DeskState;
  dispatch: (action: DeskAction) => void;
  callTool: (
    name: ToolName,
    args: Record<string, unknown>,
  ) => Promise<ToolResult>;
  requestConfirm: (kind: ConfirmKind) => Promise<boolean>;
  newId: () => string;
  speed: number;
}

/**
 * Per-turn overrides that take precedence over `getState()` for THIS turn only.
 * The presenter rail dispatches SET_PENDING_ATTACH / SET_ONLINE and then calls
 * send() in the same synchronous tick — before React re-renders, so `stateRef`
 * (what getState reads) is still stale. The seed carries the just-set values so
 * the user message, the routing state, and the precondition guard all see the
 * truth immediately (beat 1's attachment, beat 5's network-on).
 */
export interface DispatchSeed {
  attach?: AttachmentRef | null;
  online?: boolean;
}

/**
 * The dispatch loop (A§3.5). ~30 lines: add the user turn, route (Nano for
 * Tier 1/2, keywords for Tier 3), guard, then run each step through the registry
 * shim — chip running → done/error, apply the reducer mutation — and close with
 * the route reply (+ privacy card on settle).
 */
export async function dispatch(
  msg: string,
  ctx: DispatchCtx,
  seed?: DispatchSeed,
): Promise<void> {
  const { getState, dispatch: send, callTool, requestConfirm, newId } = ctx;

  // Overlay same-tick seed values (presenter rail) on top of live state.
  const withSeed = (s: DeskState): DeskState =>
    seed
      ? {
          ...s,
          ...(seed.attach !== undefined ? { pendingAttach: seed.attach } : {}),
          ...(seed.online !== undefined ? { online: seed.online } : {}),
        }
      : s;

  // 1. Add the user message (with attachment if one is pending). The pending
  //    attach is NOT cleared yet: extract_invoice consumes its dataUrl as a
  //    Blob, and the precondition guard needs to see it. It is cleared after
  //    the tool loop (step 4) so the attachment survives the whole turn.
  const pending = withSeed(getState()).pendingAttach;
  const userMsg: Msg = {
    id: newId(),
    k: 'u',
    text: msg,
    ...(pending ? { att: pending } : {}),
  };
  send({ type: 'ADD_MSG', msg: userMsg });

  // 2. Route. Tier 1/2 → Nano (with keyword fallback inside); Tier 3 → keywords.
  const state = withSeed(getState());
  const routed =
    state.tier === 3
      ? keywordChain(msg) ?? { route: null, steps: [] }
      : await nanoChain(msg, state);
  const { route, steps } = routed;
  if (steps.length === 0) {
    send({ type: 'ADD_MSG', msg: { id: newId(), k: 'a', text: FALLBACK } });
    return;
  }

  // 3. Precondition guard (pending attach still present, so needsAttach passes).
  const guard = checkPreconditions(route, steps, withSeed(getState()));
  if (guard !== 'ok') {
    // Guard tripped — the turn does nothing; leave the pending attach in place
    // so the user can retry with the same dropped invoice.
    send({ type: 'ADD_MSG', msg: { id: newId(), k: 'a', text: guard } });
    return;
  }

  // 4. Run each step.
  send({ type: 'SET_BUSY', busy: true });
  for (const step of steps) {
    const meta = TOOLS[step.tool];
    if (meta.confirm) {
      const kind: ConfirmKind =
        step.tool === 'settle_payout' ? 'settle' : 'queue';
      const ok = await requestConfirm(kind);
      if (!ok) {
        send({
          type: 'ADD_MSG',
          msg: {
            id: newId(),
            k: 'a',
            text: 'Cancelled — nothing was staged or sent.',
          },
        });
        send({ type: 'SET_BUSY', busy: false });
        return;
      }
    }
    const chipId = newId();
    send({
      type: 'ADD_MSG',
      msg: {
        id: chipId,
        k: 't',
        tool: step.tool,
        status: 'running',
        api: meta.api,
        phase: meta.phase,
      },
    });
    try {
      const result = await callTool(step.tool, step.args);
      send({
        type: 'UPDATE_CHIP',
        id: chipId,
        patch: {
          status: 'done',
          result: result.resultLine,
          mocked: result.mocked,
        },
      });
      send(result.mutation);
    } catch {
      send({
        type: 'UPDATE_CHIP',
        id: chipId,
        patch: { status: 'error', result: 'Tool failed.' },
      });
    }
  }

  // The attachment has now been consumed by the tool chain — clear the pill.
  if (pending) send({ type: 'SET_PENDING_ATTACH', att: null });

  // 5. Closing assistant line; settle route also emits the privacy card.
  if (route) {
    send({
      type: 'ADD_MSG',
      msg: { id: newId(), k: 'a', text: routeReplyFor(route.id) },
    });
    if (route.id === 'settle') {
      send({ type: 'ADD_MSG', msg: { id: newId(), k: 'p' } });
    }
  }
  send({ type: 'SET_BUSY', busy: false });
}
