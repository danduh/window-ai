// Carousel HTML generator for the sandboxed inner iframe.
//
// Source: 05-CONTEXT.md (Carousel HTML generation, Sandbox + iframe rendering strategy),
// 05-RESEARCH.md (Pattern 2 Double-iframe HTML structure, Security Domain HTML entity escaping),
// 05-UI-SPEC.md (Inline CSS Subset, Body reset, CSS custom properties).
//
// Exports renderCarouselHTML(recipes): string — returns a complete double-iframe HTML document.
// The inner iframe carries the locked inline CSS subset, the inner bridge script, and
// HTML-entity-escaped recipe cards.
//
// Do NOT use Tailwind classes inside the carousel HTML (05-RESEARCH.md Pitfall 3).
// Only class names from the 05-UI-SPEC.md Inline CSS Subset table are used.

import type { Recipe } from '../../../services/RecipePersistence';
import { outerShellHTML, innerIframeBridgeScript } from './iframeBridgeScript';

// ── HTML entity escaping ──────────────────────────────────────────────────────
// Required per 05-RESEARCH.md Security Domain: "HTML entity escaping is required"

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Inline CSS subset ─────────────────────────────────────────────────────────
// Locked verbatim from 05-UI-SPEC.md "Inline CSS Subset" + "Body reset" + CSS custom properties.
// Class names: .carousel, .card, .card-title, .badge, .ingredients, .pick-btn (+ pseudo-class variants).
// Spacing tokens are all multiples of 4px per 05-UI-SPEC.md checker sign-off.

const CSS_SUBSET = `
:root {
  --c-bg: #ffffff;
  --c-surface: #f9fafb;
  --c-border: #e5e7eb;
  --c-text-primary: #111827;
  --c-text-secondary: #6b7280;
  --c-badge-bg: #dbeafe;
  --c-badge-text: #1e40af;
  --c-btn-bg: #2563eb;
  --c-btn-hover: #1d4ed8;
  --c-btn-text: #ffffff;
}
[data-theme="dark"] {
  --c-bg: #1f2937;
  --c-surface: #374151;
  --c-border: #4b5563;
  --c-text-primary: #f9fafb;
  --c-text-secondary: #9ca3af;
  --c-badge-bg: #1e3a8a;
  --c-badge-text: #93c5fd;
  --c-btn-bg: #3b82f6;
  --c-btn-hover: #2563eb;
  --c-btn-text: #ffffff;
}
html, body {
  margin: 0;
  padding: 0;
  background: var(--c-bg);
  color: var(--c-text-primary);
  font-family: system-ui, -apple-system, sans-serif;
  box-sizing: border-box;
}
body { min-height: 200px; }
*, *::before, *::after { box-sizing: inherit; }
.carousel {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  gap: 0.5rem;
  padding: 0.5rem;
  scrollbar-width: thin;
  scrollbar-color: var(--c-border) transparent;
}
.card {
  flex-shrink: 0;
  width: 220px;
  scroll-snap-align: start;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 0.75rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.card-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--c-text-primary);
  line-height: 1.3;
  margin: 0;
}
.badge {
  font-size: 0.8125rem;
  color: var(--c-badge-text);
  background: var(--c-badge-bg);
  border-radius: 9999px;
  padding: 0.25rem 0.5rem;
  display: inline-block;
  width: fit-content;
}
.ingredients {
  font-size: 0.8125rem;
  color: var(--c-text-secondary);
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.pick-btn {
  margin-top: auto;
  background: var(--c-btn-bg);
  color: var(--c-btn-text);
  border: none;
  border-radius: 0.375rem;
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  transition: background 0.15s;
  line-height: 1;
}
.pick-btn:hover { background: var(--c-btn-hover); }
.pick-btn:focus { outline: 2px solid var(--c-btn-bg); outline-offset: 2px; }
.pick-btn:disabled { opacity: 0.6; cursor: not-allowed; }
/* Tiny-viewport fallback only — the iframe is ALWAYS narrower than its host chat bubble
   (ChatBubbleContainer max-w-2xl ≈ 672px), so the previous 639px breakpoint always fired
   and collapsed the horizontal scroll-snap row to a vertical stack. Drop the breakpoint
   to 359px so the carousel scrolls horizontally inside the chat bubble at every realistic
   width, and only stacks on truly tiny widths (uncommon screens). */
@media (max-width: 359px) {
  .carousel {
    flex-direction: column;
    overflow-x: visible;
    scroll-snap-type: none;
  }
  .card { width: 100%; }
}
`;

// ── Recipe card renderer ──────────────────────────────────────────────────────

function renderCard(recipe: Recipe): string {
  const badge =
    recipe.totalMinutes !== undefined
      ? `<span class="badge">${escapeHtml(String(recipe.totalMinutes))} min</span>`
      : '';

  const ingredientItems = recipe.ingredients
    .slice(0, 3)
    .map((i) => `<li>${escapeHtml(i.name)}</li>`)
    .join('');

  return `<div class="card">
  <h3 class="card-title">${escapeHtml(recipe.title)}</h3>
  ${badge}
  <ul class="ingredients">
    ${ingredientItems}
  </ul>
  <button class="pick-btn" data-recipe-id="${escapeAttr(recipe.id)}" type="button">Pick</button>
</div>`;
}

// ── renderCarouselHTML ────────────────────────────────────────────────────────

/**
 * Returns a complete double-iframe HTML document.
 *
 * Outer shell: outerShellHTML (from iframeBridgeScript.ts) with the inner srcdoc substituted.
 * Inner document: CSP meta tag, locked inline CSS subset, HTML-escaped recipe cards,
 * and the inner bridge script.
 *
 * Source: 05-CONTEXT.md locked Carousel HTML generation decision.
 * Security: recipe.title and ingredient names are HTML-escaped before interpolation.
 */
export function renderCarouselHTML(recipes: Recipe[]): string {
  const cards = recipes.map(renderCard).join('\n');

  const innerHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:">
  <style>${CSS_SUBSET}</style>
</head>
<body>
  <div class="carousel">
${cards}
  </div>
  <script>${innerIframeBridgeScript}</script>
</body>
</html>`;

  // Substitute the inner HTML into the outer shell's placeholder.
  // escapeAttr ensures the srcdoc attribute value is properly encoded
  // (double quotes become &quot; so the attribute is not broken).
  return outerShellHTML.replace('__INNER_SRCDOC__', escapeAttr(innerHTML));
}
