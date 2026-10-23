/**
 * A deliberately small inline formatting language for longer text fields.
 * Editors get emphasis, bold and links — nothing that can change layout,
 * inject markup or run script:
 *
 *   *emphasis*          → <em>
 *   **strong**          → <strong>
 *   [label](/path)      → link (href must pass isSafeHref)
 *   \*  \[  \\          → a literal character
 *
 * Text is parsed into a tree and rendered as React elements (see
 * components/RichText.tsx), never as HTML, so anything else an editor
 * types — including "<script>" — is displayed as plain text.
 */

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "em"; children: InlineNode[] }
  | { type: "strong"; children: InlineNode[] }
  | { type: "link"; href: string; children: InlineNode[] };

const ESCAPABLE = new Set(["\\", "*", "[", "]", "(", ")"]);
const LINK_PATTERN = /^\[((?:\\.|[^\]\\])+)\]\(([^()\s]+)\)/;

function findClosing(source: string, from: number, delimiter: "*" | "**"): number {
  for (let i = from; i < source.length; i++) {
    if (source[i] === "\\") {
      i++;
      continue;
    }
    if (delimiter === "**") {
      if (source.startsWith("**", i)) return i;
    } else if (source[i] === "*") {
      // A single "*" closes emphasis; a "**" pair inside it is nested bold.
      if (source[i + 1] === "*") {
        const nested = findClosing(source, i + 2, "**");
        if (nested === -1) return -1;
        i = nested + 1;
        continue;
      }
      return i;
    }
  }
  return -1;
}

export function parseInline(source: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let text = "";

  const flush = () => {
    if (text) {
      nodes.push({ type: "text", value: text });
      text = "";
    }
  };

  let i = 0;
  while (i < source.length) {
    const char = source[i];

    if (char === "\\" && ESCAPABLE.has(source[i + 1])) {
      text += source[i + 1];
      i += 2;
      continue;
    }

    if (source.startsWith("**", i)) {
      const end = findClosing(source, i + 2, "**");
      if (end > i + 2) {
        flush();
        nodes.push({ type: "strong", children: parseInline(source.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    } else if (char === "*") {
      const end = findClosing(source, i + 1, "*");
      if (end > i + 1) {
        flush();
        nodes.push({ type: "em", children: parseInline(source.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    } else if (char === "[") {
      const match = LINK_PATTERN.exec(source.slice(i));
      if (match) {
        flush();
        nodes.push({ type: "link", href: match[2], children: parseInline(match[1]) });
        i += match[0].length;
        continue;
      }
    }

    text += char;
    i++;
  }

  flush();
  return nodes;
}

/** Every link href in a parsed tree, for validation. */
export function collectLinks(nodes: InlineNode[]): string[] {
  return nodes.flatMap((node) => {
    if (node.type === "text") return [];
    const nested = collectLinks(node.children);
    return node.type === "link" ? [node.href, ...nested] : nested;
  });
}

/** The visible text with all formatting removed. */
export function toPlainText(nodes: InlineNode[]): string {
  return nodes.map((node) => (node.type === "text" ? node.value : toPlainText(node.children))).join("");
}
