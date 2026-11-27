/** The Dictionary's container: one balanced content width for heading, search and index. */
export const DICTIONARY_CONTAINER = "mx-auto box-border w-full max-w-[77rem] px-4 sm:px-6 lg:px-9";

/**
 * From this width (Tailwind's `lg`, 1024px) the dictionary is a permanent
 * split view: the index in a ~34% column, the open outcome beside it. Below
 * it a 34% column would be too narrow to search in (~260px at 768px), so
 * tablets and phones keep the full-width index with the entry in a sheet.
 * Keep in step with the `lg:` classes in components/dictionary and the
 * matching media query in globals.css.
 */
export const SPLIT_VIEW_QUERY = "(min-width: 64rem)";
