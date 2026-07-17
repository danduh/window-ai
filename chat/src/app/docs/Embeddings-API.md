# Chrome Embedding API Usage Guide

This document is a complete reference for Chrome's built-in **Embedding API**, an on-device text-embedding API exposed through the global `SemanticEmbedder`. It turns text into fixed-length numeric vectors (embeddings) using the `embeddinggemma-300m` model, entirely on-device — no text or vectors ever leave the browser, and there is no backend or API key involved.

Embeddings are the building block for semantic search, clustering, deduplication, recommendation, and "find similar" features: two pieces of text that mean similar things land close together in vector space, so you can compare meaning with plain arithmetic instead of keyword matching.

## Overview

The Embedding API exposes a single global, `SemanticEmbedder` (a bare global, like `LanguageModel` — **not** `window.ai`), with:

- `SemanticEmbedder.availability()` — returns a string describing whether the model is ready.
- `SemanticEmbedder.create()` — returns a `SemanticEmbedder` session with an `embed()` method.
- `embedder.embed(input, options)` — turns one string, or an array of strings, into embedding vectors.
- `embedder.destroy()` — releases the model.

A session is reusable — create one and call `embed()` repeatedly rather than recreating it per call.

## Prerequisites

### Browser Support

- **Chrome 152 Canary** desktop (Windows, macOS, Linux) — behind flags. Not on stable, and not on iOS/Android/ChromeOS at the time of writing.
- Requires the `embeddinggemma-300m` model on-device, downloaded on first use.

### Setup Instructions

1. **Enable the on-device model**:
   ```
   chrome://flags/#optimization-guide-on-device-model
   ```
   Set to **Enabled BypassPerfRequirement** and restart Chrome.

2. **Enable the Embedding API**:
   ```
   chrome://flags/#semantic-embedder-api
   ```
   Set to **Enabled** and restart Chrome.

3. **Inspect model state** (optional, useful for debugging stalled downloads):
   ```
   chrome://on-device-internals
   ```

### Checking API Availability

`availability()` returns one of `"available"`, `"downloadable"`, `"downloading"`, or `"unavailable"`. `"available"` means the model is on-device and ready to use. `"downloadable"` / `"downloading"` mean the API is supported but the model still needs to arrive — you must **wait until it becomes `"available"` before calling `create()`** (see *Waiting for the model to download*, below). `"unavailable"` — or a missing `SemanticEmbedder` global — means the API can't be used in this browser.

```javascript
// Returns one of: "available", "downloadable", "downloading", "unavailable"
if (typeof SemanticEmbedder === "undefined") {
  console.warn("Embedding API not present — enable chrome://flags in Chrome 152 Canary");
} else {
  const status = await SemanticEmbedder.availability();
  const usable = ["available", "downloadable", "downloading"].includes(status);
  if (!usable) {
    console.warn("SemanticEmbedder not available — check chrome://flags");
  }
}
```

Call `availability()` on page load to decide whether to show the feature or a "please enable the flag" banner.

### Waiting for the model to download

The model downloads on first use, and `create()` **must not** be called until `availability()` returns `"available"` — calling it while the state is `"downloadable"`/`"downloading"` throws *"The device is unable to create a session to run the model."* Download-progress events are not implemented yet, so poll until the model is ready:

```javascript
async function waitUntilAvailable({ timeoutMs = 300000, intervalMs = 1500 } = {}) {
  const start = Date.now();
  let status = await SemanticEmbedder.availability();
  while (status !== "available") {
    if (status === "unavailable") {
      throw new Error("Embedding API is not available on this device.");
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error("The embedding model is still downloading — try again shortly.");
    }
    await new Promise((r) => setTimeout(r, intervalMs));
    status = await SemanticEmbedder.availability();
  }
}

// Wait for readiness, THEN create — show an indeterminate "preparing…" state meanwhile.
await waitUntilAvailable();
const embedder = await SemanticEmbedder.create();
```

## Basic Usage

### Creating a Session

```javascript
const embedder = await SemanticEmbedder.create();
```

`create()` takes no parameters, and must only be called once `availability()` returns `"available"`. It does **not** trigger the download itself — calling it while the model is still `"downloadable"`/`"downloading"` throws *"The device is unable to create a session to run the model. Please check the result of availability() first."* See *Waiting for the model to download*, above.

### Embedding a Single String

```javascript
const embedder = await SemanticEmbedder.create();

const result = await embedder.embed("How do I reset my password?");

const vector = result.embeddings[0].values; // Float32Array, length 768
console.log(vector.length); // 768
```

`embed()` always returns an object with an `embeddings` array. For a single string input the array has one entry; each entry is `{ values: Float32Array }`. The native embedding dimension for `embeddinggemma-300m` is **768**.

### Embedding a Batch

Pass an array of strings to embed them all in one call. Results come back in **positional order** — `embeddings[i]` corresponds to `input[i]`.

```javascript
const docs = [
  "The mitochondria is the powerhouse of the cell.",
  "Our refund window is 30 days from purchase.",
  "Photosynthesis converts sunlight into chemical energy."
];

const { embeddings } = await embedder.embed(docs);

embeddings.forEach((e, i) => {
  console.log(docs[i], "→", e.values.length, "dims");
});
```

Batching is the right choice when indexing a collection — it's both simpler and cheaper than looping one string at a time.

### Input size and truncation

Each input is capped at roughly **2048 tokens** (the model's context window), and the API does **not** chunk for you. Crucially — confirmed on Chrome 152 Canary — passing a longer string does **not** throw: `embed()` resolves normally, but only the **first ~2048 tokens are embedded** and the rest is **silently ignored**, so the vector reflects only the beginning of the text.

Because over-long input fails *silently* (a weaker embedding, not an error), **pre-chunk long documents yourself** — split on paragraphs or headings so each passage stays comfortably under the limit — and embed the chunks as a batch. No maximum batch size is documented, but embedding runs on-device, so very large batches are slower.

### Cleaning Up

```javascript
embedder.destroy();
```

Releases the model so the user agent can reclaim memory. Create a fresh session if you need to embed again later.

## Task Types

`embed()` accepts an optional `options` object with a `taskType` property. The task type tells the model how the text will be used, which lets it shape the vector for that job. Picking the right one measurably improves relevance.

```javascript
const result = await embedder.embed(text, { taskType: "retrieval-query" });
```

| `taskType`             | When to use                                                              |
|------------------------|--------------------------------------------------------------------------|
| `semantic-similarity`  | Comparing two texts for how alike they are (dedup, paraphrase, "related")|
| `retrieval-query`      | The short thing a **user typed** into a search box                       |
| `retrieval-document`   | The **stored items** you're searching over (indexing a corpus)           |
| `classification`       | Assigning text to preset labels                                          |
| `clustering`           | Grouping many texts by similarity                                        |

If you omit `taskType`, the text is embedded as-is with no task-specific shaping.

### The retrieval-query vs retrieval-document asymmetry

Retrieval is the one case where the two sides of a comparison use **different** task types on purpose:

- Embed each **stored document** with `taskType: "retrieval-document"` (usually ahead of time, at index build).
- Embed the **user's live search string** with `taskType: "retrieval-query"` (at search time).

Then compare the query vector against the document vectors. Using the matched asymmetric pair yields better search results than embedding both sides identically. For symmetric "are these two things alike?" comparisons — where neither side is privileged — use `semantic-similarity` on both.

```javascript
// Index time — documents:
const { embeddings: docVecs } = await embedder.embed(
  documents,
  { taskType: "retrieval-document" }
);

// Search time — the user's query:
const { embeddings: [queryVec] } = await embedder.embed(
  userQuery,
  { taskType: "retrieval-query" }
);
```

## Comparing Embeddings

Embeddings are compared with **cosine similarity**: the cosine of the angle between two vectors, ranging from `-1` (opposite) through `0` (unrelated) to `1` (identical direction). Higher means more semantically similar.

```javascript
function cosineSimilarity(a, b) {
  if (a.length !== b.length) {
    throw new Error("vectors must have the same length");
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
```

### Find the Most Similar

A minimal semantic search: embed the query and the candidates, then rank candidates by cosine similarity to the query.

```javascript
async function findMostSimilar(query, candidates) {
  const embedder = await SemanticEmbedder.create();

  const { embeddings: [q] } = await embedder.embed(
    query,
    { taskType: "retrieval-query" }
  );
  const { embeddings: docs } = await embedder.embed(
    candidates,
    { taskType: "retrieval-document" }
  );

  embedder.destroy();

  return candidates
    .map((text, i) => ({ text, score: cosineSimilarity(q.values, docs[i].values) }))
    .sort((a, b) => b.score - a.score);
}

const ranked = await findMostSimilar(
  "how long do I have to return something?",
  [
    "Our refund window is 30 days from purchase.",
    "The mitochondria is the powerhouse of the cell.",
    "Photosynthesis converts sunlight into chemical energy."
  ]
);

console.log(ranked[0].text); // "Our refund window is 30 days from purchase."
```

## Matryoshka Dimensions

`embeddinggemma-300m` produces **768-dimensional** vectors, but it is a *Matryoshka* embedding model: the most important information is packed into the leading dimensions, so you can shorten a vector to **512, 256, or 128** dimensions by keeping the first N values and re-normalizing. Shorter vectors use less storage and compare faster, at a modest cost to accuracy.

> Note: the API returns the full 768-dim vector; the truncation below is a client-side step you apply yourself. Only truncate to one of the model's supported sizes (768 / 512 / 256 / 128).

```javascript
function truncateEmbedding(values, targetDim) {
  const supported = [768, 512, 256, 128];
  if (!supported.includes(targetDim)) {
    throw new Error(`targetDim must be one of ${supported.join(", ")}`);
  }
  // 1. Slice the leading N dimensions.
  const sliced = values.slice(0, targetDim);

  // 2. Re-normalize to unit length so cosine similarity stays meaningful.
  let norm = 0;
  for (let i = 0; i < sliced.length; i++) norm += sliced[i] * sliced[i];
  norm = Math.sqrt(norm);

  const out = new Float32Array(targetDim);
  if (norm > 0) {
    for (let i = 0; i < targetDim; i++) out[i] = sliced[i] / norm;
  }
  return out;
}

const { embeddings: [full] } = await embedder.embed("compact me");
const small = truncateEmbedding(full.values, 256); // Float32Array(256)
```

Whatever dimension you choose, use it consistently: only compare vectors that were truncated to the **same** length.

## Same Embedding Space Only

Embeddings are only comparable when they come from the **same model version** — the same "embedding space." Cosine similarity between vectors from two different models (or two different model versions) is meaningless, even if the dimensions happen to match. In practice this means:

- Don't mix vectors produced by `embeddinggemma-300m` with vectors from any other model.
- If the on-device model version changes, treat previously stored vectors as stale — **re-embed** your corpus rather than comparing old and new vectors.
- Persist the model identity alongside any vectors you cache (e.g. in IndexedDB) so you can detect a mismatch and rebuild.

## Error Handling

Over-long input does **not** throw — it's silently truncated (see *Input size and truncation*), so never rely on `embed()` to reject large text. Guard with `availability()` up front, and wrap `embed()` to catch genuine failures such as the model not being ready or an unsupported option:

```javascript
try {
  const result = await embedder.embed(text, { taskType: "semantic-similarity" });
  use(result.embeddings[0].values);
} catch (e) {
  // e.g. the session couldn't be created, or an option isn't supported in this build.
  console.error("embed() failed:", e);
}
```

The model is unavailable if the flags aren't set or the download hasn't completed — guard with `availability()` up front rather than relying on `embed()` to throw.

## Troubleshooting / Known issues

### `create()` throws *"The device is unable to create a session to run the model. Please check the result of availability() first."*

`create()` was called before `availability()` returned `"available"`. In the current build `create()` takes **no arguments** and does **not** trigger or monitor the download — you must wait until availability is `"available"` first (see *Waiting for the model to download*). Calling it while the state is `"downloadable"` or `"downloading"` throws this error.

### `availability()` never advances past `"downloadable"`

`"downloadable"` means the model isn't on-device yet. It normally downloads within a few seconds of first use, but on some machines it must be provisioned manually. Work through these in order:

1. **Force the model download.** Open `chrome://components`, find **"Optimization Guide On Device Model"**, and click **Check for update**. If the version reads `0.0.0.0`, the model hasn't downloaded — the manual check kicks it off. Keep the tab open; the download can take several minutes.
2. **Confirm the model status.** Open `chrome://on-device-internals` → **Model status** and verify the on-device model shows a non-zero version and no errors. (`embeddinggemma-300m` is a separate component from the Prompt API's Gemini Nano weights.)
3. **Bypass the performance gate.** Set `chrome://flags/#optimization-guide-on-device-model` to **"Enabled BypassPerfRequirement"** (not plain "Enabled"), then relaunch. Plain "Enabled" leaves a hardware/performance gate that can block provisioning even when `availability()` reads `"downloadable"`.
4. **Free up disk.** The on-device model stack needs roughly **22 GB free** on the volume holding your Chrome profile.
5. **Unblock component updates.** VPNs, ad-blockers, and privacy extensions can block Google's component-update servers, leaving the component stuck at `0.0.0.0`. Disable them temporarily and retry.
6. **Relaunch Chrome** and try again once the component reports a version.

### No download progress

Download-progress events (a `downloadprogress` event / a `monitor` option on `create()`) are **not implemented yet** for `SemanticEmbedder`. Show an indeterminate "preparing…" state and poll `availability()` — don't expect a percentage.

### Quick self-check

Run this in DevTools to watch the model provision:

```javascript
for (let i = 0; i < 10; i++) {
  console.log(await SemanticEmbedder.availability());
  await new Promise((r) => setTimeout(r, 3000));
}
```

If it moves `"downloadable" → "available"`, you're ready to `create()`. If it stays `"downloadable"`, work through the checklist above.

## Best Practices

1. **Check `availability()` first, and wait for `"available"`.** Show a flag-setup banner when it's `"unavailable"` and a "preparing…" state while `"downloadable"`/`"downloading"` — never call `create()` until it returns `"available"`, or it throws.
2. **Reuse one session.** Hold a single `SemanticEmbedder` and call `embed()` repeatedly; don't create-per-string.
3. **Batch your inputs.** Pass an array to `embed()` when indexing a corpus — results are positional, and it's cheaper than looping.
4. **Match the task type.** `retrieval-document` for stored items, `retrieval-query` for the user's search string, `semantic-similarity` for symmetric comparisons.
5. **Pick one dimension and stick to it.** If you truncate for storage, truncate every vector to the same Matryoshka size and re-normalize.
6. **Never cross embedding spaces.** Only compare vectors from the same model version; re-embed when the model changes.
7. **Pre-chunk long text.** Inputs over ~2048 tokens are silently truncated (not rejected), so split long documents into passages yourself or you'll only embed their beginnings.
8. **Destroy on teardown.** Call `destroy()` when you're done to release the model from memory.

## Using with TypeScript

```typescript
type EmbeddingTaskType =
  | "semantic-similarity"
  | "retrieval-query"
  | "retrieval-document"
  | "classification"
  | "clustering";

interface EmbedOptions {
  taskType?: EmbeddingTaskType;
}

interface Embedding {
  values: Float32Array;
}

interface EmbedResult {
  embeddings: Embedding[];
}

const embedder = await SemanticEmbedder.create();

const result: EmbedResult = await embedder.embed(
  ["first text", "second text"],
  { taskType: "retrieval-document" }
);

const first: Float32Array = result.embeddings[0].values;
```

## Conclusion

The Embedding API is the smallest possible on-device building block for semantic features: `SemanticEmbedder.create()`, then `embed()` a string or an array and get back `Float32Array` vectors in positional order. Match the `taskType` to the job — especially the `retrieval-query` / `retrieval-document` asymmetry — compare with cosine similarity, truncate to a Matryoshka size only if you need smaller vectors, and never compare vectors across different model versions. Everything runs locally, so semantic search and clustering work with no backend and no data leaving the browser.
