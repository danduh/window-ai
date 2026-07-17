import React, { useEffect, useMemo, useRef, useState } from 'react';
import { embedMany, getAvailability } from '../../services/EmbeddingsService';
import { chooseK, kMeans, mostCentralIndex, pca2 } from './constellationMath';

/**
 * Semantic Constellation — live cluster map.
 *
 * Embeds a set of short, unlabeled lines on-device (taskType 'clustering',
 * truncated to 256 Matryoshka dims for speed), groups them with Lloyd's k-means,
 * projects the high-dimensional vectors to 2-D with PCA (power iteration on the
 * covariance operator, deflated for the 2nd component), and renders the result
 * as an animated SVG map — one dot per line, colored by cluster, each cluster
 * labeled by its most-central member.
 */

// ~30 short lines spanning 4 obvious themes: auth/login, crashes, UI/feature
// requests, and billing. Left unlabeled on purpose — the clustering discovers
// the structure.
const SAMPLE_LINES = [
  "Can't log in, it says my password is wrong",
  'Forgot my password and the reset email never arrives',
  'Two-factor authentication code is not being accepted',
  "I'm locked out of my account after too many attempts",
  'Login page keeps redirecting me in a loop',
  'My session expires after only a few minutes',
  "Can't sign in with my Google account anymore",
  "Getting 'invalid credentials' even though they're correct",
  'The app crashes every time I open the settings screen',
  'It freezes and then closes when I upload a photo',
  'Random crashes on startup since the last update',
  'The whole thing hangs when I scroll the feed too fast',
  'App keeps force closing on my Android phone',
  'Black screen and crash right after the splash logo',
  'It crashes whenever I try to export a report',
  'Please add a dark mode, my eyes hurt at night',
  'Would love to be able to sort the list by date',
  'Can we get a way to bulk delete old items?',
  'The buttons are too small and hard to tap',
  'Add keyboard shortcuts for power users please',
  'I wish there was an offline mode for the train ride',
  'Make the font size adjustable in the settings',
  'A search bar on the dashboard would be amazing',
  'I was charged twice for my subscription this month',
  'How do I get a refund for the annual plan?',
  'My invoice shows the wrong amount',
  "I cancelled but I'm still being billed every month",
  'The upgrade payment failed but money left my account',
  'Where can I download my past receipts?',
  'Please explain the extra fee on my last statement',
].join('\n');

// Config chosen for the demo (see summary): 256 Matryoshka dims + clustering task.
const CLUSTER_DIMS = 256;

// Viewport geometry (SVG user units).
const VIEW_W = 800;
const VIEW_H = 500;
const PAD = 60;

// One color per cluster (Tailwind-ish palette, readable on both themes).
const CLUSTER_COLORS = [
  { dot: '#6366f1', tint: 'rgba(99,102,241,0.12)' }, // indigo
  { dot: '#10b981', tint: 'rgba(16,185,129,0.12)' }, // emerald
  { dot: '#f59e0b', tint: 'rgba(245,158,11,0.12)' }, // amber
  { dot: '#ec4899', tint: 'rgba(236,72,153,0.12)' }, // pink
  { dot: '#0ea5e9', tint: 'rgba(14,165,233,0.12)' }, // sky
  { dot: '#a855f7', tint: 'rgba(168,85,247,0.12)' }, // purple
];

interface Point {
  text: string;
  cluster: number;
  x: number; // pixel coords in the SVG viewBox
  y: number;
}

interface ClusterMeta {
  cluster: number;
  label: string;
  cx: number; // 2-D centroid of the cluster's projected points (pixels)
  cy: number;
  radius: number; // tint-circle radius covering members
}

type Status = 'idle' | 'embedding' | 'done' | 'error';

const ConstellationTab: React.FC = () => {
  const [text, setText] = useState(SAMPLE_LINES);
  const [status, setStatus] = useState<Status>('idle');
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [clusters, setClusters] = useState<ClusterMeta[]>([]);
  const [deployed, setDeployed] = useState(false); // drives the center → position animation
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // Availability guard (page also shows a banner, but the tab guards its own calls).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const a = await getAvailability();
      if (!cancelled) setUnavailable(a === 'unavailable');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const lineCount = useMemo(
    () => text.split('\n').filter((l) => l.trim().length > 0).length,
    [text],
  );

  const handleCluster = async () => {
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length < 2) {
      setError('Enter at least 2 non-empty lines to cluster.');
      setStatus('error');
      return;
    }

    setStatus('embedding');
    setPreparing(false);
    setError(null);
    setDeployed(false);
    setPoints([]);
    setClusters([]);

    try {
      // One embedder for the whole batch; 256 dims for a faster, still-separable space.
      // The model downloads on first use; embedMany waits for availability() to reach
      // 'available' before create(), reporting the wait via onWaiting.
      const vectors = await embedMany(lines, {
        taskType: 'clustering',
        dims: CLUSTER_DIMS,
        onWaiting: () => aliveRef.current && setPreparing(true),
      });
      if (!aliveRef.current) return;
      setPreparing(false);

      const k = chooseK(vectors.length);
      const { assignments, centroids } = kMeans(vectors, k, 50);
      const coords = pca2(vectors);

      // Scale PCA coords into the padded viewport.
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const [x, y] of coords) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      const spanX = maxX - minX || 1;
      const spanY = maxY - minY || 1;
      const scaleX = (x: number) => PAD + ((x - minX) / spanX) * (VIEW_W - 2 * PAD);
      const scaleY = (y: number) => PAD + ((y - minY) / spanY) * (VIEW_H - 2 * PAD);

      const nextPoints: Point[] = lines.map((line, i) => ({
        text: line,
        cluster: assignments[i],
        x: scaleX(coords[i][0]),
        y: scaleY(coords[i][1]),
      }));

      // Cluster metadata: label = most-central member, tint circle covering members.
      const nextClusters: ClusterMeta[] = [];
      for (let c = 0; c < centroids.length; c++) {
        const members = assignments
          .map((a, i) => (a === c ? i : -1))
          .filter((i) => i >= 0);
        if (members.length === 0) continue;
        const centralIdx = mostCentralIndex(vectors, members, centroids[c]);
        let cx = 0;
        let cy = 0;
        for (const i of members) {
          cx += nextPoints[i].x;
          cy += nextPoints[i].y;
        }
        cx /= members.length;
        cy /= members.length;
        let radius = 0;
        for (const i of members) {
          const dx = nextPoints[i].x - cx;
          const dy = nextPoints[i].y - cy;
          radius = Math.max(radius, Math.hypot(dx, dy));
        }
        nextClusters.push({
          cluster: c,
          label: centralIdx >= 0 ? lines[centralIdx] : `Cluster ${c + 1}`,
          cx,
          cy,
          radius: radius + 26,
        });
      }

      if (!aliveRef.current) return;
      setPoints(nextPoints);
      setClusters(nextClusters);
      setStatus('done');
      // Flip on the next frame so the CSS transform transitions from center out.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (aliveRef.current) setDeployed(true);
        });
      });
    } catch (e) {
      if (!aliveRef.current) return;
      setError(e instanceof Error ? e.message : 'Failed to embed lines.');
      setStatus('error');
    }
  };

  const color = (c: number) => CLUSTER_COLORS[c % CLUSTER_COLORS.length];
  const centerX = VIEW_W / 2;
  const centerY = VIEW_H / 2;

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Semantic Constellation
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Embed unlabeled lines on-device, cluster them with k-means, and project the vectors to a
          2-D map with PCA. Related lines pull together into constellations — no labels given.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input column */}
        <div className="lg:col-span-1 space-y-4">
          <div>
            <label
              htmlFor="constellation-input"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Lines to cluster
              <span className="ml-2 text-xs font-normal text-gray-400">
                {lineCount} non-empty
              </span>
            </label>
            <textarea
              id="constellation-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={16}
              spellCheck={false}
              className="w-full p-3 font-mono text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-y"
            />
          </div>

          <button
            type="button"
            onClick={handleCluster}
            disabled={status === 'embedding' || unavailable}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-2.5 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === 'embedding' ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                {preparing ? 'Preparing model…' : `Embedding ${lineCount} lines…`}
              </>
            ) : (
              <>✦ Cluster</>
            )}
          </button>

          {unavailable && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              SemanticEmbedder is unavailable in this browser — enable the flags shown above and
              relaunch Chrome Canary.
            </p>
          )}
          {error && status === 'error' && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}

          {clusters.length > 0 && (
            <div className="pt-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                {clusters.length} clusters found
              </p>
              <ul className="space-y-1.5">
                {clusters.map((cl) => (
                  <li key={cl.cluster} className="flex items-start gap-2 text-xs">
                    <span
                      className="mt-0.5 inline-block w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color(cl.cluster).dot }}
                    />
                    <span className="text-gray-700 dark:text-gray-300 truncate">{cl.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Map column */}
        <div className="lg:col-span-2">
          <div className="relative rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden">
            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              className="w-full h-auto block"
              role="img"
              aria-label="Semantic cluster map"
            >
              {status === 'idle' && (
                <text
                  x={centerX}
                  y={centerY}
                  textAnchor="middle"
                  className="fill-gray-400 dark:fill-gray-500"
                  fontSize="16"
                >
                  Press “Cluster” to map the lines
                </text>
              )}

              {/* Cluster tint backgrounds */}
              {status === 'done' &&
                clusters.map((cl) => (
                  <circle
                    key={`tint-${cl.cluster}`}
                    cx={cl.cx}
                    cy={cl.cy}
                    r={cl.radius}
                    fill={color(cl.cluster).tint}
                    style={{
                      opacity: deployed ? 1 : 0,
                      transition: 'opacity 600ms ease 300ms',
                    }}
                  />
                ))}

              {/* Cluster labels */}
              {status === 'done' &&
                clusters.map((cl) => {
                  const short =
                    cl.label.length > 34 ? `${cl.label.slice(0, 33)}…` : cl.label;
                  return (
                    <text
                      key={`label-${cl.cluster}`}
                      x={cl.cx}
                      y={Math.max(16, cl.cy - cl.radius - 6)}
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="600"
                      fill={color(cl.cluster).dot}
                      style={{
                        opacity: deployed ? 1 : 0,
                        transition: 'opacity 600ms ease 500ms',
                      }}
                    >
                      {short}
                    </text>
                  );
                })}

              {/* Dots */}
              {status === 'done' &&
                points.map((p, i) => {
                  const tx = deployed ? p.x : centerX;
                  const ty = deployed ? p.y : centerY;
                  return (
                    <circle
                      key={i}
                      cx={0}
                      cy={0}
                      r={7}
                      fill={color(p.cluster).dot}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      style={{
                        transform: `translate(${tx}px, ${ty}px)`,
                        transition: `transform 800ms cubic-bezier(0.22,1,0.36,1) ${i * 18}ms, opacity 400ms`,
                        opacity: deployed ? 1 : 0.2,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={() => setHover({ x: p.x, y: p.y, text: p.text })}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover({ x: p.x, y: p.y, text: p.text })}
                      onBlur={() => setHover(null)}
                      tabIndex={0}
                    >
                      <title>{p.text}</title>
                    </circle>
                  );
                })}
            </svg>

            {/* Custom tooltip (positioned as % of the viewBox so it tracks on resize) */}
            {hover && (
              <div
                className="pointer-events-none absolute z-10 max-w-[240px] -translate-x-1/2 -translate-y-full px-2.5 py-1.5 rounded-md bg-gray-900 text-white text-xs shadow-lg dark:bg-gray-100 dark:text-gray-900"
                style={{
                  left: `${(hover.x / VIEW_W) * 100}%`,
                  top: `calc(${(hover.y / VIEW_H) * 100}% - 10px)`,
                }}
              >
                {hover.text}
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            {CLUSTER_DIMS}-dim vectors · k-means · PCA projection. Hover a dot for its text.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConstellationTab;
