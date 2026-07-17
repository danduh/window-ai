// Ambient types for the Semantic Embedder API (Chrome 152 Canary, EPP flag).
// SemanticEmbedder is a bare global (like LanguageModel), NOT window.ai. These
// declarations are local to this module — the canonical window.ai typings do not
// ship SemanticEmbedder yet. This is the ONLY module that touches the global.
declare global {
  // Confirmed against the EPP doc + explainer (2026-07): taskType lives on
  // embed(options), NOT on create() — the doc's example is
  //   embedder.embed("…", { taskType: "semantic-similarity" })
  // and create() takes no arguments. If a future Chrome build moves taskType to
  // create(), this is the single place to change — add a SemanticEmbedderCreateOptions
  // interface and pass it through in the create() call in embedMany below.
  interface SemanticEmbedderEmbedOptions {
    taskType?: TaskType;
    signal?: AbortSignal;
  }

  interface SemanticEmbedding {
    // VERIFY: each embedding is { values: Float32Array }; batch results are positional.
    values: Float32Array;
  }

  interface SemanticEmbedderResult {
    embeddings: SemanticEmbedding[];
  }

  interface SemanticEmbedderInstance {
    embed(
      input: string | string[],
      options?: SemanticEmbedderEmbedOptions,
    ): Promise<SemanticEmbedderResult>;
    destroy(): void;
  }

  interface SemanticEmbedderConstructor {
    // availability() returns a status string; we normalize it in getAvailability().
    // Per the EPP doc (Jul 2026): create() takes NO arguments and MUST NOT be called
    // until availability() === 'available' — calling it while 'downloadable'/'downloading'
    // throws "…unable to create a session…check the result of availability() first."
    // Download-progress monitoring is not implemented yet, so we poll (waitUntilAvailable).
    availability(): Promise<string>;
    create(): Promise<SemanticEmbedderInstance>;
  }

  // eslint-disable-next-line no-var
  var SemanticEmbedder: SemanticEmbedderConstructor;
}

/**
 * Task types accepted by embed()'s `taskType` option. Selecting the right task
 * steers the model to produce vectors optimized for that use case. Embeddings are
 * only comparable within the same model version ("space").
 */
export type TaskType =
  | 'semantic-similarity'
  | 'retrieval-query'
  | 'retrieval-document'
  | 'classification'
  | 'clustering';

/** Availability states, mirroring the other services in this repo. */
export type AvailabilityState = 'available' | 'downloadable' | 'downloading' | 'unavailable';

/** Native embedding dimension for embeddinggemma-300m. */
export const NATIVE_DIMS = 768;

/** Matryoshka truncation dimensions supported by embeddinggemma-300m. */
export const MATRYOSHKA_DIMS: ReadonlyArray<number> = [768, 512, 256, 128];

/**
 * Returns the availability of the Semantic Embedder API. Returns 'unavailable'
 * immediately when the global is absent, and never throws — a thrown error (older
 * Canary builds, unexpected status string) also normalizes to 'unavailable'.
 */
export const getAvailability = async (): Promise<AvailabilityState> => {
  if (typeof SemanticEmbedder === 'undefined') return 'unavailable';
  try {
    const status = await SemanticEmbedder.availability();
    return status === 'available' || status === 'downloadable' || status === 'downloading'
      ? status
      : 'unavailable';
  } catch {
    return 'unavailable';
  }
};

/** How long to wait for the model to finish downloading before giving up. */
const AVAILABILITY_POLL_MS = 1500;
const AVAILABILITY_TIMEOUT_MS = 5 * 60 * 1000; // first-run download can take a while

/**
 * Blocks until availability() === 'available'. The model downloads on first use and
 * create() throws if called before it's ready (EPP doc), and there is no download-
 * progress event yet — so we poll. `onWaiting` is called on each pending tick so the
 * UI can show a "preparing the model" state. Throws on 'unavailable' or timeout.
 */
async function waitUntilAvailable(onWaiting?: () => void): Promise<void> {
  const start = Date.now();
  let state = await getAvailability();
  while (state !== 'available') {
    if (state === 'unavailable') {
      throw new Error(
        'SemanticEmbedder is not available on this device. Enable ' +
          'chrome://flags/#semantic-embedder-api in Chrome 152+ Canary and relaunch.',
      );
    }
    if (Date.now() - start > AVAILABILITY_TIMEOUT_MS) {
      throw new Error(
        `The embedding model is still preparing (state: ${state}). It downloads on ` +
          'first use — check progress at chrome://on-device-internals and try again.',
      );
    }
    onWaiting?.();
    await new Promise((r) => setTimeout(r, AVAILABILITY_POLL_MS));
    state = await getAvailability();
  }
}

/**
 * Embeds an array of texts. Waits for the model to be ready, creates ONE embedder,
 * reuses it across the whole batch, and destroys it in a finally block. Returns
 * Float32Array vectors in positional order matching `texts`. When `opts.dims` is
 * provided (Matryoshka), each vector is truncated to the leading N dims and renormalized.
 */
export async function embedMany(
  texts: string[],
  opts?: { taskType?: TaskType; dims?: number; onWaiting?: () => void },
): Promise<Float32Array[]> {
  if (typeof SemanticEmbedder === 'undefined') {
    throw new Error('SemanticEmbedder is not available in this browser');
  }
  if (texts.length === 0) return [];

  // The model downloads on first use. create() MUST NOT be called until availability()
  // is 'available' (calling it earlier throws), and there's no download-progress event
  // in this build — so poll until ready, then create() with no arguments (EPP doc).
  await waitUntilAvailable(opts?.onWaiting);
  const embedder = await SemanticEmbedder.create();
  try {
    const embedOptions: SemanticEmbedderEmbedOptions | undefined = opts?.taskType
      ? { taskType: opts.taskType }
      : undefined;
    const result = await embedder.embed(texts, embedOptions);
    // Defensive parse: the result shape is { embeddings: [{ values: Float32Array }, …] }
    // in positional order. Guard against an unexpected/empty shape with a clear error
    // rather than letting an opaque TypeError bubble up.
    if (!result || !Array.isArray(result.embeddings) || result.embeddings.length !== texts.length) {
      throw new Error('SemanticEmbedder.embed() returned an unexpected result shape');
    }
    const vectors = result.embeddings.map((e) => e.values);
    if (opts?.dims != null) {
      return vectors.map((v) => truncateAndNormalize(v, opts.dims as number));
    }
    return vectors;
  } finally {
    embedder.destroy();
  }
}

/**
 * Embeds a single text. Convenience wrapper over embedMany that returns the one vector.
 */
export async function embedOne(
  text: string,
  opts?: { taskType?: TaskType; dims?: number; onWaiting?: () => void },
): Promise<Float32Array> {
  const [vector] = await embedMany([text], opts);
  return vector;
}

/**
 * Cosine similarity of two vectors: dot(a, b) / (‖a‖ · ‖b‖). Returns a value in
 * [-1, 1]. Pure — no API calls. Returns 0 when either vector has zero magnitude.
 * Throws when lengths differ (comparing across dimensions is meaningless).
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`cosineSimilarity: length mismatch (${a.length} vs ${b.length})`);
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

/**
 * Matryoshka truncation: slice the leading `dims` dimensions of `v` and L2-renormalize
 * so the result stays a unit vector suitable for cosine comparison. Pure — no API calls.
 * If `dims` is >= the vector length, a renormalized full-length copy is returned.
 */
export function truncateAndNormalize(v: Float32Array, dims: number): Float32Array {
  const n = Math.min(dims, v.length);
  const sliced = v.slice(0, n);
  let norm = 0;
  for (let i = 0; i < sliced.length; i++) {
    norm += sliced[i] * sliced[i];
  }
  norm = Math.sqrt(norm);
  if (norm === 0) return sliced;
  const out = new Float32Array(sliced.length);
  for (let i = 0; i < sliced.length; i++) {
    out[i] = sliced[i] / norm;
  }
  return out;
}
