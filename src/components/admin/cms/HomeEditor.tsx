"use client";

import type { DevelopmentStepContent, HomeContent, ResearchMetricContent } from "@/content/home/schema";
import { joinPath, type ContentPath } from "@/lib/cms/paths";
import type { Citation, Reference } from "@/lib/cms/validation";
import ContentEditor, { useEditor, type ContentEditorProps } from "./ContentEditor";
import {
  CtaFields,
  ImageField,
  ListField,
  OptionalNumberField,
  RichTextField,
  SectionPanel,
  SelectField,
  TextAreaField,
  TextField,
} from "./fields";

const ACCENT_OPTIONS = [
  { value: "teal", label: "Teal" },
  { value: "mint", label: "Mint" },
  { value: "navy", label: "Navy" },
];

const FORMATTING_HINT = "You can use italic, bold and links.";

function CitationsField({ path, label, hint }: { path: ContentPath; label: string; hint?: string }) {
  const editor = useEditor();
  const references = (editor.get("references") as Reference[] | undefined) ?? [];
  const options = references.map((ref) => ({ value: ref.id, label: `${ref.shortName} — ${ref.title}` }));

  return (
    <ListField<Citation>
      path={path}
      label={label}
      hint={hint}
      itemLabel={(item, index) =>
        references.find((ref) => ref.id === item.referenceId)?.shortName ?? `Source ${index + 1}`
      }
      newItem={() => ({ referenceId: references[0]?.id ?? "", pages: "" })}
      renderItem={(itemPath) => (
        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <SelectField path={joinPath(itemPath, "referenceId")} label="Source" options={options} />
          <TextField path={joinPath(itemPath, "pages")} label="Page(s)" hint="Optional, e.g. p.695" />
        </div>
      )}
    />
  );
}

export default function HomeEditor(props: Omit<ContentEditorProps, "children"> & { initialContent: HomeContent }) {
  return (
    <ContentEditor {...props}>
      <SectionPanel path="hero" title="Introduction (top of page)" description="Heading, introduction, buttons and photo" defaultOpen>
        <TextField path="hero.eyebrow" label="Small label above the heading" maxLength={40} />
        <TextField path="hero.heading" label="Main heading" />
        <RichTextField path="hero.intro" label="Introduction" hint={FORMATTING_HINT} />
        <CtaFields path="hero.primaryCta" label="Main button" />
        <CtaFields path="hero.secondaryCta" label="Second button" />
        <ImageField path="hero.image" label="Photo" />
      </SectionPanel>

      <SectionPanel path="about" title="What is COS-D?" description="Explains the project and why it matters" hasVisibility>
        <TextField path="about.heading" label="Heading" />
        <RichTextField path="about.body" label="Explanation" hint={FORMATTING_HINT} rows={6} />
        <TextField path="about.whyHeading" label="Second heading" />
        <RichTextField path="about.whyBody" label="Second paragraph" hint={FORMATTING_HINT} rows={5} />
      </SectionPanel>

      <SectionPanel
        path="evidence"
        title="Research evidence"
        description="Figures from earlier research that motivate COS-D"
        hasVisibility
      >
        <TextField path="evidence.heading" label="Heading" />
        <RichTextField path="evidence.intro" label="Introduction" hint={FORMATTING_HINT} />
        <ListField<ResearchMetricContent>
          path="evidence.metrics"
          label="Figures"
          hint="Each figure must be traceable to a published source (see docs/CONTENT_SOURCES.md). These are findings from earlier research — never current COS-D participation numbers."
          min={1}
          max={8}
          itemLabel={(item, index) => `${item.value || `Figure ${index + 1}`} — ${item.label}`}
          newItem={() => ({ value: "", label: "", context: "", sourceLabel: "", year: "", citations: [] })}
          renderItem={(itemPath) => (
            <>
              <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
                <TextField path={joinPath(itemPath, "value")} label="Figure" hint='As written, e.g. "<25%"' />
                <TextField path={joinPath(itemPath, "label")} label="Short label" />
              </div>
              <TextAreaField path={joinPath(itemPath, "context")} label="What it means" rows={2} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  path={joinPath(itemPath, "sourceLabel")}
                  label="Source as shown on the page"
                  hint='e.g. "Veal et al."'
                />
                <TextField path={joinPath(itemPath, "year")} label="Year as shown on the page" hint='e.g. "2024"' />
              </div>
              <CitationsField
                path={joinPath(itemPath, "citations")}
                label="Sources"
                hint="Which paper(s) this figure comes from. Not shown on the page; keeps it traceable."
              />
            </>
          )}
        />
        <RichTextField path="evidence.footnote" label="Note below the figures" hint={FORMATTING_HINT} />
      </SectionPanel>

      <SectionPanel
        path="development"
        title="How COS-D is being developed"
        description="The study steps, their status, and participation"
        hasVisibility
      >
        <TextField path="development.heading" label="Heading" />
        <RichTextField path="development.intro" label="Introduction" hint={FORMATTING_HINT} />
        <ListField<DevelopmentStepContent>
          path="development.steps"
          label="Steps"
          hint="Only change a status when there's a confirmed source for it."
          min={1}
          max={6}
          itemLabel={(item, index) => `${item.step || `Step ${index + 1}`}: ${item.title}`}
          newItem={() => ({ step: "", title: "", status: "", description: "", accent: "teal" })}
          renderItem={(itemPath) => (
            <>
              <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
                <TextField path={joinPath(itemPath, "step")} label="Step label" hint='e.g. "Step 1"' />
                <TextField path={joinPath(itemPath, "title")} label="Title" />
              </div>
              <TextField path={joinPath(itemPath, "status")} label="Status" hint='e.g. "Complete"' />
              <TextAreaField path={joinPath(itemPath, "description")} label="Description" rows={3} />
              <SelectField path={joinPath(itemPath, "accent")} label="Colour" options={ACCENT_OPTIONS} />
            </>
          )}
        />
        <RichTextField path="development.steeringNote" label="Note below the steps" hint={FORMATTING_HINT} />
        <CitationsField
          path="development.citations"
          label="Sources for this section"
          hint="Not shown on the page; keeps the step statuses traceable."
        />
        <fieldset className="space-y-4 border-t border-border pt-6">
          <legend className="text-sm font-semibold text-ink">Participation</legend>
          <OptionalNumberField
            path="development.participation.count"
            label="Number of people who have taken part"
            hint="Leave empty until the Step 2 survey is open and you have a real figure. Never use PROCEED numbers or recruitment targets here."
          />
          <TextField path="development.participation.countLabel" label="Text after the number" />
          <TextField path="development.participation.emptyHeading" label="Heading while there's no number" />
          <TextAreaField path="development.participation.emptyBody" label="Text while there's no number" rows={2} />
        </fieldset>
      </SectionPanel>

      <SectionPanel path="involved" title="Who's involved" description="The groups taking part" hasVisibility>
        <TextField path="involved.heading" label="Heading" />
        <RichTextField path="involved.intro" label="Introduction" hint={FORMATTING_HINT} />
        <ListField<HomeContent["involved"]["groups"][number]>
          path="involved.groups"
          label="Groups"
          min={1}
          max={6}
          itemLabel={(item, index) => item.title || `Group ${index + 1}`}
          newItem={() => ({ title: "", description: "", accent: "teal" })}
          renderItem={(itemPath) => (
            <>
              <TextField path={joinPath(itemPath, "title")} label="Name" />
              <TextAreaField path={joinPath(itemPath, "description")} label="Description" rows={2} />
              <SelectField path={joinPath(itemPath, "accent")} label="Colour" options={ACCENT_OPTIONS} />
            </>
          )}
        />
      </SectionPanel>

      <SectionPanel path="explore" title="Explore COS-D" description="Links to other pages" hasVisibility>
        <TextField path="explore.heading" label="Heading" />
        <TextAreaField path="explore.intro" label="Introduction" rows={2} />
        <ListField<HomeContent["explore"]["links"][number]>
          path="explore.links"
          label="Links"
          min={1}
          max={8}
          itemLabel={(item, index) => item.label || `Link ${index + 1}`}
          newItem={() => ({ label: "", href: "/", description: "" })}
          renderItem={(itemPath) => (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField path={joinPath(itemPath, "label")} label="Title" />
                <TextField path={joinPath(itemPath, "href")} label="Links to" hint="e.g. /study" />
              </div>
              <TextAreaField path={joinPath(itemPath, "description")} label="Description" rows={2} />
            </>
          )}
        />
      </SectionPanel>

      <SectionPanel path="finalCta" title="Closing call to action" description="Dark band at the bottom of the page" hasVisibility>
        <TextField path="finalCta.heading" label="Heading" />
        <RichTextField path="finalCta.body" label="Text" hint={FORMATTING_HINT} />
        <CtaFields path="finalCta.primaryCta" label="Main button" />
        <CtaFields path="finalCta.secondaryCta" label="Second button" />
      </SectionPanel>

      <SectionPanel path="seo" title="Search engines and sharing" description="Page title and description shown in search results">
        <TextField path="seo.title" label="Page title" hint="Shown in the browser tab and search results." />
        <TextAreaField path="seo.description" label="Description" hint="One or two sentences shown in search results." rows={3} />
      </SectionPanel>

      <SectionPanel path="references" title="Sources" description="Scientific papers the figures on this page are traced to">
        <ListField<Reference>
          path="references"
          label="Sources"
          hint="Figures and sections link to these. A source that's still cited can't be removed — the page won't save until its citations are changed."
          max={50}
          itemLabel={(item, index) => item.shortName || `Source ${index + 1}`}
          newItem={() => ({
            id: "",
            shortName: "",
            authors: "",
            title: "",
            journal: "",
            year: "",
            details: "",
            doi: "",
            url: "",
            note: "",
          })}
          renderItem={(itemPath) => (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField path={joinPath(itemPath, "shortName")} label="Short name" hint='e.g. "Veal 2024"' />
                <TextField
                  path={joinPath(itemPath, "id")}
                  label="ID"
                  hint='Lowercase with dashes, e.g. "veal-2024". Changing it breaks citations that use it.'
                />
              </div>
              <TextField path={joinPath(itemPath, "authors")} label="Authors" />
              <TextAreaField path={joinPath(itemPath, "title")} label="Title" rows={2} />
              <div className="grid gap-4 sm:grid-cols-3">
                <TextField path={joinPath(itemPath, "journal")} label="Journal" />
                <TextField path={joinPath(itemPath, "year")} label="Year" />
                <TextField path={joinPath(itemPath, "details")} label="Volume and pages" hint='e.g. "11:285–294"' />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField path={joinPath(itemPath, "doi")} label="DOI" hint='e.g. "10.1016/…" — copy it from the paper.' />
                <TextField path={joinPath(itemPath, "url")} label="Web address" hint="Optional, https:// only." />
              </div>
              <TextAreaField path={joinPath(itemPath, "note")} label="Note" rows={2} />
            </>
          )}
        />
      </SectionPanel>
    </ContentEditor>
  );
}
