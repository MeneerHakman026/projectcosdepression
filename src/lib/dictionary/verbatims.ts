/**
 * Splits a Verbatims cell into per-participant-group blocks — but only when
 * that can be done without guessing.
 *
 * The source writes one line per participant group, e.g.
 *   PwD:  “quote” “quote”
 *   HCP:   “quote”
 * We split on lines and on the leading role label ONLY. The quotation text
 * after the label is kept exactly as written: individual quotes are never
 * split apart, because the source has nested, unbalanced and straight
 * quotes, editorial context in brackets and punctuation outside quotes, so
 * any further splitting would risk misattributing or altering words.
 *
 * If any non-empty line doesn't start with a known role label, the whole
 * cell is returned as raw text (line breaks preserved) instead.
 */

export type VerbatimBlock = { role: string; text: string };

export type ParsedVerbatims =
  | { kind: "empty" }
  | { kind: "attributed"; blocks: VerbatimBlock[] }
  | { kind: "raw"; text: string };

/**
 * A leading role label: 1–8 letters, optional spaces (French typography puts
 * one before the colon: "P : …"), a colon. Only codes in `roleCodes` count,
 * so a one-letter code such as the French "P" can't match an ordinary word.
 */
const ROLE_LINE = /^\s*([A-Za-z]{1,8})\s*:\s*(\S[\s\S]*?)\s*$/;

/**
 * @param roleCodes the participant-role abbreviations editors have defined
 *   (Content → Outcome Dictionary page). Matching ignores case; the code is
 *   returned in the editor's spelling.
 */
export function parseVerbatims(text: string, roleCodes: readonly string[]): ParsedVerbatims {
  if (!text.trim()) return { kind: "empty" };

  const canonical = new Map(roleCodes.map((code) => [code.toLowerCase(), code]));
  const lines = text.split(/\r\n|\r|\n/).filter((line) => line.trim() !== "");
  const blocks: VerbatimBlock[] = [];

  for (const line of lines) {
    const match = ROLE_LINE.exec(line);
    const role = match && canonical.get(match[1].toLowerCase());
    if (!match || !role) return { kind: "raw", text: text.trim() };
    blocks.push({ role, text: match[2] });
  }
  return { kind: "attributed", blocks };
}
