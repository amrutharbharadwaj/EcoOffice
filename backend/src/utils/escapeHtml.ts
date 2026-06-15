/**
 * Escapes HTML special characters in a string to prevent XSS attacks.
 * Converts < > " ' & to their HTML entity equivalents.
 *
 * @param input - The untrusted string to escape
 * @returns The escaped string safe for inclusion in HTML output
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
