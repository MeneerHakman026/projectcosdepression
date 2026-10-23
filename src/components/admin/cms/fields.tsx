"use client";

import { useId, useRef, type ReactNode } from "react";
import RichText from "@/components/RichText";
import { joinPath, type ContentPath } from "@/lib/cms/paths";
import { isSafeImagePath } from "@/lib/cms/urls";
import { fieldId, useEditor } from "./ContentEditor";

const inputClasses =
  "mt-2 w-full border border-border bg-paper px-3 py-2 text-body text-ink disabled:opacity-60 aria-[invalid=true]:border-red-600";
const labelClasses = "block text-sm font-medium text-ink";
const hintClasses = "mt-1 text-sm text-ink-muted";

type BaseFieldProps = {
  path: ContentPath;
  label: string;
  hint?: ReactNode;
};

function FieldErrors({ id, errors }: { id: string; errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <ul id={id} className="mt-1 space-y-0.5 text-sm text-red-700">
      {errors.map((error) => (
        <li key={error}>{error}</li>
      ))}
    </ul>
  );
}

function useField(path: ContentPath, hint: ReactNode) {
  const editor = useEditor();
  const id = fieldId(path);
  const errors = editor.errorsFor(path);
  const describedBy = [hint ? `${id}-hint` : null, errors.length ? `${id}-errors` : null].filter(Boolean).join(" ");
  return {
    editor,
    id,
    errors,
    inputProps: {
      id,
      disabled: editor.disabled,
      "aria-invalid": errors.length > 0 || undefined,
      "aria-describedby": describedBy || undefined,
    },
  };
}

export function TextField({ path, label, hint, maxLength }: BaseFieldProps & { maxLength?: number }) {
  const { editor, id, errors, inputProps } = useField(path, hint);
  const value = String(editor.get(path) ?? "");
  return (
    <div>
      <label htmlFor={id} className={labelClasses}>
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className={hintClasses}>
          {hint}
        </p>
      )}
      <input
        {...inputProps}
        type="text"
        value={value}
        maxLength={maxLength}
        onChange={(event) => editor.set(path, event.target.value)}
        className={inputClasses}
      />
      <FieldErrors id={`${id}-errors`} errors={errors} />
    </div>
  );
}

export function TextAreaField({ path, label, hint, rows = 3 }: BaseFieldProps & { rows?: number }) {
  const { editor, id, errors, inputProps } = useField(path, hint);
  return (
    <div>
      <label htmlFor={id} className={labelClasses}>
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className={hintClasses}>
          {hint}
        </p>
      )}
      <textarea
        {...inputProps}
        rows={rows}
        value={String(editor.get(path) ?? "")}
        onChange={(event) => editor.set(path, event.target.value)}
        className={inputClasses}
      />
      <FieldErrors id={`${id}-errors`} errors={errors} />
    </div>
  );
}

/**
 * Longer text with simple formatting (see lib/cms/rich-text.ts). Toolbar
 * buttons wrap the selected text; a live preview shows the result.
 */
export function RichTextField({ path, label, hint, rows = 4 }: BaseFieldProps & { rows?: number }) {
  const { editor, id, errors, inputProps } = useField(path, hint);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const value = String(editor.get(path) ?? "");

  function wrapSelection(before: string, after: string, placeholder: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart: start, selectionEnd: end } = textarea;
    const selected = value.slice(start, end) || placeholder;
    editor.set(path, value.slice(0, start) + before + selected + after + value.slice(end));
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  function insertLink() {
    const href = window.prompt("Link address (for example /study or https://…)");
    if (href) wrapSelection("[", `](${href.trim()})`, "link text");
  }

  const toolbarButton = "border border-border bg-paper px-2.5 py-1 text-sm text-ink hover:bg-paper-alt disabled:opacity-60";

  return (
    <div>
      <label htmlFor={id} className={labelClasses}>
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className={hintClasses}>
          {hint}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-1" role="toolbar" aria-label={`Formatting for ${label}`}>
        <button
          type="button"
          className={`${toolbarButton} italic`}
          disabled={editor.disabled}
          onClick={() => wrapSelection("*", "*", "emphasised text")}
        >
          Italic
        </button>
        <button
          type="button"
          className={`${toolbarButton} font-bold`}
          disabled={editor.disabled}
          onClick={() => wrapSelection("**", "**", "bold text")}
        >
          Bold
        </button>
        <button type="button" className={toolbarButton} disabled={editor.disabled} onClick={insertLink}>
          Link
        </button>
      </div>
      <textarea
        {...inputProps}
        ref={textareaRef}
        rows={rows}
        value={value}
        onChange={(event) => editor.set(path, event.target.value)}
        className={`${inputClasses} mt-1 font-mono text-sm`}
      />
      <FieldErrors id={`${id}-errors`} errors={errors} />
      <details className="mt-2 text-sm text-ink-muted">
        <summary className="cursor-pointer select-none">Preview and formatting help</summary>
        <div className="mt-2 border-l-2 border-border pl-3 text-ink">
          <RichText text={value} />
        </div>
        <p className="mt-2">
          <code>*text*</code> for <em>italic</em>, <code>**text**</code> for <strong>bold</strong>,{" "}
          <code>[text](/page)</code> for a link. Put <code>\</code> before <code>*</code> or <code>[</code> to show
          them as ordinary characters.
        </p>
      </details>
    </div>
  );
}

export function CheckboxField({ path, label, hint }: BaseFieldProps) {
  const { editor, id, errors, inputProps } = useField(path, hint);
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          {...inputProps}
          type="checkbox"
          checked={Boolean(editor.get(path))}
          onChange={(event) => editor.set(path, event.target.checked)}
          className="mt-1 h-4 w-4 accent-[var(--color-accent)]"
        />
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
      </div>
      {hint && (
        <p id={`${id}-hint`} className={`${hintClasses} ml-7`}>
          {hint}
        </p>
      )}
      <FieldErrors id={`${id}-errors`} errors={errors} />
    </div>
  );
}

export function SelectField({
  path,
  label,
  hint,
  options,
}: BaseFieldProps & { options: { value: string; label: string }[] }) {
  const { editor, id, errors, inputProps } = useField(path, hint);
  const value = String(editor.get(path) ?? "");
  const known = options.some((option) => option.value === value);
  return (
    <div>
      <label htmlFor={id} className={labelClasses}>
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className={hintClasses}>
          {hint}
        </p>
      )}
      <select
        {...inputProps}
        value={value}
        onChange={(event) => editor.set(path, event.target.value)}
        className={inputClasses}
      >
        {!known && <option value={value}>{value ? `Unknown: ${value}` : "Choose…"}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldErrors id={`${id}-errors`} errors={errors} />
    </div>
  );
}

/** A whole number that may be left empty (stored as null). */
export function OptionalNumberField({ path, label, hint }: BaseFieldProps) {
  const { editor, id, errors, inputProps } = useField(path, hint);
  const value = editor.get(path);
  return (
    <div>
      <label htmlFor={id} className={labelClasses}>
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className={hintClasses}>
          {hint}
        </p>
      )}
      <input
        {...inputProps}
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        value={typeof value === "number" ? value : ""}
        onChange={(event) => {
          const raw = event.target.value.trim();
          editor.set(path, raw === "" ? null : Number(raw));
        }}
        className={`${inputClasses} max-w-xs`}
      />
      <FieldErrors id={`${id}-errors`} errors={errors} />
    </div>
  );
}

export function ImageField({ path, label, hint }: BaseFieldProps) {
  const editor = useEditor();
  const src = String(editor.get(joinPath(path, "src")) ?? "");
  return (
    <fieldset className="space-y-4">
      <legend className={labelClasses}>{label}</legend>
      {hint && <p className={hintClasses}>{hint}</p>}
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem] sm:items-start">
        <div className="space-y-4">
          <TextField
            path={joinPath(path, "src")}
            label="Image file"
            hint={'Path of an image in the website\'s public folder, e.g. "/front_photo.png". New images are added by a developer for now.'}
          />
          <TextField
            path={joinPath(path, "alt")}
            label="Description for screen readers (alt text)"
            hint="Describe what the image shows, in one sentence."
          />
        </div>
        {isSafeImagePath(src) && (
          // Plain <img>: a small admin thumbnail doesn't need next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="aspect-[4/3] w-full border border-border object-cover" />
        )}
      </div>
    </fieldset>
  );
}

export function CtaFields({ path, label }: { path: ContentPath; label: string }) {
  return (
    <fieldset className="grid gap-4 sm:grid-cols-2">
      <legend className={`${labelClasses} mb-2`}>{label}</legend>
      <TextField path={joinPath(path, "label")} label="Button text" maxLength={60} />
      <TextField
        path={joinPath(path, "href")}
        label="Links to"
        hint="A page (/study), a section (#what-is-cos-d) or an https:// address."
      />
    </fieldset>
  );
}

/**
 * An editable list: add, remove and reorder items. `renderItem` receives
 * each item's path so its fields bind to the right element.
 */
export function ListField<T>({
  path,
  label,
  hint,
  itemLabel,
  newItem,
  min = 0,
  max = Infinity,
  renderItem,
}: BaseFieldProps & {
  itemLabel: (item: T, index: number) => string;
  newItem: () => T;
  min?: number;
  max?: number;
  renderItem: (itemPath: ContentPath, index: number) => ReactNode;
}) {
  const editor = useEditor();
  const headingId = useId();
  const items = (editor.get(path) as T[] | undefined) ?? [];
  const errors = editor.errorsFor(path);

  const move = (from: number, to: number) => {
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    editor.set(path, next);
  };

  const smallButton =
    "border border-border bg-paper px-2.5 py-1 text-xs font-medium text-ink hover:bg-paper-alt disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <section aria-labelledby={headingId} id={fieldId(path)}>
      <h4 id={headingId} className={labelClasses}>
        {label}
      </h4>
      {hint && <p className={hintClasses}>{hint}</p>}
      <FieldErrors id={`${fieldId(path)}-errors`} errors={errors} />
      <ol className="mt-3 space-y-4">
        {items.map((item, index) => {
          const name = itemLabel(item, index);
          return (
            <li key={index} className="border border-border bg-paper-alt/50 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">{name}</p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className={smallButton}
                    disabled={editor.disabled || index === 0}
                    onClick={() => move(index, index - 1)}
                    aria-label={`Move ${name} up`}
                  >
                    ↑ Up
                  </button>
                  <button
                    type="button"
                    className={smallButton}
                    disabled={editor.disabled || index === items.length - 1}
                    onClick={() => move(index, index + 1)}
                    aria-label={`Move ${name} down`}
                  >
                    ↓ Down
                  </button>
                  <button
                    type="button"
                    className={`${smallButton} text-red-700`}
                    disabled={editor.disabled || items.length <= min}
                    onClick={() => {
                      if (window.confirm(`Remove "${name}"?`)) {
                        editor.set(
                          path,
                          items.filter((_, i) => i !== index)
                        );
                      }
                    }}
                    aria-label={`Remove ${name}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="space-y-4">{renderItem(joinPath(path, index), index)}</div>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        className={`${smallButton} mt-3`}
        disabled={editor.disabled || items.length >= max}
        onClick={() => editor.set(path, [...items, newItem()])}
      >
        + Add {label.toLowerCase().replace(/s$/, "")}
      </button>
    </section>
  );
}

/** One collapsible page section in the editor, with an optional visibility toggle. */
export function SectionPanel({
  path,
  title,
  description,
  hasVisibility = false,
  defaultOpen = false,
  children,
}: {
  path: ContentPath;
  title: string;
  description?: string;
  hasVisibility?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const editor = useEditor();
  const hidden = hasVisibility && editor.get(joinPath(path, "visible")) === false;
  const hasErrors = editor.hasErrorsWithin(path);

  return (
    <details open={defaultOpen || hasErrors} className="group border border-border bg-paper">
      <summary className="flex cursor-pointer select-none flex-wrap items-center justify-between gap-2 px-5 py-4">
        <span>
          <span className="text-body font-semibold text-ink">{title}</span>
          {description && <span className="block text-sm text-ink-muted">{description}</span>}
        </span>
        <span className="flex items-center gap-2 text-xs font-medium">
          {hasErrors && <span className="border border-red-600 px-2 py-0.5 text-red-700">Needs attention</span>}
          {hidden && <span className="border border-border px-2 py-0.5 text-ink-muted">Hidden</span>}
          <span aria-hidden="true" className="text-ink-muted transition-transform group-open:rotate-90">
            ›
          </span>
        </span>
      </summary>
      <div className="space-y-6 border-t border-border px-5 py-5">
        {hasVisibility && (
          <CheckboxField
            path={joinPath(path, "visible")}
            label="Show this section on the website"
            hint="Untick to hide the whole section without losing its content."
          />
        )}
        {children}
      </div>
    </details>
  );
}
