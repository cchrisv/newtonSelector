/**
 * Search-term highlight tokenizer.
 *
 * Splits a text string into an array of `{ key, text, isHighlight }` tokens
 * around case-insensitive matches of `term`. Used by combobox/listbox
 * renderers to `<mark>` the matching substring inside option rows.
 *
 * Empty term or empty text returns a single non-highlighted token.
 */

function toSafeString(value) {
  return value === undefined || value === null ? "" : String(value);
}

/**
 * @param {string} text — The source string to tokenize.
 * @param {string} term — The search term. Case-insensitive; whitespace trimmed.
 * @returns {Array<{key: string, text: string, isHighlight: boolean}>}
 */
export function buildTokens(text, term) {
  const source = toSafeString(text);
  const query = toSafeString(term).trim().toLowerCase();
  if (!source || !query) {
    return [{ key: "token-0", text: source, isHighlight: false }];
  }

  const lower = source.toLowerCase();
  const parts = [];
  let start = 0;
  let key = 0;

  while (start < source.length) {
    const idx = lower.indexOf(query, start);
    if (idx === -1) {
      parts.push({
        key: `token-${key}`,
        text: source.slice(start),
        isHighlight: false
      });
      break;
    }
    if (idx > start) {
      parts.push({
        key: `token-${key}`,
        text: source.slice(start, idx),
        isHighlight: false
      });
      key += 1;
    }
    parts.push({
      key: `token-${key}`,
      text: source.slice(idx, idx + query.length),
      isHighlight: true
    });
    key += 1;
    start = idx + query.length;
  }

  return parts.length
    ? parts
    : [{ key: "token-0", text: source, isHighlight: false }];
}
