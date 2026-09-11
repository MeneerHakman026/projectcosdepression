const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(date: Date | null): string {
  if (!date) return "Not set";
  return dateFormatter.format(date);
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return "—";
  return dateTimeFormatter.format(typeof date === "string" ? new Date(date) : date);
}
