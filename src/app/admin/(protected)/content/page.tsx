import type { Metadata } from "next";
import { listSiteContent } from "@/lib/admin/content";
import { formatDateTime } from "@/lib/admin/format";
import { saveContentValue, createContentKey } from "./actions";

export const metadata: Metadata = { title: "Content" };

export default async function AdminContentPage() {
  const items = await listSiteContent();

  return (
    <div>
      <h1 className="text-heading font-semibold text-ink">Content</h1>
      <p className="mt-2 max-w-2xl text-body text-ink-muted">
        Editable text stored in <code className="font-mono text-sm">site_content</code>. Only keys
        that already exist are editable below — this is preparation for later text editing, not a
        full CMS.
      </p>

      {items.length === 0 && (
        <p className="mt-8 border border-dashed border-border bg-paper p-6 text-body text-ink-muted">
          No content keys exist yet.
        </p>
      )}

      <div className="mt-8 space-y-6">
        {items.map((item) => (
          <div key={item.key} className="border border-border bg-paper p-5">
            <form action={saveContentValue.bind(null, item.key)}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label
                  htmlFor={`content-${item.key}`}
                  className="font-mono text-sm font-semibold text-ink"
                >
                  {item.key}
                </label>
                <span className="text-xs text-ink-muted">
                  Updated {formatDateTime(item.updatedAt)}
                </span>
              </div>
              <textarea
                id={`content-${item.key}`}
                name="value"
                defaultValue={item.value}
                rows={4}
                className="mt-3 w-full border border-border bg-paper px-4 py-3 text-body text-ink"
              />
              <button type="submit" className="btn mt-3">
                Save
              </button>
            </form>
          </div>
        ))}
      </div>

      <div className="mt-10 border-t border-border pt-8">
        <h2 className="text-subheading font-semibold text-ink">Add a content key</h2>
        <form action={createContentKey} className="mt-4 max-w-xl space-y-4">
          <div>
            <label htmlFor="new-key" className="block text-sm font-medium text-ink">
              Key
            </label>
            <input
              id="new-key"
              name="key"
              type="text"
              required
              className="mt-2 w-full border border-border bg-paper px-4 py-2.5 text-body text-ink"
            />
          </div>
          <div>
            <label htmlFor="new-value" className="block text-sm font-medium text-ink">
              Value
            </label>
            <textarea
              id="new-value"
              name="value"
              rows={4}
              className="mt-2 w-full border border-border bg-paper px-4 py-3 text-body text-ink"
            />
          </div>
          <button type="submit" className="btn">
            Add key
          </button>
        </form>
      </div>
    </div>
  );
}
