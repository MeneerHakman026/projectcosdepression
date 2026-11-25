import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import DictionaryPage, { filtersFromSearchParams } from "@/components/dictionary/DictionaryPage";
import type { DictionaryPageContent } from "@/content/dictionary/schema";
import { DICTIONARY_PAGE } from "@/lib/cms/pages";
import { getPublishedContent } from "@/lib/cms/server";
import { canonicalLanguage } from "@/lib/dictionary/languages";
import { MASTER_LANGUAGE, OUTCOME_ID_PATTERN } from "@/lib/dictionary/model";
import { getPublishedView } from "@/lib/dictionary/server";

type Props = PageProps<"/dictionary/[[...outcome]]">;

function requestedLanguage(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw && canonicalLanguage(raw)) || MASTER_LANGUAGE;
}

function safeDecode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/** The outcome ID in the path, or undefined for the overview; notFound() for anything else. */
function outcomeIdFrom(segments: string[] | undefined): string | undefined {
  if (!segments || segments.length === 0) return undefined;
  const id = segments.length === 1 ? safeDecode(segments[0]) : null;
  if (!id || !OUTCOME_ID_PATTERN.test(id)) notFound();
  return id;
}

async function load(props: Props) {
  const [{ outcome }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const id = outcomeIdFrom(outcome);
  const language = requestedLanguage(searchParams.lang);
  const [content, view] = await Promise.all([
    getPublishedContent(DICTIONARY_PAGE) as Promise<DictionaryPageContent>,
    getPublishedView(language),
  ]);
  return { id, searchParams, content, view };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id, content, view } = await load(props);
  const outcome = id ? view?.outcomes.find((o) => o.id === id) : undefined;
  if (!outcome) {
    return { title: content.seo.title, description: content.seo.description, alternates: { canonical: "/dictionary" } };
  }
  const definition = outcome.definition.text.replace(/\s+/g, " ");
  return {
    title: `${outcome.outcomeDomain.text} — ${content.seo.title}`,
    description: definition.length > 200 ? `${definition.slice(0, 197)}…` : definition,
    alternates: { canonical: `/dictionary/${encodeURIComponent(outcome.id)}` },
  };
}

export default async function DictionaryRoute(props: Props) {
  const { id, searchParams, content, view } = await load(props);

  if (id) {
    if (!view) notFound();
    if (!view.outcomes.some((o) => o.id === id)) {
      // IDs are case-insensitive in links: /dictionary/v_01 → /dictionary/V_01.
      const match = view.outcomes.find((o) => o.id.toLowerCase() === id.toLowerCase());
      if (!match) notFound();
      redirect(`/dictionary/${encodeURIComponent(match.id)}${view.language !== MASTER_LANGUAGE ? `?lang=${view.language}` : ""}`);
    }
  }

  return (
    <DictionaryPage
      content={content}
      view={view}
      basePath="/dictionary"
      urlMode="path"
      filters={filtersFromSearchParams(searchParams)}
    />
  );
}
