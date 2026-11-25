import type { Metadata } from "next";
import Link from "next/link";
import DiffView, { Alerts } from "@/components/admin/dictionary/DiffView";
import { diffContents, reviewAlerts } from "@/lib/dictionary/diff";
import { emptyContent } from "@/lib/dictionary/model";
import { dictionary } from "@/lib/dictionary/server";

export const metadata: Metadata = { title: "Compare dictionary versions" };

function versionParam(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && /^\d{1,9}$/.test(raw) ? Number(raw) : null;
}

export default async function CompareDictionaryPage({ searchParams }: PageProps<"/admin/content/dictionary/compare">) {
  const params = await searchParams;
  const from = versionParam(params.from);
  const to = versionParam(params.to);
  const [before, after] = await Promise.all([
    from ? dictionary.getRelease(from) : null,
    to ? dictionary.getRelease(to) : null,
  ]);

  const valid = after && (before || from === 0);
  const diff = valid ? diffContents(before?.content ?? emptyContent(), after.content) : null;

  return (
    <div>
      <p className="text-sm">
        <Link href="/admin/content/dictionary/history" className="text-ink-muted underline underline-offset-2 hover:text-ink">
          ← Version history
        </Link>
      </p>
      <h1 className="mt-2 text-heading font-semibold text-ink">
        {diff ? `Version ${from || "(empty)"} → version ${to}` : "Compare versions"}
      </h1>
      {!diff ? (
        <p role="alert" className="mt-6 border border-dashed border-border bg-paper p-6 text-body text-ink">
          Choose two existing versions to compare from the version history.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          <Alerts alerts={reviewAlerts(diff)} />
          <DiffView diff={diff} beforeLabel={from ? `Version ${from}` : "Empty"} afterLabel={`Version ${to}`} />
        </div>
      )}
    </div>
  );
}
