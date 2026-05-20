# Phase 10: Multimodal Foundation — Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 10 (7 new + 3 modified)
**Analogs found:** 10 / 10

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `chat/src/app/components/Multimodal/MultimodalPage.tsx` | page | request-response | `chat/src/app/components/Proofreader/ProofreaderPage.tsx` | exact |
| `chat/src/app/components/Multimodal/MultimodalHeader.tsx` | component | — | `chat/src/app/components/Proofreader/ProofreaderHeader.tsx` | exact |
| `chat/src/app/components/Multimodal/MultimodalChatPanel.tsx` | component | streaming | `chat/src/app/components/GenerativeUI/GenUIChatPanel.tsx` | role-match |
| `chat/src/app/components/Multimodal/MultimodalTranscript.tsx` | component | streaming | `chat/src/app/components/ChatBox.tsx` (structure only — not reused) | partial |
| `chat/src/app/components/Multimodal/MultimodalInput.tsx` | component | event-driven | `chat/src/app/components/ChatBox.tsx` input area | partial |
| `chat/src/app/services/MultimodalService.ts` | service | streaming | `chat/src/app/services/ProofreaderService.ts` | exact |
| `chat/src/app/components/MissingFlagBanner.tsx` | component | — | itself (reused unchanged) | exact (no modification) |
| `chat/src/app/AppRouter.tsx` | routing-edit | request-response | itself (existing nav + route patterns) | exact |
| `chat/src/app/hooks/useSEOData.ts` | SEO-edit | — | itself (existing seoConfigs pattern) | exact |
| `chat/scripts/prerender-react.js` | config-edit | — | itself (existing route + seoConfigs pattern) | exact |

---

## Pattern Assignments

### `chat/src/app/components/Multimodal/MultimodalPage.tsx` (page, request-response)

**Analog:** `chat/src/app/components/Proofreader/ProofreaderPage.tsx`

**Imports pattern** (lines 1–18):
```tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSEOData, seoConfigs } from '../../hooks/useSEOData';
import { MissingFlagBanner } from '../MissingFlagBanner';
import Tabs from '../Tabs';
import { MultimodalHeader } from './MultimodalHeader';
import { MultimodalChatPanel } from './MultimodalChatPanel';
import {
  getAvailability,
  createWithProgress,
  destroyAllSessions,
} from '../../services/MultimodalService';
```

**PageState type** (mirrors ProofreaderPage.tsx line 20):
```ts
type PageState = 'idle' | 'unavailable' | 'downloading' | 'ready' | 'prompting' | 'error';
```

**Message type** (co-located in this file per CONTEXT.md decision):
```ts
export type Message = {
  id: string;               // crypto.randomUUID()
  role: 'user' | 'assistant';
  text: string;             // assistant streams in; user text is final
  attachedImageUrl?: string; // user-only; object URL from URL.createObjectURL(blob)
};
```

**SEO path-switch pattern** (ProofreaderPage.tsx lines 28–32):
```tsx
const location = useLocation();
// startsWith (NOT includes) per RESEARCH Pitfall 6 — exact-prefix match
const isDocs = location.pathname.startsWith('/multimodal/docs');
useSEOData(
  isDocs ? seoConfigs.multimodalDocs : seoConfigs.multimodal,
  isDocs ? '/multimodal/docs' : '/multimodal',
);
```

**Object URL tracking ref** (CONTEXT.md §Object URL leak prevention):
```tsx
const objectUrlSetRef = useRef<Set<string>>(new Set());
```

**Mount effect — StrictMode-safe availability check** (ProofreaderPage.tsx lines 80–120):
```tsx
useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const availability = await getAvailability();
      if (cancelled) return;
      if (availability === 'unavailable') {
        setPageState('unavailable');
      } else if (availability === 'available') {
        setPageState('ready');
      } else {
        // 'downloadable' | 'downloading'
        setPageState('downloading');
        try {
          await createWithProgress((pct) => {
            if (!cancelled) setDownloadPct(pct);
          });
          if (!cancelled) setPageState('ready');
        } catch (downloadErr) {
          if (!cancelled) {
            const message = downloadErr instanceof Error ? downloadErr.message : 'Model download failed';
            setError(message);
            setPageState('error');
          }
        }
      }
    } catch (err) {
      if (!cancelled) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        setPageState('error');
      }
    }
  })();
  return () => {
    cancelled = true;
    destroyAllSessions();
    objectUrlSetRef.current.forEach(url => URL.revokeObjectURL(url));
  };
}, []);
```

**Tabs ordering — Docs FIRST** (ProofreaderPage.tsx lines 197–218, with comment):
```tsx
// Tabs ordering: Docs FIRST, Chat SECOND.
// Tabs.tsx matches currentPath.includes(tab.path) — the chat tab has path ''
// which matches everything, so the docs tab (path '/docs') MUST come first.
const tabs = useMemo(
  () => [
    { id: 'docs',  label: 'Docs', path: '/docs', content: docsContent },
    { id: 'chat',  label: 'Chat', path: '',      content: chatContent  },
  ],
  [docsContent, chatContent],
);
```

**Page shell JSX** (ProofreaderPage.tsx lines 220–249):
```tsx
return (
  <div className="min-h-screen bg-white dark:bg-gray-800 transition-colors duration-200">
    <div className="max-w-6xl mx-auto p-4">
      {pageState === 'unavailable' && (
        <MissingFlagBanner
          title="Multimodal image input isn't available."
          body="Update to Chrome 148+ stable, or enable the flags below in Chrome 146+ Canary, then reload."
          flags={[
            { name: 'Optimization Guide On Device', url: 'chrome://flags/#optimization-guide-on-device-model', note: 'set to "Enabled BypassPerfRequirement"' },
            { name: 'Prompt API multimodal input', url: 'chrome://flags/#prompt-api-for-gemini-nano-multimodal-input', note: 'set to "Enabled"' },
          ]}
          browserRequirement="Chrome 148+ stable (no flags) or Chrome 146+ Canary"
        />
      )}
      <MultimodalHeader />
      <Tabs basePath="/multimodal" defaultTab="docs" tabs={tabs} />
      <p className="mt-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
        🔒 Zero network during demo — open DevTools → Network tab
      </p>
    </div>
  </div>
);
```

---

### `chat/src/app/components/Multimodal/MultimodalHeader.tsx` (component, static)

**Analog:** `chat/src/app/components/Proofreader/ProofreaderHeader.tsx`

**Full structure** (ProofreaderHeader.tsx lines 1–32 — pixel-identical shape, different icon + copy):
```tsx
import React from 'react';

export const MultimodalHeader: React.FC = () => (
  <header className="mb-8">
    <div className="flex items-center space-x-4">
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
        {/* camera SVG w-6 h-6 aria-hidden */}
      </div>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
          Multimodal
        </h1>
        <p className="mt-2 text-base font-medium text-gray-600 dark:text-gray-400">
          On-device image understanding with Gemini Nano — drag, paste, or capture an image and ask about it. Chrome 148+ stable, zero network.
        </p>
      </div>
    </div>
  </header>
);
```

---

### `chat/src/app/components/Multimodal/MultimodalChatPanel.tsx` (component, streaming)

**Analog:** `chat/src/app/components/GenerativeUI/GenUIChatPanel.tsx`

**Container classes** (GenUIChatPanel.tsx line 411):
```tsx
<div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200 h-full min-h-[60vh] lg:min-h-[600px] flex flex-col">
  <div className="flex flex-col gap-3 h-full min-h-0">
    <div className="flex-1 min-h-0 overflow-y-auto">
      {/* MultimodalTranscript */}
    </div>
    {/* download progress bar (conditional) */}
    {/* MultimodalInput */}
  </div>
</div>
```

**Drag-over state (applied to container — border + overlay):**
```tsx
// dragCounterRef prevents flicker on child crossings
const dragCounterRef = useRef(0);
const [isDragOver, setIsDragOver] = useState(false);

const handleDragEnter = (e: React.DragEvent) => {
  e.preventDefault();
  dragCounterRef.current++;
  setIsDragOver(true);
};
const handleDragLeave = (e: React.DragEvent) => {
  e.preventDefault();
  dragCounterRef.current--;
  if (dragCounterRef.current === 0) setIsDragOver(false);
};
const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  dragCounterRef.current = 0;
  setIsDragOver(false);
  const file = e.dataTransfer.files[0];
  if (file) handleImageFile(file);
};

// Container class additions when isDragOver:
// border-2 border-dashed border-primary-500  (replaces border-gray-200/gray-700)
// relative (to position the overlay)
```

**Streaming chunk accumulation** (mirrors CONTEXT.md §Specifics):
```tsx
const streamingId = crypto.randomUUID();
// Create object URL, track it, add user + empty assistant messages
const objectUrl = URL.createObjectURL(pendingImage);
onObjectUrlCreated(objectUrl);   // callback to MultimodalPage to track in ref
setMessages(prev => [
  ...prev,
  { id: crypto.randomUUID(), role: 'user', text, attachedImageUrl: objectUrl },
  { id: streamingId, role: 'assistant', text: '' },
]);
setPendingImage(null);

setPageState('prompting');
const stream = await MultimodalService.promptWithImage(text, blobForService, { signal: abortRef.current.signal });
const reader = stream.getReader();
try {
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    setMessages(prev =>
      prev.map(m => m.id === streamingId ? { ...m, text: m.text + value } : m)
    );
  }
  setPageState('ready');
} catch (err) {
  const message = err instanceof Error ? err.message : 'Unknown error';
  setMessages(prev =>
    prev.map(m => m.id === streamingId
      ? { ...m, text: '', error: `Couldn't process image — ${message}` }
      : m)
  );
  setPageState('error');
} finally {
  reader.releaseLock();
}
```

**Download progress bar** (ProofreaderPage.tsx lines 172–183 — pixel-identical):
```tsx
{pageState === 'downloading' && (
  <div className="mt-4">
    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
      <div
        className="h-full bg-primary-500 transition-[width] duration-300"
        style={{ width: `${downloadPct}%` }}
      />
    </div>
    <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
      Downloading multimodal model — {downloadPct.toFixed(0)}%
    </p>
  </div>
)}
```

---

### `chat/src/app/components/Multimodal/MultimodalTranscript.tsx` (component, streaming)

**Analog:** `chat/src/app/components/ChatBox.tsx` (structure only — do NOT import from or extend it; incompatible Message type and fixed `h-96` container)

**Scroll-to-bottom pattern** (ChatBox.tsx lines 45–47):
```tsx
const messagesEndRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);
```

**Empty state** (ChatBox.tsx lines 52–60, adapted):
```tsx
{messages.length === 0 && (
  <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
    <div className="text-center">
      {/* camera/image SVG w-12 h-12 mx-auto mb-4 opacity-50 */}
      <p className="font-medium">Drop an image or paste (⌘V) to get started</p>
    </div>
  </div>
)}
```

**User bubble with image-above-text** (new pattern — based on ChatBox bubble classes + UI-SPEC):
```tsx
{msg.role === 'user' && (
  <div className="flex justify-end animate-slide-up">
    <div className="max-w-[80%] p-4 rounded-2xl shadow-sm bg-primary-500 text-white break-words">
      {msg.attachedImageUrl && (
        <img
          src={msg.attachedImageUrl}
          alt="Attached"
          className="max-w-full rounded-lg mb-2 max-h-48 object-cover"
        />
      )}
      <div className="prose prose-sm prose-invert max-w-none">
        <Markdown>{msg.text}</Markdown>
      </div>
    </div>
  </div>
)}
```

**Assistant bubble with streaming + error** (adapted from ChatBox bubble classes):
```tsx
{msg.role === 'assistant' && (
  <div className="flex justify-start animate-slide-up">
    <div className="max-w-[80%] p-4 rounded-2xl shadow-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 break-words">
      {msg.error ? (
        <>
          <p className="text-red-600 dark:text-red-400 text-sm font-medium">{msg.error}</p>
          <button onClick={() => onRetry(msg.id)} className="mt-2 text-xs font-medium text-primary-600 dark:text-primary-400 underline">
            Retry
          </button>
        </>
      ) : msg.text === '' ? (
        <span className="animate-pulse text-gray-500 dark:text-gray-400 font-medium">Thinking…</span>
      ) : (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <Markdown>{msg.text}</Markdown>
        </div>
      )}
    </div>
  </div>
)}
```

---

### `chat/src/app/components/Multimodal/MultimodalInput.tsx` (component, event-driven)

**Analog:** input area pattern from ChatBox + UI-SPEC §MultimodalInput

**MIME validation helper** (new — no direct analog in codebase):
```ts
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, or WebP images supported' };
  }
  return { valid: true };
}
```

**Paste handler on textarea:**
```tsx
const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
  const items = Array.from(e.clipboardData.items);
  const imageItem = items.find(item => item.type.startsWith('image/'));
  if (!imageItem) return;
  e.preventDefault();
  const file = imageItem.getAsFile();
  if (file) handleImageFile(file);
};
```

**Thumbnail preview row** (UI-SPEC §MultimodalInput):
```tsx
{pendingImage && (
  <div className="relative inline-block mb-2">
    <img
      src={URL.createObjectURL(pendingImage)}  {/* NOTE: use a previewUrl state to avoid re-creating on every render */}
      alt="Pending attachment"
      className="w-20 h-20 object-cover rounded"
    />
    <button
      onClick={onRemoveImage}
      aria-label="Remove attached image"
      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-xs flex items-center justify-center hover:bg-red-600 dark:hover:bg-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
    >
      ×
    </button>
  </div>
)}
```

**Textarea + send button row** (mirrors ChatInput pattern from existing pages):
```tsx
<textarea
  className="w-full resize-none bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm font-medium min-h-[48px] max-h-[120px] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
  placeholder="Drop an image or paste (⌘V) — then ask me about it"
  value={text}
  onChange={e => setText(e.target.value)}
  onPaste={handlePaste}
  disabled={pageState === 'unavailable' || pageState === 'prompting'}
/>
<div className="flex justify-end mt-2">
  <button
    onClick={handleSend}
    disabled={!canSend}
    title={sendButtonTooltip}
    className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium text-sm disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
  >
    {/* paper-plane SVG w-4 h-4 when ready; spinner SVG when prompting */}
    {pageState === 'prompting' ? 'Sending…' : 'Send'}
  </button>
</div>
```

**Send gating logic:**
```ts
const canSend =
  text.trim().length > 0 &&
  pendingImage !== null &&
  pageState === 'ready';

const sendButtonTooltip = pageState === 'unavailable'
  ? 'Enable multimodal image input to use this demo'
  : pageState === 'downloading'
  ? 'Download model first'
  : pendingImage === null
  ? 'Attach an image first'
  : text.trim().length === 0
  ? 'Type a question about the image'
  : undefined;
```

---

### `chat/src/app/services/MultimodalService.ts` (service, streaming)

**Analog:** `chat/src/app/services/ProofreaderService.ts`

**Module-scope single session pool** (ProofreaderService.ts lines 79–101 — simplified to single session, no Map key):
```ts
/** Single module-scope session promise — lazy-initialized on first promptWithImage call. */
let sessionPromise: Promise<LanguageModel> | null = null;

function getOrCreateSession(): Promise<LanguageModel> {
  if (sessionPromise) return sessionPromise;
  sessionPromise = LanguageModel.create({
    expectedInputs: [{ type: 'image' }, { type: 'text' }],
    expectedOutputs: [{ type: 'text', languages: ['en'] }],
    outputLanguage: 'en',
  }).catch((err: unknown) => {
    sessionPromise = null; // allow retry on failure
    throw err;
  });
  // Store promise BEFORE awaiting so concurrent callers share the same in-flight create.
  return sessionPromise;
}
```

**Local interface for multimodal promptStreaming overload** (workaround for dom-chromium-ai.d.ts string-only declaration at line 63 — do NOT modify dom-chromium-ai.d.ts):
```ts
interface MultimodalLanguageModel extends LanguageModel {
  promptStreaming(
    input: Array<{ role: string; content: Array<{ type: string; value: unknown }> }>,
    options?: { signal?: AbortSignal }
  ): ReadableStream<string>;
}
```

**promptWithImage** (public API entry point):
```ts
export async function promptWithImage(
  text: string,
  image: Blob | ImageBitmap,
  opts?: { signal?: AbortSignal }
): Promise<ReadableStream<string>> {
  const session = (await getOrCreateSession()) as unknown as MultimodalLanguageModel;
  return session.promptStreaming(
    [{ role: 'user', content: [{ type: 'text', value: text }, { type: 'image', value: image }] }],
    { signal: opts?.signal }
  );
}
```

**getAvailability with try/catch fallback** (ProofreaderService.ts lines 135–142 + Pitfall 3 in RESEARCH.md):
```ts
type AvailabilityState = 'available' | 'downloadable' | 'downloading' | 'unavailable';

export const getAvailability = async (): Promise<AvailabilityState> => {
  if (typeof LanguageModel === 'undefined') return 'unavailable';
  try {
    return await LanguageModel.availability({
      expectedInputs: [{ type: 'image' }],
    }) as AvailabilityState;
  } catch {
    return 'unavailable';
  }
};
```

**createWithProgress** (ProofreaderService.ts lines 148–166 — adapted for single session):
```ts
export const createWithProgress = async (
  onProgress: (pct: number) => void
): Promise<LanguageModel> => {
  const promise = LanguageModel.create({
    expectedInputs: [{ type: 'image' }, { type: 'text' }],
    expectedOutputs: [{ type: 'text', languages: ['en'] }],
    outputLanguage: 'en',
    monitor(m: AICreateMonitor) {
      m.addEventListener('downloadprogress', (e: ProgressEvent) => {
        onProgress(e.loaded != null ? e.loaded * 100 : 0);
      });
    },
  });
  sessionPromise = promise;
  return promise;
};
```

**destroyAllSessions** (ProofreaderService.ts lines 172–179 — single-session variant):
```ts
export const destroyAllSessions = (): void => {
  if (sessionPromise) {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    sessionPromise.then((s) => s.destroy()).catch(() => {});
    sessionPromise = null;
  }
};
```

---

### `chat/src/app/AppRouter.tsx` (routing-edit, 3 insertion points)

**Analog:** itself — copy the exact pattern of the Proofreader block.

**Import addition** (after line 12):
```tsx
import {MultimodalPage} from './components/Multimodal/MultimodalPage';
```

**Desktop nav insertion** (after line 80, after Proofreader `<Link>`):
```tsx
<Link to="/multimodal"
      onClick={() => trackUserInteraction('navigation_click', 'multimodal_link')}
      className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">Multimodal</Link>
```

**Mobile nav insertion** (after line 176, after Proofreader mobile `<Link>`):
```tsx
<Link to="/multimodal"
      onClick={() => trackUserInteraction('navigation_click', 'multimodal_link')}
      className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200">Multimodal</Link>
```

**Route block insertion** (after line 255, after Proofreader routes):
```tsx
{/* Multimodal routes */}
<Route path="/multimodal" element={<MultimodalPage/>}/>
<Route path="/multimodal/docs" element={<MultimodalPage/>}/>
```

---

### `chat/src/app/hooks/useSEOData.ts` (SEO-edit)

**Analog:** itself — copy the proofreader block shape at lines 95–105.

**Insertion** (after `proofreaderDocs` entry, before closing `} as const`):
```ts
// Must match prerender-react.js seoConfigs['/multimodal'] verbatim — Phase 12 grep -F audits.
multimodal: {
  title: 'Multimodal — Ask Gemini Nano about images on-device | Chrome AI APIs',
  description: 'Drag, paste, or capture an image — Gemini Nano answers your questions about it on-device with zero network. Chrome 148+ stable or flag-gated Canary.',
  keywords: 'Multimodal AI, Gemini Nano, image input, LanguageModel, expectedInputs, on-device AI, Chrome 148, drag and drop image, clipboard paste, WebGPU'
},
// Must match prerender-react.js seoConfigs['/multimodal/docs'] verbatim — Phase 12 grep -F audits.
multimodalDocs: {
  title: 'Multimodal API Docs — expectedInputs, image types, webcam-live pattern | Chrome AI APIs',
  description: 'Drag, paste, or capture an image — Gemini Nano answers your questions about it on-device with zero network. Chrome 148+ stable or flag-gated Canary.',
  keywords: 'Multimodal API docs, expectedInputs, image types, webcam-live, LanguageModel, promptStreaming, content parts, ImageBitmap, Chrome 148'
},
```

---

### `chat/scripts/prerender-react.js` (config-edit, 2 insertion points)

**Analog:** itself — copy the proofreader block shape at lines 64–66 (routes) and 416–437 (seoConfigs).

**Routes insertion** (after line 66, after proofreader-docs route):
```js
// Multimodal routes
{ path: '/multimodal', filename: 'multimodal.html' },
{ path: '/multimodal/docs', filename: 'multimodal-docs.html' },
```

**seoConfigs insertion** (after line 437, after `/proofreader/docs` closing brace):
```js
'/multimodal': {
  title: 'Multimodal — Ask Gemini Nano about images on-device | Chrome AI APIs',
  description: 'Drag, paste, or capture an image — Gemini Nano answers your questions about it on-device with zero network. Chrome 148+ stable or flag-gated Canary.',
  keywords: 'Multimodal AI, Gemini Nano, image input, LanguageModel, expectedInputs, on-device AI, Chrome 148, drag and drop image, clipboard paste, WebGPU',
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Multimodal Demo',
    description: 'On-device image understanding with Gemini Nano',
  },
},
'/multimodal/docs': {
  title: 'Multimodal API Docs — expectedInputs, image types, webcam-live pattern | Chrome AI APIs',
  description: 'Drag, paste, or capture an image — Gemini Nano answers your questions about it on-device with zero network. Chrome 148+ stable or flag-gated Canary.',
  keywords: 'Multimodal API docs, expectedInputs, image types, webcam-live, LanguageModel, promptStreaming, content parts, ImageBitmap, Chrome 148',
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    name: 'Multimodal API Documentation',
    description: 'Technical documentation for the LanguageModel multimodal API surface, expectedInputs, and image types',
  },
},
```

---

## Shared Patterns

### Page Shell (PageState machine + mount effect)
**Source:** `chat/src/app/components/Proofreader/ProofreaderPage.tsx` lines 20, 80–120, 220–249
**Apply to:** `MultimodalPage.tsx`
- `type PageState = 'idle' | 'unavailable' | 'downloading' | 'ready' | 'prompting' | 'error'`
- StrictMode-safe `useEffect` with `cancelled` flag
- `destroyAllSessions()` in cleanup
- `min-h-screen bg-white dark:bg-gray-800 transition-colors duration-200` outer wrapper
- `max-w-6xl mx-auto p-4` inner wrapper

### MissingFlagBanner
**Source:** `chat/src/app/components/MissingFlagBanner.tsx` (unchanged — pass props only)
**Apply to:** `MultimodalPage.tsx`
- Import unchanged: `import { MissingFlagBanner } from '../MissingFlagBanner'`
- Renders above header when `pageState === 'unavailable'`
- Props: `title`, `body`, `flags[]`, `browserRequirement` — all values from CONTEXT.md

### Tabs — Docs First Ordering
**Source:** `chat/src/app/components/Proofreader/ProofreaderPage.tsx` lines 197–218
**Apply to:** `MultimodalPage.tsx`
- Docs tab with `path: '/docs'` MUST come first
- Chat tab with `path: ''` MUST come second
- `Tabs basePath="/multimodal"` `defaultTab="docs"`
- Reason: `Tabs.tsx` matches via `currentPath.includes(tab.path)`; `''` matches everything

### Download Progress Bar
**Source:** `chat/src/app/components/Proofreader/ProofreaderPage.tsx` lines 172–183
**Apply to:** `MultimodalChatPanel.tsx`
- Classes: `h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden` / `h-full bg-primary-500 transition-[width] duration-300`
- Label: `text-xs font-medium text-gray-500 dark:text-gray-400`

### Session Pool + createWithProgress + destroyAllSessions
**Source:** `chat/src/app/services/ProofreaderService.ts` lines 79–101, 148–179
**Apply to:** `MultimodalService.ts`
- Module-scope `Promise<LanguageModel> | null` (single session, not Map-keyed)
- Store promise before awaiting (concurrent callers share in-flight create)
- `.catch()` sets `sessionPromise = null` to allow retry
- `destroyAllSessions` calls `.then(s => s.destroy()).catch(() => {})` — best-effort cleanup

### SEO Dual-Write
**Source:** `chat/src/app/hooks/useSEOData.ts` lines 94–105 + `chat/scripts/prerender-react.js` lines 416–437
**Apply to:** Both files (byte-identical `title` and `description` strings)
- `seoConfigs.multimodal` and `seoConfigs.multimodalDocs` in `useSEOData.ts`
- Matching `/multimodal` and `/multimodal/docs` entries in `prerender-react.js` seoConfigs
- Phase 12 `grep -F` audit will verify byte-identity

### Focus Ring
**Source:** `chat/src/global.css` `.focus-ring` utility
**Apply to:** All interactive elements in Multimodal components
```
focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
```

### Dark Mode + Color Conventions
**Source:** `chat/src/app/components/Proofreader/ProofreaderPage.tsx`, `ChatBox.tsx`, `GenUIChatPanel.tsx`
**Apply to:** All Multimodal components
- User bubbles: `bg-primary-500 text-white`
- Assistant bubbles: `bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200`
- Send button: `bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 dark:disabled:bg-gray-600`
- Error text: `text-red-600 dark:text-red-400`
- All interactive elements get `dark:` variants

---

## No Analog Found

All 10 files have close analogs in the codebase. The following patterns within new files have no existing codebase analog and must use RESEARCH.md patterns:

| Pattern | Location | Reason |
|---|---|---|
| Drag-enter ref counter | `MultimodalChatPanel.tsx` | No drag-and-drop UI exists in the codebase currently |
| Clipboard paste handler (`onPaste` + `clipboardData.items`) | `MultimodalInput.tsx` | No paste-image UX exists in the codebase currently |
| Object URL tracking ref + revoke-on-unmount | `MultimodalPage.tsx` | No `URL.createObjectURL` usage elsewhere in the codebase |
| `promptStreaming` with content-part array + `MultimodalLanguageModel` cast | `MultimodalService.ts` | Existing services use string-only `prompt()` / `promptStreaming(string)` |

---

## Metadata

**Analog search scope:** `chat/src/app/components/`, `chat/src/app/services/`, `chat/src/app/hooks/`, `chat/scripts/`
**Files scanned:** 10 analog files read in full
**Pattern extraction date:** 2026-05-20

**Key notes for planner:**
1. `ChatBox.tsx` is confirmed incompatible (`id: number`, `sender: string`, fixed `h-96`). `MultimodalTranscript` must be written fresh with the new `Message` type.
2. `dom-chromium-ai.d.ts` must NOT be modified. The `MultimodalLanguageModel` interface belongs only inside `MultimodalService.ts`.
3. The `pendingImage` state must remain a raw `Blob` (never an object URL) until send time — the object URL is created only at message-commit to avoid the revoke-too-early pitfall.
4. Tabs Docs-first ordering is load-bearing — `Tabs.tsx` `includes('')` matches all paths, so the chat tab (empty path) must be second.
