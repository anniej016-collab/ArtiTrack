/**
 * Turns a JavaScript object literal into JSON.
 *
 * Hand-maintained data files hold their records as source code rather than
 * JSON: keys are bare words, comments explain the sections, and there are
 * trailing commas. None of that parses, and a regex over the whole text would
 * corrupt any string containing a brace, a comment marker or an apostrophe —
 * of which a discography has plenty. So the text is scanned once, tracking
 * whether it is inside a string, and only the parts outside one are rewritten.
 */
export function objectLiteralToJson(source: string): string {
  let out = "";
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    // Strings pass through untouched, apart from normalising the quote style.
    if (char === '"' || char === "'") {
      const { text, next } = readString(source, index);
      out += text;
      index = next;
      continue;
    }

    if (char === "/" && source[index + 1] === "*") {
      const end = source.indexOf("*/", index + 2);
      index = end === -1 ? source.length : end + 2;
      continue;
    }

    if (char === "/" && source[index + 1] === "/") {
      const end = source.indexOf("\n", index);
      index = end === -1 ? source.length : end;
      continue;
    }

    // A trailing comma before a closing bracket, which JSON rejects.
    if (char === ",") {
      const rest = source.slice(index + 1);
      const nextNonSpace = rest.match(/^\s*([^\s])/)?.[1];
      if (nextNonSpace === "]" || nextNonSpace === "}") {
        index += 1;
        continue;
      }
    }

    // A bare key: an identifier sitting immediately before a colon.
    const key = /^([A-Za-z_$][\w$]*)(\s*):/.exec(source.slice(index));
    if (key && isKeyPosition(out)) {
      out += `"${key[1]}"${key[2]}:`;
      index += key[0].length;
      continue;
    }

    out += char;
    index += 1;
  }

  return out;
}

/** Only a `{` or `,` can precede a key, ignoring whitespace. */
function isKeyPosition(emitted: string): boolean {
  const previous = emitted.trimEnd().slice(-1);
  return previous === "{" || previous === "," || previous === "";
}

function readString(source: string, start: number): { text: string; next: number } {
  const quote = source[start];
  let out = "";
  let index = start + 1;

  while (index < source.length) {
    const char = source[index];

    if (char === "\\") {
      const escaped = source[index + 1] ?? "";
      // A single quote needs no escape in JSON, and \' is not valid there.
      out += escaped === "'" ? "'" : char + escaped;
      index += 2;
      continue;
    }

    if (char === quote) {
      return { text: `"${out}"`, next: index + 1 };
    }

    // A literal double quote inside a single-quoted string has to be escaped
    // once that string becomes double-quoted.
    out += char === '"' ? '\\"' : char;
    index += 1;
  }

  throw new Error("Unterminated string in the pasted data.");
}

/**
 * Pulls one named array out of a source file, brackets balanced.
 *
 * Counting brackets rather than matching to the last `]` in the file: the array
 * is followed by more code, and any string inside it may itself contain a
 * bracket.
 */
export function extractArrayLiteral(source: string, name: string): string | null {
  const start = new RegExp(`(?:const|let|var)\\s+${name}\\s*=\\s*\\[`).exec(source);
  if (!start) return null;

  const open = start.index + start[0].length - 1;
  let depth = 0;
  let index = open;

  while (index < source.length) {
    const char = source[index];

    if (char === '"' || char === "'") {
      index = readString(source, index).next;
      continue;
    }
    if (char === "/" && source[index + 1] === "*") {
      const end = source.indexOf("*/", index + 2);
      index = end === -1 ? source.length : end + 2;
      continue;
    }
    if (char === "[") depth += 1;
    if (char === "]") {
      depth -= 1;
      if (depth === 0) return source.slice(open, index + 1);
    }
    index += 1;
  }

  return null;
}
