// Pure clustering + projection math for the Semantic Constellation demo.
// No external libraries, no API calls, no DOM — fully deterministic given the
// same input vectors (seeded RNG). Operates on unit-normalized embedding vectors
// (Float32Array) produced by EmbeddingsService.embedMany.

/** Deterministic PRNG (mulberry32) so the map layout is stable across runs. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Chooses a sensible cluster count: min(5, round(sqrt(n))), floored at 1. */
export function chooseK(n: number): number {
  if (n <= 1) return Math.max(1, n);
  return Math.max(1, Math.min(5, Math.round(Math.sqrt(n))));
}

function squaredDistance(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return s;
}

export interface KMeansResult {
  /** Cluster index (0..k-1) for each input vector, in positional order. */
  assignments: number[];
  /** The k centroid vectors. */
  centroids: Float32Array[];
  k: number;
}

/**
 * Lloyd's k-means with deterministic k-means++ seeding. Empty clusters are
 * re-seeded to the point farthest from its assigned centroid so k clusters
 * always survive. Returns per-point assignments and final centroids.
 */
export function kMeans(vectors: Float32Array[], k: number, iters: number): KMeansResult {
  const n = vectors.length;
  const dim = n > 0 ? vectors[0].length : 0;
  const kk = Math.max(1, Math.min(k, n));
  const rng = mulberry32(0x9e3779b9);

  if (n === 0) {
    return { assignments: [], centroids: [], k: 0 };
  }

  // --- k-means++ seeding (deterministic) ---
  const centroids: Float32Array[] = [];
  const firstIdx = Math.floor(rng() * n);
  centroids.push(vectors[firstIdx].slice());
  const dist2 = new Float64Array(n).fill(Infinity);
  while (centroids.length < kk) {
    const last = centroids[centroids.length - 1];
    let total = 0;
    for (let i = 0; i < n; i++) {
      const d = squaredDistance(vectors[i], last);
      if (d < dist2[i]) dist2[i] = d;
      total += dist2[i];
    }
    // Weighted pick proportional to squared distance.
    let target = rng() * total;
    let chosen = 0;
    for (let i = 0; i < n; i++) {
      target -= dist2[i];
      if (target <= 0) {
        chosen = i;
        break;
      }
      chosen = i;
    }
    centroids.push(vectors[chosen].slice());
  }

  const assignments = new Array<number>(n).fill(0);

  for (let iter = 0; iter < iters; iter++) {
    let changed = false;
    // Assignment step.
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const d = squaredDistance(vectors[i], centroids[c]);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (assignments[i] !== best) changed = true;
      assignments[i] = best;
    }

    // Update step.
    const sums = Array.from({ length: kk }, () => new Float64Array(dim));
    const counts = new Int32Array(kk);
    for (let i = 0; i < n; i++) {
      const c = assignments[i];
      const v = vectors[i];
      const s = sums[c];
      for (let d = 0; d < dim; d++) s[d] += v[d];
      counts[c]++;
    }
    for (let c = 0; c < kk; c++) {
      if (counts[c] === 0) {
        // Re-seed empty cluster to the worst-fit point.
        let worst = 0;
        let worstD = -1;
        for (let i = 0; i < n; i++) {
          const d = squaredDistance(vectors[i], centroids[assignments[i]]);
          if (d > worstD) {
            worstD = d;
            worst = i;
          }
        }
        centroids[c] = vectors[worst].slice();
        continue;
      }
      const out = new Float32Array(dim);
      const s = sums[c];
      for (let d = 0; d < dim; d++) out[d] = s[d] / counts[c];
      centroids[c] = out;
    }

    if (!changed && iter > 0) break;
  }

  return { assignments, centroids, k: kk };
}

/** Dot product of two equal-length arrays. */
function dot(a: Float64Array, b: Float64Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function normalizeInPlace(v: Float64Array): void {
  let norm = 0;
  for (let i = 0; i < v.length; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm);
  if (norm === 0) return;
  for (let i = 0; i < v.length; i++) v[i] /= norm;
}

/**
 * Power iteration for the dominant eigenvector of the covariance operator.
 * `covMul` applies the (implicit) covariance matrix to a vector. When `ortho`
 * is supplied, the iterate is deflated against it each step, yielding the next
 * principal component orthogonal to the first.
 */
function powerIteration(
  covMul: (x: Float64Array) => Float64Array,
  dim: number,
  rng: () => number,
  ortho: Float64Array | null,
): Float64Array {
  let v: Float64Array = new Float64Array(dim);
  for (let i = 0; i < dim; i++) v[i] = rng() - 0.5;
  normalizeInPlace(v);
  for (let iter = 0; iter < 100; iter++) {
    const w = covMul(v);
    if (ortho) {
      const p = dot(w, ortho);
      for (let i = 0; i < dim; i++) w[i] -= p * ortho[i];
    }
    normalizeInPlace(w);
    v = w;
  }
  return v;
}

/**
 * Projects vectors to 2-D via the top-2 principal components. Centers the data,
 * then runs power iteration on the covariance operator C = (1/n) Xᵀ X (applied
 * implicitly, never materialized) with deflation for the second component.
 * Returns [x, y] coordinates in positional order.
 */
export function pca2(vectors: Float32Array[]): Array<[number, number]> {
  const n = vectors.length;
  if (n === 0) return [];
  const dim = vectors[0].length;
  const rng = mulberry32(0x1234567);

  // Center the data.
  const mean = new Float64Array(dim);
  for (const v of vectors) for (let i = 0; i < dim; i++) mean[i] += v[i];
  for (let i = 0; i < dim; i++) mean[i] /= n;
  const centered: Float64Array[] = vectors.map((v) => {
    const c = new Float64Array(dim);
    for (let i = 0; i < dim; i++) c[i] = v[i] - mean[i];
    return c;
  });

  // Implicit covariance multiply: Cx = (1/n) Xᵀ (X x).
  const covMul = (x: Float64Array): Float64Array => {
    const Xx = new Float64Array(n);
    for (let r = 0; r < n; r++) {
      const cr = centered[r];
      let s = 0;
      for (let i = 0; i < dim; i++) s += cr[i] * x[i];
      Xx[r] = s;
    }
    const out = new Float64Array(dim);
    for (let r = 0; r < n; r++) {
      const cr = centered[r];
      const w = Xx[r];
      for (let i = 0; i < dim; i++) out[i] += cr[i] * w;
    }
    for (let i = 0; i < dim; i++) out[i] /= n;
    return out;
  };

  const pc1 = powerIteration(covMul, dim, rng, null);
  const pc2 = powerIteration(covMul, dim, rng, pc1);

  return centered.map((c) => [dot(c, pc1), dot(c, pc2)] as [number, number]);
}

/**
 * Index of the vector in `memberIndices` closest to `centroid` (smallest squared
 * distance) — used to label a cluster by its most representative member. Returns
 * -1 for an empty group.
 */
export function mostCentralIndex(
  vectors: Float32Array[],
  memberIndices: number[],
  centroid: Float32Array,
): number {
  let best = -1;
  let bestD = Infinity;
  for (const idx of memberIndices) {
    const d = squaredDistance(vectors[idx], centroid);
    if (d < bestD) {
      bestD = d;
      best = idx;
    }
  }
  return best;
}
