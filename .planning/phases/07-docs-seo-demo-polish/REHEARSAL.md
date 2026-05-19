# Phase 7 Demo Rehearsal — Cold-Run Log

**Goal:** 5 consecutive clean runs of the 90-second demo flow on the speaker's laptop (Chrome 146+ Canary, WebMCP flag enabled). Zero outbound network requests. No failed inferences.

**Cold-run definition:** fresh Chrome profile OR DevTools → Application → Storage → "Clear site data" → reload. Each run starts from empty IDB + cleared LanguageModel session.

**Demo script:**
1. Open `/generative-ui` in Chrome 146 Canary.
2. Open DevTools → Network tab; clear; start recording.
3. Type a recipe query into chat (e.g. "Find me a 30-minute chicken dinner").
4. Confirm: carousel renders inside the chat bubble; Pick buttons visible and unclipped.
5. Click "Pick" on a card.
6. Confirm: MealPlanColumn updates within one animation frame with the recipe title (not the ID).
7. Confirm: Network tab shows zero outbound requests after initial page paint.
8. Stop recording, archive Network trace if any cold run fails.

## Cold run 1

- Date / time:
- Browser version:
- Result (PASS / FAIL):
- Failures observed:
- Network requests after paint:
- Notes / fixes applied:

## Cold run 2

- Date / time:
- Browser version:
- Result (PASS / FAIL):
- Failures observed:
- Network requests after paint:
- Notes / fixes applied:

## Cold run 3

- Date / time:
- Browser version:
- Result (PASS / FAIL):
- Failures observed:
- Network requests after paint:
- Notes / fixes applied:

## Cold run 4

- Date / time:
- Browser version:
- Result (PASS / FAIL):
- Failures observed:
- Network requests after paint:
- Notes / fixes applied:

## Cold run 5

- Date / time:
- Browser version:
- Result (PASS / FAIL):
- Failures observed:
- Network requests after paint:
- Notes / fixes applied:

## Summary

- Consecutive clean runs:
- GENUI-14 status:
- GENUI-15 status:
- Sign-off:
