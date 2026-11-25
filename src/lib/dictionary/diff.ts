import { summarize } from "./content";
import {
  MASTER_FIELDS,
  TEXT_FIELDS,
  type ContentSummary,
  type DictionaryContent,
  type MasterField,
  type MasterOutcome,
} from "./model";
import { cleanLabel } from "./text";
import { deriveTaxonomy, type Taxonomy } from "./taxonomy";

/**
 * Compares two complete dictionaries: what an import would change, what a
 * draft changes relative to the live version, or any two versions in the
 * history. Everything is compared by stable outcome ID.
 */

export type FieldChange = {
  field: MasterField;
  before: string;
  after: string;
  /** Only spaces or line breaks differ — easy to miss, so flagged. */
  whitespaceOnly: boolean;
};

export type OutcomeRef = { id: string; label: string; category: string; group: string };
export type ModifiedOutcome = OutcomeRef & { changes: FieldChange[] };

export type GroupRef = { category: string; group: string };

export type TranslationDiff = {
  language: string;
  status: "added" | "removed" | "changed" | "unchanged";
  before: number;
  after: number;
  added: OutcomeRef[];
  removed: OutcomeRef[];
  modified: ModifiedOutcome[];
  labelChanges: { kind: "category" | "group"; english: string; before: string | null; after: string | null }[];
};

export type DatasetDiff = {
  identical: boolean;
  before: ContentSummary;
  after: ContentSummary;
  outcomes: {
    added: OutcomeRef[];
    removed: OutcomeRef[];
    modified: ModifiedOutcome[];
    unchanged: number;
    /** Same outcomes, different source order. */
    orderChanged: boolean;
  };
  categories: { added: string[]; removed: string[]; renamed: { from: string; to: string }[] };
  groups: { added: GroupRef[]; removed: GroupRef[]; renamed: { category: string; from: string; to: string }[] };
  verbatimsChanged: number;
  translations: TranslationDiff[];
};

function ref(outcome: MasterOutcome): OutcomeRef {
  return {
    id: outcome.id,
    label: cleanLabel(outcome.outcomeDomain),
    category: cleanLabel(outcome.category),
    group: cleanLabel(outcome.groupDomain),
  };
}

function squash(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function fieldChange(field: MasterField, before: string, after: string): FieldChange {
  return { field, before, after, whitespaceOnly: squash(before) === squash(after) };
}

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

function diffTaxonomy(before: Taxonomy, after: Taxonomy) {
  const removedCategories = before.categories.filter((c) => !after.categoryByKey.has(c.key));
  const addedCategories = after.categories.filter((c) => !before.categoryByKey.has(c.key));
  const renamedCategories: { from: string; to: string }[] = [];
  for (const removed of [...removedCategories]) {
    const match = addedCategories.find((added) => sameIds(added.outcomeIds, removed.outcomeIds));
    if (match) {
      renamedCategories.push({ from: removed.label, to: match.label });
      removedCategories.splice(removedCategories.indexOf(removed), 1);
      addedCategories.splice(addedCategories.indexOf(match), 1);
    }
  }

  const beforeGroups = [...before.groupByKey.values()];
  const afterGroups = [...after.groupByKey.values()];
  const categoryLabel = (taxonomy: Taxonomy, key: string) => taxonomy.categoryByKey.get(key)?.label ?? key;
  const removedGroups = beforeGroups.filter((g) => !after.groupByKey.has(g.key));
  const addedGroups = afterGroups.filter((g) => !before.groupByKey.has(g.key));
  const renamedGroups: { category: string; from: string; to: string }[] = [];
  for (const removed of [...removedGroups]) {
    const match = addedGroups.find((added) => sameIds(added.outcomeIds, removed.outcomeIds));
    if (match) {
      renamedGroups.push({ category: categoryLabel(after, match.categoryKey), from: removed.label, to: match.label });
      removedGroups.splice(removedGroups.indexOf(removed), 1);
      addedGroups.splice(addedGroups.indexOf(match), 1);
    }
  }

  return {
    categories: {
      added: addedCategories.map((c) => c.label),
      removed: removedCategories.map((c) => c.label),
      renamed: renamedCategories,
    },
    groups: {
      added: addedGroups.map((g) => ({ category: categoryLabel(after, g.categoryKey), group: g.label })),
      removed: removedGroups.map((g) => ({ category: categoryLabel(before, g.categoryKey), group: g.label })),
      renamed: renamedGroups,
    },
  };
}

function diffTranslation(
  language: string,
  before: DictionaryContent,
  after: DictionaryContent,
  beforeTaxonomy: Taxonomy,
  afterTaxonomy: Taxonomy
): TranslationDiff {
  const old = before.translations[language];
  const next = after.translations[language];
  const masterById = new Map([...before.master.outcomes, ...after.master.outcomes].map((o) => [o.id, o]));
  const refOf = (id: string) => {
    const outcome = masterById.get(id);
    return outcome ? ref(outcome) : { id, label: id, category: "", group: "" };
  };
  const oldOutcomes = old?.outcomes ?? {};
  const newOutcomes = next?.outcomes ?? {};

  const added = Object.keys(newOutcomes).filter((id) => !(id in oldOutcomes)).map(refOf);
  const removed = Object.keys(oldOutcomes).filter((id) => !(id in newOutcomes)).map(refOf);
  const modified: ModifiedOutcome[] = [];
  for (const [id, entry] of Object.entries(newOutcomes)) {
    const previous = oldOutcomes[id];
    if (!previous) continue;
    const changes = TEXT_FIELDS.filter((field) => (previous[field] ?? "") !== (entry[field] ?? "")).map((field) =>
      fieldChange(field, previous[field] ?? "", entry[field] ?? "")
    );
    if (changes.length > 0) modified.push({ ...refOf(id), changes });
  }

  const labelChanges: TranslationDiff["labelChanges"] = [];
  const compareLabels = (kind: "category" | "group", a: Record<string, string>, b: Record<string, string>) => {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (a[key] === b[key]) continue;
      const english =
        kind === "category"
          ? (afterTaxonomy.categoryByKey.get(key) ?? beforeTaxonomy.categoryByKey.get(key))?.label
          : (afterTaxonomy.groupByKey.get(key) ?? beforeTaxonomy.groupByKey.get(key))?.label;
      labelChanges.push({ kind, english: english ?? key, before: a[key] ?? null, after: b[key] ?? null });
    }
  };
  compareLabels("category", old?.categories ?? {}, next?.categories ?? {});
  compareLabels("group", old?.groups ?? {}, next?.groups ?? {});

  const status: TranslationDiff["status"] = !old
    ? "added"
    : !next
      ? "removed"
      : added.length + removed.length + modified.length + labelChanges.length > 0
        ? "changed"
        : "unchanged";
  return {
    language,
    status,
    before: Object.keys(oldOutcomes).length,
    after: Object.keys(newOutcomes).length,
    added,
    removed,
    modified,
    labelChanges,
  };
}

export function diffContents(before: DictionaryContent, after: DictionaryContent): DatasetDiff {
  const beforeById = new Map(before.master.outcomes.map((o) => [o.id, o]));
  const afterById = new Map(after.master.outcomes.map((o) => [o.id, o]));

  const added = after.master.outcomes.filter((o) => !beforeById.has(o.id)).map(ref);
  const removed = before.master.outcomes.filter((o) => !afterById.has(o.id)).map(ref);
  const modified: ModifiedOutcome[] = [];
  let unchanged = 0;
  let verbatimsChanged = 0;
  for (const outcome of after.master.outcomes) {
    const previous = beforeById.get(outcome.id);
    if (!previous) continue;
    const changes = MASTER_FIELDS.filter((field) => field !== "id" && previous[field] !== outcome[field]).map((field) =>
      fieldChange(field, previous[field], outcome[field])
    );
    if (changes.length === 0) unchanged++;
    else modified.push({ ...ref(outcome), changes });
    if (changes.some((change) => change.field === "verbatims" && !change.whitespaceOnly)) verbatimsChanged++;
  }

  const commonBefore = before.master.outcomes.filter((o) => afterById.has(o.id)).map((o) => o.id);
  const commonAfter = after.master.outcomes.filter((o) => beforeById.has(o.id)).map((o) => o.id);
  const orderChanged = commonBefore.some((id, index) => commonAfter[index] !== id);

  const beforeTaxonomy = deriveTaxonomy(before.master.outcomes);
  const afterTaxonomy = deriveTaxonomy(after.master.outcomes);
  const taxonomy = diffTaxonomy(beforeTaxonomy, afterTaxonomy);

  const languages = [...new Set([...Object.keys(before.translations), ...Object.keys(after.translations)])].sort();
  const translations = languages.map((language) =>
    diffTranslation(language, before, after, beforeTaxonomy, afterTaxonomy)
  );

  const identical =
    added.length === 0 &&
    removed.length === 0 &&
    modified.length === 0 &&
    !orderChanged &&
    translations.every((t) => t.status === "unchanged");

  return {
    identical,
    before: summarize(before),
    after: summarize(after),
    outcomes: { added, removed, modified, unchanged, orderChanged },
    ...taxonomy,
    verbatimsChanged,
    translations,
  };
}

export type ReviewAlert = { tone: "danger" | "caution"; message: string };

/** The things an administrator must not miss before saving or publishing. */
export function reviewAlerts(diff: DatasetDiff): ReviewAlert[] {
  const alerts: ReviewAlert[] = [];
  const removed = diff.outcomes.removed.length;
  if (removed > 0) {
    const large = removed >= Math.max(5, Math.ceil(diff.before.outcomes * 0.1));
    alerts.push({
      tone: large ? "danger" : "caution",
      message: `${removed} outcome${removed > 1 ? "s" : ""} will be removed from the dictionary${large ? ` — that's ${Math.round((removed / Math.max(1, diff.before.outcomes)) * 100)}% of the current outcomes` : ""}.`,
    });
  }
  if (diff.categories.removed.length > 0) {
    alerts.push({
      tone: "danger",
      message: `Categor${diff.categories.removed.length > 1 ? "ies" : "y"} removed: ${diff.categories.removed.join(", ")}.`,
    });
  }
  if (diff.groups.removed.length > 0) {
    alerts.push({
      tone: "caution",
      message: `Group domain${diff.groups.removed.length > 1 ? "s" : ""} removed: ${diff.groups.removed.map((g) => `${g.group} (${g.category})`).join(", ")}.`,
    });
  }
  if (diff.verbatimsChanged > 0) {
    alerts.push({
      tone: "caution",
      message: `Participant quotations (Verbatims) change in ${diff.verbatimsChanged} outcome${diff.verbatimsChanged > 1 ? "s" : ""}. Check each change carefully — quotations must match the source exactly.`,
    });
  }
  for (const translation of diff.translations) {
    if (translation.removed.length > 0 && translation.status !== "removed") {
      alerts.push({
        tone: "caution",
        message: `${translation.removed.length} ${translation.language} translation${translation.removed.length > 1 ? "s" : ""} will be removed.`,
      });
    }
    if (translation.status === "removed") {
      alerts.push({ tone: "danger", message: `The ${translation.language} translation will be removed entirely.` });
    }
  }
  return alerts;
}

/** Whether saving needs an explicit "I understand" from the administrator. */
export function needsAcknowledgement(diff: DatasetDiff): boolean {
  return (
    diff.outcomes.removed.length > 0 ||
    diff.categories.removed.length > 0 ||
    diff.translations.some((t) => t.status === "removed")
  );
}
