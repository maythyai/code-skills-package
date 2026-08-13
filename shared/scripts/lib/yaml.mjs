/**
 * shared/scripts/lib/yaml.mjs — minimal YAML frontmatter parser shared across
 * CSP build/validate scripts.
 *
 * Scope: parses ONLY the subset of YAML that appears in SKILL.md frontmatter —
 *   - scalar key: value
 *   - quoted scalars ("..." / '...')
 *   - inline arrays [a, b, c]
 *   - block arrays (key:\n  - item\n  - item)
 *   - nested objects (one level of indentation is tracked via a stack)
 *   - multiline scalars via `>` / `|` (folded/literal)
 *
 * Out of scope (will not parse correctly): anchors/aliases, merge keys, tags,
 * multi-line inline JSON, deep nesting beyond what frontmatter uses.
 *
 * Previously three copies of this logic lived in build-skpg.mjs, validate-skill-v2.mjs,
 * and build-skill-metadata.mjs with subtly different behaviour — a maintenance and
 * correctness hazard. This is the single source.
 */

/** Extract the `---\n...\n---` frontmatter block from a markdown file. */
export function extractFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1] : null;
}

/**
 * Index of the ']' that closes the leading '[' in `s` (top-level, quote-aware:
 * a ']' inside a quoted item does not close), or -1 if unmatched.
 */
function inlineArrayCloseIndex(s) {
  let depth = 0;
  let inS = false, inD = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inS) { if (c === "'") inS = false; continue; }
    if (inD) { if (c === '"') inD = false; continue; }
    if (c === "'") inS = true;
    else if (c === '"') inD = true;
    else if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

/**
 * True iff `s` is a complete inline array: starts with '[' AND the matching ']'
 * is the last non-whitespace character (nothing meaningful trails it). This
 * avoids misclassifying a scalar like `[note] some text` as an array. Used to
 * decide whether a value that starts with '[' is a complete inline array or a
 * multi-line one that still needs more physical lines accumulated.
 */
function inlineArrayComplete(s) {
  if (!s.startsWith('[')) return false;
  const closeIdx = inlineArrayCloseIndex(s);
  if (closeIdx === -1) return false;
  return s.slice(closeIdx + 1).trim() === '';
}

/**
 * Parse a minimal-YAML frontmatter body into a plain object.
 *
 * @param {string} content — the text between the --- fences
 * @param {{coerce?: boolean}} [opts] — coerce 'true'/'false'/numeric strings
 *   to boolean/number (build-skill-metadata wants this; build-skpg/validate
 *   leave scalars as strings).
 * @returns {Record<string, any>}
 */
export function parseSimpleYaml(content, { coerce = false } = {}) {
  const result = {};
  const lines = content.split('\n');

  // Stack of { indent, obj } — nesting context. indent -1 is the root.
  const stack = [{ indent: -1, obj: result }];

  // Multiline scalar (`>` / `|`) collection state
  let ml = null; // { key, parent, keyIndent, buf }

  const finishMultiline = () => {
    if (!ml) return;
    const joined = ml.buf.map(l => l.trim()).filter(Boolean).join('\n');
    ml.parent.obj[ml.key] = joined;
    ml = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Inside a multiline scalar: consume blank or deeper-indented lines.
    if (ml) {
      const ind = line.search(/\S/); // -1 for blank
      if (line.trim() === '' || ind > ml.keyIndent) {
        ml.buf.push(line);
        continue;
      }
      finishMultiline();
      // fall through to process this line normally
    }

    if (!line.trim() || line.trim().startsWith('#')) continue;

    const indent = line.search(/\S/);
    const trimmed = line.trim();

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack[stack.length - 1];

    // Block list item:  - value  →  append to the most recent key on the parent
    if (trimmed.startsWith('- ')) {
      const v = trimmed.substring(2).trim().replace(/^["']|["']$/g, '');
      const keys = Object.keys(parent.obj);
      const lastKey = keys[keys.length - 1];
      if (lastKey !== undefined) {
        if (Array.isArray(parent.obj[lastKey])) parent.obj[lastKey].push(v);
        else if (parent.obj[lastKey] === undefined || parent.obj[lastKey] === '') parent.obj[lastKey] = [v];
      }
      continue;
    }

    // key: value
    const colonMatch = trimmed.match(/^([^:]+):\s*(.*)$/);
    if (!colonMatch) continue;
    const key = colonMatch[1].trim().replace(/^["']|["']$/g, '');
    let value = colonMatch[2].trim();

    // Multiline scalar indicators: >, |, >-, |-, >+, |+ (with chomping/strip flags)
    if (/^[>|][+-]?$/.test(value)) {
      ml = { key, parent, keyIndent: indent, buf: [] };
      continue;
    }

    if (value === '') {
      // Empty value: peek next non-blank line to decide array vs nested object vs empty.
      let nextNonBlank = null;
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() !== '') { nextNonBlank = lines[j]; break; }
      }
      if (nextNonBlank && nextNonBlank.search(/\S/) > indent) {
        if (nextNonBlank.trim().startsWith('- ')) {
          // block array under this key — list items will be pushed by the
          // "- value" handler below, attaching to the most-recent key.
          parent.obj[key] = [];
        } else {
          // nested mapping object
          parent.obj[key] = {};
          stack.push({ indent, obj: parent.obj[key] });
        }
        continue;
      }
      parent.obj[key] = '';
      continue;
    }

    // Inline array [a, b, c] — possibly spanning multiple physical lines
    // (e.g. `keywords: ["a",\n  "b"]`). Decide via bracket balance:
    //   - balanced AND closing ']' is the last meaningful char → complete array
    //   - unbalanced (no closing ']' yet) → accumulate subsequent lines, retry
    //   - balanced but with trailing text (e.g. `[note] text`) → scalar, leave
    // Quote-aware via inlineArrayCloseIndex/inlineArrayComplete so a ']'
    // inside a quoted item doesn't close early.
    if (value.startsWith('[')) {
      // Accumulate only while brackets are unbalanced (truly incomplete).
      while (inlineArrayCloseIndex(value) === -1 && i + 1 < lines.length) {
        value += ' ' + lines[++i].trim();
      }
      if (inlineArrayComplete(value)) {
        const closeIdx = inlineArrayCloseIndex(value);
        value = value.slice(1, closeIdx)
          .split(',')
          .map(s => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
      }
      // else: balanced-with-trailing-text or still unbalanced → scalar string
    } else if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else if (coerce) {
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (!isNaN(value)) value = Number(value);
    }

    parent.obj[key] = value;
  }

  finishMultiline();
  return result;
}
