"use client";

import Link from "next/link";
import type { DictionaryPageContent, ParticipantRole } from "@/content/dictionary/schema";
import ContentEditor, { type ContentEditorProps } from "./ContentEditor";
import { ListField, RichTextField, SectionPanel, TextAreaField, TextField } from "./fields";

const FORMATTING_HINT = "You can use italic, bold and links.";

export default function DictionaryPageEditor(
  props: Omit<ContentEditorProps, "children"> & { initialContent: DictionaryPageContent }
) {
  return (
    <ContentEditor {...props}>
      <div className="border-l-4 border-accent bg-paper-alt px-4 py-3 text-sm text-ink">
        <p>
          This is the wording <em>around</em> the Outcome Dictionary. The dictionary entries — categories, group domains,
          outcomes, definitions, experiences and quotations — come only from Excel imports, so the research team&apos;s
          workbook stays the single source of truth.
        </p>
        <p className="mt-2">
          Manage the entries in{" "}
          <Link href="/admin/content/dictionary" className="underline underline-offset-2">
            Content → Outcome Dictionary
          </Link>
          .
        </p>
      </div>

      <SectionPanel path="intro" title="Introduction (top of page)" description="Heading and explanation above the search" defaultOpen>
        <TextField path="intro.eyebrow" label="Small label above the heading" maxLength={40} />
        <TextField path="intro.heading" label="Main heading" />
        <RichTextField path="intro.description" label="Introduction" hint={FORMATTING_HINT} rows={4} />
      </SectionPanel>

      <SectionPanel path="explorer" title="Category explorer" description="Heading above the category cards">
        <TextField path="explorer.heading" label="Heading" />
      </SectionPanel>

      <SectionPanel path="verbatims" title="Participant quotations" description="Heading, note and participant groups">
        <TextField path="verbatims.heading" label="Heading above the quotations" />
        <RichTextField path="verbatims.note" label="Note under the quotations" hint={FORMATTING_HINT} rows={2} />
        <ListField<ParticipantRole>
          path="verbatims.roles"
          label="Participant groups"
          hint="Each abbreviation must match the label before the colon in the Verbatims column (e.g. “PwD:”). Lines with an abbreviation listed here are shown as separate, labelled quotation blocks; if any line doesn't start with a listed abbreviation, that outcome's quotations are shown exactly as written instead."
          max={12}
          itemLabel={(item, index) => item?.code || `Group ${index + 1}`}
          newItem={() => ({ code: "", label: "" })}
          renderItem={(itemPath) => (
            <>
              <TextField path={`${itemPath}.code`} label="Abbreviation" maxLength={8} />
              <TextField path={`${itemPath}.label`} label="Meaning" maxLength={80} />
            </>
          )}
        />
      </SectionPanel>

      <SectionPanel path="source" title="Source and about" description="Shown at the bottom of the page">
        <TextField path="source.heading" label="Heading" />
        <RichTextField
          path="source.body"
          label="Text"
          hint={`${FORMATTING_HINT} Cite the publication the dictionary comes from.`}
          rows={5}
        />
      </SectionPanel>

      <SectionPanel path="unavailable" title="Before the first publication" description="Shown while no dictionary is published">
        <TextField path="unavailable.heading" label="Heading" />
        <RichTextField path="unavailable.body" label="Text" hint={FORMATTING_HINT} rows={2} />
      </SectionPanel>

      <SectionPanel path="seo" title="Search engines and sharing" description="Page title and description shown in search results">
        <TextField path="seo.title" label="Page title" hint="Shown in the browser tab and search results." />
        <TextAreaField path="seo.description" label="Description" hint="One or two sentences shown in search results." rows={3} />
      </SectionPanel>
    </ContentEditor>
  );
}
