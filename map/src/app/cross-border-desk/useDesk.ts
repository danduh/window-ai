// State-machine hook for the Cross-Border Desk (§4.9).
//
// useReducer(deskReducer, initialState) is the SINGLE state writer. Tools return
// ToolResult{resultLine, mocked, mutation} — the dispatcher applies `mutation`
// through this reducer; tools never write state directly. The hook owns tier
// detection, StrictMode-hardened tool registration (with cleanup), the confirm
// bridge, and all UI handlers. It returns EXACTLY the useDesk() shape pinned in
// the cross-module interface.

import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  BEATS,
  INVOICE,
  NET_OFF_MSG,
  NET_ON_MSG,
  SEED_ASSISTANT,
} from './brain';
import { perApiTier, selectTier } from './capabilities';
import {
  dispatch as runDispatch,
  type DispatchCtx,
  type DispatchSeed,
} from './orchestrator';
import {
  buildToolDefs,
  makeCallTool,
  registerDeskTools,
  type DeskToolDef,
} from './registry';
import type { ToolCtx } from './tools/shared';
import type {
  AttachmentRef,
  Beat,
  ConfirmKind,
  DeskAction,
  DeskState,
  Tier,
} from './types';
// Real demo invoice image (JP freelance invoice matching the INVOICE fixture).
// Used by the "Use demo invoice" attach action; on Tier 1 the multimodal
// extract reads its actual pixels, on Tier 3 it's shown but the mock is used.
import demoInvoice from '../../assets/invoice-2026-0614.png';

// ── Sample invoice attachment (§6) ──────────────────────────────────────────
const SAMPLE_ATTACH: AttachmentRef = {
  file: INVOICE.file,
  dataUrl: demoInvoice,
  kind: 'sample',
};

// ── ID generation ─────────────────────────────────────────────────────────────
let seedCounter = 0;
function nextId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  seedCounter += 1;
  return `msg_${seedCounter}`;
}

// ── Initial state (§4.9) ──────────────────────────────────────────────────────
function makeInitialState(tier: Tier = 3): DeskState {
  return {
    tier,
    layout: 'panels',
    presenterRail: true,
    online: false,
    busy: false,
    pendingAttach: null,
    // Fixed id keeps the reducer (RESET → makeInitialState) pure — no nextId()
    // side effect inside deskReducer. There is only ever one seed message.
    transcript: [{ id: 'seed', k: 'a', text: SEED_ASSISTANT }],
    invoice: null,
    detected: null,
    translated: null,
    summary: null,
    replies: [null, null, null, null],
    payout: null,
    settled: null,
    showEn: true,
    replyIx: 0,
    confirm: null,
  };
}

const initialState: DeskState = makeInitialState(3);

// ── Reducer (single state writer, §4.9) ────────────────────────────────────────
export function deskReducer(state: DeskState, action: DeskAction): DeskState {
  switch (action.type) {
    case 'SET_TIER':
      return { ...state, tier: action.tier };
    case 'ADD_MSG':
      return { ...state, transcript: [...state.transcript, action.msg] };
    case 'UPDATE_CHIP':
      return {
        ...state,
        transcript: state.transcript.map((m) =>
          m.id === action.id ? { ...m, ...action.patch } : m,
        ),
      };
    case 'SET_BUSY':
      return { ...state, busy: action.busy };
    case 'SET_PENDING_ATTACH':
      return { ...state, pendingAttach: action.att };
    case 'SET_ONLINE':
      return { ...state, online: action.online };
    case 'SET_INVOICE':
      return { ...state, invoice: action.invoice };
    case 'SET_INVOICE_CHECK':
      return state.invoice
        ? { ...state, invoice: { ...state.invoice, check: action.check } }
        : state;
    case 'SET_DETECTED':
      return { ...state, detected: action.detected };
    case 'SET_TRANSLATED':
      return { ...state, translated: action.translated };
    case 'SET_SUMMARY':
      return { ...state, summary: action.summary };
    case 'SET_REPLY': {
      const replies = state.replies.slice();
      replies[action.index] = action.reply;
      // Progressive selection: move to the highest non-null index.
      let highest = state.replyIx;
      for (let i = 0; i < replies.length; i += 1) {
        if (replies[i]) highest = i;
      }
      return { ...state, replies, replyIx: highest };
    }
    case 'SET_PAYOUT':
      return { ...state, payout: action.payout };
    case 'SET_SETTLED':
      return { ...state, settled: action.settled };
    case 'SET_SHOW_EN':
      return { ...state, showEn: action.showEn };
    case 'SET_REPLY_IX':
      return { ...state, replyIx: action.replyIx };
    case 'SET_CONFIRM':
      return { ...state, confirm: action.confirm };
    case 'RESET':
      // Fresh seed message; preserve the detected tier.
      return makeInitialState(state.tier);
    default:
      return state;
  }
}

// ── The useDesk() shape (cross-module interface — FINAL) ────────────────────────
export interface UseDeskReturn {
  state: DeskState;
  speed: number;
  handlers: {
    send(text: string): void;
    attachSample(): void;
    attachFile(file: File): void;
    attachCapture(dataUrl: string): void;
    clearAttach(): void;
    toggleNet(): void;
    resetAll(): void;
    selectLang(showEn: boolean): void;
    selectReply(ix: number): void;
    runBeat(beat: Beat): void;
    confirmResolve(ok: boolean): void;
  };
}

const SPEED = 1;

export function useDesk(): UseDeskReturn {
  const [state, rawDispatch] = useReducer(deskReducer, initialState);

  // Live refs so async dispatch loops / tool ctx always read the latest values.
  const stateRef = useRef(state);
  stateRef.current = state;

  const apiLiveRef = useRef<Record<string, boolean>>({});
  const defsRef = useRef<DeskToolDef[] | null>(null);
  const confirmResolverRef = useRef<((ok: boolean) => void) | null>(null);
  // Synchronous in-flight guard — closes the busy-lock race (SET_BUSY only lands
  // after the first await, so a second send in that window would otherwise slip
  // through the state.busy check and start a concurrent dispatch loop).
  const runningRef = useRef(false);

  // Effect 1 — mount: detect global tier + per-API liveness. Resolve BOTH before
  // flipping the tier, so a turn can never run on the real (non-3) tier before
  // apiLive is populated (which would force an all-mock first turn).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [tier, apiLive] = await Promise.all([selectTier(), perApiTier()]);
      if (cancelled) return;
      apiLiveRef.current = apiLive;
      rawDispatch({ type: 'SET_TIER', tier });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ToolCtx factory — reads live state / apiLive at call time.
  const getCtx = useCallback(
    (): ToolCtx => ({
      state: stateRef.current,
      speed: SPEED,
      tier: stateRef.current.tier,
      apiLive: apiLiveRef.current,
    }),
    [],
  );

  // Effect 2 — mount: build tool defs + StrictMode-hardened registration.
  useEffect(() => {
    const defs = buildToolDefs(getCtx);
    defsRef.current = defs;
    const cleanup = registerDeskTools(defs);
    return () => {
      if (cleanup) cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Confirm bridge: requestConfirm sets state.confirm and returns a Promise the
  // dialog resolves via confirmResolve(ok).
  const requestConfirm = useCallback(
    (kind: ConfirmKind): Promise<boolean> =>
      new Promise<boolean>((resolve) => {
        confirmResolverRef.current = resolve;
        rawDispatch({ type: 'SET_CONFIRM', confirm: kind });
      }),
    [],
  );

  const confirmResolve = useCallback((ok: boolean) => {
    const resolve = confirmResolverRef.current;
    confirmResolverRef.current = null;
    rawDispatch({ type: 'SET_CONFIRM', confirm: null });
    if (resolve) resolve(ok);
  }, []);

  // ── send: drive one user turn through the dispatch loop ───────────────────
  const send = useCallback(
    (text: string, seed?: DispatchSeed) => {
      const trimmed = text.trim();
      if (!trimmed || stateRef.current.busy || runningRef.current) return;
      const defs = defsRef.current;
      if (!defs) return;
      // Claim the turn synchronously so a second send in the pre-await window
      // (double Enter, rapid beat clicks) can't start a concurrent loop.
      runningRef.current = true;
      const callTool = makeCallTool(defs);
      const ctx: DispatchCtx = {
        getState: () => stateRef.current,
        dispatch: rawDispatch,
        callTool,
        requestConfirm,
        newId: nextId,
        speed: SPEED,
      };
      // Fire-and-forget: the dispatch loop mutates state via the reducer.
      void runDispatch(trimmed, ctx, seed).finally(() => {
        runningRef.current = false;
      });
    },
    [requestConfirm],
  );

  // ── Attachment handlers ───────────────────────────────────────────────────
  const attachSample = useCallback(() => {
    rawDispatch({ type: 'SET_PENDING_ATTACH', att: SAMPLE_ATTACH });
  }, []);

  // Upload: read the chosen image file into a data-URL (stays on-device — the
  // extract tool turns it into a Blob for the multimodal Prompt API).
  const attachFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      // Guard against a non-data-URL result (would otherwise become the string
      // "null" and later fail silently in dataUrlToBlob's fetch()).
      if (typeof result !== 'string' || !result.startsWith('data:')) return;
      rawDispatch({
        type: 'SET_PENDING_ATTACH',
        att: { file: file.name, dataUrl: result, kind: 'upload' },
      });
    };
    reader.onerror = () => {
      // eslint-disable-next-line no-console
      console.warn('[CrossBorderDesk] failed to read attached image:', reader.error);
    };
    reader.readAsDataURL(file);
  }, []);

  // Webcam: the modal captures a frame to a PNG data-URL and calls this.
  const attachCapture = useCallback((dataUrl: string) => {
    rawDispatch({
      type: 'SET_PENDING_ATTACH',
      att: { file: 'webcam-capture.png', dataUrl, kind: 'webcam' },
    });
  }, []);

  const clearAttach = useCallback(() => {
    rawDispatch({ type: 'SET_PENDING_ATTACH', att: null });
  }, []);

  // ── Network toggle (D§2) ──────────────────────────────────────────────────
  const toggleNet = useCallback(() => {
    const next = !stateRef.current.online;
    rawDispatch({ type: 'SET_ONLINE', online: next });
    rawDispatch({
      type: 'ADD_MSG',
      msg: {
        id: nextId(),
        k: 's',
        text: next ? NET_ON_MSG : NET_OFF_MSG,
      },
    });
  }, []);

  const resetAll = useCallback(() => {
    // Clear any dangling confirm resolver / in-flight flag so a fresh run isn't blocked.
    confirmResolverRef.current = null;
    runningRef.current = false;
    rawDispatch({ type: 'RESET' });
  }, []);

  const selectLang = useCallback((showEn: boolean) => {
    rawDispatch({ type: 'SET_SHOW_EN', showEn });
  }, []);

  const selectReply = useCallback((ix: number) => {
    rawDispatch({ type: 'SET_REPLY_IX', replyIx: ix });
  }, []);

  // ── runBeat (presenter rail) ──────────────────────────────────────────────
  // Dispatch the visual state (attachment pill / network toggle + status pill)
  // AND pass the same values as a per-turn `seed`, because send() runs the
  // dispatch loop synchronously up to its first await — before these reducer
  // updates re-render and refresh stateRef. The seed makes THIS turn see them.
  const runBeat = useCallback(
    (beat: Beat) => {
      const seed: DispatchSeed = {};
      if (beat.attach) {
        rawDispatch({ type: 'SET_PENDING_ATTACH', att: SAMPLE_ATTACH });
        seed.attach = SAMPLE_ATTACH;
      }
      if (beat.goOnline && !stateRef.current.online) {
        rawDispatch({ type: 'SET_ONLINE', online: true });
        rawDispatch({
          type: 'ADD_MSG',
          msg: { id: nextId(), k: 's', text: NET_ON_MSG },
        });
        seed.online = true;
      }
      send(beat.msg, seed);
    },
    [send],
  );

  return {
    state,
    speed: SPEED,
    handlers: {
      send,
      attachSample,
      attachFile,
      attachCapture,
      clearAttach,
      toggleNet,
      resetAll,
      selectLang,
      selectReply,
      runBeat,
      confirmResolve,
    },
  };
}

// Re-export BEATS so the presenter rail can import them alongside the hook.
export { BEATS };
