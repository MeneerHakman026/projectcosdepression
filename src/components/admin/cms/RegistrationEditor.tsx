"use client";

import Link from "next/link";
import type { RegistrationContent } from "@/content/registration/schema";
import ContentEditor, { type ContentEditorProps } from "./ContentEditor";
import { ListField, RichTextField, SectionPanel, TextAreaField, TextField } from "./fields";

const FORMATTING_HINT = "You can use italic, bold and links.";

export default function RegistrationEditor(
  props: Omit<ContentEditorProps, "children"> & { initialContent: RegistrationContent }
) {
  return (
    <ContentEditor {...props}>
      <div className="border-l-4 border-accent bg-paper-alt px-4 py-3 text-sm text-ink">
        <p>
          You can edit the wording around the form. The form itself — its fields, the consent statement,
          what&apos;s stored and how long it&apos;s kept — is managed by the developers and can&apos;t be
          changed here, so it stays consistent with the Privacy Policy.
        </p>
        <p className="mt-2">
          Where the site&apos;s Expression of Interest buttons lead is set in{" "}
          <Link href="/admin/content/pages/eoi-button" className="underline underline-offset-2">
            Expression of Interest button
          </Link>
          .
        </p>
      </div>

      <SectionPanel path="intro" title="Introduction (top of page)" description="Heading and explanation above the form" defaultOpen>
        <TextField path="intro.eyebrow" label="Small label above the heading" maxLength={40} />
        <TextField path="intro.heading" label="Main heading" />
        <TextAreaField path="intro.description" label="Text under the heading" rows={3} />
        <RichTextField path="intro.note" label="Highlighted note" hint={FORMATTING_HINT} rows={3} />
      </SectionPanel>

      <SectionPanel path="form" title="Form" description="Heading shown above the form">
        <TextField path="form.heading" label="Form heading" />
      </SectionPanel>

      <SectionPanel path="beforeYouSubmit" title="Before you submit" description="Information next to the form">
        <TextField path="beforeYouSubmit.heading" label="Heading" />
        <ListField<string>
          path="beforeYouSubmit.points"
          label="Points"
          hint="Each point is shown as a bullet. Keep these consistent with the Privacy Policy."
          min={1}
          max={12}
          itemLabel={(item, index) => `Point ${index + 1}`}
          newItem={() => ""}
          renderItem={(itemPath, index) => (
            <RichTextField path={itemPath} label={`Point ${index + 1}`} hint={FORMATTING_HINT} rows={2} />
          )}
        />
        <RichTextField
          path="beforeYouSubmit.closing"
          label="Closing paragraph"
          hint={`${FORMATTING_HINT} Links can go to a page (/privacy), an https:// address or an email (mailto:).`}
          rows={4}
        />
      </SectionPanel>

      <SectionPanel path="success" title="Thank-you page" description="Shown after someone submits the form">
        <TextField path="success.heading" label="Heading" />
        <TextAreaField path="success.description" label="Text" rows={2} />
        <TextField path="success.homeLinkLabel" label="Link back to the homepage" />
      </SectionPanel>

      <SectionPanel path="seo" title="Search engines and sharing" description="Page title and description shown in search results">
        <TextField path="seo.title" label="Page title" hint="Shown in the browser tab and search results." />
        <TextAreaField path="seo.description" label="Description" hint="One or two sentences shown in search results." rows={3} />
      </SectionPanel>
    </ContentEditor>
  );
}
