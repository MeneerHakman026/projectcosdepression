"use client";

import { EXTERNAL_URL_HELP, INTERNAL_REGISTRATION_PATH, type EoiButtonContent } from "@/content/eoi-button/schema";
import { resolveEoiButton, type EoiButtonLink } from "@/lib/eoi-button";
import { isSafeExternalUrl } from "@/lib/cms/urls";
import ContentEditor, { fieldId, useEditor, type ContentEditorProps } from "./ContentEditor";
import { TextField } from "./fields";

function describe(link: EoiButtonLink): string {
  return link.external ? `the external study website ${link.href}` : `this site's registration page (${link.href})`;
}

function ButtonSample({ link }: { link: EoiButtonLink }) {
  return (
    <span className="btn btn-primary pointer-events-none" aria-hidden="true">
      {link.label || "…"}
    </span>
  );
}

function DestinationField() {
  const editor = useEditor();
  const mode = editor.get("destination.mode");
  const id = fieldId("destination.mode");
  const options = [
    {
      value: "internal",
      label: "Registration page on this website",
      hint: `Visitors go to ${INTERNAL_REGISTRATION_PATH} and fill in the Expression of Interest form.`,
    },
    {
      value: "external",
      label: "External study website",
      hint: "For when recruitment runs on the study's own registration site. Visitors leave this website.",
    },
  ];

  return (
    <fieldset id={id} className="space-y-3">
      <legend className="block text-sm font-medium text-ink">Where the button goes</legend>
      {options.map((option) => (
        <label key={option.value} className="flex items-start gap-3 border border-border bg-paper px-4 py-3">
          <input
            type="radio"
            name="destination-mode"
            value={option.value}
            checked={mode === option.value}
            disabled={editor.disabled}
            onChange={() => editor.set("destination.mode", option.value)}
            className="mt-1 h-4 w-4 accent-[var(--color-accent)]"
          />
          <span>
            <span className="block text-sm font-medium text-ink">{option.label}</span>
            <span className="block text-sm text-ink-muted">{option.hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function DraftSummary({ live }: { live: EoiButtonLink }) {
  const editor = useEditor();
  const content = { label: editor.get("label"), destination: editor.get("destination") } as EoiButtonContent;
  const external = content.destination.mode === "external";
  const urlValid = isSafeExternalUrl(content.destination.externalUrl.trim());
  const draft = resolveEoiButton({ ...content, label: String(content.label ?? "").trim() });
  const changed = draft.label !== live.label || draft.href !== live.href;

  return (
    <section aria-labelledby="eoi-draft-heading" className="border border-border bg-paper p-5">
      <h2 id="eoi-draft-heading" className="text-body font-semibold text-ink">
        In this draft
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <ButtonSample link={draft} />
        {external && !urlValid ? (
          <p className="text-sm text-red-700">Enter a valid https:// address to see where the button will go.</p>
        ) : (
          <p className="text-sm text-ink">
            Goes to {describe(draft)}.{" "}
            {draft.external && (
              <a href={draft.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                Test this link<span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </p>
        )}
      </div>
      <p className="mt-3 text-sm text-ink-muted">
        {changed
          ? "This is different from the live button. Save the draft, then publish to change the live site."
          : "Same as the live button."}
      </p>
      {external && (
        <p className="mt-3 border-l-4 border-accent bg-paper-alt px-3 py-2 text-sm text-ink">
          The registration page at {INTERNAL_REGISTRATION_PATH} stays online, and its form keeps accepting
          Expressions of Interest, for anyone who reaches it through an old link. Ask the developers if the
          internal form should be closed once recruitment has moved.
        </p>
      )}
    </section>
  );
}

export default function EoiButtonEditor({
  live,
  ...props
}: Omit<ContentEditorProps, "children"> & { initialContent: EoiButtonContent; live: EoiButtonLink }) {
  return (
    <ContentEditor {...props}>
      <section aria-labelledby="eoi-live-heading" className="border-2 border-ink bg-paper p-5">
        <h2 id="eoi-live-heading" className="text-body font-semibold text-ink">
          Live now on the website
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <ButtonSample link={live} />
          <p className="text-sm text-ink">Goes to {describe(live)}.</p>
        </div>
        <p className="mt-3 text-sm text-ink-muted">
          Used by every Expression of Interest button: in the header and mobile menu on every page, and in the
          introduction and closing section of the homepage.
        </p>
      </section>

      <div className="space-y-6 border border-border bg-paper p-5">
        <TextField path="label" label="Button text" maxLength={40} hint='For example "Expression of interest".' />
        <DestinationField />
        <TextField
          path="destination.externalUrl"
          label="External study website address"
          hint={`${EXTERNAL_URL_HELP} Only used when "External study website" is selected; kept here otherwise.`}
        />
      </div>

      <DraftSummary live={live} />
    </ContentEditor>
  );
}
