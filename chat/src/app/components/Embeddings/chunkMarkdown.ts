/**
 * Split a markdown document into clean, searchable "passages" suitable for
 * generating embeddings.
 *
 * Rules applied (in document order):
 * - Split the document on blank lines into blocks; trim each block and collapse
 *   any internal whitespace/newlines down to single spaces.
 * - Drop empty blocks and pure-formatting/separator lines (e.g. `---`, `***`,
 *   or a bare list bullet with no text).
 * - A heading line (leading `#`s) becomes its own passage with the leading `#`
 *   characters and whitespace stripped, keeping the heading words.
 * - Lightly de-markdown each passage: strip a leading list marker (`- `, `* `,
 *   `+ `, `1. `) and remove inline emphasis/backtick characters (`*`, `_`,
 *   `` ` ``) while keeping words and punctuation.
 * - Drop passages shorter than ~2 characters.
 * - Cap the result at `opts.maxChunks` (default 100); never exceed it.
 *
 * @param md - The markdown document body.
 * @param opts - Optional settings. `maxChunks` caps the number of passages
 *   returned (default 100).
 * @returns Clean passage texts in document order (empty array for
 *   empty/whitespace-only input).
 */
export function chunkMarkdown(md: string, opts?: { maxChunks?: number }): string[] {
  const maxChunks = opts?.maxChunks ?? 100;

  if (!md || md.trim().length === 0 || maxChunks <= 0) {
    return [];
  }

  const separatorOnly = /^[-*_+\s]+$/;
  const headingPrefix = /^#+\s*/;
  const listMarker = /^(?:[-*+]\s+|\d+\.\s+)/;
  const emphasis = /[*_`]/g;

  const passages: string[] = [];

  // Split on blank lines (a line containing only whitespace) into blocks.
  const blocks = md.split(/\r?\n[ \t]*\r?\n/);

  for (const rawBlock of blocks) {
    // Collapse internal whitespace/newlines to single spaces and trim.
    let text = rawBlock.replace(/\s+/g, ' ').trim();
    if (text.length === 0) {
      continue;
    }

    // Drop pure separators / bare bullets with no text.
    if (separatorOnly.test(text)) {
      continue;
    }

    // Strip a leading heading marker (keep the heading words).
    text = text.replace(headingPrefix, '');

    // Strip a leading list marker.
    text = text.replace(listMarker, '');

    // Remove inline emphasis / backtick characters.
    text = text.replace(emphasis, '');

    // Re-collapse and trim after de-markdown.
    text = text.replace(/\s+/g, ' ').trim();

    if (text.length < 2) {
      continue;
    }

    passages.push(text);

    if (passages.length >= maxChunks) {
      break;
    }
  }

  return passages;
}
