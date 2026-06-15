"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeHtml = escapeHtml;
/**
 * Escapes HTML special characters in a string to prevent XSS attacks.
 * Converts < > " ' & to their HTML entity equivalents.
 *
 * @param input - The untrusted string to escape
 * @returns The escaped string safe for inclusion in HTML output
 */
function escapeHtml(input) {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}
//# sourceMappingURL=escapeHtml.js.map