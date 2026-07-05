# Chrome Built-in AI APIs — Surface Tour

## The whole API surface, on one page

Chrome's built-in AI exposes seven JavaScript globals plus one tool-exposure layer:

| Global | Purpose | Status (July 2026) |
|---|---|---|
| `LanguageModel` | Generic chat-style prompting against Gemini Nano (multimodal + structured output) | Stable on the open web since Chrome 148 |
| `Summarizer` | Summarize long text (TL;DR, key-points, headline, teaser) | Stable since Chrome 138 |
| `Writer` | Generate new text from a brief | Origin trial / flag — NOT stable |
| `Rewriter` | Transform existing text (tone, length, formality) | Origin trial / flag — NOT stable |
| `Proofreader` | Grammar + spelling corrections with suggestions | Origin trial / flag — NOT stable |
| `Translator` | Source-lang → target-lang text translation | Stable since Chrome 138 |
| `LanguageDetector` | Detect language of input text | Stable since Chrome 138 |
| `document.modelContext` | Expose page actions as tools to agents (WebMCP) | Origin trial since Chrome 149 (`navigator.modelContext` deprecated in 150) |

Current stable browser at time of writing is **Chrome 150** (released June 30, 2026).

Two things changed the balance of this table recently. First, the **Prompt API (`LanguageModel`) went stable on the open web in Chrome 148** — it is no longer extensions-only. It now supports multimodal input (image/audio via `expectedInputs`), structured output, and tool calling (the `tools[]` parameter, documented and functional since Chrome 148). Second, **WebMCP moved its entry point**: `navigator.modelContext` is deprecated in Chrome 150 in favor of `document.modelContext`. Feature-detect both (see below).

The task trio — `Summarizer`, `Translator`, `LanguageDetector` — has been stable since Chrome 138. `Writer`, `Rewriter`, and `Proofreader` are **still origin trial / behind a flag** — do not treat them as generally available yet.

Every API follows the same shape:

```js
const status = await API.availability(options);     // "available" | "downloadable" | "downloading" | "unavailable"
const instance = await API.create(options);         // returns an instance, may trigger download
const result = await instance.someMethod(input);    // text in, text or stream out
instance.destroy();                                  // free resources
```

That's the entire mental model. Memorize the four verbs (`availability`, `create`, the work method, `destroy`) and you can pick up any of the seven task/prompt APIs in minutes.

WebMCP (the tool-exposure layer) is the exception — it doesn't follow the `availability`/`create` shape. Its entry point moved in Chrome 150, so always feature-detect both spellings:

```js
const modelContext = document.modelContext ?? navigator.modelContext;
modelContext.registerTool(tool, { signal });   // the core call
```

`registerTool(tool, { signal, exposedTo? })` is the primary method; Chrome 150 also adds `unregisterTool(name)` and `clearContext()`, and `provideContext(...)` replaces the full toolset at once. The `AbortSignal` path (abort the signal to unregister the tool) is the portable pattern across Chrome 146–150. WebMCP is a **W3C draft that is still moving — do not ship it to production yet.**

## Why a single backing model

All seven APIs share **one backing model** — Gemini Nano. The task-specific APIs (`Summarizer`, `Writer`, etc.) are not separate models; they're system-prompt and decoding configurations layered on top of the same weights. This is why:

- Enabling one API and downloading the model is enough to use the others.
- Their performance characteristics are nearly identical.
- A failure to download the model breaks all of them simultaneously.
- Memory-wise, they share — running `Summarizer` while a `LanguageModel` session is open does not double GPU usage.

## When to use which API

The task APIs exist because they're *more reliable* than the equivalent prompt to `LanguageModel`. Asking the raw model to "summarize this in three bullets" works, but the answer wobbles between prose, numbered lists, and dashed lists across runs. `Summarizer.summarize(text, { format: 'plain-text', length: 'short' })` is constrained — the runtime applies a tuned system prompt and decoder config you can't easily reproduce.

Rule of thumb:

- **Use `Summarizer`** for any "compress this text" task.
- **Use `Writer`** when generating *new* text from a brief.
- **Use `Rewriter`** when transforming *existing* text (tone, length).
- **Use `Proofreader`** when surfacing grammar / spelling errors with positions. (Still OT/flag — gate behind availability checks.)
- **Use `Translator` + `LanguageDetector`** for translation. They handle BCP 47 ↔ ISO mapping, language-pack download, and fallback paths.
- **Use `LanguageModel`** when you need conversational state, multimodal input (image/audio), tool calling, structured output, or output shapes the task APIs don't support.

### Structured output

`LanguageModel` can constrain its output to a JSON schema. The W3C option name is **`responseConstraint`** — prefer that in prose and docs. Note that **Chrome's current build still ships the option under the name `responseFormat`**, so real code today passes `responseFormat` while the spec is settling on `responseConstraint`.

## Availability lifecycle

Every API has the same four-state availability machine:

```
unavailable → downloadable → downloading → available
                ↑                              ↓
                └──── purged on low-disk ──────┘
```

- **`unavailable`** — hardware doesn't meet bar, flag disabled, or feature off in settings. Permanent until config changes.
- **`downloadable`** — supported, but model assets not yet on disk. A `create()` call will trigger download.
- **`downloading`** — download in progress. `create()` will resolve when finished. Listen for `downloadprogress` events via the `monitor` callback.
- **`available`** — model on disk, ready. `create()` returns immediately (~300 ms warm-up).

Chrome auto-purges the model if the device drops below ~22 GB free disk or if no API has used it in 30 days. After purge, the state goes back to `downloadable`.

## The `monitor` callback (download progress)

Every API accepts a `monitor` option on `create()` to surface download progress:

```js
const session = await LanguageModel.create({
  monitor(m) {
    m.addEventListener('downloadprogress', e => {
      const pct = (e.loaded / e.total * 100).toFixed(1);
      console.log(`Gemini Nano: ${pct}%`);
    });
  },
});
```

The `create()` promise does not resolve until the download completes. Render a progress UI; don't block your app.

## Secure-context requirement

All of these surfaces require a **secure context** (HTTPS or `localhost`). They are undefined on `http://` pages. There's no exception for IPs or local network names.

## Hardware bar Chrome enforces

The hard requirements (as of July 2026):

- Desktop OS: Windows 10+, macOS 13+, Linux. **No Android, no iOS, no ChromeOS** for the multimodal/audio variants.
- ≥ 22 GB free disk for the model components.
- A GPU with ≥ 4 GB of available VRAM, OR an integrated GPU that passes the synthetic shader benchmark.
- A non-metered network connection at first-download time.
- No enterprise policy disabling on-device AI.

If the device fails the bar, `availability()` returns `unavailable` and never advances. Your fallback should not assume the user can "fix" this — the answer for them is "buy a better laptop or use the cloud version".

## What you'll need in `chrome://flags/` to run everything in Canary

For the talk's demo machine, set every flag below to **Enabled** (except `optimization-guide-on-device-model`, which needs **Enabled BypassPerfRequirement**):

- `#optimization-guide-on-device-model` → Enabled BypassPerfRequirement
- `#prompt-api-for-gemini-nano`
- `#prompt-api-for-gemini-nano-multimodal-input`
- `#summarization-api-for-gemini-nano`
- `#writer-api-for-gemini-nano`
- `#rewriter-api-for-gemini-nano`
- `#proofreader-api-for-gemini-nano`
- `#language-detection-api`
- `#translation-api` → Enabled without language pack limit
- `#enable-webmcp-testing` → For local WebMCP dev (the flag was renamed; on a deployed origin, register an origin-trial token instead)

After enabling, restart Chrome. Trigger one `create()` to start the model download. Watch progress at `chrome://on-device-internals/` (the old `chrome://components/` row was removed).

Note that the stable APIs (`LanguageModel`, `Summarizer`, `Translator`, `LanguageDetector`) no longer need flags in Chrome 150 — the flags above matter only for the origin-trial/flagged surfaces (`Writer`, `Rewriter`, `Proofreader`, WebMCP) and for bypassing the perf bar on the demo machine.

## Summary

Seven task/prompt surfaces plus WebMCP. One model. Four verbs. One mental model. The whole platform is small enough to fit in a 90-second talk slide. That's the pitch.
