---
status: partial
phase: 01-foundation-skeleton
source: [01-VERIFICATION.md]
started: 2026-04-27T07:02:35Z
updated: 2026-04-27T07:02:35Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Page visual rendering and dark-mode toggle
expected: Run `npx nx serve chat`, navigate to `http://localhost:4200/webmcp`. H1 "Recipe Workbench" visible with gradient icon tile; subtitle "A WebMCP demo: tools live on the page, not on a server."; ThemeToggle flips all component bg-/text-/border- classes between light and dark.
result: [pending]

### 2. MissingFlagBanner rendering in standard browser
expected: Open `http://localhost:4200/webmcp` in any non-Chrome-146-Canary browser (or Chrome without the WebMCP flag). Yellow banner appears above the Tabs wrapper with correct copy + code chips for `chrome://flags/#WebMCP`; recipe picker below the banner still shows recipes and responds to clicks.
result: [pending]

### 3. Recipe picker interactivity
expected: Click "Tomato Pasta" in the picker, then click "Buttermilk Pancakes". Clicked button gets `bg-primary-600 text-white` styling and `aria-pressed=true`; recipe title, servings, ingredients list, and steps update immediately with no page reload.
result: [pending]

### 4. IndexedDB persistence across reload
expected: Load `/webmcp`, verify two recipes appear, reload the page, verify recipes still appear (Buttermilk Pancakes, Tomato Pasta) without any loading delay indicating re-seeding.
result: [pending]

### 5. SEO title in browser tab
expected: Browser tab title is "WebMCP Recipe Workbench - navigator.modelContext demo | Chrome AI APIs" after navigating to `/webmcp`.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
