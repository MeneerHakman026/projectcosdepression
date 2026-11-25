import type { MasterOutcome } from "./model";
import { cleanLabel, labelKey, slugify } from "./text";

/**
 * Derives the Category → Group Domain hierarchy from the master rows.
 *
 * - Each distinct category (compared by labelKey) is one category.
 * - Each distinct group domain *within its category* is one group: two
 *   groups with the same name under different categories stay separate.
 * - Order follows the first appearance in the source rows.
 * - The display label is the first spelling seen (trimmed); other spellings
 *   of the same key are reported by the importer as inconsistencies.
 */

export type TaxonomyGroup = {
  key: string;
  slug: string;
  label: string;
  categoryKey: string;
  outcomeIds: string[];
};

export type TaxonomyCategory = {
  key: string;
  slug: string;
  label: string;
  groups: TaxonomyGroup[];
  outcomeIds: string[];
};

export type Taxonomy = {
  categories: TaxonomyCategory[];
  categoryByKey: Map<string, TaxonomyCategory>;
  groupByKey: Map<string, TaxonomyGroup>;
};

/** Separator that can't occur in a label, so "A"+"B C" never collides with "A B"+"C". */
const KEY_SEPARATOR = "␟";

export function categoryKeyOf(category: string): string {
  return labelKey(category);
}

export function groupKeyOf(category: string, groupDomain: string): string {
  return `${labelKey(category)}${KEY_SEPARATOR}${labelKey(groupDomain)}`;
}

function uniqueSlug(base: string, used: Set<string>): string {
  let slug = base;
  for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
  used.add(slug);
  return slug;
}

export function deriveTaxonomy(outcomes: readonly MasterOutcome[]): Taxonomy {
  const categories: TaxonomyCategory[] = [];
  const categoryByKey = new Map<string, TaxonomyCategory>();
  const groupByKey = new Map<string, TaxonomyGroup>();
  const categorySlugs = new Set<string>();
  const groupSlugs = new Set<string>();

  for (const outcome of outcomes) {
    const categoryKey = categoryKeyOf(outcome.category);
    let category = categoryByKey.get(categoryKey);
    if (!category) {
      const label = cleanLabel(outcome.category);
      category = { key: categoryKey, slug: uniqueSlug(slugify(label), categorySlugs), label, groups: [], outcomeIds: [] };
      categoryByKey.set(categoryKey, category);
      categories.push(category);
    }
    category.outcomeIds.push(outcome.id);

    const groupKey = groupKeyOf(outcome.category, outcome.groupDomain);
    let group = groupByKey.get(groupKey);
    if (!group) {
      const label = cleanLabel(outcome.groupDomain);
      group = { key: groupKey, slug: uniqueSlug(slugify(label), groupSlugs), label, categoryKey, outcomeIds: [] };
      groupByKey.set(groupKey, group);
      category.groups.push(group);
    }
    group.outcomeIds.push(outcome.id);
  }

  return { categories, categoryByKey, groupByKey };
}

export function countGroups(taxonomy: Taxonomy): number {
  return taxonomy.groupByKey.size;
}
