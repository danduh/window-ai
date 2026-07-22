import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSEOData, seoConfigs } from '../hooks/useSEOData';
import './HomePage.css';

// Capability pills — the suite of built-in AI APIs, shown under the hero.
// Each links to its demo/docs route (inside the app shell).
const PILLS: { label: string; href: string }[] = [
  { label: 'Chat', href: '/chat' },
  { label: 'Summarize', href: '/summary' },
  { label: 'Translate', href: '/translate' },
  { label: 'Multimodal', href: '/multimodal' },
  { label: 'Embeddings', href: '/embeddings' },
  { label: 'Proofread', href: '/proofreader' },
  { label: 'Write & Rewrite', href: '/writer' },
];

// Words the hero headline cycles through via the typewriter morph.
const MORPH_WORDS = [
  'chat.',
  'summarize.',
  'translate.',
  'embed.',
  'proofread.',
  'see images.',
];

const GITHUB_URL = 'https://github.com/danduh/window-ai';
const LINKEDIN_URL = 'https://www.linkedin.com/in/danduh';

export const HomePage: React.FC = () => {
  useSEOData(seoConfigs.home, '/');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const morphRef = useRef<HTMLSpanElement>(null);

  // Canvas scanning-grid animation. Self-contained rAF loop + resize handler,
  // all torn down on unmount via an `alive` guard.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let alive = true;
    let rafId = 0;

    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { ctx, w, h };
    };

    let { ctx, w, h } = fit();
    const onResize = () => {
      const f = fit();
      ctx = f.ctx;
      w = f.w;
      h = f.h;
    };
    window.addEventListener('resize', onResize);

    const gap = 44;
    const loop = (t: number) => {
      if (!alive || !ctx) return;
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(96,165,250,.06)';
      const off = (t * 0.02) % gap;
      for (let x = -off; x < w; x += gap) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = -off; y < h; y += gap) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      const cx = ((t * 0.00007) % 1) * (w + 400) - 200;
      const g = ctx.createLinearGradient(cx - 170, 0, cx + 170, h);
      g.addColorStop(0, 'rgba(59,130,246,0)');
      g.addColorStop(0.5, 'rgba(96,165,250,.10)');
      g.addColorStop(1, 'rgba(147,51,234,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Typewriter morph on the gradient headline word. Mutates textContent via a
  // ref (no per-keystroke re-render). Every timeout is tracked and cleared, and
  // the `alive` guard prevents any DOM write after unmount.
  useEffect(() => {
    const el = morphRef.current;
    if (!el) return;

    let alive = true;
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const wait = (ms: number) =>
      new Promise<void>((res) => {
        const t = setTimeout(() => {
          timers.delete(t);
          res();
        }, ms);
        timers.add(t);
      });

    const type = (text: string, speed: number) =>
      new Promise<void>((res) => {
        let i = 0;
        const step = () => {
          if (!alive) return res();
          el.textContent = text.slice(0, ++i);
          if (i < text.length) {
            const t = setTimeout(() => {
              timers.delete(t);
              step();
            }, speed);
            timers.add(t);
          } else res();
        };
        step();
      });

    const del = (text: string, speed: number) =>
      new Promise<void>((res) => {
        let i = text.length;
        const step = () => {
          if (!alive) return res();
          el.textContent = text.slice(0, --i);
          if (i > 0) {
            const t = setTimeout(() => {
              timers.delete(t);
              step();
            }, speed);
            timers.add(t);
          } else res();
        };
        step();
      });

    const run = async () => {
      let k = 0;
      await wait(500);
      while (alive) {
        const wd = MORPH_WORDS[k % MORPH_WORDS.length];
        await type(wd, 65);
        await wait(1500);
        await del(wd, 34);
        await wait(250);
        k++;
      }
    };
    run();

    return () => {
      alive = false;
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  return (
    <div className="landing-root">
      <canvas ref={canvasRef} className="landing-canvas" />
      <div className="landing-glow" />

      {/* Top bar */}
      <div className="landing-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="landing-logo-tile">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="landing-brand">AI Tools</span>
        </div>
        <div className="landing-nav">
          <Link to="/status" className="landing-nav-link">
            Check your browser
          </Link>
          <Link to="/status" className="landing-nav-link">
            Demos
          </Link>
          <a
            href={GITHUB_URL}
            title="GitHub"
            target="_blank"
            rel="noreferrer"
            className="landing-social"
          >
            <svg width="18" height="18" viewBox="0 0 496 512" fill="currentColor">
              <path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6m-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3m44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9M244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8" />
            </svg>
          </a>
          <a
            href={LINKEDIN_URL}
            title="LinkedIn"
            target="_blank"
            rel="noreferrer"
            className="landing-social"
          >
            <svg width="16" height="16" viewBox="0 0 448 512" fill="currentColor">
              <path d="M416 32H31.9C14.3 32 0 46.5 0 64.3v383.4C0 465.5 14.3 480 31.9 480H416c17.6 0 32-14.5 32-32.3V64.3c0-17.8-14.4-32.3-32-32.3M135.4 416H69V202.2h66.5V416zm-33.2-243c-21.3 0-38.5-17.3-38.5-38.5S80.9 96 102.2 96c21.2 0 38.5 17.3 38.5 38.5 0 21.3-17.2 38.5-38.5 38.5m282.1 243h-66.4V312c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9V416h-66.4V202.2h63.7v29.2h.9c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9z" />
            </svg>
          </a>
        </div>
      </div>

      {/* Hero */}
      <div className="landing-hero">
        <div className="landing-badge">
          <span className="landing-badge-dot" />
          ONE ENGINE · MANY APIS
        </div>
        <h1 className="landing-h1">
          The browser
          <br />
          that can <span ref={morphRef} className="landing-morph" />
          <span className="landing-cursor" />
        </h1>
        <p className="landing-subtitle">
          A whole suite of built-in AI APIs on Gemini Nano — pick a capability and it
          just runs, locally. No backend, no API keys, no data leaving your machine.
        </p>
        <div className="landing-cta-row">
          <Link to="/status" className="landing-cta-primary">
            Check your browser
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <Link to="/status" className="landing-cta-secondary">
            Explore the demos
          </Link>
        </div>
      </div>

      {/* Pills */}
      <div className="landing-pills">
        {PILLS.map((p) => (
          <Link key={p.href} to={p.href} className="landing-pill">
            {p.label}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
