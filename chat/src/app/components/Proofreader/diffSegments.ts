// Hand-rolled span diff for the Proofreader output modes.
// Note: overlapping corrections are not handled — the Proofreader API does not produce them per spec.

export type DiffSegment = {
  type: 'unchanged' | 'removed' | 'inserted';
  text: string;
  correctionTypes?: ProofreaderCorrectionType[];
  explanation?: string;
};

/**
 * Builds an array of diff segments from the original text and the list of corrections
 * returned by `ProofreaderService.proofread()`.
 *
 * Each correction maps a span [startIndex, endIndex) in the original text to a replacement
 * string. This function interleaves `unchanged`, `removed`, and `inserted` segments so that
 * renderers can display any of the three output modes without re-processing the data.
 *
 * @param original   The original input text (the textarea value at proofread time).
 * @param corrections The corrections array from `ProofreadResult`.
 * @returns           Ordered array of `DiffSegment` values.
 */
export function buildDiffSegments(
  original: string,
  corrections: ProofreaderCorrection[],
): DiffSegment[] {
  // Edge case: empty corrections → single unchanged segment
  if (corrections.length === 0) {
    return [{ type: 'unchanged', text: original }];
  }

  // Defensive copy + sort by startIndex ascending
  const sorted = [...corrections].sort((a, b) => a.startIndex - b.startIndex);

  const segments: DiffSegment[] = [];
  let cursor = 0;

  for (const c of sorted) {
    // Emit unchanged text before this correction
    if (cursor < c.startIndex) {
      segments.push({ type: 'unchanged', text: original.slice(cursor, c.startIndex) });
    }

    // Emit removed segment (original span — may be empty for pure insertions)
    segments.push({
      type: 'removed',
      text: original.slice(c.startIndex, c.endIndex),
      correctionTypes: c.types,
      explanation: c.explanation,
    });

    // Emit inserted segment (the replacement text)
    segments.push({
      type: 'inserted',
      text: c.correction,
      correctionTypes: c.types,
      explanation: c.explanation,
    });

    cursor = c.endIndex;
  }

  // Emit final unchanged tail
  if (cursor < original.length) {
    segments.push({ type: 'unchanged', text: original.slice(cursor) });
  }

  return segments;
}
