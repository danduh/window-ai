/**
 * Shared MIME validation for multimodal image input.
 * Imported by both MultimodalInput (paste path) and MultimodalChatPanel (drop path).
 */

export const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Validates that a File is one of the accepted image MIME types.
 * Returns { valid: true } or { valid: false, error: string }.
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, or WebP images supported' };
  }
  return { valid: true };
}
