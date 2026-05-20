# Requirements: window-ai — Proofreader + Multimodal (v1.2)

**Defined:** 2026-05-19
**Core Value:** A Chrome Canary visitor opens `/proofreader` to see Gemini Nano correct text on-device with three selectable output styles; switches to `/multimodal` to chat with the model about images (drag/drop, clipboard paste, single-frame webcam capture, or continuous live webcam). All on-device, zero network — same kicker as v1.1.

## v1.2 Requirements

15 requirements across two new demos + docs/polish. Continues phase numbering from v1.1 (next free phase = Phase 8).

### Routing & Navigation (v1.2)

- [ ] **PROOF-01**: A new `/proofreader` route is registered in `chat/src/app/AppRouter.tsx`, a nav link added alongside the shipped demos, and a `MissingFlagBanner` variant explains the required Chrome flags (`#optimization-guide-on-device-model`, `#proofreader-api-for-gemini-nano`) when the `Proofreader` global is undefined. Rest of the page remains usable for read-only browsing of the docs tab.
- [x] **MULTI-01**: A new `/multimodal` route + nav link + `MissingFlagBanner` variant for `LanguageModel.create({ expectedInputs: [{ type: 'image' }] })` availability check.

### Proofreader Demo (v1.2)

- [ ] **PROOF-02**: A typed `ProofreaderService.ts` wraps `Proofreader.create({ includeCorrectionTypes: true, includeCorrectionExplanations: true })` and exposes `proofread(text, language?)`. Handler returns the full `corrections` array (startIndex, endIndex, correction, types[], explanation).
- [ ] **PROOF-03**: A text input area + "Proofread" button on `/proofreader`; submitting calls the service and renders results below in the user-selected output mode. Supports clearing input + re-running.
- [ ] **PROOF-04**: Three output modes selectable via toggle/segmented control:
  1. **Side-by-side diff** — original (left) + corrected (right), inline highlight of changed spans
  2. **Inline strikethrough** — single column showing original with strikethrough on removed words + highlight on inserted corrections
  3. **Plain + suggestion list** — corrected text + bulleted list below (`"changed X → Y because [explanation]"`); matches v1.0 `/writer` pattern
- [ ] **PROOF-05**: Language selector for `expectedInputLanguages` — defaults to English, supports the Chrome 149 set (en, es, ja, de, fr). Persists choice in localStorage.
- [ ] **PROOF-06**: Graceful error handling: model-unavailable → flag banner with copy-pasteable `chrome://flags/...` URLs; model-downloading → progress spinner with byte counter from `monitor` callback; proofread() throws → inline error inside the result panel (not a console-only failure).

### Multimodal Demo (v1.2)

- [x] **MULTI-02**: Drag-and-drop image input — drop zone on the chat panel; reads dropped file via `FileReader`, validates JPEG/PNG/WebP, displays thumbnail preview in the input area before send.
- [x] **MULTI-03**: Clipboard paste — `Cmd+V` (or `Ctrl+V`) of an image into the chat input attaches it. Same preview + send path as drag-drop.
- [ ] **MULTI-04**: Webcam single-frame capture — "📷 Take photo" button → `getUserMedia` (gated by user click for permission), renders live preview, captures one frame via `<canvas>` on user click, attaches as Blob.
- [ ] **MULTI-05**: Webcam continuous live — toggle "Live mode" button → starts a loop that uses `ImageCapture.grabFrame()` every 3 seconds (configurable), downsamples each frame to 512×512 via `createImageBitmap`, sends to model. **Single-in-flight gating** (no new prompt until previous resolves) + session reuse (same `LanguageModel` session across frames).
- [x] **MULTI-06**: A `MultimodalService.ts` wrapper creates `LanguageModel.create({ expectedInputs: [{ type: 'image' }, { type: 'text' }], outputLanguage: 'en' })`; exposes `promptWithImage(text, imageBlob | ImageBitmap)` and reusable session helpers for live mode.
- [x] **MULTI-07**: Chat transcript renders user-attached image thumbnails inline (small clickable preview in the user-bubble) above the text. Mirrors v1.1 `Message.uiResourceUri` field pattern but for outgoing user-image attachments (`Message.attachedImageUrl?: string`).
- [ ] **MULTI-08**: Camera permission UX — `NotAllowedError` shows an inline "Camera blocked — enable in browser settings" card with link to chrome's site-settings; `OverconstrainedError` (no camera) shows "No camera detected"; no permission yet → button prompts on click rather than auto-prompting on mount.

### Documentation & SEO (v1.2)

- [ ] **DOC-01**: `/proofreader/docs` markdown explainer at `chat/src/app/docs/Proofreader-API.md` covers: Proofreader API surface, `corrections` array shape with types[], LoRA adapter download, language support, and ≥2 typed code samples from the real `ProofreaderService.ts`. Renders via `DocsRenderer` with Tabs (Docs first, Workbench second — matches v1.1 lesson).
- [ ] **DOC-02**: `/multimodal/docs` at `chat/src/app/docs/Multimodal-API.md` covers: `expectedInputs` syntax, accepted image types (Blob, ImageBitmap, VideoFrame, etc.), webcam-live performance pattern (downsample + single-in-flight + session reuse), and ≥2 typed code samples from the real `MultimodalService.ts`.
- [ ] **DOC-03**: SEO config entries `seoConfigs.proofreader`, `seoConfigs.proofreaderDocs`, `seoConfigs.multimodal`, `seoConfigs.multimodalDocs` added to `chat/src/app/hooks/useSEOData.ts` AND byte-identical mirrors in `chat/scripts/prerender-react.js` (`grep -F` cross-check).

### Demo Quality (Definition of Done)

- [ ] **POLISH-01**: Both demos run cleanly across 5 cold-runs on Chrome 146+ Canary (Proofreader: type → fix → render in selected mode; Multimodal: each of 4 input modes → image in → model response). `REHEARSAL.md` template in Phase 12 dir.
- [ ] **POLISH-02**: Webcam-live mode shows a small performance indicator (current frame interval, last prompt latency in ms) so the talk audience sees the on-device speed.

## v2 / Deferred

- **Audio input to LanguageModel** (`expectedInputs: [{type: 'audio'}]`) — Chrome 148 stable BUT requires discrete GPU; integrated graphics returns `NotAllowedError`. Defer to v1.3 with Web Speech API as primary path and native audio as progressive enhancement.
- **Proofreader streaming** (`proofreadStreaming()`) — spec says it exists; was non-functional in Chrome 141–145 OT. Verify in Chrome 149+ before adding.
- Live deployment + custom domain for the v1.2 routes — already shipping via existing AWS pipeline (no new ADR).
- Multi-image attachments in one message — single-image MVP for v1.2.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile / tablet responsiveness audit | Demo target is desktop laptop projected to a screen |
| Production-grade error states for every API edge case | DoD is 5-cold-run demo, not reference quality |
| User-uploaded image moderation / NSFW filtering | On-device model has its own safety; no server-side moderation needed |
| Save corrected text to file / export | Out of scope; user copy-pastes from page |
| Backend storage of any kind | IndexedDB only if persistence needed (Proofreader: no persistence; Multimodal: chat history is transient) |
| Touching v1.0 (`/webmcp`) or v1.1 (`/generative-ui`) | Brownfield discipline — additive only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROOF-01 | Phase 8 | Pending |
| PROOF-02 | Phase 8 | Pending |
| PROOF-03 | Phase 8 | Pending |
| PROOF-05 | Phase 8 | Pending |
| PROOF-06 | Phase 8 | Pending |
| PROOF-04 | Phase 9 | Pending |
| MULTI-01 | Phase 10 | Complete |
| MULTI-02 | Phase 10 | Complete |
| MULTI-03 | Phase 10 | Complete |
| MULTI-06 | Phase 10 | Complete |
| MULTI-07 | Phase 10 | Complete |
| MULTI-04 | Phase 11 | Pending |
| MULTI-05 | Phase 11 | Pending |
| MULTI-08 | Phase 11 | Pending |
| POLISH-02 | Phase 11 | Pending |
| DOC-01 | Phase 12 | Pending |
| DOC-02 | Phase 12 | Pending |
| DOC-03 | Phase 12 | Pending |
| POLISH-01 | Phase 12 | Pending |

**Coverage:**
- v1.2 requirements: 19 total
- v1.2 mapped to phases: 19/19 (100%)

---
*v1.2 requirements defined: 2026-05-19*
