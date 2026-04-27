# Phase 2 — Human UAT Script

**Required browser:** Chrome 146.0.7672.0+ Canary (or newer Canary). Confirm via `chrome://version`.

**Required flags (BOTH must be Enabled, then relaunch):**
- `chrome://flags/#WebMCP for testing` → **Enabled** (page-side `navigator.modelContext`)
- `chrome://flags/#enable-webmcp-testing` → **Enabled** (extension-side `navigator.modelContextTesting` — Tool Inspector requires this)
- `chrome://flags/#prompt-api-for-gemini-nano` → **Enabled** (or whatever the current built-in `LanguageModel` flag is on the target Canary)

**Required extension:** [Model Context Tool Inspector on Chrome Web Store](https://chromewebstore.google.com/detail/webmcp-devtools/cgfogfkcfjdgpekdndcihajfjkaekjcl) OR build from source ([beaufortfrancois/model-context-tool-inspector](https://github.com/beaufortfrancois/model-context-tool-inspector)).

**Local dev server:** `npx nx serve chat` → `http://localhost:4300/webmcp` (the project's locked port — NOT 4200).

***

## UAT-01 — Page-level tool registration (MCP-02 / D-07)

1. Open `http://localhost:4300/webmcp`. The Recipe Workbench page renders.
2. Look at the page header: a green pill reading **`✓ 8 tools registered`** sits immediately to the LEFT of the dark-mode toggle.
3. **Pass:** the pill is green and shows `8`.
4. **Fail mode A** — if the pill is yellow `⚠ {n} of 8 tools registered`: at least one tool failed to register. Open DevTools → Console; the page logged `[RecipeWorkbench] Tool registration failed: ...` with the failure reason. Capture the message and file an issue.
5. **Fail mode B** — if the pill is hidden AND the yellow `WebMCP isn't enabled in this browser` banner appears below the header: the `#WebMCP for testing` flag is OFF or the browser is too old. Re-check the prereqs.

## UAT-02 — Tool Inspector discoverability (MCP-05)

1. With UAT-01 passing, click the WebMCP Tool Inspector extension icon in the Chrome toolbar. The side panel opens.
2. The panel lists exactly **8** tools. Names (in the order rendered by `recipeTools.ts`):
   - `listRecipes`
   - `getRecipe`
   - `generateShoppingList`
   - `selectRecipe`
   - `scaleRecipe`
   - `swapIngredient`
   - `addIngredient`
   - `removeIngredient`
3. Click each tool to expand it. Verify:
   - The description text matches the strings in `chat/src/app/services/recipeTools.ts` (the same JSON Schema → `inputSchema` block).
   - The `inputSchema` JSON tree is expandable.
   - For mutating tools (`scaleRecipe`, `swapIngredient`, `addIngredient`, `removeIngredient`), the schema lists `recipeId` as optional.
4. The extension toolbar badge shows `8` on the active tab.
5. **Pass:** all 8 tools listed with their descriptions and schemas; badge reads `8`.
6. **Fail mode** — if 0 tools appear in the panel: the `#enable-webmcp-testing` flag is OFF (RESEARCH §Tool Inspector Verification pitfall). Toggle it on, relaunch Chrome, re-test.

## UAT-03 — Tool invocation via Tool Inspector (MCP-04 + W1 fix verification)

1. In the Tool Inspector panel, select `listRecipes` from the tool dropdown. Click "Execute Tool".
2. The result area shows a JSON array with two recipes: `buttermilk-pancakes` (servings 4) and `tomato-pasta` (servings 2).
3. Select `scaleRecipe`. In the args textarea enter `{"servings": 8, "recipeId": "buttermilk-pancakes"}` and click "Execute Tool".
4. The result area shows `{"id": "buttermilk-pancakes", "oldServings": 4, "newServings": 8, "factor": 2}`.
5. **Without reloading the page**, look back at the Recipe Workbench. With the buttermilk-pancakes recipe selected, every ingredient quantity has DOUBLED (e.g. flour 200g → 400g, buttermilk 240ml → 480ml) and the header reads "Serves 8".
6. **W1 fix verification (drawer-side highlight from external-agent call):** while the `scaleRecipe` invocation is mid-flight (you may need to repeat with a slow-running tool), expand the drawer's inner Tools panel. The `scaleRecipe` row should briefly show the live-active highlight (`bg-primary-50` / dark mode `bg-primary-900/20`) — proving the page's merged `liveToolName` state is plumbed into the drawer's inner ToolListPanel for external-agent calls. (If the call is too fast to observe, this UAT step can be marked deferred; the automated grep on `liveToolName={liveToolName}` in `RecipeWorkbenchPage.tsx` proves the wiring is present.)
7. Reload the page (F5). The recipe still shows servings=8 with doubled ingredients (persisted via IndexedDB through `RecipePersistence.saveRecipe`).
8. **Pass:** UI updated live (step 5) AND survived reload (step 7); W1 highlight observed OR wiring grep confirmed (step 6).
9. **Fail mode** — if the recipe view didn't update live: `notifyRecipeStore()` is missing in the handler OR the page-side `subscribeRecipeStore` listener isn't wired. Check the registration mount-effect and the recipeStore subscription effect in `RecipeWorkbenchPage.tsx`.

**Reset between UATs:** open DevTools → Application → IndexedDB → `window-ai-recipes` → right-click → Clear. Reload `/webmcp` to re-seed.

## UAT-04 — In-page agent tool-calling demo (AGENT-01 / AGENT-02 / AGENT-03 — the canonical 2-min demo)

1. Reset IndexedDB (above) so the seed pancakes recipe is back to servings=4 with `buttermilk` 240ml.
2. Reload `/webmcp`. With the buttermilk-pancakes recipe selected (default), look at the chat drawer below the recipe view.
3. **If the drawer shows the yellow `Chrome built-in AI isn't available` inline banner:** Chrome's built-in `LanguageModel` is not yet available on this profile. Visit `chrome://components`, find the "Optimization Guide On Device Model" (or current name), click Update, wait for download, and try again. Recipe browsing + Tool Inspector still work; this UAT step is the only one blocked.
4. Type into the chat input: **`scale to 6 and swap milk for oat milk`** and press Enter.
5. Within ~5–15 seconds (non-streaming `session.prompt()`):
   - One or more `⚙ Calling scaleRecipe(servings: 6, …)…` and `⚙ Calling swapIngredient(from: "milk", to: "oat milk", …)…` system bubbles appear in the transcript, transitioning to `✓ scaleRecipe done` and `✓ swapIngredient done`.
   - The recipe view above updates LIVE: header now shows "Serves 6"; ingredient list shows `oat milk` (replacing `buttermilk`) at the scaled quantity (240 × 6/4 = 360 ml — rounded to 2 decimals); other ingredients are also scaled (e.g. flour 200g → 300g).
   - The assistant's text response below the indicators says something like "I scaled the recipe to 6 servings and swapped buttermilk for oat milk." (exact wording is model-dependent).
6. Reload the page (F5). The recipe is still at servings=6 with oat milk and scaled quantities (persisted via IndexedDB).
7. **Pass:** the full demo completed in well under 2 minutes from page load to step 6.
8. **Fail modes:**
   - Indicator bubbles appear but recipe doesn't update live → `notifyRecipeStore()` missing in `executeScaleRecipe` and/or `executeSwapIngredient` (RESEARCH §Pitfall #5). Check `recipeToolHandlers.ts`.
   - Only one of the two tools fires → the model decided to do them serially or the system prompt isn't clear enough about concurrent tool calls. Try rephrasing as two separate requests; non-blocking for milestone.
   - "✗ swapIngredient failed: No ingredient matching 'milk'" → the substring matcher is broken. Verify `name.toLowerCase().includes(needle)` is intact in `executeSwapIngredient`.

## UAT-05 — Tool unregistration on navigation (MCP-02 unmount)

1. Confirm UAT-01 pill reads `✓ 8 tools registered` on `/webmcp`.
2. Navigate to `/chat` (or any non-`/webmcp` route).
3. Open the Tool Inspector. Badge should read 0 (or no Recipe Workbench tools listed).
4. Navigate back to `/webmcp`.
5. Pill reads `✓ 8 tools registered` again. Badge reads 8 again.
6. **Pass:** the AbortController-based cleanup runs on route change and tools re-register on re-mount without `InvalidStateError` (RESEARCH §Pitfall #8).

***

## Acceptance gate

UAT-01, UAT-02, UAT-03, UAT-04, UAT-05 must all PASS for Phase 2 to be considered shipped. UAT-04 step 3 is the only one with a non-product blocker (model not yet downloaded); it is acceptable to defer just that single step's "in-page agent invocation" check if the model is unavailable on the test machine, provided UAT-02 + UAT-03 pass (proving the WebMCP surface is correct and external agents can drive the same tools). UAT-03 step 6 (W1 highlight observation) may be marked deferred if the tool call is too fast to observe; the automated wiring-grep substitute is sufficient.

## Reporter hand-off note

Capture for the SUMMARY:
- Chrome Canary version (from `chrome://version`).
- Both flag states (screenshot or note "ENABLED").
- Tool Inspector badge count (should be 8).
- A single screenshot of `/webmcp` after UAT-04 completing showing servings=6 + `oat milk` ingredient.
