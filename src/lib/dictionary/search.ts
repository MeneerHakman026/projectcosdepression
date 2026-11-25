import { fold, foldWithMap, words } from "./text";
import type { TextField } from "./model";

/**
 * In-browser search over the Dictionary.
 *
 * The whole published dictionary for one language is small (tens to a few
 * hundred outcomes), so searching it in the browser is instant, needs no
 * server round trip per keystroke, and keeps the public page fully cacheable.
 *
 * Matching rules:
 *  - case-, accent- and quote-style-insensitive ("depressao" finds "depressão");
 *  - partial words ("motiv" finds "motivation");
 *  - several words must all match, in any field (AND);
 *  - a word with no exact match tolerates small typos (1 edit for 4–7
 *    letters, 2 for longer), including while still typing ("slep", "anxeity").
 * Results are ranked by where they match: Outcome Domain, then Definition,
 * Experience and Verbatims.
 */

export const SEARCH_FIELDS: TextField[] = ["outcomeDomain", "definition", "experience", "verbatims"];

const WEIGHTS: Record<TextField, number> = { outcomeDomain: 12, definition: 4, experience: 2.5, verbatims: 2 };

type IndexedDoc = { id: string; folded: Record<TextField, string>; words: Set<string> };

export type SearchIndex = { docs: IndexedDoc[]; vocabulary: string[] };

export type Searchable = { id: string } & Record<TextField, { text: string }>;

export function buildSearchIndex(items: readonly Searchable[]): SearchIndex {
  const vocabulary = new Set<string>();
  const docs = items.map((item) => {
    const folded = {} as Record<TextField, string>;
    const docWords = new Set<string>();
    for (const field of SEARCH_FIELDS) {
      folded[field] = fold(item[field].text);
      for (const word of words(folded[field])) {
        docWords.add(word);
        vocabulary.add(word);
      }
    }
    return { id: item.id, folded, words: docWords };
  });
  return { docs, vocabulary: [...vocabulary] };
}

/** Folded query words; one-letter words are ignored unless they're all there is. */
export function parseQuery(query: string): string[] {
  const all = [...new Set(words(fold(query)))];
  const meaningful = all.filter((term) => term.length >= 2);
  return meaningful.length > 0 ? meaningful : all;
}

/** Optimal-string-alignment distance, giving up once it exceeds `max`. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prevPrev: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(prev[j] + 1, current[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) value = Math.min(value, prevPrev[j - 2] + 1);
      current.push(value);
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > max) return max + 1;
    prevPrev = prev;
    prev = current;
  }
  return prev[b.length];
}

function allowedEdits(term: string): number {
  if (term.length < 4) return 0;
  return term.length < 8 ? 1 : 2;
}

/** Vocabulary words a (possibly misspelled or half-typed) term could mean. */
function fuzzyExpansions(term: string, vocabulary: readonly string[]): Set<string> {
  const max = allowedEdits(term);
  const found = new Set<string>();
  if (max === 0) return found;
  for (const word of vocabulary) {
    if (word.includes(term)) continue; // exact partial matches are handled separately
    if (
      editDistance(term, word, max) <= max ||
      (word.length > term.length && editDistance(term, word.slice(0, term.length), max) <= max)
    ) {
      found.add(word);
    }
  }
  return found;
}

export type SearchHit = { id: string; score: number; fields: TextField[] };

export type SearchResult = {
  terms: string[];
  hits: Map<string, SearchHit>;
  /** Exact terms plus the words typo-tolerance matched, for highlighting. */
  highlight: { partial: string[]; whole: string[] };
};

export function search(index: SearchIndex, query: string): SearchResult | null {
  const terms = parseQuery(query);
  if (terms.length === 0) return null;
  // Typo tolerance only for words that occur nowhere as typed: a correctly
  // spelled word ("would") must not also match its neighbours ("world").
  const expansions = new Map(
    terms.map((term) => [
      term,
      index.vocabulary.some((word) => word.includes(term)) ? new Set<string>() : fuzzyExpansions(term, index.vocabulary),
    ])
  );
  const phrase = fold(query).trim();
  const hits = new Map<string, SearchHit>();
  const usedFuzzy = new Set<string>();

  for (const doc of index.docs) {
    let score = 0;
    const fields = new Set<TextField>();
    let matchedAll = true;
    for (const term of terms) {
      let best = 0;
      for (const field of SEARCH_FIELDS) {
        const position = doc.folded[field].indexOf(term);
        if (position < 0) continue;
        const atWordStart = position === 0 || !/[\p{L}\p{N}]/u.test(doc.folded[field][position - 1]);
        best = Math.max(best, WEIGHTS[field] * (atWordStart ? 1.5 : 1));
        fields.add(field);
      }
      if (best === 0) {
        const candidates = [...expansions.get(term)!].filter((word) => doc.words.has(word));
        for (const field of SEARCH_FIELDS) {
          const fieldWords = new Set(words(doc.folded[field]));
          const matched = candidates.filter((word) => fieldWords.has(word));
          if (matched.length === 0) continue;
          best = Math.max(best, WEIGHTS[field] * 0.6);
          fields.add(field);
          matched.forEach((word) => usedFuzzy.add(word));
        }
      }
      if (best === 0) {
        matchedAll = false;
        break;
      }
      score += best;
    }
    if (!matchedAll) continue;
    if (terms.length > 1 && SEARCH_FIELDS.some((field) => doc.folded[field].includes(phrase))) score *= 1.5;
    if (doc.folded.outcomeDomain === phrase) score += 50;
    else if (doc.folded.outcomeDomain.startsWith(phrase)) score += 20;
    hits.set(doc.id, { id: doc.id, score, fields: SEARCH_FIELDS.filter((field) => fields.has(field)) });
  }
  return { terms, hits, highlight: { partial: terms, whole: [...usedFuzzy] } };
}

export type Range = { start: number; end: number };

/** Where the search terms occur in `text`, as ranges of the original (unfolded) string. */
export function highlightRanges(text: string, highlight: SearchResult["highlight"] | null): Range[] {
  if (!highlight || !text) return [];
  const { text: folded, map, originalLength } = foldWithMap(text);
  const ranges: Range[] = [];
  const toOriginal = (start: number, end: number) => {
    const from = map[start];
    const to = end < map.length ? map[end] : originalLength;
    if (to > from) ranges.push({ start: from, end: to });
  };
  for (const term of highlight.partial) {
    for (let at = folded.indexOf(term); at >= 0; at = folded.indexOf(term, at + term.length)) {
      toOriginal(at, at + term.length);
    }
  }
  if (highlight.whole.length > 0) {
    const wanted = new Set(highlight.whole);
    for (const match of folded.matchAll(/[\p{L}\p{N}]+/gu)) {
      if (wanted.has(match[0])) toOriginal(match.index!, match.index! + match[0].length);
    }
  }
  ranges.sort((a, b) => a.start - b.start);
  const merged: Range[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  }
  return merged;
}

export type Snippet = { text: string; ranges: Range[]; leading: boolean; trailing: boolean };

/** A short excerpt around the first match, for showing why a result matched. */
export function snippet(text: string, ranges: Range[], before = 50, after = 110): Snippet | null {
  if (ranges.length === 0) return null;
  const first = ranges[0];
  let start = Math.max(0, first.start - before);
  let end = Math.min(text.length, first.end + after);
  if (start > 0) {
    const space = text.indexOf(" ", start);
    if (space >= 0 && space < first.start) start = space + 1;
  }
  if (end < text.length) {
    const space = text.lastIndexOf(" ", end);
    if (space > first.end) end = space;
  }
  return {
    text: text.slice(start, end),
    ranges: ranges
      .filter((range) => range.start >= start && range.end <= end)
      .map((range) => ({ start: range.start - start, end: range.end - start })),
    leading: start > 0,
    trailing: end < text.length,
  };
}
