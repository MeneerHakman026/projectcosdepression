export default function CmsNotInstalled() {
  return (
    <div role="alert" className="mt-8 border border-dashed border-border bg-paper p-6">
      <p className="text-body font-semibold text-ink">Content editing isn&apos;t set up yet</p>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        The database tables for page content haven&apos;t been created on this server. A developer
        needs to apply <code className="font-mono">db/migrations/002_create_cms_pages.sql</code>. The
        public website is unaffected and keeps showing its built-in content.
      </p>
    </div>
  );
}
